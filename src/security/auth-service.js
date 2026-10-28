import {
  createSessionCredential,
  hashPassword,
  hashSessionToken,
  verifyPassword,
  verifySharedSecret
} from "./crypto.js";

export class AuthError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

const unauthorized = () => new AuthError("unauthorized", "Authentication failed.", 401);
const rateLimited = () => new AuthError("rate_limited", "Too many attempts. Try again later.", 429);
const withoutPasswordHash = (principal) => ({
  id: principal.id,
  username: principal.username,
  role: principal.role,
  status: principal.status,
  createdAt: principal.createdAt,
  updatedAt: principal.updatedAt
});

const DUMMY_PASSWORD_HASH = "pbkdf2-sha256$210000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/;

export function createAuthService({
  store,
  idFactory = () => globalThis.crypto.randomUUID(),
  now = () => new Date().toISOString(),
  sessionTtlMs = 12 * 60 * 60 * 1000,
  rateLimitWindowMs = 15 * 60 * 1000,
  maxAttempts = 8
}) {
  const requiredMethods = [
    "findPrincipalByUsername", "countPrincipals", "createInitialOwner",
    "createSession", "findSessionByTokenHash", "touchSession",
    "revokeSession", "consumeAuthAttempt", "clearAuthAttempts"
  ];
  if (!store || requiredMethods.some((method) => typeof store[method] !== "function")) {
    throw new TypeError("A complete authentication storage adapter is required.");
  }
  if (!Number.isSafeInteger(sessionTtlMs) || sessionTtlMs < 60_000) {
    throw new TypeError("Session lifetime must be at least one minute.");
  }
  if (!Number.isSafeInteger(rateLimitWindowMs) || rateLimitWindowMs < 60_000 ||
      !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 100) {
    throw new TypeError("Invalid authentication rate-limit configuration.");
  }

  async function consumeAttempt(rateLimitKeyHash, timestamp) {
    const keyHashes = Array.isArray(rateLimitKeyHash) ? rateLimitKeyHash : [rateLimitKeyHash];
    if (keyHashes.length < 1 || keyHashes.length > 4 ||
        keyHashes.some((key) => typeof key !== "string" || key.length < 32 || key.length > 256)) {
      throw new TypeError("Server-derived opaque rate-limit key hashes are required.");
    }
    const ms = Date.parse(timestamp);
    if (!Number.isFinite(ms)) throw new TypeError("The clock must return a valid UTC timestamp.");
    const windowStartedAt = new Date(Math.floor(ms / rateLimitWindowMs) * rateLimitWindowMs).toISOString();
    const attempts = await Promise.all(keyHashes.map((keyHash) => store.consumeAuthAttempt({
      keyHash, windowStartedAt, now: timestamp
    })));
    if (attempts.some((count) => count > maxAttempts)) throw rateLimited();
  }

  function audit(action, resourceId, actorPrincipalId = null, timestamp = now()) {
    return {
      id: idFactory(),
      actorPrincipalId,
      action,
      resourceId,
      outcome: "success",
      requestId: null,
      details: {},
      createdAt: timestamp
    };
  }

  return {
    async bootstrapOwner({ username, password, providedSecret, bootstrapSecret, rateLimitKeyHash }) {
      if (typeof bootstrapSecret !== "string" || bootstrapSecret.length < 32) {
        throw new AuthError("bootstrap_disabled", "Owner bootstrap is not enabled.", 503);
      }
      const timestamp = now();
      await consumeAttempt(rateLimitKeyHash, timestamp);
      if (!(await verifySharedSecret(providedSecret, bootstrapSecret))) {
        throw new AuthError("forbidden", "The bootstrap credential is invalid.", 403);
      }
      if (typeof username !== "string" || !USERNAME_PATTERN.test(username)) {
        throw new AuthError("validation_failed", "The username is invalid.", 400);
      }
      if (await store.countPrincipals() !== 0) {
        throw new AuthError("bootstrap_closed", "Initial owner setup has already been completed.", 409);
      }

      if (typeof password !== "string" || password.length < 12 || password.length > 1024) {
        throw new AuthError("validation_failed", "The password must contain 12 to 1024 characters.", 400);
      }
      const principal = {
        id: idFactory(),
        username,
        passwordHash: await hashPassword(password),
        role: "owner",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const created = await store.createInitialOwner(
        principal,
        audit("auth.owner_bootstrapped", principal.id, null, timestamp)
      );
      if (!created) {
        throw new AuthError("bootstrap_closed", "Initial owner setup has already been completed.", 409);
      }
      await Promise.all((Array.isArray(rateLimitKeyHash) ? rateLimitKeyHash : [rateLimitKeyHash]).map((keyHash) => store.clearAuthAttempts(keyHash)));
      return withoutPasswordHash(principal);
    },

    async login({ username, password, rateLimitKeyHash }) {
      const timestamp = now();
      await consumeAttempt(rateLimitKeyHash, timestamp);
      const validUsername = typeof username === "string" && USERNAME_PATTERN.test(username);
      const principal = validUsername ? await store.findPrincipalByUsername(username) : null;
      const passwordValid = await verifyPassword(
        typeof password === "string" ? password : "",
        principal?.passwordHash ?? DUMMY_PASSWORD_HASH
      );
      if (!principal || principal.status !== "active" || !passwordValid) throw unauthorized();

      const credential = await createSessionCredential();
      const session = {
        id: idFactory(),
        principalId: principal.id,
        tokenHash: credential.tokenHash,
        createdAt: timestamp,
        expiresAt: new Date(Date.parse(timestamp) + sessionTtlMs).toISOString(),
        lastSeenAt: timestamp
      };
      await store.createSession(session, audit("auth.login", session.id, principal.id, timestamp));
      const keyHashes = Array.isArray(rateLimitKeyHash) ? rateLimitKeyHash : [rateLimitKeyHash];
      await Promise.all(keyHashes.map((keyHash) => store.clearAuthAttempts(keyHash)));
      return {
        principal: withoutPasswordHash(principal),
        token: credential.token,
        expiresAt: session.expiresAt
      };
    },

    async resolveSession(token) {
      if (typeof token !== "string" || token.length < 32 || token.length > 256) throw unauthorized();
      let tokenHash;
      try {
        tokenHash = await hashSessionToken(token);
      } catch {
        throw unauthorized();
      }
      const session = await store.findSessionByTokenHash(tokenHash);
      const currentTime = now();
      const timestamp = Date.parse(currentTime);
      if (!Number.isFinite(timestamp)) throw new TypeError("The clock must return a valid UTC timestamp.");
      if (!session || session.revokedAt || Date.parse(session.expiresAt) <= timestamp ||
          session.principal?.status !== "active") {
        throw unauthorized();
      }
      await store.touchSession(session.id, new Date(timestamp).toISOString());
      return withoutPasswordHash(session.principal);
    },

    async logout(token) {
      if (typeof token !== "string" || token.length < 32 || token.length > 256) return false;
      const tokenHash = await hashSessionToken(token);
      const session = await store.findSessionByTokenHash(tokenHash);
      if (!session || session.revokedAt) return false;
      const timestamp = now();
      return store.revokeSession(
        session.id,
        timestamp,
        audit("auth.logout", session.id, session.principalId, timestamp)
      );
    }
  };
}

const ROLE_PERMISSIONS = Object.freeze({
  owner: new Set(["*"]),
  admin: new Set([
    "account.list", "account.read", "account.create", "account.update", "account.delete",
    "account.credential.rotate",
    "usage.read", "settings.read", "settings.update", "provider.read", "provider.preview",
    "provider.apply", "audit.read", "principal.read",
    "subscription.read", "subscription.create", "subscription.revoke"
  ]),
  operator: new Set([
    "account.list", "account.read", "account.create", "account.update",
    "usage.read", "provider.read", "provider.preview",
    "subscription.read", "subscription.create", "subscription.revoke"
  ]),
  viewer: new Set(["account.list", "account.read", "usage.read", "audit.read"])
});

/** Initial imoxy RBAC policy; reconcile with reference characterization before claiming parity. */
export function authorizeAction(principal, action) {
  if (!principal || principal.status !== "active" || typeof principal.id !== "string") {
    throw new AuthError("unauthorized", "Authentication is required.", 401);
  }
  const permissions = ROLE_PERMISSIONS[principal.role];
  if (!permissions || (!permissions.has("*") && !permissions.has(action))) {
    throw new AuthError("forbidden", "You are not allowed to perform this operation.", 403);
  }
  return principal;
}
