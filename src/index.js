const CHANNEL_USERNAME = "@parvapoem";

const PUZZLE_DATA = {
  title: "جدول کلمات",
  questions: [
    { id: 1, text: "پایتخت ایران؟", answer: "تهران" },
    { id: 2, text: "بلندترین قله ایران؟", answer: "دماوند" },
    { id: 3, text: "برگزارکننده این بازی؟", answer: "پروا" }
  ]
};

async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.log("Error sending message:", JSON.stringify(data));
  }
}

async function checkChannelMembership(token, userId) {
  try {
    const url = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.ok && data.result) {
      return ["creator", "administrator", "member"].includes(data.result.status);
    }
    console.log("Channel check failed:", JSON.stringify(data));
    return false;
  } catch (e) {
    console.log("Channel check exception:", e.message);
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        const token = env.BOT_TOKEN;

        if (!token) {
          console.log("ERROR: BOT_TOKEN is missing in env!");
          return new Response("OK", { status: 200 });
        }

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();
          const userId = update.message.from.id;

          // ۱. بررسی عضویت در کانال
          const isMember = await checkChannelMembership(token, userId);
          if (!isMember) {
            await sendMessage(
              token, 
              chatId, 
              `⚠️ **برای استفاده از ربات جدول، ابتدا باید عضو کانال شوید:**\n\n📢 ${CHANNEL_USERNAME}\n\nپس از عضویت، مجدداً /start را بفرستید.`
            );
            return new Response("OK", { status: 200 });
          }

          // ۲. دستورات ربات جدول
          if (text === "/start" || text === "/جدول" || text === "/table") {
            let qText = `🧩 **${PUZZLE_DATA.title}**\n\n`;
            PUZZLE_DATA.questions.forEach(q => {
              qText += `سوال ${q.id}: ${q.text} (${q.answer.length} حرفی)\n`;
            });
            qText += `\n💡 برای پاسخ، شماره سوال و جواب را بفرستید (مثال: \`1 تهران\`)`;

            await sendMessage(token, chatId, qText);
          } else {
            const parts = text.split(" ");
            if (parts.length >= 2) {
              const qId = parseInt(parts[0]);
              const userAnswer = parts.slice(1).join(" ");
              const question = PUZZLE_DATA.questions.find(q => q.id === qId);

              if (question) {
                if (question.answer === userAnswer) {
                  await sendMessage(token, chatId, `✅ **آفرین!** پاسخ سوال ${qId} درست بود.`);
                } else {
                  await sendMessage(token, chatId, `❌ پاسخ خانه ${qId} اشتباه است. دوباره تلاش کن!`);
                }
              } else {
                await sendMessage(token, chatId, "⚠️ شماره سوال معتبر نیست. دستور /جدول را بزنید.");
              }
            } else {
              await sendMessage(token, chatId, "💡 برای پاسخ به جدول، شماره سوال و جواب را با فاصله بفرستید.\nمثال: `1 تهران`\n\nبرای دیدن لیست سوالات: /جدول");
            }
          }
        }
      } catch (err) {
        console.log("General Error:", err.message);
      }
      return new Response("OK", { status: 200 });
    }
    return new Response("Bot is running!", { status: 200 });
  },
};
