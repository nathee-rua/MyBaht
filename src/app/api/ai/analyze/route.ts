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

    const { images, isTest, provider, apiKey, model } = await req.json();

    let targetProvider = provider;
    let targetApiKey = apiKey;
    let targetModel = model;

    const isPlaceholderKey = apiKey === '••••••••••••••••••••••••••••••••';

    // If it's not a test, or we are missing info, or the key is the saved key placeholder
    if (!isTest || !targetProvider || !targetApiKey || !targetModel || isPlaceholderKey) {
      // Load provider settings from database
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!isTest && (error || !settings)) {
        return new NextResponse('AI settings not configured. Please set them up in settings.', { status: 400 });
      }

      if (settings) {
        if (!targetProvider) targetProvider = settings.ai_provider;
        if (!targetModel) targetModel = settings.ai_model;
        if (!targetApiKey || isPlaceholderKey) {
          if (settings.ai_api_key_encrypted) {
            targetApiKey = decrypt(settings.ai_api_key_encrypted);
          }
        }
      }
    }

    if (!targetProvider || !targetApiKey || !targetModel) {
      return new NextResponse('AI provider config is incomplete. Please update settings.', { status: 400 });
    }

    if (isTest) {
      const testResult = await testConnection(targetProvider, targetApiKey, targetModel);
      if (!testResult.success) {
        return new NextResponse(`Connection test failed: ${testResult.message}`, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (!images || images.length === 0) {
      return new NextResponse('Images are required for analysis', { status: 400 });
    }

    // Process all pages/images (usually 1, up to 5)
    // We send the first image to analyzeSlip. For multi-page PDFs, we merge them or process the main page.
    // Let's send the first image as base64.
    const result = await analyzeSlip(targetProvider, targetApiKey, targetModel, images[0]);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Analysis failed: ${errorMsg}`, { status: 500 });
  }
}
