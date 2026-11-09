const PAYLOAD_BYTES = 32 * 1024;
const SOURCE_CHUNK_BYTES = 8 * 1024;
const BYOB_BUFFER_BYTES = 4 * 1024;
const TEST_ADDRESS = "byob-probe.imoxy.invalid:443";

function expectedByte(offset) {
  return (offset * 31 + 7) & 0xff;
}

async function readSocket(socket, mode) {
  let reader;
  try {
    reader = mode === "byob"
      ? socket.readable.getReader({ mode: "byob" })
      : socket.readable.getReader();
  } catch (error) {
    await socket.close?.().catch?.(() => {});
    return {
      mode,
      supported: false,
      errorName: String(error?.name ?? "Error"),
      errorMessage: String(error?.message ?? error).slice(0, 240)
    };
  }

  let receivedBytes = 0;
  let maxReadBytes = 0;
  let maxBackingBufferBytes = 0;
  let readCount = 0;
  let integrity = true;
  let view = mode === "byob" ? new Uint8Array(BYOB_BUFFER_BYTES) : null;

  try {
    while (readCount < 128) {
      const result = mode === "byob"
        ? await reader.read(view)
        : await reader.read();
      if (result.done) break;
      const chunk = result.value;
      if (!(chunk instanceof Uint8Array)) {
        integrity = false;
        break;
      }
      readCount += 1;
      maxReadBytes = Math.max(maxReadBytes, chunk.byteLength);
      maxBackingBufferBytes = Math.max(maxBackingBufferBytes, chunk.buffer.byteLength);
      for (let index = 0; index < chunk.byteLength; index += 1) {
        if (chunk[index] !== expectedByte(receivedBytes + index)) integrity = false;
      }
      receivedBytes += chunk.byteLength;
      if (mode === "byob") view = new Uint8Array(chunk.buffer);
    }
    return {
      mode,
      supported: true,
      receivedBytes,
      expectedBytes: PAYLOAD_BYTES,
      readCount,
      maxReadBytes,
      maxBackingBufferBytes,
      requestedBufferBytes: mode === "byob" ? BYOB_BUFFER_BYTES : null,
      integrity,
      ok: integrity && receivedBytes === PAYLOAD_BYTES
    };
  } catch (error) {
    return {
      mode,
      supported: true,
      receivedBytes,
      expectedBytes: PAYLOAD_BYTES,
      readCount,
      maxReadBytes,
      maxBackingBufferBytes,
      requestedBufferBytes: mode === "byob" ? BYOB_BUFFER_BYTES : null,
      integrity: false,
      ok: false,
      errorName: String(error?.name ?? "Error"),
      errorMessage: String(error?.message ?? error).slice(0, 240)
    };
  } finally {
    try { reader.releaseLock(); } catch {}
    try { await socket.close?.(); } catch {}
  }
}

export function createByobTcpProbeWorker() {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method !== "GET" || url.pathname !== env.PROBE_PATH) {
        return new Response("not found", { status: 404 });
      }
      if (!env.BACKEND || typeof env.BACKEND.connect !== "function") {
        return new Response("disposable backend binding unavailable", { status: 503 });
      }

      try {
        const defaultSocket = await env.BACKEND.connect(TEST_ADDRESS);
        const defaultReader = await readSocket(defaultSocket, "default");
        const byobSocket = await env.BACKEND.connect(TEST_ADDRESS);
        const byobReader = await readSocket(byobSocket, "byob");
        const ok = defaultReader.ok === true &&
          (byobReader.supported === false || byobReader.ok === true);
        return new Response(JSON.stringify({
          ok,
          payloadBytes: PAYLOAD_BYTES,
          sourceChunkBytes: SOURCE_CHUNK_BYTES,
          byobBufferBytes: BYOB_BUFFER_BYTES,
          defaultReader,
          byobReader,
          caveat: "A successful BYOB result bounds delivered views in this tested runtime only; it does not prove all native socket buffering or allocations are bounded."
        }), {
          status: ok ? 200 : 500,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          ok: false,
          errorName: String(error?.name ?? "Error"),
          errorMessage: String(error?.message ?? error).slice(0, 240)
        }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
        });
      }
    }
  };
}

export default createByobTcpProbeWorker();
