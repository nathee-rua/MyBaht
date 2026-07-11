import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchModels } from '@/lib/ai-providers';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { provider, apiKey: passedApiKey } = await req.json();
    const isPlaceholder = passedApiKey === '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
    let keyToUse = isPlaceholder ? null : passedApiKey;

    if (!keyToUse) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('ai_api_key_encrypted')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data?.ai_api_key_encrypted) {
        return new NextResponse('No API key configured', { status: 400 });
      }
      keyToUse = decrypt(data.ai_api_key_encrypted);
    }

    const models = await fetchModels(provider, keyToUse);
    return NextResponse.json(models);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Failed to fetch models: ${errorMsg}`, { status: 500 });
  }
}
