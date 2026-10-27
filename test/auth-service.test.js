import test from "node:test";
import assert from "node:assert/strict";
import { createAuthService, AuthError, authorizeAction } from "../src/security/auth-service.js";
import { hashPassword } from "../src/security/crypto.js";

function fixture({ maxAttempts = 8, sessionTtlMs = 60_000 } = {}) {
  const state = { principals: [], sessions: [], attempts: new Map(), counter: 0 };
  let clock = "2026-10-27T00:00:00.000Z";
  const store = {
    async findPrincipalByUsername(username) {
      return state.principals.find((p) => p.username.toLowerCase() === username.toLowerCase()) ?? null;
    },
    async countPrincipals() { return state.principals.length; },
    async createInitialOwner(principal) {
      if (state.principals.length) return false;
      state.principals.push(principal);
      return true;
    },
    async createSession(session) { state.sessions.push(session); return session; },
    async findSessionByTokenHash(tokenHash) {
      const session = state.sessions.find((item) => item.tokenHash === tokenHash) ?? null;
      if (!session) return null;
      return { ...session, principal: state.principals.find((p) => p.id === session.principalId) };
    },
    async touchSession(id, lastSeenAt) {
      const session = state.sessions.find((item) => item.id === id);
      if (session) session.lastSeenAt = lastSeenAt;
    },
    async revokeSession(id, revokedAt) {
      const session = state.sessions.find((item) => item.id === id);
      if (!session || session.revokedAt) return false;
      session.revokedAt = revokedAt;
      return true;
    },
    async consumeAuthAttempt({ keyHash, windowStartedAt }) {
      const previous = state.attempts.get(keyHash);
      const attempts = previous?.windowStartedAt === windowStartedAt ? previous.attempts + 1 : 1;
      state.attempts.set(keyHash, { windowStartedAt, attempts });
      return attempts;
    },
    async clearAuthAttempts(keyHash) { state.attempts.delete(keyHash); }
  };
  const service = createAuthService({
    store,
    idFactory: () => `id-${++state.counter}`,
    now: () => clock,
    sessionTtlMs,
    maxAttempts
  });
  return { service, store, state, setClock: (value) => { clock = value; } };
}

const rateKey = "opaque-rate-limit-key-hash-0123456789";
const bootstrapSecret = "bootstrap-secret-with-at-least-32-characters";

test("owner bootstrap is one-time and never returns a password hash", async () => {
  const { service, state } = fixture();
  const owner = await service.bootstrapOwner({
    username: "owner_01",
    password: "correct horse battery staple",
    providedSecret: bootstrapSecret,
    bootstrapSecret,
    rateLimitKeyHash: rateKey
  });
  assert.equal(owner.role, "owner");
  assert.equal("passwordHash" in owner, false);
  assert.equal(state.principals.length, 1);
  await assert.rejects(() => service.bootstrapOwner({
    username: "owner_02",
    password: "correct horse battery staple",
    providedSecret: bootstrapSecret,
    bootstrapSecret,
    rateLimitKeyHash: rateKey
  }), (error) => error.code === "bootstrap_closed");
});

test("bootstrap fails closed when disabled or the shared secret is wrong", async () => {
  const { service } = fixture();
  await assert.rejects(() => service.bootstrapOwner({
    username: "owner_01", password: "correct horse battery staple",
    providedSecret: bootstrapSecret, bootstrapSecret: "short",
    rateLimitKeyHash: rateKey
  }), (error) => error.code === "bootstrap_disabled");
  await assert.rejects(() => service.bootstrapOwner({
    username: "owner_01", password: "correct horse battery staple",
    providedSecret: "wrong-bootstrap-secret-with-more-than-32", bootstrapSecret,
    rateLimitKeyHash: rateKey
  }), (error) => error.code === "forbidden");
});

test("login creates a hashed-token session and returns the raw token only once", async () => {
  const { service, state } = fixture();
  const passwordHash = await hashPassword("correct horse battery staple");
  state.principals.push({
    id: "principal-1", username: "owner_01", passwordHash, role: "owner",
    status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
  });
  const result = await service.login({ username: "owner_01", password: "correct horse battery staple", rateLimitKeyHash: rateKey });
  assert.ok(result.token.length >= 40);
  assert.equal("passwordHash" in result.principal, false);
  assert.notEqual(state.sessions[0].tokenHash, result.token);
  assert.equal(result.expiresAt, "2026-10-27T00:01:00.000Z");
});

test("invalid login responses are uniform and attempts are rate limited", async () => {
  const { service, state } = fixture({ maxAttempts: 1 });
  state.principals.push({
    id: "principal-1", username: "owner_01", passwordHash: await hashPassword("correct horse battery staple"),
    role: "owner", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
  });
  await assert.rejects(() => service.login({ username: "missing_user", password: "wrong password", rateLimitKeyHash: rateKey }),
    (error) => error.code === "unauthorized" && error.status === 401);
  await assert.rejects(() => service.login({ username: "owner_01", password: "wrong password", rateLimitKeyHash: rateKey }),
    (error) => error.code === "rate_limited" && error.status === 429);
});

test("session resolution and logout enforce expiry and revocation", async () => {
  const { service, state, setClock } = fixture();
  state.principals.push({
    id: "principal-1", username: "owner_01", passwordHash: await hashPassword("correct horse battery staple"),
    role: "owner", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
  });
  const login = await service.login({ username: "owner_01", password: "correct horse battery staple", rateLimitKeyHash: rateKey });
  assert.equal((await service.resolveSession(login.token)).id, "principal-1");
  assert.equal(await service.logout(login.token), true);
  await assert.rejects(() => service.resolveSession(login.token), (error) => error.code === "unauthorized");

  const second = await service.login({ username: "owner_01", password: "correct horse battery staple", rateLimitKeyHash: rateKey });
  setClock(second.expiresAt);
  await assert.rejects(() => service.resolveSession(second.token), (error) => error.code === "unauthorized");
});

test("RBAC denies inactive principals and role escalation", () => {
  const owner = { id: "p1", role: "owner", status: "active" };
  assert.equal(authorizeAction(owner, "principal.delete"), owner);
  assert.throws(() => authorizeAction({ id: "p2", role: "viewer", status: "active" }, "account.delete"),
    (error) => error.code === "forbidden");
  assert.throws(() => authorizeAction({ id: "p3", role: "admin", status: "disabled" }, "account.read"),
    (error) => error.code === "unauthorized");
});
