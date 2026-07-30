/**
 * ماژول موتور اصلی رسم جدول (با الگوی شبکه‌ای ایموجی شبیه عکس)
 */

import { toPersianDigits, DIRECTION_SYMBOLS, getWordCells } from "./utils.js";

export class CrosswordEngine {
  static createGrid(width, height) {
    const grid = [];
    for (let r = 0; r < height; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        row.push({
          isWord: false,
          char: "",
          isRevealed: false,
          number: null
        });
      }
      grid.push(row);
    }
    return grid;
  }

  // تبدیل شماره به ایموجی عدد دوردار/مربعی برای هم‌ترازی کامل
  static getNumberEmoji(num) {
    const numEmojis = {
      1: "1️⃣",
      2: "2️⃣",
      3: "3️⃣",
      4: "4️⃣",
      5: "5️⃣",
      6: "6️⃣",
      7: "7️⃣",
      8: "8️⃣",
      9: "9️⃣",
      10: "🔟"
    };
    return numEmojis[num] || `${toPersianDigits(num)}️⃣`;
  }

  // رندر کردن جدول به صورت شبکه مربع‌های گرافیکی یک‌دست
  static renderTable(puzzle, solvedWordIds, revealedCellsOverride = {}) {
    const { width, height, words } = puzzle;
    const grid = this.createGrid(width, height);

    words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const cells = getWordCells(w);

      if (!grid[w.row][w.col].number) {
        grid[w.row][w.col].number = w.id;
      }

      cells.forEach(({ row, col, char }) => {
        if (row >= 0 && row < height && col >= 0 && col < width) {
          grid[row][col].isWord = true;
          grid[row][col].char = char;

          if (isSolved || revealedCellsOverride[`${row},${col}`]) {
            grid[row][col].isRevealed = true;
          }
        }
      });
    });

    let output = "";

    for (let r = 0; r < height; r++) {
      let line = "";
      for (let c = 0; c < width; c++) {
        const cell = grid[r][c];

        if (!cell.isWord) {
          line += "⬛ "; // خانه پوچ/مشکی
        } else if (cell.isRevealed) {
          line += ` ${cell.char} `; // حرف حل شده
        } else if (cell.number) {
          line += `${this.getNumberEmoji(cell.number)} `; // شماره سوال
        } else {
          line += "⬜ "; // خانه خالی
        }
      }
      output += line.trimEnd() + "\n";
    }

    return output;
  }

  static renderQuestions(puzzle, solvedWordIds) {
    let text = "\n<b>📋 سوالات جدول:</b>\n\n";

    puzzle.words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const dirSymbol = DIRECTION_SYMBOLS[w.direction] || "→";
      const numEmoji = this.getNumberEmoji(w.id);

      if (isSolved) {
        text += `✅ <s>${numEmoji}${dirSymbol} ${w.question}</s> (<b>${w.answer}</b>)\n`;
      } else {
        text += `❓ ${numEmoji}${dirSymbol} <b>${w.question}</b> (${toPersianDigits(w.answer.length)} حرف)\n`;
      }
    });

    return text;
  }

  static generateWrongPattern(puzzle, word, solvedWordIds) {
    const cells = getWordCells(word);
    let pattern = "";

    const openCells = new Set();
    puzzle.words.forEach((w) => {
      if (solvedWordIds.includes(w.id)) {
        getWordCells(w).forEach((c) => openCells.add(`${c.row},${c.col}`));
      }
    });

    cells.forEach(({ row, col, char }) => {
      if (openCells.has(`${row},${col}`)) {
        pattern += ` ${char} `;
      } else {
        pattern += " ⬜ ";
      }
    });

    return pattern.trim();
  }

  static validatePuzzleStructure(puzzle) {
    const { width, height, words } = puzzle;
    const gridMap = new Map();

    for (const w of words) {
      const cells = getWordCells(w);
      for (const { row, col, char } of cells) {
        if (row < 0 || row >= height || col < 0 || col >= width) {
          return { valid: false, error: `کلمه ${w.id} از کادر بیرون زده است.` };
        }
        const key = `${row},${col}`;
        if (gridMap.has(key)) {
          const existingChar = gridMap.get(key);
          if (existingChar !== char) {
            return { valid: false, error: `تداخل حرفی در خانه (${row}, ${col}).` };
          }
        } else {
          gridMap.set(key, char);
        }
      }
    }
    return { valid: true };
  }
}
