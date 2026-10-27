import test from "node:test";
import assert from "node:assert/strict";
import { createD1Store } from "../src/storage/d1-store.js";

function makeDb({ firstBySql = [], batchResults = [] } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, values: [] };
      calls.push(call);
      return {
        bind(...values) { call.values = values; return this; },
        async first() {
          const match = firstBySql.find((entry) => sql.includes(entry.includes));
          return match ? match.value : null;
        },
        async all() { return { results: [] }; },
        async run() { return { meta: { changes: 1 } }; }
      };
    },
    async batch(statements) {
      calls.push({ batch: statements.length });
      return batchResults.length ? batchResults : statements.map(() => ({ meta: { changes: 1 } }));
    }
  };
}

const audit = {
  id: "audit-auth-1", action: "auth.test", createdAt: "2026-10-27T00:00:00.000Z"
};

test("principal lookup maps password hash internally and uses a bound username", async () => {
  const db = makeDb({ firstBySql: [{
    includes: "FROM principals WHERE username",
    value: { id: "p1", username: "owner_01", password_hash: "encoded", role: "owner", status: "active",
      created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }
  }]});
  const principal = await createD1Store(db).findPrincipalByUsername("owner_01");
  assert.equal(principal.passwordHash, "encoded");
  assert.equal(db.calls[0].values[0], "owner_01");
});

test("owner bootstrap is a conditional insert and is batched with audit", async () => {
  const db = makeDb({ batchResults: [{ meta: { changes: 1 } }, { meta: { changes: 1 } }] });
  const created = await createD1Store(db).createInitialOwner({
    id: "p1", username: "owner_01", passwordHash: "encoded",
    createdAt: audit.createdAt, updatedAt: audit.createdAt
  }, audit);
  assert.equal(created, true);
  const insert = db.calls.find((call) => call.sql?.includes("INSERT INTO principals"));
  assert.match(insert.sql, /WHERE NOT EXISTS \(SELECT 1 FROM principals\)/);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 2 });
});

test("session creation never needs a raw token and is batched with audit", async () => {
  const db = makeDb();
  const session = {
    id: "s1", principalId: "p1", tokenHash: "opaque-token-hash",
    createdAt: audit.createdAt, expiresAt: "2026-10-27T12:00:00.000Z"
  };
  await createD1Store(db).createSession(session, audit);
  const insert = db.calls.find((call) => call.sql?.includes("INSERT INTO sessions"));
  assert.ok(insert.values.includes("opaque-token-hash"));
  assert.equal(insert.values.includes("raw-bearer-token"), false);
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 2 });
});

test("session lookup maps principal and revocation state from a join", async () => {
  const db = makeDb({ firstBySql: [{
    includes: "FROM sessions s JOIN principals p",
    value: {
      session_id: "s1", principal_id: "p1", token_hash: "hash",
      session_created_at: audit.createdAt, expires_at: "2026-10-27T12:00:00.000Z",
      revoked_at: null, last_seen_at: audit.createdAt,
      joined_principal_id: "p1", username: "owner_01", role: "owner", status: "active",
      principal_created_at: audit.createdAt, principal_updated_at: audit.createdAt
    }
  }]});
  const session = await createD1Store(db).findSessionByTokenHash("hash");
  assert.equal(session.id, "s1");
  assert.equal(session.principal.id, "p1");
  assert.equal(session.revokedAt, null);
});

test("rate-limit attempts use an atomic upsert and reject raw-looking short keys", async () => {
  const db = makeDb({ firstBySql: [{ includes: "RETURNING attempt_count", value: { attempt_count: 3 } }] });
  const store = createD1Store(db);
  const attempts = await store.consumeAuthAttempt({
    keyHash: "opaque-rate-limit-key-hash-0123456789",
    windowStartedAt: audit.createdAt,
    now: audit.createdAt
  });
  assert.equal(attempts, 3);
  assert.match(db.calls[0].sql, /ON CONFLICT\(key_hash\) DO UPDATE/);
  await assert.rejects(() => store.consumeAuthAttempt({ keyHash: "short", windowStartedAt: audit.createdAt, now: audit.createdAt }), TypeError);
});
