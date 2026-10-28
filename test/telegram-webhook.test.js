import test from "node:test";
import assert from "node:assert/strict";
import { createTelegramWebhookHandler } from "../src/integrations/telegram-webhook.js";

const secret = "test-webhook-secret-that-is-long-enough-123456";
const token = "123456789:telegram-bot-test-token";
const update = (text = "/help", userId = 12345, chatType = "private") => ({
  update_id: 1,
  message: { message_id: 1, from: { id: userId }, chat: { id: chatType === "private" ? userId : -1001234567890, type: chatType }, text }
});
const request = (body, { method = "POST", providedSecret = secret, contentType = "application/json" } = {}) =>
  new Request("https://imoxy.test/api/v1/integrations/telegram/webhook", {
    method,
    headers: {
      "content-type": contentType,
      "x-telegram-bot-api-secret-token": providedSecret ?? ""
    },
    body: method === "GET" ? undefined : typeof body === "string" ? body : JSON.stringify(body)
  });
function makeD1Mock() {
  const updates = new Map();
  return {
    updates,
    prepare(sql) {
      return {
        args: [],
        bind(...args) { this.args = args; return this; },
        async run() {
          const id = this.args[0] == null ? null : String(this.args[0]);
          if (sql.startsWith("DELETE FROM telegram_webhook_updates WHERE received_at")) {
            return { meta: { changes: 0 } };
          }
          if (sql.startsWith("INSERT INTO telegram_webhook_updates")) {
            if (updates.has(id)) return { meta: { changes: 0 } };
            updates.set(id, "processing");
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("UPDATE telegram_webhook_updates")) {
            if (updates.has(id)) updates.set(id, "processed");
            return { meta: { changes: updates.has(id) ? 1 : 0 } };
          }
          if (sql.startsWith("DELETE FROM telegram_webhook_updates WHERE update_id")) {
            const changed = updates.get(id) === "processing";
            if (changed) updates.delete(id);
            return { meta: { changes: changed ? 1 : 0 } };
          }
          throw new Error("Unexpected SQL in test D1 mock.");
        }
      };
    }
  };
}

function fixture({ storeFactory, fetchImpl } = {}) {
  const calls = [];
  const db = makeD1Mock();
  const env = {
    TELEGRAM_WEBHOOK_SECRET: secret,
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_ALLOWED_USER_IDS: "12345, 67890",
    IMOXY_MODE: "panel-only",
    DB: db
  };
  const handler = createTelegramWebhookHandler({
    storeFactory: storeFactory ?? (() => ({
      async getAccount() { return null; },
      async listAccounts() {
        return { items: [{ username: "alpha", status: "active" }, { username: "beta", status: "disabled" }], nextCursor: null };
      },
      async createAccount() { throw new Error("not used"); },
      async rotateCredential() { throw new Error("not used"); },
      async updateAccount() { throw new Error("not used"); },
      async deleteAccount() { throw new Error("not used"); }
    })),
    fetchImpl: fetchImpl ?? (async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    })
  });
  return { handler, calls, env, db };
}

test("rejects non-POST methods", async () => {
  const { handler, env } = fixture();
  const response = await handler.fetch(request(null, { method: "GET" }), env);
  assert.equal(response.status, 405);
});

test("rejects an invalid webhook secret without contacting Telegram", async () => {
  const { handler, calls, env } = fixture();
  const response = await handler.fetch(request(update(), { providedSecret: "wrong" }), env);
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("ignores non-allowlisted users without sending a Telegram message", async () => {
  const { handler, calls, env } = fixture();
  const response = await handler.fetch(request(update("/status", 99999)), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 0);
});

test("ignores commands in group chats even when the sender is allowlisted", async () => {
  const { handler, calls, env, db } = fixture();
  const response = await handler.fetch(request(update("/accounts", 12345, "supergroup")), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, ignored: true });
  assert.equal(calls.length, 0, "group chat must not receive account metadata");
  assert.equal(db.updates.size, 0, "ignored group commands must not claim a replay ID");
});

test("answers /status only for allowlisted users", async () => {
  const { handler, calls, env } = fixture();
  const response = await handler.fetch(request(update("/status")), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.text, /panel-only/);
  assert.match(calls[0].url, /sendMessage$/);
});

test("uses the shared account service and viewer authorization for /accounts", async () => {
  const { handler, calls, env } = fixture();
  const response = await handler.fetch(request(update("/accounts")), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.text, /alpha — active/);
  assert.match(calls[0].body.text, /beta — disabled/);
  assert.doesNotMatch(calls[0].body.text, /credential|token/i);
});

test("rejects oversized and non-JSON updates", async () => {
  const { handler, env } = fixture();
  const oversized = await handler.fetch(request("x".repeat(17 * 1024)), env);
  assert.equal(oversized.status, 413);
  const nonJson = await handler.fetch(request("not-json", { contentType: "text/plain" }), env);
  assert.equal(nonJson.status, 415);
});

test("returns a generic failure if Telegram delivery fails", async () => {
  const { handler, env } = fixture({ fetchImpl: async () => new Response("private provider detail", { status: 500 }) });
  const response = await handler.fetch(request(update("/help")), env);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "integration_failed" });
});

test("suppresses duplicate update IDs after successful delivery", async () => {
  const { handler, calls, env, db } = fixture();
  const body = update("/status");
  const first = await handler.fetch(request(body), env);
  const replay = await handler.fetch(request(body), env);
  assert.equal(first.status, 200);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ok: true, duplicate: true });
  assert.equal(calls.length, 1);
  assert.equal(db.updates.get("1"), "processed");
});

test("releases a pending update claim when delivery fails so Telegram can retry", async () => {
  let fail = true;
  const { handler, calls, env, db } = fixture({
    fetchImpl: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      if (fail) return new Response("temporary failure", { status: 500 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  });
  const body = update("/help");
  const first = await handler.fetch(request(body), env);
  assert.equal(first.status, 502);
  assert.equal(db.updates.has("1"), false);
  fail = false;
  const retry = await handler.fetch(request(body), env);
  assert.equal(retry.status, 200);
  assert.equal(calls.length, 2);
});
