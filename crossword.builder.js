/**
 * ابزار ساخت و اعتبارافزایی ساختار جدول‌های جدید
 */

import { CrosswordEngine } from "./crossword.js";

export class CrosswordBuilder {
  constructor(width = 10, height = 15) {
    this.width = width;
    this.height = height;
    this.words = [];
  }

  // افزودن کلمه جدید
  addWord(id, question, answer, row, col, direction) {
    // نرمال‌سازی کلمه فارسی
    const cleanAnswer = answer.trim().replace(/\s+/g, "");

    const wordObj = {
      id,
      direction, // 'right', 'down', 'left', 'up'
      question,
      answer: cleanAnswer,
      row,
      col
    };

    this.words.push(wordObj);
  }

  // بررسی صحت کامل جدول قبل از خروجی JSON
  validate() {
    const puzzle = {
      width: this.width,
      height: this.height,
      words: this.words
    };
    return CrosswordEngine.validatePuzzleStructure(puzzle);
  }

  // خروجی استاندارد JSON
  exportJSON(puzzleId = "puzzle_1") {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`خطا در ساختار جدول: ${validation.error}`);
    }

    return JSON.stringify(
      {
        id: puzzleId,
        width: this.width,
        height: this.height,
        words: this.words
      },
      null,
      2
    );
  }
}

// --- نمونه استفاده و ساخت یک جدول نمونه ---
/*
const builder = new CrosswordBuilder(10, 15);

builder.addWord(1, "پایتخت ایران", "تهران", 0, 0, "right");
builder.addWord(2, "بزرگ‌ترین سیاره منظومه شمسی", "مشتری", 0, 0, "down");

if (builder.validate().valid) {
    console.log(builder.exportJSON("puzzle_001"));
}
*/
