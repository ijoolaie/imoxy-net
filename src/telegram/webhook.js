import { createAccountService } from "../domain/account-service.js";
import { getOperatingMode } from "../domain/operating-mode.js";
import { createQuotaService } from "../domain/quota-service.js";
import { authorizeAction } from "../security/auth-service.js";
import { createD1Store } from "../storage/d1-store.js";
import { createCloudflareClient } from "../providers/cloudflare-client.js";
import { createTelegramClient } from "./telegram-client.js";

const MAX_BODY_BYTES = 16 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    }
  });
}

async function hash(value) {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function constantTimeEqual(left, right) {
  const [a, b] = await Promise.all([hash(left), hash(right)]);
  let difference = left.length ^ right.length;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

function allowedIds(value) {
  if (typeof value !== "string") return new Set();
  return new Set(value.split(",").map((item) => item.trim()).filter((item) => /^\d{1,20}$/.test(item)));
}

function truncate(text) {
  return text.length <= 3500 ? text : text.slice(0, 3480) + "\n… truncated";
}

function parseCommand(text) {
  const trimmed = text.trim();
  const [head = "", ...args] = trimmed.split(/\s+/);
  const command = head.split("@")[0].toLowerCase();
  return { command, args };
}

function safeReply(error) {
  if (error?.code === "not_found") return "That account or resource is unavailable.";
  if (error?.code === "forbidden") return "You are not allowed to perform this operation.";
  if (error?.code === "provider_not_configured" || error?.code === "provider_not_configured") return "Cloudflare access is not configured.";
  return "The request could not be completed. Check service configuration and logs.";
}

export function createTelegramWebhookHandler({
  env,
  storeFactory = (workerEnv) => createD1Store(workerEnv.DB),
  cloudflareFactory = (workerEnv) => createCloudflareClient(workerEnv),
  telegramClientFactory = (workerEnv) => createTelegramClient(workerEnv)
}) {
  return {
    async fetch(request) {
      if (request.method !== "POST") return json({ error: { code: "method_not_allowed" } }, 405);
      const expectedSecret = env?.TELEGRAM_WEBHOOK_SECRET;
      const botToken = env?.TELEGRAM_BOT_TOKEN;
      if (typeof expectedSecret !== "string" || expectedSecret.length < 32 ||
          typeof botToken !== "string" || botToken.length < 20) {
        return json({ error: { code: "dependency_unavailable", message: "Telegram webhook is not configured." } }, 503);
      }
      const providedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
      if (!(await constantTimeEqual(providedSecret, expectedSecret))) {
        return json({ error: { code: "unauthorized", message: "Webhook authentication failed." } }, 401);
      }
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > MAX_BODY_BYTES) return json({ error: { code: "payload_too_large" } }, 413);
      let update;
      try {
        const text = await request.text();
        if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return json({ error: { code: "payload_too_large" } }, 413);
        update = JSON.parse(text);
      } catch {
        return json({ error: { code: "invalid_json" } }, 400);
      }

      const message = update?.message;
      const userId = message?.from?.id;
      const chatId = message?.chat?.id;
      if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(chatId) ||
          message?.chat?.type !== "private" || !allowedIds(env.TELEGRAM_ALLOWED_USER_IDS).has(String(userId)) ||
          typeof message?.text !== "string") {
        return json({ ok: true, ignored: true });
      }

      const { command, args } = parseCommand(message.text);
      const telegram = telegramClientFactory(env);
      const send = async (text) => telegram.sendMessage(chatId, truncate(text));
      try {
        if (command === "/start" || command === "/help") {
          await send("Imoxy read-only bot\n/status — service mode\n/accounts — first 10 accounts\n/usage <account-id> — usage summary\n/cloudflare — provider inventory counts\n\nAccount mutations and provider writes are not available in this bot yet.");
          return json({ ok: true });
        }
        if (command === "/status") {
          await send(`Imoxy mode: ${getOperatingMode(env)}\nCloudflare operations are read-only; no provider writes are available.`);
          return json({ ok: true });
        }
        if (command === "/accounts" || command === "/usage") {
          if (!env.DB) {
            await send("Account storage is not configured.");
            return json({ ok: true });
          }
          const store = storeFactory(env);
          const principal = { id: `telegram:${userId}`, username: `telegram_${userId}`, role: "viewer", status: "active" };
          const authorize = async ({ action }) => authorizeAction(principal, action);
          if (command === "/accounts") {
            const accounts = createAccountService({ store, authorize });
            const result = await accounts.list({ limit: 10 });
            const lines = result.items.map((account) =>
              `${account.username} — ${account.status} — expires ${account.expiresAt ?? "never"}`
            );
            await send(lines.length ? `Accounts (${lines.length}${result.nextCursor ? "+" : ""}):\n${lines.join("\n")}` : "No accounts found.");
            return json({ ok: true });
          }
          const accountId = args[0];
          if (!accountId || accountId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(accountId)) {
            await send("Usage: /usage <account-id>");
            return json({ ok: true });
          }
          authorizeAction(principal, "usage.read");
          const quota = createQuotaService({ store });
          const result = await quota.evaluate(accountId);
          await send(`Usage for ${accountId}\nTotal: ${result.totalUsedBytes} bytes\nToday (UTC): ${result.dailyUsedBytes} bytes\nAllowed now: ${result.allowed ? "yes" : "no"}${result.reason ? ` (${result.reason})` : ""}`);
          return json({ ok: true });
        }
        if (command === "/cloudflare") {
          if (getOperatingMode(env) === "panel-only") {
            await send("Cloudflare integration is disabled in panel-only mode.");
            return json({ ok: true });
          }
          const inventory = await cloudflareFactory(env).getInventory({ zoneId: env.CLOUDFLARE_ZONE_ID });
          await send(`Cloudflare inventory (read-only)\nZones: ${inventory.zones.length}\nWorkers: ${inventory.workerScripts.length}\nKV namespaces: ${inventory.kvNamespaces.length}\nD1 databases: ${inventory.d1Databases.length}\nDNS records: ${inventory.dnsRecords.length}\nWorker routes: ${inventory.workerRoutes.length}\nNo changes were applied.`);
          return json({ ok: true });
        }
        await send("Unknown command. Use /help.");
        return json({ ok: true });
      } catch (error) {
        try { await send(safeReply(error)); } catch { return json({ error: { code: "telegram_delivery_failed" } }, 503); }
        return json({ ok: true });
      }
    }
  };
}
