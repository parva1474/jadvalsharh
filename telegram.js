/**
 * ماژول ارتباط مستقیم با Telegram Bot API
 */

export class TelegramAPI {
  constructor(token) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
  }

  // ارسال درخواست کلی به ربات تلگرام
  async request(method, payload) {
    const url = `${this.apiUrl}/${method}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`Telegram API Error (${method}):`, data);
    }
    return data;
  }

  // ارسال پیام ساده یا همراه با کیبورد
  async sendMessage(chatId, text, replyMarkup = null, replyToMessageId = null) {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;

    return await this.request("sendMessage", payload);
  }

  // ویرایش متن پیام موجود
  async editMessageText(chatId, messageId, text, replyMarkup = null) {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    return await this.request("editMessageText", payload);
  }

  // حذف یک پیام از گروه یا چت
  async deleteMessage(chatId, messageId) {
    return await this.request("deleteMessage", {
      chat_id: chatId,
      message_id: messageId
    });
  }

  // پاسخ به Callback Query
  async answerCallbackQuery(callbackQueryId, text = "", showAlert = false) {
    return await this.request("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text: text,
      show_alert: showAlert
    });
  }

  // دریافت اطلاعات مدیران گروه برای بررسی دسترسی Admin
  async getChatMember(chatId, userId) {
    const res = await this.request("getChatMember", {
      chat_id: chatId,
      user_id: userId
    });
    return res.ok ? res.result : null;
  }

  // بررسی ادمین بودن کاربر
  async isAdmin(chatId, userId, globalAdminId) {
    if (String(userId) === String(globalAdminId)) return true;
    const member = await this.getChatMember(chatId, userId);
    if (!member) return false;
    return ["creator", "administrator"].includes(member.status);
  }
}
