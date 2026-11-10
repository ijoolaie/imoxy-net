import test from "node:test";
import assert from "node:assert/strict";
import { createTcpFaultProbeWorker } from "./issue78-tcp-fault-probe-worker.js";

const PROBE_PATH = "/__issue78_tcp_fault_probe/0123456789abcdef";
const TOKEN = "A".repeat(43);
const PRELUDE = Uint8Array.from([
  0x49, 0x4d, 0x58, 0x59, 0x2d, 0x52, 0x53, 0x54,
  0x2d, 0x50, 0x52, 0x45, 0x4c, 0x55, 0x44, 0x45
]);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function config(overrides = {}) {
  return {
    PROBE_PATH,
    FAULT_IP: "93.184.216.34",
    FAULT_PORT: "24443",
    FAULT_MODE: "FIN",
    FAULT_TOKEN: TOKEN,
    ...overrides
  };
}

function peer(mode, { mismatchReady = false } = {}) {
  let controller;
  let resolveClosed;
  let rejectClosed;
  let closeCalls = 0;
  let modeCommand = null;
  const closed = new Promise((resolve, reject) => {
    resolveClosed = resolve;
    rejectClosed = reject;
  });
  const readable = new ReadableStream({
    start(value) {
      controller = value;
    }
  });
  const writable = new WritableStream({
    async write(chunk) {
      const text = decoder.decode(chunk);
      if (text.startsWith("MODE ")) {
        modeCommand = text;
        const [verb, requestedMode, nonce, signatureHex] = text.trim().split(" ");
        const expectedMode = mode === "HOLD" ? "RST" : mode;
        if (verb !== "MODE" || requestedMode !== expectedMode || !/^[a-f0-9]{64}$/.test(signatureHex)) {
          throw new Error("invalid mode command");
        }
        const key = await crypto.subtle.importKey(
          "raw", encoder.encode(TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
        );
        const signature = Uint8Array.from(
          signatureHex.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16))
        );
        const valid = await crypto.subtle.verify(
          "HMAC", key, signature, encoder.encode("MODE " + requestedMode + " " + nonce)
        );
        if (!valid) throw new Error("invalid command signature");
        const readyNonce = mismatchReady ? "wrongnonce" : nonce;
        const ready = encoder.encode("READY " + readyNonce + "\n");
        const initial = new Uint8Array(ready.byteLength + PRELUDE.byteLength);
        initial.set(ready);
        initial.set(PRELUDE, ready.byteLength);
        controller.enqueue(initial);
      } else if (text.startsWith("ACK ")) {
        if (mode === "FIN") {
          controller.close();
          resolveClosed();
        } else if (mode === "RST") {
          const error = new Error("simulated peer reset");
          controller.error(error);
          rejectClosed(error);
        }
      }
    }
  });
  return {
    socket: {
      opened: Promise.resolve({ remoteAddress: "93.184.216.34" }),
      closed,
      readable,
      writable,
      async close() {
        closeCalls += 1;
        try { controller.error(new Error("local cleanup")); } catch {}
        rejectClosed(new Error("local cleanup"));
      }
    },
    get closeCalls() { return closeCalls; },
    get modeCommand() { return modeCommand; }
  };
}

function request(path = PROBE_PATH) {
  return new Request("https://probe.invalid" + path);
}

test("FIN probe uses only its configured literal target and records clean readable EOF", async () => {
  const connection = peer("FIN");
  let dialArgs;
  const worker = createTcpFaultProbeWorker({
    connectTcp(args) {
      dialArgs = args;
      return connection.socket;
    }
  });
  const response = await worker.fetch(request(), config());
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "FIN");
  assert.deepEqual(dialArgs, {
    hostname: "93.184.216.34",
    port: 24443,
    allowHalfOpen: false
  });
  assert.equal(result.socketClosed.status, "resolved");
  assert.equal(result.socketClosed.afterLocalCleanup, false);
  assert.equal(result.readable.status, "fulfilled");
  assert.equal(result.readable.done, true);
  assert.equal(result.readable.afterLocalCleanup, false);
  assert.equal(result.cleanup.closeStartedAt !== null, true);
  assert.match(connection.modeCommand.trim(), /^MODE FIN [a-f0-9]{32} [a-f0-9]{64}$/);
  assert.equal(connection.modeCommand.includes(TOKEN), false);
  assert.equal(connection.closeCalls, 1);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test("FIN probe forwards the explicit allowHalfOpen control without changing its target", async () => {
  const connection = peer("FIN");
  let dialArgs;
  const worker = createTcpFaultProbeWorker({
    connectTcp(args) {
      dialArgs = args;
      return connection.socket;
    }
  });
  const response = await worker.fetch(request(), config({ ALLOW_HALF_OPEN: "true" }));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(dialArgs.allowHalfOpen, true);
  assert.equal(dialArgs.hostname, "93.184.216.34");
  assert.equal(dialArgs.port, 24443);
});

test("RST probe records socket.closed and readable rejection before local cleanup", async () => {
  const connection = peer("RST");
  let dialArgs;
  const worker = createTcpFaultProbeWorker({
    connectTcp(args) {
      dialArgs = args;
      return connection.socket;
    }
  });
  const response = await worker.fetch(request(), config({ FAULT_MODE: "RST" }));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "RST");
  assert.equal(dialArgs.hostname, "93.184.216.34");
  assert.equal(dialArgs.port, 24443);
  assert.equal(result.socketClosed.status, "rejected");
  assert.equal(result.socketClosed.afterLocalCleanup, false);
  assert.equal(result.readable.status, "rejected");
  assert.equal(result.readable.afterLocalCleanup, false);
  assert.equal(connection.closeCalls, 1);
  assert.match(connection.modeCommand.trim(), /^MODE RST [a-f0-9]{32} [a-f0-9]{64}$/);
  assert.equal(connection.modeCommand.includes(TOKEN), false);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test("local cleanup after observation timeout is not misclassified as a peer RST", async () => {
  const connection = peer("HOLD");
  const worker = createTcpFaultProbeWorker({
    connectTcp() {
      return connection.socket;
    },
    observationTimeoutMs: 20,
    cleanupWaitMs: 20
  });
  const response = await worker.fetch(request(), config({ FAULT_MODE: "RST" }));
  const result = await response.json();
  assert.equal(response.status, 500);
  assert.equal(result.ok, false);
  assert.equal(result.observationTimedOut, true);
  assert.equal(result.socketClosed.status, "rejected");
  assert.equal(result.socketClosed.afterLocalCleanup, true);
  assert.equal(result.readable.status, "rejected");
  assert.equal(result.readable.afterLocalCleanup, true);
  assert.equal(connection.closeCalls, 1);
});

test("probe rejects hostnames, private targets, malformed ports and invalid modes before dialing", async () => {
  let calls = 0;
  const worker = createTcpFaultProbeWorker({
    connectTcp() {
      calls += 1;
      throw new Error("must not dial");
    }
  });
  const invalidConfigs = [
    { FAULT_IP: "fault.example.com" },
    { FAULT_IP: "127.0.0.1" },
    { FAULT_IP: "10.0.0.2" },
    { FAULT_IP: "192.0.2.10" },
    { FAULT_IP: "100.64.0.1" },
    { FAULT_IP: "198.18.0.1" },
    { FAULT_IP: "192.31.196.1" },
    { FAULT_IP: "192.52.193.1" },
    { FAULT_IP: "192.175.48.1" },
    { FAULT_PORT: "0443" },
    { FAULT_PORT: "443" },
    { FAULT_PORT: "70000" },
    { FAULT_MODE: "UDP" },
    { FAULT_TOKEN: "short" }
  ];
  for (const overrides of invalidConfigs) {
    const response = await worker.fetch(request(), config(overrides));
    assert.equal(response.status, 503);
  }
  assert.equal(calls, 0);
});

test("unmatched paths, query parameters and non-GET methods never dial", async () => {
  let calls = 0;
  const worker = createTcpFaultProbeWorker({
    connectTcp() {
      calls += 1;
      throw new Error("must not dial");
    }
  });
  assert.equal((await worker.fetch(request("/wrong"), config())).status, 404);
  assert.equal((await worker.fetch(request(PROBE_PATH + "?target=127.0.0.1"), config())).status, 404);
  const post = new Request("https://probe.invalid" + PROBE_PATH, { method: "POST" });
  assert.equal((await worker.fetch(post, config())).status, 405);
  assert.equal(calls, 0);
});

test("health route is static and does not validate secrets or dial", async () => {
  let calls = 0;
  const worker = createTcpFaultProbeWorker({
    connectTcp() {
      calls += 1;
      throw new Error("must not dial");
    }
  });
  const response = await worker.fetch(request("/health"), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, role: "issue78-tcp-fault-probe" });
  assert.equal(calls, 0);
});

test("readiness nonce mismatch fails closed and closes the socket", async () => {
  const connection = peer("FIN", { mismatchReady: true });
  const worker = createTcpFaultProbeWorker({
    connectTcp() {
      return connection.socket;
    },
    timeoutMs: 50,
    cleanupWaitMs: 10
  });
  const response = await worker.fetch(request(), config());
  const result = await response.json();
  assert.equal(response.status, 500);
  assert.equal(result.ok, false);
  assert.equal(result.error, "Error");
  assert.equal(connection.closeCalls, 1);
});
