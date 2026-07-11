import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { ai_provider, ai_api_key, ai_model } = await req.json();

    const updatePayload: Record<string, unknown> = {
      ai_provider,
      ai_model,
      updated_at: new Date().toISOString(),
    };

    if (ai_api_key) {
      updatePayload.ai_api_key_encrypted = encrypt(ai_api_key);
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...updatePayload,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Settings update failed: ${errorMsg}`, { status: 500 });
  }
}
