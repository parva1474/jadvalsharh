/**
 * ماژول موتور اصلی رسم جدول، بررسی پاسخ‌ها و منطق متقاطع کلمات
 */

import { toPersianDigits, DIRECTION_SYMBOLS, getWordCells } from "./utils.js";

export class CrosswordEngine {
  // ساخت شبکه خالی با توجه به ابعاد
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

  // رندر کردن تمیز و هم‌تراز جدول به صورت ایموجی‌محور
  static renderTable(puzzle, solvedWordIds, revealedCellsOverride = {}) {
    const { width, height, words } = puzzle;
    const grid = this.createGrid(width, height);

    // شماره‌گذاری و مقداردهی خانه‌های جدول
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

          if (isSolved) {
            grid[row][col].isRevealed = true;
          }
          if (revealedCellsOverride[`${row},${col}`]) {
            grid[row][col].isRevealed = true;
          }
        }
      });
    });

    let output = "<code>";

    // رسم خانه‌های جدول
    for (let r = 0; r < height; r++) {
      let line = "";
      for (let c = 0; c < width; c++) {
        const cell = grid[r][c];

        if (!cell.isWord) {
          line += "⬛ "; // خانه سیاه (پوچ)
        } else if (cell.isRevealed) {
          line += `${cell.char}  `; // حرف حل شده
        } else if (cell.number) {
          // شماره سوال در خانه
          const numStr = toPersianDigits(cell.number);
          line += `${numStr}  `;
        } else {
          line += "⬜ "; // خانه خالی برای پاسخ
        }
      }
      output += line.trimEnd() + "\n";
    }

    output += "</code>";
    return output;
  }

  // رندر متن سوالات زیر جدول
  static renderQuestions(puzzle, solvedWordIds) {
    let text = "\n<b>📋 سوالات جدول:</b>\n\n";

    puzzle.words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const dirSymbol = DIRECTION_SYMBOLS[w.direction] || "→";
      const numStr = toPersianDigits(w.id);

      if (isSolved) {
        text += `✅ <s><b>${numStr}${dirSymbol}</b> ${w.question}</s> (${w.answer})\n`;
      } else {
        text += `❓ <b>${numStr}${dirSymbol}</b> ${w.question} (<b>${toPersianDigits(w.answer.length)}</b> حرف)\n`;
      }
    });

    return text;
  }

  // تولید الگوی راهنمای کلمه اشتباه
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

  // بررسی صحت ساختار جدول
  static validatePuzzleStructure(puzzle) {
    const { width, height, words } = puzzle;
    const gridMap = new Map();

    for (const w of words) {
      const cells = getWordCells(w);
      for (const { row, col, char } of cells) {
        if (row < 0 || row >= height || col < 0 || col >= width) {
          return { valid: false, error: `کلمه ${w.id} از کادر جدول بیرون زده است.` };
        }
        const key = `${row},${col}`;
        if (gridMap.has(key)) {
          const existingChar = gridMap.get(key);
          if (existingChar !== char) {
            return {
              valid: false,
              error: `تداخل حرفی در خانه (${row}, ${col}) بین کلمات. '${existingChar}' با '${char}' مغایرت دارد.`
            };
          }
        } else {
          gridMap.set(key, char);
        }
      }
    }
    return { valid: true };
  }
}
