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

  // رندر کردن کامل جدول به صورت متنی (Unicode)
  static renderTable(puzzle, solvedWordIds, revealedCellsOverride = {}) {
    const { width, height, words } = puzzle;
    const grid = this.createGrid(width, height);

    // شماره‌گذاری و مقداردهی خانه‌های جدول
    words.forEach((w) => {
      const isSolved = solvedWordIds.includes(w.id);
      const cells = getWordCells(w);

      // قرار دادن شماره در خانه شروع
      if (!grid[w.row][w.col].number) {
        grid[w.row][w.col].number = w.id;
      }

      cells.forEach(({ row, col, charIndex, char }) => {
        if (row >= 0 && row < height && col >= 0 && col < width) {
          grid[row][col].isWord = true;
          grid[row][col].char = char;

          // اگر کلمه اصلی حل شده باشد، خانه باز می‌شود
          if (isSolved) {
            grid[row][col].isRevealed = true;
          }
          // باز شدن تقاطع‌ها یا حروف فاش‌شده
          if (revealedCellsOverride[`${row},${col}`]) {
            grid[row][col].isRevealed = true;
          }
        }
      });
    });

    // رسم مرزهای یونیکد
    let output = "<code>";
    output += "┌" + "───┬".repeat(width - 1) + "───┐\n";

    for (let r = 0; r < height; r++) {
      let line = "│";
      for (let c = 0; c < width; c++) {
        const cell = grid[r][c];
        if (!cell.isWord) {
          line += " █ │"; // خانه خالی/مسدود
        } else if (cell.isRevealed) {
          line += ` ${cell.char} │`; // خانه باز شده
        } else {
          // خانه حل‌نشده با شماره یا مربع
          if (cell.number) {
            const numStr = toPersianDigits(cell.number);
            line += numStr.length === 1 ? ` ${numStr}│` : `${numStr}│`;
          } else {
            line += " □ │";
          }
        }
      }
      output += line + "\n";

      if (r < height - 1) {
        output += "├" + "───┼".repeat(width - 1) + "───┤\n";
      }
    }

    output += "└" + "───┴".repeat(width - 1) + "───┘</code>\n";
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
        text += `<s>${numStr}${dirSymbol} ${w.question}</s> ✅ (${w.answer})\n`;
      } else {
        text += `<b>${numStr}${dirSymbol}</b> ${w.question} (${toPersianDigits(w.answer.length)} حرف)\n`;
      }
    });

    return text;
  }

  // تولید الگوی اشتباه (شامل حروف تقاطع‌های باز شده)
  static generateWrongPattern(puzzle, word, solvedWordIds) {
    const cells = getWordCells(word);
    let pattern = "";

    // استخراج تمام خانه‌هایی که از قبل به دلیل حل شدن سایر سوالات تقاطعی باز شده‌اند
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
        pattern += " □ ";
      }
    });

    return pattern.trim();
  }

  // بررسی تداخل و صحت جدول جدید ساخته شده
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
