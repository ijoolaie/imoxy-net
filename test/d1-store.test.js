import test from "node:test";
import assert from "node:assert/strict";
import { createD1Store } from "../src/storage/d1-store.js";

function makeDb({ firstRow = null, allRows = [], batchResults = [] } = {}) {
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
        async run() { return { meta: { changes: 1 } }; }
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
  const account = await store.createAccount({
    id: "acct-1", username: "customer_1", createdAt: audit.createdAt, updatedAt: audit.createdAt
  }, audit);
  assert.equal(account.id, "acct-1");
  assert.deepEqual(db.calls.find((call) => call.batch), { batch: 2 });
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
