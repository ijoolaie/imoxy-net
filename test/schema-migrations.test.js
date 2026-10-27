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
  return db;
}

const timestamp = "2026-10-27T12:00:00.000Z";

test("all D1 migrations execute in SQLite and create the expected tables", () => {
  const db = databaseWithMigrations();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const name of [
    "principals", "sessions", "proxy_accounts", "subscriptions", "usage_daily",
    "installation_settings", "provider_resources", "audit_events", "auth_rate_limits"
  ]) assert.ok(tables.includes(name), `missing table ${name}`);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
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
