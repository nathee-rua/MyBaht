import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateMonthlySummary } from '@/lib/ai-providers';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { transactions, language } = await req.json();

    if (!transactions) {
      return new NextResponse('Transactions are required', { status: 400 });
    }

    // Load AI settings from user_settings table
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !settings) {
      return new NextResponse('AI settings not configured. Please set them up in settings.', { status: 400 });
    }

    const provider = settings.ai_provider;
    const model = settings.ai_model;
    let apiKey = '';

    if (settings.ai_api_key_encrypted) {
      apiKey = decrypt(settings.ai_api_key_encrypted);
    }

    if (!provider || !model || !apiKey) {
      return new NextResponse('AI provider config is incomplete. Please update settings.', { status: 400 });
    }

    const summary = await generateMonthlySummary(provider, apiKey, model, transactions, language || 'en');
    return NextResponse.json({ summary });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return new NextResponse(`Failed to generate monthly summary: ${errorMsg}`, { status: 500 });
  }
}
