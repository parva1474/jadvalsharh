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
        const cq = update.callback_query;
        const chatId = cq.message.chat.id;
        const userId = cq.from.id;
        const data = cq.data;

        if (data === "check_membership") {
          const isMember = await telegram.checkChannelMember(userId);
          if (isMember) {
            await telegram.answerCallbackQuery(cq.id, "عضویت شما تایید شد!", true);
            await telegram.deleteMessage(chatId, cq.message.message_id);
            // شروع خودکار بازی پس از تایید عضویت
            const puzzle = PuzzleEngine.generate();
            const state = {
              puzzleId: puzzle.id,
              solvedWordIds: [],
              revealedCells: {},
              activeQuestion: {},
              lastPromptMsgId: null,
              messageId: null,
              players: [userId]
            };
            const tableText = PuzzleEngine.renderTable(puzzle, [], {});
            const qText = PuzzleEngine.renderQuestions(puzzle);
            const keyboard = buildMainKeyboard(puzzle, []);
            const sent = await telegram.sendMessage(chatId, tableText + qText, keyboard);
            if (sent && sent.result) {
              state.messageId = sent.result.message_id;
              if (kv) {
                await kv.put(`puzzle:${chatId}`, JSON.stringify(puzzle));
                await kv.put(`state:${chatId}`, JSON.stringify(state));
              }
            }
          } else {
            await telegram.answerCallbackQuery(cq.id, "هنوز در کانال عضو نشده‌اید!", true);
          }
        } else if (data.startsWith("nav_across_") || data.startsWith("nav_down_")) {
          const parts = data.split("_");
          const type = parts[1]; // across یا down
          const index = parseInt(parts[2]);
          
          if (kv) {
            const rawPuzzle = await kv.get(`puzzle:${chatId}`);
            const rawState = await kv.get(`state:${chatId}`);
            if (rawPuzzle && rawState) {
              const puzzle = JSON.parse(rawPuzzle);
              const state = JSON.parse(rawState);
              const targetWords = puzzle.words.filter(w => w.type === type && w.index === index);
              
              if (targetWords.length > 0) {
                const word = targetWords[0];
                state.activeQuestion[userId] = word.id;
                await kv.put(`state:${chatId}`, JSON.stringify(state));
                
                const promptText = `👉 کلمه مربوط به راهنمایی زیر را ارسال کنید:\n\n<b>${word.clue}</b> (طول: ${toPersianDigits(word.answer.length)} حرف)`;
                const sentPrompt = await telegram.sendMessage(chatId, promptText);
                if (sentPrompt && sentPrompt.result) {
                  state.lastPromptMsgId = sentPrompt.result.message_id;
                  await kv.put(`state:${chatId}`, JSON.stringify(state));
                }
              }
            }
          }
          await telegram.answerCallbackQuery(cq.id);
        } else {
          await telegram.answerCallbackQuery(cq.id);
        }
      } 
      else if (update.message && update.message.text) {
        const message = update.message;
        const chatId = message.chat.id;
        const userId = message.from.id;
        const userName = message.from.first_name || "بازیکن";
        const text = message.text.trim();

        const isMember = await telegram.checkChannelMember(userId);
        if (!isMember) {
          await telegram.sendMessage(chatId, `⚠️ <b>برای بازی در جدول باید ابتدا عضو کانال شوید:</b>`, getJoinKeyboard());
          return;
        }

        if (text.startsWith("/")) {
          const command = text.split(" ")[0].toLowerCase().split("@")[0];

          if (command === "/start" || command === "/new") {
            const puzzle = PuzzleEngine.generate();
            const state = {
              puzzleId: puzzle.id,
              solvedWordIds: [],
              revealedCells: {},
              activeQuestion: {},
              lastPromptMsgId: null,
              messageId: null,
              players: [userId]
            };

            const tableText = PuzzleEngine.renderTable(puzzle, [], {});
            const qText = PuzzleEngine.renderQuestions(puzzle);
            const keyboard = buildMainKeyboard(puzzle, []);

            const sent = await telegram.sendMessage(chatId, tableText + qText, keyboard);
            if (sent && sent.result) {
              state.messageId = sent.result.message_id;
              if (kv) {
                await kv.put(`puzzle:${chatId}`, JSON.stringify(puzzle));
                await kv.put(`state:${chatId}`, JSON.stringify(state));
              }
            }
            return;
          }
        }

        if (!kv) return;
        const rawState = await kv.get(`state:${chatId}`);
        if (!rawState) return;
        const state = JSON.parse(rawState);

        const activeQId = state.activeQuestion[userId];
        if (!activeQId) return;

        const rawPuzzle = await kv.get(`puzzle:${chatId}`);
        if (!rawPuzzle) return;
        const puzzle = JSON.parse(rawPuzzle);

        const word = puzzle.words.find(w => w.id === activeQId);
        if (!word) return;

        await telegram.deleteMessage(chatId, message.message_id);

        if (text.replace(/\s+/g, "") === word.answer) {
          if (!state.solvedWordIds.includes(word.id)) {
            state.solvedWordIds.push(word.id);
            const points = word.answer.length;
            await updateUserScoreAndCredits(kv, userId, userName, 0, points);
            if (!state.players.includes(userId)) state.players.push(userId);
          }

          delete state.activeQuestion[userId];

          if (state.lastPromptMsgId) {
            await telegram.deleteMessage(chatId, state.lastPromptMsgId);
            state.lastPromptMsgId = null;
          }

          const newTableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds, state.revealedCells);
          const qText = PuzzleEngine.renderQuestions(puzzle);
          const newKeyboard = buildMainKeyboard(puzzle, state.solvedWordIds);

          if (state.messageId) {
            await telegram.editMessageText(chatId, state.messageId, newTableText + qText, newKeyboard);
          }
          await kv.put(`state:${chatId}`, JSON.stringify(state));
        }
      }
    } catch (err) {
      console.error(err);
    }
    return new Response("OK", { status: 200 });
  }
};
