import { TelegramAPI } from "./telegram.js";
import { Storage } from "./storage.js";
import { CrosswordEngine } from "./crossword.js";
import { toPersianDigits, formatDuration, getRandomElement } from "./utils.js";

export default {
  // پردازش درخواست‌های Webhook تلگرام
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

  // اجرای زمان‌بندی دوره‌ای (CRON)
  async scheduled(event, env, ctx) {
    const telegram = new TelegramAPI(env.TELEGRAM_BOT_TOKEN);
    const storage = new Storage(env.CROSSWORD_KV);
    await processAutoSolutions(telegram, storage);
  }
};

/**
 * پردازش تمام ورودهای تلگرام
 */
async function handleTelegramUpdate(update, telegram, storage, env) {
  // ۱. کلیک روی دکمه‌های شیشه‌ای
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, telegram, storage);
    return;
  }

  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();

  // ۲. پردازش دستورات
  if (text.startsWith("/")) {
    const rawCommand = text.split(" ")[0].toLowerCase();
    const command = rawCommand.split("@")[0]; // حذف یوزرنیم ربات جهت اجرا در گروه

    switch (command) {
      case "/start":
        await telegram.sendMessage(chatId, "سلام! به ربات جدول کلمات متقاطع خوش آمدید.\nبرای ایجاد جدول در گروه از دستور /new استفاده کنید.");
        break;

              case "/reload":
        await storage.seedInitialPuzzles();
        await storage.deleteGroupState(chatId);
        await telegram.sendMessage(chatId, "🔄 بانک اطلاعاتی جدول‌ها و index.json بازنشانی شد!");
        break;
        
      case "/new":
        await handleNewPuzzleCommand(chatId, userId, telegram, storage, env);
        break;

      case "/rank":
        await handleRankCommand(chatId, telegram, storage);
        break;

      case "/stats":
        await handleStatsCommand(chatId, telegram, storage);
        break;

      case "/cancel":
        await handleCancelCommand(chatId, userId, telegram, storage);
        break;

      default:
        break;
    }
    return;
  }

  // ۳. پردازش متن جواب ارسال شده توسط کاربر
  await handleUserAnswerInput(chatId, message, telegram, storage);
}

/**
 * ایجاد جدول جدید با الگوریتم عدم تکرار و اتصال به بانک جدول
 */
async function handleNewPuzzleCommand(chatId, userId, telegram, storage, env) {
  try {
    await storage.deleteGroupState(chatId);

    // ۱. دریافت کل آیدی‌های موجود در بانک جدول
    const allPuzzleIds = await storage.getAllPuzzleIds();
    if (!allPuzzleIds || allPuzzleIds.length === 0) {
      await telegram.sendMessage(chatId, "❌ هیچ جدولی در بانک اطلاعاتی یافت نشد.");
      return;
    }

    // ۲. دریافت لیست جدول‌های بازی‌شده در این گروه
    let groupStats = (await storage.getJson(Storage.KEY_GROUP_STATS(chatId))) || {};
    let playedIds = groupStats.playedPuzzleIds || [];

    // ۳. فیلتر کردن جدول‌ها (فقط جدول‌هایی که هنوز در این گروه بازی نشده‌اند)
    let availableIds = allPuzzleIds.filter((id) => !playedIds.includes(id));

    // اگر تمام جدول‌های بانک بازی شده باشند، آمار ریست شده و دوباره همه آزاد می‌شوند
    if (availableIds.length === 0) {
      playedIds = [];
      availableIds = allPuzzleIds;
    }

    // ۴. انتخاب یک جدول غیرتکراری به صورت تصادفی از بانک
    const selectedPuzzleId = getRandomElement(availableIds);
    const puzzle = await storage.getPuzzle(selectedPuzzleId);

    if (!puzzle) {
      await telegram.sendMessage(chatId, `❌ جدول ${selectedPuzzleId} در دیتابیس یافت نشد.`);
      return;
    }

    // ۵. ثبت این جدول در لیست بازی‌شده‌های گروه
    playedIds.push(selectedPuzzleId);
    groupStats.playedPuzzleIds = playedIds;
    await storage.setJson(Storage.KEY_GROUP_STATS(chatId), groupStats);

    // ۶. ذخیره وضعیت جدید بازی
    const newState = {
      puzzleId: puzzle.id,
      solvedWordIds: [],
      userActiveQuestion: {},
      startTime: Date.now(),
      isCompleted: false,
      messageId: null
    };

    const fullText = buildPuzzleDisplay(puzzle, []);
    const keyboard = buildInlineKeyboard(puzzle, []);

    const sentMsg = await telegram.sendMessage(chatId, fullText, keyboard);
    if (sentMsg && sentMsg.result) {
      newState.messageId = sentMsg.result.message_id;
      await storage.saveGroupState(chatId, newState);
    }
  } catch (err) {
    await telegram.sendMessage(chatId, `💥 خطا در دریافت جدول جدید از بانک:\n${err.message}`);
  }
}

    const selectedPuzzleId = getRandomElement(allPuzzleIds);
    const puzzle = await storage.getPuzzle(selectedPuzzleId);

    if (!puzzle) {
      await telegram.sendMessage(chatId, `❌ فایل جدول ${selectedPuzzleId} در KV یافت نشد.`);
      return;
    }

    const newState = {
      puzzleId: puzzle.id,
      solvedWordIds: [],
      userActiveQuestion: {},
      activeQuestionUsers: {},
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
  } catch (err) {
    await telegram.sendMessage(chatId, `💥 خطای غیرمنتظره:\n${err.message}`);
  }
}

/**
 * مدیریت لمس دکمه‌های کیبورد شیشه‌ای
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

  if (data.startsWith("q_")) {
    const qId = parseInt(data.replace("q_", ""), 10);

    if (state.solvedWordIds.includes(qId)) {
      await telegram.answerCallbackQuery(callbackQuery.id, "این سوال قبلاً حل شده است!", true);
      return;
    }

    const lockResult = await storage.lockQuestion(chatId, qId, userId, userName);
    if (!lockResult.success) {
      await telegram.answerCallbackQuery(
        callbackQuery.id,
        `این سوال توسط ${lockResult.lockedBy} در حال پاسخ‌دهی است.`,
        true
      );
      return;
    }

    state.userActiveQuestion[userId] = qId;
    await storage.saveGroupState(chatId, state);

    await telegram.answerCallbackQuery(callbackQuery.id, `سوال ${toPersianDigits(qId)} انتخاب شد.`);
    await telegram.sendMessage(chatId, `پاسخ سوال ${toPersianDigits(qId)} را بنویسید.`);
    return;
  }
}

/**
 * پردازش پاسخ ارسالی کاربر
 */
async function handleUserAnswerInput(chatId, message, telegram, storage) {
  const userId = message.from.id;
  const state = await storage.getGroupState(chatId);
  if (!state || state.isCompleted) return;

  const activeQId = state.userActiveQuestion[userId];
  if (!activeQId) return;

  const puzzle = await storage.getPuzzle(state.puzzleId);
  const word = puzzle.words.find((w) => w.id === activeQId);
  if (!word) return;

  const userAnswer = message.text.trim().replace(/\s+/g, "");
  const correctAnswer = word.answer.trim().replace(/\s+/g, "");

  if (userAnswer === correctAnswer) {
    state.solvedWordIds.push(word.id);
    delete state.userActiveQuestion[userId];
    await storage.unlockQuestion(chatId, word.id);

    await storage.updateUserScore(chatId, message.from, 10, true);

    const isAllSolved = state.solvedWordIds.length === puzzle.words.length;
    if (isAllSolved) {
      state.isCompleted = true;
      const solveTimeSeconds = Math.floor((Date.now() - state.startTime) / 1000);
      await storage.recordGroupStats(chatId, solveTimeSeconds, false);
    }

    await storage.saveGroupState(chatId, state);
    await updatePuzzleMessage(chatId, state, puzzle, telegram);

    if (isAllSolved) {
      await telegram.sendMessage(chatId, "🎉 تبریک! جدول با موفقیت و به طور کامل حل شد!");
    } else {
      await telegram.sendMessage(chatId, `✅ پاسخ سوال ${toPersianDigits(word.id)} درست بود! (+۱۰ امتیاز)`);
    }
  } else {
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
 * به‌روزرسانی پیام اصلی جدول
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
 * ساخت کیبورد شیشه‌ای دکمه‌های سوالات
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
 * انصراف کاربر (/cancel)
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
 * رتبه‌بندی (/rank)
 */
async function handleRankCommand(chatId, telegram, storage) {
  const leaderboard = await storage.getGroupLeaderboard(chatId);
  if (leaderboard.length === 0) {
    await telegram.sendMessage(chatId, "هنوز امتیازی در این گروه ثبت نشده است.");
    return;
  }

  let text = "🏆 <b>جدول رتبه‌بندی گروه:</b>\n\n";
  leaderboard.slice(0, 10).forEach((u, index) => {
    text += `${toPersianDigits(index + 1)}. <b>${u.name}</b>: ${toPersianDigits(u.score)} امتیاز\n`;
  });

  await telegram.sendMessage(chatId, text);
}

/**
 * آمار (/stats)
 */
async function handleStatsCommand(chatId, telegram, storage) {
  const groupStats = (await storage.getJson(Storage.KEY_GROUP_STATS(chatId))) || { totalSolved: 0 };
  await telegram.sendMessage(chatId, `📊 تعداد جدول‌های حل شده در این گروه: ${toPersianDigits(groupStats.totalSolved)}`);
}

/**
 * حل خودکار CRON
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

    if ((now - state.startTime) / (1000 * 60 * 60) >= 24) {
      state.isCompleted = true;
      state.solvedWordIds = puzzle.words.map((w) => w.id);
      await storage.saveGroupState(chatId, state);
      await updatePuzzleMessage(chatId, state, puzzle, telegram);
      await telegram.sendMessage(chatId, "⏰ مهلت ۲۴ ساعته جدول پایان یافت.");
    }
  }
}
