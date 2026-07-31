// ==========================================
// ۱. بانک کلمات و سوالات جدول
// ==========================================
const WORD_BANK = [
  { word: "ایران", question: "کشوری در جنوب غربی آسیا" },
  { word: "تهران", question: "پایتخت ایران" },
  { word: "ازادی", question: "برج معروف و نمادین تهران" },
  { word: "سعدی", question: "شاعر بوستان و گلستان" },
  { word: "حافظ", question: "لسان‌الغیب شیرازی" },
  { word: "فردوسی", question: "سرایش‌گر شاهنامه" },
  { word: "دماوند", question: "بلندترین قله ایران" },
  { word: "خلیجفارس", question: "پهنه آبی جنوب ایران" },
  { word: "سهند", question: "از کوه‌های استان آذربایجان شرقی" },
  { word: "البرز", question: "رشته‌کوه شمالی ایران" },
  { word: "زاگرس", question: "رشته‌کوه غربی ایران" },
  { word: "اروند", question: "رود مرزی ایران و عراق" },
  { word: "سیمرغ", question: "پرنده افسانه‌ای شاهنامه" },
  { word: "رستم", question: "قهرمان نامدار شاهنامه" },
  { word: "سهراب", question: "فرزند رستم" },
  { word: "کوروش", question: "بنیان‌گذار هخامنشیان" },
  { word: "داریوش", question: "پادشاه بزرگ هخامنشی" },
  { word: "کارون", question: "طولانی‌ترین رود ایران" },
  { word: "کاسپین", question: "نام دیگر دریاچه خزر" }
];

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
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };
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
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML"
    };
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
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert
      })
    });
  }
}

class CrosswordEngine {
  static renderTable(puzzle, solvedWordIds = []) {
    let grid = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill("⬛"));

    puzzle.words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const chars = w.answer.split("");

      chars.forEach((char, idx) => {
        let r = w.startRow;
        let c = w.startCol;
        if (w.direction === "across") c += idx;
        else r += idx;

        if (r < puzzle.rows && c < puzzle.cols) {
          grid[r][c] = isSolved ? char : "⬜";
        }
      });
    });

    let tableStr = "🧩 <b>جدول کلمات متقاطع</b>\n\n";
    for (let r = 0; r < puzzle.rows; r++) {
      tableStr += grid[r].join(" ") + "\n";
    }
    return tableStr + "\n";
  }

  static renderQuestions(puzzle, solvedWordIds = []) {
    let qStr = "📝 <b>راهنمای سوالات:</b>\n";
    puzzle.words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const status = isSolved ? "✅" : "❓";
      const dirText = w.direction === "across" ? "افقی" : "عمودی";
      qStr += `${status} <b>${toPersianDigits(w.id)}.</b> (${dirText}) ${w.clue}\n`;
    });
    return qStr;
  }
}

class DynamicGenerator {
  static generatePuzzle(wordCount = 5) {
    const shuffled = [...WORD_BANK].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, wordCount);

    const puzzleWords = [];
    let idCounter = 1;

    selectedWords.forEach((item, index) => {
      const direction = index % 2 === 0 ? "across" : "down";
      let startRow = direction === "across" ? (index * 2) % 6 : 0;
      let startCol = direction === "across" ? 0 : (index * 2 + 1) % 6;

      puzzleWords.push({
        id: idCounter++,
        answer: item.word,
        clue: item.question,
        direction: direction,
        startRow: startRow,
        startCol: startCol
      });
    });

    return {
      id: "dynamic_" + Date.now(),
      title: "جدول پویا",
      rows: 6,
      cols: 6,
      words: puzzleWords
    };
  }
}

// ==========================================
// ۲. بخش اصلی Cloudflare Worker
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Crossword Bot Running", { status: 200 });
    }

    const token = env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return new Response("Bot Token Not Configured", { status: 500 });
    }

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
      await telegram.sendMessage(chatId, "سلام! برای شروع بازی جدول دستور /new را بفرستید.");
    } else if (command === "/new") {
      const puzzle = DynamicGenerator.generatePuzzle(5);
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
      await telegram.sendMessage(chatId, "🎉 آفرین! جدول به طور کامل حل شد!");
    } else {
      await telegram.sendMessage(chatId, `✅ پاسخ سوال ${toPersianDigits(word.id)} درست بود!`);
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
    const qId = parseInt(data.replace("q_", ""), 10);
    if (state.solvedWordIds.includes(qId)) {
      await telegram.answerCallbackQuery(cb.id, "این سوال قبلاً حل شده!", true);
      return;
    }

    state.activeQuestion[userId] = qId;
    await kv.put(`state:${chatId}`, JSON.stringify(state));

    await telegram.answerCallbackQuery(cb.id, `سوال ${toPersianDigits(qId)} انتخاب شد.`);
    await telegram.sendMessage(chatId, `پاسخ سوال ${toPersianDigits(qId)} را بنویسید:`);
  }
}

function buildKeyboard(puzzle, solvedWordIds) {
  const buttons = puzzle.words.map((w) => {
    const isSolved = solvedWordIds.includes(w.id);
    return {
      text: isSolved ? `✅ ${toPersianDigits(w.id)}` : `${toPersianDigits(w.id)}`,
      callback_data: isSolved ? "ignore" : `q_${w.id}`
    };
  });

  const rows = [];
  while (buttons.length > 0) {
    rows.push(buttons.splice(0, 5));
  }
  return { inline_keyboard: rows };
}
