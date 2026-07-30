/**
 * نقطه ورود اصلی Cloudflare Worker و پردازش تمامی پیام‌ها و زمان‌بندی‌ها
 */

import { TelegramAPI } from "./telegram.js";
import { Storage } from "./storage.js";
import { CrosswordEngine } from "./crossword.js";
import { toPersianDigits, formatDuration, getWordCells, getRandomElement } from "./utils.js";

export default {
  // پردازش درخواست‌های Webhook تلگرام
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("OK - Crossword Bot Worker Active", { status: 200 });
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

  // اجرای زمان‌بندی دوری برای پاکسازی و پاسخ خودکار ۱۲ و ۲۴ ساعته
  async scheduled(event, env, ctx) {
    const telegram = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
    const storage = new Storage(env.CROSSWORD_KV);
    await processAutoSolutions(telegram, storage);
  }
};

/**
 * پردازش تمام ورودهای تلگرام (Message & CallbackQuery)
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

  // بررسی دستورات ادمین و عمومی
  if (text.startsWith("/")) {
    // جلوگیری از کرش در صورت نبود BOT_USERNAME
    const botUsername = env.BOT_USERNAME ? env.BOT_USERNAME.toLowerCase() : "";
    const command = text.split(" ")[0].toLowerCase().replace("@" + botUsername, "");

    switch (command) {
      case "/start":
        await telegram.sendMessage(chatId, "سلام! به ربات جدول کلمات متقاطع خوش آمدید.\nبرای ایجاد جدول در گروه از دستور /new استفاده کنید.");
        break;

      async function handleNewPuzzleCommand(chatId, userId, telegram, storage, env) {
  try {
    // ۱. دریافت لیست آیدی‌ها
    const allPuzzleIds = await storage.getAllPuzzleIds();
    if (!allPuzzleIds || allPuzzleIds.length === 0) {
      await telegram.sendMessage(chatId, "❌ لیست جدول‌ها خالی است یا کلید puzzles:index پیدا نشد.");
      return;
    }

    // ۲. دریافت اطلاعات اولین جدول
    const puzzle = await storage.getPuzzle(allPuzzleIds[0]);
    if (!puzzle) {
      await telegram.sendMessage(chatId, `❌ جدول با آیدی ${allPuzzleIds[0]} در KV پیدا نشد.`);
      return;
    }

    // ۳. رندر متن و کیبورد
    const tableText = CrosswordEngine.renderTable(puzzle, []);
    const questionsText = CrosswordEngine.renderQuestions(puzzle, []);
    const fullText = tableText + questionsText;
    const keyboard = buildInlineKeyboard(puzzle, []);

    // ۴. ارسال پیام
    await telegram.sendMessage(chatId, fullText, keyboard);

  } catch (err) {
    // اگر هر خطایی در هر خط رخ داد، دقیقا متن خطا رو بفرست توی گروه
    await telegram.sendMessage(chatId, `💥 خطای کد:\n${err.message}\n\nدر خط:\n${err.stack}`);
  }
}

      case "/rank":
        await handleRankCommand(chatId, telegram, storage);
        break;

      case "/stats":
        await handleStatsCommand(chatId, telegram, storage);
        break;

      case "/cancel":
        await handleCancelCommand(chatId, userId, telegram, storage);
        break;

      case "/admin":
        await handleAdminPanel(chatId, userId, telegram, storage, env);
        break;

      default:
        break;
    }
    return;
  }

  // اگر کاربر در حال پاسخ به سؤالی باشد
  await handleUserAnswerInput(chatId, message, telegram, storage);
}

/**
 * ایجاد جدول جدید در گروه (/new)
 */
async function handleNewPuzzleCommand(chatId, userId, telegram, storage, env) {
  // بررسی ادمین بودن کاربر در گروه
  try {
    const isAdmin = await telegram.isAdmin(chatId, userId, env.ADMIN_USER_ID);
    if (!isAdmin) {
      await telegram.sendMessage(chatId, "❌ فقط مدیران گروه می‌توانند جدول جدید ایجاد کنند.");
      return;
    }
  } catch (e) {
    console.error("Admin check failed:", e);
  }

  let currentState = await storage.getGroupState(chatId);
  if (currentState && !currentState.isCompleted) {
    await telegram.sendMessage(chatId, "⚠️ یک جدول فعال در گروه وجود دارد. ابتدا آن را تمام کنید یا از پنل مدیریت حذف نمایید.");
    return;
  }

  // دریافت لیست تمام جدول‌ها
  const allPuzzleIds = await storage.getAllPuzzleIds();
  if (!allPuzzleIds || allPuzzleIds.length === 0) {
    await telegram.sendMessage(chatId, "❌ هیچ جدولی در دیتابیس ثبت نشده است.");
    return;
  }

  // بررسی تاریخچه جدول‌های حل شده در گروه برای عدم تکرار
  let groupStats = (await storage.getJson(Storage.KEY_GROUP_STATS(chatId))) || {};
  let playedIds = groupStats.playedPuzzleIds || [];

  let availableIds = allPuzzleIds.filter((id) => !playedIds.includes(id));
  if (availableIds.length === 0) {
    // بازنشانی چرخه جدول‌ها پس از اتمام همه
    playedIds = [];
    availableIds = allPuzzleIds;
  }

  const selectedPuzzleId = getRandomElement(availableIds);
  const puzzle = await storage.getPuzzle(selectedPuzzleId);

  if (!puzzle) {
    await telegram.sendMessage(chatId, "❌ خطایی در دریافت اطلاعات جدول رخ داد.");
    return;
  }

  // ثبت تاریخچه
  playedIds.push(selectedPuzzleId);
  groupStats.playedPuzzleIds = playedIds;
  await storage.setJson(Storage.KEY_GROUP_STATS(chatId), groupStats);

  // ایجاد وضعیت جدید گروه
  const newState = {
    puzzleId: puzzle.id,
    solvedWordIds: [],
    userActiveQuestion: {}, // user_id -> question_id
    activeQuestionUsers: {}, // question_id -> user_id
    startTime: Date.now(),
    lastAutoSolveTime: Date.now(),
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
}

/**
 * مدیریت لمس دکمه‌های کیبورد شیشه‌ای (Callback Query)
 */
async function handleCallbackQuery(callbackQuery, telegram, storage) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const userName = callbackQuery.from.first_name || "کاربر";
  const data = callbackQuery.data;

  const state = await storage.getGroupState(chatId);
  if (!state || state.isCompleted) {
    await telegram.answerCallbackQuery(callbackQuery.id, "این جدول فعال نیست.", true);
    return;
  }

  const puzzle = await storage.getPuzzle(state.puzzleId);

  // کلیک روی شماره سوال جهت انتخاب
  if (data.startsWith("q_")) {
    const qId = parseInt(data.replace("q_", ""), 10);

    if (state.solvedWordIds.includes(qId)) {
      await telegram.answerCallbackQuery(callbackQuery.id, "این سوال قبلاً حل شده است!", true);
      return;
    }

    // بررسی قفل بودن سوال توسط کاربر دیگر
    const lockResult = await storage.lockQuestion(chatId, qId, userId, userName);
    if (!lockResult.success) {
      await telegram.answerCallbackQuery(
        callbackQuery.id,
        `این سوال توسط ${lockResult.lockedBy} در حال پاسخ‌دهی است.`,
        true
      );
      return;
    }

    // ثبت وضعیت پاسخ‌دهی کاربر
    state.userActiveQuestion[userId] = qId;
    await storage.saveGroupState(chatId, state);

    await telegram.answerCallbackQuery(callbackQuery.id, `سوال ${toPersianDigits(qId)} انتخاب شد.`);
    await telegram.sendMessage(chatId, `پاسخ سوال ${toPersianDigits(qId)} را بنویسید.`);
    return;
  }

  // درخواست راهنما
  if (data.startsWith("hint_")) {
    const qId = parseInt(data.replace("hint_", ""), 10);
    await handleHintRequest(chatId, userId, qId, callbackQuery.id, puzzle, state, telegram, storage);
    return;
  }
}

/**
 * پردازش متن ارسالی کاربر به عنوان جواب سوال
 */
async function handleUserAnswerInput(chatId, message, telegram, storage) {
  const userId = message.from.id;
  const state = await storage.getGroupState(chatId);
  if (!state || state.isCompleted) return;

  const activeQId = state.userActiveQuestion[userId];
  if (!activeQId) return; // کاربر سوالی را انتخاب نکرده است

  const puzzle = await storage.getPuzzle(state.puzzleId);
  const word = puzzle.words.find((w) => w.id === activeQId);
  if (!word) return;

  const userAnswer = message.text.trim().replace(/\s+/g, "");
  const correctAnswer = word.answer.trim().replace(/\s+/g, "");

  if (userAnswer === correctAnswer) {
    // --- پاسخ صحیح ---
    state.solvedWordIds.push(word.id);
    delete state.userActiveQuestion[userId];
    await storage.unlockQuestion(chatId, word.id);

    // ثبت ۱۰ امتیاز مثبت
    await storage.updateUserScore(chatId, message.from, 10, true);

    const isAllSolved = state.solvedWordIds.length === puzzle.words.length;
    if (isAllSolved) {
      state.isCompleted = true;
      const solveTimeSeconds = Math.floor((Date.now() - state.startTime) / 1000);
      await storage.recordGroupStats(chatId, solveTimeSeconds, false);
    }

    await storage.saveGroupState(chatId, state);

    // به‌روزرسانی پیام جدول
    await updatePuzzleMessage(chatId, state, puzzle, telegram);

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 تبریک! جدول با موفقیت و به طور کامل حل شد!");
    } else {
      await telegram.sendMessage(chatId, `✅ پاسخ سوال ${toPersianDigits(word.id)} درست بود! (+۱۰ امتیاز)`);
    }
  } else {
    // --- پاسخ اشتباه ---
    await storage.updateUserScore(chatId, message.from, -1, false);

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
 * ارائه سیستم راهنما
 */
async function handleHintRequest(chatId, userId, qId, callbackId, puzzle, state, telegram, storage) {
  const word = puzzle.words.find((w) => w.id === qId);
  if (!word) return;

  // کسر ۵ امتیاز بابت راهنما
  await storage.updateUserScore(chatId, { id: userId, first_name: "User" }, -5, false, true);

  const firstChar = word.answer[0];
  const lastChar = word.answer[word.answer.length - 1];
  const len = word.answer.length;

  const hintText = `💡 راهنمای سوال ${toPersianDigits(qId)}:\n- حرف اول: ${firstChar}\n- حرف آخر: ${lastChar}\n- تعداد حروف: ${toPersianDigits(len)} (-۵ امتیاز)`;

  await telegram.answerCallbackQuery(callbackId, "راهنما ارسال شد.");
  await telegram.sendMessage(chatId, hintText);
}

/**
 * ویرایش مجدد پیام اصلی جدول
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
 * ساخت Inline Keyboard سوالات
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
 * لغو وضعیت پاسخ‌دهی جاری کاربر (/cancel)
 */
async function handleCancelCommand(chatId, userId, telegram, storage) {
  const state = await storage.getGroupState(chatId);
  if (!state) return;

  const activeQId = state.userActiveQuestion[userId];
  if (activeQId) {
    delete state.userActiveQuestion[userId];
    await storage.unlockQuestion(chatId, activeQId);
    await storage.saveGroupState(chatId, state);
    await telegram.sendMessage(chatId, "از پاسخ‌دهی به سوال انصراف دادید.");
  }
}

/**
 * جدول رتبه‌بندی (/rank)
 */
async function handleRankCommand(chatId, telegram, storage) {
  const leaderboard = await storage.getGroupLeaderboard(chatId);
  const groupStats = (await storage.getJson(Storage.KEY_GROUP_STATS(chatId))) || { totalSolved: 0 };

  if (leaderboard.length === 0) {
    await telegram.sendMessage(chatId, "هنوز امتیازی در این گروه ثبت نشده است.");
    return;
  }

  let text = "🏆 <b>جدول رتبه‌بندی کاربران گروه:</b>\n\n";
  leaderboard.slice(0, 10).forEach((u, index) => {
    const rank = toPersianDigits(index + 1);
    text += `${rank}. <b>${u.name}</b>: ${toPersianDigits(u.score)} امتیاز (${toPersianDigits(u.correct)} صحیح | ${toPersianDigits(u.wrong)} غلط)\n`;
  });

  text += `\n📊 مجموع جدول‌های حل شده گروه: ${toPersianDigits(groupStats.totalSolved)}`;
  await telegram.sendMessage(chatId, text);
}

/**
 * آمار کلی (/stats)
 */
async function handleStatsCommand(chatId, telegram, storage) {
  const groupStats = (await storage.getJson(Storage.KEY_GROUP_STATS(chatId))) || {
    totalPlayed: 0,
    totalSolved: 0,
    totalTimes: [],
    autoSolved: 0
  };

  const allPuzzles = await storage.getAllPuzzleIds();
  const avgTimeSeconds =
    groupStats.totalTimes.length > 0
      ? groupStats.totalTimes.reduce((a, b) => a + b, 0) / groupStats.totalTimes.length
      : 0;

  let text = "📊 <b>آمار جدول کلمات متقاطع گروه:</b>\n\n";
  text += `- کل جدول‌های سیستم: ${toPersianDigits(allPuzzles.length)}\n`;
  text += `- جدول‌های شروع شده: ${toPersianDigits(groupStats.totalPlayed)}\n`;
  text += `- جدول‌های حل شده: ${toPersianDigits(groupStats.totalSolved)}\n`;
  text += `- حل خودکار (منقضی شده): ${toPersianDigits(groupStats.autoSolved)}\n`;
  text += `- میانگین زمان حل: ${formatDuration(avgTimeSeconds)}\n`;

  await telegram.sendMessage(chatId, text);
}

/**
 * پنل مدیریت (/admin)
 */
async function handleAdminPanel(chatId, userId, telegram, storage, env) {
  const isAdmin = await telegram.isAdmin(chatId, userId, env.ADMIN_USER_ID);
  if (!isAdmin) {
    await telegram.sendMessage(chatId, "❌ دسترسی غیرمجاز.");
    return;
  }

  const text =
    "⚙️ <b>پنل مدیریت ربات:</b>\n\n" +
    "برای مدیریت کامل جدول‌ها، از ابزار آنلاین ساخت جدول استفاده نموده و خروجی JSON را در دیتابیس بارگذاری کنید.";

  await telegram.sendMessage(chatId, text);
}

/**
 * پردازش و حل خودکار جدول‌ها پس از ۱۲ و ۲۴ ساعت (CRON Task)
 */
async function processAutoSolutions(telegram, storage) {
  const list = await storage.kv.list({ prefix: "group_state:" });
  const now = Date.now();

  for (const key of list.keys) {
    const state = await storage.getJson(key.name);
    if (!state || state.isCompleted) continue;

    const chatId = key.name.replace("group_state:", "");
    const puzzle = await storage.getPuzzle(state.puzzleId);
    if (!puzzle) continue;

    const elapsedHours = (now - state.startTime) / (1000 * 60 * 60);

    // ۲۴ ساعت گذشته -> حل کامل و بستن جدول
    if (elapsedHours >= 24) {
      state.isCompleted = true;
      state.solvedWordIds = puzzle.words.map((w) => w.id);
      await storage.saveGroupState(chatId, state);

      await updatePuzzleMessage(chatId, state, puzzle, telegram);
      await storage.recordGroupStats(chatId, 0, true);

      await telegram.sendMessage(
        chatId,
        "⏰ <b>مهلت ۲۴ ساعته جدول به پایان رسید!</b>\nجدول به صورت خودکار کامل شد و بسته‌شد."
      );
    }
    // ۱۲ ساعت گذشته -> حل ۳ سوال به عنوان راهنما
    else if (elapsedHours >= 12 && (!state.lastAutoSolve12h || now - state.lastAutoSolve12h >= 12 * 3600 * 1000)) {
      const unsolved = puzzle.words.filter((w) => !state.solvedWordIds.includes(w.id));
      if (unsolved.length > 0) {
        const toSolve = unsolved.slice(0, 3);
        toSolve.forEach((w) => state.solvedWordIds.push(w.id));
        state.lastAutoSolve12h = now;

        await storage.saveGroupState(chatId, state);
        await updatePuzzleMessage(chatId, state, puzzle, telegram);

        await telegram.sendMessage(
          chatId,
          "⏰ <b>۱۲ ساعت از شروع جدول گذشت!</b>\n۳ سوال به صورت خودکار حل شدند."
        );
      }
    }
  }
}
