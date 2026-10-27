import test from "node:test";
import assert from "node:assert/strict";
import { createApiHandler } from "../src/http/api.js";
import { createTelegramWebhookHandler } from "../src/integrations/telegram-webhook.js";

const token = "valid-session-token-for-cross-interface-contracts";
const secret = "cross-interface-webhook-secret-at-least-32-chars";
const accountRows = [
  { id: "acct-a", username: "alpha", status: "active", expiresAt: null, quotaBytes: 1024, dailyQuotaBytes: null },
  { id: "acct-b", username: "beta", status: "disabled", expiresAt: null, quotaBytes: null, dailyQuotaBytes: null }
];

function makeStore() {
  return {
    async getAccount(id) { return accountRows.find((row) => row.id === id) ?? null; },
    async listAccounts({ limit = 50 } = {}) {
      return { items: accountRows.slice(0, limit), nextCursor: null };
    },
    async createAccount() { throw new Error("not used"); },
    async updateAccount() { throw new Error("not used"); },
    async deleteAccount() { throw new Error("not used"); }
  };
}

test("API and Telegram read-only listing expose the same account identities and statuses", async () => {
  const store = makeStore();
  const sentMessages = [];
  const auth = {
    async resolveSession(value) {
      assert.equal(value, token);
      return {
        id: "principal-viewer",
        username: "viewer_01",
        role: "viewer",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      };
    }
  };
  const telegram = createTelegramWebhookHandler({
    storeFactory: () => store,
    fetchImpl: async (_url, init) => {
      sentMessages.push(JSON.parse(init.body).text);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  });
  const api = createApiHandler({
    storeFactory: () => store,
    authFactory: () => auth,
    telegramFactory: () => telegram
  });

  const apiResponse = await api.fetch(new Request("https://imoxy.test/api/v1/accounts?limit=20", {
    headers: { authorization: `Bearer ${token}` }
  }), { DB: {}, IMOXY_MODE: "panel-only" });
  assert.equal(apiResponse.status, 200);
  const apiBody = await apiResponse.json();
  assert.deepEqual(apiBody.items.map((row) => [row.username, row.status]), [
    ["alpha", "active"],
    ["beta", "disabled"]
  ]);

  const webhookResponse = await api.fetch(new Request("https://imoxy.test/api/v1/integrations/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret
    },
    body: JSON.stringify({
      update_id: 77,
      message: { from: { id: 12345 }, chat: { id: 12345 }, text: "/accounts" }
    })
  }), {
    DB: {},
    TELEGRAM_WEBHOOK_SECRET: secret,
    TELEGRAM_BOT_TOKEN: "123456789:fake-token-used-only-in-tests",
    TELEGRAM_ALLOWED_USER_IDS: "12345",
    IMOXY_MODE: "panel-only"
  });
  assert.equal(webhookResponse.status, 200);
  assert.equal(sentMessages.length, 1);
  for (const row of apiBody.items) {
    assert.ok(sentMessages[0].includes(`${row.username} — ${row.status}`));
  }
  assert.doesNotMatch(sentMessages[0], /quotaBytes|credential_secret_ref|token_hash/i);
});

test("API capability reporting distinguishes initial client slices from incomplete full workflows", async () => {
  const api = createApiHandler();
  const response = await api.fetch(new Request("https://imoxy.test/api/v1/capabilities"), {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.implemented.includes("web-panel-initial-slice"));
  assert.ok(body.implemented.includes("telegram-read-only-webhook"));
  assert.ok(body.implemented.includes("android-client-initial-slice"));
  assert.ok(body.pending.includes("web-panel-completion"));
  assert.ok(body.pending.includes("telegram-bot-full-workflows"));
  assert.ok(body.pending.includes("android-client-completion"));
});
