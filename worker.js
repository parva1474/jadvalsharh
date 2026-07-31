// ==========================================
// ۱. تنظیمات اولیه و توکن‌ها
// ==========================================
const DEFAULT_BOT_TOKEN = "8595424524:AAEWYrIAzj6RRE7_G-5zY33333333333333";
const CHANNEL_USERNAME = "@parvapoem";
const CHANNEL_LINK = "https://t.me/parvapoem";

const WORD_DB = {
  2: [
    { word: "رم", clue: "پایتخت ایتالیا", hint2: "کشوری چکمه‌ای شکل در اروپا" },
    { word: "بم", clue: "شهر ززلزله‌زده ارگ تاریخی", hint2: "شهری در استان کرمان" },
    { word: "سد", clue: "دیواره مهار آب", hint2: "سازه‌ای روی رودخانه" },
    { word: "ری", clue: "از شهرهای قدیمی تهران", hint2: "مدفن شاه عبدالعظیم" },
    { word: "شب", clue: "تاریکی و زمان خواب", hint2: "مقابل روز" },
    { word: "کم", clue: "اندک و ناچیز", hint2: "مقابل زیاد" },
    { word: "پا", clue: "عضو راه رفتن", hint2: "پایین‌تر از زانو" },
    { word: "نی", clue: "ساز بادی چوپان", hint2: "از گیاهان باتلاقی ساخته می‌شود" }
  ],
  3: [
    { word: "ارم", clue: "بهشت موعود", hint2: "نام باغی معروف در شیراز" },
    { word: "امیر", clue: "فرمانروا", hint2: "لقب یا اسم مردانه به معنی پادشاه" },
    { word: "رازی", clue: "کاشف الکل", hint2: "پزشک و دانشمند بزرگ ایرانی" },
    { word: "حافظ", clue: "شاعر شیرازی", hint2: "صاحب دیوان غزلیات و لسان‌الغیب" },
    { word: "سعدی", clue: "شاعر گلستان", hint2: "استاد سخن و صاحب بوستان" },
    { word: "سهند", clue: "کوه آذربایجان", hint2: "عروس کوه‌های ایران" },
    { word: "رستم", clue: "پهلوان شاهنامه", hint2: "فرزند زال و رودابه" },
    { word: "ایران", clue: "کشور عزیزمان", hint2: "مهر وطن" },
    { word: "شیراز", clue: "شهر شعر", hint2: "شهر حافظ و سعدی" },
    { word: "تبریز", clue: "شهر اولین‌ها", hint2: "مرکز استان آذربایجان شرقی" },
    { word: "مشهد", clue: "شهر زیارتی", hint2: "حرم امام رضا (ع) در آن است" }
  ],
  4: [
    { word: "زاگرس", clue: "رشته‌کوه غربی", hint2: "از کردستان تا فارس امتداد دارد" },
    { word: "البرز", clue: "رشته‌کوه شمالی", hint2: "قله دماوند در آن قرار دارد" },
    { word: "سیمرغ", clue: "پرنده افسانه‌ای", hint2: "پرنده اساطیری شاهنامه" },
    { word: "کاسپین", clue: "دریاچه خزر", hint2: "بزرگترین دریاچه جهان" },
    { word: "دماوند", clue: "قله بلند ایران", hint2: "دیو سپید پای در بند" },
    { word: "فردوسی", clue: "شاعر شاهنامه", hint2: "زنده کننده زبان فارسی" }
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

// ==========================================
// ۲. کلاس ارتباط با API تلگرام
// ==========================================
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
// ۳. موتور ساخت و رندر جدول
// ==========================================
class PuzzleEngine {
  static generate() {
    const rows = 10;
    const cols = 10;
    const blockPatterns = [
      [[0,4], [0,5], [1,2], [1,7], [2,8], [3,3], [6,6], [7,1], [8,2], [8,7], [9,4], [9,5]],
      [[0,2], [0,7], [2,4], [2,5], [3,1], [3,8], [6,1], [6,8], [7,4], [7,5], [9,2], [9,7]]
    ];
    
    const blocks = blockPatterns[Math.floor(Math.random() * blockPatterns.length)];
    let grid = Array(rows).fill(null).map(() => Array(cols).fill(false));
    blocks.forEach(([r, c]) => { grid[r][c] = true; });

    const words = [];
    let wordIdCounter = 1;
    const usedWords = new Set();

    for (let r = 0; r < rows; r++) {
      let currentLen = 0, startCol = 0;
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
              clue: item.clue,
              hint2: item.hint2 || "راهنمایی متنی دیگری وجود ندارد."
            });
          }
          currentLen = 0;
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      let currentLen = 0, startRow = 0;
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
              clue: item.clue,
              hint2: item.hint2 || "راهنمایی متنی دیگری وجود ندارد."
            });
          }
          currentLen = 0;
        }
      }
    }

    return { id: "puzzle_" + Date.now(), rows, cols, blocks, words };
  }

  static getGridMatrix(puzzle, solvedWordIds, revealedCells = {}) {
    let grid = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill(null));
    puzzle.words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const chars = w.answer.split("");
      chars.forEach((char, idx) => {
        let r = w.row, c = w.col;
        if (w.type === "across") c += idx;
        else r += idx;

        const cellKey = `${r}_${c}`;
        if (isSolved || revealedCells[cellKey]) {
          grid[r][c] = char;
        }
      });
    });
    return grid;
  }

  static renderTable(puzzle, solvedWordIds = [], revealedCells = {}) {
    let gridDisplay = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill("⬜"));
    puzzle.blocks.forEach(([r, c]) => { gridDisplay[r][c] = "⬛"; });

    const matrix = this.getGridMatrix(puzzle, solvedWordIds, revealedCells);
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (matrix[r][c]) {
          gridDisplay[r][c] = matrix[r][c] + " "; 
        }
      }
    }

    let tableStr = `<pre>`;
    tableStr += [...NUM_EMOJIS].reverse().join("") + "\n";
    for (let r = 0; r < puzzle.rows; r++) {
      const rowContent = gridDisplay[r].map(cell => cell.length === 1 ? cell + " " : cell).join("");
      tableStr += rowContent + NUM_EMOJIS[r] + "\n";
    }
    tableStr += `</pre>\n`;
    return tableStr;
  }

  static getRevealedPattern(word, puzzle, solvedWordIds, revealedCells) {
    const matrix = this.getGridMatrix(puzzle, solvedWordIds, revealedCells);
    let result = [];
    const chars = word.answer.split("");

    chars.forEach((char, idx) => {
      let r = word.row, c = word.col;
      if (word.type === "across") c += idx;
      else r += idx;

      if (matrix[r] && matrix[r][c]) {
        result.push(matrix[r][c]);
      } else {
        result.push("❓");
      }
    });

    return result.join(" ");
  }

  static renderQuestions(puzzle) {
    let qStr = "📝 <b>راهنمای سوالات:</b>\n\n<b>افقی:</b>\n";
    for (let i = 1; i <= 10; i++) {
      const rowWords = puzzle.words.filter(w => w.type === "across" && w.index === i);
      qStr += `<b>${toPersianDigits(i)}.</b> ` + (rowWords.length ? rowWords.map(w => w.clue).join(" - ") : "---") + "\n";
    }
    qStr += "\n<b>عمودی:</b>\n";
    for (let i = 1; i <= 10; i++) {
      const colWords = puzzle.words.filter(w => w.type === "down" && w.index === i);
      qStr += `<b>${toPersianDigits(i)}.</b> ` + (colWords.length ? colWords.map(w => w.clue).join(" - ") : "---") + "\n";
    }
    return qStr;
  }
}

// ==========================================
// ۴. مدیریت کاربر و سکه‌ها
// ==========================================
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

// ==========================================
// ۵. ساخت دکمه‌ها
// ==========================================
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
    const unSolvedCount = puzzle.words.filter(w => w.type === "down" && w.index === i && !solvedWordIds.includes(w.id)).length;
    downRow.push({
      text: unSolvedCount > 0 ? NUM_EMOJIS[i-1] : "✅",
      callback_data: unSolvedCount > 0 ? `nav_down_${i}` : "ignore"
    });
  }
  keyboard.push(downRow);
  
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

function buildHintKeyboard(wordId) {
  return {
    inline_keyboard: [
      [{ text: "🔤 کشف ۱ حرف (۱ سکه)", callback_data: `hint_letter_${wordId}` }],
      [{ text: "💡 راهنمایی متنی دوم (۲ سکه)", callback_data: `hint_text_${wordId}` }],
      [{ text: "🔓 فاش کردن کامل پاسخ (۵ سکه)", callback_data: `hint_full_${wordId}` }],
      [{ text: "🔙 بازگشت به جدول", callback_data: "nav_back" }]
    ]
  };
}

// ==========================================
// ۶. نقطه ورود Worker
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("OK", { status: 200 });
    
    const token = env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
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
  const userName = message.from.first_name || "بازیکن";
  const text = message.text.trim();

  let user = await getUserData(kv, userId, userName);

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

    if (command === "/help" || command === "/guide") {
      await sendGuideMessage(chatId, telegram);
      return;
    }

    if (command === "/top") {
      await showLeaderboard(chatId, kv, telegram);
      return;
    }

    if (command === "/profile") {
      await telegram.sendMessage(chatId, `👤 <b>پروفایل شما:</b>\n💰 موجودی سکه: <b>${toPersianDigits(user.credits)}</b>\n⭐ امتیاز: <b>${toPersianDigits(user.score)}</b>`);
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
  if (state.lastPromptMsgId) {
    await telegram.deleteMessage(chatId, state.lastPromptMsgId);
    state.lastPromptMsgId = null;
  }

  if (text.replace(/\s+/g, "") === word.answer) {
    if (!state.solvedWordIds.includes(word.id)) {
      state.solvedWordIds.push(word.id);
      const points = word.answer.length;
      user = await updateUserScoreAndCredits(kv, userId, userName, 0, points);
      if (!state.players.includes(userId)) state.players.push(userId);
    }

    delete state.activeQuestion[userId];

    // ۱. پاک کردن پیام جدول قبلی جهت ارسال مجدد آن به عنوان آخرین پیام
    if (state.messageId) {
      await telegram.deleteMessage(chatId, state.messageId);
    }

    // ۲. ارسال پیام اعلان تبریک
    const feedback = await telegram.sendMessage(chatId, `✅ <b>${userName}</b> پاسخ درست داد! (+${toPersianDigits(word.answer.length)} امتیاز)`);
    if (feedback && feedback.result) {
      ctx.waitUntil(new Promise(r => setTimeout(r, 4000)).then(() => telegram.deleteMessage(chatId, feedback.result.message_id)));
    }

    // ۳. ارسال مجدد جدول به‌روزرسانی شده در پایین‌ترین بخش چت
    const tableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds, state.revealedCells);
    const qText = PuzzleEngine.renderQuestions(puzzle);
    const keyboard = buildMainKeyboard(puzzle, state.solvedWordIds);

    const newTableMsg = await telegram.sendMessage(chatId, tableText + qText, keyboard);
    if (newTableMsg && newTableMsg.result) {
      state.messageId = newTableMsg.result.message_id;
    }

    await kv.put(`state:${chatId}`, JSON.stringify(state));
  } else {
    const wrongMsg = await telegram.sendMessage(chatId, `❌ پاسخ <b>${userName}</b> اشتباه بود!`);
    if (wrongMsg && wrongMsg.result) {
      ctx.waitUntil(new Promise(r => setTimeout(r, 4000)).then(() => telegram.deleteMessage(chatId, wrongMsg.result.message_id)));
    }
  }
}

async function handleCallback(cb, telegram, kv, ctx) {
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const userName = cb.from.first_name || "بازیکن";
  const data = cb.data;

  let user = await getUserData(kv, userId, userName);

  if (data === "check_membership") {
    const isMember = await telegram.checkChannelMember(userId);
    if (isMember) {
      await telegram.answerCallbackQuery(cb.id, "✅ عضویت شما تایید شد!", true);
      await telegram.deleteMessage(chatId, cb.message.message_id);
    } else {
      await telegram.answerCallbackQuery(cb.id, "❌ شما هنوز عضو کانال نشده‌اید!", true);
    }
    return;
  }

  const isMember = await telegram.checkChannelMember(userId);
  if (!isMember) {
    await telegram.answerCallbackQuery(cb.id, "⚠️ جهت ادامه ابتدا باید عضو کانال شوید!", true);
    await telegram.sendMessage(chatId, `⚠️ <b>جهت استفاده از ربات باید عضو کانال شوید:</b>`, getJoinKeyboard());
    return;
  }

  if (data === "buy_credits") {
    await telegram.answerCallbackQuery(cb.id, `💰 سکه فعلی شما: ${toPersianDigits(user.credits)}\nجهت خرید سکه به پشتیبانی پیام دهید.`, true);
    return;
  }

  if (data === "show_profile") {
    await telegram.answerCallbackQuery(cb.id, `👤 پروفایل ${userName}:\n💰 سکه: ${toPersianDigits(user.credits)}\n⭐ امتیاز: ${toPersianDigits(user.score)}`, true);
    return;
  }

  if (data === "show_guide") {
    await sendGuideMessage(chatId, telegram);
    await telegram.answerCallbackQuery(cb.id);
    return;
  }

  if (data === "show_top") {
    await showLeaderboard(chatId, kv, telegram);
    await telegram.answerCallbackQuery(cb.id);
    return;
  }

  if (!kv) return;
  const rawState = await kv.get(`state:${chatId}`);
  if (!rawState) return;
  const state = JSON.parse(rawState);

  const rawPuzzle = await kv.get(`puzzle:${chatId}`);
  if (!rawPuzzle) return;
  const puzzle = JSON.parse(rawPuzzle);

  if (data === "nav_back") {
    const keyboard = buildMainKeyboard(puzzle, state.solvedWordIds);
    const tableText = PuzzleEngine.renderTable(puzzle, state.solvedWordIds,
