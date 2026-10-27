import test from "node:test";
import assert from "node:assert/strict";
import { createQuotaService } from "../src/domain/quota-service.js";

function fixture({ account = {}, usage = {} } = {}) {
  const state = {
    account: {
      id: "acct-1", username: "customer_01", status: "active", expiresAt: null,
      quotaBytes: 1000, dailyQuotaBytes: 500, ...account
    },
    totalBytes: usage.totalBytes ?? 100,
    dailyBytes: usage.dailyBytes ?? 40,
    requestCount: usage.requestCount ?? 3,
    records: []
  };
  const store = {
    async getAccount(id) { return id === state.account.id ? state.account : null; },
    async getUsageSummary(accountId, usageDate) {
      return { accountId, usageDate, totalBytes: state.totalBytes, dailyBytes: state.dailyBytes, requestCount: state.requestCount };
    },
    async recordUsage(input) {
      state.records.push(input);
      state.totalBytes += input.uploadBytes + input.downloadBytes;
      state.dailyBytes += input.uploadBytes + input.downloadBytes;
      state.requestCount += input.requestCount;
    }
  };
  return { service: createQuotaService({ store, now: () => "2026-10-27T12:00:00.000Z" }), state };
}

test("quota evaluation allows usage at the exact configured boundary", async () => {
  const { service } = fixture({ account: { quotaBytes: 100, dailyQuotaBytes: 50 }, usage: { totalBytes: 90, dailyBytes: 40 } });
  const result = await service.evaluate("acct-1", { bytesToAdd: 10 });
  assert.equal(result.allowed, true);
  assert.equal(result.projectedTotalBytes, 100);
  assert.equal(result.projectedDailyBytes, 50);
  assert.equal(result.remainingTotalBytes, 10);
});

test("quota evaluation denies projected total or daily usage beyond limits", async () => {
  const { service } = fixture({ account: { quotaBytes: 100, dailyQuotaBytes: 50 }, usage: { totalBytes: 95, dailyBytes: 45 } });
  const result = await service.evaluate("acct-1", { bytesToAdd: 6 });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "total_quota_exceeded");
});

test("disabled and expired accounts are denied before quota checks", async () => {
  const disabled = fixture({ account: { status: "disabled" } });
  assert.equal((await disabled.service.evaluate("acct-1")).reason, "account_disabled");
  const expired = fixture({ account: { expiresAt: "2026-10-27T12:00:00.000Z" } });
  assert.equal((await expired.service.evaluate("acct-1")).reason, "account_expired");
});

test("null quotas mean unlimited and zero quotas deny positive projected traffic", async () => {
  const unlimited = fixture({ account: { quotaBytes: null, dailyQuotaBytes: null } });
  const result = await unlimited.service.evaluate("acct-1", { bytesToAdd: 100000 });
  assert.equal(result.allowed, true);
  assert.equal(result.remainingTotalBytes, null);
  const zero = fixture({ account: { quotaBytes: 0 }, usage: { totalBytes: 0, dailyBytes: 0 } });
  assert.equal((await zero.service.evaluate("acct-1", { bytesToAdd: 1 })).reason, "total_quota_exceeded");
});

test("usage recording persists non-negative deltas and returns the updated policy decision", async () => {
  const { service, state } = fixture({ account: { quotaBytes: 200, dailyQuotaBytes: 200 }, usage: { totalBytes: 100, dailyBytes: 100 } });
  const result = await service.record("acct-1", { uploadBytes: 40, downloadBytes: 70, requestCount: 2 });
  assert.equal(state.records.length, 1);
  assert.equal(state.records[0].usageDate, "2026-10-27");
  assert.equal(state.totalBytes, 210);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "total_quota_exceeded");
});

test("usage recording rejects a combined byte delta beyond the safe integer range before persistence", async () => {
  const { service, state } = fixture();
  await assert.rejects(() => service.record("acct-1", {
    uploadBytes: Number.MAX_SAFE_INTEGER,
    downloadBytes: 1
  }), /combined usage byte delta/);
  assert.equal(state.records.length, 0, "overflow must be rejected before storage is called");
});

test("usage evaluation rejects invalid byte deltas and missing accounts", async () => {
  const { service } = fixture();
  await assert.rejects(() => service.evaluate("acct-1", { bytesToAdd: -1 }), TypeError);
  await assert.rejects(() => service.record("acct-1", { uploadBytes: -1, downloadBytes: 0 }), TypeError);
  await assert.rejects(() => service.evaluate("missing"), (error) => error.code === "not_found");
});
