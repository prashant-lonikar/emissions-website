import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This is a server-side file. process.env variables are safe here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!; // The powerful, secret service key
const analyzeUrl = process.env.CLOUD_RUN_ANALYZE_URL!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

// Define the questions here, so they are consistent.
const getQuestions = (year: number) => [
    `What was the company's scope 1 emissions amount in ${year}?`,
    `What was the company's scope 2 (market-based) emissions amount in ${year}?`,
    `What was the company's scope 3 emissions amount in ${year}?`,
    `What was the company's total revenue in ${year}? Rules: Revenue amount has to be company-level (not subsidiary, regional, etc.). Answer has to be specifically the total revenue amount, and has to be specifically for the year ${year}.`,
];

export async function POST(request: Request) {
    // Create a Supabase client with admin privileges
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const { companyName, year, customLinks, secretKey } = await request.json();

        // 1. --- SECURITY CHECK ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }

        // 2. --- DELETE OLD DATA ---
        // The 'ON DELETE CASCADE' in your database schema will automatically delete related evidence.
        console.log(`[API] Deleting old data for ${companyName} (${year})...`);
        const { error: deleteError } = await supabase
            .from('emissions_data')
            .delete()
            .match({ company_name: companyName, year: year });

        if (deleteError) {
            console.error('Supabase delete error:', deleteError);
            throw new Error(`Failed to delete old data: ${deleteError.message}`);
        }
        console.log(`[API] Deletion successful.`);

        // 3. --- CALL EXTERNAL /analyze ENDPOINT ---
        console.log(`[API] Analyzing new links for ${companyName}...`);
        const analysisPayload = {
            pdf_urls: customLinks,
            questions: getQuestions(year),
            keywords: ["scope", "emissions"],
        };

        const analysisResponse = await fetch(analyzeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(analysisPayload),
        });

        if (!analysisResponse.ok) {
            const errorText = await analysisResponse.text();
            throw new Error(`Analysis endpoint failed with status ${analysisResponse.status}: ${errorText}`);
        }
        
        const analysisResults = await analysisResponse.json();
        console.log(`[API] Analysis successful.`);

        // 4. --- SAVE NEW DATA TO SUPABASE ---
        if (!analysisResults || analysisResults.length === 0) {
            return NextResponse.json({ message: 'Analysis complete, but no data was returned to save.' });
        }
        
        console.log(`[API] Saving ${analysisResults.length} new records to Supabase...`);
    for (const result of analysisResults) {
        // Use the same parsing logic as the python script
        const question = (result.question || "").toLowerCase();
        let data_point_type = "Unknown";
        if (question.includes('revenue')) {
            data_point_type = "Revenue";
        } else {
            const scopeMatch = question.match(/(scope\s*\d+)/i);
            if (scopeMatch) data_point_type = scopeMatch[1].title();
        }

        const mainRecord = {
            company_name: companyName,
            year: year,
            data_point_type: data_point_type, // <-- CHANGED
            final_answer: result.summary?.final_answer,
            explanation: result.summary?.explanation,
            discrepancy: result.summary?.discrepancy,
            source_documents: result.source_documents || [],
        };

            const { data: newEmissionData, error: insertError } = await supabase
                .from('emissions_data')
                .insert(mainRecord)
                .select()
                .single();

            if (insertError) throw new Error(`Failed to insert emission data: ${insertError.message}`);

            // Insert evidence linked to the new record
            if (result.evidence && result.evidence.length > 0) {
                const evidenceRecords = result.evidence.map((ev: any) => ({
                    data_id: newEmissionData.id,
                    ...ev,
                }));
                const { error: evidenceError } = await supabase.from('evidence').insert(evidenceRecords);
                if (evidenceError) throw new Error(`Failed to insert evidence: ${evidenceError.message}`);
            }
        }
        console.log(`[API] Save successful.`);

        return NextResponse.json({ message: `Successfully re-ran analysis for ${companyName} and updated the database.` });

    } catch (error: any) {
        console.error('[API] An error occurred:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}