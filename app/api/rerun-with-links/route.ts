import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- Environment variables (unchanged) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const analyzeUrl = process.env.CLOUD_RUN_ANALYZE_URL!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

// --- HELPER FUNCTIONS (WITH FULL IMPLEMENTATION) ---

const getKeywordsForQuestion = (question: string): string[] => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) {
        return ['revenue', 'sale'];
    }
    if (qLower.includes('scope')) {
        return ['scope'];
    }
    return [];
};

const getDataTypeFromQuestion = (question: string): string => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) {
        return 'Revenue';
    }
    // This regex handles "scope 1", "scope 2", and "scope 2 (market-based)"
    const scopeMatch = qLower.match(/(scope\s*\d+(?:\s*\(market-based\))?)/);
    if (scopeMatch) {
        // A simple way to format the title correctly
        let type = scopeMatch[1].replace('scope ', 'Scope ');
        type = type.replace('(market-based)', '(Market-based)');
        return type;
    }
    return 'Unknown';
};


// --- MAIN API POST FUNCTION ---
export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const payload = await request.json();
        const { companyName, year, secretKey, customLinks, rerunItems } = payload;

        // 1. --- SECURITY CHECK ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }

        // 2. --- VALIDATE PAYLOAD ---
        if (!customLinks || !Array.isArray(customLinks) || customLinks.length === 0) {
            return NextResponse.json({ error: 'You must provide at least one custom link.' }, { status: 400 });
        }
        if (!rerunItems || !Array.isArray(rerunItems) || rerunItems.length === 0) {
            return NextResponse.json({ error: 'You must select at least one data point to re-run.' }, { status: 400 });
        }

        // 3. --- DELETE SELECTED DATA ---
        const dataPointsToDelete = rerunItems.map((item: any) => item.dataPoint);
        console.log(`[API] Deleting data for ${companyName} (${year}) for points: ${dataPointsToDelete.join(', ')}`);
        const { error: deleteError } = await supabase
            .from('emissions_data')
            .delete()
            .eq('company_name', companyName)
            .eq('year', year)
            .in('data_point_type', dataPointsToDelete);

        if (deleteError) throw new Error(`DB delete failed: ${deleteError.message}`);

        // 4. --- EXTRACT QUESTIONS AND KEYWORDS FROM PAYLOAD ---
        const questions = rerunItems.map((item: any) => item.question);
        const keywords = Array.from(new Set(questions.flatMap(getKeywordsForQuestion)));

        // 5. --- CALL ANALYSIS ENDPOINT ---
        const analysisPayload = { pdf_urls: customLinks, questions, keywords };
        const analysisResponse = await fetch(analyzeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(analysisPayload) });
        if (!analysisResponse.ok) throw new Error(`Analysis endpoint failed: ${await analysisResponse.text()}`);
        
        const analysisResults = await analysisResponse.json();
        if (!analysisResults || analysisResults.length === 0) return NextResponse.json({ message: 'Analysis complete, but no data was returned to save.' });
        
        // 6. --- SAVE NEW DATA ---
        for (const result of analysisResults) {
            const dataPointType = getDataTypeFromQuestion(result.question);
            if (dataPointType === 'Unknown') {
                console.warn(`Could not classify question, skipping result: "${result.question}"`);
                continue;
            }

            const mainRecord = {
                company_name: companyName, year: year, data_point_type: dataPointType,
                final_answer: result.summary?.final_answer, explanation: result.summary?.explanation,
                discrepancy: result.summary?.discrepancy, source_documents: JSON.stringify(result.source_documents || []),
            };
            const { data: newDbData, error: insertError } = await supabase.from('emissions_data').insert(mainRecord).select().single();
            if (insertError) {
                console.error(`DB insert failed for ${dataPointType}:`, insertError.message);
                continue;
            }
            if (result.evidence?.length > 0) {
                const evidenceRecords = result.evidence.map((ev: any) => ({ data_id: newDbData.id, ...ev }));
                await supabase.from('evidence').insert(evidenceRecords);
            }
        }

        return NextResponse.json({ message: `Successfully re-ran analysis for selected data points.` });

    } catch (error: any) {
        console.error('[API] An error occurred:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}