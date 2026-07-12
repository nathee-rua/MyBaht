import type { Transaction } from '@/types';

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

export async function sendLineReplyMessage(
  replyToken: string,
  text: string,
  quickReplyOptions?: Array<{ label: string; text: string; data?: string }>
) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE Channel Access Token is missing');
    return;
  }

  const url = 'https://api.line.me/v2/bot/message/reply';
  
  // Format quick replies if any
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: 'text',
          text,
          quickReply
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to send LINE reply message:', errorText);
  }
}

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

export function formatTransactionForLine(tx: {
  amount: number;
  category: string;
  merchant?: string;
  note?: string;
  date: string;
  payment_method?: string;
}): string {
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
