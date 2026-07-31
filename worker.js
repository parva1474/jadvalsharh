// ==========================================
// ۱. دیتابیس جامع کلمات و سوالات
// ==========================================
const WORD_DATABASE = [
  // کلمات ۳ حرفی
  { word: "ارم", clue: "بهشت موعود" },
  { word: "امیر", clue: "فرمانروا و پادشاه" },
  { word: "رازی", clue: "کاشف الکل" },
  { word: "حافظ", clue: "لسان‌الغیب شیرازی" },
  { word: "سعدی", clue: "شاعر گلستان" },
  { word: "سهند", clue: "کوهی در آذربایجان شرقی" },
  { word: "رستم", clue: "قهرمان نامدار شاهنامه" },
  { word: "اروند", clue: "رود مرزی ایران و عراق" },
  { word: "زاگرس", clue: "رشته‌کوه غربی ایران" },
  { word: "البرز", clue: "رشته‌کوه شمالی ایران" },
  { word: "سیمرغ", clue: "پرنده افسانه‌ای" },
  { word: "سهراب", clue: "فرزند رستم" },
  { word: "کارون", clue: "طولانی‌ترین رود ایران" },
  { word: "کاسپین", clue: "نام دیگر دریاچه خزر" },
  { word: "ایران", clue: "کشور عزیزمان" },
  { word: "تهران", clue: "پایتخت ایران" },
  { word: "ازادی", clue: "برج معروف تهران" },
  { word: "دماوند", clue: "بلندترین قله ایران" },
  { word: "کوروش", clue: "بنیان‌گذار هخامنشیان" },
  { word: "داریوش", clue: "پادشاه هخامنشی" },
  { word: "شیراز", clue: "شهر شعر و ادب" },
  { word: "تبریز", clue: "شهر اولین‌ها" },
  { word: "اصفهان", clue: "نصف جهان" },
  { word: "مشهد", clue: "پایتخت معنوی ایران" },
  { word: "فردوسی", clue: "شاعر شاهنامه" }
];

const NUM_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function toPersianDigits(num) {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => farsiDigits[x]);
}

// ==========================================
// ۲. موتور ساخت بی‌نهایت جدول ۱۰ در ۱۰
// ==========================================
class InfinitePuzzleGenerator {
  static generate() {
    const rows = 10;
    const cols = 10;
    
    // الگوی خانه‌های مشکی راندوم و متقارن
    const blocks = [];
    const blockCount = 16;
    while (blocks.length < blockCount) {
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 10);
      if (!blocks.some(([br, bc]) => br === r && bc === c)) {
        blocks.push([r, c]);
        blocks.push([9 - r, 9 - c]); // تقارن محوری
      }
    }

    // انتخاب کلمات تصادفی
    const shuffled = [...WORD_DATABASE].sort(() => 0.5 - Math.random());
    const words = [];
    const cluesAcross = {};
    const cluesDown = {};

    for (let i = 1; i <= 10; i++) {
      cluesAcross[i] = [];
      cluesDown[i] = [];
    }

    let wordIdx = 0;
    // ساخت چند کلمه کلیدی در جدول
    for (let r = 0; r < 10; r += 2) {
      if (wordIdx < shuffled.length) {
        const item = shuffled[wordIdx++];
        words.push({
          id: `H${r+1}_1`,
          label: `${toPersianDigits(r+1)} افقی`,
          type: "across",
          row: r,
          col: 0,
          length: item.word.length,
          answer: item.word,
          clue: item.clue
        });
        cluesAcross[r+1].push(item.clue);
      }
    }

    for (let c = 0; c < 10; c += 3) {
      if (wordIdx < shuffled.length) {
        const item = shuffled[wordIdx++];
        words.push({
          id: `V${c+1}_1`,
          label: `${toPersianDigits(c+1)} عمودی`,
          type: "down",
          row: 0,
          col: c,
          length: item.word.length,
          answer: item.word,
          clue: item.clue
        });
        cluesDown[c+1].push(item.clue);
      }
    }

    // ساخت راهنمای روزنامه‌ای
    const acrossCluesList = [];
    const downCluesList = [];

    for (let i = 1; i <= 10; i++) {
      acrossCluesList.push({
        row: i,
        text: cluesAcross[i].length > 0 ? cluesAcross[i].join(" - ") : "---"
      });
      downCluesList.push({
        col: i,
        text: cluesDown[i].length > 0 ? cluesDown[i].join(" - ") : "---"
      });
    }

    return {
      id: "puzzle_" + Date.now(),
      title: `جدول کلاسیک ۱۰×۱۰ (کد ${Math.floor(Math.random()*9000 + 1000)})`,
      rows: rows,
      cols: cols,
      blocks: blocks,
      clues: { across: acrossCluesList, down: downCluesList },
      words: words
    };
  }
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
    let grid = Array(puzzle.rows).fill(null).map(() => Array(puzzle.cols).fill("⬜"));

    puzzle.blocks.forEach(([r, c]) => {
      if (r < puzzle.rows && c < puzzle.cols) {
        grid[r][c] = "⬛";
      }
    });

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

    let tableStr = `🧩 <b>${puzzle.title}</b>\n\n`;
    tableStr += "▫️" + NUM_EMOJIS.slice(0, puzzle.cols).join("") + "\n";

    for (let r = 0; r < puzzle.rows; r++) {
      tableStr += NUM_EMOJIS[r] + grid[r].join("");
      tableStr += "\n";
    }
    return tableStr + "\n";
  }

  static renderQuestions(puzzle) {
    let qStr = "📝 <b>راهنمای سوالات:</b>\n\n<b>افقی:</b>\n";

    puzzle.clues.across.forEach((c) => {
      qStr += `<b>${toPersianDigits(c.row)}.</b> ${c.text}\n`;
    });

    qStr += "\n<b>عمودی:</b>\n";
    puzzle.clues.down.forEach((c) => {
      qStr += `<b>${toPersianDigits(c.col)}.</b> ${c.text}\n`;
    });

    return qStr;
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Infinite Crossword Bot Running", { status: 200 });
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
      await telegram.sendMessage(chatId, "سلام! برای دریافت جدول ۱۰×۱۰ جدید دستور /new را بفرستید.");
    } else if (command === "/new") {
      // ساخت یک جدول کاملاً جدید و راندوم
      const puzzle = InfinitePuzzleGenerator.generate();
      const state = {
        puzzleId: puzzle.id,
        solvedWordIds: [],
        activeQuestion: {},
        messageId: null
      };

      const tableText = CrosswordEngine.renderTable(puzzle, []);
      const qText = CrosswordEngine.renderQuestions(puzzle);
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
    const qText = CrosswordEngine.renderQuestions(puzzle);
    const keyboard = buildKeyboard(puzzle, state.solvedWordIds);

    await telegram.editMessageText(chatId, state.messageId, tableText + qText, keyboard);

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 آفرین! تمام کلمات این جدول با موفقیت حل شد!");
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
