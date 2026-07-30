/**
 * ماژول مدیریت لایه داده با Cloudflare KV
 */

export class Storage {
  constructor(kvNamespace) {
    this.kv = kvNamespace;
  }

  // کلیدهای کمکی
  static KEY_GROUP_STATE(chatId) { return `group_state:${chatId}`; }
  static KEY_GROUP_STATS(chatId) { return `group_stats:${chatId}`; }
  static KEY_USER_SCORE(chatId, userId) { return `score:${chatId}:${userId}`; }
  static KEY_GLOBAL_USER_SCORE(userId) { return `global_score:${userId}`; }
  static KEY_PUZZLE_INDEX() { return `puzzles:index`; }
  static KEY_PUZZLE_DATA(puzzleId) { return `puzzle:${puzzleId}`; }
  static KEY_ACTIVE_QUESTION(chatId, questionId) { return `active_q:${chatId}:${questionId}`; }
  static KEY_SETTINGS() { return `settings:global`; }

  // ذخیره‌سازی و دریافت وضعیت عمومی
  async getJson(key) {
    try {
      const val = await this.kv.get(key);
      if (!val) return null;
      return typeof val === "string" ? JSON.parse(val) : val;
    } catch (e) {
      console.error(`Error reading key ${key}:`, e);
      return null;
    }
  }

  async setJson(key, data, ttlSeconds = null) {
    const options = {};
    if (ttlSeconds) options.expirationTtl = ttlSeconds;
    await this.kv.put(key, JSON.stringify(data), options);
  }

  async delete(key) {
    await this.kv.delete(key);
  }

  // --- مدیریت جدول‌ها ---
  async addPuzzle(puzzle) {
    const index = (await this.getJson(Storage.KEY_PUZZLE_INDEX())) || [];
    if (!index.includes(puzzle.id)) {
      index.push(puzzle.id);
      await this.setJson(Storage.KEY_PUZZLE_INDEX(), index);
    }
    await this.setJson(Storage.KEY_PUZZLE_DATA(puzzle.id), puzzle);
  }

  async getPuzzle(puzzleId) {
    return await this.getJson(Storage.KEY_PUZZLE_DATA(puzzleId));
  }

  async getAllPuzzleIds() {
    return (await this.getJson(Storage.KEY_PUZZLE_INDEX())) || [];
  }

  async deletePuzzle(puzzleId) {
    let index = (await this.getJson(Storage.KEY_PUZZLE_INDEX())) || [];
    index = index.filter(id => id !== puzzleId);
    await this.setJson(Storage.KEY_PUZZLE_INDEX(), index);
    await this.delete(Storage.KEY_PUZZLE_DATA(puzzleId));
  }

  // --- وضعیت جاری بازی گروه ---
  async getGroupState(chatId) {
    return await this.getJson(Storage.KEY_GROUP_STATE(chatId));
  }

  async saveGroupState(chatId, state) {
    await this.setJson(Storage.KEY_GROUP_STATE(chatId), state);
  }

  async deleteGroupState(chatId) {
    await this.delete(Storage.KEY_GROUP_STATE(chatId));
  }

  // --- وضعیت قفل بودن سؤالات توسط کاربر ---
  async lockQuestion(chatId, questionId, userId, userName) {
    const key = Storage.KEY_ACTIVE_QUESTION(chatId, questionId);
    const existing = await this.getJson(key);
    if (existing && existing.userId !== userId) {
      return { success: false, lockedBy: existing.userName };
    }
    // قفل شدن به مدت ۵ دقیقه
    await this.setJson(key, { userId, userName }, 300);
    return { success: true };
  }

  async unlockQuestion(chatId, questionId) {
    await this.delete(Storage.KEY_ACTIVE_QUESTION(chatId, questionId));
  }

  async getQuestionLock(chatId, questionId) {
    return await this.getJson(Storage.KEY_ACTIVE_QUESTION(chatId, questionId));
  }

  // --- آمار و امتیازات ---
  async updateUserScore(chatId, user, scoreDelta, isCorrect, isHint = false) {
    // امتیاز گروهی
    const userKey = Storage.KEY_USER_SCORE(chatId, user.id);
    let userData = (await this.getJson(userKey)) || {
      userId: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      score: 0,
      correct: 0,
      wrong: 0,
      hints: 0
    };

    userData.score += scoreDelta;
    if (isCorrect) userData.correct += 1;
    else if (isHint) userData.hints += 1;
    else userData.wrong += 1;

    await this.setJson(userKey, userData);

    // امتیاز جهانی
    const globalKey = Storage.KEY_GLOBAL_USER_SCORE(user.id);
    let globalData = (await this.getJson(globalKey)) || {
      userId: user.id,
      name: userData.name,
      score: 0,
      correct: 0,
      wrong: 0,
      hints: 0
    };

    globalData.score += scoreDelta;
    if (isCorrect) globalData.correct += 1;
    else if (isHint) globalData.hints += 1;
    else globalData.wrong += 1;

    await this.setJson(globalKey, globalData);

    return userData;
  }

  // دریافت تمام امتیازات یک گروه
  async getGroupLeaderboard(chatId) {
    const prefix = `score:${chatId}:`;
    const list = await this.kv.list({ prefix });
    const scores = [];

    for (const key of list.keys) {
      const data = await this.getJson(key.name);
      if (data) scores.push(data);
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  // ثبت آمار پایان جدول برای گروه
  async recordGroupStats(chatId, solveTimeSeconds, solvedByAuto = false) {
    const key = Storage.KEY_GROUP_STATS(chatId);
    let stats = (await this.getJson(key)) || {
      totalPlayed: 0,
      totalSolved: 0,
      totalTimes: [],
      autoSolved: 0
    };

    stats.totalPlayed += 1;
    if (!solvedByAuto) {
      stats.totalSolved += 1;
      stats.totalTimes.push(solveTimeSeconds);
    } else {
      stats.autoSolved += 1;
    }

    await this.setJson(key, stats);
  }
}
