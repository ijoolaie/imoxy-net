import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

function databaseWithMigrations() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(migration("0001_initial.sql"));
  db.exec(migration("0002_auth_rate_limits.sql"));
  db.exec(migration("0003_telegram_webhook_updates.sql"));
  db.exec(migration("0004_usage_daily_safe_integer_guards.sql"));
  db.exec(migration("0005_proxy_credentials.sql"));
  db.exec(migration("0006_atomic_quota_reservations.sql"));
  db.exec(migration("0007_proxy_active_sessions.sql"));
  return db;
}

const timestamp = "2026-10-27T12:00:00.000Z";

test("all D1 migrations execute in SQLite and create the expected tables", () => {
  const db = databaseWithMigrations();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const name of [
    "principals", "sessions", "proxy_accounts", "subscriptions", "usage_daily",
    "installation_settings", "provider_resources", "audit_events", "auth_rate_limits", "telegram_webhook_updates", "proxy_credentials", "quota_reservations", "usage_events", "proxy_active_sessions"
  ]) assert.ok(tables.includes(name), `missing table ${name}`);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  db.close();
});

test("Telegram webhook update IDs are unique and processing claims can be released for retry", () => {
  const db = databaseWithMigrations();
  const insert = db.prepare("INSERT INTO telegram_webhook_updates (update_id, status) VALUES (?, 'processing') ON CONFLICT(update_id) DO NOTHING");
  assert.equal(insert.run("123").changes, 1);
  assert.equal(insert.run("123").changes, 0);
  db.prepare("DELETE FROM telegram_webhook_updates WHERE update_id = ? AND status = 'processing'").run("123");
  assert.equal(insert.run("123").changes, 1);
  db.prepare("UPDATE telegram_webhook_updates SET status = 'processed', processed_at = datetime('now') WHERE update_id = ?").run("123");
  assert.equal(insert.run("123").changes, 0);
  assert.equal(db.prepare("SELECT status FROM telegram_webhook_updates WHERE update_id = ?").get("123").status, "processed");
  db.close();
});

test("Telegram stale processing claims can be recovered but processed updates stay deduplicated", () => {
  const db = databaseWithMigrations();
  const claim = db.prepare(`INSERT INTO telegram_webhook_updates (update_id, status, received_at, processed_at)
    VALUES (?, 'processing', datetime('now'), NULL)
    ON CONFLICT(update_id) DO UPDATE SET
      status = 'processing', received_at = datetime('now'), processed_at = NULL
    WHERE telegram_webhook_updates.status = 'processing'
      AND telegram_webhook_updates.received_at < datetime('now', '-2 minutes')`);
  assert.equal(claim.run("stale-1").changes, 1);
  db.prepare("UPDATE telegram_webhook_updates SET received_at = datetime('now', '-5 minutes') WHERE update_id = ?").run("stale-1");
  assert.equal(claim.run("stale-1").changes, 1, "stale processing claim should be reclaimed");
  assert.equal(claim.run("stale-1").changes, 0, "fresh processing claim should not be taken over");
  db.prepare("UPDATE telegram_webhook_updates SET status = 'processed', processed_at = datetime('now') WHERE update_id = ?").run("stale-1");
  assert.equal(claim.run("stale-1").changes, 0, "processed update should never be claimed again");
  db.close();
});

test("schema constraints reject invalid roles, negative quotas and orphan usage rows", () => {
  const db = databaseWithMigrations();
  assert.throws(() => db.prepare(`INSERT INTO principals
    (id, username, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run("p1", "owner_01", "encoded", "root", "active", timestamp, timestamp));
  db.prepare(`INSERT INTO principals
    (id, username, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run("p1", "owner_01", "encoded", "owner", "active", timestamp, timestamp);
  assert.throws(() => db.prepare(`INSERT INTO proxy_accounts
    (id, username, status, quota_bytes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", -1, timestamp, timestamp));
  assert.throws(() => db.prepare(`INSERT INTO usage_daily
    (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("missing", "2026-10-27", 0, 0, 0, timestamp));
  db.close();
});

test("usage schema triggers reject unsafe daily counters on insert and update", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", timestamp, timestamp);
  const insert = db.prepare(`INSERT INTO usage_daily
    (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`);
  assert.throws(() => insert.run("a1", "2026-10-27", Number.MAX_SAFE_INTEGER + 1, 0, 1, timestamp),
    /usage_daily counter exceeds safe-integer range/);
  assert.throws(() => insert.run("a1", "2026-10-27", Number.MAX_SAFE_INTEGER, 1, 1, timestamp),
    /usage_daily counter exceeds safe-integer range/);
  assert.throws(() => insert.run("a1", "2026-10-27", 0, 0, Number.MAX_SAFE_INTEGER + 1, timestamp),
    /usage_daily counter exceeds safe-integer range/);
  insert.run("a1", "2026-10-27", 10, 20, 1, timestamp);
  assert.throws(() => db.prepare(`UPDATE usage_daily SET download_bytes = ?
    WHERE account_id = ? AND usage_date = ?`).run(Number.MAX_SAFE_INTEGER, "a1", "2026-10-27"),
    /usage_daily counter exceeds safe-integer range/);
  const row = db.prepare("SELECT upload_bytes, download_bytes, request_count FROM usage_daily WHERE account_id = ?").get("a1");
  assert.deepEqual({ ...row }, { upload_bytes: 10, download_bytes: 20, request_count: 1 });
  db.close();
});

test("REAL aggregate preflight detects cross-day lifetime overflow without integer SUM overflow", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", timestamp, timestamp);
  const insert = db.prepare(`INSERT INTO usage_daily
    (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`);
  insert.run("a1", "2026-10-26", 5_000_000_000_000_000, 0, 1, timestamp);
  insert.run("a1", "2026-10-27", 5_000_000_000_000_000, 0, 1, timestamp);
  const aggregate = db.prepare(`SELECT
    COALESCE(SUM(CAST(upload_bytes AS REAL) + CAST(download_bytes AS REAL)), 0) AS total_bytes_approx,
    COALESCE(SUM(CAST(request_count AS REAL)), 0) AS request_count_approx
    FROM usage_daily WHERE account_id = ?`).get("a1");
  assert.ok(aggregate.total_bytes_approx > Number.MAX_SAFE_INTEGER);
  assert.equal(aggregate.request_count_approx, 2);
  db.close();
});

test("usage upserts add counters without overwriting previous traffic", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", timestamp, timestamp);
  const upsert = db.prepare(`INSERT INTO usage_daily
    (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(account_id, usage_date) DO UPDATE SET
      upload_bytes = usage_daily.upload_bytes + excluded.upload_bytes,
      download_bytes = usage_daily.download_bytes + excluded.download_bytes,
      request_count = usage_daily.request_count + excluded.request_count,
      updated_at = excluded.updated_at`);
  upsert.run("a1", "2026-10-27", 10, 20, 1, timestamp);
  upsert.run("a1", "2026-10-27", 3, 7, 2, timestamp);
  const row = db.prepare("SELECT upload_bytes, download_bytes, request_count FROM usage_daily WHERE account_id = ?").get("a1");
  assert.equal(row.upload_bytes, 13);
  assert.equal(row.download_bytes, 27);
  assert.equal(row.request_count, 3);
  db.close();
});

test("authentication rate-limit upsert increments in a window and resets in a new window", () => {
  const db = databaseWithMigrations();
  const upsert = db.prepare(`INSERT INTO auth_rate_limits (key_hash, window_started_at, attempt_count, updated_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(key_hash) DO UPDATE SET
      window_started_at = excluded.window_started_at,
      attempt_count = CASE WHEN auth_rate_limits.window_started_at = excluded.window_started_at
        THEN auth_rate_limits.attempt_count + 1 ELSE 1 END,
      updated_at = excluded.updated_at
    RETURNING attempt_count`);
  assert.equal(upsert.get("opaque-hash", "2026-10-27T12:00:00.000Z", timestamp).attempt_count, 1);
  assert.equal(upsert.get("opaque-hash", "2026-10-27T12:00:00.000Z", timestamp).attempt_count, 2);
  assert.equal(upsert.get("opaque-hash", "2026-10-27T12:15:00.000Z", timestamp).attempt_count, 1);
  db.close();
});

test("account deletion cascades subscriptions and usage while audit remains historical", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO principals (id, username, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run("p1", "owner_01", "encoded", "owner", "active", timestamp, timestamp);
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", timestamp, timestamp);
  db.prepare(`INSERT INTO subscriptions (id, account_id, token_hash, created_at)
    VALUES (?, ?, ?, ?)`).run("sub1", "a1", "hashed-token", timestamp);
  db.prepare(`INSERT INTO usage_daily (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run("a1", "2026-10-27", 1, 2, 1, timestamp);
  db.prepare(`INSERT INTO audit_events (id, actor_principal_id, action, resource_type, resource_id, outcome, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run("ev1", "p1", "account.deleted", "proxy_account", "a1", "success", "{}", timestamp);
  db.prepare("DELETE FROM proxy_accounts WHERE id = ?").run("a1");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM subscriptions").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM usage_daily").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM audit_events").get().n, 1);
  db.close();
});

test("proxy credentials store only lowercase SHA-256 hashes and cascade with account deletion", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, created_at, updated_at)
    VALUES (?, ?, ?, ?)`).run("acct-cred", "credential_user", timestamp, timestamp);
  const insert = db.prepare(`INSERT INTO proxy_credentials (id, account_id, credential_hash, created_at)
    VALUES (?, ?, ?, ?)`);
  assert.equal(insert.run("cred-1", "acct-cred", "a".repeat(64), timestamp).changes, 1);
  assert.throws(() => insert.run("cred-plaintext", "acct-cred", "not-a-hash", timestamp));
  assert.equal(db.prepare("SELECT credential_hash FROM proxy_credentials WHERE id = ?").get("cred-1").credential_hash, "a".repeat(64));
  db.prepare("UPDATE proxy_credentials SET revoked_at = ? WHERE id = ?").run(timestamp, "cred-1");
  assert.equal(db.prepare("SELECT revoked_at FROM proxy_credentials WHERE id = ?").get("cred-1").revoked_at, timestamp);
  db.prepare("DELETE FROM proxy_accounts WHERE id = ?").run("acct-cred");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM proxy_credentials WHERE account_id = ?").get("acct-cred").count, 0);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  db.close();
});


test("quota reservations enforce immutable bounds and usage events atomically settle usage once", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, quota_bytes, daily_quota_bytes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", 1000, 500, timestamp, timestamp);
  db.prepare(`INSERT INTO quota_reservations
    (reservation_id, account_id, usage_date, reserved_bytes, actual_bytes, status, created_at, lease_expires_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, 'active', ?, ?, ?)`).run(
    "reserve-1", "a1", "2026-10-27", 100, timestamp, "2026-10-27T12:01:00.000Z", timestamp
  );
  const insertEvent = db.prepare(`INSERT INTO usage_events
    (producer_id, event_id, reservation_id, account_id, usage_date, upload_bytes, download_bytes,
     request_count, payload_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'claimed', ?)
    ON CONFLICT(producer_id, event_id) DO NOTHING`);
  const payload = ["worker-1", "event-1", "reserve-1", "a1", "2026-10-27", 30, 40, 1, "a".repeat(64), timestamp];

  db.exec("BEGIN");
  insertEvent.run(...payload);
  db.prepare("UPDATE usage_events SET status = 'applied' WHERE producer_id = ? AND event_id = ? AND status = 'claimed'")
    .run("worker-1", "event-1");
  db.exec("COMMIT");

  const usage = db.prepare("SELECT upload_bytes, download_bytes, request_count FROM usage_daily WHERE account_id = ? AND usage_date = ?")
    .get("a1", "2026-10-27");
  assert.deepEqual({ ...usage }, { upload_bytes: 30, download_bytes: 40, request_count: 1 });
  assert.deepEqual({ ...db.prepare("SELECT status, actual_bytes FROM quota_reservations WHERE reservation_id = ?").get("reserve-1") },
    { status: "settled", actual_bytes: 70 });
  assert.throws(() => db.prepare("UPDATE usage_events SET status = 'claimed' WHERE producer_id = ? AND event_id = ?")
    .run("worker-1", "event-1"), /usage event status transition is invalid/);
  assert.throws(() => db.prepare("UPDATE quota_reservations SET status = 'active', actual_bytes = NULL WHERE reservation_id = ?")
    .run("reserve-1"), /quota reservation status transition is invalid/);
  assert.throws(() => db.prepare(`INSERT INTO usage_events
    (producer_id, event_id, reservation_id, account_id, usage_date, upload_bytes, download_bytes,
     request_count, payload_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?)`).run(
    "worker-1", "event-direct-applied", "reserve-1", "a1", "2026-10-27", 0, 0, 0, "c".repeat(64), timestamp
  ), /usage events must begin claimed/);

  db.exec("BEGIN");
  insertEvent.run(...payload);
  db.prepare("UPDATE usage_events SET status = 'applied' WHERE producer_id = ? AND event_id = ? AND status = 'claimed'")
    .run("worker-1", "event-1");
  db.exec("COMMIT");
  const usageAfterReplay = db.prepare("SELECT upload_bytes, download_bytes, request_count FROM usage_daily WHERE account_id = ? AND usage_date = ?")
    .get("a1", "2026-10-27");
  assert.deepEqual({ ...usageAfterReplay }, { upload_bytes: 30, download_bytes: 40, request_count: 1 });
  assert.throws(() => db.prepare("UPDATE quota_reservations SET reserved_bytes = 200 WHERE reservation_id = ?").run("reserve-1"),
    /quota reservation identity is immutable/);
  db.close();
});

test("an event cannot settle without a matching active reservation or exceed its allowance", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`).run("a1", "customer_01", "active", timestamp, timestamp);
  db.prepare(`INSERT INTO quota_reservations
    (reservation_id, account_id, usage_date, reserved_bytes, actual_bytes, status, created_at, lease_expires_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, 'active', ?, ?, ?)`).run(
    "reserve-1", "a1", "2026-10-27", 10, timestamp, "2026-10-27T12:01:00.000Z", timestamp
  );
  db.prepare(`INSERT INTO usage_events
    (producer_id, event_id, reservation_id, account_id, usage_date, upload_bytes, download_bytes,
     request_count, payload_hash, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'claimed', ?)`).run(
    "worker-1", "event-oversize", "reserve-1", "a1", "2026-10-27", 8, 5, 1, "b".repeat(64), timestamp
  );
  assert.throws(() => db.prepare("UPDATE usage_events SET status = 'applied' WHERE event_id = ?").run("event-oversize"),
    /usage event has no matching active reservation/);
  assert.equal(db.prepare("SELECT status FROM quota_reservations WHERE reservation_id = ?").get("reserve-1").status, "active");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM usage_daily").get().n, 0);
  db.close();
});


test("active proxy session leases restrict account deletion until the lease is released or expires", () => {
  const db = databaseWithMigrations();
  db.prepare(`INSERT INTO proxy_accounts (id, username, status, max_connections, created_at, updated_at)
    VALUES (?, ?, 'active', ?, ?, ?)`).run("acct-lease", "lease_user", 1, timestamp, timestamp);
  db.prepare(`INSERT INTO proxy_active_sessions (session_id, account_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)`).run("lease-1", "acct-lease", timestamp, "2026-10-27T13:00:00.000Z");
  assert.throws(() => db.prepare("DELETE FROM proxy_accounts WHERE id = ?").run("acct-lease"), /FOREIGN KEY constraint failed/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM proxy_active_sessions WHERE account_id = ?").get("acct-lease").n, 1);
  db.prepare("DELETE FROM proxy_active_sessions WHERE session_id = ? AND account_id = ?").run("lease-1", "acct-lease");
  assert.equal(db.prepare("DELETE FROM proxy_accounts WHERE id = ?").run("acct-lease").changes, 1);
  db.close();
});
