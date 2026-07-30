  // اگر پیام با / شروع بشه (دستور تلگرام)
  if (text.startsWith("/")) {
    // جابه‌جایی و پاک کردن هر نوع آیدی ربات (چه /new چه /new@anything باشد، تبدیل به /new می‌شود)
    const rawCommand = text.split(" ")[0].toLowerCase();
    const command = rawCommand.split("@")[0]; // 👈 فقط بخش قبل از @ رو برمی‌داره!

    switch (command) {
      case "/start":
        await telegram.sendMessage(chatId, "سلام! به ربات جدول کلمات متقاطع خوش آمدید.\nبرای ایجاد جدول در گروه از دستور /new استفاده کنید.");
        break;

      case "/new":
        await handleNewPuzzleCommand(chatId, userId, telegram, storage, env);
        break;

      case "/rank":
        await handleRankCommand(chatId, telegram, storage);
        break;

      case "/stats":
        await handleStatsCommand(chatId, telegram, storage);
        break;

      case "/cancel":
        await handleCancelCommand(chatId, userId, telegram, storage);
        break;

      default:
        break;
    }
    return;
  }
