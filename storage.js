export class Storage {
  constructor(kv) {
    this.kv = kv;
  }

  static KEY_PUZZLE_INDEX = "puzzles:index";
  static KEY_PUZZLE = (id) => `puzzle:${id}`;
  static KEY_GROUP_STATE = (chatId) => `group_state:${chatId}`;
  static KEY_GROUP_STATS = (chatId) => `group_stats:${chatId}`;

  static GITHUB_RAW_BASE = "https://raw.githubusercontent.com/parva1474/jadvalsharh/main/puzzles";

  async getAllPuzzleIds() {
    let ids = await this.getJson(Storage.KEY_PUZZLE_INDEX);
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ids = await this.seedInitialPuzzles();
    }
    return ids || [];
  }

  async getPuzzle(puzzleId) {
    const cleanId = puzzleId.replace("puzzle:", "");
    const key = Storage.KEY_PUZZLE(cleanId);
    
    let puzzle = await this.getJson(key);
    
    if (!puzzle) {
      try {
        const response = await fetch(`${Storage.GITHUB_RAW_BASE}/${cleanId}.json`);
        if (response.ok) {
          puzzle = await response.json();
          await this.setJson(key, puzzle);
        }
      } catch (err) {
        console.error(`Error fetching ${cleanId}.json:`, err);
      }
    }
    
    return puzzle;
  }

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
