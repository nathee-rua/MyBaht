import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeText } from '@/lib/ai-providers';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { text, provider, apiKey, model } = await req.json();

    if (!text || text.trim().length === 0) {
      return new NextResponse('Text content is required', { status: 400 });
    }

    let targetProvider = provider;
    let targetApiKey = apiKey;
    let targetModel = model;

    const isPlaceholderKey = apiKey === '••••••••••••••••••••••••••••••••';

    // Load saved settings if not passed fully or passed placeholder
    if (!targetProvider || !targetApiKey || !targetModel || isPlaceholderKey) {
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !settings) {
        return new NextResponse('AI settings not configured. Please set them up in settings.', { status: 400 });
      }

      if (settings) {
        if (!targetProvider) targetProvider = settings.ai_provider;
        if (!targetModel) targetModel = settings.ai_model;
        if (!targetApiKey || isPlaceholderKey) {
          if (settings.ai_provider === targetProvider && settings.ai_api_key_encrypted) {
            targetApiKey = decrypt(settings.ai_api_key_encrypted);
          }
        }
      }
    }

    if (!targetProvider || !targetApiKey || !targetModel) {
      return new NextResponse('AI provider config is incomplete. Please update settings.', { status: 400 });
    }

    const result = await analyzeText(targetProvider, targetApiKey, targetModel, text);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Text analysis failed: ${errorMsg}`, { status: 500 });
  }
}
