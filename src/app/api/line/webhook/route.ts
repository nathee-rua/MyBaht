import { NextResponse, after } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  verifyLineSignature,
  sendLineReplyMessage,
  sendLinePushMessage,
  downloadLineFileAsBase64,
  formatTransactionForLine,
} from '@/lib/line';
import { analyzeSlip, analyzeText } from '@/lib/ai-providers';
import { decrypt } from '@/lib/encryption';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const SHORT_PAYMENT_METHODS: Record<string, string> = {
  ca: 'cash',
  ba: 'bank',
  cr: 'credit_card',
  ew: 'e_wallet',
  sa: 'savings'
};

const TO_SHORT_PAYMENT_METHOD: Record<string, string> = {
  cash: 'ca',
  bank: 'ba',
  credit_card: 'cr',
  e_wallet: 'ew',
  savings: 'sa'
};

function createSafeCallbackData(
  amount: number,
  category: string,
  paymentMethod: string,
  date: string,
  merchant?: string | null,
  note?: string | null
): string {
  const cleanMerchant = (merchant || 'none').replace(/:/g, ' ');
  const cleanNote = (note || 'none').replace(/:/g, ' ');
  const dateStr = date.replace(/-/g, '');
  const shortPm = TO_SHORT_PAYMENT_METHOD[paymentMethod] || 'ca';

  return `save:${amount}:${category}:${shortPm}:${dateStr}:${cleanMerchant}:${cleanNote}`;
}

function createSafeInvestmentCallbackData(
  amount: number,
  type: string,
  symbol: string,
  date: string,
  price?: number | null,
  units?: number | null,
  assetType?: string | null
): string {
  const cleanSymbol = symbol.replace(/:/g, ' ').trim().toUpperCase();
  const dateStr = date.replace(/-/g, '');
  const shortAssetType = assetType === 'stocks' ? 'st'
    : assetType === 'crypto' ? 'cr'
    : assetType === 'mutual_funds' ? 'mf'
    : assetType === 'gold' ? 'go'
    : 'ot';
  const cleanPrice = price ? price.toString() : 'none';
  const cleanUnits = units ? units.toString() : 'none';

  return `sv_inv:${amount}:${type}:${cleanSymbol}:${dateStr}:${cleanPrice}:${cleanUnits}:${shortAssetType}`;
}

// ===== Async event processor (runs AFTER 200 OK is returned to LINE) =====

async function processLineEvent(event: any) {
  const replyToken = event.replyToken;
  const source = event.source || {};
  const lineUserId = source.userId;

  if (!lineUserId) {
    console.log('[LINE] Skipping event — no userId');
    return;
  }

  // Helper to reply using replyToken when available, falling back to push message
  const sendReply = async (text: string, quickReplyOptions?: any) => {
    if (replyToken) {
      console.log('[LINE] Sending reply using replyToken...');
      await sendLineReplyMessage(replyToken, text, quickReplyOptions);
    } else {
      console.log('[LINE] Falling back to pushMessage...');
      await sendLinePushMessage(lineUserId, text, quickReplyOptions);
    }
  };

  // 1. Handle Postback Events (Quick replies confirmation / cancel)
  if (event.type === 'postback') {
    const data = event.postback.data as string;
    console.log('[LINE] Postback event:', data);

    if (data.startsWith('save:')) {
      const parts = data.split(':');
      const amount = parseFloat(parts[1]);
      const category = parts[2];
      const shortPm = parts[3];
      const paymentMethod = SHORT_PAYMENT_METHODS[shortPm] || 'cash';
      const rawDate = parts[4];
      const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const merchant = parts[5] === 'none' ? null : parts[5];
      const note = parts[6] === 'none' ? null : parts[6];

      // Find user by line_chat_id
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('user_settings')
        .select('user_id')
        .eq('line_chat_id', lineUserId)
        .single();

      if (settingsError || !settings) {
        await sendReply('❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ หรือระบบหาบัญชีไม่พบ');
        return;
      }

      const userId = settings.user_id;

      // Insert transaction into database
      const { error } = await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        kind: 'expense',
        amount,
        category,
        date: formattedDate,
        merchant,
        note,
        payment_method: paymentMethod,
        source: 'receipt_scan',
      });

      if (error) {
        console.error('[LINE] DB insert error:', error);
        await sendReply('❌ ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
      } else {
        console.log('[LINE] Transaction saved:', { amount, category, date: formattedDate });
        await sendReply('✅ บันทึกรายการค่าใช้จ่ายเรียบร้อยแล้ว!');
      }
    } else if (data.startsWith('sv_inv:')) {
      const parts = data.split(':');
      const amount = parseFloat(parts[1]);
      const type = parts[2] as 'buy' | 'sell' | 'dividend';
      const symbol = parts[3].toUpperCase();
      const rawDate = parts[4];
      const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const price = parts[5] === 'none' ? null : parseFloat(parts[5]);
      const units = parts[6] === 'none' ? null : parseFloat(parts[6]);
      const shortAssetType = parts[7];

      const assetTypes: Record<string, 'stocks' | 'crypto' | 'mutual_funds' | 'gold' | 'other'> = {
        st: 'stocks',
        cr: 'crypto',
        mf: 'mutual_funds',
        go: 'gold',
        ot: 'other'
      };
      const assetType = assetTypes[shortAssetType] || 'stocks';

      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('user_settings')
        .select('user_id')
        .eq('line_chat_id', lineUserId)
        .single();

      if (settingsError || !settings) {
        await sendReply('❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ หรือระบบหาบัญชีไม่พบ');
        return;
      }

      const userId = settings.user_id;

      let { data: asset, error: assetError } = await supabaseAdmin
        .from('investment_assets')
        .select('id')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .maybeSingle();

      if (assetError) {
        console.error('[LINE] Error querying asset:', assetError);
        await sendReply('❌ เกิดข้อผิดพลาดในการตรวจสอบสินทรัพย์');
        return;
      }

      let assetId = asset?.id;
      if (!assetId) {
        const { data: newAsset, error: createAssetError } = await supabaseAdmin
          .from('investment_assets')
          .insert({
            user_id: userId,
            symbol,
            name: symbol,
            type: assetType
          })
          .select('id')
          .single();

        if (createAssetError || !newAsset) {
          console.error('[LINE] Error creating asset:', createAssetError);
          await sendReply('❌ ไม่สามารถลงทะเบียนสินทรัพย์ใหม่ได้');
          return;
        }
        assetId = newAsset.id;
      }

      const { error: recordError } = await supabaseAdmin
        .from('investment_records')
        .insert({
          user_id: userId,
          asset_id: assetId,
          date: formattedDate,
          type: type,
          amount: amount,
          price: price,
          units: units
        });

      if (recordError) {
        console.error('[LINE] Error inserting investment record:', recordError);
        await sendReply('❌ ไม่สามารถบันทึกรายการลงทุนได้ กรุณาลองใหม่อีกครั้ง');
      } else {
        console.log('[LINE] Investment transaction saved:', { amount, symbol, date: formattedDate });
        await sendReply('✅ บันทึกรายการลงทุนเรียบร้อยแล้ว!');
      }
    } else if (data === 'cancel') {
      await sendReply('❌ ยกเลิกรายการแล้ว');
    }
    return;
  }

  // 2. Handle Message Events
  if (event.type === 'message') {
    const message = event.message || {};

    // Handle Text Messages (commands / text alerts)
    if (message.type === 'text') {
      const text = (message.text || '').trim();
      console.log('[LINE] Text message from', lineUserId, ':', text.substring(0, 80));

      if (text.startsWith('/start')) {
        await sendReply(
          'สวัสดีครับ! ยินดีต้อนรับสู่ MyBaht / เงินฉัน 🤖\n\n' +
            'กรุณาเชื่อมต่อบัญชีของคุณด้วยคำสั่ง:\n' +
            '/link [รหัสเชื่อมต่อ 6 หลัก]\n\n' +
            'คุณสามารถดูรหัสเชื่อมต่อได้จากเมนู ตั้งค่า > เชื่อมต่อ LINE ในแอปพลิเคชันครับ'
        );
        return;
      }

      if (text.startsWith('/link')) {
        const code = text.split(' ')[1];
        if (!code || code.length !== 6) {
          await sendReply('❌ รูปแบบไม่ถูกต้อง กรุณาใช้รูปแบบ /link [รหัสเชื่อมต่อ 6 หลัก]');
          return;
        }

        // Find user with this active code
        const now = new Date().toISOString();
        const { data: settings, error } = await supabaseAdmin
          .from('user_settings')
          .select('user_id')
          .eq('line_link_code', code)
          .gte('line_link_code_expires', now)
          .single();

        if (error || !settings) {
          await sendReply('❌ รหัสเชื่อมต่อไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาสร้างรหัสใหม่จากในแอป');
          return;
        }

        // Link LINE Account
        const { error: updateError } = await supabaseAdmin
          .from('user_settings')
          .update({
            line_chat_id: lineUserId,
            line_link_code: null,
            line_link_code_expires: null,
          })
          .eq('user_id', settings.user_id);

        if (updateError) {
          await sendReply('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
        } else {
          console.log('[LINE] Account linked:', lineUserId, '->', settings.user_id);
          await sendReply('🎉 เชื่อมต่อบัญชี MyBaht สำเร็จแล้ว! คุณสามารถส่งรูปภาพใบเสร็จเพื่อบันทึกรายการได้ทันที');
        }
        return;
      }

      // Check if user is linked
      const { data: settings, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('line_chat_id', lineUserId)
        .single();

      if (error || !settings) {
        await sendReply('❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ กรุณาพิมพ์ /link [รหัสเชื่อมต่อ] เพื่อเริ่มใช้งาน');
        return;
      }

      // Process Text Alerts using AI
      try {
        const { ai_provider, ai_api_key_encrypted, ai_model } = settings;
        if (!ai_provider || !ai_api_key_encrypted || !ai_model) {
          await sendReply('❌ กรุณาตั้งค่าผู้ให้บริการ AI API Key และโมเดลในแอปก่อนเริ่มต้นใช้งาน');
          return;
        }

        const apiKey = decrypt(ai_api_key_encrypted);
        console.log('[LINE] Calling AI analyzeText...');
        const parsed = await analyzeText(ai_provider, apiKey, ai_model, text);
        console.log('[LINE] AI result:', JSON.stringify(parsed));

        const formattedText = formatTransactionForLine({
          amount: parsed.amount,
          category: parsed.category,
          merchant: parsed.merchant,
          note: parsed.note,
          date: parsed.date,
          payment_method: parsed.payment_method,
          is_investment: parsed.is_investment,
          investment_symbol: parsed.investment_symbol,
          investment_type: parsed.investment_type,
          investment_price: parsed.investment_price,
          investment_units: parsed.investment_units,
        });

        const callbackData = parsed.is_investment && parsed.investment_symbol
          ? createSafeInvestmentCallbackData(
              parsed.amount,
              parsed.investment_type || 'buy',
              parsed.investment_symbol,
              parsed.date,
              parsed.investment_price,
              parsed.investment_units,
              parsed.investment_asset_type
            )
          : createSafeCallbackData(
              parsed.amount,
              parsed.category,
              parsed.payment_method || 'cash',
              parsed.date,
              parsed.merchant,
              parsed.note
            );

        await sendReply(formattedText, [
          { label: parsed.is_investment ? '📈 บันทึกการลงทุน' : '✅ บันทึกรายการ', text: parsed.is_investment ? 'บันทึกการลงทุน' : 'บันทึกรายการ', data: callbackData },
          { label: '❌ ยกเลิก', text: 'ยกเลิก', data: 'cancel' }
        ]);
        console.log('[LINE] Text processed and reply sent');
      } catch (err: unknown) {
        console.error('[LINE] Text processing failed:', err);
        await sendReply('❌ ไม่สามารถประมวลผลข้อความแจ้งเตือนนี้ได้ กรุณาตรวจสอบการตั้งค่า AI API หรือติดต่อแอดมิน');
      }
      return;
    }

    // Handle Image Messages (Receipts)
    if (message.type === 'image') {
      console.log('[LINE] Image message from', lineUserId, ', messageId:', message.id);

      // Check if user is linked
      const { data: settings, error } = await supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('line_chat_id', lineUserId)
        .single();

      if (error || !settings) {
        await sendReply('❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ กรุณาพิมพ์ /link [รหัสเชื่อมต่อ] เพื่อเริ่มใช้งาน');
        return;
      }

      try {
        console.log('[LINE] Downloading image...');
        const base64 = await downloadLineFileAsBase64(message.id);
        console.log('[LINE] Image downloaded, size:', Math.round(base64.length / 1024), 'KB');

        const { ai_provider, ai_api_key_encrypted, ai_model } = settings;
        if (!ai_provider || !ai_api_key_encrypted || !ai_model) {
          await sendReply('❌ กรุณาตั้งค่าผู้ให้บริการ AI API Key และโมเดลในแอปก่อนเริ่มต้นใช้งาน');
          return;
        }

        const apiKey = decrypt(ai_api_key_encrypted);
        console.log('[LINE] Calling AI analyzeSlip...');
        const parsed = await analyzeSlip(ai_provider, apiKey, ai_model, base64);
        console.log('[LINE] AI result:', JSON.stringify(parsed));

        const formattedText = formatTransactionForLine({
          amount: parsed.amount,
          category: parsed.category,
          merchant: parsed.merchant,
          note: parsed.note,
          date: parsed.date,
          payment_method: parsed.payment_method,
          is_investment: parsed.is_investment,
          investment_symbol: parsed.investment_symbol,
          investment_type: parsed.investment_type,
          investment_price: parsed.investment_price,
          investment_units: parsed.investment_units,
        });

        const callbackData = parsed.is_investment && parsed.investment_symbol
          ? createSafeInvestmentCallbackData(
              parsed.amount,
              parsed.investment_type || 'buy',
              parsed.investment_symbol,
              parsed.date,
              parsed.investment_price,
              parsed.investment_units,
              parsed.investment_asset_type
            )
          : createSafeCallbackData(
              parsed.amount,
              parsed.category,
              parsed.payment_method || 'cash',
              parsed.date,
              parsed.merchant,
              parsed.note
            );

        await sendReply(formattedText, [
          { label: parsed.is_investment ? '📈 บันทึกการลงทุน' : '✅ บันทึกรายการ', text: parsed.is_investment ? 'บันทึกการลงทุน' : 'บันทึกรายการ', data: callbackData },
          { label: '❌ ยกเลิก', text: 'ยกเลิก', data: 'cancel' }
        ]);
        console.log('[LINE] Slip processed and reply sent');
      } catch (err: unknown) {
        console.error('[LINE] Slip processing failed:', err);
        await sendReply('❌ ไม่สามารถประมวลผลใบเสร็จนี้ได้ กรุณาตรวจสอบการตั้งค่า AI API หรือติดต่อแอดมิน');
      }
      return;
    }

    // Fallback response for other message types
    await sendReply('💡 คุณสามารถส่งรูปภาพใบเสร็จหรือข้อความแจ้งเตือนโอนเงิน เพื่อทำการบันทึกค่าใช้จ่ายอัตโนมัติได้ครับ');
  }
}

// ===== POST handler — returns 200 immediately, processes async =====

export async function POST(req: Request) {
  try {
    // Read raw body for signature verification
    const rawBody = await req.text();

    // Verify LINE signature
    const signature = req.headers.get('x-line-signature') || '';
    if (signature && !verifyLineSignature(rawBody, signature)) {
      console.error('[LINE] Invalid signature — rejecting request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const events = body.events || [];

    console.log('[LINE] Webhook received:', events.length, 'event(s)');

    // Skip empty verification pings
    if (events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // Schedule ALL event processing to run AFTER the response is sent
    // This ensures we return 200 OK to LINE well within the 2-second window
    after(async () => {
      for (const event of events) {
        try {
          await processLineEvent(event);
        } catch (err) {
          console.error('[LINE] Unhandled error processing event:', err);
        }
      }
    });

    // Return 200 immediately
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[LINE] Webhook parse error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 to prevent retry loops
  }
}
