const CHANNEL_USERNAME = "@parvapoem";

// نرمال‌سازی حروف فارسی (حذف اعراب و یکسان‌سازی انواع «آ/ا»)
function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/[آأإٱآِاِاَُِّ]/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}

// تابع ارسال پیام
async function sendMessage(token, chatId, text, replyMarkup = null) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
}

// بررسی عضویت کانال
async function checkChannelMembership(token, userId) {
  try {
    const url = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.ok && ["creator", "administrator", "member"].includes(data.result?.status);
  } catch (e) {
    return false;
  }
}

// ثبت یا دریافت اطلاعات کاربر در دیتابیس
async function getOrCreateUser(db, user) {
  const today = new Date().toISOString().split("T")[0];
  let res = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(user.id).first();
  
  if (!res) {
    await db.prepare(
      "INSERT INTO users (user_id, username, first_name, hints, last_active_date) VALUES (?, ?, ?, 10, ?)"
    ).bind(user.id, user.username || "", user.first_name || "", today).run();
    
    res = { user_id: user.id, hints: 10, score_daily: 0, score_monthly: 0, score_total: 0 };
  }
  return res;
}

export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        const token = env.BOT_TOKEN;
        const db = env.DB;

        if (update.message && update.message.text) {
          const chatId = update.message.chat.id;
          const text = update.message.text.trim();
          const user = update.message.from;

          // ۱. بررسی عضویت کانال
          const isMember = await checkChannelMembership(token, user.id);
          if (!isMember) {
            await sendMessage(
              token,
              chatId,
              `⚠️ **برای ثبت امتیاز و بازی در ربات جدول، ابتدا عضو کانال شوید:**\n\n📢 ${CHANNEL_USERNAME}\n\nسپس /start را بزنید.`
            );
            return new Response("OK", { status: 200 });
          }

          const userData = await getOrCreateUser(db, user);

          // ۲. دستورات ربات
          if (text === "/start") {
            const msg = 
              `🧩 **به ربات جدول شرح در متن (۱۰×۱۵) خوش آمدید!**\n\n` +
              `🎁 **تعداد راهنمایی‌های شما:** ${userData.hints} عدد\n\n` +
              `📜 **راهنما:**\n` +
              `• برای شروع جدول جدید: /جدول\n` +
              `• مشاهده امتیازات شما: /امتیاز\n` +
              `• مشاهده برترین بازیکنان: /لیدربورد\n` +
              `• استفاده از راهنمایی: /راهنمایی [شماره سوال]\n\n` +
              `💡 *پاسخ‌ها را به صورت ` + "`[شماره سوال] [پاسخ]`" + ` بفرستید.* (مثال: ` + "`1 تهران`" + `)`;
            await sendMessage(token, chatId, msg);
          } 
          
          else if (text === "/امتیاز") {
            const scoreMsg = 
              `📊 **کارنامه امتیازات شما:**\n\n` +
              `☀️ امتیاز امروز: **${userData.score_daily}**\n` +
              `📅 امتیاز این ماه: **${userData.score_monthly}**\n` +
              `🏆 امتیاز کل: **${userData.score_total}**\n` +
              `💡 تعداد راهنمایی موجود: **${userData.hints}**`;
            await sendMessage(token, chatId, scoreMsg);
          }

          else if (text === "/جدول" || text === "/newgame") {
            // نمونه قالب جدول ۱۰ در ۱۵ با شرح در متن
            const puzzleTemplate = 
              `🧩 **جدول شرح در متن ۱۰×۱۵ (شماره ۱)**\n` +
              `━━━━━━━\n` +
              ````\n` +
              `[۱. پایتخت ایران (۵)]  [۲. بلندترین قله (۶)]\n` +
              `[۳. شاعر بوستان (۴)]   [۴. عنصر حیاتی (۲)]\n` +
              ````\n` +
              `━━━━━━━\n` +
              `💡 *سوالات در کادر بالا بزرگ‌نمایی می‌شوند (با نگه داشتن دست روی متن).*`;

            await sendMessage(token, chatId, puzzleTemplate);
          }

          else if (text.startsWith("/راهنمایی")) {
            if (userData.hints <= 0) {
              await sendMessage(token, chatId, "❌ تعداد راهنمایی‌های شما به پایان رسیده است!");
            } else {
              // کسر یک راهنمایی
              await db.prepare("UPDATE users SET hints = hints - 1 WHERE user_id = ?").bind(user.id).run();
              await sendMessage(
                token, 
                chatId, 
                `💡 **راهنمایی استفاده شد!** (راهنمایی‌های باقی‌مانده: ${userData.hints - 1})\nپاسخ خانه مورد نظر مشخص شد.`
              );
            }
          }

          else {
            // بررسی پاسخ کاربر به سوالات
            const parts = text.split(" ");
            if (parts.length >= 2) {
              const qId = parseInt(parts[0]);
              const rawAnswer = parts.slice(1).join(" ");
              const normalizedAnswer = normalizeText(rawAnswer);

              // پاسخ نمونه برای تست
              const correctAnswer = normalizeText("تهران");
              
              if (normalizedAnswer === correctAnswer) {
                // محاسبه امتیاز بر اساس طول کلمه و ضریب سختی (مثال: ۵ حرف * ۲)
                const gainedScore = correctAnswer.length * 2;

                await db.prepare(
                  "UPDATE users SET score_daily = score_daily + ?, score_monthly = score_monthly + ?, score_total = score_total + ? WHERE user_id = ?"
                ).bind(gainedScore, gainedScore, gainedScore, user.id).run();

                await sendMessage(
                  token, 
                  chatId, 
                  `✅ **آفرین ${user.first_name}!** پاسخ سوال ${qId} درست بود.\n➕ **${gainedScore}+ امتیاز** به حساب شما اضافه شد.`
                );
              } else {
                await sendMessage(token, chatId, "❌ پاسخ اشتباه است. دوباره تلاش کنید!");
              }
            }
          }
        }
      } catch (err) {
        console.log("Error:", err.message);
      }
      return new Response("OK", { status: 200 });
    }
    return new Response("Bot is running!", { status: 200 });
  },
};
