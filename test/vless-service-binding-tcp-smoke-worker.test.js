import test from "node:test";
import assert from "node:assert/strict";
import worker, { createSmokeWorker, createTransferDiagnosticsAccumulator, recordDiagnostic } from "./vless-service-binding-tcp-smoke-worker.js";
import {
  VLESS_SERVICE_BINDING_SMOKE_HOST,
  VLESS_SERVICE_BINDING_SMOKE_PEER,
  VLESS_SERVICE_BINDING_SMOKE_PORT,
  createServiceBindingTcpConnector
} from "./vless-service-binding-tcp-connector.js";

test("service-binding smoke target is a fixed synthetic hostname, peer, and TCP port", () => {
  assert.equal(VLESS_SERVICE_BINDING_SMOKE_HOST, "probe.imoxy.invalid");
  assert.equal(VLESS_SERVICE_BINDING_SMOKE_PEER, "93.184.216.34");
  assert.equal(VLESS_SERVICE_BINDING_SMOKE_PORT, 5000);
});

test("service-binding connector forwards only the fixed peer and maps the test peer identity", async () => {
  let address;
  const readable = new ReadableStream({ start(controller) { controller.close(); } });
  const writable = new WritableStream();
  const socket = {
    opened: Promise.resolve({ localAddress: "worker-local" }),
    readable,
    writable,
    close() {}
  };
  const connector = createServiceBindingTcpConnector();
  const result = await connector(
    { hostname: VLESS_SERVICE_BINDING_SMOKE_PEER, port: VLESS_SERVICE_BINDING_SMOKE_PORT },
    { PROXY_TCP_ECHO: { connect(value) { address = value; return socket; } } }
  );
  assert.equal(address, "93.184.216.34:5000");
  assert.deepEqual(await result.opened, {
    localAddress: "worker-local",
    remoteAddress: VLESS_SERVICE_BINDING_SMOKE_PEER
  });
  assert.equal(result.readable, readable);
  assert.equal(result.writable, writable);
  assert.equal(typeof result.close, "function");
});

test("service-binding connector awaits an asynchronous TCP connection", async () => {
  let address;
  const readable = new ReadableStream({ start(controller) { controller.close(); } });
  const writable = new WritableStream();
  const socket = {
    opened: Promise.resolve({ localAddress: "worker-local" }),
    readable,
    writable,
    close() {}
  };
  const connector = createServiceBindingTcpConnector();
  const result = await connector(
    { hostname: VLESS_SERVICE_BINDING_SMOKE_PEER, port: VLESS_SERVICE_BINDING_SMOKE_PORT },
    { PROXY_TCP_ECHO: { async connect(value) { address = value; return socket; } } }
  );
  assert.equal(address, "93.184.216.34:5000");
  assert.equal(result.readable, readable);
  assert.equal(result.writable, writable);
  assert.deepEqual(await result.opened, {
    localAddress: "worker-local",
    remoteAddress: VLESS_SERVICE_BINDING_SMOKE_PEER
  });
});

test("service-binding connector rejects any other target and missing binding", async () => {
  const connector = createServiceBindingTcpConnector();
  await assert.rejects(
    connector({ hostname: "1.1.1.1", port: 443 }, { PROXY_TCP_ECHO: { connect() { throw new Error("must not dial"); } } }),
    /fixed synthetic peer/
  );
  await assert.rejects(
    connector({ hostname: VLESS_SERVICE_BINDING_SMOKE_PEER, port: VLESS_SERVICE_BINDING_SMOKE_PORT }, {}),
    /binding is unavailable/
  );
});


test("service-binding smoke Worker forwards the request execution context", async () => {
  const expectedContext = { waitUntil() {} };
  const expectedEnv = { marker: "disposable-test-env" };
  let received;
  const smokeWorker = createSmokeWorker({
    proxyFetch(request, env, executionContext) {
      received = { request, env, executionContext };
      return new Response("proxied");
    }
  });

  const request = new Request("https://smoke.test/proxy/vless");
  const response = await smokeWorker.fetch(request, expectedEnv, expectedContext);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "proxied");
  assert.equal(received.request, request);
  assert.equal(received.env, expectedEnv);
  assert.equal(received.executionContext, expectedContext);
});

test("transfer diagnostics snapshots cumulative download bytes and operation durations at close", () => {
  const diagnostics = createTransferDiagnosticsAccumulator();
  diagnostics.record({ event: "tcp.read_chunk", bytes: 4096 });
  diagnostics.record({ event: "quota.reserve.complete", direction: "download", bytes: 4096, durationMs: 120 });
  diagnostics.record({ event: "quota.mark_forwarding.complete", direction: "download", bytes: 4096, durationMs: 125 });
  diagnostics.record({ event: "websocket.send.complete", bytes: 4096, durationMs: 0 });
  diagnostics.record({ event: "quota.settle.complete", direction: "download", bytes: 4096, durationMs: 130 });
  diagnostics.record({ event: "quota.reserve.complete", direction: "upload", bytes: 16384, durationMs: 999 });

  const first = diagnostics.record({ event: "session.close.start" });
  assert.equal(first.scope, "worker-isolate-cumulative");
  assert.equal(first.closeSequence, 1);
  assert.equal(first.downloadChunksRead, 1);
  assert.equal(first.downloadBytesRead, 4096);
  assert.deepEqual(first.websocketSend, {
    count: 1, bytes: 4096, totalDurationMs: 0, maxDurationMs: 0
  });
  assert.deepEqual(first.quotaReserve, {
    count: 1, bytes: 4096, totalDurationMs: 120, maxDurationMs: 120
  });
  assert.deepEqual(first.quotaMarkForwarding, {
    count: 1, bytes: 4096, totalDurationMs: 125, maxDurationMs: 125
  });
  assert.deepEqual(first.quotaSettle, {
    count: 1, bytes: 4096, totalDurationMs: 130, maxDurationMs: 130
  });

  diagnostics.record({ event: "tcp.read_chunk", bytes: 2048 });
  const second = diagnostics.record({ event: "session.close.start" });
  assert.equal(second.closeSequence, 2);
  assert.equal(second.downloadChunksRead, 2);
  assert.equal(second.downloadBytesRead, 6144);
  assert.equal(first.downloadBytesRead, 4096);
});

test("test-only diagnostics endpoint is token-gated, bounded, and payload-free", async () => {
  for (let index = 0; index < 260; index += 1) {
    recordDiagnostic({
      event: "tcp.read_chunk",
      direction: "download",
      bytes: index + 1,
      durationMs: 1.5,
      errorName: "ExampleError",
      accountId: "must-not-appear",
      reservationId: "must-not-appear",
      payload: "must-not-appear"
    });
  }

  recordDiagnostic({
    event: "session.lease_release.complete",
    released: true,
    kind: "active",
    reason: "client_closed",
    code: 1000,
    sessionId: "must-not-appear",
    payload: "must-not-appear"
  });

  const env = { SMOKE_DIAGNOSTICS_TOKEN: "a".repeat(36) };
  const unauthorized = await worker.fetch(
    new Request("https://smoke.test/_test/diagnostics"),
    env
  );
  assert.equal(unauthorized.status, 404);

  const response = await worker.fetch(
    new Request("https://smoke.test/_test/diagnostics", {
      headers: { "x-imoxy-smoke-diagnostics-token": env.SMOKE_DIAGNOSTICS_TOKEN }
    }),
    env
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.scope, "current-worker-isolate");
  assert.equal(body.events.length, 256);
  assert.equal(body.droppedEvents, 5);
  assert.deepEqual(body.events.at(-1), {
    event: "session.lease_release.complete",
    kind: "active",
    reason: "client_closed",
    code: 1000,
    released: true
  });
  assert.equal(JSON.stringify(body).includes("must-not-appear"), false);

  for (let index = 0; index < 17; index += 1) {
    recordDiagnostic({ event: "session.close.start", reason: "client_closed", code: 1000 });
  }
  const summaryResponse = await worker.fetch(
    new Request("https://smoke.test/_test/diagnostics", {
      headers: { "x-imoxy-smoke-diagnostics-token": env.SMOKE_DIAGNOSTICS_TOKEN }
    }),
    env
  );
  const summaryBody = await summaryResponse.json();
  assert.equal(summaryBody.transferSummaries.length, 16);
  assert.equal(summaryBody.transferSummaries.at(-1).closeSequence, 17);
  assert.equal(summaryBody.transferSummaries.at(-1).downloadChunksRead, 260);
  assert.equal(summaryBody.transferSummaries.at(-1).downloadBytesRead, 33930);
  assert.equal(JSON.stringify(summaryBody).includes("must-not-appear"), false);
});
