import { TelegramAPI } from "./telegram.js";
import { Storage } from "./storage.js";
import { CrosswordEngine } from "./crossword.js";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Worker Active", { status: 200 });
    }

    const telegram = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
    const storage = new Storage(env.CROSSWORD_KV);

    try {
      const update = await request.json();

      if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text || "بدون متن";
        const chatType = update.message.chat.type;

        // گزارش دریافتی برای تست ارتباط گروه
        await telegram.sendMessage(
          chatId,
          `📥 **پیام دریافت شد!**\n\n` +
          `🔹 **نوع چت:** <code>${chatType}</code>\n` +
          `🔹 **متن:** <code>${text}</code>`
        );

        if (text.includes("/new")) {
          await telegram.sendMessage(chatId, "🚀 دستور /new دریافت شد! در حال خواندن دیتابیس...");

          const puzzles = await storage.getAllPuzzleIds();
          if (!puzzles || puzzles.length === 0) {
            await telegram.sendMessage(chatId, "❌ دیتابیس خالی است (puzzles:index پیدا نشد).");
            return new Response("OK", { status: 200 });
          }

          const puzzle = await storage.getPuzzle(puzzles[0]);
          if (!puzzle) {
            await telegram.sendMessage(chatId, `❌ جدول ${puzzles[0]} در KV پیدا نشد.`);
            return new Response("OK", { status: 200 });
          }

          const tableText = CrosswordEngine.renderTable(puzzle, []);
          await telegram.sendMessage(chatId, `✅ جدول رندر شد:\n\n${tableText}`);
        }
      }
    } catch (err) {
      console.error("Worker Error:", err);
    }

    return new Response("OK", { status: 200 });
  }
};
