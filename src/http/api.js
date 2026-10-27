import { createAccountService, DomainError } from "../domain/account-service.js";
import { ValidationError } from "../domain/validation.js";
import { authorizeAction, AuthError, createAuthService } from "../security/auth-service.js";
import { createD1Store } from "../storage/d1-store.js";

const COOKIE_NAME = "__Host-imoxy_session";
const MAX_BODY_BYTES = 16 * 1024;
const COOKIE_BASE = `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict`;

function response(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      ...headers
    }
  });
}

function makeError(code, message, status, fields) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (fields) error.fields = fields;
  return error;
}

function safeErrorResponse(error, requestId) {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
    ? error.status : 500;
  const code = typeof error?.code === "string" ? error.code : "internal_error";
  const message = status === 500 ? "An internal error occurred." :
    (typeof error?.message === "string" ? error.message : "The request failed.");
  const details = error?.fields && typeof error.fields === "object" ? { fields: error.fields } : {};
  return response({ error: { code, message, requestId, ...details } }, status);
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
    throw makeError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw makeError("payload_too_large", "The request body is too large.", 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw makeError("payload_too_large", "The request body is too large.", 413);
  }
  let value;
  try { value = JSON.parse(text); } catch {
    throw makeError("invalid_json", "The request body is not valid JSON.", 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw makeError("validation_failed", "The request body must be a JSON object.", 400);
  }
  return value;
}

function assertSameOrigin(request, required = false) {
  const origin = request.headers.get("origin");
  if (!origin) {
    if (required) throw makeError("origin_required", "An Origin header is required for cookie-authenticated mutations.", 403);
    return false;
  }
  let parsed;
  try { parsed = new URL(origin); } catch {
    throw makeError("origin_denied", "The request origin is not allowed.", 403);
  }
  if (parsed.origin !== new URL(request.url).origin) {
    throw makeError("origin_denied", "The request origin is not allowed.", 403);
  }
  return true;
}

function cookieToken(request) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === COOKIE_NAME) {
      return { token: part.slice(separator + 1).trim(), source: "cookie" };
    }
  }
  return null;
}

function requestToken(request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization);
    if (!match) throw new AuthError("unauthorized", "Authentication failed.", 401);
    return { token: match[1], source: "bearer" };
  }
  return cookieToken(request);
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function rateLimitKeyHashes(request, action, username, secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw makeError("dependency_unavailable", "Authentication rate limiting is not configured.", 503);
  }
  const key = await globalThis.crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "<invalid>";
  const values = [
    `${action}|ip|${ip}`,
    `${action}|username|${normalizedUsername}`
  ];
  return Promise.all(values.map(async (value) => {
    const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return encodeBase64Url(new Uint8Array(signature));
  }));
}

function requireDatabase(env) {
  if (!env?.DB) throw makeError("dependency_unavailable", "The D1 database binding is not configured.", 503);
}

export function createApiHandler({
  storeFactory = (env) => createD1Store(env.DB),
  authFactory = (store) => createAuthService({ store }),
  accountServiceFactory = (store, authorize) => createAccountService({ store, authorize })
} = {}) {
  return {
    async fetch(request, env = {}) {
      const requestId = globalThis.crypto.randomUUID();
      const url = new URL(request.url);
      try {
        if (request.method === "GET" && url.pathname === "/health") {
          return response({ status: "ok", service: "imoxy-net", requestId });
        }

        if (request.method === "GET" && url.pathname === "/api/v1/capabilities") {
          return response({
            service: "imoxy-net",
            implemented: ["health", "capability-reporting", "authentication-and-session-routes", "account-management-routes"],
            requiresConfiguration: ["D1 binding", "AUTH_RATE_LIMIT_SECRET", "BOOTSTRAP_OWNER_SECRET for initial setup"],
            pending: [
              "quota-enforcement-and-usage-accounting",
              "subscription-formats",
              "proxy-protocols-and-transports",
              "cloudflare-resource-management",
              "telegram-bot",
              "web-panel",
              "android-client"
            ],
            requestId
          });
        }

        const authPath = url.pathname.startsWith("/api/v1/auth/");
        const accountPath = url.pathname === "/api/v1/accounts" || url.pathname.startsWith("/api/v1/accounts/");
        if (!authPath && !accountPath) {
          return response({ error: { code: "not_found", message: "The requested route was not found.", requestId } }, 404);
        }

        requireDatabase(env);
        const store = storeFactory(env);
        const auth = authFactory(store, env);

        if (url.pathname === "/api/v1/auth/bootstrap" && request.method === "POST") {
          assertSameOrigin(request, false);
          const body = await readJson(request);
          const keys = await rateLimitKeyHashes(request, "bootstrap", body.username, env.AUTH_RATE_LIMIT_SECRET);
          const principal = await auth.bootstrapOwner({
            username: body.username,
            password: body.password,
            providedSecret: request.headers.get("x-bootstrap-secret"),
            bootstrapSecret: env.BOOTSTRAP_OWNER_SECRET,
            rateLimitKeyHash: keys
          });
          return response({ principal, requestId }, 201);
        }

        if (url.pathname === "/api/v1/auth/login" && request.method === "POST") {
          const browserRequest = assertSameOrigin(request, false);
          const body = await readJson(request);
          const keys = await rateLimitKeyHashes(request, "login", body.username, env.AUTH_RATE_LIMIT_SECRET);
          const result = await auth.login({ username: body.username, password: body.password, rateLimitKeyHash: keys });
          if (browserRequest) {
            const maxAge = Math.max(0, Math.floor((Date.parse(result.expiresAt) - Date.now()) / 1000));
            return response({ principal: result.principal, expiresAt: result.expiresAt, requestId }, 200, {
              "set-cookie": `${COOKIE_NAME}=${result.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
            });
          }
          return response({ ...result, requestId });
        }

        if (url.pathname === "/api/v1/auth/me" && request.method === "GET") {
          assertSameOrigin(request, false);
          const credential = requestToken(request);
          if (!credential) throw new AuthError("unauthorized", "Authentication failed.", 401);
          const principal = await auth.resolveSession(credential.token);
          return response({ principal, requestId });
        }

        if (url.pathname === "/api/v1/auth/logout" && request.method === "POST") {
          const credential = requestToken(request);
          if (credential?.source === "cookie") assertSameOrigin(request, true);
          else assertSameOrigin(request, false);
          if (credential) await auth.logout(credential.token);
          return response({ success: true, requestId }, 200,
            credential?.source === "cookie" ? { "set-cookie": `${COOKIE_BASE}; Max-Age=0` } : {});
        }

        if (accountPath) {
          const credential = requestToken(request);
          if (credential?.source === "cookie" && request.method !== "GET") assertSameOrigin(request, true);
          else assertSameOrigin(request, false);

          const match = /^\/api\/v1\/accounts(?:\/([^/]+))?$/.exec(url.pathname);
          if (!match) throw makeError("not_found", "The requested route was not found.", 404);
          let accountId = null;
          if (match[1]) {
            try { accountId = decodeURIComponent(match[1]); } catch {
              throw makeError("validation_failed", "The account identifier is invalid.", 400);
            }
            if (!accountId || accountId.length > 128) throw makeError("validation_failed", "The account identifier is invalid.", 400);
          }
          const authorize = async ({ action }) => {
            if (!credential) throw new AuthError("unauthorized", "Authentication failed.", 401);
            const principal = await auth.resolveSession(credential.token);
            return authorizeAction(principal, action);
          };
          const accounts = accountServiceFactory(store, authorize);

          if (request.method === "GET" && !accountId) {
            const limitRaw = url.searchParams.get("limit");
            const limit = limitRaw === null ? 50 : Number(limitRaw);
            const afterId = url.searchParams.get("afterId");
            return response({ ...(await accounts.list({ limit, afterId })), requestId });
          }
          if (request.method === "POST" && !accountId) {
            const body = await readJson(request);
            return response({ account: await accounts.create(body, { requestId }), requestId }, 201);
          }
          if (request.method === "GET" && accountId) {
            return response({ account: await accounts.get(accountId), requestId });
          }
          if (request.method === "PATCH" && accountId) {
            const body = await readJson(request);
            return response({ account: await accounts.update(accountId, body, { requestId }), requestId });
          }
          if (request.method === "DELETE" && accountId) {
            return response({ result: await accounts.delete(accountId, { requestId }), requestId });
          }
          throw makeError("method_not_allowed", "The method is not allowed for this route.", 405);
        }

        throw makeError("not_found", "The requested route was not found.", 404);
      } catch (error) {
        if (error instanceof ValidationError || error instanceof DomainError || error instanceof AuthError) {
          return safeErrorResponse(error, requestId);
        }
        if (Number.isInteger(error?.status) && typeof error?.code === "string") {
          return safeErrorResponse(error, requestId);
        }
        return safeErrorResponse(error, requestId);
      }
    }
  };
}
