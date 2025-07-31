import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// --- Environment variables (unchanged) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const analyzeUrl = process.env.CLOUD_RUN_ANALYZE_URL!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

// --- Helper Functions (unchanged, but still needed) ---
const getKeywordsForQuestion = (question: string): string[] => { /* ... */ };
const getDataTypeFromQuestion = (question: string): string => { /* ... */ };

// --- Main API POST Function ---
export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const payload = await request.json();
        const { companyName, year, secretKey, customLinks, rerunItems } = payload;

        // 1. --- SECURITY CHECK (unchanged) ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }

        // 2. --- VALIDATE NEW PAYLOAD STRUCTURE ---
        if (!customLinks || !Array.isArray(customLinks) || customLinks.length === 0) {
            return NextResponse.json({ error: 'You must provide at least one custom link.' }, { status: 400 });
        }
        if (!rerunItems || !Array.isArray(rerunItems) || rerunItems.length === 0) {
            return NextResponse.json({ error: 'You must select at least one data point to re-run.' }, { status: 400 });
        }

        // 3. --- DELETE SELECTED DATA ---
        const dataPointsToDelete = rerunItems.map((item: any) => item.dataPoint);
        console.log(`[API] Deleting data for ${companyName} (${year}) for points: ${dataPointsToDelete.join(', ')}`);
        await supabase.from('emissions_data').delete().eq('company_name', companyName).eq('year', year).in('data_point_type', dataPointsToDelete);

        // 4. --- EXTRACT QUESTIONS AND KEYWORDS FROM PAYLOAD ---
        const questions = rerunItems.map((item: any) => item.question);
        const keywords = Array.from(new Set(questions.flatMap(getKeywordsForQuestion)));

        // 5. --- CALL ANALYSIS ENDPOINT (unchanged) ---
        const analysisPayload = { pdf_urls: customLinks, questions, keywords };
        const analysisResponse = await fetch(analyzeUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(analysisPayload) });
        if (!analysisResponse.ok) throw new Error(`Analysis endpoint failed: ${await analysisResponse.text()}`);
        
        const analysisResults = await analysisResponse.json();
        if (!analysisResults || analysisResults.length === 0) return NextResponse.json({ message: 'Analysis complete, but no data was returned.' });
        
        // 6. --- SAVE NEW DATA (unchanged) ---
        for (const result of analysisResults) {
            const dataPointType = getDataTypeFromQuestion(result.question);
            if (dataPointType === 'Unknown') continue;
            // ... same saving logic as before ...
        }

        return NextResponse.json({ message: `Successfully re-ran analysis for selected data points.` });

    } catch (error: any) {
        console.error('[API] An error occurred:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}