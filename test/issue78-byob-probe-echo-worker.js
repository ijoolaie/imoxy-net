const PAYLOAD_BYTES = 32 * 1024;
const SOURCE_CHUNK_BYTES = 8 * 1024;

export default {
  async connect(socket) {
    const writer = socket.writable.getWriter();
    try {
      for (let offset = 0; offset < PAYLOAD_BYTES; offset += SOURCE_CHUNK_BYTES) {
        const length = Math.min(SOURCE_CHUNK_BYTES, PAYLOAD_BYTES - offset);
        const chunk = new Uint8Array(length);
        for (let index = 0; index < length; index += 1) {
          chunk[index] = (((offset + index) * 31) + 7) & 0xff;
        }
        await writer.write(chunk);
      }
      await writer.close();
    } catch (error) {
      try { await writer.abort(error); } catch {}
      throw error;
    }
  }
};
