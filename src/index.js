// ==========================================
// تنظیمات اصلی
// ==========================================
const CHANNEL_USERNAME = "@parvapoem";

// ==========================================
// تابع ارسال پیام به تلگرام
// ==========================================
async function sendMessage(token, chatId, text, parseMode = "Markdown") {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
    }),
  });
}

// ==========================================
// چک کردن عضویت اجباری در کانال
// ==========================================
async function checkChannelMembership(token, userId) {
  try {
    const url = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.ok) {
      const status = data.result.status;
      return ["creator", "administrator", "member"].includes(status);
    }
    return false;
  } catch (e) {
    console.error("Channel Check Error:", e);
    return false;
  }
}

// ==========================================
// ارسال پیام قفل عضویت کانال
// ==========================================
async function sendJoinChannelMessage(token, chatId) {
  const text = `⚠️ *جهت استفاده از ربات جدول، ابتدا باید عضو کانال زیر شوید:*

📢 ${CHANNEL_USERNAME}

پس از عضویت در کانال، دوباره دستور /start یا /جدول را ارسال کنید.`;

  await sendMessage(token, chatId, text);
}

// ==========================================
// پردازش Updateهای تلگرام
// ==========================================
async function handleUpdate(update, env) {
  const token = env.BOT_TOKEN;

  if (!token) {
    console.error("BOT_TOKEN is not defined in Cloudflare environment variables.");
    return;
  }

  // پیام‌های متنی
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const userId = update.message.from.id;

    // دستور شروع بازی
    if (text === "/start" || text === "/جدول" || text.startsWith("/newgame")) {
      const isMember = await checkChannelMembership(token, userId);
      
      if (!isMember) {
        await sendJoinChannelMessage(token, chatId);
        return;
      }

      // شروع بازی جدید
      await sendMessage(token, chatId, "🎮 *جدول جدید شروع شد!* \nبرای حدس کلمات، کلمه مورد نظر خود را بفرستید.");
      return;
    }
  }
}

// ==========================================
// ورودی اصلی Cloudflare Worker
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        await handleUpdate(update, env);
      } catch (e) {
        console.error("Worker Error:", e);
      }
      return new Response("OK", { status: 200 });
    }
    return new Response("Bot is running!", { status: 200 });
  },
};
