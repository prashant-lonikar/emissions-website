import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- Environment variables and helper functions (unchanged) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const analyzeUrl = process.env.CLOUD_RUN_ANALYZE_URL!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

const getKeywordsForQuestion = (question: string): string[] => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) return ['revenue', 'sale'];
    if (qLower.includes('scope')) return ['scope'];
    return [];
};

// --- Main API POST Function ---
export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const payload = await request.json();
        const { companyName, year, secretKey } = payload;

        // 1. --- SECURITY CHECK (unchanged) ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }
        
        // ----- We now only have ONE main logic path, making the code simpler -----
        if (payload.customLinks && payload.dataPointsToRerun) {
            const { customLinks, dataPointsToRerun } = payload;

            if (!Array.isArray(dataPointsToRerun) || dataPointsToRerun.length === 0) {
                return NextResponse.json({ error: 'You must select at least one data point to re-run.' }, { status: 400 });
            }

            // 2. --- DELETE SELECTED DATA ---
            console.log(`[API] Deleting data for ${companyName} (${year}) for points: ${dataPointsToRerun.join(', ')}`);
            const { error: deleteError } = await supabase
                .from('emissions_data')
                .delete()
                .eq('company_name', companyName)
                .eq('year', year)
                .in('data_point_type', dataPointsToRerun); // <-- Selectively delete

            if (deleteError) throw new Error(`DB delete failed: ${deleteError.message}`);

            // 3. --- GENERATE QUESTIONS AND KEYWORDS FOR SELECTED DATA POINTS ---
            const questions = dataPointsToRerun.map(dp => `What was the company's ${dp.toLowerCase()} in ${year}?`);
            const keywords = Array.from(new Set(questions.flatMap(getKeywordsForQuestion)));

            // 4. --- CALL ANALYSIS ENDPOINT ---
            const analysisPayload = { pdf_urls: customLinks, questions, keywords };
            const analysisResponse = await fetch(analyzeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(analysisPayload) });
            if (!analysisResponse.ok) throw new Error(`Analysis endpoint failed: ${await analysisResponse.text()}`);
            
            const analysisResults = await analysisResponse.json();
            if (!analysisResults || analysisResults.length === 0) return NextResponse.json({ message: 'Analysis complete, but no data was returned.' });
            
            // 5. --- SAVE NEW DATA (unchanged logic) ---
            for (const result of analysisResults) {
                const dataPointType = getDataTypeFromQuestion(result.question);
                const mainRecord = {
                    company_name: companyName, year: year, data_point_type: dataPointType,
                    final_answer: result.summary?.final_answer, explanation: result.summary?.explanation,
                    discrepancy: result.summary?.discrepancy, source_documents: result.source_documents || [],
                };
                const { data: newDbData, error: insertError } = await supabase.from('emissions_data').insert(mainRecord).select().single();
                if (insertError) continue; // Continue even if one fails
                if (result.evidence?.length > 0) {
                    const evidenceRecords = result.evidence.map((ev: any) => ({ data_id: newDbData.id, ...ev }));
                    await supabase.from('evidence').insert(evidenceRecords);
                }
            }

            return NextResponse.json({ message: `Successfully re-ran analysis for selected data points.` });
        }
        
        else {
            return NextResponse.json({ error: 'Invalid request payload. Required: customLinks and dataPointsToRerun' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('[API] An error occurred:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}