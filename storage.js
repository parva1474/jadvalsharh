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
      ids = await this.seedInitialPuzzles();
    }
    return ids || [];
  }

  /**
   * دریافت یک جدول مشخص با آیدی آن
   */
  async getPuzzle(puzzleId) {
    const key = puzzleId.startsWith("puzzle:") ? puzzleId : Storage.KEY_PUZZLE(puzzleId);
    return await this.getJson(key);
  }

  /**
   * لیست آیدی ۱۰ جدول موجود در پوشه puzzles
   */
  async seedInitialPuzzles() {
    const puzzleIds = [
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

    await this.setJson(Storage.KEY_PUZZLE_INDEX, puzzleIds);
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
