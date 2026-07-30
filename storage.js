/**
 * مدیریت بانک جدول‌ها و ذخیره‌سازی KV
 */
export class Storage {
  constructor(kv) {
    this.kv = kv;
  }

  static KEY_PUZZLE_INDEX = "puzzles:index";
  static KEY_PUZZLE = (id) => `puzzle:${id}`;
  static KEY_GROUP_STATE = (chatId) => `group_state:${chatId}`;
  static KEY_GROUP_STATS = (chatId) => `group_stats:${chatId}`;

  // دریافت تمام آیدی‌های بانک جدول
  async getAllPuzzleIds() {
    let ids = await this.getJson(Storage.KEY_PUZZLE_INDEX);
    if (!ids || ids.length === 0) {
      // اگر دیتابیس خالی بود، جدول‌های پیش‌فرض بانک شارژ می‌شوند
      await this.seedInitialPuzzles();
      ids = await this.getJson(Storage.KEY_PUZZLE_INDEX);
    }
    return ids || [];
  }

  // گرفتن یک جدول خاص از بانک
  async getPuzzle(puzzleId) {
    return await this.getJson(Storage.KEY_PUZZLE(puzzleId));
  }

  // بانک اولیه جدول‌ها (می‌توانید جدول‌های بیشتر هم اینجا اضافه کنید)
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
          { id: 1, question: "مرکز کشور فرانسه", answer: "پاریس", row: 0, col: 0, direction: "across" },
          { id: 2, question: "بلندترین قله ایران", answer: "دماوند", row: 1, col: 0, direction: "across" }
        ]
      },
      {
        id: "p3",
        width: 4,
        height: 4,
        words: [
          { id: 1, question: "شاعر بوستان و گلستان", answer: "سعدی", row: 0, col: 0, direction: "across" },
          { id: 2, question: "بزرگترین اقیانوس جهان", answer: "آرام", row: 1, col: 0, direction: "across" }
        ]
      }
    ];

    const puzzleIds = bank.map((p) => p.id);
    await this.setJson(Storage.KEY_PUZZLE_INDEX, puzzleIds);

    for (const puzzle of bank) {
      await this.setJson(Storage.KEY_PUZZLE(puzzle.id), puzzle);
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
    const val = await this.kv.get(key);
    return val ? JSON.parse(val) : null;
  }

  async setJson(key, value) {
    await this.kv.put(key, JSON.stringify(value));
  }
}
