// ==========================================
// ۱. دیتابیس جدول‌های کلاسیک (۱۰ در ۱۰)
// ==========================================
const CLASSIC_PUZZLE = {
  id: "classic_10x10_1",
  title: "جدول کلاسیک شماره ۱",
  rows: 10,
  cols: 10,
  // خانه‌های مشکی ثابت جدول [row, col] (از ۰ تا ۹)
  blocks: [
    [0, 3], [0, 7],
    [1, 5],
    [2, 2], [2, 8],
    [3, 4],
    [4, 1], [4, 6],
    [5, 3], [5, 8],
    [6, 5],
    [7, 1], [7, 7],
    [8, 4],
    [9, 2], [9, 6]
  ],
  // کلمات افقی و عمودی با محل شروع و طول کلمه
  words: [
    // --- افقی (Across) ---
    { id: "H1_1", label: "۱ افقی (اول)", type: "across", row: 0, col: 0, length: 3, answer: "ارم", clue: "بهشت موعود" },
    { id: "H1_2", label: "۱ افقی (دوم)", type: "across", row: 0, col: 4, length: 3, answer: "سعدی", clue: "شاعر گلستان" },
    { id: "H2_1", label: "۲ افقی", type: "across", row: 1, col: 0, length: 5, answer: "ایران", clue: "کشور عزیزمان" },
    { id: "H3_1", label: "۳ افقی", type: "across", row: 2, col: 3, length: 5, answer: "تهران", clue: "پایتخت ایران" },
    
    // --- عمودی (Down) ---
    { id: "V1_1", label: "۱ عمودی", type: "down", row: 0, col: 0, length: 3, answer: "امیر", clue: "فرمانروا و پادشاه" },
    { id: "V2_1", label: "۲ عمودی", type: "down", row: 0, col: 1, length: 5, answer: "رازی", clue: "کاشف الکل" },
    { id: "V5_1", label: "۵ عمودی", type: "down", row: 0, col: 4, length: 5, answer: "سیروان", clue: "نام رودی در غرب ایران" }
  ]
};

function toPersianDigits(num) {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => farsiDigits[x]);
}

class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId, text, replyMarkup = null, replyToMessageId = null) {
    const payload = { chat_id: chatId, text: text, parse_mode: "HTML" };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;

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

  async answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
    });
  }
}

class CrosswordEngine {
  static renderTable(puzzle, solvedWordIds = []) {
    // ۱. ساخت شبکه‌ اولیه با خانه‌های خالی
    let grid = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill("⬜"));

    // ۲. اعمال خانه‌های مشکی
    puzzle.blocks.forEach(([r, c]) => {
      if (r < puzzle.rows && c < puzzle.cols) {
        grid[r][c] = "⬛";
      }
    });

    // ۳. پر کردن حروف کلمات حل شده (با پشتیبانی از تقاطع‌ها)
    puzzle.words.forEach((w) => {
      if (solvedWordIds.includes(w.id)) {
        const chars = w.answer.split("");
        chars.forEach((char, idx) => {
          let r = w.row;
          let c = w.col;
          if (w.type === "across") c += idx;
          else r += idx;

          if (r < puzzle.rows && c < puzzle.cols) {
            grid[r][c] = char;
          }
        });
      }
    });

    // ۴. ساخت خروجی متنی شبکه جدول
    let tableStr = `🧩 <b>${puzzle.title}</b>\n\n`;
    for (let r = 0; r < puzzle.rows; r++) {
      tableStr += grid[r].join(" ") + "\n";
    }
    return tableStr + "\n";
  }

  static renderQuestions(puzzle, solvedWordIds = []) {
    let qStr = "📝 <b>راهنمای سوالات:</b>\n\n<b>افقی:</b>\n";
    
    const acrossWords = puzzle.words.filter(w => w.type === "across");
    const downWords = puzzle.words.filter(w => w.type === "down");

    acrossWords.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const status = isSolved ? "✅" : "❓";
      qStr += `${status} <b>${w.label}:</b> ${w.clue}\n`;
    });

    qStr += "\n<b>عمودی:</b>\n";
    downWords.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const status = isSolved ? "✅" : "❓";
      qStr += `${status} <b>${w.label}:</b> ${w.clue}\n`;
    });

    return qStr;
  }
}

// ==========================================
// ۲. بخش اصلی Cloudflare Worker
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Classic Crossword Running", { status: 200 });
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) return new Response("Token Missing", { status: 500 });

    const telegram = new TelegramAPI(token);
    const kv = env.CROSSWORD_KV;

    try {
      const update = await request.json();

      if (update.callback_query) {
        await handleCallback(update.callback_query, telegram, kv);
      } else if (update.message && update.message.text) {
        await handleMessage(update.message, telegram, kv);
      }
    } catch (err) {
      console.error("Worker Error:", err);
    }

    return new Response("OK", { status: 200 });
  }
};

async function handleMessage(message, telegram, kv) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();

  if (text.startsWith("/")) {
    const command = text.split(" ")[0].toLowerCase().split("@")[0];

    if (command === "/start") {
      await telegram.sendMessage(chatId, "سلام! برای شروع جدول ۱۰×۱۰ کلاسیک دستور /new را بفرستید.");
    } else if (command === "/new") {
      const puzzle = CLASSIC_PUZZLE;
      const state = {
        puzzleId: puzzle.id,
        solvedWordIds: [],
        activeQuestion: {},
        messageId: null
      };

      const tableText = CrosswordEngine.renderTable(puzzle, []);
      const qText = CrosswordEngine.renderQuestions(puzzle, []);
      const keyboard = buildKeyboard(puzzle, []);

      const sent = await telegram.sendMessage(chatId, tableText + qText, keyboard);
      if (sent && sent.result) {
        state.messageId = sent.result.message_id;
        await kv.put(`puzzle:${chatId}`, JSON.stringify(puzzle));
        await kv.put(`state:${chatId}`, JSON.stringify(state));
      }
    }
    return;
  }

  const rawState = await kv.get(`state:${chatId}`);
  if (!rawState) return;
  const state = JSON.parse(rawState);

  const activeQId = state.activeQuestion[userId];
  if (!activeQId) return;

  const rawPuzzle = await kv.get(`puzzle:${chatId}`);
  if (!rawPuzzle) return;
  const puzzle = JSON.parse(rawPuzzle);

  const word = puzzle.words.find((w) => w.id === activeQId);
  if (!word) return;

  if (text.replace(/\s+/g, "") === word.answer) {
    if (!state.solvedWordIds.includes(word.id)) {
      state.solvedWordIds.push(word.id);
    }
    delete state.activeQuestion[userId];
    await kv.put(`state:${chatId}`, JSON.stringify(state));

    const isAllSolved = state.solvedWordIds.length === puzzle.words.length;
    const tableText = CrosswordEngine.renderTable(puzzle, state.solvedWordIds);
    const qText = CrosswordEngine.renderQuestions(puzzle, state.solvedWordIds);
    const keyboard = buildKeyboard(puzzle, state.solvedWordIds);

    await telegram.editMessageText(chatId, state.messageId, tableText + qText, keyboard);

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 آفرین! تمام سوالات جدول با موفقیت حل شد!");
    } else {
      await telegram.sendMessage(chatId, `✅ پاسخ ${word.label} درست بود!`);
    }
  } else {
    await telegram.sendMessage(chatId, "❌ پاسخ نادرست است، دوباره تلاش کنید.", null, message.message_id);
  }
}

async function handleCallback(cb, telegram, kv) {
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const data = cb.data;

  const rawState = await kv.get(`state:${chatId}`);
  if (!rawState) {
    await telegram.answerCallbackQuery(cb.id, "این جدول فعال نیست.", true);
    return;
  }
  const state = JSON.parse(rawState);

  if (data.startsWith("q_")) {
    const qId = data.replace("q_", "");
    const rawPuzzle = await kv.get(`puzzle:${chatId}`);
    if (!rawPuzzle) return;
    const puzzle = JSON.parse(rawPuzzle);

    const word = puzzle.words.find(w => w.id === qId);

    if (state.solvedWordIds.includes(qId)) {
      await telegram.answerCallbackQuery(cb.id, "این سوال قبلاً حل شده!", true);
      return;
    }

    state.activeQuestion[userId] = qId;
    await kv.put(`state:${chatId}`, JSON.stringify(state));

    await telegram.answerCallbackQuery(cb.id, `سوال ${word.label} انتخاب شد.`);
    await telegram.sendMessage(chatId, `پاسخ <b>${word.label}</b> (${word.clue}) را بنویسید:`);
  }
}

function buildKeyboard(puzzle, solvedWordIds) {
  const buttons = puzzle.words.map((w) => {
    const isSolved = solvedWordIds.includes(w.id);
    return {
      text: isSolved ? `✅ ${w.label}` : `❓ ${w.label}`,
      callback_data: isSolved ? "ignore" : `q_${w.id}`
    };
  });

  const rows = [];
  while (buttons.length > 0) {
    rows.push(buttons.splice(0, 3));
  }
  return { inline_keyboard: rows };
}
