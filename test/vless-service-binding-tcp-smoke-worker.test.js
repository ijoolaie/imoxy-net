import test from "node:test";
import assert from "node:assert/strict";
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
