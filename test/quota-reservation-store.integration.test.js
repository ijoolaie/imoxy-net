import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createD1Store } from "../src/storage/d1-store.js";
import { createQuotaReservationService } from "../src/domain/quota-reservation-service.js";

const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
const timestamp = "2026-10-27T12:00:00.000Z";

function sqliteD1(db) {
  return {
    prepare(sql) {
      let values = [];
      const statement = {
        sql,
        bind(...args) { values = args; return this; },
        async first() { return db.prepare(sql).get(...values) ?? null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() {
          const result = db.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes) } };
        }
      };
      return statement;
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  };
}

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const file of [
    "0001_initial.sql", "0002_auth_rate_limits.sql", "0003_telegram_webhook_updates.sql",
    "0004_usage_daily_safe_integer_guards.sql", "0005_proxy_credentials.sql",
    "0006_atomic_quota_reservations.sql", "0007_proxy_active_sessions.sql", "0008_quota_reservation_recovery.sql"
  ]) db.exec(migration(file));
  const d1 = sqliteD1(db);
  const store = createD1Store(d1);
  const service = createQuotaReservationService({ store, now: () => timestamp, leaseDurationMs: 30_000 });
  return { db, d1, store, service };
}

function createAccount(db, { id = "acct-1", quotaBytes = 100, dailyQuotaBytes = 50, maxConnections = null } = {}) {
  db.prepare(`INSERT INTO proxy_accounts
    (id, username, status, quota_bytes, daily_quota_bytes, max_connections, created_at, updated_at)
    VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`).run(
    id, `user_${id.replace(/[^a-z0-9]/gi, "")}`, quotaBytes, dailyQuotaBytes, maxConnections, timestamp, timestamp
  );
}

test("D1 adapter SQL reserves quota atomically, settles once, and rejects replay conflicts", async () => {
  const { db, service } = fixture();
  createAccount(db);
  const first = await service.reserve({ reservationId: "reserve-1", accountId: "acct-1", reservedBytes: 40 });
  assert.equal(first.allowed, true);
  const overDaily = await service.reserve({ reservationId: "reserve-2", accountId: "acct-1", reservedBytes: 20 });
  assert.equal(overDaily.allowed, false);

  const event = {
    producerId: "worker-1", eventId: "event-1", reservationId: "reserve-1",
    accountId: "acct-1", usageDate: first.reservation.usageDate,
    uploadBytes: 20, downloadBytes: 10, requestCount: 1, at: timestamp
  };
  assert.equal(await service.markForwarding({ reservationId: "reserve-1", accountId: "acct-1" }), true);
  const applied = await service.settle(event);
  assert.equal(applied.applied, true);
  assert.equal(applied.duplicate, false);
  const replay = await service.settle(event);
  assert.equal(replay.applied, true);
  assert.equal(replay.duplicate, true);

  const usage = db.prepare("SELECT upload_bytes, download_bytes, request_count FROM usage_daily WHERE account_id = ?")
    .get("acct-1");
  assert.deepEqual({ ...usage }, { upload_bytes: 20, download_bytes: 10, request_count: 1 });
  assert.equal(db.prepare("SELECT status FROM quota_reservations WHERE reservation_id = ?").get("reserve-1").status, "settled");

  await assert.rejects(() => service.settle({ ...event, uploadBytes: 21, downloadBytes: 9 }),
    (error) => error.code === "usage_event_conflict" && error.status === 409);

  const next = await service.reserve({ reservationId: "reserve-3", accountId: "acct-1", reservedBytes: 20 });
  assert.equal(next.allowed, true, "only actual bytes, not the unused 10-byte allowance, remain charged");
  assert.equal(await service.release({ reservationId: "reserve-3", accountId: "acct-1" }), true);
  const afterRelease = await service.reserve({ reservationId: "reserve-4", accountId: "acct-1", reservedBytes: 20 });
  assert.equal(afterRelease.allowed, true);
  db.close();
});

test("concurrent reservations cannot jointly exceed a daily quota", async () => {
  const { db, service } = fixture();
  createAccount(db, { quotaBytes: 1000, dailyQuotaBytes: 50 });
  const results = await Promise.all([
    service.reserve({ reservationId: "race-1", accountId: "acct-1", reservedBytes: 30 }),
    service.reserve({ reservationId: "race-2", accountId: "acct-1", reservedBytes: 30 })
  ]);
  assert.equal(results.filter((result) => result.allowed).length, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM quota_reservations WHERE status = 'active'").get().n, 1);
  db.close();
});

test("aggregate overflow rolls back event claim and keeps the reservation fail-closed", async () => {
  const { db, service } = fixture();
  createAccount(db, { quotaBytes: null, dailyQuotaBytes: null });
  db.prepare(`INSERT INTO usage_daily
    (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
    VALUES (?, ?, ?, 0, 1, ?)`).run("acct-1", "2026-10-27", Number.MAX_SAFE_INTEGER, timestamp);
  const reservation = await service.reserve({ reservationId: "overflow-reserve", accountId: "acct-1", reservedBytes: 1 });
  await service.markForwarding({ reservationId: "overflow-reserve", accountId: "acct-1" });
  assert.equal(reservation.allowed, true);

  await assert.rejects(() => service.settle({
    producerId: "worker-1", eventId: "overflow-event", reservationId: "overflow-reserve",
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 1, downloadBytes: 0,
    requestCount: 1, at: timestamp
  }), /usage aggregate exceeds safe-integer range/);

  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM usage_events WHERE event_id = ?").get("overflow-event").n, 0);
  assert.equal(db.prepare("SELECT status FROM quota_reservations WHERE reservation_id = ?").get("overflow-reserve").status, "active");
  assert.equal(db.prepare("SELECT upload_bytes FROM usage_daily WHERE account_id = ?").get("acct-1").upload_bytes, Number.MAX_SAFE_INTEGER);
  db.close();
});


test("D1 session leases enforce per-account and installation-wide caps and release idempotently", async () => {
  const { db, store } = fixture();
  createAccount(db, { id: "acct-1", maxConnections: 2 });
  createAccount(db, { id: "acct-2", maxConnections: null });
  const lease = (sessionId, accountId, at = timestamp) => ({
    sessionId, accountId, createdAt: timestamp,
    expiresAt: "2026-10-27T13:00:00.000Z", at, maxConcurrentSessions: 3
  });

  assert.equal((await store.acquireProxySession(lease("s1", "acct-1"))).allowed, true);
  assert.equal((await store.acquireProxySession(lease("s2", "acct-1"))).allowed, true);
  const accountFull = await store.acquireProxySession(lease("s3", "acct-1"));
  assert.equal(accountFull.allowed, false);
  assert.equal(accountFull.conflict, false);

  assert.equal((await store.acquireProxySession(lease("s4", "acct-2"))).allowed, true);
  const installationFull = await store.acquireProxySession(lease("s5", "acct-2"));
  assert.equal(installationFull.allowed, false);

  assert.equal(await store.releaseProxySession({ sessionId: "s1", accountId: "acct-1" }), true);
  assert.equal(await store.releaseProxySession({ sessionId: "s1", accountId: "acct-1" }), false);
  assert.equal((await store.acquireProxySession(lease("s6", "acct-1"))).allowed, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions").get().n, 3);
  db.close();
});

test("D1 session lease admission handles NULL/zero caps, account state, duplicates and conflicts", async () => {
  const { db, store } = fixture();
  createAccount(db, { id: "unlimited", maxConnections: null });
  createAccount(db, { id: "zero-cap", maxConnections: 0 });
  createAccount(db, { id: "disabled", maxConnections: 2 });
  createAccount(db, { id: "expired", maxConnections: 2 });
  db.prepare("UPDATE proxy_accounts SET status = 'disabled' WHERE id = ?").run("disabled");
  db.prepare("UPDATE proxy_accounts SET expires_at = ? WHERE id = ?").run("2026-10-27T11:59:00.000Z", "expired");
  const lease = (sessionId, accountId, overrides = {}) => ({
    sessionId, accountId, createdAt: timestamp,
    expiresAt: "2026-10-27T13:00:00.000Z", at: timestamp, maxConcurrentSessions: 5, ...overrides
  });

  const first = await store.acquireProxySession(lease("same", "unlimited"));
  assert.equal(first.allowed, true);
  const duplicate = await store.acquireProxySession(lease("same", "unlimited"));
  assert.equal(duplicate.allowed, true);
  assert.equal(duplicate.duplicate, true);
  const conflict = await store.acquireProxySession(lease("same", "zero-cap"));
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.conflict, true);
  assert.equal((await store.acquireProxySession(lease("zero", "zero-cap"))).allowed, false);
  assert.equal((await store.acquireProxySession(lease("disabled-session", "disabled"))).allowed, false);
  assert.equal((await store.acquireProxySession(lease("expired-session", "expired"))).allowed, false);
  db.close();
});

test("D1 session admission excludes expired leases and cleanup is bounded", async () => {
  const { db, store } = fixture();
  createAccount(db, { id: "acct-1", maxConnections: 1 });
  const original = {
    sessionId: "expired-lease", accountId: "acct-1", createdAt: timestamp,
    expiresAt: "2026-10-27T12:01:00.000Z", at: timestamp, maxConcurrentSessions: 2
  };
  assert.equal((await store.acquireProxySession(original)).allowed, true);
  const later = {
    sessionId: "replacement", accountId: "acct-1", createdAt: "2026-10-27T12:02:00.000Z",
    expiresAt: "2026-10-27T13:02:00.000Z", at: "2026-10-27T12:02:00.000Z", maxConcurrentSessions: 2
  };
  assert.equal((await store.acquireProxySession(later)).allowed, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions").get().n, 1,
    "admission should opportunistically remove the expired lease before inserting the replacement");

  db.prepare(`INSERT INTO proxy_active_sessions (session_id, account_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)`).run("stale-2", "acct-1", "2026-10-27T10:00:00.000Z", "2026-10-27T10:01:00.000Z");
  db.prepare(`INSERT INTO proxy_active_sessions (session_id, account_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)`).run("stale-3", "acct-1", "2026-10-27T10:02:00.000Z", "2026-10-27T10:03:00.000Z");
  assert.equal(await store.cleanupExpiredProxySessions({ at: later.at, accountId: "acct-1", limit: 1 }), 1);
  assert.equal(await store.cleanupExpiredProxySessions({ at: later.at, accountId: "acct-1", limit: 1 }), 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions").get().n, 1);
  db.close();
});

test("concurrent D1 session admission never over-allocates the last account slot", async () => {
  const { db, store } = fixture();
  createAccount(db, { id: "acct-1", maxConnections: 1 });
  const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) => store.acquireProxySession({
    sessionId: `racer-${index}`, accountId: "acct-1", createdAt: timestamp,
    expiresAt: "2026-10-27T13:00:00.000Z", at: timestamp, maxConcurrentSessions: 10
  })));
  assert.equal(attempts.filter((result) => result.allowed).length, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions WHERE expires_at > ?").get(timestamp).n, 1);
  db.close();
});

test("concurrent D1 admission enforces the installation-wide cap across accounts", async () => {
  const { db, store } = fixture();
  for (let index = 0; index < 4; index += 1) createAccount(db, { id: `global-${index}`, maxConnections: null });
  const attempts = await Promise.all(Array.from({ length: 20 }, (_, index) => store.acquireProxySession({
    sessionId: `global-racer-${index}`,
    accountId: `global-${index % 4}`,
    createdAt: timestamp,
    expiresAt: "2026-10-27T13:00:00.000Z",
    at: timestamp,
    maxConcurrentSessions: 2
  })));
  assert.equal(attempts.filter((result) => result.allowed).length, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions WHERE expires_at > ?").get(timestamp).n, 2);
  db.close();
});

test("active session leases prevent account deletion from freeing a live slot", async () => {
  const { db, store } = fixture();
  createAccount(db, { id: "acct-1", maxConnections: 1 });
  const lease = {
    sessionId: "live-lease", accountId: "acct-1", createdAt: timestamp,
    expiresAt: "2026-10-27T13:00:00.000Z", at: timestamp, maxConcurrentSessions: 2
  };
  assert.equal((await store.acquireProxySession(lease)).allowed, true);
  const audit = {
    id: "audit-delete", action: "account.deleted", createdAt: timestamp,
    details: { source: "test" }
  };
  await assert.rejects(() => store.deleteAccount("acct-1", audit), /FOREIGN KEY constraint failed/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions WHERE account_id = ?").get("acct-1").n, 1);
  assert.equal(await store.releaseProxySession({ sessionId: "live-lease", accountId: "acct-1" }), true);
  assert.equal(await store.deleteAccount("acct-1", { ...audit, id: "audit-delete-2" }), true);
  db.close();
});
