import test from "node:test";
import assert from "node:assert/strict";
import { createByobTcpProbeWorker } from "./issue78-byob-probe-worker.js";

function createSocket() {
  const bytes = new Uint8Array(32 * 1024);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = ((index * 31) + 7) & 0xff;
  }
  const readable = new ReadableStream({
    type: "bytes",
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 8192) {
        controller.enqueue(bytes.slice(offset, offset + 8192));
      }
      controller.close();
    }
  });
  return { readable, close: async () => {} };
}

test("BYOB TCP probe compares default and 4KiB readers against a deterministic byte stream", async () => {
  const worker = createByobTcpProbeWorker();
  const response = await worker.fetch(
    new Request("https://probe.invalid/probe"),
    {
      PROBE_PATH: "/probe",
      BACKEND: { connect: () => createSocket() }
    }
  );
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.defaultReader.receivedBytes, 32768);
  assert.equal(result.defaultReader.integrity, true);
  assert.equal(result.byobReader.supported, true);
  assert.equal(result.byobReader.receivedBytes, 32768);
  assert.equal(result.byobReader.integrity, true);
  assert.ok(result.byobReader.maxReadBytes <= 4096);
  assert.ok(result.byobReader.maxBackingBufferBytes <= 4096);
});

test("BYOB TCP probe reports a non-byte stream as unsupported when the default-reader control passes", async () => {
  const worker = createByobTcpProbeWorker();
  let closeCalls = 0;
  const connect = () => {
    const bytes = new Uint8Array(32 * 1024);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = ((index * 31) + 7) & 0xff;
    }
    const readable = new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < bytes.length; offset += 8192) {
          controller.enqueue(bytes.slice(offset, offset + 8192));
        }
        controller.close();
      }
    });
    return { readable, close: async () => { closeCalls += 1; } };
  };
  const response = await worker.fetch(
    new Request("https://probe.invalid/probe"),
    {
      PROBE_PATH: "/probe",
      BACKEND: { connect }
    }
  );
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.defaultReader.ok, true);
  assert.equal(result.byobReader.supported, false);
  assert.equal(closeCalls, 2);
});

test("BYOB TCP probe exposes a static health endpoint without opening the service binding", async () => {
  const worker = createByobTcpProbeWorker();
  let connectCalls = 0;
  const response = await worker.fetch(
    new Request("https://probe.invalid/health"),
    {
      PROBE_PATH: "/probe",
      BACKEND: { connect() { connectCalls += 1; throw new Error("must not connect"); } }
    }
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, role: "issue78-byob-probe" });
  assert.equal(connectCalls, 0);
});

test("BYOB TCP probe root path returns a deterministic 404 without opening the service binding", async () => {
  const worker = createByobTcpProbeWorker();
  let connectCalls = 0;
  const response = await worker.fetch(
    new Request("https://probe.invalid/"),
    {
      PROBE_PATH: "/probe",
      BACKEND: { connect() { connectCalls += 1; throw new Error("must not connect"); } }
    }
  );
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "not found");
  assert.equal(connectCalls, 0);
});

test("BYOB TCP probe rejects unmatched paths without opening the service binding", async () => {
  const worker = createByobTcpProbeWorker();
  let connectCalls = 0;
  const response = await worker.fetch(
    new Request("https://probe.invalid/not-the-probe"),
    {
      PROBE_PATH: "/probe",
      BACKEND: { connect() { connectCalls += 1; throw new Error("must not connect"); } }
    }
  );
  assert.equal(response.status, 404);
  assert.equal(connectCalls, 0);
});
