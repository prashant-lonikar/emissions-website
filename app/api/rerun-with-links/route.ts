import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- Environment variables and Supabase admin client (unchanged) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const analyzeUrl = process.env.CLOUD_RUN_ANALYZE_URL!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

// --- Helper Functions ---
const getFullQuestionSet = (year: number) => [
    `What was the company's scope 1 emissions amount in ${year}?`,
    `What was the company's scope 2 emissions amount in ${year}?`,
    `What was the company's scope 3 emissions amount in ${year}?`,
    `What was the company's total revenue in ${year}? Rules: Revenue amount has to be company-level (not subsidiary, regional, etc.). Answer has to be specifically the total revenue amount, and has to be specifically for the year ${year}.`,
];

const getKeywordsForQuestion = (question: string): string[] => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) return ['revenue', 'sale'];
    if (qLower.includes('scope')) return ['scope'];
    return [];
};

const getDataTypeFromQuestion = (question: string): string => {
    const qLower = question.toLowerCase();
    if (qLower.includes('revenue')) return 'Revenue';
    const scopeMatch = qLower.match(/(scope\s*\d+)/);
    if (scopeMatch) return scopeMatch[1].charAt(0).toUpperCase() + scopeMatch[1].slice(1);
    return 'Unknown';
};


// --- Main API POST Function ---
export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const payload = await request.json();
        const { companyName, year, secretKey } = payload;

        // 1. --- SECURITY CHECK ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }

        // --- Distinguish between a single re-run and a full company re-run ---

        // ----- CASE 1: Re-running a SINGLE data point -----
        if (payload.questionToRerun && payload.sourceDocuments) {
            const { questionToRerun, sourceDocuments, dataPointType } = payload;

            // Delete the single, specific entry
            console.log(`[API/Single] Deleting old data for ${companyName} - ${dataPointType} (${year})...`);
            await supabase.from('emissions_data').delete().match({ company_name: companyName, year: year, data_point_type: dataPointType });

            // Analyze with the single question and original documents
            const analysisPayload = {
                pdf_urls: sourceDocuments,
                questions: [questionToRerun],
                keywords: getKeywordsForQuestion(questionToRerun),
            };
            const analysisResponse = await fetch(analyzeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(analysisPayload) });
            if (!analysisResponse.ok) throw new Error(`Analysis endpoint failed: ${await analysisResponse.text()}`);
            
            const analysisResults = await analysisResponse.json();
            if (!analysisResults || analysisResults.length === 0) throw new Error("Analysis ran but returned no results.");

            // Save the single new result
            const result = analysisResults[0];
            const mainRecord = {
                company_name: companyName, year: year, data_point_type: dataPointType,
                final_answer: result.summary?.final_answer, explanation: result.summary?.explanation,
                discrepancy: result.summary?.discrepancy, source_documents: result.source_documents || [],
            };
            const { data: newDbData, error: insertError } = await supabase.from('emissions_data').insert(mainRecord).select().single();
            if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

            if (result.evidence?.length > 0) {
                const evidenceRecords = result.evidence.map((ev: any) => ({ data_id: newDbData.id, ...ev }));
                await supabase.from('evidence').insert(evidenceRecords);
            }

            return NextResponse.json({ message: `Successfully re-ran analysis for ${dataPointType} and updated the database.` });
        }

        // ----- CASE 2: Re-running the FULL company with custom links -----
        else if (payload.customLinks) {
            const { customLinks } = payload;
            
            // Delete ALL data for the company/year
            console.log(`[API/Full] Deleting all old data for ${companyName} (${year})...`);
            await supabase.from('emissions_data').delete().match({ company_name: companyName, year: year });

            // Analyze with the full set of questions and custom documents
            const questions = getFullQuestionSet(year);
            // We can run all questions in one batch here since it's a full re-run.
            const keywords = ['scope', 'revenue', 'sale']; // Broad keywords for a full run
            const analysisPayload = { pdf_urls: customLinks, questions, keywords };

            const analysisResponse = await fetch(analyzeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(analysisPayload) });
            if (!analysisResponse.ok) throw new Error(`Analysis endpoint failed: ${await analysisResponse.text()}`);
            
            const analysisResults = await analysisResponse.json();
            if (!analysisResults || analysisResults.length === 0) return NextResponse.json({ message: 'Analysis complete, but no data was returned.' });

            // Save all the new results
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

            return NextResponse.json({ message: `Successfully re-ran full analysis for ${companyName} and updated the database.` });
        }
        
        // If neither case matches
        else {
            return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('[API] An error occurred:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}