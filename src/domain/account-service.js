import { validateAccountInput, ValidationError } from "./validation.js";
import { generateProxyCredential, hashProxyCredential, isProxyCredential, isProxyCredentialHash } from "../security/proxy-credentials.js";

export class DomainError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}

const notFound = () => new DomainError("not_found", "The requested account was not found.", 404);
const forbidden = () => new DomainError("forbidden", "You are not allowed to perform this operation.", 403);

export function createAccountService({
  store,
  authorize,
  idFactory = () => globalThis.crypto.randomUUID(),
  credentialFactory = generateProxyCredential,
  credentialHasher = hashProxyCredential,
  now = () => new Date().toISOString()
}) {
  if (!store || typeof store.getAccount !== "function" ||
      typeof store.listAccounts !== "function" ||
      typeof store.createAccount !== "function" ||
      typeof store.rotateCredential !== "function" ||
      typeof store.updateAccount !== "function" ||
      typeof store.deleteAccount !== "function") {
    throw new TypeError("An account storage adapter is required.");
  }
  if (typeof authorize !== "function") {
    throw new TypeError("An explicit authorization policy is required.");
  }

  async function principalFor(action, resourceId = null) {
    const principal = await authorize({ action, resourceType: "proxy_account", resourceId });
    if (!principal || typeof principal.id !== "string" || !principal.id) throw forbidden();
    return principal;
  }

  function audit(principal, action, resourceId, context = {}) {
    return {
      id: idFactory(),
      actorPrincipalId: principal.id,
      action,
      resourceId,
      outcome: "success",
      requestId: typeof context.requestId === "string" ? context.requestId : null,
      details: {},
      createdAt: now()
    };
  }

  return {
    async list({ limit = 50, afterId = null } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        throw new ValidationError({ limit: "must_be_an_integer_from_1_to_100" });
      }
      if (afterId !== null && (typeof afterId !== "string" || afterId.length > 128)) {
        throw new ValidationError({ afterId: "must_be_a_string_up_to_128_characters" });
      }
      await principalFor("account.list");
      return store.listAccounts({ limit, afterId });
    },

    async get(id) {
      await principalFor("account.read", id);
      const account = await store.getAccount(id);
      if (!account) throw notFound();
      return account;
    },

    async create(input, context = {}) {
      const principal = await principalFor("account.create");
      const values = validateAccountInput(input);
      const timestamp = now();
      const account = {
        id: idFactory(),
        username: values.username,
        status: values.status ?? "active",
        expiresAt: values.expiresAt ?? null,
        quotaBytes: values.quotaBytes ?? null,
        dailyQuotaBytes: values.dailyQuotaBytes ?? null,
        speedLimitKbps: values.speedLimitKbps ?? null,
        maxConnections: values.maxConnections ?? null,
        notes: values.notes ?? "",
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const credential = credentialFactory();
      if (!isProxyCredential(credential)) throw new TypeError("The proxy credential factory returned an invalid credential.");
      const credentialHash = await credentialHasher(credential);
      if (!isProxyCredentialHash(credentialHash)) throw new TypeError("The proxy credential hasher must return a SHA-256 hex digest.");
      const credentialRecord = {
        id: idFactory(),
        accountId: account.id,
        credentialHash,
        createdAt: timestamp
      };
      const saved = await store.createAccount(
        account,
        audit(principal, "account.created", account.id, context),
        credentialRecord
      );
      if (!saved) throw new DomainError("persistence_failed", "The account could not be persisted.", 500);
      // Return the raw credential only in the creation response. It is never stored.
      return { ...saved, credential };
    },

    async rotateCredential(id, context = {}) {
      const principal = await principalFor("account.credential.rotate", id);
      const account = await store.getAccount(id);
      if (!account) throw notFound();
      const timestamp = now();
      const credential = credentialFactory();
      if (!isProxyCredential(credential)) throw new TypeError("The proxy credential factory returned an invalid credential.");
      const credentialHash = await credentialHasher(credential);
      if (!isProxyCredentialHash(credentialHash)) throw new TypeError("The proxy credential hasher must return a SHA-256 hex digest.");
      const credentialRecord = {
        id: idFactory(),
        accountId: id,
        credentialHash,
        createdAt: timestamp
      };
      const rotated = await store.rotateCredential(
        id,
        credentialRecord,
        audit(principal, "account.credential.rotated", id, context)
      );
      if (!rotated) throw notFound();
      return { accountId: id, credential, createdAt: timestamp };
    },

    async update(id, input, context = {}) {
      const principal = await principalFor("account.update", id);
      const changes = validateAccountInput(input, { partial: true });
      const saved = await store.updateAccount(
        id,
        changes,
        audit(principal, "account.updated", id, context)
      );
      if (!saved) throw notFound();
      return saved;
    },

    async delete(id, context = {}) {
      const principal = await principalFor("account.delete", id);
      const deleted = await store.deleteAccount(
        id,
        audit(principal, "account.deleted", id, context)
      );
      if (!deleted) throw notFound();
      return { id, deleted: true };
    }
  };
}
