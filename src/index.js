const CHANNEL_USERNAME = "@parvapoem";

async function sendMessage(token, chatId, text, parseMode = "Markdown") {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: parseMode }),
  });
}

async function checkChannelMembership(token, userId) {
  try {
    const url = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok) {
      return ["creator", "administrator", "member"].includes(data.result.status);
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function handleUpdate(update, env) {
  const token = env.BOT_TOKEN;
  if (!token || !update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();
  const userId = update.message.from.id;

  if (text === "/start" || text === "/جدول" || text.startsWith("/newgame")) {
    const isMember = await checkChannelMembership(token, userId);
    if (!isMember) {
      await sendMessage(token, chatId, `⚠️ برای استفاده از ربات ابتدا باید عضو کانال شوید:\n\n📢 ${CHANNEL_USERNAME}`);
      return;
    }
    await sendMessage(token, chatId, "🎮 *جدول جدید شروع شد!* \nبرای حدس کلمات، کلمه مورد نظر خود را بفرستید.");
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        await handleUpdate(update, env);
      } catch (e) {}
      return new Response("OK", { status: 200 });
    }
    return new Response("Bot is running!", { status: 200 });
  },
};
