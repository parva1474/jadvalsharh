const CHANNEL_USERNAME = "@parvapoem";

// نرمال‌سازی حروف (تبدیل آ، أ، إ، ٱ به "ا")
function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/[آأإٱآِاِاَُِّ]/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}

// دیتای نمونه جدول ۱۰ در ۱۵
const SAMPLE_PUZZLE = {
  id: 1,
  questions: {
    1: { num: "1⬇", hint: "پایتخت ایران", answer: "تهران", length: 5 },
    2: { num: "2⬇", hint: "بلندترین قله ایران", answer: "دماوند", length: 6 },
    3: { num: "3➡", hint: "شاعر بوستان و گلستان", answer: "سعدی", length: 4 }
  }
};

async function sendMessage(token, chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// کیبورد شیشه‌ای پایین پیام (مشابه عکس کلمه‌پیچ)
function getGameButtons() {
  return {
    inline_keyboard: [
      [
        { text: "💡 راهنما", callback_data: "hint_btn" },
        { text: "❌ انصراف", callback_data: "cancel_btn" }
      ],
      [
        { text: "❓ چجوریه؟", callback_data: "help_btn" }
      ]
    ]
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        const token = env.BOT_TOKEN;

        // ۱. پردازش پیام‌های متنی (ارسال پاسخ با کیبورد گوشی)
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();
          const user = update.message.from;

          if (text === "/start" || text === "/جدول" || text === "/newgame") {
            const gridDisplay = 
              `🧩 **جدول ۱۰ در ۱۵ - شماره ۱**\n\n` +
              `\`\`\`\n` +
              `+----+----+----+----+----+\n` +
              `| 1⬇ | ⬛ | 2⬇ | ⬛ | 3➡ |\n` +
              `|    |    |    |    |    |\n` +
              `+----+----+----+----+----+\n` +
              `\`\`\`\n\n` +
              `❓ **سوالات جدول:**\n` +
              `• **۱⬇:** پایتخت ایران (۵ حرفی)\n` +
              `• **۲⬇:** بلندترین قله ایران (۶ حرفی)\n` +
              `• **۳➡:** شاعر بوستان و گلستان (۴ حرفی)\n\n` +
              `✍️ **برای پاسخ‌دهی، با کیبورد گوشی شماره سوال و جواب را بفرستید:**\n` +
              `مثال: \`1 تهران\``;

            await sendMessage(token, chatId, gridDisplay, getGameButtons());
          } 
          
          else {
            // بررسی پاسخ کاربر (مثال: "1 تهران" یا "تهران")
            const parts = text.split(" ");
            let qId = null;
            let userAnswer = "";

            if (parts.length >= 2 && !isNaN(parts[0])) {
              qId = parseInt(parts[0]);
              userAnswer = normalizeText(parts.slice(1).join(" "));
            } else {
              userAnswer = normalizeText(text);
            }

            // چک کردن جواب
            let found = false;
            for (const id in SAMPLE_PUZZLE.questions) {
              const q = SAMPLE_PUZZLE.questions[id];
              if ((qId === null || parseInt(id) === qId) && normalizeText(q.answer) === userAnswer) {
                found = true;
                await sendMessage(
                  token, 
                  chatId, 
                  `🎉 **آفرین ${user.first_name}!**\n` +
                  `پاسخ سوال **${q.num}** (${q.answer}) درست بود! 👏\n\n` +
                  `➕ **۱۰+ امتیاز** برای شما ثبت شد.`
                );
                break;
              }
            }

            if (!found && text.length > 2 && !text.startsWith("/")) {
              await sendMessage(token, chatId, "❌ پاسخ اشتباه است. دوباره تلاش کنید!");
            }
          }
        }

        // ۲. پردازش دکمه‌های شیشه‌ای
        if (update.callback_query) {
          const query = update.callback_query;
          const chatId = query.message.chat.id;
          const data = query.data;

          if (data === "help_btn") {
            await sendMessage(
              token, 
              chatId, 
              "📖 **راهنمای بازی:**\n\n" +
              "کافیه شماره سوال و پاسخ اون رو با کیبورد گوشیت تایپ کنی و بفرستی!\n" +
              "مثال: `1 تهران`"
            );
          } else if (data === "hint_btn") {
            await sendMessage(token, chatId, "💡 **راهنمایی:** حرف اول سوال ۱ (ت) است.");
          }
        }

      } catch (err) {
        console.log("Error:", err.message);
      }
      return new Response("OK", { status: 200 });
    }
    return new Response("Bot is running!", { status: 200 });
  },
};
