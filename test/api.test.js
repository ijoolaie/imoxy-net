import test from "node:test";
import assert from "node:assert/strict";
import { createApiHandler } from "../src/http/api.js";
import { AuthError } from "../src/security/auth-service.js";

const bearer = "valid-session-token-012345678901234567890";
const owner = {
  id: "principal-1", username: "owner_01", role: "owner", status: "active",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
};

function fixture() {
  const state = { accounts: new Map(), mutations: [], authCalls: [] };
  const store = {
    async getAccount(id) { return state.accounts.get(id) ?? null; },
    async listAccounts() { return { items: [...state.accounts.values()], nextCursor: null }; },
    async createAccount(account, audit) {
      state.accounts.set(account.id, account);
      state.mutations.push({ type: "create", account, audit });
      return account;
    },
    async updateAccount(id, changes, audit) {
      const current = state.accounts.get(id);
      if (!current) return null;
      const updated = { ...current, ...changes };
      state.accounts.set(id, updated);
      state.mutations.push({ type: "update", id, changes, audit });
      return updated;
    },
    async deleteAccount(id, audit) {
      const existed = state.accounts.delete(id);
      if (existed) state.mutations.push({ type: "delete", id, audit });
      return existed;
    }
  };
  const auth = {
    async bootstrapOwner(input) {
      state.authCalls.push({ type: "bootstrap", input });
      if (input.providedSecret !== "bootstrap-secret-from-header") {
        throw new AuthError("forbidden", "The bootstrap credential is invalid.", 403);
      }
      return owner;
    },
    async login(input) {
      state.authCalls.push({ type: "login", input });
      if (input.password !== "correct password") throw new AuthError("unauthorized", "Authentication failed.", 401);
      return { principal: owner, token: bearer, expiresAt: "2027-01-01T00:00:00.000Z" };
    },
    async resolveSession(token) {
      state.authCalls.push({ type: "resolve", token });
      if (token !== bearer) throw new AuthError("unauthorized", "Authentication failed.", 401);
      return owner;
    },
    async logout(token) {
      state.authCalls.push({ type: "logout", token });
      return true;
    }
  };
  const api = createApiHandler({ storeFactory: () => store, authFactory: () => auth });
  const env = {
    DB: {},
    AUTH_RATE_LIMIT_SECRET: "rate-limit-secret-that-is-long-enough-for-hmac",
    BOOTSTRAP_OWNER_SECRET: "bootstrap-secret-from-header"
  };
  return { api, env, state };
}

const jsonRequest = (url, method, body, headers = {}) => new Request(url, {
  method,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body)
});

test("health and capabilities remain available without database bindings", async () => {
  const api = createApiHandler({ storeFactory: () => { throw new Error("must not access storage"); } });
  const health = await api.fetch(new Request("https://imoxy.test/health"));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");
  const capabilities = await api.fetch(new Request("https://imoxy.test/api/v1/capabilities"));
  const body = await capabilities.json();
  assert.ok(body.implemented.includes("authentication-and-session-routes"));
});

test("browser login sets a secure HttpOnly cookie and does not expose the token in JSON", async () => {
  const { api, env } = fixture();
  const request = jsonRequest("https://imoxy.test/api/v1/auth/login", "POST",
    { username: "owner_01", password: "correct password" }, { origin: "https://imoxy.test" });
  const response = await api.fetch(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.principal.id, owner.id);
  assert.equal("token" in body, false);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
});

test("native login without an Origin header receives a bearer token", async () => {
  const { api, env } = fixture();
  const response = await api.fetch(jsonRequest("https://imoxy.test/api/v1/auth/login", "POST",
    { username: "owner_01", password: "correct password" }), env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).token, bearer);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("cross-origin login requests are rejected", async () => {
  const { api, env, state } = fixture();
  const response = await api.fetch(jsonRequest("https://imoxy.test/api/v1/auth/login", "POST",
    { username: "owner_01", password: "correct password" }, { origin: "https://attacker.test" }), env);
  assert.equal(response.status, 403);
  assert.equal(state.authCalls.some((call) => call.type === "login"), false);
});

test("bootstrap secret is read from a header and login rate keys are not raw IP values", async () => {
  const { api, env, state } = fixture();
  const response = await api.fetch(jsonRequest("https://imoxy.test/api/v1/auth/bootstrap", "POST",
    { username: "owner_01", password: "a sufficiently long password" },
    { "x-bootstrap-secret": "bootstrap-secret-from-header", "cf-connecting-ip": "203.0.113.7" }), env);
  assert.equal(response.status, 201);
  const input = state.authCalls.find((call) => call.type === "bootstrap").input;
  assert.equal(input.providedSecret, "bootstrap-secret-from-header");
  assert.equal(Array.isArray(input.rateLimitKeyHash), true);
  assert.equal(input.rateLimitKeyHash.length, 2);
  assert.equal(input.rateLimitKeyHash.includes("203.0.113.7"), false);
});

test("account create requires an authenticated principal and audits the mutation", async () => {
  const { api, env, state } = fixture();
  const denied = await api.fetch(jsonRequest("https://imoxy.test/api/v1/accounts", "POST",
    { username: "customer_01" }), env);
  assert.equal(denied.status, 401);
  assert.equal(state.mutations.length, 0);

  const accepted = await api.fetch(jsonRequest("https://imoxy.test/api/v1/accounts", "POST",
    { username: "customer_01" }, { authorization: `Bearer ${bearer}` }), env);
  assert.equal(accepted.status, 201);
  const body = await accepted.json();
  assert.equal(body.account.username, "customer_01");
  assert.equal(state.mutations[0].audit.actorPrincipalId, owner.id);
  assert.equal(state.mutations[0].audit.action, "account.created");
});

test("cookie-authenticated mutations require a same-origin request", async () => {
  const { api, env, state } = fixture();
  const response = await api.fetch(jsonRequest("https://imoxy.test/api/v1/accounts", "POST",
    { username: "customer_01" }, { cookie: `__Host-imoxy_session=${bearer}` }), env);
  assert.equal(response.status, 403);
  assert.equal(state.mutations.length, 0);
});

test("logout clears the browser session cookie and is idempotent", async () => {
  const { api, env } = fixture();
  const response = await api.fetch(new Request("https://imoxy.test/api/v1/auth/logout", {
    method: "POST",
    headers: { origin: "https://imoxy.test", cookie: `__Host-imoxy_session=${bearer}` }
  }), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});
