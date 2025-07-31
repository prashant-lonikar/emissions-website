import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use the service key for calling security-defined RPC functions
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(request: Request) {
    const supabase = createClient(supabaseUrl, serviceKey);
    
    try {
        const { dataId, isThumbUp, email, comment } = await request.json();

        // Basic validation
        if (!dataId || typeof isThumbUp !== 'boolean') {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        // Call our Postgres function
        const { error: rpcError } = await supabase.rpc('handle_feedback_submission', {
            _data_id: dataId,
            _is_thumb_up: isThumbUp,
            _email: email,
            _comment: comment
        });

        if (rpcError) {
            throw new Error(`Database function error: ${rpcError.message}`);
        }

        return NextResponse.json({ message: 'Feedback submitted successfully!' });

    } catch (error: any) {
        console.error('[API/feedback] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}