// Node 18+ has global fetch

async function test() {
  const payload = {
    destination: "U8dec8ac313cd49a32388d08ffa060f6f",
    events: [
      {
        type: "message",
        message: {
          type: "text",
          id: "1234567890",
          text: "กินข้าว 150 บาท เงินสด"
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

  try {
    const response = await fetch('https://mybaht-smart.vercel.app/api/line/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", text);
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}

test();
