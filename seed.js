import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

async function runSeed() {
  console.log("🚀 شروع بارگذاری بانک جدول‌ها به KV...");

  // ۱. آپلود لیست شاخص جدول‌ها
  const indexPath = "./puzzles/index.json";
  if (existsSync(indexPath)) {
    const indexData = readFileSync(indexPath, "utf8");
    console.log("در حال ثبت لیست اصلی جدول‌ها (puzzles:index)...");
    execSync(`npx wrangler kv:key put --binding=CROSSWORD_KV "puzzles:index" '${indexData.trim()}'`);
  }

  // ۲. آپلود ۱۰ جدول
  for (let i = 1; i <= 10; i++) {
    const puzzleId = `puzzle_${String(i).padStart(3, "0")}`;
    const filePath = `./puzzles/${puzzleId}.json`;

    if (existsSync(filePath)) {
      console.log(`در حال بارگذاری ${puzzleId}...`);
      execSync(`npx wrangler kv:key put --binding=CROSSWORD_KV "puzzle:${puzzleId}" --path=${filePath}`);
    }
  }

  console.log("✅ بانک جدول‌ها با موفقیت روی Cloudflare KV آپلود شد.");
}

runSeed().catch(console.error);
