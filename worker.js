import { TelegramAPI } from "./telegram.js";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Minimal Worker Active", { status: 200 });
    }

    try {
      const update = await request.json();

      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text.trim();
        const telegram = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);

        if (text.startsWith("/new")) {
          await telegram.sendMessage(chatId, "🚀 واکنش دریافت شد! دستور /new با موفقیت پردازش شد.");
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }

    return new Response("OK", { status: 200 });
  }
};
