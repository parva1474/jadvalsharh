// ==========================================
// تنظیمات کانال و دیتابیس کلمات
// ==========================================
const CHANNEL_USERNAME = "@parvapoem";
const CHANNEL_LINK = "https://t.me/parvapoem";

const WORD_DB = {
  2: [
    { word: "رم", clue: "پایتخت ایتالیا" },
    { word: "بم", clue: "شهر زلزله‌زده ارگ تاریخی" },
    { word: "سد", clue: "دیواره مهار آب" },
    { word: "ری", clue: "از شهرهای قدیمی تهران" },
    { word: "شب", clue: "تاریکی و زمان خواب" },
    { word: "کم", clue: "اندک و ناچیز" },
    { word: "پا", clue: "عضو راه رفتن" },
    { word: "ار", clue: "واحد اندازه‌گیری سطح" },
    { word: "نی", clue: "ساز بادی چوپان" },
    { word: "مو", clue: "پوشش سر" },
    { word: "دم", clue: "نفس و هوا" },
    { word: "ژل", clue: "ماده حالت دهنده مو" },
    { word: "فن", clue: "هنر و مهارت" },
    { word: "تب", clue: "نشانه بیماری و داغی بدن" },
    { word: "رز", clue: "گل سرخ" },
    { word: "یم", clue: "دریا و اقیانوس" }
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
    { word: "مشهد", clue: "شهر زیارتی" },
    { word: "بابل", clue: "شهر بهارنارنج" },
    { word: "میبد", clue: "شهر زیلو و سفال" },
    { word: "هامون", clue: "دریاچه‌ای در سیستان" },
    { word: "کارون", clue: "رود بزرگ خوزستان" },
    { word: "عمان", clue: "دریایی در جنوب ایران" },
    { word: "نیل", clue: "طولانی‌ترین رود جهان" },
    { word: "پاریس", clue: "پایتخت فرانسه" },
    { word: "لندن", clue: "پایتخت انگلستان" },
    { word: "مادرید", clue: "پایتخت اسپانیا" },
    { word: "اتن", clue: "پایتخت یونان" },
    { word: "پکن", clue: "پایتخت چین" },
    { word: "توکیو", clue: "پایتخت ژاپن" },
    { word: "دهلی", clue: "شهر معروف هند" },
    { word: "ماسوله", clue: "روستای پلکانی گیلان" },
    { word: "رودکی", clue: "پدر شعر فارسی" },
    { word: "عطار", clue: "شاعر منطق‌الطیر" }
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
    { word: "فردوسی", clue: "شاعر شاهنامه" },
    { word: "ابوعلی", clue: "نام کوچک ابن‌سینا" },
    { word: "اقیانوس", clue: "پهنه بسیار بزرگ آبی" },
    { word: "امازون", clue: "جنگل پرباران برزیل" },
    { word: "اورست", clue: "بلندترین قله جهان" },
    { word: "کوهسار", clue: "منطقه کوهستانی" },
    { word: "بیستون", clue: "کتیبه معروف کرمانشاه" }
  ]
};

const NUM_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function getRandomWord(len, usedWords = new Set()) {
  const pool = WORD_DB[len] || WORD_DB[3];
  const available = pool.filter(item => !usedWords.has(item.word));
  if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  const selected = available[Math.floor(Math.random() * available.length)];
  usedWords.add(selected.word);
  return selected;
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
// موتور ساخت و مدیریت جدول
// ==========================================
class PuzzleEngine {
  static generate() {
    const rows = 10;
    const cols = 10;
    const blockPatterns = [
      [[0,4], [0,5], [1,2], [1,7], [2,8], [3,3], [6,6], [7,1], [8,2], [8,7], [9,4], [9,5]],
      [[0,2], [0,7], [2,4], [2,5], [3,1], [3,8], [6,1], [6,8], [7,4], [7,5], [9,2], [9,7]],
      [[1,1], [1,8], [2,3], [2,6], [4,0], [4,9], [5,0], [5,9], [7,3], [7,6], [8,1], [8,8]]
    ];
    
    const blocks = blockPatterns[Math.floor(Math.random() * blockPatterns.length)];
    let grid = Array(rows).fill(null).map(() => Array(cols).fill(false));
    blocks.forEach(([r, c]) => { grid[r][c] = true; });

    const words = [];
    let wordIdCounter = 1;
    const usedWords = new Set();

    for (let r = 0; r < rows; r++) {
      let currentLen = 0;
      let startCol = 0;
      for (let c = 0; c <= cols; c++) {
        if (c < cols && !grid[r][c]) {
          if (currentLen === 0) startCol = c;
          currentLen++;
        } else {
          if (currentLen >= 2) {
            const item = getRandomWord(currentLen, usedWords);
            words.push({
              id: `w_${wordIdCounter++}`,
              type: "across",
              index: r + 1,
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

    for (let c = 0; c < cols; c++) {
      let currentLen = 0;
      let startRow = 0;
      for (let r = 0; r <= rows; r++) {
        if (r < rows && !grid[r][c]) {
          if (currentLen === 0) startRow = r;
          currentLen++;
        } else {
          if (currentLen >= 2) {
            const item = getRandomWord(currentLen, usedWords);
            words.push({
              id: `w_${wordIdCounter++}`,
              type: "down",
              index: c + 1,
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

  static getGridMatrix(puzzle, solvedWordIds) {
    let grid = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill(null));
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
    return grid;
  }

  static renderTable(puzzle, solvedWordIds = []) {
    let gridDisplay = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill("⬜"));
    puzzle.blocks.forEach(([r, c]) => { gridDisplay[r][c] = "⬛"; });

    const matrix = this.getGridMatrix(puzzle, solvedWordIds);
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (matrix[r][c]) {
          gridDisplay[r][c] = matrix[r][c] + " ";
        }
      }
    }

    let tableStr = `🧩 <b>${puzzle.title}</b>\n\n`;
    tableStr += [...NUM_EMOJIS].reverse().join("") + "▫️\n";

    for (let r = 0; r < puzzle.rows; r++) {
      const rowCells = gridDisplay[r].join("");
      tableStr += rowCells + NUM_EMOJIS[r] + "\n";
    }
    return tableStr + "\n";
  }

  static getRevealedPattern(word, puzzle, solvedWordIds) {
    const matrix = this.getGridMatrix(puzzle, solvedWordIds);
    let result = [];
    const chars = word.answer.split("");

    chars.forEach((char, idx) => {
      let r = word.row;
      let c = word.col;
      if (word.type === "across") c += idx;
      else r += idx;

      if (matrix[r] && matrix[r][c]) {
        result.push(matrix[r][c]);
      } else {
        result.push("➖");
      }
    });

    return result.join(" ");
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
      const colIndex = i; 
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

function getJoinKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "📢 عضویت در کانال", url: CHANNEL_LINK }],
      [{ text: "✅ عضو شدم (تایید)", callback_data: "check_membership" }]
    ]
  };
}

function buildMainKeyboard(puzzle, solvedWordIds) {
  const keyboard = [];

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

  keyboard.push([{ text: "━━━ ✏️ عمودی ━━━", callback_data: "ignore" }]);
  const downRow = [];
  for (let i = 1; i <= 10; i++) {
    const colIndex = i;
    const unSolvedCount = puzzle.words.filter(w => w.type === "down" && w.index === colIndex && !solvedWordIds.includes(w.id)).length;
    downRow.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_down_${colIndex}` : "ignore"
    });
  }
  keyboard.push(downRow);

  return { inline_keyboard: keyboard };
}

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
// مدیریت پیام‌ها و اجرا
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
        await handleCallback(update.callback_query, telegram, kv, ctx);
      } else if (update.message && update.message.text) {
        await handleMessage(update.message, telegram, kv, ctx);
      }
    } catch (err) {
      console.error(err);
    }

    return new Response("OK", { status: 200 });
  }
};

async function handleMessage(message, telegram, kv, ctx) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();

  // بررسی عضویت در کانال
  const isMember = await telegram.checkChannelMember(userId);
  if (!isMember) {
    await telegram.sendMessage(
      chatId,
      `⚠️ <b>کاربر گرامی!</b>\nبرای استفاده از ربات جدول ابتدا باید عضو کانال زیر شوید:`,
      getJoinKeyboard()
    );
    return;
  }

  if (text.startsWith("/")) {
    const command = text.split(" ")[0].toLowerCase().split("@")[0];

    if (command === "/help") {
      const helpText = `ℹ️ <b>راهنمای بازی جدول شرح در متن:</b>\n\n` +
        `۱. با دستور /new یک جدول ۱۰×۱۰ جدید شروع کنید.\n` +
        `۲. از روی کیبورد زیر جدول، شماره ردیف (افقی) یا ستون (عمودی) مورد نظر خود را انتخاب کنید.\n` +
        `۳. سوال نمایش داده می‌شود و حروف تقاطع‌ها به شما راهنمایی داده خواهد شد.\n` +
        `۴. پاسخ خود را تایپ کنید. در صورت درست بودن، کلمه روی جدول ثبت خواهد شد!`;
      await telegram.sendMessage(chatId, helpText);
      return;
    }

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

  await telegram.deleteMessage(chatId, message.message_id);

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

    // پاسخ درست + پاک‌سازی بعد از ۵ ثانیه
    const feedbackMsg = await telegram.sendMessage(chatId, `✅ <b>پاسخ درست بود!</b> (${word.answer})`);
    if (feedbackMsg && feedbackMsg.result) {
      ctx.waitUntil(
        new Promise(resolve => setTimeout(resolve, 5000)).then(() => 
          telegram.deleteMessage(chatId, feedbackMsg.result.message_id)
        )
      );
    }

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 تبریک! تمام سوالات جدول با موفقیت حل شدند!");
    }
  } else {
    // پاسخ نادرست + پاک‌سازی بعد از ۵ ثانیه
    const wrongMsg = await telegram.sendMessage(chatId, "❌ <b>پاسخ نادرست است!</b> دوباره تلاش کنید.");
    if (wrongMsg && wrongMsg.result) {
      ctx.waitUntil(
        new Promise(resolve => setTimeout(resolve, 5000)).then(() => 
          telegram.deleteMessage(chatId, wrongMsg.result.message_id)
        )
      );
    }
  }
}

async function handleCallback(cb, telegram, kv, ctx) {
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const data = cb.data;

  if (data === "check_membership") {
    const isMember = await telegram.checkChannelMember(userId);
    if (isMember) {
      await telegram.answerCallbackQuery(cb.id, "✅ عضویت شما تایید شد! حالا می‌توانید بازی کنید.", true);
      await telegram.deleteMessage(chatId, cb.message.message_id);
    } else {
      await telegram.answerCallbackQuery(cb.id, "❌ شما هنوز عضو کانال نشده‌اید!", true);
    }
    return;
  }

  // بررسی عضویت در تمامی دکمه‌ها
  const isMember = await telegram.checkChannelMember(userId);
  if (!isMember) {
    await telegram.answerCallbackQuery(cb.id, "⚠️ ابتدا باید عضو کانال شوید!", true);
    return;
  }

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
      await selectQuestion(unsolvedWords[0], userId, chatId, state, puzzle, telegram, kv, cb.id);
    } else if (unsolvedWords.length > 1) {
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
    const word = puzzle.
