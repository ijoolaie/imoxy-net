import { createD1Store } from "../storage/d1-store.js";
import { hashProxyCredential } from "../security/proxy-credentials.js";
import { createQuotaReservationService } from "../domain/quota-reservation-service.js";
import { parseVlessRequest, VlessProtocolError } from "./vless-parser.js";

const DEFAULT_PATH = "/proxy/vless";
const MAX_INITIAL_BUFFER_BYTES = 64 * 1024;
const MAX_QUEUED_CLIENT_BYTES = 1024 * 1024;
const MAX_DIAL_CANDIDATES = 8;
const SESSION_CLOSED = Symbol("session_closed");
const DEFAULT_INITIAL_HANDSHAKE_TIMEOUT_MS = 10_000;
const DEFAULT_IDLE_TIMEOUT_MS = 120_000;
const MAX_SESSION_TIMER_MS = 2_147_483_647;

function emitDiagnostic(onDiagnostic, event, fields = {}) {
  if (typeof onDiagnostic !== "function") return;
  try { onDiagnostic({ event, ...fields }); } catch {}
}

async function measureDiagnostic(onDiagnostic, stage, fields, operation) {
  const startedAt = globalThis.performance?.now?.() ?? Date.now();
  emitDiagnostic(onDiagnostic, `${stage}.start`, fields);
  try {
    const result = await operation();
    const endedAt = globalThis.performance?.now?.() ?? Date.now();
    emitDiagnostic(onDiagnostic, `${stage}.complete`, {
      ...fields, durationMs: Math.max(0, endedAt - startedAt)
    });
    return result;
  } catch (error) {
    const endedAt = globalThis.performance?.now?.() ?? Date.now();
    emitDiagnostic(onDiagnostic, `${stage}.error`, {
      ...fields, durationMs: Math.max(0, endedAt - startedAt),
      errorName: typeof error?.name === "string" ? error.name : "Error"
    });
    throw error;
  }
}

function positiveIntegerSetting(value, maximum = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

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
  // The proxy handler runs before API and static-asset routing. Never let a
  // custom proxy path shadow the Worker's reserved API or health endpoints.
  if (path === "/api" || path.startsWith("/api/") || path === "/health") return null;
  return path;
}

function parsePolicyList(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseIPv6Groups(address) {
  if (typeof address !== "string" || !address || address.includes("%") || address.includes(".")) return null;
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const isHexGroup = (group) => group.length >= 1 && group.length <= 4 &&
    [...group].every((character) =>
      (character >= "0" && character <= "9") ||
      (character.toLowerCase() >= "a" && character.toLowerCase() <= "f")
    );
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];
    const present = [...left, ...right];
    if (present.length >= 8 || !present.every(isHexGroup)) return null;
    const zeros = Array(8 - present.length).fill("0");
    return [...left, ...zeros, ...right].map((group) => Number.parseInt(group, 16));
  }
  const groups = address.split(":");
  if (groups.length !== 8 || !groups.every(isHexGroup)) return null;
  return groups.map((group) => Number.parseInt(group, 16));
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
    const [, , c, d] = octets;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 31 && c === 196) || // AS112-v4
      (a === 192 && b === 52 && c === 193) || // AMT
      (a === 192 && b === 88 && c === 99) ||
      (a === 192 && b === 175 && c === 48) || // AS112 direct delegation
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      (a === 255 && b === 255 && c === 255 && d === 255);
  }

  if (normalized.includes(":")) {
    const groups = parseIPv6Groups(normalized);
    if (!groups) return true;
    const [first, second] = groups;
    // NAT64 prefixes can encode IPv4 destinations in global-unicast IPv6.
    // Reject the RFC 6052 well-known and RFC 8215 local-use prefixes so an
    // embedded non-public IPv4 address cannot bypass the IPv4 destination checks.
    if (first === 0x0064 && second === 0xff9b &&
        (groups[2] === 0x0001 ||
         (groups[2] === 0 && groups[3] === 0 && groups[4] === 0 && groups[5] === 0))) return true;
    // Permit only global-unicast space (2000::/3), then fail closed on
    // well-known special-purpose ranges and transition/documentation prefixes.
    if (first < 0x2000 || first > 0x3fff) return true;
    if (first === 0x2001 && second <= 0x01ff) return true; // IETF protocol assignments
    if (first === 0x2001 && second >= 0x0020 && second <= 0x002f) return true; // ORCHIDv2
    if (first === 0x2001 && second === 0x0db8) return true; // documentation
    if (first === 0x2002) return true; // 6to4 embeds IPv4 addresses
    if (first === 0x3fff && second <= 0x0fff) return true; // documentation
    return false;
  }
  return false;
}

function isValidNumericAddress(address) {
  if (typeof address !== "string" || !address || address.includes("%")) return false;
  const octets = address.split(".");
  if (octets.length === 4 && octets.every((part) =>
    part.length > 0 && part.length <= 3 &&
    [...part].every((character) => character >= "0" && character <= "9") &&
    Number(part) <= 255
  )) return true;
  return parseIPv6Groups(address) !== null;
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

function messageByteLength(data) {
  if (data instanceof ArrayBuffer) return data.byteLength;
  if (ArrayBuffer.isView(data)) return data.byteLength;
  if (typeof Blob !== "undefined" && data instanceof Blob) return data.size;
  return null;
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

async function cloudflareTcpConnect({ hostname, port }, _env, signal) {
  const { connect } = await import("cloudflare:sockets");
  if (signal?.aborted) {
    const error = new Error("TCP connection was cancelled.");
    error.name = "AbortError";
    throw error;
  }
  // Workers connect() returns the Socket synchronously; only the module load
  // above can be pending before a socket handle exists and can be closed.
  return connect({ hostname, port });
}

function normalizeNumericAddress(address) {
  if (!isValidNumericAddress(address)) return null;
  const octets = address.split(".");
  if (octets.length === 4) return octets.map(Number).join(".");
  const groups = parseIPv6Groups(address);
  return groups ? groups.map((group) => group.toString(16)).join(":") : null;
}

function sameNumericAddress(left, right) {
  if (!isValidNumericAddress(left) || !isValidNumericAddress(right)) return false;
  const leftV4 = left.split(".");
  const rightV4 = right.split(".");
  if (leftV4.length === 4 && rightV4.length === 4) {
    return leftV4.every((part, index) => Number(part) === Number(rightV4[index]));
  }
  const leftV6 = parseIPv6Groups(left);
  const rightV6 = parseIPv6Groups(right);
  return Boolean(leftV6 && rightV6 && leftV6.every((group, index) => group === rightV6[index]));
}

export async function resolvePublicDestinations(host, fetchImpl = globalThis.fetch) {
  if (isValidNumericAddress(host)) {
    const normalized = normalizeNumericAddress(host);
    if (isClearlyPrivateDestination(normalized)) throw new TypeError("Destination address is not public.");
    return [normalized];
  }
  if (typeof host !== "string") throw new TypeError("Destination hostname is invalid.");
  const normalizedHost = host.replace(/\.$/, "");
  if (!/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(normalizedHost) ||
      normalizedHost.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
    throw new TypeError("Destination hostname is invalid.");
  }

  const query = async (type) => {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(normalizedHost)}&type=${type}`;
    const response = await fetchImpl(url, {
      headers: { accept: "application/dns-json" },
      redirect: "error"
    });
    if (!response?.ok) throw new TypeError("DNS resolution failed.");
    const body = await response.json();
    if (body?.Status !== 0) throw new TypeError("DNS resolution failed.");
    return Array.isArray(body.Answer) ? body.Answer : [];
  };

  const answers = await Promise.allSettled([query("A"), query("AAAA")]);
  const addresses = [];
  for (const result of answers) {
    if (result.status !== "fulfilled") continue;
    for (const answer of result.value) {
      if (answer?.type !== 1 && answer?.type !== 28) continue;
      const address = normalizeNumericAddress(answer.data);
      if (!address) continue;
      const isIPv4Address = address.includes(".");
      // DNS JSON records must match their declared address family. Do not
      // accept malformed/mislabelled answers as a validated dial candidate.
      if ((answer.type === 1 && !isIPv4Address) || (answer.type === 28 && isIPv4Address)) continue;
      if (!isClearlyPrivateDestination(address)) addresses.push(address);
    }
  }
  const uniqueAddresses = [...new Set(addresses)];
  if (uniqueAddresses.length === 0) throw new TypeError("No public destination address was resolved.");
  return uniqueAddresses;
}

export async function resolvePublicDestination(host, fetchImpl = globalThis.fetch) {
  return (await resolvePublicDestinations(host, fetchImpl))[0];
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
 * opening an upstream TCP socket. It reserves and settles usage around each
 * forwarded chunk, but remains a restricted prototype pending real D1/Worker
 * validation, stronger destination resolution controls, backpressure and limits.
 * It is not a full Nova-compatible proxy and is not production-ready.
 */
export function createVlessWebSocketHandler({
  storeFactory = (env) => createD1Store(env.DB),
  credentialHasher = hashProxyCredential,
  quotaServiceFactory = ({ store }) => createQuotaReservationService({ store }),
  idFactory = () => globalThis.crypto.randomUUID(),
  connectTcp = cloudflareTcpConnect,
  resolveDestination = (host) => resolvePublicDestinations(host),
  webSocketPairFactory = createWebSocketPair,
  upgradeResponseFactory = createUpgradeResponse,
  now = () => Date.now(),
  initialHandshakeTimeoutMs = DEFAULT_INITIAL_HANDSHAKE_TIMEOUT_MS,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  onDiagnostic = null
} = {}) {
  return {
    async fetch(request, env = {}, executionContext = null) {
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
      const maxDownloadBytes = positiveIntegerSetting(env.PROXY_MAX_DOWNLOAD_BYTES);
      const maxSessionDurationMs = positiveIntegerSetting(env.PROXY_MAX_SESSION_DURATION_MS, MAX_SESSION_TIMER_MS);
      const maxConcurrentSessions = positiveIntegerSetting(env.PROXY_MAX_CONCURRENT_SESSIONS);
      const sessionLeaseGraceMs = positiveIntegerSetting(env.PROXY_SESSION_LEASE_GRACE_MS, MAX_SESSION_TIMER_MS);
      if (maxDownloadBytes === null || maxSessionDurationMs === null ||
          maxConcurrentSessions === null || sessionLeaseGraceMs === null) {
        return jsonError("proxy_limits_not_configured", "Positive safe-integer PROXY_MAX_DOWNLOAD_BYTES, PROXY_MAX_SESSION_DURATION_MS, PROXY_MAX_CONCURRENT_SESSIONS, and PROXY_SESSION_LEASE_GRACE_MS settings are required.", 503);
      }

      if (!env.DB || typeof env.PROXY_ALLOWED_HOSTS !== "string" ||
          !env.PROXY_ALLOWED_HOSTS.trim() || typeof env.PROXY_ALLOWED_PORTS !== "string" ||
          !env.PROXY_ALLOWED_PORTS.trim() || typeof env.PROXY_USAGE_PRODUCER_ID !== "string" ||
          !/^[a-zA-Z0-9._:-]{1,128}$/.test(env.PROXY_USAGE_PRODUCER_ID)) {
        return jsonError("proxy_not_configured", "The proxy credential store, destination allowlist, and stable usage producer ID must be configured.", 503);
      }

      let store;
      try {
        store = storeFactory(env);
      } catch {
        return jsonError("proxy_storage_unavailable", "The proxy credential store is unavailable.", 503);
      }
      if (typeof store?.findAccountByCredentialHash !== "function" ||
          typeof store?.acquireProxySession !== "function" ||
          typeof store?.releaseProxySession !== "function") {
        return jsonError("proxy_storage_unavailable", "The proxy credential lookup and session-admission storage are unavailable.", 503);
      }

      let quotaService;
      try {
        quotaService = quotaServiceFactory({ store });
      } catch {
        return jsonError("proxy_storage_unavailable", "The quota reservation store is unavailable.", 503);
      }
      if (typeof quotaService?.reserve !== "function" || typeof quotaService?.settle !== "function" ||
          typeof quotaService?.markForwarding !== "function") {
        return jsonError("proxy_storage_unavailable", "The quota reservation service is unavailable.", 503);
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

      let resolveSessionClosed;
      const sessionClosed = new Promise((resolve) => { resolveSessionClosed = resolve; });
      const state = {
        closed: false,
        authenticated: false,
        buffer: new Uint8Array(),
        socket: null,
        pendingSocket: null,
        pendingConnectPromise: null,
        pendingConnectAbortController: null,
        reader: null,
        writer: null,
        writeQueue: Promise.resolve(),
        pendingWritePromise: null,
        queuedClientBytes: 0,
        downloadBytesForwarded: 0,
        accountId: null,
        sessionId: null,
        sessionLeaseAcquired: false,
        sessionLeaseReleaseStarted: false,
        requestCountClaimed: false
      };
      let handshakeTimer = null;
      let idleTimer = null;
      let sessionTimer = null;
      let idleTimerGeneration = 0;

      const releaseSessionLease = async () => {
        if (!state.sessionLeaseAcquired || state.sessionLeaseReleaseStarted) return;
        state.sessionLeaseReleaseStarted = true;
        const releaseStartedAt = globalThis.performance?.now?.() ?? Date.now();
        emitDiagnostic(onDiagnostic, "session.lease_release.start");
        try {
          const released = await store.releaseProxySession({ sessionId: state.sessionId, accountId: state.accountId });
          const releaseEndedAt = globalThis.performance?.now?.() ?? Date.now();
          emitDiagnostic(onDiagnostic, "session.lease_release.complete", {
            released: released === true,
            durationMs: Math.max(0, releaseEndedAt - releaseStartedAt)
          });
        } catch (error) {
          const releaseEndedAt = globalThis.performance?.now?.() ?? Date.now();
          emitDiagnostic(onDiagnostic, "session.lease_release.error", {
            durationMs: Math.max(0, releaseEndedAt - releaseStartedAt),
            errorName: typeof error?.name === "string" ? error.name : "Error"
          });
          // Keep an uncertain lease counted until its expiry; never free capacity
          // based on an ambiguous release outcome.
        }
      };

      const closeSession = async (code = 1000, reason = "closed") => {
        if (state.closed) return;
        emitDiagnostic(onDiagnostic, "session.close.start", { code, reason });
        state.closed = true;
        resolveSessionClosed(SESSION_CLOSED);
        if (handshakeTimer !== null) {
          try { clearTimeoutImpl(handshakeTimer); } catch {}
          handshakeTimer = null;
        }
        idleTimerGeneration += 1;
        if (sessionTimer !== null) {
          try { clearTimeoutImpl(sessionTimer); } catch {}
          sessionTimer = null;
        }
        if (idleTimer !== null) {
          try { clearTimeoutImpl(idleTimer); } catch {}
          idleTimer = null;
        }
        try { server.close(code, reason); } catch {}
        // A connect attempt may still be creating a socket. Wait for its tracked
        // completion: if it resolves after closure, its continuation closes the
        // late socket before the promise settles. This keeps lease release behind
        // every in-flight dial cleanup, not only sockets already assigned below.
        // Ask a cooperative connector to stop before it creates a socket.
        // The default Workers adapter checks this after loading cloudflare:sockets
        // and before calling the synchronous connect() API.
        try { state.pendingConnectAbortController?.abort(); } catch {}
        const pendingConnect = state.pendingConnectPromise;
        if (pendingConnect) {
          try { await pendingConnect; } catch {}
        }
        // Close the TCP socket(s) before releasing the admission lease. Socket.close()
        // forcibly closes both stream sides; do not let a separate reader.cancel()
        // or writer.abort() promise block socket closure or lease cleanup.
        const runCleanup = (operation) => {
          try { return Promise.resolve(operation()).catch(() => {}); }
          catch { return Promise.resolve(); }
        };
        const socketClosures = [];
        const closeSocket = (socket, kind) => runCleanup(() =>
          measureDiagnostic(onDiagnostic, "tcp.socket_close", { kind }, () => socket.close())
        );
        const pendingSocket = state.pendingSocket;
        state.pendingSocket = null;
        if (pendingSocket) socketClosures.push(closeSocket(pendingSocket, "pending"));
        if (state.socket) socketClosures.push(closeSocket(state.socket, "active"));
        await Promise.all(socketClosures);
        try { Promise.resolve(state.reader?.cancel()).catch(() => {}); } catch {}
        try { Promise.resolve(state.writer?.abort()).catch(() => {}); } catch {}
        // Socket.close() may complete before a pending writer.write() promise
        // settles. Keep the admission lease until that in-flight transport
        // operation has a definitive outcome; an unresolved write leaves the
        // lease to its persisted expiry rather than releasing it speculatively.
        const pendingWrite = state.pendingWritePromise;
        if (pendingWrite) {
          try { await pendingWrite; } catch {}
        }
        await releaseSessionLease();
      };

      // A WebSocket close/error callback cannot return a Promise that the
      // Workers runtime will await. Register the cleanup with the request
      // execution context so socket closure and the D1 lease release survive
      // the close event dispatch. The request remains active while the client
      // WebSocket is connected; waitUntil then provides the post-disconnect
      // completion window documented by Workers.
      const trackCloseSession = (code, reason) => {
        // Repeated close/error notifications must not register redundant work.
        if (state.closed) return closeSession(code, reason);
        const cleanup = closeSession(code, reason);
        if (typeof executionContext?.waitUntil === "function") {
          try {
            executionContext.waitUntil(cleanup);
          } catch {
            cleanup.catch(() => {});
          }
        } else {
          cleanup.catch(() => {});
        }
        return cleanup;
      };
      const resetIdleTimeout = () => {
        if (!state.authenticated || state.closed) return;
        idleTimerGeneration += 1;
        const generation = idleTimerGeneration;
        if (idleTimer !== null) {
          try { clearTimeoutImpl(idleTimer); } catch {}
        }
        idleTimer = setTimeoutImpl(() => {
          if (generation === idleTimerGeneration && state.authenticated && !state.closed) {
            void trackCloseSession(1001, "idle_timeout");
          }
        }, idleTimeoutMs);
        // Node-only timer handles should not keep test processes alive; Workers handles are numeric.
        idleTimer?.unref?.();
      };

      const releaseBeforeForward = async (reservationId) => {
        if (typeof quotaService.release !== "function" || !state.accountId) return;
        try {
          await quotaService.release({ reservationId, accountId: state.accountId, at: new Date(now()).toISOString() });
        } catch {
          // No bytes have crossed the forwarding boundary. A failed release is
          // conservative: the reservation remains held until reconciliation.
        }
      };

      const reserveAndSettle = async (bytes, direction) => {
        if (!bytes?.byteLength || state.closed) return !state.closed;
        const reservationId = idFactory();
        const eventId = idFactory();
        const reservedAt = new Date(now()).toISOString();
        let reservation;
        try {
          const result = await measureDiagnostic(onDiagnostic, "quota.reserve", { direction, bytes: bytes.byteLength }, () => quotaService.reserve({
            reservationId,
            accountId: state.accountId,
            reservedBytes: bytes.byteLength,
            at: reservedAt
          }));
          if (!result?.allowed) {
            await trackCloseSession(1008, "quota_exceeded");
            return false;
          }
          if (!result.reservation?.usageDate) {
            await releaseBeforeForward(reservationId);
            await trackCloseSession(1011, "quota_reservation_invalid");
            return false;
          }
          reservation = result.reservation;
        } catch (error) {
          // A true ID/payload conflict may refer to an earlier in-flight
          // reservation, so never release it. For other ambiguous reserve
          // outcomes, no bytes have been forwarded by this call yet.
          if (error?.code !== "reservation_conflict") await releaseBeforeForward(reservationId);
          await trackCloseSession(1011, "quota_reservation_failed");
          return false;
        }
        if (state.closed) {
          await releaseBeforeForward(reservationId);
          return false;
        }

        try {
          const marked = await measureDiagnostic(onDiagnostic, "quota.mark_forwarding", { direction, bytes: bytes.byteLength }, () => quotaService.markForwarding({
            reservationId, accountId: state.accountId, at: new Date(now()).toISOString()
          }));
          if (!marked) {
            await trackCloseSession(1011, "quota_reservation_forwarding_failed");
            return false;
          }
          // The forwarding marker may have committed while the session was
          // closing. Retain the reservation, but never send bytes after closure.
          if (state.closed) return false;
          if (direction === "upload") {
            const writePromise = measureDiagnostic(onDiagnostic, "tcp.write", { bytes: bytes.byteLength }, () => state.writer.write(bytes));
            state.pendingWritePromise = writePromise;
            try {
              await writePromise;
            } finally {
              if (state.pendingWritePromise === writePromise) state.pendingWritePromise = null;
            }
          } else {
            await measureDiagnostic(onDiagnostic, "websocket.send", { bytes: bytes.byteLength }, () => server.send(bytes));
          }
        } catch {
          // The transport may have accepted a partial chunk before throwing.
          // Keep its reservation; releasing it could permit over-quota traffic.
          await trackCloseSession(1011, direction === "upload" ? "upstream_write_failed" : "downstream_write_failed");
          return false;
        }

        const requestCount = state.requestCountClaimed ? 0 : 1;
        state.requestCountClaimed = true;
        try {
          await measureDiagnostic(onDiagnostic, "quota.settle", { direction, bytes: bytes.byteLength }, () => quotaService.settle({
            producerId: env.PROXY_USAGE_PRODUCER_ID,
            eventId,
            reservationId,
            accountId: state.accountId,
            usageDate: reservation.usageDate,
            uploadBytes: direction === "upload" ? bytes.byteLength : 0,
            downloadBytes: direction === "download" ? bytes.byteLength : 0,
            requestCount,
            at: new Date(now()).toISOString()
          }));
          return true;
        } catch {
          // Bytes may already have crossed the forwarding boundary. Retain the
          // reservation and stop this session rather than silently undercount.
          await trackCloseSession(1011, "usage_settlement_failed");
          return false;
        }
      };

      const pumpUpstream = async () => {
        try {
          while (!state.closed && state.reader) {
            const read = await measureDiagnostic(onDiagnostic, "tcp.read", {}, () => state.reader.read());
            const { value, done } = read;
            if (done) { emitDiagnostic(onDiagnostic, "tcp.read_done"); break; }
            if (value?.byteLength) emitDiagnostic(onDiagnostic, "tcp.read_chunk", { bytes: value.byteLength });
            if (value?.byteLength && !state.closed) {
              resetIdleTimeout();
              if (value.byteLength > maxDownloadBytes - state.downloadBytesForwarded) {
                await trackCloseSession(1008, "download_limit_exceeded");
                return;
              }
              const forwarded = await reserveAndSettle(value, "download");
              if (!forwarded) return;
              state.downloadBytesForwarded += value.byteLength;
            }
          }
          await trackCloseSession(1000, "upstream_closed");
        } catch {
          await trackCloseSession(1011, "upstream_error");
        }
      };

      const handleMessage = async (data) => {
        if (state.closed) return;
        let bytes;
        try {
          bytes = await toBytes(data);
        } catch {
          await trackCloseSession(1003, "binary_messages_required");
          return;
        }

        if (!state.authenticated) {
          state.buffer = concatBytes(state.buffer, bytes);
          if (state.buffer.byteLength > MAX_INITIAL_BUFFER_BYTES) {
            await trackCloseSession(1009, "initial_request_too_large");
            return;
          }

          let parsed;
          try {
            parsed = parseVlessRequest(state.buffer);
          } catch (error) {
            if (error instanceof VlessProtocolError && error.code === "incomplete_request") return;
            await trackCloseSession(1002, "invalid_vless_request");
            return;
          }

          try {
            const credentialHash = await Promise.race([
              Promise.resolve().then(() => credentialHasher(parsed.uuid)),
              sessionClosed.then(() => SESSION_CLOSED)
            ]);
            if (credentialHash === SESSION_CLOSED || state.closed) return;
            const match = await Promise.race([
              Promise.resolve().then(() => store.findAccountByCredentialHash(credentialHash)),
              sessionClosed.then(() => SESSION_CLOSED)
            ]);
            if (match === SESSION_CLOSED || state.closed) return;
            const account = match?.account;
            if (!accountIsUsable(account, now())) {
              await trackCloseSession(1008, "invalid_credential");
              return;
            }
            if (!destinationAllowed(parsed.host, parsed.port, env)) {
              await trackCloseSession(1008, "destination_not_allowed");
              return;
            }

            // Resolve hostnames first and connect to the selected numeric address.
            // This pins the dial target so a second DNS lookup cannot rebind it.
            let resolvedAddresses;
            try {
              const resolved = await Promise.race([
                Promise.resolve().then(() => resolveDestination(parsed.host, env)),
                sessionClosed.then(() => SESSION_CLOSED)
              ]);
              if (resolved === SESSION_CLOSED || state.closed) return;
              resolvedAddresses = Array.isArray(resolved) ? resolved : [resolved];
            } catch {
              if (state.closed) return;
              await trackCloseSession(1008, "destination_not_allowed");
              return;
            }
            const candidates = [...new Set(resolvedAddresses
              .map((address) => normalizeNumericAddress(address))
              .filter((address) => address && !isClearlyPrivateDestination(address)))];
            if (candidates.length === 0) {
              await trackCloseSession(1008, "destination_not_allowed");
              return;
            }

            // Acquire the account and installation-wide slot in one D1
            // conditional write before opening any upstream TCP socket.
            const sessionId = idFactory();
            const createdAt = new Date(now()).toISOString();
            const expiresAt = new Date(
              Date.parse(createdAt) + initialHandshakeTimeoutMs + maxSessionDurationMs + sessionLeaseGraceMs
            ).toISOString();
            state.accountId = account.id;
            state.sessionId = sessionId;
            const admissionPromise = Promise.resolve()
              .then(() => store.acquireProxySession({
                sessionId, accountId: account.id, createdAt, expiresAt,
                at: createdAt, maxConcurrentSessions
              }))
              .then(async (result) => {
                if (state.closed && result?.allowed) {
                  emitDiagnostic(onDiagnostic, "session.lease_release_late.start");
                  try {
                    const released = await store.releaseProxySession({ sessionId, accountId: account.id });
                    emitDiagnostic(onDiagnostic, "session.lease_release_late.complete", { released: released === true });
                  } catch (error) {
                    emitDiagnostic(onDiagnostic, "session.lease_release_late.error", {
                      errorName: typeof error?.name === "string" ? error.name : "Error"
                    });
                    // An uncertain late release remains counted until persisted expiry.
                  }
                  return SESSION_CLOSED;
                }
                return result;
              });
            const admission = await Promise.race([
              admissionPromise,
              sessionClosed.then(() => SESSION_CLOSED)
            ]);
            if (admission === SESSION_CLOSED) return;
            if (state.closed) {
              if (admission?.allowed) {
                emitDiagnostic(onDiagnostic, "session.lease_release_late.start");
                try {
                  const released = await store.releaseProxySession({ sessionId, accountId: account.id });
                  emitDiagnostic(onDiagnostic, "session.lease_release_late.complete", { released: released === true });
                } catch (error) {
                  emitDiagnostic(onDiagnostic, "session.lease_release_late.error", {
                    errorName: typeof error?.name === "string" ? error.name : "Error"
                  });
                  // An uncertain late release remains counted until persisted expiry.
                }
              }
              return;
            }
            if (!admission?.allowed) {
              await trackCloseSession(1008, admission?.conflict ? "session_admission_conflict" : "session_limit_reached");
              return;
            }
            state.sessionLeaseAcquired = true;
            emitDiagnostic(onDiagnostic, "session.lease_acquired");

            // DNS may return both IPv4 and IPv6. Try each validated numeric pin
            // if opening the transport fails; never retry after forwarding data.
            let destinationAddress = null;
            let socket = null;
            let socketInfo = null;
            for (const candidate of candidates.slice(0, MAX_DIAL_CANDIDATES)) {
              if (state.closed) return;
              let candidateSocket;
              try {
                // Race both connection creation and socket opening against session
                // closure. The handshake deadline therefore also bounds a stalled
                // connect/open operation, rather than only closing the WebSocket.
                const connectAbortController = new AbortController();
                state.pendingConnectAbortController = connectAbortController;
                const connectPromise = Promise.resolve()
                  .then(() => connectTcp({ hostname: candidate, port: parsed.port }, env, connectAbortController.signal))
                  .then(async (createdSocket) => {
                    if (state.closed) {
                      try { await createdSocket?.close?.(); } catch {}
                      return SESSION_CLOSED;
                    }
                    state.pendingSocket = createdSocket;
                    return createdSocket;
                  })
                  .then((result) => {
                    if (state.pendingConnectPromise === connectPromise) state.pendingConnectPromise = null;
                    if (state.pendingConnectAbortController === connectAbortController) {
                      state.pendingConnectAbortController = null;
                    }
                    return result;
                  }, (error) => {
                    if (state.pendingConnectPromise === connectPromise) state.pendingConnectPromise = null;
                    if (state.pendingConnectAbortController === connectAbortController) {
                      state.pendingConnectAbortController = null;
                    }
                    throw error;
                  });
                state.pendingConnectPromise = connectPromise;
                candidateSocket = await Promise.race([
                  connectPromise,
                  sessionClosed.then(() => SESSION_CLOSED)
                ]);
                if (candidateSocket === SESSION_CLOSED || state.closed) return;
                if (!candidateSocket?.readable || !candidateSocket?.writable ||
                    typeof candidateSocket.close !== "function") {
                  try { await candidateSocket?.close?.(); } catch {}
                  await trackCloseSession(1011, "upstream_unavailable");
                  return;
                }
                state.pendingSocket = candidateSocket;
                const info = await Promise.race([
                  Promise.resolve(candidateSocket.opened),
                  sessionClosed.then(() => SESSION_CLOSED)
                ]);
                if (info === SESSION_CLOSED || state.closed) {
                  try { await candidateSocket.close(); } catch {}
                  if (state.pendingSocket === candidateSocket) state.pendingSocket = null;
                  return;
                }
                // A peer mismatch is a security failure, not a transport fallback.
                if (!isValidNumericAddress(info?.remoteAddress) ||
                    isClearlyPrivateDestination(info.remoteAddress) ||
                    !sameNumericAddress(candidate, info.remoteAddress)) {
                  try { await candidateSocket.close(); } catch {}
                  if (state.pendingSocket === candidateSocket) state.pendingSocket = null;
                  await trackCloseSession(1008, "destination_not_allowed");
                  return;
                }
                if (state.pendingSocket === candidateSocket) state.pendingSocket = null;
                destinationAddress = candidate;
                socket = candidateSocket;
                socketInfo = info;
                break;
              } catch {
                try { await candidateSocket?.close?.(); } catch {}
                if (state.pendingSocket === candidateSocket) state.pendingSocket = null;
                // A failed connection/open is safe to retry because no payload
                // has been forwarded and no quota reservation has been made.
              }
            }
            if (!socket || !destinationAddress || !socketInfo) {
              await trackCloseSession(1011, "upstream_unavailable");
              return;
            }
            state.socket = socket;
            state.writer = socket.writable.getWriter();
            if (parsed.initialPayload.byteLength) {
              const forwarded = await reserveAndSettle(parsed.initialPayload, "upload");
              if (!forwarded) return;
            }
            if (state.closed) return;
            if (handshakeTimer !== null) {
              try { clearTimeoutImpl(handshakeTimer); } catch {}
              handshakeTimer = null;
            }
            state.authenticated = true;
            resetIdleTimeout();
            sessionTimer = setTimeoutImpl(() => {
              void trackCloseSession(1001, "session_duration_exceeded");
            }, maxSessionDurationMs);
            // Avoid keeping Node test processes alive; Workers timer handles are numeric.
            sessionTimer?.unref?.();
            server.send(Uint8Array.from([parsed.version, 0]));
            state.buffer = new Uint8Array();
            state.reader = socket.readable.getReader();
            void pumpUpstream();
          } catch {
            await trackCloseSession(1011, "proxy_session_failed");
          }
          return;
        }

        resetIdleTimeout();
        await reserveAndSettle(bytes, "upload");
      };

      server.addEventListener("message", (event) => {
        const messageBytes = messageByteLength(event.data);
        if (messageBytes === null) {
          void trackCloseSession(1003, "binary_messages_required");
          return;
        }
        if (messageBytes > MAX_QUEUED_CLIENT_BYTES ||
            state.queuedClientBytes + messageBytes > MAX_QUEUED_CLIENT_BYTES) {
          void trackCloseSession(1009, "client_write_queue_full");
          return;
        }
        state.queuedClientBytes += messageBytes;
        state.writeQueue = state.writeQueue.then(async () => {
          try {
            await handleMessage(event.data);
          } finally {
            state.queuedClientBytes = Math.max(0, state.queuedClientBytes - messageBytes);
          }
        }).catch(() => trackCloseSession(1011, "proxy_session_failed"));
      });
      server.addEventListener("close", () => {
        emitDiagnostic(onDiagnostic, "websocket.close_event");
        void trackCloseSession(1000, "client_closed");
      });
      server.addEventListener("error", () => { void trackCloseSession(1011, "websocket_error"); });

      if (!Number.isSafeInteger(initialHandshakeTimeoutMs) || initialHandshakeTimeoutMs < 1 ||
          !Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs < 1 ||
          typeof setTimeoutImpl !== "function" || typeof clearTimeoutImpl !== "function") {
        await trackCloseSession(1011, "proxy_timeout_config_invalid");
        return jsonError("proxy_timeout_config_invalid", "The proxy timeout configuration is invalid.", 503);
      }
      handshakeTimer = setTimeoutImpl(() => { void trackCloseSession(1008, "initial_request_timeout"); }, initialHandshakeTimeoutMs);

      try {
        return upgradeResponseFactory(client);
      } catch {
        await trackCloseSession(1011, "upgrade_failed");
        return jsonError("websocket_runtime_unavailable", "The WebSocket runtime is unavailable.", 503);
      }
    }
  };
}
