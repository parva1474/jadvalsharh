/**
 * مدیریت بانک جدول‌ها و ذخیره‌سازی Cloudflare KV
 */

// وارد کردن ۱۰ فایل جدول و ایندکس از پوشه puzzles
import indexData from "./puzzles/index.json";
import p001 from "./puzzles/puzzle_001.json";
import p002 from "./puzzles/puzzle_002.json";
import p003 from "./puzzles/puzzle_003.json";
import p004 from "./puzzles/puzzle_004.json";
import p005 from "./puzzles/puzzle_005.json";
import p006 from "./puzzles/puzzle_006.json";
import p007 from "./puzzles/puzzle_007.json";
import p008 from "./puzzles/puzzle_008.json";
import p009 from "./puzzles/puzzle_009.json";
import p010 from "./puzzles/puzzle_010.json";

export class Storage {
  constructor(kv) {
    this.kv = kv;
  }

  static KEY_PUZZLE_INDEX = "puzzles:index";
  static KEY_PUZZLE = (id) => `puzzle:${id}`;
  static KEY_GROUP_STATE = (chatId) => `group_state:${chatId}`;
  static KEY_GROUP_STATS = (chatId) => `group_stats:${chatId}`;

  /**
   * دریافت تمام آیدی‌های جدول
   */
  async getAllPuzzleIds() {
    let ids = await this.getJson(Storage.KEY_PUZZLE_INDEX);
    if (!ids || !Array.isArray(ids) || ids.length <= 1) {
      ids = await this.seedInitialPuzzles();
    }
    return ids || [];
  }

  /**
   * دریافت یک جدول با آیدی
   */
  async getPuzzle(puzzleId) {
    const key = puzzleId.startsWith("puzzle:") ? puzzleId : Storage.KEY_PUZZLE(puzzleId);
    return await this.getJson(key);
  }

  /**
   * شارژ کامل KV با تمام ۱۰ جدول موجود در پروژه
   */
  async seedInitialPuzzles() {
    const bank = [p001, p002, p003, p004, p005, p006, p007, p008, p009, p010];

    // استخراج لیست آیدی تمام ۱۰ جدول
    const puzzleIds = bank.map((p) => p.id);

    // ۱. به‌روزرسانی لیست اصلی index
    await this.setJson(Storage.KEY_PUZZLE_INDEX, puzzleIds);

    // ۲. ذخیره تک‌تک جدول‌ها در KV
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
