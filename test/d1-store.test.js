import test from "node:test";
import assert from "node:assert/strict";
import { createD1Store } from "../src/storage/d1-store.js";

function makeDb({ firstRow = null, allRows = [], batchResults = [], runChanges = 1 } = {}) {
  const calls = [];
  const db = {
    calls,
    prepare(sql) {
      const call = { sql, values: [] };
      calls.push(call);
      return {
        bind(...values) {
          call.values = values;
          return this;
        },
        async first() { return firstRow; },
        async all() { return { results: allRows }; },
        async run() { return { meta: { changes: runChanges } }; }
      };
    },
    async batch(statements) {
      calls.push({ batch: statements.length });
      return batchResults.length ? batchResults : statements.map(() => ({ meta: { changes: 1 } }));
    }
  };
  return db;
}

const audit = {
  id: "audit-1",
  action: "account.created",
  createdAt: "2026-10-27T00:00:00.000Z",
  details: { source: "test" }
};

test("requires a D1-compatible database binding", () => {
  assert.throws(() => createD1Store(null), TypeError);
});

test("account reads use bound parameters and map database fields", async () => {
  const db = makeDb({ firstRow: {
    id: "acct-1", username: "customer_1", status: "active", expires_at: null,
    quota_bytes: 1000, daily_quota_bytes: null, speed_limit_kbps: null,
    max_connections: 2, notes: "", created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z"
  }});
  const store = createD1Store(db);
  const account = await store.getAccount("acct-1");
  assert.equal(account.id, "acct-1");
  assert.equal(account.quotaBytes, 1000);
  assert.equal(db.calls[0].values[0], "acct-1");
  assert.match(db.calls[0].sql, /WHERE id = \? LIMIT 1/);
});

test("account listing bounds page size and returns a cursor when more rows exist", async () => {
  const rows = Array.from({ length: 3 }, (_, index) => ({
    id: `acct-${index}`, username: `user_${index}`, status: "active",
    expires_at: null, quota_bytes: null, daily_quota_bytes: null,
    speed_limit_kbps: null, max_connections: null, notes: "",
    created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z"
  }));
  const db = makeDb({ allRows: rows });
  const result = await createD1Store(db).listAccounts({ limit: 2 });
  assert.equal(result.items.length, 2);
  assert.equal(result.nextCursor, "acct-1");
  await assert.rejects(() => createD1Store(db).listAccounts({ limit: 101 }), TypeError);
});

test("create mutation batches account insert with an audit insert", async () => {
  const db = makeDb({ firstRow: {
    id: "acct-1", username: "customer_1", status: "active", expires_at: null,
    quota_bytes: null, daily_quota_bytes: null, speed_limit_kbps: null,
    max_connections: null, notes: "", created_at: audit.createdAt, updated_at: audit.createdAt
  }});
  const store = createD1Store(db);
  const credentialRecord = {
    id: "credential-1", accountId: "acct-1", credentialHash: "a".repeat(64), createdAt: audit.createdAt
  };
  const account = await store.createAccount({
    id: "acct-1", username: "customer_1", createdAt: audit.createdAt, updatedAt: audit.createdAt
  }, audit, credentialRecord);
  assert.equal(account.id, "acct-1");
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 3 });
  assert.ok(db.calls.some((call) => call.sql?.includes("INSERT INTO proxy_credentials")));
  assert.ok(db.calls.some((call) => call.sql?.includes("INSERT INTO audit_events")));
});

test("update rejects unknown SQL fields and empty changes", async () => {
  const store = createD1Store(makeDb());
  await assert.rejects(() => store.updateAccount("acct-1", { role: "owner" }, audit), TypeError);
  await assert.rejects(() => store.updateAccount("acct-1", {}, audit), TypeError);
});

test("delete returns false when no row was deleted", async () => {
  const db = makeDb({ batchResults: [{ meta: { changes: 0 } }, { meta: { changes: 0 } }] });
  assert.equal(await createD1Store(db).deleteAccount("missing", audit), false);
});

test("mutations require an audit event", async () => {
  const store = createD1Store(makeDb());
  await assert.rejects(() => store.createAccount({ id: "acct-1", username: "x" }, null), TypeError);
});

test("usage summaries check approximate lifetime bounds before exact integer sums", async () => {
  const db = makeDb({ firstRow: {
    total_bytes_approx: 1500, daily_bytes_approx: 300, request_count_approx: 7,
    total_bytes: 1500, daily_bytes: 300, request_count: 7
  }});
  const summary = await createD1Store(db).getUsageSummary("acct-1", "2026-10-27");
  assert.equal(summary.totalBytes, 1500);
  assert.equal(summary.dailyBytes, 300);
  assert.equal(summary.requestCount, 7);
  assert.equal(db.calls.length, 2);
  assert.match(db.calls[0].sql, /SUM\(CAST\(upload_bytes AS REAL\) \+ CAST\(download_bytes AS REAL\)\)/);
  assert.deepEqual(db.calls[0].values, ["2026-10-27", "acct-1"]);
  assert.deepEqual(db.calls[1].values, ["2026-10-27", "acct-1"]);
});

test("usage summaries fail closed on lifetime aggregates beyond safe integer range", async () => {
  const db = makeDb({ firstRow: {
    total_bytes_approx: Number.MAX_SAFE_INTEGER + 1,
    daily_bytes_approx: 0,
    request_count_approx: 1
  }});
  await assert.rejects(
    () => createD1Store(db).getUsageSummary("acct-1", "2026-10-27"),
    /Usage counters exceed the supported safe-integer range/
  );
  assert.equal(db.calls.length, 1, "unsafe approximate totals must stop before exact SUM can overflow");
});

test("usage records use an atomic upsert with bounded non-negative counters", async () => {
  const db = makeDb();
  await createD1Store(db).recordUsage({
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 20,
    downloadBytes: 30, requestCount: 1, updatedAt: "2026-10-27T12:00:00.000Z"
  });
  assert.match(db.calls[0].sql, /ON CONFLICT\(account_id, usage_date\) DO UPDATE/);
  assert.match(db.calls[0].sql, /usage_daily\.upload_bytes \+ usage_daily\.download_bytes/);
  assert.match(db.calls[0].sql, /WHERE usage_daily\.upload_bytes <=/);
  assert.deepEqual(db.calls[0].values, ["acct-1", "2026-10-27", 20, 30, 1, "2026-10-27T12:00:00.000Z"]);
  await assert.rejects(() => createD1Store(db).recordUsage({
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: -1,
    downloadBytes: 0, requestCount: 1, updatedAt: "2026-10-27T12:00:00.000Z"
  }), TypeError);
  await assert.rejects(() => createD1Store(db).recordUsage({
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: Number.MAX_SAFE_INTEGER,
    downloadBytes: 1, requestCount: 1, updatedAt: "2026-10-27T12:00:00.000Z"
  }), TypeError);
  await assert.rejects(() => createD1Store(makeDb({ runChanges: 0 })).recordUsage({
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 1,
    downloadBytes: 1, requestCount: 1, updatedAt: "2026-10-27T12:00:00.000Z"
  }), /Usage counters would exceed/);
});

test("usage date validation rejects impossible calendar days", async () => {
  const store = createD1Store(makeDb());
  await assert.rejects(() => store.getUsageSummary("acct-1", "2026-02-30"), TypeError);
  await assert.rejects(() => store.recordUsage({
    accountId: "acct-1", usageDate: "2026-02-30", uploadBytes: 0,
    downloadBytes: 0, requestCount: 1, updatedAt: "2026-10-27T12:00:00.000Z"
  }), TypeError);
});

test("subscription creation batches a token-hash record with an audit event", async () => {
  const db = makeDb({ firstRow: {
    id: "sub-1", account_id: "acct-1", token_hash: "hashed-token-only",
    formats_json: '["auto"]', created_at: "2026-10-27T12:00:00.000Z",
    expires_at: null, revoked_at: null, last_accessed_at: null
  }});
  const store = createD1Store(db);
  const result = await store.createSubscription({
    id: "sub-1", accountId: "acct-1", tokenHash: "hashed-token-only",
    formats: ["auto"], createdAt: "2026-10-27T12:00:00.000Z"
  }, {
    id: "audit-sub-1", action: "subscription.created", createdAt: "2026-10-27T12:00:00.000Z"
  });
  assert.equal(result.id, "sub-1");
  assert.equal(result.tokenHash, "hashed-token-only");
  const insert = db.calls.find((call) => call.sql?.includes("INSERT INTO subscriptions"));
  assert.equal(insert.values.includes("raw-subscription-token"), false);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 2 });
});

test("subscription token lookup joins account status and parses allowed formats", async () => {
  const db = makeDb({ firstRow: {
    subscription_id: "sub-1", account_id: "acct-1", token_hash: "hash",
    formats_json: '["auto","base64"]', subscription_created_at: "2026-10-27T12:00:00.000Z",
    subscription_expires_at: null, revoked_at: null, last_accessed_at: null,
    account_username: "customer_01", account_status: "active", account_expires_at: null,
    quota_bytes: 1000, daily_quota_bytes: 500
  }});
  const result = await createD1Store(db).findSubscriptionByTokenHash("hash");
  assert.equal(result.account.status, "active");
  assert.deepEqual(result.formats, ["auto", "base64"]);
  assert.equal(db.calls[0].values[0], "hash");
});

test("subscription revocation batches state change and audit", async () => {
  const db = makeDb({ batchResults: [{ meta: { changes: 1 } }, { meta: { changes: 1 } }] });
  const result = await createD1Store(db).revokeSubscription("sub-1", "2026-10-27T12:00:00.000Z", {
    id: "audit-sub-revoke", action: "subscription.revoked", createdAt: "2026-10-27T12:00:00.000Z"
  });
  assert.equal(result, true);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 2 });
});

test("proxy credential lookup hashes only and returns the account without exposing the hash", async () => {
  const db = makeDb({ firstRow: {
    credential_id: "credential-1", id: "acct-1", username: "customer_1", status: "active",
    expires_at: null, quota_bytes: 500, daily_quota_bytes: null, speed_limit_kbps: null,
    max_connections: null, notes: "", created_at: audit.createdAt, updated_at: audit.createdAt
  }});
  const store = createD1Store(db);
  const result = await store.findAccountByCredentialHash("a".repeat(64));
  assert.equal(result.credentialId, "credential-1");
  assert.equal(result.account.id, "acct-1");
  assert.equal(result.account.quotaBytes, 500);
  assert.equal(Object.hasOwn(result.account, "credentialHash"), false);
  assert.equal(db.calls[0].values[0], "a".repeat(64));
  assert.match(db.calls[0].sql, /revoked_at IS NULL/);
  await assert.rejects(() => store.findAccountByCredentialHash("not-a-hash"), TypeError);
});

test("credential rotation revokes old credentials, inserts a new hash and audits atomically", async () => {
  const db = makeDb();
  const store = createD1Store(db);
  const credentialRecord = {
    id: "credential-2", accountId: "acct-1", credentialHash: "b".repeat(64), createdAt: audit.createdAt
  };
  const rotated = await store.rotateCredential("acct-1", credentialRecord, {
    ...audit, action: "account.credential.rotated"
  });
  assert.equal(rotated, true);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 3 });
  assert.ok(db.calls.some((call) => call.sql?.includes("UPDATE proxy_credentials SET revoked_at")));
  assert.ok(db.calls.some((call) => call.sql?.includes("INSERT INTO proxy_credentials")));
  assert.ok(db.calls.some((call) => call.sql?.includes("INSERT INTO audit_events")));
});


test("quota reservation batches stale cleanup with the conditional claim", async () => {
  const db = makeDb({ firstRow: {
    reservation_id: "reserve-1", account_id: "acct-1", usage_date: "2026-10-27",
    reserved_bytes: 12, actual_bytes: null, status: "active",
    created_at: "2026-10-27T12:00:00.000Z", lease_expires_at: "2026-10-27T12:00:30.000Z",
    updated_at: "2026-10-27T12:00:00.000Z"
  }});
  const result = await createD1Store(db).reserveQuota({
    reservationId: "reserve-1", accountId: "acct-1", usageDate: "2026-10-27",
    reservedBytes: 12, createdAt: "2026-10-27T12:00:00.000Z",
    leaseExpiresAt: "2026-10-27T12:00:30.000Z"
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 2 });
  assert.match(db.calls[0].sql, /forwarding_started_at IS NULL/);
  assert.ok(db.calls[1].sql.includes("INSERT INTO quota_reservations"));
  assert.ok(db.calls[1].sql.includes("ON CONFLICT(reservation_id) DO NOTHING"));
});

test("quota forwarding marker uses one conditional UPDATE RETURNING", async () => {
  const db = makeDb({ firstRow: { forwarding_started_at: "2026-10-27T12:00:01.000Z" } });
  const marked = await createD1Store(db).markQuotaReservationForwarding({
    reservationId: "reserve-1", accountId: "acct-1", at: "2026-10-27T12:00:01.000Z"
  });
  assert.equal(marked, true);
  assert.equal(db.calls.length, 1);
  assert.ok(db.calls[0].sql.includes("UPDATE quota_reservations"));
  assert.ok(db.calls[0].sql.includes("RETURNING forwarding_started_at"));
});

test("usage settlement batches event verification with the atomic claim and apply", async () => {
  const row = {
    producer_id: "worker-1", event_id: "event-1", reservation_id: "reserve-1",
    account_id: "acct-1", usage_date: "2026-10-27", upload_bytes: 4,
    download_bytes: 8, request_count: 1, payload_hash: "a".repeat(64), status: "applied"
  };
  const db = makeDb({ batchResults: [
    { meta: { changes: 1 } }, { meta: { changes: 1 } }, { results: [row] }
  ]});
  const result = await createD1Store(db).settleUsageEvent({
    producerId: "worker-1", eventId: "event-1", reservationId: "reserve-1",
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 4,
    downloadBytes: 8, requestCount: 1, payloadHash: "a".repeat(64),
    at: "2026-10-27T12:00:01.000Z"
  });
  assert.equal(result.applied, true);
  assert.equal(result.duplicate, false);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 3 });
  assert.equal(db.calls.length, 4, "the result SELECT must be part of the D1 batch, not a fourth round trip");
  assert.ok(db.calls[2].sql.includes("SELECT producer_id, event_id"));
  assert.ok(db.calls[2].sql.includes("FROM usage_events"));
});

test("session admission uses one parameterized conditional INSERT and verifies the resulting lease", async () => {
  const db = makeDb({ firstRow: {
    session_id: "session-1", account_id: "acct-1",
    created_at: "2026-10-27T12:00:00.000Z", expires_at: "2026-10-27T13:00:00.000Z",
    account_status: "active", account_expires_at: null
  }});
  const store = createD1Store(db);
  const result = await store.acquireProxySession({
    sessionId: "session-1", accountId: "acct-1",
    createdAt: "2026-10-27T12:00:00.000Z",
    expiresAt: "2026-10-27T13:00:00.000Z",
    at: "2026-10-27T12:00:00.000Z", maxConcurrentSessions: 4
  });
  assert.equal(result.allowed, true);
  assert.equal(db.calls.length, 3);
  assert.match(db.calls[0].sql, /DELETE FROM proxy_active_sessions/);
  assert.match(db.calls[1].sql, /INSERT INTO proxy_active_sessions[\s\S]*SELECT \?[\s\S]*a\.max_connections[\s\S]*ON CONFLICT\(session_id\) DO NOTHING/);
  assert.deepEqual(db.calls[1].values, [
    "session-1", "2026-10-27T12:00:00.000Z", "2026-10-27T13:00:00.000Z",
    "acct-1", "2026-10-27T12:00:00.000Z", "2026-10-27T12:00:00.000Z",
    "2026-10-27T12:00:00.000Z", 4
  ]);
  await assert.rejects(() => store.acquireProxySession({
    sessionId: "session-1", accountId: "acct-1",
    createdAt: "2026-10-27T12:00:00.000Z",
    expiresAt: "2026-10-27T13:00:00.000Z",
    at: "2026-10-27T12:00:00.000Z", maxConcurrentSessions: 0
  }), TypeError);
});

test("session release and cleanup are scoped, parameterized, and bounded", async () => {
  const db = makeDb({ runChanges: 1 });
  const store = createD1Store(db);
  assert.equal(await store.releaseProxySession({ sessionId: "session-1", accountId: "acct-1" }), true);
  assert.match(db.calls[0].sql, /DELETE FROM proxy_active_sessions[\s\S]*session_id = \? AND account_id = \?/);
  assert.deepEqual(db.calls[0].values, ["session-1", "acct-1"]);
  assert.equal(await store.cleanupExpiredProxySessions({
    at: "2026-10-27T12:00:00.000Z", accountId: "acct-1", limit: 20
  }), 1);
  assert.match(db.calls[1].sql, /expires_at <= \?[\s\S]*account_id = \?[\s\S]*LIMIT \?/);
  assert.deepEqual(db.calls[1].values, ["2026-10-27T12:00:00.000Z", "acct-1", 20]);
  await assert.rejects(() => store.cleanupExpiredProxySessions({
    at: "2026-10-27T12:00:00.000Z", limit: 1001
  }), TypeError);
});
