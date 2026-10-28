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
  return db;
}

const timestamp = "2026-10-27T12:00:00.000Z";

test("all D1 migrations execute in SQLite and create the expected tables", () => {
  const db = databaseWithMigrations();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const name of [
    "principals", "sessions", "proxy_accounts", "subscriptions", "usage_daily",
    "installation_settings", "provider_resources", "audit_events", "auth_rate_limits", "telegram_webhook_updates"
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
