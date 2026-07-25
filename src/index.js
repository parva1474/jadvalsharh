export default {
  async fetch(request, env) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        await handleUpdate(update, env);
      } catch (err) {
        console.error("Error processing update:", err);
      }
      return new Response("OK");
    }
    return new Response("Bot is active!");
  }
};

// ==========================================
// تنظیمات اولیه و بانک اطلاعات کلمات
// ==========================================
// ⚠️ آیدی یا یوزرنیم کانال خود را اینجا وارد کنید (با @)
const CHANNEL_USERNAME = "@parvapoem"; 

const WORDS_DATABASE = [
  { word: "تهران", clue: "پایتخت زیبای ایران" },
  { word: "مریخ", clue: "سیاره سرخ منظومه شمسی" },
  { word: "شیراز", clue: "شهر شعر و حافظ" },
  { word: "نیلوفر", clue: "گلی مردابی و زیبا" },
  { word: "البرز", clue: "رشته‌کوه معروف شمال ایران" },
  { word: "سهند", clue: "عروس کوه‌های ایران" },
  { word: "کارون", clue: "پرآب‌ترین رود ایران" },
  { word: "خلیج", clue: "پهنه‌ای از آب دریا" },
  { word: "فردوسی", clue: "سرانجام‌دهنده شاهنامه" },
  { word: "خیام", clue: "شاعر و ریاضی‌دان بزرگ ایرانی" },
  { word: "عطارد", clue: "نزدیک‌ترین سیاره به خورشید" },
  { word: "فارس", clue: "یکی از استان‌های کهن ایران" },
  { word: "زاگرس", clue: "رشته‌کوه طولانی غرب ایران" },
  { word: "کاسپین", clue: "نام دیگر دریای خزر" }
];

function generateUniquePuzzle(puzzleIndex) {
  const offset = (puzzleIndex * 3) % WORDS_DATABASE.length;
  const selectedWords = [];
  
  for (let i = 0; i < 4; i++) {
    const wordObj = WORDS_DATABASE[(offset + i) % WORDS_DATABASE.length];
    selectedWords.push({
      id: i + 1,
      word: wordObj.word,
      clue: wordObj.clue,
      solved: false,
      solvedBy: null, // نام فردی که حدس زده
      revealedLetters: new Array(wordObj.word.length).fill(false)
    });
  }

  return {
    id: puzzleIndex,
    words: selectedWords,
    stats: {}, // برای ذخیره آمار پاسخ‌های صحیح هر کاربر {userId: {name, count}}
    isCompleted: false
  };
}

// ==========================================
// چک کردن عضویت در کانال (Force Join)
// ==========================================
async function checkChannelMembership(token, userId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${@parvapoem}&user_id=${userId}`);
    const data = await res.json();
    if (data.ok) {
      const status = data.result.status;
      return ["creator", "administrator", "member"].includes(status);
    }
  } catch (e) {
    console.error("Channel Check Error:", e);
  }
  return false;
}

// ==========================================
// پردازش Updateها
// ==========================================
async function handleUpdate(update, env) {
  const token = env.BOT_TOKEN;

  // ۱. پیام‌های متنی
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const userId = update.message.from.id;
    const userName = update.message.from.first_name || "کاربر";

    // دستور شروع بازی جدید (ارسال پیام تازه در گروه)
    if (text === "/start" || text === "/جدول" || text.startsWith("/newgame")) {
      const isMember = await checkChannelMembership(token, userId);
      if (!isMember) {
        await sendJoinChannelMessage(token, chatId, userId);
        return;
      }
      await startNewGame(token, chatId, env);
      return;
    }

    // بررسی کلمه فرستاده شده
    const gameState = await env.PUZZLE_KV.get(`game_${chatId}`, { type: "json" });
    if (gameState && !gameState.isCompleted) {
      const isMember = await checkChannelMembership(token, userId);
      if (!isMember) {
        await sendJoinChannelMessage(token, chatId, userId);
        return;
      }
      await checkSubmittedWord(token, chatId, userId, userName, text, gameState, env);
    }
  }

  // ۲. کلیک روی دکمه‌ها
  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    const isMember = await checkChannelMembership(token, userId);
    if (!isMember) {
      await answerCallbackQuery(token, query.id, `⚠️ شما هنوز عضو کانال نشده‌اید! ابتدا عضو کانال شوید.`, true);
      return;
    }

    const gameState = await env.PUZZLE_KV.get(`game_${chatId}`, { type: "json" });

    if (data.startsWith("clue_")) {
      const wordId = parseInt(data.split("_")[1]);
      const target = gameState.words.find(w => w.id === wordId);
      await answerCallbackQuery(token, query.id, `🔍 شرح کلمه ${wordId}:\n${target.clue}`, true);
    } 
    else if (data.startsWith("buy_hint_")) {
      const wordId = parseInt(data.split("_")[2]);
      await buyHint(token, chatId, userId, query.id, wordId, gameState, env);
    }
  }
}

// ==========================================
// ارسال پیام قفل کانال
// ==========================================
async function sendJoinChannelMessage(token, chatId, userId) {
  const channelLink = `https://t.me/${CHANNEL_USERNAME.replace('@', '')}`;
  const text = `⚠️ **جهت شرکت در بازی جدول و ثبت امتیاز، باید عضو کانال زیر باشید:**\n\n📢 ${CHANNEL_USERNAME}`;
  const keyboard = {
    inline_keyboard: [
      [{ text: "📢 عضویت در کانال", url: channelLink }]
    ]
  };
  await sendMessage(token, chatId, text, keyboard);
}

// ==========================================
// شروع بازی جدید (ایجاد پیام مستقل در گروه)
// ==========================================
async function startNewGame(token, chatId, env) {
  let history = await env.PUZZLE_KV.get(`history_${chatId}`, { type: "json" }) || [];
  
  let nextPuzzleId = Math.floor(Math.random() * 10000) + 1;
  while (history.includes(nextPuzzleId) && history.length < 10000) {
    nextPuzzleId = (nextPuzzleId % 10000) + 1;
  }

  history.push(nextPuzzleId);
  await env.PUZZLE_KV.put(`history_${chatId}`, JSON.stringify(history));

  const newPuzzle = generateUniquePuzzle(nextPuzzleId);
  await env.PUZZLE_KV.put(`game_${chatId}`, JSON.stringify(newPuzzle));

  // ارسال یک پیام جدید در گروه
  await sendNewGridMessage(token, chatId, newPuzzle, "🎮 **جدول شرح در متن جدید شروع شد!**\nپاسخ‌های خود را ارسال کنید.");
}

// ==========================================
// ارسال و بروزرسانی نمایش جدول
// ==========================================
async function sendNewGridMessage(token, chatId, gameState, headerText) {
  const { text, keyboard } = buildGridMarkup(gameState, headerText);
  const msgData = await sendMessage(token, chatId, text, keyboard);
  
  // ذخیره Message ID پیام جاری جدول
  if (msgData && msgData.result) {
    gameState.messageId = msgData.result.message_id;
  }
}

async function updateGridMessage(token, chatId, gameState, headerText) {
  const { text, keyboard } = buildGridMarkup(gameState, headerText);
  if (gameState.messageId) {
    await editMessageText(token, chatId, gameState.messageId, text, keyboard);
  } else {
    await sendMessage(token, chatId, text, keyboard);
  }
}

function buildGridMarkup(gameState, headerText) {
  let gridDisplay = `${headerText}\n\n`;
  
  if (gameState.isCompleted) {
    gridDisplay += `🔒 **این جدول با موفقیت به پایان رسید.**\n`;
  }
  
  gridDisplay += `📌 **جدول شماره:** #${gameState.id}\n`;
  gridDisplay += `──────────────────\n`;

  gameState.words.forEach((item) => {
    gridDisplay += `🔹 **کلمه ${item.id}:** `;
    
    for (let i = 0; i < item.word.length; i++) {
      if (item.solved || item.revealedLetters[i]) {
        gridDisplay += ` [ ${item.word[i]} ] `;
      } else {
        gridDisplay += ` [ ❓ ] `;
      }
    }
    
    if (item.solved) {
      gridDisplay += ` ✅ (${item.solvedBy})`;
    }
    gridDisplay += `\n`;
  });

  gridDisplay += `──────────────────\n`;

  // نمایش کارنامه نهایی و برنده اگر جدول کامل شده باشد
  if (gameState.isCompleted) {
    gridDisplay += `🏆 **جدول کامل شد - نتایج نهایی:**\n\n`;
    
    // پیدا کردن نفر اول
    let topPlayer = null;
    let maxCount = 0;
    
    for (const uId in gameState.stats) {
      const p = gameState.stats[uId];
      gridDisplay += `👤 **${p.name}:** ${p.count} کلمه درست (+${p.coins} سکه)\n`;
      if (p.count > maxCount) {
        maxCount = p.count;
        topPlayer = p.name;
      }
    }
    
    if (topPlayer) {
      gridDisplay += `\n🥇 **قهرمان این جدول:** 🎉 **${topPlayer}** 🎉\n`;
    }
    gridDisplay += `\n✨ برای شروع جدول بعدی دستور /جدول را بفرستید.`;
  } else {
    gridDisplay += `💡 *جهت دیدن شرح کلمه یا خرید راهنمایی کلیک کنید:*`;
  }

  const inlineKeyboard = [];
  if (!gameState.isCompleted) {
    gameState.words.forEach((item) => {
      if (!item.solved) {
        inlineKeyboard.push([
          { text: `📖 شرح کلمه ${item.id}`, callback_data: `clue_${item.id}` },
          { text: `🔑 خرید راهنمایی (۱۰ سکه)`, callback_data: `buy_hint_${item.id}` }
        ]);
      }
    });
  }

  return { text: gridDisplay, keyboard: { inline_keyboard: inlineKeyboard } };
}

// ==========================================
// بررسی کلمه‌ها، ثبت آمار و اتمام بازی
// ==========================================
async function checkSubmittedWord(token, chatId, userId, userName, text, gameState, env) {
  for (let item of gameState.words) {
    if (!item.solved && item.word === text) {
      item.solved = true;
      item.solvedBy = userName;

      // ثبت آمار در جدول
      if (!gameState.stats[userId]) {
        gameState.stats[userId] = { name: userName, count: 0, coins: 0 };
      }
      gameState.stats[userId].count += 1;
      gameState.stats[userId].coins += 20; // جایزه حدس درست (۲۰ سکه)

      // افزایش سکه عمومی کاربر در دیتابیس
      let userCoins = (await env.PUZZLE_KV.get(`coins_${chatId}_${userId}`, { type: "json" })) || 0;
      userCoins += 20;
      await env.PUZZLE_KV.put(`coins_${chatId}_${userId}`, JSON.stringify(userCoins));

      // آیا جدول کاملاً حل شد؟
      const allSolved = gameState.words.every(w => w.solved);
      
      if (allSolved) {
        gameState.isCompleted = true;
        // بونوس اضافی به برنده جدول (+۳۰ سکه اضافی)
        let topUserId = userId;
        let maxC = 0;
        for (const uId in gameState.stats) {
          if (gameState.stats[uId].count > maxC) {
            maxC = gameState.stats[uId].count;
            topUserId = uId;
          }
        }
        gameState.stats[topUserId].coins += 30; // بونوس قهرمانی

        await updateGridMessage(token, chatId, gameState, `🏁 **جدول کامل شد!**`);
        await env.PUZZLE_KV.delete(`game_${chatId}`); // بازی اکتیو پاک می‌شود تا پیام بعدی جدول جدید بفرستد
      } else {
        await env.PUZZLE_KV.put(`game_${chatId}`, JSON.stringify(gameState));
        await updateGridMessage(token, chatId, gameState, `🎯 **کلمه «${text}» توسط ${userName} درست حدس زده شد!** (+۲۰ سکه)`);
      }
      break;
    }
  }
}

// ==========================================
// خرید راهنمایی
// ==========================================
async function buyHint(token, chatId, userId, queryId, wordId, gameState, env) {
  let userCoins = (await env.PUZZLE_KV.get(`coins_${chatId}_${userId}`, { type: "json" })) || 0;

  if (userCoins < 10) {
    await answerCallbackQuery(token, queryId, `❌ سکه کافی ندارید! (موجودی: ${userCoins} سکه - نیاز: ۱۰ سکه)`, true);
    return;
  }

  const target = gameState.words.find(w => w.id === wordId);
  if (!target || target.solved) {
    await answerCallbackQuery(token, queryId, `این کلمه قبلاً حل شده است!`, true);
    return;
  }

  const unrevealedIndex = target.revealedLetters.findIndex(r => r === false);
  if (unrevealedIndex !== -1) {
    target.revealedLetters[unrevealedIndex] = true;
    userCoins -= 10;
    
    await env.PUZZLE_KV.put(`coins_${chatId}_${userId}`, JSON.stringify(userCoins));
    await env.PUZZLE_KV.put(`game_${chatId}`, JSON.stringify(gameState));

    await answerCallbackQuery(token, queryId, `✅ حرف ${unrevealedIndex + 1} کلمه ${wordId} فاش شد.`, true);
    await updateGridMessage(token, chatId, gameState, `🔑 راهنمایی برای کلمه ${wordId} خریداری شد.`);
  }
}

// ==========================================
// توابع ارتباط با Telegram API
// ==========================================
async function sendMessage(token, chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text: text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function editMessageText(token, chatId, messageId, text, replyMarkup = null) {
  const body = { chat_id: chatId, message_id: messageId, text: text, parse_mode: "Markdown" };
  if (replyMarkup) body.reply_markup = replyMarkup;

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function answerCallbackQuery(token, queryId, text, showAlert = false) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: queryId, text: text, show_alert: showAlert })
  });
  }
    
