/**
 * ماژول ابزارهای عمومی و توابع کمکی
 */

// تبدیل جهت به جهت فارسی
export const DIRECTION_SYMBOLS = {
  right: "←", // حرکت به سمت چپ (در خط فارسی/عربی)
  down: "↓",
  left: "→",
  up: "↑"
};

// نگاشت اعداد انگلیسی به فارسی برای نمایش زیبا
export function toPersianDigits(num) {
  if (num === null || num === undefined) return "";
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

// تولید شناسه یکتا برای جدول‌ها یا نشست‌ها
export function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// محاسبه مختصات تمام خانه‌های یک کلمه
export function getWordCells(word) {
  const cells = [];
  const len = word.answer.length;
  let r = word.row;
  let c = word.col;

  for (let i = 0; i < len; i++) {
    cells.push({ row: r, col: c, charIndex: i, char: word.answer[i] });
    if (word.direction === "right") {
      c++; // حرکت افقی
    } else if (word.direction === "down") {
      r++; // حرکت عمودی
    } else if (word.direction === "left") {
      c--;
    } else if (word.direction === "up") {
      r--;
    }
  }
  return cells;
}

// انتخاب آیتم تصادفی از آرایه
export function getRandomElement(arr) {
  if (!arr || arr.length === 0) return null;
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

// فرمت‌دهی زمان بر حسب ثانیه به دقیقه و ساعت
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "۰ ثانیه";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let result = [];
  if (hours > 0) result.push(`${toPersianDigits(hours)} ساعت`);
  if (minutes > 0) result.push(`${toPersianDigits(minutes)} دقیقه`);
  if (secs > 0 && hours === 0) result.push(`${toPersianDigits(secs)} ثانیه`);

  return result.join(" و ");
}
