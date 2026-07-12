import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('line_chat_id')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    return NextResponse.json({ linked: !!data?.line_chat_id });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(errorMsg, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins expiry

    const { error } = await supabase
      .from('user_settings')
      .update({
        line_link_code: code,
        line_link_code_expires: expires,
      })
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ code });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(errorMsg, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { error } = await supabase
      .from('user_settings')
      .update({
        line_chat_id: null,
        line_link_code: null,
        line_link_code_expires: null,
      })
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(errorMsg, { status: 500 });
  }
}
