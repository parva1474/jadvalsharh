/**
 * مدیریت بانک جدول‌ها و ذخیره‌سازی Cloudflare KV
 */
export class Storage {
  constructor(kv) {
    this.kv = kv;
  }

  static KEY_PUZZLE_INDEX = "puzzles:index";
  static KEY_PUZZLE = (id) => `puzzle:${id}`;
  static KEY_GROUP_STATE = (chatId) => `group_state:${chatId}`;
  static KEY_GROUP_STATS = (chatId) => `group_stats:${chatId}`;

  static GITHUB_RAW_BASE = "https://raw.githubusercontent.com/parva1474/jadvalsharh/main/puzzles";

  /**
   * لیست ۱۰ جدول استاندارد شما در گیت‌هاب
   */
  static DEFAULT_PUZZLES = [
    "puzzle_001",
    "puzzle_002",
    "puzzle_003",
    "puzzle_004",
    "puzzle_005",
    "puzzle_006",
    "puzzle_007",
    "puzzle_008",
    "puzzle_009",
    "puzzle_010"
  ];

  /**
   * دریافت تمام آیدی‌های جدول از puzzles:index
   * (اگر خالی باشد، اتوماتیک ۱۰ جدول را ست می‌کند)
   */
  async getAllPuzzleIds() {
    let ids = await this.getJson(Storage.KEY_PUZZLE_INDEX);
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ids = await this.seedInitialPuzzles();
    }
    return ids;
  }

  /**
   * دریافت یک جدول مشخص با آیدی آن
   */
  async getPuzzle(puzzleId) {
    const cleanId = puzzleId.replace("puzzle:", "");
    const key = Storage.KEY_PUZZLE(cleanId);
    
    // ۱. ابتدا از KV خوانده می‌شود
    let puzzle = await this.getJson(key);
    
    // ۲. اگر در KV نبود، مستقیماً از فایل JSON گیت‌هاب دانلود و ذخیره می‌شود
    if (!puzzle) {
      try {
        const response = await fetch(`${Storage.GITHUB_RAW_BASE}/${cleanId}.json`);
        if (response.ok) {
          puzzle = await response.json();
          await this.setJson(key, puzzle);
        }
      } catch (err) {
        console.error(`Error fetching ${cleanId}.json from GitHub:`, err);
      }
    }
    
    return puzzle;

/**
 * ایجاد جدول جدید با الگوریتم شارژ خودکار و عدم تکرار
 */
async function handleNewPuzzleCommand(chatId, userId, telegram, storage, env) {
  try {
    await storage.deleteGroupState(chatId);

    // ۱. دریافت آیدی‌ها (اگر خالی بود، خودش خودکار شارژ می‌کنه)
    let allPuzzleIds = await storage.getAllPuzzleIds();
    
    // پشتیبان: اگر باز هم خالی بود، مستقیماً شارژ اولیه انجام بده
    if (!allPuzzleIds || allPuzzleIds.length === 0) {
      allPuzzleIds = await storage.seedInitialPuzzles();
    }

    if (!allPuzzleIds || allPuzzleIds.length === 0) {
      await telegram.sendMessage(chatId, "❌ خطا: اتصال به بانک جدول‌ها برقرار نشد.");
      return;
    }

    // ۲. دریافت آمار جدول‌های بازی شده
    let groupStats = (await storage.getJson(Storage.KEY_GROUP_STATS(chatId))) || {};
    let playedIds = groupStats.playedPuzzleIds || [];

    // ۳. پیدا کردن جدول‌های غیرتکراری
    let availableIds = allPuzzleIds.filter((id) => !playedIds.includes(id));

    if (availableIds.length === 0) {
      playedIds = [];
      availableIds = allPuzzleIds;
    }

    // ۴. انتخاب تصادفی
    const selectedPuzzleId = getRandomElement(availableIds);
    const puzzle = await storage.getPuzzle(selectedPuzzleId);

    if (!puzzle) {
      await telegram.sendMessage(chatId, `❌ دریافت فایل جدول ${selectedPuzzleId} ناموفق بود.`);
      return;
    }

    // ۵. ثبت و ذخیره
    playedIds.push(selectedPuzzleId);
    groupStats.playedPuzzleIds = playedIds;
    await storage.setJson(Storage.KEY_GROUP_STATS(chatId), groupStats);

    const newState = {
      puzzleId: puzzle.id || selectedPuzzleId,
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
    await telegram.sendMessage(chatId, `💥 خطا در دریافت جدول:\n${err.message}`);
  }
}
  async getGroupState(chatId) {
    return await this.getJson(Storage.KEY_GROUP_STATE(chatId));
  }

  async saveGroupState(chatId, state) {
    await this.setJson(Storage.KEY_GROUP_STATE(chatId), state);
  }

  async deleteGroupState(chatId) {
    await this.kv.delete(Storage.KEY_GROUP_STATE(chatId));
  }

  async getJson(key) {
    try {
      const val = await this.kv.get(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      return null;
    }
  }

  async setJson(key, value) {
    try {
      await this.kv.put(key, JSON.stringify(value));
    } catch (e) {
      console.error("KV Put Error:", e);
    }
  }
}
