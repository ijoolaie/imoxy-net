import test from "node:test";
import assert from "node:assert/strict";
import { createByobTcpProbeWorker } from "./issue78-byob-probe-worker.js";

function payloadStream() {
  const bytes = new Uint8Array(32 * 1024);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31 + 7) & 255;
  return new ReadableStream({ type: "bytes", start(c) {
    for (let offset = 0; offset < bytes.length; offset += 8192) c.enqueue(bytes.slice(offset, offset + 8192));
    c.close();
  }});
}
function backend({ nonByte = false } = {}) {
  let calls = 0, closes = 0;
  return {
    get calls() { return calls; }, get closes() { return closes; },
    connect() {
      const n = ++calls;
      let readable;
      if (nonByte) readable = new ReadableStream({ start(c) {
        const bytes = new Uint8Array(32 * 1024);
        for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31 + 7) & 255;
        for (let offset = 0; offset < bytes.length; offset += 8192) c.enqueue(bytes.slice(offset, offset + 8192));
        c.close();
      }});
      else if (n <= 3) readable = payloadStream();
      else if (n === 4) readable = new ReadableStream({ type: "bytes", pull() {} });
      else if (n === 5) readable = new ReadableStream({ type: "bytes", start(c) { c.close(); } });
      else readable = new ReadableStream({ type: "bytes", start(c) { c.error(new Error("peer reset")); } });
      return { readable, close: async () => { closes++; } };
    }
  };
}
test("BYOB probe covers default reader, buffer reuse/replacement, pending cancel, EOF and peer error", async () => {
  const worker = createByobTcpProbeWorker(), binding = backend();
  const response = await worker.fetch(new Request("https://probe.invalid/probe"), { PROBE_PATH: "/probe", BACKEND: binding });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.defaultReader.receivedBytes, 32768);
  assert.equal(result.byobReader.receivedBytes, 32768);
  assert.ok(result.byobReader.maxReadBytes <= 4096);
  assert.ok(result.byobReader.maxBackingBufferBytes <= 4096);
  assert.equal(result.byobFreshBuffers.receivedBytes, 32768);
  assert.equal(result.pendingReadCancel.result.done, true);
  assert.equal(result.peerEof.done, true);
  assert.equal(result.peerError.rejected, true);
  assert.equal(binding.calls, 6);
});
test("BYOB probe reports a non-byte stream as unsupported while default reader succeeds", async () => {
  const worker = createByobTcpProbeWorker(), binding = backend({ nonByte: true });
  const response = await worker.fetch(new Request("https://probe.invalid/probe"), { PROBE_PATH: "/probe", BACKEND: binding });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.defaultReader.ok, true);
  assert.equal(result.byobReader.supported, false);
  assert.equal(result.pendingReadCancel.skipped, "BYOB unavailable");
  assert.equal(binding.calls, 2);
  assert.equal(binding.closes, 2);
});
test("health is static and does not open the service binding", async () => {
  const worker = createByobTcpProbeWorker();
  let calls = 0;
  const response = await worker.fetch(new Request("https://probe.invalid/health"), {
    PROBE_PATH: "/probe", BACKEND: { connect() { calls++; throw new Error("must not connect"); } }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, role: "issue78-byob-probe" });
  assert.equal(calls, 0);
});
test("root and unmatched paths return 404 without connecting", async () => {
  const worker = createByobTcpProbeWorker();
  let calls = 0;
  const backend = { connect() { calls++; throw new Error("must not connect"); } };
  const root = await worker.fetch(new Request("https://probe.invalid/"), { PROBE_PATH: "/probe", BACKEND: backend });
  const other = await worker.fetch(new Request("https://probe.invalid/nope"), { PROBE_PATH: "/probe", BACKEND: backend });
  assert.equal(root.status, 404);
  assert.equal(other.status, 404);
  assert.equal(calls, 0);
});
