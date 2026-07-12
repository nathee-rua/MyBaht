import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendLineReplyMessage,
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('LINE webhook received body:', JSON.stringify(body));

    const events = body.events || [];
    for (const event of events) {
      const replyToken = event.replyToken;
      const source = event.source || {};
      const lineUserId = source.userId;

      if (!lineUserId) continue;

      // 1. Handle Postback Events (Quick replies confirmation / cancel)
      if (event.type === 'postback') {
        const data = event.postback.data as string;

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
            await sendLineReplyMessage(replyToken, '❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ หรือระบบหาบัญชีไม่พบ');
            continue;
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
            source: 'receipt_scan', // source as receipt scan for LINE
          });

          if (error) {
            console.error('Error inserting transaction from LINE:', error);
            await sendLineReplyMessage(replyToken, '❌ ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
          } else {
            await sendLineReplyMessage(replyToken, '✅ บันทึกรายการค่าใช้จ่ายเรียบร้อยแล้ว!');
          }
        } else if (data === 'cancel') {
          await sendLineReplyMessage(replyToken, '❌ ยกเลิกรายการแล้ว');
        }
        continue;
      }

      // 2. Handle Message Events
      if (event.type === 'message') {
        const message = event.message || {};
        
        // Handle Text Messages (commands / text alerts)
        if (message.type === 'text') {
          const text = (message.text || '').trim();

          if (text.startsWith('/start')) {
            await sendLineReplyMessage(
              replyToken,
              'สวัสดีครับ! ยินดีต้อนรับสู่ MyBaht / เงินฉัน 🤖\n\n' +
                'กรุณาเชื่อมต่อบัญชีของคุณด้วยคำสั่ง:\n' +
                '/link [รหัสเชื่อมต่อ 6 หลัก]\n\n' +
                'คุณสามารถดูรหัสเชื่อมต่อได้จากเมนู ตั้งค่า > เชื่อมต่อ LINE ในแอปพลิเคชันครับ'
            );
            continue;
          }

          if (text.startsWith('/link')) {
            const code = text.split(' ')[1];
            if (!code || code.length !== 6) {
              await sendLineReplyMessage(replyToken, '❌ รูปแบบไม่ถูกต้อง กรุณาใช้รูปแบบ /link [รหัสเชื่อมต่อ 6 หลัก]');
              continue;
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
              await sendLineReplyMessage(replyToken, '❌ รหัสเชื่อมต่อไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาสร้างรหัสใหม่จากในแอป');
              continue;
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
              await sendLineReplyMessage(replyToken, '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
            } else {
              await sendLineReplyMessage(replyToken, '🎉 เชื่อมต่อบัญชี MyBaht สำเร็จแล้ว! คุณสามารถส่งรูปภาพใบเสร็จเพื่อบันทึกรายการได้ทันที');
            }
            continue;
          }

          // Check if user is linked
          const { data: settings, error } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('line_chat_id', lineUserId)
            .single();

          if (error || !settings) {
            await sendLineReplyMessage(replyToken, '❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ กรุณาพิมพ์ /link [รหัสเชื่อมต่อ] เพื่อเริ่มใช้งาน');
            continue;
          }

          // Process Text Alerts using AI
          try {
            const { ai_provider, ai_api_key_encrypted, ai_model } = settings;
            if (!ai_provider || !ai_api_key_encrypted || !ai_model) {
              await sendLineReplyMessage(replyToken, '❌ กรุณาตั้งค่าผู้ให้บริการ AI API Key และโมเดลในแอปก่อนเริ่มต้นใช้งาน');
              continue;
            }

            const apiKey = decrypt(ai_api_key_encrypted);
            const parsed = await analyzeText(ai_provider, apiKey, ai_model, text);

            const formattedText = formatTransactionForLine({
              amount: parsed.amount,
              category: parsed.category,
              merchant: parsed.merchant,
              note: parsed.note,
              date: parsed.date,
              payment_method: parsed.payment_method,
            });

            const callbackData = createSafeCallbackData(
              parsed.amount,
              parsed.category,
              parsed.payment_method || 'cash',
              parsed.date,
              parsed.merchant,
              parsed.note
            );

            await sendLineReplyMessage(replyToken, formattedText, [
              { label: '✅ บันทึกรายการ', text: 'บันทึกรายการ', data: callbackData },
              { label: '❌ ยกเลิก', text: 'ยกเลิก', data: 'cancel' }
            ]);
          } catch (err: unknown) {
            console.error('LINE text alert processing failed:', err);
            await sendLineReplyMessage(replyToken, '❌ ไม่สามารถประมวลผลข้อความแจ้งเตือนนี้ได้ กรุณาตรวจสอบการตั้งค่า AI API หรือติดต่อแอดมิน');
          }
          continue;
        }

        // Handle Image Messages (Receipts)
        if (message.type === 'image') {
          // Check if user is linked
          const { data: settings, error } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('line_chat_id', lineUserId)
            .single();

          if (error || !settings) {
            await sendLineReplyMessage(replyToken, '❌ บัญชี LINE ของคุณยังไม่ได้เชื่อมต่อ กรุณาพิมพ์ /link [รหัสเชื่อมต่อ] เพื่อเริ่มใช้งาน');
            continue;
          }

          try {
            const base64 = await downloadLineFileAsBase64(message.id);

            const { ai_provider, ai_api_key_encrypted, ai_model } = settings;
            if (!ai_provider || !ai_api_key_encrypted || !ai_model) {
              await sendLineReplyMessage(replyToken, '❌ กรุณาตั้งค่าผู้ให้บริการ AI API Key และโมเดลในแอปก่อนเริ่มต้นใช้งาน');
              continue;
            }

            const apiKey = decrypt(ai_api_key_encrypted);
            const parsed = await analyzeSlip(ai_provider, apiKey, ai_model, base64);

            const formattedText = formatTransactionForLine({
              amount: parsed.amount,
              category: parsed.category,
              merchant: parsed.merchant,
              note: parsed.note,
              date: parsed.date,
              payment_method: parsed.payment_method,
            });

            const callbackData = createSafeCallbackData(
              parsed.amount,
              parsed.category,
              parsed.payment_method || 'cash',
              parsed.date,
              parsed.merchant,
              parsed.note
            );

            await sendLineReplyMessage(replyToken, formattedText, [
              { label: '✅ บันทึกรายการ', text: 'บันทึกรายการ', data: callbackData },
              { label: '❌ ยกเลิก', text: 'ยกเลิก', data: 'cancel' }
            ]);
          } catch (err: unknown) {
            console.error('LINE slip processing failed:', err);
            await sendLineReplyMessage(replyToken, '❌ ไม่สามารถประมวลผลใบเสร็จนี้ได้ กรุณาตรวจสอบการตั้งค่า AI API หรือติดต่อแอดมิน');
          }
          continue;
        }

        // Fallback response for other message types
        await sendLineReplyMessage(replyToken, '💡 คุณสามารถส่งรูปภาพใบเสร็จหรือข้อความแจ้งเตือนโอนเงิน เพื่อทำการบันทึกค่าใช้จ่ายอัตโนมัติได้ครับ');
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('LINE Webhook error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 to LINE to prevent retry loops
  }
}
