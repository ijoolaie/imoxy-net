import test from "node:test";
import assert from "node:assert/strict";
import { createAccountService, DomainError } from "../src/domain/account-service.js";

function fixture({ allowed = true, existing = null } = {}) {
  const calls = [];
  const store = {
    async getAccount(id) {
      calls.push({ method: "getAccount", id });
      return existing?.id === id ? existing : null;
    },
    async listAccounts(args) {
      calls.push({ method: "listAccounts", args });
      return { items: [], nextCursor: null };
    },
    async createAccount(account, audit) {
      calls.push({ method: "createAccount", account, audit });
      return account;
    },
    async updateAccount(id, changes, audit) {
      calls.push({ method: "updateAccount", id, changes, audit });
      return existing?.id === id ? { ...existing, ...changes } : null;
    },
    async deleteAccount(id, audit) {
      calls.push({ method: "deleteAccount", id, audit });
      return existing?.id === id;
    }
  };
  const service = createAccountService({
    store,
    authorize: async (request) => {
      calls.push({ method: "authorize", request });
      return allowed ? { id: "principal-1", role: "owner" } : null;
    },
    idFactory: (() => { let id = 0; return () => `generated-${++id}`; })(),
    now: () => "2026-10-27T00:00:00.000Z"
  });
  return { service, calls };
}

test("account service refuses to construct without an explicit authorization policy", () => {
  assert.throws(() => createAccountService({ store: {} }), TypeError);
});

test("create validates inputs, assigns server-controlled fields, and records audit metadata", async () => {
  const { service, calls } = fixture();
  const account = await service.create({ username: "customer_01", quotaBytes: 500 }, { requestId: "req-1" });
  assert.equal(account.id, "generated-1");
  assert.equal(account.status, "active");
  assert.equal(account.quotaBytes, 500);
  const mutation = calls.find((call) => call.method === "createAccount");
  assert.equal(mutation.audit.actorPrincipalId, "principal-1");
  assert.equal(mutation.audit.requestId, "req-1");
  assert.equal(mutation.audit.action, "account.created");
});

test("denied requests do not reach the storage adapter", async () => {
  const { service, calls } = fixture({ allowed: false });
  await assert.rejects(() => service.create({ username: "customer_01" }), (error) => {
    assert.ok(error instanceof DomainError);
    assert.equal(error.code, "forbidden");
    return true;
  });
  assert.equal(calls.some((call) => call.method === "createAccount"), false);
});

test("update rejects empty and unknown fields before storage", async () => {
  const existing = { id: "acct-1", username: "customer_01", status: "active" };
  const { service, calls } = fixture({ existing });
  await assert.rejects(() => service.update("acct-1", {}), /invalid fields/i);
  await assert.rejects(() => service.update("acct-1", { role: "owner" }), /invalid fields/i);
  assert.equal(calls.some((call) => call.method === "updateAccount"), false);
});

test("read and delete return not-found for missing accounts", async () => {
  const { service } = fixture();
  await assert.rejects(() => service.get("missing"), (error) => error.code === "not_found");
  await assert.rejects(() => service.delete("missing"), (error) => error.code === "not_found");
});

test("update persists only validated mutable fields", async () => {
  const existing = { id: "acct-1", username: "customer_01", status: "active", notes: "" };
  const { service, calls } = fixture({ existing });
  const updated = await service.update("acct-1", { notes: "renewed" });
  assert.equal(updated.notes, "renewed");
  const mutation = calls.find((call) => call.method === "updateAccount");
  assert.deepEqual(mutation.changes, { notes: "renewed" });
  assert.equal(mutation.audit.action, "account.updated");
});

test("list pagination validation returns a client error before persistence", async () => {
  const { service, calls } = fixture();
  await assert.rejects(() => service.list({ limit: 1000 }), (error) => {
    assert.equal(error.code, "validation_failed");
    assert.equal(error.fields.limit, "must_be_an_integer_from_1_to_100");
    return true;
  });
  assert.equal(calls.some((call) => call.method === "listAccounts"), false);
});
