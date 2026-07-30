import { TelegramAPI } from "./telegram.js";
import { Storage } from "./storage.js";
import { CrosswordEngine } from "./crossword.js";
import { toPersianDigits } from "./utils.js";

// ==========================================
// ۱. بانک کلمات و سوالات (قابل گسترش)
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

// ==========================================
// ۲. موتور تولید پویای جدول
// ==========================================
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
// ۳. هندلرهای اصلی Cloudflare Worker
// ==========================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Crossword Bot Active", { status: 200 });
    }

    const telegram = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
    const storage = new Storage(env.CROSSWORD_KV);

    try {
      const update = await request.json();
      await handleTelegramUpdate(update, telegram, storage, env);
    } catch (err) {
      console.error("Error processing update:", err);
    }

    return new Response("OK", { status: 200 });
  },

  async scheduled(event, env, ctx) {
    const telegram = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
    const storage = new Storage(env.CROSSWORD_KV);
    await processAutoSolutions(telegram, storage);
  }
};

/**
 * پردازش دستورات ورودی تلگرام
 */
async function handleTelegramUpdate(update, telegram, storage, env) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, telegram, storage);
    return;
  }

  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();

  if (text.startsWith("/")) {
    const rawCommand = text.split(" ")[0].toLowerCase();
    const command = rawCommand.split("@")[0];

    switch (command) {
      case "/start":
        await telegram.sendMessage(chatId, "سلام! به ربات جدول کلمات متقاطع خوش آمدید.\nبرای ایجاد جدول جدید از دستور /new استفاده کنید.");
        break;

      case "/new":
        await handleNewPuzzleCommand(chatId, userId, telegram, storage, env);
        break;

      case "/cancel":
        await handleCancelCommand(chatId, userId, telegram, storage);
        break;

      default:
        break;
    }
    return;
  }

  await handleUserAnswerInput(chatId, message, telegram, storage);
}

/**
 * ساخت آنی جدول جدید بدون نیاز به دیتابیس خارجی
 */
async function handleNewPuzzleCommand(chatId, userId, telegram, storage, env) {
  try {
    await storage.deleteGroupState(chatId);

    // ۱. تولید آنی و تصادفی یک جدول جدید
    const puzzle = DynamicGenerator.generatePuzzle(5);

    // ۲. ذخیره ساختار جدول در KV بر اساس آیدی گروه
    await storage.setJson(`current_puzzle:${chatId}`, puzzle);

    // ۳. ذخیره وضعیت بازی
    const newState = {
      puzzleId: puzzle.id,
      solvedWordIds: [],
      userActiveQuestion: {},
      startTime: Date.now(),
      isCompleted: false,
      messageId: null
    };

    const tableText = CrosswordEngine.renderTable(puzzle, []);
    const questionsText = CrosswordEngine.renderQuestions(puzzle, []);
    const fullText = tableText + questionsText;
    const keyboard = buildInlineKeyboard(puzzle, []);

    const sentMsg = await telegram.sendMessage(chatId, fullText, keyboard);
    if (sentMsg && sentMsg.result) {
      newState.messageId = sentMsg.result.message_id;
      await storage.saveGroupState(chatId, newState);
    }
  } catch (err) {
    await telegram.sendMessage(chatId, `💥 خطا در ساخت جدول جدید:\n${err.message}`);
  }
}

/**
 * مدیریت کلیک روی دکمه‌های سوالات
 */
async function handleCallbackQuery(callbackQuery, telegram, storage) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  const state = await storage.getGroupState(chatId);
  if (!state || state.isCompleted) {
    await telegram.answerCallbackQuery(callbackQuery.id, "این جدول فعال نیست.", true);
    return;
  }

  if (data.startsWith("q_")) {
    const qId = parseInt(data.replace("q_", ""), 10);

    if (state.solvedWordIds.includes(qId)) {
      await telegram.answerCallbackQuery(callbackQuery.id, "این سوال قبلاً حل شده است!", true);
      return;
    }

    state.userActiveQuestion[userId] = qId;
    await storage.saveGroupState(chatId, state);

    await telegram.answerCallbackQuery(callbackQuery.id, `سوال ${toPersianDigits(qId)} انتخاب شد.`);
    await telegram.sendMessage(chatId, `پاسخ سوال ${toPersianDigits(qId)} را بنویسید.`);
  }
}

/**
 * پردازش پاسخ کاربر
 */
async function handleUserAnswerInput(chatId, message, telegram, storage) {
  const userId = message.from.id;
  const state = await storage.getGroupState(chatId);
  if (!state || state.isCompleted) return;

  const activeQId = state.userActiveQuestion[userId];
  if (!activeQId) return;

  // خواندن جدول فعلی این گروه از KV
  const puzzle = await storage.getJson(`current_puzzle:${chatId}`);
  if (!puzzle) return;

  const word = puzzle.words.find((w) => w.id === activeQId);
  if (!word) return;

  const userAnswer = message.text.trim().replace(/\s+/g, "");
  const correctAnswer = word.answer.trim().replace(/\s+/g, "");

  if (userAnswer === correctAnswer) {
    state.solvedWordIds.push(word.id);
    delete state.userActiveQuestion[userId];

    const isAllSolved = state.solvedWordIds.length === puzzle.words.length;
    if (isAllSolved) {
      state.isCompleted = true;
    }

    await storage.saveGroupState(chatId, state);
    await updatePuzzleMessage(chatId, state, puzzle, telegram);

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 تبریک! جدول با موفقیت و به طور کامل حل شد!");
    } else {
      await telegram.sendMessage(chatId, `✅ پاسخ سوال ${toPersianDigits(word.id)} درست بود!`);
    }
  } else {
    const pattern = CrosswordEngine.generateWrongPattern(puzzle, word, state.solvedWordIds);
    await telegram.sendMessage(
      chatId,
      `❌ پاسخ اشتباه است.\n\nالگوی کلمه:\n<code>${pattern}</code>`,
      null,
      message.message_id
    );
  }
}

/**
 * به‌روزرسانی پیام جدول
 */
async function updatePuzzleMessage(chatId, state, puzzle, telegram) {
  if (!state.messageId) return;

  const tableText = CrosswordEngine.renderTable(puzzle, state.solvedWordIds);
  const questionsText = CrosswordEngine.renderQuestions(puzzle, state.solvedWordIds);
  const fullText = tableText + questionsText;
  const keyboard = buildInlineKeyboard(puzzle, state.solvedWordIds);

  await telegram.editMessageText(chatId, state.messageId, fullText, keyboard);
}

/**
 * ساخت کیبورد شیشه‌ای
 */
function buildInlineKeyboard(puzzle, solvedWordIds) {
  const inlineKeyboard = [];
  let currentRow = [];

  puzzle.words.forEach((w) => {
    const isSolved = solvedWordIds.includes(w.id);
    const label = isSolved ? `✅ ${toPersianDigits(w.id)}` : `${toPersianDigits(w.id)}`;

    currentRow.push({
      text: label,
      callback_data: isSolved ? "ignore" : `q_${w.id}`
    });

    if (currentRow.length === 5) {
      inlineKeyboard.push(currentRow);
      currentRow = [];
    }
  });

  if (currentRow.length > 0) {
    inlineKeyboard.push(currentRow);
  }

  return { inline_keyboard: inlineKeyboard };
}

/**
 * انصراف کاربر
 */
async function handleCancelCommand(chatId, userId, telegram, storage) {
  const state = await storage.getGroupState(chatId);
  if (!state) return;

  const activeQId = state.userActiveQuestion[userId];
  if (activeQId) {
    delete state.userActiveQuestion[userId];
    await storage.saveGroupState(chatId, state);
    await telegram.sendMessage(chatId, "از پاسخ‌دهی به سوال انصراف دادید.");
  }
}

/**
 * حل خودکار زمان‌بندی‌شده
 */
async function processAutoSolutions(telegram, storage) {
  const list = await storage.kv.list({ prefix: "group_state:" });
  const now = Date.now();

  for (const key of list.keys) {
    const state = await storage.getJson(key.name);
    if (!state || state.isCompleted) continue;

    const chatId = key.name.replace("group_state:", "");
    const puzzle = await storage.getJson(`current_puzzle:${chatId}`);
    if (!puzzle) continue;

    if ((now - state.startTime) / (1000 * 60 * 60) >= 24) {
      state.isCompleted = true;
      state.solvedWordIds = puzzle.words.map((w) => w.id);
      await storage.saveGroupState(chatId, state);
      await updatePuzzleMessage(chatId, state, puzzle, telegram);
      await telegram.sendMessage(chatId, "⏰ مهلت ۲۴ ساعته جدول پایان یافت.");
    }
  }
    }
