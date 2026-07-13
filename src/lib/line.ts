import crypto from 'crypto';
import type { Transaction } from '@/types';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// ===== Signature Verification =====

export function verifyLineSignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) {
    console.warn('LINE_CHANNEL_SECRET not set — skipping signature verification');
    return true; // allow in dev
  }
  const hash = crypto
    .createHmac('SHA256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// ===== Reply Message (uses replyToken — must be called within 1 min of event) =====

export async function sendLineReplyMessage(
  replyToken: string,
  text: string,
  quickReplyOptions?: Array<{ label: string; text: string; data?: string }>
) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is missing — cannot reply');
    return;
  }

  const quickReply = quickReplyOptions && quickReplyOptions.length > 0 ? {
    items: quickReplyOptions.map(opt => ({
      type: 'action',
      action: opt.data ? {
        type: 'postback',
        label: opt.label,
        data: opt.data,
        displayText: opt.text
      } : {
        type: 'message',
        label: opt.label,
        text: opt.text
      }
    }))
  } : undefined;

  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text, quickReply }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE reply failed:', response.status, errorText);
  }
}

// ===== Push Message (no replyToken needed — works anytime) =====

export async function sendLinePushMessage(
  userId: string,
  text: string,
  quickReplyOptions?: Array<{ label: string; text: string; data?: string }>
) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is missing — cannot push');
    return;
  }

  const quickReply = quickReplyOptions && quickReplyOptions.length > 0 ? {
    items: quickReplyOptions.map(opt => ({
      type: 'action',
      action: opt.data ? {
        type: 'postback',
        label: opt.label,
        data: opt.data,
        displayText: opt.text
      } : {
        type: 'message',
        label: opt.label,
        text: opt.text
      }
    }))
  } : undefined;

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text, quickReply }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE push failed:', response.status, errorText);
  }
}

// ===== Download Image =====

export async function downloadLineFileAsBase64(messageId: string): Promise<string> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) throw new Error('LINE Channel Access Token is missing');

  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download LINE file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// ===== Format Transaction =====

export function formatTransactionForLine(tx: {
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
    let message = `📈 รายการลงทุนที่ตรวจพบ (Detected Investment)\n\n`;
    message += `💰 ยอดเงิน: ฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n`;
    message += `🔣 สัญลักษณ์: ${tx.investment_symbol}\n`;
    message += `🔄 ประเภท: ${typeLabel} (${tx.investment_type})\n`;
    if (tx.investment_price) message += `🏷️ ราคา/หน่วย: ฿${tx.investment_price.toLocaleString('th-TH', { minimumFractionDigits: 4 })}\n`;
    if (tx.investment_units) message += `📊 จำนวนหน่วย: ${tx.investment_units.toLocaleString('th-TH', { minimumFractionDigits: 4 })}\n`;
    if (tx.note) message += `📝 โน้ต: ${tx.note}\n`;
    message += `📅 วันที่: ${tx.date}\n`;
    return message;
  }

  let message = `📝 รายการที่ตรวจพบ (Detected Transaction)\n\n`;
  message += `💰 ยอดเงิน: ฿${tx.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n`;
  message += `🏷️ หมวดหมู่: ${tx.category}\n`;
  if (tx.payment_method) {
    const pmEmoji = tx.payment_method === 'credit_card' ? '💳' : tx.payment_method === 'bank' ? '🏦' : tx.payment_method === 'e_wallet' ? '📱' : '💵';
    message += `${pmEmoji} ช่องทางชำระเงิน: ${tx.payment_method}\n`;
  }
  if (tx.merchant) message += `🏢 ร้านค้า: ${tx.merchant}\n`;
  if (tx.note) message += `📝 โน้ต: ${tx.note}\n`;
  message += `📅 วันที่: ${tx.date}\n`;
  return message;
}
