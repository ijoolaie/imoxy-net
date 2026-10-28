import { createD1Store } from "../storage/d1-store.js";
import { hashProxyCredential } from "../security/proxy-credentials.js";
import { parseVlessRequest, VlessProtocolError } from "./vless-parser.js";

const DEFAULT_PATH = "/proxy/vless";
const MAX_INITIAL_BUFFER_BYTES = 64 * 1024;

function jsonError(code, message, status) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function isWebSocketUpgrade(request) {
  const upgrade = request.headers.get("upgrade")?.toLowerCase();
  const connection = (request.headers.get("connection") ?? "").toLowerCase().split(",").map((value) => value.trim());
  return upgrade === "websocket" &&
    connection.includes("upgrade") &&
    request.headers.get("sec-websocket-version") === "13" &&
    Boolean(request.headers.get("sec-websocket-key"));
}

function pathFor(env) {
  const path = env?.PROXY_WS_PATH ?? DEFAULT_PATH;
  if (typeof path !== "string" || !/^\/[a-zA-Z0-9/_-]{1,127}$/.test(path) || path.includes("//") || path.includes("..")) {
    return null;
  }
  return path;
}

function parsePolicyList(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function isClearlyPrivateDestination(host) {
  const normalized = host.toLowerCase().replace(/\.$/, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost") ||
      normalized.endsWith(".local") || normalized.endsWith(".internal")) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(normalized);
  if (ipv4) {
    const octets = ipv4.slice(1).map(Number);
    if (octets.some((value) => value > 255)) return true;
    const [a, b] = octets;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
  }

  if (normalized.includes(":")) {
    const groups = normalized.split(":").map((value) => Number.parseInt(value || "0", 16));
    const first = groups[0] ?? 0;
    return first === 0 || (first & 0xfe00) === 0xfc00 ||
      (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
  }
  return false;
}

function destinationAllowed(host, port, env) {
  if (isClearlyPrivateDestination(host)) return false;
  const hosts = parsePolicyList(env?.PROXY_ALLOWED_HOSTS).map((value) => value.toLowerCase().replace(/\.$/, ""));
  const ports = parsePolicyList(env?.PROXY_ALLOWED_PORTS).map(Number);
  return hosts.includes(host.toLowerCase().replace(/\.$/, "")) &&
    ports.some((allowedPort) => Number.isInteger(allowedPort) && allowedPort === port);
}

function accountIsUsable(account, now) {
  if (!account || account.status !== "active") return false;
  if (account.expiresAt === null || account.expiresAt === undefined || account.expiresAt === "") return true;
  const expiresAt = Date.parse(account.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

async function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  if (typeof Blob !== "undefined" && data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  throw new TypeError("VLESS WebSocket messages must be binary.");
}

function concatBytes(left, right) {
  const joined = new Uint8Array(left.byteLength + right.byteLength);
  joined.set(left, 0);
  joined.set(right, left.byteLength);
  return joined;
}

async function cloudflareTcpConnect({ hostname, port }) {
  const { connect } = await import("cloudflare:sockets");
  return connect({ hostname, port });
}

function createWebSocketPair() {
  if (typeof globalThis.WebSocketPair !== "function") {
    throw new TypeError("The Cloudflare WebSocketPair runtime is unavailable.");
  }
  return new globalThis.WebSocketPair();
}

function createUpgradeResponse(client) {
  return new Response(null, { status: 101, webSocket: client });
}

/**
 * Restricted VLESS-over-WebSocket TCP prototype.
 *
 * Requires explicit host/port allowlists and authenticates the credential before
 * opening an upstream TCP socket. This is not a full Nova-compatible proxy and
 * intentionally does not claim quota enforcement or usage accounting.
 */
export function createVlessWebSocketHandler({
  storeFactory = (env) => createD1Store(env.DB),
  credentialHasher = hashProxyCredential,
  connectTcp = cloudflareTcpConnect,
  webSocketPairFactory = createWebSocketPair,
  upgradeResponseFactory = createUpgradeResponse,
  now = () => Date.now()
} = {}) {
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      const path = pathFor(env);
      if (!path) {
        return url.pathname === DEFAULT_PATH
          ? jsonError("proxy_path_misconfigured", "The proxy WebSocket path is invalid.", 503)
          : null;
      }
      if (url.pathname !== path) return null;
      if (request.method !== "GET") return jsonError("method_not_allowed", "The method is not allowed for this route.", 405);
      if (!isWebSocketUpgrade(request)) return jsonError("websocket_upgrade_required", "A valid WebSocket upgrade is required.", 426);
      if (!env.DB || typeof env.PROXY_ALLOWED_HOSTS !== "string" ||
          !env.PROXY_ALLOWED_HOSTS.trim() || typeof env.PROXY_ALLOWED_PORTS !== "string" ||
          !env.PROXY_ALLOWED_PORTS.trim()) {
        return jsonError("proxy_not_configured", "The proxy credential store and destination allowlist must be configured.", 503);
      }

      let store;
      try {
        store = storeFactory(env);
      } catch {
        return jsonError("proxy_storage_unavailable", "The proxy credential store is unavailable.", 503);
      }
      if (typeof store?.findAccountByCredentialHash !== "function") {
        return jsonError("proxy_storage_unavailable", "The proxy credential lookup is unavailable.", 503);
      }

      let pair;
      let client;
      let server;
      try {
        pair = webSocketPairFactory();
        const sockets = Array.isArray(pair) ? pair : Object.values(pair ?? {});
        if (sockets.length !== 2 || !sockets[0] || !sockets[1]) throw new TypeError("Invalid WebSocketPair.");
        [client, server] = sockets;
        server.accept();
      } catch {
        return jsonError("websocket_runtime_unavailable", "The WebSocket runtime is unavailable.", 503);
      }

      const state = {
        closed: false,
        authenticated: false,
        buffer: new Uint8Array(),
        socket: null,
        reader: null,
        writer: null,
        writeQueue: Promise.resolve()
      };

      const closeSession = async (code = 1000, reason = "closed") => {
        if (state.closed) return;
        state.closed = true;
        try { server.close(code, reason); } catch {}
        try { await state.reader?.cancel(); } catch {}
        try { await state.writer?.abort(); } catch {}
        try { await state.socket?.close(); } catch {}
      };

      const pumpUpstream = async () => {
        try {
          while (!state.closed && state.reader) {
            const { value, done } = await state.reader.read();
            if (done) break;
            if (value?.byteLength && !state.closed) server.send(value);
          }
          await closeSession(1000, "upstream_closed");
        } catch {
          await closeSession(1011, "upstream_error");
        }
      };

      const handleMessage = async (data) => {
        if (state.closed) return;
        let bytes;
        try {
          bytes = await toBytes(data);
        } catch {
          await closeSession(1003, "binary_messages_required");
          return;
        }

        if (!state.authenticated) {
          state.buffer = concatBytes(state.buffer, bytes);
          if (state.buffer.byteLength > MAX_INITIAL_BUFFER_BYTES) {
            await closeSession(1009, "initial_request_too_large");
            return;
          }

          let parsed;
          try {
            parsed = parseVlessRequest(state.buffer);
          } catch (error) {
            if (error instanceof VlessProtocolError && error.code === "incomplete_request") return;
            await closeSession(1002, "invalid_vless_request");
            return;
          }

          try {
            const credentialHash = await credentialHasher(parsed.uuid);
            const match = await store.findAccountByCredentialHash(credentialHash);
            const account = match?.account;
            if (!accountIsUsable(account, now())) {
              await closeSession(1008, "invalid_credential");
              return;
            }
            if (!destinationAllowed(parsed.host, parsed.port, env)) {
              await closeSession(1008, "destination_not_allowed");
              return;
            }

            const socket = await connectTcp({ hostname: parsed.host, port: parsed.port }, env);
            if (!socket?.readable || !socket?.writable || typeof socket.close !== "function") {
              try { await socket?.close?.(); } catch {}
              await closeSession(1011, "upstream_unavailable");
              return;
            }
            state.socket = socket;
            state.writer = socket.writable.getWriter();
            if (parsed.initialPayload.byteLength) await state.writer.write(parsed.initialPayload);
            state.authenticated = true;
            server.send(Uint8Array.from([parsed.version, 0]));
            state.buffer = new Uint8Array();
            state.reader = socket.readable.getReader();
            void pumpUpstream();
          } catch {
            await closeSession(1011, "proxy_session_failed");
          }
          return;
        }

        try {
          await state.writer.write(bytes);
        } catch {
          await closeSession(1011, "upstream_write_failed");
        }
      };

      server.addEventListener("message", (event) => {
        state.writeQueue = state.writeQueue.then(() => handleMessage(event.data)).catch(() => closeSession(1011, "proxy_session_failed"));
      });
      server.addEventListener("close", () => { void closeSession(1000, "client_closed"); });
      server.addEventListener("error", () => { void closeSession(1011, "websocket_error"); });

      try {
        return upgradeResponseFactory(client);
      } catch {
        await closeSession(1011, "upgrade_failed");
        return jsonError("websocket_runtime_unavailable", "The WebSocket runtime is unavailable.", 503);
      }
    }
  };
}
