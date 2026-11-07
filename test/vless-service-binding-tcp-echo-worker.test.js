import assert from "node:assert/strict";
import test from "node:test";
import echoWorker from "./vless-service-binding-tcp-echo-worker.js";

const TRIGGER = Uint8Array.from([0x53, 0x4c, 0x4f, 0x57, 0x52, 0x44]);
const FRAME_BYTES = 16 * 1024;

async function invokeEcho(inputChunks) {
  const output = [];
  const readable = new ReadableStream({
    start(controller) {
      for (const chunk of inputChunks) controller.enqueue(chunk);
      controller.close();
    }
  });
  const writable = new WritableStream({
    write(chunk) {
      output.push(new Uint8Array(chunk));
    }
  });
  await echoWorker.connect({ readable, writable });
  const size = output.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of output) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

test("ordinary TCP smoke traffic remains byte-for-byte echo", async () => {
  const input = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const result = await invokeEcho([input.subarray(0, 3), input.subarray(3)]);
  assert.deepEqual(result, input);
});

test("slow-reader trigger generates deterministic downstream-only payload", async () => {
  const result = await invokeEcho([TRIGGER]);
  assert.equal(result.byteLength, 4 * 1024 * 1024);
  for (let offset = 0; offset < result.byteLength; offset += 1) {
    const frameIndex = Math.floor(offset / FRAME_BYTES);
    const byteIndex = offset % FRAME_BYTES;
    assert.equal(result[offset], (byteIndex * 31 + frameIndex * 17 + 7) & 0xff);
  }
});
