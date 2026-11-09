import test from "node:test";
import assert from "node:assert/strict";

function createByteStream({ chunks = [], onCancel, onPull, pullError } = {}) {
  let index = 0;
  let controllerRef;
  const stream = new ReadableStream({
    type: "bytes",
    start(controller) { controllerRef = controller; },
    pull(controller) {
      onPull?.();
      if (pullError) { controller.error(pullError); return; }
      if (index < chunks.length) {
        controller.enqueue(Uint8Array.from(chunks[index++]));
        if (index === chunks.length) controller.close();
        return;
      }
      if (chunks.length === 0) {
        controller.close();
        controller.byobRequest?.respond(0);
      }
    },
    cancel(reason) { onCancel?.(reason); }
  });
  return { stream, controller: () => controllerRef };
}

test("BYOB read detaches the supplied buffer and returns only the delivered byte view", async () => {
  const { stream } = createByteStream({ chunks: [[0x11, 0x22, 0x33]] });
  const reader = stream.getReader({ mode: "byob" });
  const supplied = new Uint8Array(4096);
  const pending = reader.read(supplied);
  assert.equal(supplied.buffer.byteLength, 0, "BYOB transfers/detaches the supplied buffer at read time");
  const first = await pending;
  assert.equal(first.done, false);
  assert.deepEqual([...first.value], [0x11, 0x22, 0x33]);
  assert.equal(first.value.byteLength, 3);
  assert.equal(first.value.buffer.byteLength, 4096);
  const final = await reader.read(new Uint8Array(4096));
  assert.equal(final.done, true);
  assert.equal(final.value.byteLength, 0);
  reader.releaseLock();
});

test("BYOB close resolves a pending read with done and an empty view", async () => {
  const { stream } = createByteStream();
  const reader = stream.getReader({ mode: "byob" });
  const supplied = new Uint8Array(1024);
  const pending = reader.read(supplied);
  const result = await pending;
  assert.equal(result.done, true);
  assert.equal(result.value?.byteLength ?? 0, 0);
  assert.equal(supplied.buffer.byteLength, 0);
  reader.releaseLock();
});

test("BYOB cancel settles a pending read before the reader lock is released", async () => {
  let cancelCalls = 0;
  let cancelReason;
  const { stream } = createByteStream({
    onCancel(reason) { cancelCalls += 1; cancelReason = reason; }
  });
  const reader = stream.getReader({ mode: "byob" });
  const supplied = new Uint8Array(512);
  const pending = reader.read(supplied);
  const reason = new Error("session closed");
  const cancelPromise = reader.cancel(reason);
  const result = await pending;
  await cancelPromise;
  assert.equal(result.done, true);
  assert.equal(result.value?.byteLength ?? 0, 0);
  assert.equal(cancelCalls, 1);
  assert.equal(cancelReason, reason);
  assert.doesNotThrow(() => reader.releaseLock());
});

test("BYOB source error rejects a pending read and the reader lock can then be released", async () => {
  const failure = new Error("TCP readable failed");
  const { stream } = createByteStream({ pullError: failure });
  const reader = stream.getReader({ mode: "byob" });
  await assert.rejects(reader.read(new Uint8Array(256)), (error) => error === failure);
  await assert.rejects(reader.closed, (error) => error === failure);
  assert.doesNotThrow(() => reader.releaseLock());
});

test("BYOB relay candidate does not issue a second read while downstream settlement is pending", async () => {
  let readCalls = 0;
  let releaseSettlement;
  const settlementGate = new Promise((resolve) => { releaseSettlement = resolve; });
  const { stream } = createByteStream({ chunks: [[0xa1, 0xa2], [0xb1, 0xb2]] });
  const nativeReader = stream.getReader({ mode: "byob" });
  const reader = {
    async read(view) { readCalls += 1; return nativeReader.read(view); },
    cancel(reason) { return nativeReader.cancel(reason); },
    releaseLock() { return nativeReader.releaseLock(); }
  };
  const forwarded = [];
  const pump = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read(new Uint8Array(4096));
        if (done) return;
        if (!value.byteLength) continue;
        forwarded.push([...value]);
        if (forwarded.length === 1) await settlementGate;
      }
    } finally {
      reader.releaseLock();
    }
  })();

  while (readCalls === 0) await new Promise((resolve) => setImmediate(resolve));
  while (forwarded.length === 0) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(readCalls, 1);
  assert.deepEqual(forwarded, [[0xa1, 0xa2]]);
  releaseSettlement();
  await pump;
  assert.deepEqual(forwarded, [[0xa1, 0xa2], [0xb1, 0xb2]]);
  assert.equal(readCalls, 3, "two data reads plus the terminal done read");
});
test("BYOB cancel during a pending upstream read produces no late downstream send", async () => {
  let cancelCalls = 0;
  const stream = new ReadableStream({
    type: "bytes",
    pull() {},
    cancel() { cancelCalls += 1; }
  });
  const reader = stream.getReader({ mode: "byob" });
  const sent = [];
  const readStarted = new Promise((resolve) => {
    const originalRead = reader.read.bind(reader);
    reader.read = (view) => { const result = originalRead(view); resolve(); return result; };
  });
  const pump = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read(new Uint8Array(4096));
        if (done) return;
        if (value?.byteLength) sent.push([...value]);
      }
    } finally {
      reader.releaseLock();
    }
  })();
  await readStarted;
  await reader.cancel(new Error("websocket closed"));
  await pump;
  assert.equal(cancelCalls, 1);
  assert.deepEqual(sent, []);
});

