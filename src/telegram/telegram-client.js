export class TelegramProviderError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "TelegramProviderError";
    this.code = code;
    this.status = status;
  }
}

export function createTelegramClient({ TELEGRAM_BOT_TOKEN }, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof TELEGRAM_BOT_TOKEN !== "string" || TELEGRAM_BOT_TOKEN.length < 20) {
    throw new TelegramProviderError("telegram_not_configured", "Telegram bot access is not configured.", 503);
  }
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");

  return {
    async sendMessage(chatId, text) {
      if (typeof chatId !== "string" && typeof chatId !== "number") throw new TypeError("A Telegram chat ID is required.");
      if (typeof text !== "string" || !text.trim() || text.length > 4096) throw new TypeError("Telegram message text is invalid.");
      let response;
      try {
        response = await fetchImpl(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          redirect: "error",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, protect_content: true })
        });
      } catch {
        throw new TelegramProviderError("telegram_unavailable", "Telegram could not be reached.", 503);
      }
      let body;
      try { body = await response.json(); } catch {
        throw new TelegramProviderError("telegram_invalid_response", "Telegram returned an invalid response.", 502);
      }
      if (!response.ok || body?.ok !== true) {
        throw new TelegramProviderError("telegram_send_failed", "Telegram could not deliver the message.", 502);
      }
      return { messageId: body.result?.message_id ?? null };
    }
  };
}
