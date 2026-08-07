// ==========================================
// فایل: worker.js
// ==========================================
import { PuzzleEngine, CHANNEL_USERNAME, CHANNEL_LINK, NUM_EMOJIS, toPersianDigits } from './puzzleEngine.js';

const DEFAULT_BOT_TOKEN = "8595424524:AAEWYrIAzj6RRE7_G-5zY33333333333333";

class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async checkChannelMember(userId) {
    try {
      const res = await fetch(`${this.baseUrl}/getChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHANNEL_USERNAME, user_id: userId })
      });
      const data = await res.json();
      if (data.ok && ["creator", "administrator", "member"].includes(data.result.status)) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  async sendMessage(chatId, text, replyMarkup = null) {
    const payload = { chat_id: chatId, text: text, parse_mode: "HTML" };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    const res = await fetch(`${this.baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  async editMessageText(chatId, messageId, text, replyMarkup = null) {
    const payload = { chat_id: chatId, message_id: messageId, text: text, parse_mode: "HTML" };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    const res = await fetch(`${this.baseUrl}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }

  async deleteMessage(chatId, messageId) {
    try {
      await fetch(`${this.baseUrl}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId })
      });
    } catch(e){}
  }

  async answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
    });
  }
}

async function getUserData(kv, userId, name) {
  if (!kv) return { id: userId, name: name || "بازیکن", credits: 50, score: 0 };
  const raw = await kv.get(`user:${userId}`);
  if (raw) return JSON.parse(raw);
  const newUser = { id: userId, name: name || "بازیکن", credits: 50, score: 0 };
  await kv.put(`user:${userId}`, JSON.stringify(newUser));
  return newUser;
}

async function updateUserScoreAndCredits(kv, userId, name, creditsDelta, scoreDelta) {
  const user = await getUserData(kv, userId, name);
  user.name = name || user.name;
  user.credits = Math.max(0, user.credits + creditsDelta);
  user.score += scoreDelta;
  if (kv) await kv.put(`user:${userId}`, JSON.stringify(user));
  return user;
}

function getJoinKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📢 جهت بازی عضو کانال شوید", url: CHANNEL_LINK }],
      [{ text: "✅ عضو شدم (بررسی مجدد)", callback_data: "check_membership" }]
    ]
  };
}

function buildMainKeyboard(puzzle, solvedWordIds) {
  const keyboard = [];

  keyboard.push([{ text: "━━━ ✏️ افقی (۱ تا ۵) ━━━", callback_data: "ignore" }]);
  const acrossRow1 = [];
  for (let i = 1; i <= 5; i++) {
    const unSolvedCount = puzzle.words.filter(w => w.type === "across" && w.index === i && !solvedWordIds.includes(w.id)).length;
    acrossRow1.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_across_${i}` : "ignore"
    });
  }
  keyboard.push(acrossRow1);

  keyboard.push([{ text: "━━━ ✏️ افقی (۶ تا ۱۰) ━━━", callback_data: "ignore" }]);
  const acrossRow2 = [];
  for (let i = 6; i <= 10; i++) {
    const unSolvedCount = puzzle.words.filter(w => w.type === "across" && w.index === i && !solvedWordIds.includes(w.id)).length;
    acrossRow2.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_across_${i}` : "ignore"
    });
  }
  keyboard.push(acrossRow2);

  keyboard.push([{ text: "━━━ ✏️ عمودی (۱ تا ۵) ━━━", callback_data: "ignore" }]);
  const downRow1 = [];
  for (let i = 1; i <= 5; i++) {
    const unSolvedCount = puzzle.words.filter(w => w.type === "down" && w.index === i && !solvedWordIds.includes(w.id)).length;
    downRow1.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_down_${i}` : "ignore"
    });
  }
  keyboard.push(downRow1);

  keyboard.push([{ text: "━━━ ✏️ عمودی (۶ تا ۱۰) ━━━", callback_data: "ignore" }]);
  const downRow2 = [];
  for (let i = 6; i <= 10; i++) {
    const unSolvedCount = puzzle.words.filter(w => w.type === "down" && w.index === i && !solvedWordIds.includes(w.id)).length;
    downRow2.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_down_${i}` : "ignore"
    });
  }
  keyboard.push(downRow2);
  
  keyboard.push([
    { text: "🏆 امتیازات گروه", callback_data: "show_top" },
    { text: "👤 پروفایل من", callback_data: "show_profile" }
  ]);
  keyboard.push([
    { text: "📖 راهنمای بازی", callback_data: "show_guide" },
    { text: "💳 خرید سکه", callback_data: "buy_credits" }
  ]);

  return { inline_keyboard: keyboard };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });
    
    const token = env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
    const telegram = new TelegramAPI(token);
    const kv = env.CROSSWORD_KV;

    try {
      const update = await request.json();
      if (update.callback_query) {
        // مدیریت کلیک دکمه‌ها
      } else if (update.message && update.message.text) {
        // مدیریت پیام‌های متنی
      }
    } catch (err) {
      console.error(err);
    }
    return new Response("OK", { status: 200 });
  }
};
