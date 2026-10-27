import { createAccountService } from "../domain/account-service.js";
import { getOperatingMode } from "../domain/operating-mode.js";
import { authorizeAction } from "../security/auth-service.js";
import { createD1Store } from "../storage/d1-store.js";

const MAX_BODY_BYTES = 16 * 1024;
const MAX_TELEGRAM_MESSAGE = 4096;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function equalSecret(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const a = new TextEncoder().encode(actual);
  const b = new TextEncoder().encode(expected);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0;
}

function allowedIds(env) {
  return new Set(
    String(env.TELEGRAM_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^\d{1,20}$/.test(value))
  );
}

function telegramUserId(update) {
  const value = update?.message?.from?.id;
  return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
}

function telegramChatId(update) {
  const value = update?.message?.chat?.id;
  return Number.isSafeInteger(value) ? String(value) : null;
}

async function claimUpdate(db, updateId) {
  if (!db || typeof db.prepare !== "function") {
    throw new Error("Telegram replay protection storage is not configured.");
  }
  await db.prepare(
    "DELETE FROM telegram_webhook_updates WHERE received_at < datetime('now', '-7 days')"
  ).run();
  const result = await db.prepare(
    "INSERT INTO telegram_webhook_updates (update_id, status, received_at, processed_at) " +
    "VALUES (?, 'processing', datetime('now'), NULL) " +
    "ON CONFLICT(update_id) DO UPDATE SET status = 'processing', received_at = datetime('now'), processed_at = NULL " +
    "WHERE telegram_webhook_updates.status = 'processing' " +
    "AND telegram_webhook_updates.received_at < datetime('now', '-2 minutes')"
  ).bind(String(updateId)).run();
  const changes = result?.meta?.changes;
  if (!Number.isInteger(changes)) {
    throw new Error("Telegram replay protection storage returned an invalid result.");
  }
  return changes === 1;
}

async function markUpdateProcessed(db, updateId) {
  await db.prepare(
    "UPDATE telegram_webhook_updates SET status = 'processed', processed_at = datetime('now') WHERE update_id = ?"
  ).bind(String(updateId)).run();
}

async function releaseUpdateClaim(db, updateId) {
  await db.prepare(
    "DELETE FROM telegram_webhook_updates WHERE update_id = ? AND status = 'processing'"
  ).bind(String(updateId)).run();
}

function commandName(text) {
  if (typeof text !== "string" || text.length > 4096) return null;
  const first = text.trim().split(/\s+/, 1)[0] ?? "";
  const match = /^\/(start|help|status|accounts)(?:@([A-Za-z0-9_]{5,32}))?$/.exec(first);
  return match ? match[1] : null;
}

async function sendMessage(token, chatId, text, fetchImpl) {
  const safeText = String(text).slice(0, MAX_TELEGRAM_MESSAGE);
  const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: safeText, disable_web_page_preview: true })
  });
  if (!response.ok) throw new Error("Telegram delivery failed.");
  let body;
  try { body = await response.json(); } catch { throw new Error("Telegram delivery failed."); }
  if (body?.ok !== true) throw new Error("Telegram delivery failed.");
}

export function createTelegramWebhookHandler({
  storeFactory = (env) => createD1Store(env.DB),
  fetchImpl = (...args) => fetch(...args)
} = {}) {
  return {
    async fetch(request, env = {}) {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET;
      const botToken = env.TELEGRAM_BOT_TOKEN;
      if (typeof expectedSecret !== "string" || expectedSecret.length < 32 ||
          typeof botToken !== "string" || botToken.length < 20) {
        return json({ error: "integration_not_configured" }, 503);
      }
      if (!equalSecret(request.headers.get("x-telegram-bot-api-secret-token"), expectedSecret)) {
        return json({ error: "unauthorized" }, 401);
      }

      const contentType = request.headers.get("content-type") ?? "";
      if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
        return json({ error: "unsupported_media_type" }, 415);
      }
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return json({ error: "payload_too_large" }, 413);
      }
      let update;
      try { update = JSON.parse(raw); } catch { return json({ error: "invalid_json" }, 400); }
      if (!update || typeof update !== "object" || Array.isArray(update)) {
        return json({ error: "invalid_update" }, 400);
      }

      const chatId = telegramChatId(update);
      const userId = telegramUserId(update);
      const command = commandName(update?.message?.text);
      if (!chatId || !userId || !command) return json({ ok: true, ignored: true });
      if (!allowedIds(env).has(userId)) return json({ ok: true, ignored: true });
      if (!Number.isSafeInteger(update.update_id) || update.update_id < 0) {
        return json({ error: "invalid_update" }, 400);
      }

      let claimed = false;
      let delivered = false;
      try {
        claimed = await claimUpdate(env.DB, update.update_id);
        if (!claimed) return json({ ok: true, duplicate: true });
        let message;
        if (command === "start" || command === "help") {
          message = "imoxy.net read-only operations bot\nCommands: /status, /accounts\nOnly configured Telegram user IDs are authorized. Account changes are not available in this bot yet.";
        } else if (command === "status") {
          const mode = getOperatingMode(env);
          message = `imoxy.net API is responding. Operating mode: ${mode}. Cloudflare changes: disabled (read-only preview only).`;
        } else {
          if (!env.DB) return json({ error: "dependency_unavailable" }, 503);
          const store = storeFactory(env);
          const principal = {
            id: `telegram-readonly:${userId}`,
            username: `telegram_${userId}`,
            role: "viewer",
            status: "active"
          };
          const accounts = createAccountService({
            store,
            authorize: async ({ action }) => authorizeAction(principal, action)
          });
          const result = await accounts.list({ limit: 20 });
          const items = Array.isArray(result?.items) ? result.items : [];
          message = items.length
            ? `Accounts (first ${items.length}):\n` + items.map((item) => `• ${item.username} — ${item.status}`).join("\n")
            : "No accounts found.";
          if (result?.nextCursor) message += "\nShowing the first page only.";
        }
        await sendMessage(botToken, chatId, message, fetchImpl);
        delivered = true;
        try {
          await markUpdateProcessed(env.DB, update.update_id);
        } catch {
          // The durable claim remains present; replay is still suppressed after successful delivery.
        }
        return json({ ok: true });
      } catch {
        if (claimed && !delivered) {
          try { await releaseUpdateClaim(env.DB, update.update_id); } catch { /* retain generic error */ }
        }
        // Avoid returning provider, database or token details to Telegram or the webhook caller.
        return json({ error: "integration_failed" }, 502);
      }
    }
  };
}
