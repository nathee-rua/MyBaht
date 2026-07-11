import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  sendTelegramMessage,
  sendTelegramMessageWithKeyboard,
  getTelegramFile,
  downloadTelegramFileAsBase64,
  formatTransactionForTelegram,
} from '@/lib/telegram';
import { analyzeSlip } from '@/lib/ai-providers';
import { decrypt } from '@/lib/encryption';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize admin client to bypass RLS for webhook writes
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST(req: Request) {
  try {
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    const update = await req.json();
    console.log('Telegram update received:', JSON.stringify(update));

    // Handle Callback Query (Button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data as string;
      const chatId = callbackQuery.message.chat.id;
      const messageId = callbackQuery.message.message_id;

      if (data.startsWith('save:')) {
        // format: save:userId:amount:category:date:merchant:note
        const parts = data.split(':');
        const userId = parts[1];
        const amount = parseFloat(parts[2]);
        const category = parts[3];
        const date = parts[4];
        const merchant = parts[5] === 'none' ? null : parts[5];
        const note = parts[6] === 'none' ? null : parts[6];

        // Insert transaction into database
        const { error } = await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          kind: 'expense',
          amount,
          category,
          date,
          merchant,
          note,
          source: 'telegram',
        });

        if (error) {
          console.error('Error inserting transaction from Telegram:', error);
          await sendTelegramMessage(chatId, '❌ ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่อีกครั้ง');
        } else {
          // Edit message to confirm
          await sendTelegramMessage(chatId, '✅ บันทึกรายการค่าใช้จ่ายเรียบร้อยแล้ว!');
          // Answer callback
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQuery.id, text: 'บันทึกสำเร็จ' }),
          });
        }
      } else if (data === 'cancel') {
        await sendTelegramMessage(chatId, '❌ ยกเลิกรายการแล้ว');
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text as string | undefined;

    // Handle Commands
    if (text?.startsWith('/start')) {
      await sendTelegramMessage(
        chatId,
        'สวัสดีครับ! ยินดีต้อนรับสู่ <b>MyBaht / เงินฉัน</b> Bot 🤖\n\n' +
          'กรุณาเชื่อมต่อบัญชีของคุณด้วยคำสั่ง:\n' +
          '<code>/link [รหัสเชื่อมต่อ 6 หลัก]</code>\n\n' +
          'คุณสามารถดูรหัสเชื่อมต่อได้จากเมนู <b>ตั้งค่า > เชื่อมต่อ Telegram</b> ในแอปพลิเคชันครับ'
      );
      return NextResponse.json({ ok: true });
    }

    if (text?.startsWith('/link')) {
      const code = text.split(' ')[1];
      if (!code || code.length !== 6) {
        await sendTelegramMessage(chatId, '❌ รูปแบบไม่ถูกต้อง กรุณาใช้รูปแบบ <code>/link [รหัสเชื่อมต่อ 6 หลัก]</code>');
        return NextResponse.json({ ok: true });
      }

      // Find user with this active code
      const now = new Date().toISOString();
      const { data: settings, error } = await supabaseAdmin
        .from('user_settings')
        .select('user_id')
        .eq('telegram_link_code', code)
        .gte('telegram_link_code_expires', now)
        .single();

      if (error || !settings) {
        await sendTelegramMessage(chatId, '❌ รหัสเชื่อมต่อไม่ถูกต้อง หรือหมดอายุแล้ว กรุณาสร้างรหัสใหม่จากในแอป');
        return NextResponse.json({ ok: true });
      }

      // Link Telegram Account
      const { error: updateError } = await supabaseAdmin
        .from('user_settings')
        .update({
          telegram_chat_id: chatId.toString(),
          telegram_link_code: null,
          telegram_link_code_expires: null,
        })
        .eq('user_id', settings.user_id);

      if (updateError) {
        await sendTelegramMessage(chatId, '❌ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
      } else {
        await sendTelegramMessage(chatId, '🎉 เชื่อมต่อบัญชี MyBaht สำเร็จแล้ว! คุณสามารถส่งรูปภาพใบเสร็จเพื่อบันทึกรายการได้ทันที');
      }
      return NextResponse.json({ ok: true });
    }

    // Check if user is linked
    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('telegram_chat_id', chatId.toString())
      .single();

    if (error || !settings) {
      await sendTelegramMessage(chatId, '❌ บัญชีของคุณยังไม่ได้เชื่อมต่อ กรุณาพิมพ์ <code>/link [รหัสเชื่อมต่อ]</code> เพื่อเริ่มใช้งาน');
      return NextResponse.json({ ok: true });
    }

    // Handle Photos (Receipts)
    if (message.photo) {
      // Send uploading/analyzing indicator
      await sendTelegramMessage(chatId, '📥 ได้รับรูปภาพใบเสร็จแล้ว กำลังประมวลผลด้วย AI...');

      const photo = message.photo[message.photo.length - 1]; // largest image
      const fileId = photo.file_id;

      try {
        const filePath = await getTelegramFile(fileId);
        const base64 = await downloadTelegramFileAsBase64(filePath);

        const { ai_provider, ai_api_key_encrypted, ai_model } = settings;
        if (!ai_provider || !ai_api_key_encrypted || !ai_model) {
          await sendTelegramMessage(chatId, '❌ กรุณาตั้งค่าผู้ให้บริการ AI API Key และโมเดลในแอปก่อนเริ่มต้นใช้งาน');
          return NextResponse.json({ ok: true });
        }

        const apiKey = decrypt(ai_api_key_encrypted);
        const parsed = await analyzeSlip(ai_provider, apiKey, ai_model, base64);

        const formattedText = formatTransactionForTelegram({
          amount: parsed.amount,
          category: parsed.category,
          merchant: parsed.merchant,
          note: parsed.note,
          date: parsed.date,
        });

        // Inline keyboard for Save/Cancel actions
        const callbackData = `save:${settings.user_id}:${parsed.amount}:${parsed.category}:${parsed.date}:${parsed.merchant || 'none'}:${parsed.note || 'none'}`;
        await sendTelegramMessageWithKeyboard(chatId, formattedText, [
          [
            { text: '✅ บันทึกรายการ (Save)', callback_data: callbackData },
            { text: '❌ ยกเลิก (Cancel)', callback_data: 'cancel' },
          ],
        ]);
      } catch (err: unknown) {
        console.error('Telegram slip processing failed:', err);
        await sendTelegramMessage(chatId, '❌ ไม่สามารถประมวลผลใบเสร็จนี้ได้ กรุณาตรวจสอบการตั้งค่า AI API หรือติดต่อแอดมิน');
      }
      return NextResponse.json({ ok: true });
    }

    // Default response for other messages
    await sendTelegramMessage(chatId, '💡 คุณสามารถส่งรูปภาพใบเสร็จเพื่อทำการบันทึกค่าใช้จ่ายอัตโนมัติได้ครับ');
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram to prevent retry loops
  }
}
