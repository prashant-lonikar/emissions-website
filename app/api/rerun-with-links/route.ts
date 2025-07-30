import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- Environment variables (unchanged) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const analyzeUrl = process.env.CLOUD_RUN_ANALYZE_URL!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

// --- HELPER FUNCTIONS (DEFINED AT THE TOP) ---

const getKeywordsForQuestion = (question: string): string[] => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) return ['revenue', 'sale'];
    if (qLower.includes('scope')) return ['scope'];
    return [];
};

const getDataTypeFromQuestion = (question: string): string => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) return 'Revenue';
    const scopeMatch = qLower.match(/(scope\s*\d+(?:\s*\(market-based\))?)/);
    if (scopeMatch) {
        // Capitalize the first letter and ensure 'market-based' is formatted correctly
        let type = scopeMatch[1].charAt(0).toUpperCase() + scopeMatch[1].slice(1);
        return type.replace(/\(market-based\)/, '(Market-based)');
    }
    return 'Unknown';
};


// --- MAIN API POST FUNCTION ---
export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const payload = await request.json();
        const { companyName, year, secretKey, customLinks, dataPointsToRerun } = payload;

        // 1. --- SECURITY CHECK ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }

        // 2. --- VALIDATE PAYLOAD ---
        if (!customLinks || !Array.isArray(customLinks) || customLinks.length === 0) {
            return NextResponse.json({ error: 'You must provide at least one custom link.' }, { status: 400 });
        }
        if (!dataPointsToRerun || !Array.isArray(dataPointsToRerun) || dataPointsToRerun.length === 0) {
            return NextResponse.json({ error: 'You must select at least one data point to re-run.' }, { status: 400 });
        }

        // 3. --- DELETE SELECTED DATA ---
        console.log(`[API] Deleting data for ${companyName} (${year}) for points: ${dataPointsToRerun.join(', ')}`);
        const { error: deleteError } = await supabase
            .from('emissions_data')
            .delete()
            .eq('company_name', companyName)
            .eq('year', year)
            .in('data_point_type', dataPointsToRerun);

        if (deleteError) throw new Error(`DB delete failed: ${deleteError.message}`);

        // 4. --- GENERATE QUESTIONS AND KEYWORDS ---
        const questions = dataPointsToRerun.map(dp => `What was the company's ${dp.toLowerCase()} in ${year}?`);
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
            if (dataPointType === 'Unknown') continue; // Skip if we can't classify the result

            const mainRecord = {
                company_name: companyName, year: year, data_point_type: dataPointType,
                final_answer: result.summary?.final_answer, explanation: result.summary?.explanation,
                discrepancy: result.summary?.discrepancy, source_documents: result.source_documents || [],
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