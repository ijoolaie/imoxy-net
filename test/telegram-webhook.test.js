import test from "node:test";
import assert from "node:assert/strict";
import { createTelegramWebhookHandler } from "../src/integrations/telegram-webhook.js";

const secret = "test-webhook-secret-that-is-long-enough-123456";
const token = "123456789:telegram-bot-test-token";
const update = (text = "/help", userId = 12345) => ({
  update_id: 1,
  message: { message_id: 1, from: { id: userId }, chat: { id: userId, type: "private" }, text }
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
const env = {
  TELEGRAM_WEBHOOK_SECRET: secret,
  TELEGRAM_BOT_TOKEN: token,
  TELEGRAM_ALLOWED_USER_IDS: "12345, 67890",
  IMOXY_MODE: "panel-only",
  DB: {}
};

function fixture({ storeFactory, fetchImpl } = {}) {
  const calls = [];
  const handler = createTelegramWebhookHandler({
    storeFactory: storeFactory ?? (() => ({
      async listAccounts() {
        return { items: [{ username: "alpha", status: "active" }, { username: "beta", status: "disabled" }], nextCursor: null };
      }
    })),
    fetchImpl: fetchImpl ?? (async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    })
  });
  return { handler, calls };
}

test("rejects non-POST methods", async () => {
  const { handler } = fixture();
  const response = await handler.fetch(request(null, { method: "GET" }), env);
  assert.equal(response.status, 405);
});

test("rejects an invalid webhook secret without contacting Telegram", async () => {
  const { handler, calls } = fixture();
  const response = await handler.fetch(request(update(), { providedSecret: "wrong" }), env);
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("ignores non-allowlisted users without sending a Telegram message", async () => {
  const { handler, calls } = fixture();
  const response = await handler.fetch(request(update("/status", 99999)), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 0);
});

test("answers /status only for allowlisted users", async () => {
  const { handler, calls } = fixture();
  const response = await handler.fetch(request(update("/status")), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.text, /panel-only/);
  assert.match(calls[0].url, /sendMessage$/);
});

test("uses the shared account service and viewer authorization for /accounts", async () => {
  const { handler, calls } = fixture();
  const response = await handler.fetch(request(update("/accounts")), env);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].body.text, /alpha — active/);
  assert.match(calls[0].body.text, /beta — disabled/);
  assert.doesNotMatch(calls[0].body.text, /credential|token/i);
});

test("rejects oversized and non-JSON updates", async () => {
  const { handler } = fixture();
  const oversized = await handler.fetch(request("x".repeat(17 * 1024)), env);
  assert.equal(oversized.status, 413);
  const nonJson = await handler.fetch(request("not-json", { contentType: "text/plain" }), env);
  assert.equal(nonJson.status, 415);
});

test("returns a generic failure if Telegram delivery fails", async () => {
  const { handler } = fixture({ fetchImpl: async () => new Response("private provider detail", { status: 500 }) });
  const response = await handler.fetch(request(update("/help")), env);
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: "integration_failed" });
});
