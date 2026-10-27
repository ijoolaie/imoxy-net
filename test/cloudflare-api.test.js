import test from "node:test";
import assert from "node:assert/strict";
import { createApiHandler } from "../src/http/api.js";
import { AuthError } from "../src/security/auth-service.js";
import { buildCloudflarePlan } from "../src/providers/cloudflare-plan.js";

const token = "valid-session-token-012345678901234567890";
const owner = { id: "p1", username: "owner_01", role: "owner", status: "active" };

function fixture({ authenticated = true } = {}) {
  const state = { providerCalls: 0, mutations: 0 };
  const store = {
    async getAccount() { return null; },
    async listAccounts() { return { items: [], nextCursor: null }; },
    async createAccount() { throw new Error("unused"); },
    async updateAccount() { throw new Error("unused"); },
    async deleteAccount() { throw new Error("unused"); }
  };
  const auth = {
    async resolveSession(value) {
      if (!authenticated || value !== token) throw new AuthError("unauthorized", "Authentication failed.", 401);
      return owner;
    }
  };
  const inventory = {
    account: { id: "0123456789abcdef0123456789abcdef", name: "Test" },
    zones: [],
    workerScripts: [],
    kvNamespaces: [],
    d1Databases: [],
    dnsRecords: [],
    workerRoutes: [],
    readOnly: true
  };
  const api = createApiHandler({
    storeFactory: () => store,
    authFactory: () => auth,
    cloudflareFactory: () => ({
      async getInventory() { state.providerCalls += 1; return inventory; }
    }),
    cloudflarePlanFactory: buildCloudflarePlan
  });
  return { api, state, inventory, env: { DB: {} } };
}

test("Cloudflare inventory requires a session and calls only the read-only client", async () => {
  const denied = fixture({ authenticated: false });
  const response = await denied.api.fetch(new Request("https://imoxy.test/api/v1/cloudflare/inventory", {
    headers: { authorization: `Bearer ${token}` }
  }), denied.env);
  assert.equal(response.status, 401);
  assert.equal(denied.state.providerCalls, 0);

  const allowed = fixture();
  const result = await allowed.api.fetch(new Request("https://imoxy.test/api/v1/cloudflare/inventory", {
    headers: { authorization: `Bearer ${token}` }
  }), allowed.env);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).inventory.readOnly, true);
  assert.equal(allowed.state.providerCalls, 1);
  assert.equal(allowed.state.mutations, 0);
});

test("Cloudflare plan route returns a review-only plan and never applies it", async () => {
  const { api, state, env } = fixture();
  const response = await api.fetch(new Request("https://imoxy.test/api/v1/cloudflare/plan", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ desired: { kvNamespaces: [{ title: "new-settings" }] } })
  }), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.plan.readOnly, true);
  assert.equal(body.plan.requiresExplicitApproval, true);
  assert.equal(body.plan.operations[0].operation, "create");
  assert.equal(state.providerCalls, 1);
  assert.equal(state.mutations, 0);
});

test("Cloudflare plan route rejects unexpected request fields", async () => {
  const { api, env, state } = fixture();
  const response = await api.fetch(new Request("https://imoxy.test/api/v1/cloudflare/plan", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ desired: {}, apply: true })
  }), env);
  assert.equal(response.status, 400);
  assert.equal(state.providerCalls, 0);
});
