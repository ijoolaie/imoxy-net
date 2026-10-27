import test from "node:test";
import assert from "node:assert/strict";
import { createSubscriptionService } from "../src/domain/subscription-service.js";

function fixture({ account = {}, entries = ["vless://example.test:443?security=tls", "trojan://example.test:443"], nodes = [{ protocol: "vless", uuid: "123e4567-e89b-42d3-a456-426614174000", server: "edge.example.com", port: 443, name: "node", security: "tls" }] } = {}) {
  const state = {
    account: {
      id: "acct-1", username: "customer_01", status: "active",
      expiresAt: "2026-12-01T00:00:00.000Z", quotaBytes: 1000, dailyQuotaBytes: 500, ...account
    },
    subscriptions: new Map(),
    audits: [],
    clock: "2026-10-27T12:00:00.000Z",
    counter: 0
  };
  const store = {
    async getAccount(id) { return id === state.account.id ? state.account : null; },
    async listSubscriptions(accountId) {
      return [...state.subscriptions.values()].filter((item) => item.accountId === accountId);
    },
    async getSubscriptionById(id) { return state.subscriptions.get(id) ?? null; },
    async createSubscription(subscription, audit) {
      state.subscriptions.set(subscription.id, { ...subscription });
      state.audits.push(audit);
      return state.subscriptions.get(subscription.id);
    },
    async findSubscriptionByTokenHash(tokenHash) {
      const item = [...state.subscriptions.values()].find((entry) => entry.tokenHash === tokenHash);
      return item ? { ...item, account: state.account } : null;
    },
    async touchSubscription(id, timestamp) {
      const item = state.subscriptions.get(id);
      if (item) item.lastAccessedAt = timestamp;
    },
    async revokeSubscription(id, timestamp, audit) {
      const item = state.subscriptions.get(id);
      if (!item || item.revokedAt) return false;
      item.revokedAt = timestamp;
      state.audits.push(audit);
      return true;
    }
  };
  const service = createSubscriptionService({
    store,
    authorize: async () => ({ id: "owner-1", role: "owner", status: "active" }),
    getEntries: async () => entries,
    getNodes: async () => nodes,
    idFactory: () => `generated-${++state.counter}`,
    now: () => state.clock
  });
  return { service, store, state };
}

test("subscription creation returns the raw token once and stores only its hash", async () => {
  const { service, state } = fixture();
  const created = await service.create("acct-1", { formats: ["auto", "base64"], expiresAt: "2027-01-01T00:00:00Z" });
  assert.ok(created.token.length >= 40);
  assert.deepEqual(created.formats, ["auto", "base64"]);
  assert.equal(created.expiresAt, "2026-12-01T00:00:00.000Z");
  const stored = state.subscriptions.get(created.id);
  assert.notEqual(stored.tokenHash, created.token);
  assert.equal("token" in stored, false);
  assert.equal(state.audits[0].action, "subscription.created");
});

test("subscription creation rejects unsupported formats and inactive accounts", async () => {
  const { service } = fixture();
  await assert.rejects(() => service.create("acct-1", { formats: ["unknown"] }),
    (error) => error.code === "validation_failed");
  const inactive = fixture({ account: { status: "disabled" } });
  await assert.rejects(() => inactive.service.create("acct-1"),
    (error) => error.code === "account_inactive");
});

test("subscription listing omits token hashes and raw tokens", async () => {
  const { service } = fixture();
  const created = await service.create("acct-1");
  const list = await service.list("acct-1");
  assert.equal(list.length, 1);
  assert.equal(list[0].id, created.id);
  assert.equal("token" in list[0], false);
  assert.equal("tokenHash" in list[0], false);
});

test("subscription revoke is idempotent", async () => {
  const { service } = fixture();
  const created = await service.create("acct-1");
  assert.deepEqual(await service.revoke(created.id), { id: created.id, revoked: true, alreadyRevoked: false });
  assert.deepEqual(await service.revoke(created.id), { id: created.id, revoked: true, alreadyRevoked: true });
});

test("auto and base64 subscription responses render the same entries", async () => {
  const { service } = fixture();
  const created = await service.create("acct-1", { formats: ["auto", "base64"] });
  const auto = await service.serve(created.token, "auto");
  const encoded = await service.serve(created.token, "base64");
  assert.equal(auto.body, "vless://example.test:443?security=tls\ntrojan://example.test:443\n");
  assert.equal(Buffer.from(encoded.body, "base64").toString("utf8"), auto.body);
});

test("revoked, expired and unsupported subscription links fail closed", async () => {
  const revokedFixture = fixture();
  const revoked = await revokedFixture.service.create("acct-1");
  await revokedFixture.service.revoke(revoked.id);
  await assert.rejects(() => revokedFixture.service.serve(revoked.token), (error) => error.status === 404);

  const expiredFixture = fixture();
  const expired = await expiredFixture.service.create("acct-1", { expiresAt: "2026-10-27T13:00:00Z" });
  expiredFixture.state.clock = "2026-10-27T13:00:00.000Z";
  await assert.rejects(() => expiredFixture.service.serve(expired.token), (error) => error.status === 404);

  const formatFixture = fixture();
  const autoOnly = await formatFixture.service.create("acct-1");
  await assert.rejects(() => formatFixture.service.serve(autoOnly.token, "base64"), (error) => error.status === 406);
});

test("Clash format uses the structured node renderer", async () => {
  const { service } = fixture();
  const created = await service.create("acct-1", { formats: ["clash"] });
  const result = await service.serve(created.token, "clash");
  assert.equal(result.format, "clash");
  assert.match(result.body, /type: vless/);
  assert.match(result.body, /MATCH,Proxy/);
});
