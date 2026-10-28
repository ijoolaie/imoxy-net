import test from "node:test";
import assert from "node:assert/strict";
import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
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

function fakeSocket() {
  let controller;
  const writes = [];
  let closed = false;
  const socket = {
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

function harness({ lookup, connectTcp, config = {}, clock = () => NOW, timerCallbacks = null, quotaAllowed = true, quotaSettleFails = false } = {}) {
  const client = new FakeWebSocket();
  const server = new FakeWebSocket();
  const connectCalls = [];
  const storeCalls = [];
  const quotaCalls = { reserve: [], settle: [] };
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
        if (!quotaAllowed) return { allowed: false, reason: "quota_exceeded" };
        return { allowed: true, reservation: { ...input, usageDate: input.at.slice(0, 10), status: "active" } };
      },
      async settle(input) {
        quotaCalls.settle.push(input);
        if (quotaSettleFails) throw new Error("injected settlement failure");
        return { applied: true };
      }
    }),
    connectTcp: async (destination) => {
      connectCalls.push(destination);
      if (connectTcp) return connectTcp(destination);
      return fakeSocket().socket;
    },
    webSocketPairFactory: () => [client, server],
    upgradeResponseFactory: () => new Response("upgraded", { status: 200 }),
    now: clock,
    initialHandshakeTimeoutMs: 10_000,
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
  assert.deepEqual(h.connectCalls, [{ hostname: "example.test", port: 443 }]);
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
