import test from "node:test";
import assert from "node:assert/strict";
import { createVlessWebSocketHandler, resolvePublicDestination, resolvePublicDestinations } from "../src/proxy/vless-websocket-handler.js";
import { hashProxyCredential } from "../src/security/proxy-credentials.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const NOW = Date.parse("2026-10-28T00:00:00.000Z");

function uuidBytes(value = UUID) {
  return Uint8Array.from(value.replaceAll("-", "").match(/.{2}/g), (part) => Number.parseInt(part, 16));
}

function vlessRequest({ host = "example.test", port = 443, payload = [0x11, 0x22] } = {}) {
  const domain = new TextEncoder().encode(host);
  return Uint8Array.from([
    0, ...uuidBytes(), 0, 1,
    (port >> 8) & 0xff, port & 0xff,
    2, domain.length, ...domain, ...payload
  ]);
}

class FakeWebSocket extends EventTarget {
  constructor() {
    super();
    this.accepted = false;
    this.sent = [];
    this.bufferedAmount = 0;
    this.closeCalls = [];
  }
  accept() { this.accepted = true; }
  send(data) { this.sent.push(Array.from(data)); }
  close(code = 1000, reason = "") {
    this.closeCalls.push({ code, reason });
    const event = new Event("close");
    Object.defineProperty(event, "code", { value: code });
    Object.defineProperty(event, "reason", { value: reason });
    this.dispatchEvent(event);
  }
  receive(data) {
    const event = new Event("message");
    Object.defineProperty(event, "data", { value: data });
    this.dispatchEvent(event);
  }
  fail() { this.dispatchEvent(new Event("error")); }
}

function fakeSocket(remoteAddress = "93.184.216.34") {
  let controller;
  const writes = [];
  let closed = false;
  const socket = {
    opened: Promise.resolve({ remoteAddress, localAddress: null }),
    readable: new ReadableStream({ start(value) { controller = value; } }),
    writable: new WritableStream({ write(value) { writes.push(Array.from(value)); } }),
    async close() {
      closed = true;
      try { controller.close(); } catch {}
    }
  };
  return {
    socket, writes,
    push(data) { controller.enqueue(Uint8Array.from(data)); },
    get closed() { return closed; }
  };
}

function env(overrides = {}) {
  return {
    DB: {},
    PROXY_WS_PATH: "/proxy/vless",
    PROXY_ALLOWED_HOSTS: "example.test",
    PROXY_ALLOWED_PORTS: "443",
    PROXY_USAGE_PRODUCER_ID: "worker-test-1",
    ...overrides
  };
}

function request(path = "/proxy/vless", method = "GET", headers = {}) {
  return new Request(`https://imoxy.test${path}`, {
    method,
    headers: {
      upgrade: "websocket",
      connection: "Upgrade",
      "sec-websocket-version": "13",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      ...headers
    }
  });
}

async function settle() {
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

function harness({ lookup, connectTcp, resolveDestination, config = {}, clock = () => NOW, timerCallbacks = null, idleTimeoutMs = 120_000, quotaAllowed = true, quotaSettleFails = false, quotaReserveFails = false, quotaReserveConflict = false } = {}) {
  const client = new FakeWebSocket();
  const server = new FakeWebSocket();
  const connectCalls = [];
  const storeCalls = [];
  const quotaCalls = { reserve: [], settle: [], release: [] };
  const handler = createVlessWebSocketHandler({
    storeFactory: () => ({
      async findAccountByCredentialHash(hash) {
        storeCalls.push(hash);
        return lookup === undefined
          ? { credentialId: "cred-1", account: { id: "acct-1", status: "active", expiresAt: null } }
          : typeof lookup === "function" ? lookup(hash) : lookup;
      }
    }),
    quotaServiceFactory: () => ({
      async reserve(input) {
        quotaCalls.reserve.push(input);
        if (quotaReserveConflict) {
          const error = new Error("injected reservation ID conflict");
          error.code = "reservation_conflict";
          throw error;
        }
        if (quotaReserveFails) throw new Error("injected reserve failure");
        if (!quotaAllowed) return { allowed: false, reason: "quota_exceeded" };
        return { allowed: true, reservation: { ...input, usageDate: input.at.slice(0, 10), status: "active" } };
      },
      async settle(input) {
        quotaCalls.settle.push(input);
        if (quotaSettleFails) throw new Error("injected settlement failure");
        return { applied: true };
      },
      async release(input) {
        quotaCalls.release.push(input);
        return true;
      }
    }),
    connectTcp: async (destination) => {
      connectCalls.push(destination);
      if (connectTcp) return connectTcp(destination);
      return fakeSocket().socket;
    },
    resolveDestination: resolveDestination ?? (async (host) => host === "example.test" ? "93.184.216.34" : host),
    webSocketPairFactory: () => [client, server],
    upgradeResponseFactory: () => new Response("upgraded", { status: 200 }),
    now: clock,
    initialHandshakeTimeoutMs: 10_000,
    idleTimeoutMs,
    setTimeoutImpl: timerCallbacks ? (callback) => { timerCallbacks.push(callback); return timerCallbacks.length; } : globalThis.setTimeout,
    clearTimeoutImpl: timerCallbacks ? () => {} : globalThis.clearTimeout
  });
  return { handler, client, server, connectCalls, storeCalls, quotaCalls, config, env: env(config) };
}

test("non-matching paths are ignored and do not allocate a WebSocket pair", async () => {
  let pairs = 0;
  const handler = createVlessWebSocketHandler({ webSocketPairFactory: () => { pairs += 1; return []; } });
  assert.equal(await handler.fetch(request("/other"), env()), null);
  assert.equal(pairs, 0);
});

test("requires a valid WebSocket upgrade and explicit destination policy", async () => {
  const h = harness();
  const wrongMethod = await h.handler.fetch(request("/proxy/vless", "POST"), h.env);
  assert.equal(wrongMethod.status, 405);
  const wrongUpgrade = await h.handler.fetch(request("/proxy/vless", "GET", { upgrade: "h2c" }), h.env);
  assert.equal(wrongUpgrade.status, 426);
  const unconfigured = await h.handler.fetch(request(), env({ PROXY_ALLOWED_HOSTS: "" }));
  assert.equal(unconfigured.status, 503);
  const missingProducer = await h.handler.fetch(request(), env({ PROXY_USAGE_PRODUCER_ID: "" }));
  assert.equal(missingProducer.status, 503);
  assert.equal(h.connectCalls.length, 0);
});

test("valid credential is authenticated before dialing and relays initial and later bytes", async () => {
  const upstream = fakeSocket();
  const h = harness({ connectTcp: async () => upstream.socket });
  const response = await h.handler.fetch(request(), h.env);
  assert.equal(response.status, 200);
  assert.equal(h.server.accepted, true);

  h.server.receive(vlessRequest());
  await settle();
  assert.deepEqual(h.connectCalls, [{ hostname: "93.184.216.34", port: 443 }]);
  assert.deepEqual(h.storeCalls, [await hashProxyCredential(UUID)]);
  assert.deepEqual(upstream.writes, [[0x11, 0x22]]);
  assert.ok(h.server.sent.some((message) => message.length === 2 && message[0] === 0 && message[1] === 0));
  assert.equal(h.quotaCalls.reserve.length, 1);
  assert.equal(h.quotaCalls.reserve[0].reservedBytes, 2);
  assert.equal(h.quotaCalls.settle[0].uploadBytes, 2);
  assert.equal(h.quotaCalls.settle[0].requestCount, 1);

  h.server.receive(Uint8Array.from([0x33, 0x44]));
  await settle();
  assert.deepEqual(upstream.writes, [[0x11, 0x22], [0x33, 0x44]]);
  assert.equal(h.quotaCalls.reserve.length, 2);
  assert.equal(h.quotaCalls.settle[1].uploadBytes, 2);
  assert.equal(h.quotaCalls.settle[1].requestCount, 0);

  upstream.push([0xaa, 0xbb]);
  await settle();
  assert.ok(h.server.sent.some((message) => message.length === 2 && message[0] === 0xaa && message[1] === 0xbb));
  assert.equal(h.quotaCalls.reserve.length, 3);
  assert.equal(h.quotaCalls.settle[2].downloadBytes, 2);
  assert.equal(h.quotaCalls.settle[2].requestCount, 0);
});


test("bounds queued client messages and closes before the queue can grow without limit", async () => {
  const upstream = fakeSocket();
  const h = harness({ connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();

  const chunk = new Uint8Array(400 * 1024);
  h.server.receive(chunk);
  h.server.receive(chunk);
  h.server.receive(chunk);
  await settle();

  assert.ok(h.server.closeCalls.some((item) => item.code === 1009 && item.reason === "client_write_queue_full"));
  assert.equal(h.quotaCalls.reserve.length, 0, "queued uploads must not reach quota reservation after the queue limit is crossed");
});

test("bounds downstream WebSocket buffering before quota reservation", async () => {
  const upstream = fakeSocket();
  const h = harness({ connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();

  h.server.bufferedAmount = 1024 * 1024 - 1;
  upstream.push([0xaa, 0xbb]);
  await settle();

  assert.ok(h.server.closeCalls.some((item) =>
    item.code === 1009 && item.reason === "downstream_write_queue_full"
  ));
  assert.equal(h.quotaCalls.reserve.length, 0, "over-budget download chunks must not reserve quota or be sent");
  assert.equal(h.server.sent.some((message) => message.length === 2 && message[0] === 0xaa), false);
});

test("fails closed when downstream WebSocket buffering cannot be measured", async () => {
  const upstream = fakeSocket();
  const h = harness({ connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();

  h.server.bufferedAmount = undefined;
  upstream.push([0xaa]);
  await settle();

  assert.ok(h.server.closeCalls.some((item) =>
    item.code === 1009 && item.reason === "downstream_write_queue_full"
  ));
  assert.equal(h.quotaCalls.reserve.length, 0);
});

test("rejects text WebSocket messages before queueing or forwarding", async () => {
  const upstream = fakeSocket();
  const h = harness({ connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();
  h.server.receive("not binary");
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.code === 1003 && item.reason === "binary_messages_required"));
  assert.equal(h.quotaCalls.reserve.length, 0);
});

test("buffers a split initial header without dialing early", async () => {
  const upstream = fakeSocket();
  const h = harness({ connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  const packet = vlessRequest();
  h.server.receive(packet.slice(0, 10));
  await settle();
  assert.equal(h.connectCalls.length, 0);
  h.server.receive(packet.slice(10));
  await settle();
  assert.equal(h.connectCalls.length, 1);
});

test("unknown, disabled and expired credentials never dial upstream", async () => {
  for (const lookup of [
    null,
    { credentialId: "cred-1", account: { id: "acct-1", status: "disabled", expiresAt: null } },
    { credentialId: "cred-1", account: { id: "acct-1", status: "active", expiresAt: "2026-10-27T00:00:00.000Z" } }
  ]) {
    const h = harness({ lookup });
    await h.handler.fetch(request(), h.env);
    h.server.receive(vlessRequest());
    await settle();
    assert.equal(h.connectCalls.length, 0);
    assert.ok(h.server.closeCalls.some((item) => item.code === 1008));
  }
});

test("malformed protocol requests and disallowed/private destinations never dial", async () => {
  const malformed = harness();
  await malformed.handler.fetch(request(), malformed.env);
  malformed.server.receive(Uint8Array.from([1, 1, 2]));
  await settle();
  assert.equal(malformed.storeCalls.length, 0);
  assert.equal(malformed.connectCalls.length, 0);
  assert.ok(malformed.server.closeCalls.some((item) => item.code === 1002));

  const denied = harness({ config: { PROXY_ALLOWED_HOSTS: "other.test" } });
  await denied.handler.fetch(request(), denied.env);
  denied.server.receive(vlessRequest());
  await settle();
  assert.equal(denied.connectCalls.length, 0);
  assert.ok(denied.server.closeCalls.some((item) => item.code === 1008));

  const privateTarget = harness({ config: { PROXY_ALLOWED_HOSTS: "127.0.0.1" } });
  await privateTarget.handler.fetch(request(), env({ PROXY_ALLOWED_HOSTS: "127.0.0.1" }));
  privateTarget.server.receive(vlessRequest({ host: "127.0.0.1" }));
  await settle();
  assert.equal(privateTarget.connectCalls.length, 0);
});

test("rejects special-use IPv4 literals even when explicitly allowlisted", async () => {
  const blocked = [
    "100.64.0.1", "192.0.0.1", "192.0.2.1", "192.88.99.1",
    "198.18.0.1", "198.19.0.1", "198.51.100.1", "203.0.113.1",
    "255.255.255.255"
  ];
  for (const host of blocked) {
    const h = harness({ config: { PROXY_ALLOWED_HOSTS: host } });
    await h.handler.fetch(request(), h.env);
    h.server.receive(vlessRequest({ host, payload: [] }));
    await settle();
    assert.equal(h.connectCalls.length, 0, `${host} must not be dialed even when allowlisted`);
    assert.ok(h.server.closeCalls.some((item) => item.code === 1008 && item.reason === "destination_not_allowed"));
  }
});



test("DNS-over-HTTPS resolution selects only a validated public A or AAAA answer", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url);
    calls.push({ type: parsed.searchParams.get("type"), accept: options.headers.accept });
    const type = parsed.searchParams.get("type");
    return {
      ok: true,
      async json() {
        return type === "A"
          ? { Status: 0, Answer: [{ type: 1, data: "93.184.216.34" }] }
          : { Status: 0, Answer: [{ type: 28, data: "fd00::1" }] };
      }
    };
  };
  assert.equal(await resolvePublicDestination("example.test.", fetchImpl), "93.184.216.34");
  assert.deepEqual(calls.map((item) => item.type).sort(), ["A", "AAAA"]);
  assert.ok(calls.every((item) => item.accept === "application/dns-json"));
});

test("returns deduplicated validated public A and AAAA candidates for fallback", async () => {
  const fetchImpl = async (url) => {
    const type = new URL(url).searchParams.get("type");
    return {
      ok: true,
      async json() {
        return type === "A"
          ? { Status: 0, Answer: [
              { type: 1, data: "93.184.216.34" },
              { type: 1, data: "93.184.216.34" },
              { type: 1, data: "10.0.0.1" }
            ] }
          : { Status: 0, Answer: [
              { type: 28, data: "2606:4700:0:0:0:0:0:1111" },
              { type: 28, data: "fd00::1" }
            ] };
      }
    };
  };
  assert.deepEqual(
    await resolvePublicDestinations("example.test", fetchImpl),
    ["93.184.216.34", "2606:4700:0:0:0:0:0:1111"]
  );
  // Preserve the original single-address helper for existing callers.
  assert.equal(await resolvePublicDestination("example.test", fetchImpl), "93.184.216.34");
});

test("normalizes numeric addresses before they are used as TCP dial targets", async () => {
  assert.equal(await resolvePublicDestination("093.184.216.034"), "93.184.216.34");
});

test("DNS-over-HTTPS resolution fails closed when no public answer exists", async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return { Status: 0, Answer: [{ type: 1, data: "10.0.0.4" }] };
    }
  });
  await assert.rejects(() => resolvePublicDestination("private.example", fetchImpl));
});

test("DNS-over-HTTPS resolution fails closed when both DNS queries fail", async () => {
  await assert.rejects(() => resolvePublicDestination("example.test", async () => {
    throw new Error("injected resolver outage");
  }));
});

test("resolves hostnames to a public numeric address before dialing and pins the connected peer", async () => {
  const upstream = fakeSocket("93.184.216.34");
  const h = harness({
    connectTcp: async () => upstream.socket,
    resolveDestination: async (host) => {
      assert.equal(host, "example.test");
      return "93.184.216.34";
    }
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.deepEqual(h.connectCalls, [{ hostname: "93.184.216.34", port: 443 }]);
  assert.ok(h.server.sent.some((item) => item.length === 2 && item[1] === 0));
});

test("falls back to the next validated IP only when the first connection attempt fails", async () => {
  const upstream = fakeSocket("2606:4700:0:0:0:0:0:1111");
  const h = harness({
    resolveDestination: async () => ["93.184.216.34", "2606:4700:0:0:0:0:0:1111"],
    connectTcp: async (destination) => {
      if (destination.hostname === "93.184.216.34") throw new Error("IPv4 route unavailable");
      return upstream.socket;
    }
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();

  assert.deepEqual(h.connectCalls, [
    { hostname: "93.184.216.34", port: 443 },
    { hostname: "2606:4700:0:0:0:0:0:1111", port: 443 }
  ]);
  assert.deepEqual(upstream.writes, [[0x11, 0x22]]);
  assert.equal(h.quotaCalls.reserve.length, 1);
  assert.equal(h.quotaCalls.settle[0].uploadBytes, 2);
  assert.ok(h.server.sent.some((item) => item.length === 2 && item[1] === 0));
});

test("does not dial if the handshake times out while DNS resolution is pending", async () => {
  const timerCallbacks = [];
  let finishResolution;
  const h = harness({
    timerCallbacks,
    resolveDestination: () => new Promise((resolve) => { finishResolution = resolve; })
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.equal(typeof finishResolution, "function");
  timerCallbacks[0]();
  await settle();
  finishResolution("93.184.216.34");
  await settle();
  assert.equal(h.connectCalls.length, 0);
  assert.ok(h.server.closeCalls.some((item) => item.reason === "initial_request_timeout"));
});

test("rejects a connected peer that differs from the pinned DNS answer", async () => {
  const upstream = fakeSocket("10.0.0.8");
  const h = harness({
    connectTcp: async () => upstream.socket,
    resolveDestination: async () => "93.184.216.34"
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.equal(upstream.writes.length, 0);
  assert.equal(h.quotaCalls.reserve.length, 0);
  assert.ok(h.server.closeCalls.some((item) => item.reason === "destination_not_allowed"));
  assert.equal(upstream.closed, true);
});

test("validates the connected peer before forwarding the initial payload", async () => {
  for (const remoteAddress of ["127.0.0.1", "10.0.0.8", null]) {
    const upstream = fakeSocket(remoteAddress);
    const h = harness({ connectTcp: async () => upstream.socket });
    await h.handler.fetch(request(), h.env);
    h.server.receive(vlessRequest());
    await settle();

    assert.equal(upstream.writes.length, 0, `peer ${String(remoteAddress)} must not receive initial bytes`);
    assert.equal(h.quotaCalls.reserve.length, 0, "peer validation must happen before quota reservation");
    assert.ok(h.server.closeCalls.some((item) =>
      item.code === 1008 && item.reason === "destination_not_allowed"
    ));
    assert.equal(upstream.closed, true, "rejected upstream socket must be closed");
  }
});

test("fails closed when the connected peer address is malformed or unavailable", async () => {
  for (const remoteAddress of [
    "not-an-ip",
    "2001:zzzz::1",
    "1:::2",
    "1:2:3:4:5:6:7",
    "1:2:3:4:5:6:7:8:9"
  ]) {
    const upstream = fakeSocket(remoteAddress);
    const h = harness({ connectTcp: async () => upstream.socket });
    await h.handler.fetch(request(), h.env);
    h.server.receive(vlessRequest({ payload: [] }));
    await settle();
    assert.equal(h.quotaCalls.reserve.length, 0);
    assert.ok(h.server.closeCalls.some((item) =>
      item.code === 1008 && item.reason === "destination_not_allowed"
    ));
    assert.equal(upstream.closed, true);
  }
});

test("accepts a valid compressed public IPv6 peer address", async () => {
  const upstream = fakeSocket("2606:4700:0:0:0:0:0:1111");
  const h = harness({
    connectTcp: async () => upstream.socket,
    resolveDestination: async () => "2606:4700:0:0:0:0:0:1111"
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();
  assert.ok(h.server.sent.some((item) => item.length === 2 && item[1] === 0));
  assert.equal(upstream.closed, false);
});

test("rejects compressed IPv6 documentation addresses", async () => {
  const upstream = fakeSocket("2001:db8::1");
  const h = harness({ connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();
  assert.equal(h.quotaCalls.reserve.length, 0);
  assert.ok(h.server.closeCalls.some((item) =>
    item.code === 1008 && item.reason === "destination_not_allowed"
  ));
  assert.equal(upstream.closed, true);
});

test("rejects non-global and special-purpose IPv6 connected peers", async () => {
  const blocked = [
    "::1",
    "::ffff:7f00:1",
    "64:ff9b::7f00:1",
    "2001:20::1",
    "2002:7f00:1::1",
    "3fff::1"
  ];
  for (const remoteAddress of blocked) {
    const upstream = fakeSocket(remoteAddress);
    const h = harness({ connectTcp: async () => upstream.socket });
    await h.handler.fetch(request(), h.env);
    h.server.receive(vlessRequest({ payload: [] }));
    await settle();
    assert.equal(h.quotaCalls.reserve.length, 0, `${remoteAddress} must be rejected before quota reservation`);
    assert.ok(h.server.closeCalls.some((item) =>
      item.code === 1008 && item.reason === "destination_not_allowed"
    ), `${remoteAddress} must be rejected`);
    assert.equal(upstream.closed, true, `${remoteAddress} socket must close`);
  }
});

test("upstream connect failure closes the session without leaking details", async () => {
  const h = harness({ connectTcp: async () => { throw new Error("sensitive socket detail"); } });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.code === 1011));
  assert.equal(h.server.closeCalls.some((item) => item.reason.includes("sensitive")), false);
});

test("incomplete unauthenticated handshakes are closed on timeout", async () => {
  const timerCallbacks = [];
  const h = harness({ timerCallbacks });
  await h.handler.fetch(request(), h.env);
  assert.equal(timerCallbacks.length, 1);
  timerCallbacks[0]();
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.code === 1008 && item.reason === "initial_request_timeout"));
  assert.equal(h.connectCalls.length, 0);
});



test("authenticated sessions close after inactivity and stale idle timers cannot close active sessions", async () => {
  const timerCallbacks = [];
  const upstream = fakeSocket();
  const h = harness({ timerCallbacks, idleTimeoutMs: 5_000, connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();

  // Callback 0 is the initial handshake timeout; callback 1 is the idle timeout.
  assert.equal(timerCallbacks.length, 2);
  assert.equal(h.server.closeCalls.length, 0);

  h.server.receive(Uint8Array.from([0x33]));
  await settle();
  assert.equal(timerCallbacks.length, 3);

  // The old timer is stale after activity and must not close the live session.
  timerCallbacks[1]();
  await settle();
  assert.equal(h.server.closeCalls.some((item) => item.reason === "idle_timeout"), false);

  timerCallbacks[2]();
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.code === 1001 && item.reason === "idle_timeout"));
  assert.equal(upstream.closed, true);
});

test("invalid idle timeout configuration fails closed before upgrade", async () => {
  const h = harness({ idleTimeoutMs: 0 });
  const response = await h.handler.fetch(request(), h.env);
  assert.equal(response.status, 503);
  assert.equal(h.server.accepted, true);
  assert.ok(h.server.closeCalls.some((item) => item.reason === "proxy_timeout_config_invalid"));
});

test("quota denial stops before forwarding bytes and closes the session", async () => {
  const upstream = fakeSocket();
  const h = harness({ quotaAllowed: false, connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.equal(h.quotaCalls.reserve.length, 1);
  assert.equal(h.quotaCalls.settle.length, 0);
  assert.deepEqual(upstream.writes, []);
  assert.ok(h.server.closeCalls.some((item) => item.code === 1008 && item.reason === "quota_exceeded"));
});

test("ambiguous settlement failure closes the session and does not release the reservation", async () => {
  const upstream = fakeSocket();
  const h = harness({ quotaSettleFails: true, connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.deepEqual(upstream.writes, [[0x11, 0x22]]);
  assert.equal(h.quotaCalls.reserve.length, 1);
  assert.equal(h.quotaCalls.settle.length, 1);
  assert.ok(h.server.closeCalls.some((item) => item.code === 1011 && item.reason === "usage_settlement_failed"));
});


test("a reservation with an ambiguous response is released only before any forwarding", async () => {
  const upstream = fakeSocket();
  const h = harness({ quotaReserveFails: true, connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.equal(h.quotaCalls.reserve.length, 1);
  assert.equal(h.quotaCalls.release.length, 1);
  assert.equal(h.quotaCalls.release[0].reservationId, h.quotaCalls.reserve[0].reservationId);
  assert.deepEqual(upstream.writes, []);
  assert.ok(h.server.closeCalls.some((item) => item.code === 1011 && item.reason === "quota_reservation_failed"));
});


test("a reservation ID conflict never releases a potentially pre-existing reservation", async () => {
  const upstream = fakeSocket();
  const h = harness({ quotaReserveConflict: true, connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest());
  await settle();
  assert.equal(h.quotaCalls.release.length, 0);
  assert.deepEqual(upstream.writes, []);
  assert.ok(h.server.closeCalls.some((item) => item.code === 1011 && item.reason === "quota_reservation_failed"));
});


test("bounds sequential DNS fallback attempts to a fixed maximum", async () => {
  const candidates = [
    "93.184.216.34",
    "1.1.1.1",
    "8.8.8.8",
    "9.9.9.9",
    "76.76.2.0",
    "208.67.222.222",
    "4.2.2.1",
    "64.6.64.6",
    "94.140.14.14"
  ];
  const h = harness({
    resolveDestination: async () => candidates,
    connectTcp: async () => { throw new Error("connection unavailable"); }
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();
  assert.equal(h.connectCalls.length, 8);
  assert.deepEqual(h.connectCalls.map((call) => call.hostname), candidates.slice(0, 8));
  assert.ok(h.server.closeCalls.some((item) =>
    item.code === 1011 && item.reason === "upstream_unavailable"
  ));
});



test("handshake timeout closes a socket whose opened promise never settles", async () => {
  const timerCallbacks = [];
  let resolveOpened;
  let closed = false;
  const upstream = fakeSocket();
  upstream.socket.opened = new Promise((resolve) => { resolveOpened = resolve; });
  upstream.socket.close = async () => { closed = true; };
  const h = harness({ timerCallbacks, connectTcp: async () => upstream.socket });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();

  assert.equal(h.connectCalls.length, 1);
  assert.equal(closed, false);
  timerCallbacks[0]();
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.reason === "initial_request_timeout"));
  assert.equal(closed, true);

  resolveOpened({ remoteAddress: "93.184.216.34" });
  await settle();
  assert.equal(h.quotaCalls.reserve.length, 0);
});


test("handshake timeout closes a TCP socket that resolves after session closure", async () => {
  const timerCallbacks = [];
  let resolveConnect;
  let closed = false;
  const upstream = fakeSocket();
  upstream.socket.close = async () => { closed = true; };
  const connectPending = new Promise((resolve) => { resolveConnect = resolve; });
  const h = harness({ timerCallbacks, connectTcp: async () => connectPending });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();

  assert.equal(h.connectCalls.length, 1);
  timerCallbacks[0]();
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.reason === "initial_request_timeout"));
  resolveConnect(upstream.socket);
  await settle();
  assert.equal(closed, true, "late-created TCP socket must be closed");
  assert.equal(h.quotaCalls.reserve.length, 0);
});



test("handshake timeout releases the message queue when DNS never settles", async () => {
  const timerCallbacks = [];
  const h = harness({
    timerCallbacks,
    resolveDestination: () => new Promise(() => {})
  });
  await h.handler.fetch(request(), h.env);
  h.server.receive(vlessRequest({ payload: [] }));
  await settle();

  assert.equal(h.connectCalls.length, 0);
  timerCallbacks[0]();
  await settle();
  assert.ok(h.server.closeCalls.some((item) => item.reason === "initial_request_timeout"));

  // A subsequent queued event must not be trapped behind the unresolved DNS promise.
  h.server.receive(Uint8Array.from([0x33]));
  await settle();
  assert.equal(h.connectCalls.length, 0);
  assert.equal(h.quotaCalls.reserve.length, 0);
});
