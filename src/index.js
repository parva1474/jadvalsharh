const CHANNEL_USERNAME = "@parvapoem";

function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/[آأإٱآِاِاَُِّ]/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}

async function sendMessage(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown" }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.log("❌ Error in sendMessage:", JSON.stringify(data));
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
    console.log("⚠️ Channel check failed (Is bot admin in channel?):", JSON.stringify(data));
    return false;
  } catch (e) {
    console.log("⚠️ Channel check exception:", e.message);
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
          console.log("❌ ERROR: BOT_TOKEN variable is missing in Cloudflare!");
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
              `⚠️ **برای شروع بازی، ابتدا باید عضو کانال زیر شوید:**\n\n📢 ${CHANNEL_USERNAME}\n\nپس از عضویت، مجدداً /start را بفرستید.`
            );
            return new Response("OK", { status: 200 });
          }

          // ۲. دستورات ربات جدول شرح در متن
          if (text === "/start" || text === "/جدول" || text === "/newgame") {
            const gridText = 
              "🧩 **جدول شرح در متن شماره ۱ (۱۰×۱۵)**\n\n" +
              "👇 *با نگه داشتن دست روی کادر زیر، سوالات بزرگنمایی می‌شوند:*\n\n" +
              "```\n" +
              "+----+----+----+----+----+----+----+----+----+----+\n" +
              "| 1⬇ | ⬛ | 2⬇ | ⬛ | 3⬇ | ⬛ | 4⬇ | ⬛ | 5⬇ | ⬛ |\n" +
              "|شرح1|    |شرح2|    |شرح3|    |شرح4|    |شرح5|    |\n" +
              "+----+----+----+----+----+----+----+----+----+----+\n" +
              "| 6➡ |    |    |    | 7➡ |    |    |    |    |    |\n" +
              "|شرح6|    |    |    |شرح7|    |    |    |    |    |\n" +
              "+----+----+----+----+----+----+----+----+----+----+\n" +
              "| 8⬇ | ⬛ | 9⬇ | ⬛ |10⬇ | ⬛ |11⬇ | ⬛ |12⬇ | ⬛ |\n" +
              "|شرح8|    |شرح9|    |شرح10   |شرح11   |شرح12   |\n" +
              "+----+----+----+----+----+----+----+----+----+----+\n" +
              "```\n\n" +
              "📋 **راهنمای شرح خانه ها:**\n" +
              "• **خانه ۱ (⬇):** پایتخت ایران (۵ حرفی)\n" +
              "• **خانه ۲ (⬇):** بلندترین قله ایران (۶ حرفی)\n" +
              "• **خانه ۶ (➡):** شاعر بوستان و گلستان (۴ حرفی)\n\n" +
              "💡 **نحوه پاسخ:** شماره خانه و جواب را بفرستید.\nمثال: `1 تهران`";

            await sendMessage(token, chatId, gridText);
          } else {
            const parts = text.split(" ");
            if (parts.length >= 2) {
              const qId = parseInt(parts[0]);
              const userAnswer = normalizeText(parts.slice(1).join(" "));

              const answers = {
                1: normalizeText("تهران"),
                2: normalizeText("دماوند"),
                6: normalizeText("سعدی")
              };

              if (answers[qId]) {
                if (answers[qId] === userAnswer) {
                  await sendMessage(token, chatId, `✅ **آفرین!** خانه شماره ${qId} درست حل شد.`);
                } else {
                  await sendMessage(token, chatId, `❌ پاسخ خانه شماره ${qId} اشتباه است.`);
                }
              } else {
                await sendMessage(token, chatId, "⚠️ شماره خانه پیدا نشد. برای مشاهده جدول /جدول را بزنید.");
              }
            } else {
              await sendMessage(token, chatId, "💡 برای حل خانه، شماره خانه و جواب را بفرستید.\nمثال: `1 تهران`\n\nدیدن جدول: /جدول");
            }
          }
        }
      } catch (err) {
        console.log("❌ General Worker Error:", err.message);
      }
      return new Response("OK", { status: 200 });
    }
    return new Response("Bot is running!", { status: 200 });
  },
};
