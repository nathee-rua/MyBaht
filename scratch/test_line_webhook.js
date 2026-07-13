const crypto = require('crypto');

async function test() {
  const channelSecret = "90b0d0362cdc4a99ae1f9dd4fa515e74";
  const payload = {
    destination: "U8dec8ac313cd49a32388d08ffa060f6f",
    events: [
      {
        type: "postback",
        postback: {
          data: "save:150:food:ca:20250522:none:กินข้าว"
        },
        timestamp: Date.now(),
        source: {
          type: "user",
          userId: "U8dec8ac313cd49a32388d08ffa060f6f"
        },
        replyToken: "test_reply_token"
      }
    ]
  };

  const bodyStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('SHA256', channelSecret)
    .update(bodyStr)
    .digest('base64');

  try {
    const response = await fetch('https://mybaht-smart.vercel.app/api/line/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': signature
      },
      body: bodyStr
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}

test();
