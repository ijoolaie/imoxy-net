import { createSessionCredential, hashSessionToken } from "../security/crypto.js";
import { DomainError } from "./account-service.js";

const ALLOWED_FORMATS = new Set(["auto", "base64"]);

function fail(code, message, status) {
  return new DomainError(code, message, status);
}

function parseUtc(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = new Date(parsed).toISOString();
  return normalized.slice(0, 10) === value.slice(0, 10) ? normalized : null;
}

function normalizeFormats(formats) {
  const values = formats === undefined ? ["auto"] : formats;
  if (!Array.isArray(values) || values.length < 1 || values.length > ALLOWED_FORMATS.size ||
      values.some((value) => typeof value !== "string" || !ALLOWED_FORMATS.has(value)) ||
      new Set(values).size !== values.length) {
    throw fail("validation_failed", "The requested subscription formats are not supported.", 400);
  }
  return values;
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function publicSubscription(item) {
  return {
    id: item.id,
    accountId: item.accountId,
    formats: item.formats,
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    revokedAt: item.revokedAt,
    lastAccessedAt: item.lastAccessedAt
  };
}

export function createSubscriptionService({
  store,
  authorize,
  getEntries,
  idFactory = () => globalThis.crypto.randomUUID(),
  now = () => new Date().toISOString()
}) {
  const requiredMethods = [
    "getAccount", "listSubscriptions", "getSubscriptionById", "createSubscription",
    "findSubscriptionByTokenHash", "touchSubscription", "revokeSubscription"
  ];
  if (!store || requiredMethods.some((method) => typeof store[method] !== "function")) {
    throw new TypeError("A complete subscription storage adapter is required.");
  }
  if (typeof authorize !== "function") throw new TypeError("An explicit authorization policy is required.");
  if (typeof getEntries !== "function") throw new TypeError("A proxy-entry provider is required.");

  async function principalFor(action, resourceId = null) {
    const principal = await authorize({ action, resourceType: "subscription", resourceId });
    if (!principal || typeof principal.id !== "string" || !principal.id) {
      throw fail("forbidden", "You are not allowed to perform this operation.", 403);
    }
    return principal;
  }

  function audit(principal, action, resourceId, timestamp) {
    return {
      id: idFactory(),
      actorPrincipalId: principal?.id ?? null,
      action,
      resourceId,
      outcome: "success",
      requestId: null,
      details: {},
      createdAt: timestamp
    };
  }

  return {
    async list(accountId) {
      await principalFor("subscription.read", accountId);
      if (!(await store.getAccount(accountId))) throw fail("not_found", "The requested account was not found.", 404);
      return (await store.listSubscriptions(accountId)).map(publicSubscription);
    },

    async create(accountId, input = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw fail("validation_failed", "The subscription request must be an object.", 400);
      }
      const unknownFields = Object.keys(input).filter((key) => !["formats", "expiresAt"].includes(key));
      if (unknownFields.length) {
        throw fail("validation_failed", "The subscription request contains unsupported fields.", 400);
      }
      const principal = await principalFor("subscription.create", accountId);
      const account = await store.getAccount(accountId);
      if (!account) throw fail("not_found", "The requested account was not found.", 404);
      const timestamp = now();
      const timestampMs = Date.parse(timestamp);
      if (!Number.isFinite(timestampMs)) throw new TypeError("The clock must return a valid timestamp.");
      if (account.status !== "active") throw fail("account_inactive", "Subscriptions cannot be issued for an inactive account.", 409);
      if (account.expiresAt && Date.parse(account.expiresAt) <= timestampMs) {
        throw fail("account_expired", "Subscriptions cannot be issued for an expired account.", 409);
      }

      const formats = normalizeFormats(input.formats);
      let expiresAt = null;
      if (input.expiresAt !== undefined && input.expiresAt !== null) {
        expiresAt = parseUtc(input.expiresAt);
        if (!expiresAt || Date.parse(expiresAt) <= timestampMs) {
          throw fail("validation_failed", "expiresAt must be a future UTC timestamp or null.", 400);
        }
      }
      if (account.expiresAt) {
        const accountExpiry = parseUtc(account.expiresAt);
        if (accountExpiry && (!expiresAt || Date.parse(accountExpiry) < Date.parse(expiresAt))) {
          expiresAt = accountExpiry;
        }
      }

      const credential = await createSessionCredential();
      const subscription = {
        id: idFactory(),
        accountId,
        tokenHash: credential.tokenHash,
        formats,
        createdAt: timestamp,
        expiresAt,
        revokedAt: null,
        lastAccessedAt: null
      };
      const saved = await store.createSubscription(
        subscription,
        audit(principal, "subscription.created", subscription.id, timestamp)
      );
      if (!saved) throw fail("persistence_failed", "The subscription could not be persisted.", 500);
      return { ...publicSubscription(saved), token: credential.token };
    },

    async revoke(subscriptionId) {
      const principal = await principalFor("subscription.revoke", subscriptionId);
      const subscription = await store.getSubscriptionById(subscriptionId);
      if (!subscription) throw fail("not_found", "The requested subscription was not found.", 404);
      if (subscription.revokedAt) return { id: subscriptionId, revoked: true, alreadyRevoked: true };
      const timestamp = now();
      const revoked = await store.revokeSubscription(
        subscriptionId, timestamp, audit(principal, "subscription.revoked", subscriptionId, timestamp)
      );
      if (!revoked) {
        const current = await store.getSubscriptionById(subscriptionId);
        if (current?.revokedAt) return { id: subscriptionId, revoked: true, alreadyRevoked: true };
        throw fail("not_found", "The requested subscription was not found.", 404);
      }
      return { id: subscriptionId, revoked: true, alreadyRevoked: false };
    },

    async serve(token, format = "auto") {
      if (typeof token !== "string" || token.length < 32 || token.length > 256) {
        throw fail("not_found", "The subscription link is invalid or unavailable.", 404);
      }
      if (!ALLOWED_FORMATS.has(format)) throw fail("not_acceptable", "The requested subscription format is not supported.", 406);
      const tokenHash = await hashSessionToken(token);
      const subscription = await store.findSubscriptionByTokenHash(tokenHash);
      const timestamp = Date.parse(now());
      if (!Number.isFinite(timestamp)) throw fail("dependency_unavailable", "The service clock is unavailable.", 503);
      if (!subscription || subscription.revokedAt ||
          (subscription.expiresAt && Date.parse(subscription.expiresAt) <= timestamp) ||
          subscription.account?.status !== "active" ||
          (subscription.account?.expiresAt && Date.parse(subscription.account.expiresAt) <= timestamp)) {
        throw fail("not_found", "The subscription link is invalid or unavailable.", 404);
      }
      if (!subscription.formats.includes(format)) throw fail("not_acceptable", "This subscription does not permit the requested format.", 406);
      const entries = await getEntries(subscription.accountId);
      if (!Array.isArray(entries) || entries.some((entry) =>
        typeof entry !== "string" || entry.length > 4096 ||
        !/^(?:vless|trojan|ss):\/\/[^\r\n]+$/i.test(entry)
      )) {
        throw fail("dependency_unavailable", "Subscription entries are unavailable or invalid.", 503);
      }
      const plainText = entries.length ? entries.join("\n") + "\n" : "";
      const body = format === "base64" ? base64Utf8(plainText) : plainText;
      await store.touchSubscription(subscription.id, now());
      return { body, format, subscriptionId: subscription.id };
    }
  };
}
