import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createD1Store } from "../src/storage/d1-store.js";

function createSqliteD1(db) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...boundValues) {
          values = boundValues;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...values) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...values) };
        },
        async run() {
          const result = db.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes) } };
        }
      };
    },
    async batch(statements) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const results = await Promise.all(statements.map((statement) => statement.run()));
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  };
}

function createStoreFixture() {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync(new URL("../migrations/0001_initial.sql", import.meta.url), "utf8"));
  database.exec(readFileSync(new URL("../migrations/0007_proxy_active_sessions.sql", import.meta.url), "utf8"));
  const db = createSqliteD1(database);
  const store = createD1Store(db);

  function addAccount(id, maxConnections) {
    database.prepare(`INSERT INTO proxy_accounts
      (id, username, status, max_connections, created_at, updated_at)
      VALUES (?, ?, 'active', ?, '2026-10-30T10:00:00.000Z', '2026-10-30T10:00:00.000Z')`)
      .run(id, id, maxConnections);
  }

  return { database, store, addAccount };
}

function lease(sessionId, accountId, createdAt, expiresAt, maxConcurrentSessions = 3) {
  return { sessionId, accountId, createdAt, expiresAt, at: createdAt, maxConcurrentSessions };
}

test("D1Store executes real admission SQL against the schema and enforces account and installation caps", async (t) => {
  const fixture = createStoreFixture();
  t.after(() => fixture.database.close());
  const { database, store, addAccount } = fixture;
  addAccount("account-a", 2);
  addAccount("account-b", 2);

  const start = "2026-10-30T10:00:00.000Z";
  const expiry = "2026-10-30T11:00:00.000Z";

  assert.equal((await store.acquireProxySession(lease("a-1", "account-a", start, expiry))).allowed, true);
  const duplicate = await store.acquireProxySession(lease("a-1", "account-a", start, expiry));
  assert.equal(duplicate.allowed, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal((await store.acquireProxySession(lease("a-2", "account-a", start, expiry))).allowed, true);
  assert.equal((await store.acquireProxySession(lease("a-3", "account-a", start, expiry))).allowed, false);

  assert.equal((await store.acquireProxySession(lease("b-1", "account-b", start, expiry))).allowed, true);
  assert.equal((await store.acquireProxySession(lease("b-2", "account-b", start, expiry))).allowed, false);

  const counts = database.prepare(`SELECT account_id, COUNT(*) AS count
    FROM proxy_active_sessions GROUP BY account_id ORDER BY account_id`).all();
  assert.deepEqual(counts.map((row) => [row.account_id, row.count]), [
    ["account-a", 2],
    ["account-b", 1]
  ]);
});

test("D1Store removes expired leases before admission and preserves restrictive account deletion", async (t) => {
  const fixture = createStoreFixture();
  t.after(() => fixture.database.close());
  const { database, store, addAccount } = fixture;
  addAccount("account-a", 1);

  assert.equal((await store.acquireProxySession(lease(
    "expired-lease", "account-a",
    "2026-10-30T10:00:00.000Z", "2026-10-30T10:01:00.000Z"
  ))).allowed, true);

  assert.equal((await store.acquireProxySession(lease(
    "replacement-lease", "account-a",
    "2026-10-30T10:02:00.000Z", "2026-10-30T11:02:00.000Z"
  ))).allowed, true);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM proxy_active_sessions WHERE session_id = 'expired-lease'").get().count, 0);

  assert.throws(
    () => database.prepare("DELETE FROM proxy_accounts WHERE id = ?").run("account-a"),
    /FOREIGN KEY constraint failed/
  );
  assert.equal(await store.releaseProxySession({ sessionId: "replacement-lease", accountId: "account-a" }), true);
  assert.equal(database.prepare("DELETE FROM proxy_accounts WHERE id = ?").run("account-a").changes, 1);
});
