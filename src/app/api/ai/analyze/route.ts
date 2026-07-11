import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSlip, testConnection } from '@/lib/ai-providers';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { images, isTest } = await req.json();

    // Load provider settings from database
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !settings) {
      return new NextResponse('AI settings not configured. Please set them up in settings.', { status: 400 });
    }

    const { ai_provider, ai_api_key_encrypted, ai_model } = settings;
    if (!ai_provider || !ai_api_key_encrypted || !ai_model) {
      return new NextResponse('AI provider config is incomplete. Please update settings.', { status: 400 });
    }

    const apiKey = decrypt(ai_api_key_encrypted);

    if (isTest) {
      await testConnection(ai_provider, apiKey, ai_model);
      return NextResponse.json({ ok: true });
    }

    if (!images || images.length === 0) {
      return new NextResponse('Images are required for analysis', { status: 400 });
    }

    // Process all pages/images (usually 1, up to 5)
    // We send the first image to analyzeSlip. For multi-page PDFs, we merge them or process the main page.
    // Let's send the first image as base64.
    const result = await analyzeSlip(ai_provider, apiKey, ai_model, images[0]);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Analysis failed: ${errorMsg}`, { status: 500 });
  }
}
