import type { Transaction } from '@/types';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options: Record<string, unknown> = {}
) {
  if (!TELEGRAM_BOT_TOKEN) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to send Telegram message:', errorText);
  }
}

export async function sendTelegramMessageWithKeyboard(
  chatId: string | number,
  text: string,
  keyboard: Array<Array<{ text: string; callback_data: string }>>
) {
  return sendTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}

export async function getTelegramFile(fileId: string): Promise<string> {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('Telegram Token missing');

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to get Telegram file info: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram getFile API error: ${data.description}`);
  }

  return data.result.file_path;
}

export async function downloadTelegramFileAsBase64(filePath: string): Promise<string> {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('Telegram Token missing');

  const url = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Telegram file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export function formatTransactionForTelegram(tx: {
  amount: number;
  category: string;
  merchant?: string;
  note?: string;
  date: string;
  payment_method?: string;
  is_investment?: boolean;
  investment_symbol?: string | null;
  investment_type?: string | null;
  investment_price?: number | null;
  investment_units?: number | null;
}): string {
  if (tx.is_investment && tx.investment_symbol) {
    const typeLabel = tx.investment_type === 'buy' ? 'ซื้อ' : tx.investment_type === 'sell' ? 'ขาย' : 'ปันผล';
    let message = `<b>📈 รายการลงทุนที่ตรวจพบ (Detected Investment)</b>\n\n`;
    message += `💰 <b>ยอดเงิน (Amount):</b> ฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n`;
    message += `🔣 <b>สัญลักษณ์ (Symbol):</b> ${tx.investment_symbol}\n`;
    message += `🔄 <b>ประเภท (Type):</b> ${typeLabel} (${tx.investment_type})\n`;
    if (tx.investment_price) message += `🏷️ <b>ราคา/หน่วย (Price):</b> ฿${tx.investment_price.toLocaleString('th-TH', { minimumFractionDigits: 4 })}\n`;
    if (tx.investment_units) message += `📊 <b>จำนวนหน่วย (Units):</b> ${tx.investment_units.toLocaleString('th-TH', { minimumFractionDigits: 4 })}\n`;
    if (tx.note) message += `📝 <b>โน้ต (Note):</b> ${tx.note}\n`;
    message += `📅 <b>วันที่ (Date):</b> ${tx.date}\n`;
    return message;
  }

  let message = `<b>📝 รายการที่ตรวจพบ (Detected Transaction)</b>\n\n`;
  message += `💰 <b>ยอดเงิน (Amount):</b> ฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n`;
  message += `🏷️ <b>หมวดหมู่ (Category):</b> ${tx.category}\n`;
  if (tx.payment_method) {
    const pmEmoji = tx.payment_method === 'credit_card' ? '💳' : tx.payment_method === 'bank' ? '🏦' : tx.payment_method === 'e_wallet' ? '📱' : '💵';
    message += `${pmEmoji} <b>ช่องทางชำระเงิน (Method):</b> ${tx.payment_method}\n`;
  }
  if (tx.merchant) message += `🏢 <b>ร้านค้า (Merchant):</b> ${tx.merchant}\n`;
  if (tx.note) message += `📝 <b>โน้ต (Note):</b> ${tx.note}\n`;
  message += `📅 <b>วันที่ (Date):</b> ${tx.date}\n`;
  return message;
}
