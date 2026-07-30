export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      try {
        const update = await request.json();
        const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
        
        if (chatId) {
          const token = env.TELEGRAM_BOT_TOKEN;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "✅ ارتباط برقرار شد! ورکر پیام شما را دریافت کرد."
            })
          });
        }
      } catch (e) {}
    }
    return new Response("OK", { status: 200 });
  }
};
