const CHANNEL_USERNAME = "@parvapoem";

// یکسان‌سازی حروف فارسی
function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/[آأإٱآِاِاَُِّ]/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}

// دیتای نمونه جدول
const SAMPLE_PUZZLE = {
  id: 1,
  title: "جدول شرح در متن شماره ۱ (۱۰×۱۵)",
  questions: {
    1: { text: "پایتخت ایران", answer: "تهران", length: 5 },
    2: { text: "بلندترین قله ایران", answer: "دماوند", length: 6 },
    3: { text: "شاعر گلستان و بوستان", answer: "سعدی", length: 4 }
  }
};

// ارسال یا ویرایش پیام با کیبورد شیشه‌ای
async function sendOrEditMessage(token, chatId, messageId, text, replyMarkup) {
  const method = messageId ? "editMessageText" : "sendMessage";
  const url = `https://api.telegram.org/bot${token}/${method}`;
  
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: replyMarkup
  };
  if (messageId) body.message_id = messageId;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

// کیبورد حروف فارسی شیشه‌ای
function getAlphabetKeyboard(qId, currentInput = "") {
  const letters = [
    ["ا", "ب", "پ", "ت", "ث", "ج"],
    ["چ", "ح", "خ", "د", "ذ", "ر"],
    ["ز", "ژ", "س", "ش", "ص", "ض"],
    ["ط", "ظ", "ع", "غ", "ف", "ق"],
    ["ک", "گ", "ل", "م", "ن", "و"],
    ["هـ", "ی"]
  ];

  const inlineKeyboard = letters.map(row => 
    row.map(char => ({
      text: char,
      callback_data: `type_${qId}_${char}`
    }))
  );

  // دکمه‌های کنترل (پاک کردن، ثبت، بازگشت)
  inlineKeyboard.push([
    { text: "⌫ پاک کردن", callback_data: `del_${qId}` },
    { text: "✅ ثبت پاسخ", callback_data: `submit_${qId}` }
  ]);
  inlineKeyboard.push([
    { text: "🔙 بازگشت به جدول", callback_data: "main_menu" }
  ]);

  return { inline_keyboard: inlineKeyboard };
}

// کیبورد انتخاب خانه‌های جدول
function getGridQuestionsKeyboard() {
  const keyboard = [
    [
      { text: "🏠 خانه ۱ (۵ حرفی)", callback_data: "select_q_1" },
      { text: "🏠 خانه ۲ (۶ حرفی)", callback_data: "select_q_2" }
    ],
    [
      { text: "🏠 خانه ۳ (۴ حرفی)", callback_data: "select_q_3" }
    ]
  ];
  return { inline_keyboard: keyboard };
}

// حافظه موقت ساده برای ذخیره حروف تایپ شده کاربران
const userSessions = {};

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        const token = env.BOT_TOKEN;

        // ۱. پردازش دستورات متنی (/start)
        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();

          if (text === "/start" || text === "/جدول") {
            const gridView = 
              `🧩 **${SAMPLE_PUZZLE.title}**\n\n` +
              `\`\`\`\n` +
              `+----+----+----+----+----+----+\n` +
              `| 1⬇ | ⬛ | 2⬇ | ⬛ | 3⬇ | ⬛ |\n` +
              `|شرح1|    |شرح2|    |شرح3|    |\n` +
              `+----+----+----+----+----+----+\n` +
              `\`\`\`\n\n` +
              `👇 **برای پاسخ‌دهی، روی خانه مورد نظر کلیک کنید:**`;

            await sendOrEditMessage(token, chatId, null, gridView, getGridQuestionsKeyboard());
          }
        }

        // ۲. پردازش کلیک روی دکمه‌های شیشه‌ای (Callback Queries)
        if (update.callback_query) {
          const query = update.callback_query;
          const chatId = query.message.chat.id;
          const messageId = query.message.message_id;
          const data = query.data;
          const userId = query.from.id;

          if (!userSessions[userId]) userSessions[userId] = {};

          // بازگشت به منوی اصلی
          if (data === "main_menu") {
            const gridView = 
              `🧩 **${SAMPLE_PUZZLE.title}**\n\n` +
              `👇 **یک خانه را برای تایپ پاسخ انتخاب کنید:**`;
            await sendOrEditMessage(token, chatId, messageId, gridView, getGridQuestionsKeyboard());
          }

          // انتخاب سوال
          else if (data.startsWith("select_q_")) {
            const qId = parseInt(data.replace("select_q_", ""));
            const qData = SAMPLE_PUZZLE.questions[qId];
            userSessions[userId][qId] = ""; // بازنشانی ورودی

            const emptyBoxes = " [  ] ".repeat(qData.length);
            const text = 
              `📝 **سوال خانه ${qId}:** ${qData.text} (${qData.length} حرفی)\n\n` +
              `📌 **پاسخ شما:**\n\`${emptyBoxes}\`\n\n` +
              `👇 *با کلیک روی حروف زیر، خانه‌ها را پر کنید:*`;

            await sendOrEditMessage(token, chatId, messageId, text, getAlphabetKeyboard(qId));
          }

          // تایپ حرف
          else if (data.startsWith("type_")) {
            const [, qIdStr, char] = data.split("_");
            const qId = parseInt(qIdStr);
            const qData = SAMPLE_PUZZLE.questions[qId];

            let current = userSessions[userId][qId] || "";
            if (current.length < qData.length) {
              current += char;
              userSessions[userId][qId] = current;
            }

            // ساخت نمایش مربعی خانه‌ها
            let boxesDisplay = "";
            for (let i = 0; i < qData.length; i++) {
              boxesDisplay += current[i] ? ` [ ${current[i]} ] ` : " [  ] ";
            }

            const text = 
              `📝 **سوال خانه ${qId}:** ${qData.text} (${qData.length} حرفی)\n\n` +
              `📌 **پاسخ شما:**\n\`${boxesDisplay}\`\n\n` +
              `👇 *حرف بعدی را انتخاب کنید یا ثبت را بزنید:*`;

            await sendOrEditMessage(token, chatId, messageId, text, getAlphabetKeyboard(qId));
          }

          // پاک کردن آخرین حرف
          else if (data.startsWith("del_")) {
            const qId = parseInt(data.replace("del_", ""));
            const qData = SAMPLE_PUZZLE.questions[qId];

            let current = userSessions[userId][qId] || "";
            if (current.length > 0) {
              current = current.slice(0, -1);
              userSessions[userId][qId] = current;
            }

            let boxesDisplay = "";
            for (let i = 0; i < qData.length; i++) {
              boxesDisplay += current[i] ? ` [ ${current[i]} ] ` : " [  ] ";
            }

            const text = 
              `📝 **سوال خانه ${qId}:** ${qData.text} (${qData.length} حرفی)\n\n` +
              `📌 **پاسخ شما:**\n\`${boxesDisplay}\`\n\n` +
              `👇 *حرف بعدی را انتخاب کنید یا ثبت را بزنید:*`;

            await sendOrEditMessage(token, chatId, messageId, text, getAlphabetKeyboard(qId));
          }

          // ثبت پاسخ
          else if (data.startsWith("submit_")) {
            const qId = parseInt(data.replace("submit_", ""));
            const qData = SAMPLE_PUZZLE.questions[qId];
            const userAns = normalizeText(userSessions[userId][qId] || "");
            const correctAns = normalizeText(qData.answer);

            if (userAns === correctAns) {
              const successText = 
                `🎉 **آفرین! پاسخ خانه ${qId} درست بود!**\n\n` +
                `✅ **جواب:** ${qData.answer}\n\n` +
                `برای ادامه بازی روی دکمه زیر کلیک کنید:`;
              
              await sendOrEditMessage(token, chatId, messageId, successText, {
                inline_keyboard: [[{ text: "🔙 بازگشت به جدول", callback_data: "main_menu" }]]
              });
            } else {
              const failText = 
                `❌ **پاسخ اشتباه بود!**\n\n` +
                `پاسخ وارد شده: \`${userSessions[userId][qId]}\`\n` +
                `دوباره امتحان کنید یا خانه دیگری را انتخاب کنید.`;

              await sendOrEditMessage(token, chatId, messageId, failText, {
                inline_keyboard: [
                  [{ text: "🔄 تلاش مجدد", callback_data: `select_q_${qId}` }],
                  [{ text: "🔙 بازگشت به جدول", callback_data: "main_menu" }]
                ]
              });
            }
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
