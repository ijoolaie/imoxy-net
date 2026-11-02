import test from "node:test";
import assert from "node:assert/strict";
import worker, { recordDiagnostic } from "./vless-service-binding-tcp-smoke-worker.js";
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
  assert.equal(body.droppedEvents, 4);
  assert.deepEqual(body.events.at(-1), {
    event: "tcp.read_chunk",
    direction: "download",
    bytes: 260,
    durationMs: 1.5,
    errorName: "ExampleError"
  });
  assert.equal(JSON.stringify(body).includes("must-not-appear"), false);
});
