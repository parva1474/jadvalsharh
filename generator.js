import { WORD_BANK } from "./words.js";

export class DynamicCrosswordGenerator {
  /**
   * تولید یک جدول جدید به صورت تصادفی و پویا
   */
  static generatePuzzle(wordCount = 5) {
    // ۱. انتخاب کلمات تصادفی از بانک
    const shuffled = [...WORD_BANK].sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, wordCount);

    const puzzleWords = [];
    let idCounter = 1;

    // ۲. چیدمان ساده و هوشمندانه روی شبکه جدول (برای نمونه ۶x۶)
    selectedWords.forEach((item, index) => {
      // نصف کلمات افقی، نصف عمودی
      const direction = index % 2 === 0 ? "across" : "down";
      
      let startRow = 0;
      let startCol = 0;

      if (direction === "across") {
        startRow = (index * 2) % 6;
        startCol = 0;
      } else {
        startRow = 0;
        startCol = (index * 2 + 1) % 6;
      }

      puzzleWords.push({
        id: idCounter++,
        answer: item.word,
        clue: item.question,
        direction: direction,
        startRow: startRow,
        startCol: startCol
      });
    });

    return {
      id: "dynamic_" + Date.now(),
      title: "جدول پویا",
      rows: 6,
      cols: 6,
      words: puzzleWords
    };
  }
}
