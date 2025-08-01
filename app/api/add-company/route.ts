import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;
const rerunSecret = process.env.RERUN_SECRET_KEY!;

export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const { companyName, year, secretKey } = await request.json();

        // 1. --- SECURITY CHECK ---
        if (secretKey !== rerunSecret) {
            return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
        }

        // 2. --- VALIDATION ---
        if (!companyName || !year) {
            return NextResponse.json({ error: 'Company name and year are required.' }, { status: 400 });
        }

        // 3. --- CALL THE DATABASE FUNCTION ---
        const { data, error: rpcError } = await supabase.rpc('add_missing_company', {
            _company_name: companyName,
            _year: year
        });

        if (rpcError) throw new Error(`Database function error: ${rpcError.message}`);

        // The function returns data only if a new row was inserted
        if (!data || data.length === 0) {
            return NextResponse.json({ error: `Company '${companyName}' for year ${year} already exists.` }, { status: 409 }); // 409 Conflict
        }

        return NextResponse.json({ message: `Successfully added '${companyName}' to the dashboard.` });

    } catch (error: any) {
        console.error('[API/add-company] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}