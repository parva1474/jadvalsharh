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

  /**
   * دریافت تمام آیدی‌های جدول از puzzles:index
   */
  async getAllPuzzleIds() {
    let ids = await this.getJson(Storage.KEY_PUZZLE_INDEX);
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      // ساخت و شارژ اولیه index در صورت خالی بودن
      ids = await this.seedInitialPuzzles();
    }
    return ids || [];
  }

  /**
   * دریافت یک جدول مشخص با آیدی آن (مثلاً puzzle:p1)
   */
  async getPuzzle(puzzleId) {
    // اگر آیدی پیش‌وند puzzle: نداشت، اضافه می‌شود
    const key = puzzleId.startsWith("puzzle:") ? puzzleId : Storage.KEY_PUZZLE(puzzleId);
    return await this.getJson(key);
  }

  /**
   * شارژ بانک اطلاعاتی جدول‌ها
   */
  async seedInitialPuzzles() {
    const bank = [
      {
        id: "p1",
        width: 4,
        height: 4,
        words: [
          { id: 1, question: "پایتخت ایران", answer: "تهران", row: 0, col: 0, direction: "across" },
          { id: 2, question: "سیاره سرخ", answer: "مریخ", row: 1, col: 0, direction: "across" }
        ]
      },
      {
        id: "p2",
        width: 4,
        height: 4,
        words: [
          { id: 1, question: "مرکز فرانسه", answer: "پاریس", row: 0, col: 0, direction: "across" },
          { id: 2, question: "قله بلند ایران", answer: "دماوند", row: 1, col: 0, direction: "across" }
        ]
      },
      {
        id: "p3",
        width: 4,
        height: 4,
        words: [
          { id: 1, question: "شاعر گلستان", answer: "سعدی", row: 0, col: 0, direction: "across" },
          { id: 2, question: "اقیانوس بزرگ", answer: "آرام", row: 1, col: 0, direction: "across" }
        ]
      },
      {
        id: "p4",
        width: 4,
        height: 4,
        words: [
          { id: 1, question: "فلز گرانبها", answer: "طلا", row: 0, col: 0, direction: "across" },
          { id: 2, question: "پایتخت ژاپن", answer: "توکیو", row: 1, col: 0, direction: "across" }
        ]
      }
    ];

    const puzzleIds = bank.map((p) => p.id);
    await this.setJson(Storage.KEY_PUZZLE_INDEX, puzzleIds);

    for (const puzzle of bank) {
      await this.setJson(Storage.KEY_PUZZLE(puzzle.id), puzzle);
    }

    return puzzleIds;
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
    const val = await this.kv.get(key);
    return val ? JSON.parse(val) : null;
  }

  async setJson(key, value) {
    await this.kv.put(key, JSON.stringify(value));
  }
}
