// ==========================================
// ۱. دیتابیس کلمات (با طول‌های مختلف)
// ==========================================
const WORD_DB = {
  2: [
    { word: "رم", clue: "پایتخت ایتالیا" },
    { word: "بم", clue: "شهر زلزله‌زده ارگ تاریخی" },
    { word: "سد", clue: "دیواره مهار آب" },
    { word: "ری", clue: "از شهرهای قدیمی تهران" },
    { word: "شب", clue: "تاریکی و زمان خواب" },
    { word: "کم", clue: "اندک و ناچیز" },
    { word: "پا", clue: "عضو راه رفتن" }
  ],
  3: [
    { word: "ارم", clue: "بهشت موعود" },
    { word: "امیر", clue: "فرمانروا" },
    { word: "رازی", clue: "کاشف الکل" },
    { word: "حافظ", clue: "شاعر شیرازی" },
    { word: "سعدی", clue: "شاعر گلستان" },
    { word: "سهند", clue: "کوه آذربایجان" },
    { word: "رستم", clue: "پهلوان شاهنامه" },
    { word: "اروند", clue: "رود مرزی" },
    { word: "سهراب", clue: "فرزند رستم" },
    { word: "ایران", clue: "کشور عزیزمان" },
    { word: "تهران", clue: "پایتخت ایران" },
    { word: "ازادی", clue: "برج معروف" },
    { word: "شیراز", clue: "شهر شعر" },
    { word: "تبریز", clue: "شهر اولین‌ها" },
    { word: "مشهد", clue: "شهر زیارتی" }
  ],
  4: [
    { word: "زاگرس", clue: "رشته‌کوه غربی" },
    { word: "البرز", clue: "رشته‌کوه شمالی" },
    { word: "سیمرغ", clue: "پرنده افسانه‌ای" },
    { word: "کارون", clue: "طولانی‌ترین رود" },
    { word: "کاسپین", clue: "دریاچه خزر" },
    { word: "دماوند", clue: "قله بلند ایران" },
    { word: "کوروش", clue: "شاه هخامنشی" },
    { word: "داریوش", clue: "پادشاه پارسی" },
    { word: "فردوسی", clue: "شاعر شاهنامه" }
  ]
};

const NUM_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function getRandomWord(len) {
  const pool = WORD_DB[len] || WORD_DB[3];
  return pool[Math.floor(Math.random() * pool.length)];
}

function toPersianDigits(num) {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => farsiDigits[x]);
}

class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
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
    await fetch(`${this.baseUrl}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId })
    });
  }

  async answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
    await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text, show_alert: showAlert })
    });
  }
}

// ==========================================
// ۲. تجزیه کامل تمام بخش‌های سفید ردیف‌ها و ستون‌ها
// ==========================================
class PuzzleEngine {
  static generate() {
    const rows = 10;
    const cols = 10;
    
    // الگوی خانه‌های مشکی متقارن
    const blocks = [
      [0,4], [0,5], [1,2], [1,7], [2,8], [3,3],
      [6,6], [7,1], [8,2], [8,7], [9,4], [9,5]
    ];

    let grid = Array(rows).fill(null).map(() => Array(cols).fill(false));
    blocks.forEach(([r, c]) => { grid[r][c] = true; });

    const words = [];
    let wordIdCounter = 1;

    // استخراج تمام بخش‌های سفید افقی
    for (let r = 0; r < rows; r++) {
      let currentLen = 0;
      let startCol = 0;

      for (let c = 0; c <= cols; c++) {
        if (c < cols && !grid[r][c]) {
          if (currentLen === 0) startCol = c;
          currentLen++;
        } else {
          if (currentLen >= 2) {
            const item = getRandomWord(currentLen);
            words.push({
              id: `w_${wordIdCounter++}`,
              type: "across",
              index: r + 1, // ردیف چندم (۱ تا ۱۰)
              row: r,
              col: startCol,
              length: item.word.length,
              answer: item.word,
              clue: item.clue
            });
          }
          currentLen = 0;
        }
      }
    }

    // استخراج تمام بخش‌های سفید عمودی
    for (let c = 0; c < cols; c++) {
      let currentLen = 0;
      let startRow = 0;

      for (let r = 0; r <= rows; r++) {
        if (r < rows && !grid[r][c]) {
          if (currentLen === 0) startRow = r;
          currentLen++;
        } else {
          if (currentLen >= 2) {
            const item = getRandomWord(currentLen);
            words.push({
              id: `w_${wordIdCounter++}`,
              type: "down",
              index: c + 1, // ستون چندم (۱ تا ۱۰ - از راست)
              row: startRow,
              col: c,
              length: item.word.length,
              answer: item.word,
              clue: item.clue
            });
          }
          currentLen = 0;
        }
      }
    }

    return {
      id: "puzzle_" + Date.now(),
      title: `جدول ۱۰×۱۰ کلاسیک`,
      rows: rows,
      cols: cols,
      blocks: blocks,
      words: words
    };
  }

  static renderTable(puzzle, solvedWordIds = []) {
    let grid = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill("⬜"));

    puzzle.blocks.forEach(([r, c]) => { grid[r][c] = "⬛"; });

    puzzle.words.forEach((w) => {
      if (solvedWordIds.includes(w.id)) {
        const chars = w.answer.split("");
        chars.forEach((char, idx) => {
          let r = w.row;
          let c = w.col;
          if (w.type === "across") c += idx;
          else r += idx;
          if (r < puzzle.rows && c < puzzle.cols) grid[r][c] = char;
        });
      }
    });

    let tableStr = `🧩 <b>${puzzle.title}</b>\n\n`;
    tableStr += [...NUM_EMOJIS].reverse().join("") + "▫️\n";

    for (let r = 0; r < puzzle.rows; r++) {
      const rowCells = [...grid[r]].reverse().join("");
      tableStr += rowCells + NUM_EMOJIS[r] + "\n";
    }
    return tableStr + "\n";
  }

  static renderQuestions(puzzle) {
    let qStr = "📝 <b>راهنمای کامل سوالات:</b>\n\n<b>افقی:</b>\n";

    for (let i = 1; i <= 10; i++) {
      const rowWords = puzzle.words.filter(w => w.type === "across" && w.index === i);
      if (rowWords.length > 0) {
        const clues = rowWords.map(w => w.clue).join(" - ");
        qStr += `<b>${toPersianDigits(i)}.</b> ${clues}\n`;
      } else {
        qStr += `<b>${toPersianDigits(i)}.</b> ---\n`;
      }
    }

    qStr += "\n<b>عمودی:</b>\n";
    for (let i = 1; i <= 10; i++) {
      // ستون‌ها از راست به چپ محاسبه می‌شوند
      const colIndex = 11 - i; 
      const colWords = puzzle.words.filter(w => w.type === "down" && w.index === colIndex);
      if (colWords.length > 0) {
        const clues = colWords.map(w => w.clue).join(" - ");
        qStr += `<b>${toPersianDigits(i)}.</b> ${clues}\n`;
      } else {
        qStr += `<b>${toPersianDigits(i)}.</b> ---\n`;
      }
    }

    return qStr;
  }
}

// ==========================================
// ۳. ساخت کیبورد عددی ۱ تا ۱۰ برای افقی و عمودی
// ==========================================
function buildMainKeyboard(puzzle, solvedWordIds) {
  const keyboard = [];

  // ردیف افقی
  keyboard.push([{ text: "━━━ ✏️ افقی ━━━", callback_data: "ignore" }]);
  const acrossRow = [];
  for (let i = 1; i <= 10; i++) {
    const unSolvedCount = puzzle.words.filter(w => w.type === "across" && w.index === i && !solvedWordIds.includes(w.id)).length;
    acrossRow.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_across_${i}` : "ignore"
    });
  }
  keyboard.push(acrossRow);

  // ردیف عمودی
  keyboard.push([{ text: "━━━ ✏️ عمودی ━━━", callback_data: "ignore" }]);
  const downRow = [];
  for (let i = 1; i <= 10; i++) {
    const colIndex = 11 - i;
    const unSolvedCount = puzzle.words.filter(w => w.type === "down" && w.index === colIndex && !solvedWordIds.includes(w.id)).length;
    downRow.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_down_${colIndex}` : "ignore"
    });
  }
  keyboard.push(downRow);

  return { inline_keyboard: keyboard };
}

// کیبورد فرعی اگر در یک ردیف/ستون بیش از ۱ سوال وجود داشت
function buildSubQuestionKeyboard(words, solvedWordIds) {
  const keyboard = [];
  words.forEach((w, idx) => {
    if (!solvedWordIds.includes(w.id)) {
      keyboard.push([{
        text: `سوال ${toPersianDigits(idx + 1)}: ${w.clue} (${toPersianDigits(w.length)} حرفی)`,
        callback_data: `q_${w.id}`
      }]);
    }
  });
  keyboard.push([{ text: "🔙 بازگشت به کیبورد اصلی", callback_data: "nav_back" }]);
  return { inline_keyboard: keyboard };
}

// ==========================================
// ۴. مدیریت پیام‌ها و رخدادها
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });

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
      console.error(err);
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

    if (command === "/start" || command === "/new") {
      const puzzle = PuzzleEngine.generate();
      const state = {
        puzzleId: puzzle.id,
        solvedWordIds: [],
        activeQuestion: {},
        lastPromptMsgId: null,
        messageId: null
      };

      const tableText = PuzzleEngine.renderTable(puzzle, []);
      const qText = PuzzleEngine.renderQuestions(puzzle);
      const keyboard = buildMainKeyboard(puzzle, []);

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

  // پاکسازی پیام پاسخ کاربر
  await telegram.deleteMessage(chatId, message.message_id);

  // پاکسازی پیام سوال
  if (state.lastPromptMsgId) {
    await telegram.deleteMessage(chatId, state.lastPromptMsgId);
    state.lastPromptMsgId = null;
  }

  if (text.replace(/\s+/g, "") === word.answer) {
    if (!state.solvedWordIds.includes(word.id)) {
      state.solvedWordIds.push(word.id);
    }
    delete state.activeQuestion[userId];
    await kv.put(`state:${chatId}`, JSON.stringify(state));

    const isAllSolved = state.solvedWordIds.length === puzzle.words.length;
    const tableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds);
    const qText = PuzzleEngine.renderQuestions(puzzle);
    const keyboard = buildMainKeyboard(puzzle, state.solvedWordIds);

    await telegram.editMessageText(chatId, state.messageId, tableText + qText, keyboard);

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 تبریک! تمام سوالات جدول با موفقیت حل شدند!");
    }
  }
}

async function handleCallback(cb, telegram, kv) {
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const data = cb.data;

  if (data === "ignore") {
    await telegram.answerCallbackQuery(cb.id);
    return;
  }

  const rawState = await kv.get(`state:${chatId}`);
  if (!rawState) return;
  const state = JSON.parse(rawState);

  const rawPuzzle = await kv.get(`puzzle:${chatId}`);
  if (!rawPuzzle) return;
  const puzzle = JSON.parse(rawPuzzle);

  if (data === "nav_back") {
    const keyboard = buildMainKeyboard(puzzle, state.solvedWordIds);
    const tableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds);
    const qText = PuzzleEngine.renderQuestions(puzzle);
    await telegram.editMessageText(chatId, state.messageId, tableText + qText, keyboard);
    await telegram.answerCallbackQuery(cb.id);
    return;
  }

  if (data.startsWith("nav_across_") || data.startsWith("nav_down_")) {
    const isAcross = data.startsWith("nav_across_");
    const index = parseInt(data.split("_")[2]);
    const words = puzzle.words.filter(w => (isAcross ? w.type === "across" : w.type === "down") && w.index === index);

    const unsolvedWords = words.filter(w => !state.solvedWordIds.includes(w.id));

    if (unsolvedWords.length === 1) {
      // اگر فقط یک سوال در این ردیف/ستون بود مستقیماً انتخاب شود
      await selectQuestion(unsolvedWords[0], userId, chatId, state, puzzle, telegram, kv, cb.id);
    } else if (unsolvedWords.length > 1) {
      // اگر چند سوال وجود داشت کیبورد فرعی باز شود
      const subKb = buildSubQuestionKeyboard(words, state.solvedWordIds);
      const tableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds);
      const qText = PuzzleEngine.renderQuestions(puzzle);
      await telegram.editMessageText(chatId, state.messageId, tableText + qText + `\n👇 <b>سوالات مربوط به شماره ${toPersianDigits(index)}:</b>`, subKb);
      await telegram.answerCallbackQuery(cb.id);
    }
    return;
  }

  if (data.startsWith("q_")) {
    const qId = data.replace("q_", "");
    const word = puzzle.words.find(w => w.id === qId);
    await selectQuestion(word, userId, chatId, state, puzzle, telegram, kv, cb.id);
  }
}

async function selectQuestion(word, userId, chatId, state, puzzle, telegram, kv, cbId) {
  state.activeQuestion[userId] = word.id;

  if (state.lastPromptMsgId) {
    await telegram.deleteMessage(chatId, state.lastPromptMsgId);
  }

  await telegram.answerCallbackQuery(cbId, `سوال انتخاب شد.`);
  
  const labelText = word.type === "across" ? `${toPersianDigits(word.index)} افقی` : `${toPersianDigits(11 - word.index)} عمودی`;

  const promptMsg = await telegram.sendMessage(
    chatId, 
    `✍️ پاسخ <b>${labelText}</b>:\n❓ <b>سوال:</b> ${word.clue}\n📏 <b>تعداد حروف:</b> ${toPersianDigits(word.length)} حرفی`
  );

  if (promptMsg && promptMsg.result) {
    state.lastPromptMsgId = promptMsg.result.message_id;
  }

  // بازگرداندن کیبورد به حالت اصلی
  const keyboard = buildMainKeyboard(puzzle, state.solvedWordIds);
  const tableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds);
  const qText = PuzzleEngine.renderQuestions(puzzle);
  await telegram.editMessageText(chatId, state.messageId, tableText + qText, keyboard);

  await kv.put(`state:${chatId}`, JSON.stringify(state));
        }
