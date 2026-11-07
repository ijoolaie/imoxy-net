// Internal-only TCP echo endpoint. Do not enable workers.dev or add a route.
const SLOW_READER_TRIGGER = Uint8Array.from([0x53, 0x4c, 0x4f, 0x57, 0x52, 0x44]);
const SLOW_READER_RESPONSE_BYTES = 4 * 1024 * 1024;
const FRAME_BYTES = 16 * 1024;

function concatBytes(left, right) {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left);
  result.set(right, left.byteLength);
  return result;
}

function isSlowReaderTrigger(bytes) {
  return bytes.byteLength >= SLOW_READER_TRIGGER.byteLength &&
    SLOW_READER_TRIGGER.every((value, index) => bytes[index] === value);
}

export default {
  async connect(socket) {
    // The special six-byte trigger asks this disposable endpoint to generate
    // downstream-only data; ordinary clients retain byte-for-byte echo behavior.
    const reader = socket.readable.getReader();
    const writer = socket.writable.getWriter();
    let prefix = new Uint8Array();
    while (prefix.byteLength < SLOW_READER_TRIGGER.byteLength) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value?.byteLength) prefix = concatBytes(prefix, value);
    }

    if (isSlowReaderTrigger(prefix)) {
      for (let offset = 0; offset < SLOW_READER_RESPONSE_BYTES; offset += FRAME_BYTES) {
        const length = Math.min(FRAME_BYTES, SLOW_READER_RESPONSE_BYTES - offset);
        const chunk = new Uint8Array(length);
        for (let index = 0; index < length; index += 1) {
          const absolute = offset + index;
          const frameIndex = Math.floor(absolute / FRAME_BYTES);
          const byteIndex = absolute % FRAME_BYTES;
          chunk[index] = (byteIndex * 31 + frameIndex * 17 + 7) & 0xff;
        }
        await writer.write(chunk);
      }
    } else if (prefix.byteLength) {
      await writer.write(prefix);
    }

    if (!isSlowReaderTrigger(prefix)) {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.byteLength) await writer.write(value);
      }
    }
    await writer.close();
    await reader.cancel();
  }
};
