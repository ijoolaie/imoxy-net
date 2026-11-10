const PAYLOAD_BYTES = 32 * 1024;
const CHUNK_BYTES = 8 * 1024;
let connection = 0;
const expected = (n) => (n * 31 + 7) & 255;
export default {
  async connect(socket) {
    const n = ++connection;
    if (n === 4) {
      await new Promise(resolve => setTimeout(resolve, 10_000));
      try { await socket.close?.(); } catch {}
      return;
    }
    const writer = socket.writable.getWriter();
    try {
      if (n === 5) { await writer.close(); return; }
      if (n === 6) {
        // This observes peer socket closure; it does not synthesize a TCP reset.
        try { await socket.close?.(); } catch {}
        return;
      }
      for (let offset = 0; offset < PAYLOAD_BYTES; offset += CHUNK_BYTES) {
        const length = Math.min(CHUNK_BYTES, PAYLOAD_BYTES - offset);
        const chunk = new Uint8Array(length);
        for (let i = 0; i < length; i++) chunk[i] = expected(offset + i);
        await writer.write(chunk);
      }
      await writer.close();
    } catch (e) { try { await writer.abort(e); } catch {} throw e; }
  }
};
