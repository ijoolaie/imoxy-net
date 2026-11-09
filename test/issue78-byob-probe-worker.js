const PAYLOAD_BYTES = 32 * 1024, CHUNK_BYTES = 8 * 1024, BUFFER_BYTES = 4 * 1024;
const ADDRESS = "byob-probe.imoxy.invalid:443";
const expected = n => (n * 31 + 7) & 255;
async function close(socket) { try { await socket.close?.(); } catch {} }

async function transfer(socket, mode, fresh = false) {
  let reader;
  try { reader = mode === "byob" ? socket.readable.getReader({ mode: "byob" }) : socket.readable.getReader(); }
  catch (e) { await close(socket); return { ok: mode === "byob", supported: false, error: String(e?.name ?? "Error") }; }
  let view = mode === "byob" ? new Uint8Array(BUFFER_BYTES) : null;
  let bytes = 0, reads = 0, maxView = 0, maxBacking = 0, integrity = true, detached = true;
  try {
    while (reads < 128) {
      const supplied = view?.buffer;
      const result = mode === "byob" ? await reader.read(view) : await reader.read();
      if (supplied && supplied.byteLength !== 0) detached = false;
      if (result.done) break;
      const chunk = result.value;
      if (!(chunk instanceof Uint8Array)) { integrity = false; break; }
      maxView = Math.max(maxView, chunk.byteLength); maxBacking = Math.max(maxBacking, chunk.buffer.byteLength);
      for (let i = 0; i < chunk.byteLength; i++) if (chunk[i] !== expected(bytes + i)) integrity = false;
      bytes += chunk.byteLength; reads++;
      if (mode === "byob") view = fresh ? new Uint8Array(BUFFER_BYTES) : new Uint8Array(chunk.buffer);
    }
    return { ok: integrity && bytes === PAYLOAD_BYTES && (mode === "default" || detached),
      supported: true, receivedBytes: bytes, reads, maxReadBytes: maxView, maxBackingBufferBytes: maxBacking,
      integrity, detached, fresh };
  } finally { try { reader.releaseLock(); } catch {} await close(socket); }
}
async function cancelPending(socket) {
  const reader = socket.readable.getReader({ mode: "byob" }); let settled = false;
  const pending = reader.read(new Uint8Array(BUFFER_BYTES)).then(r => {
    settled = true; return { done: r.done, bytes: r.value?.byteLength ?? 0 };
  }, e => { settled = true; return { error: String(e?.name ?? "Error") }; });
  try {
    await reader.cancel("issue78 lifecycle cancellation"); const result = await pending;
    reader.releaseLock(); await close(socket);
    return { ok: settled && result.done === true && result.bytes === 0, settled, result };
  } catch (e) { try { await pending; } catch {} try { reader.releaseLock(); } catch {}
    await close(socket); return { ok: false, settled, error: String(e?.name ?? "Error") }; }
}
async function eof(socket) {
  const reader = socket.readable.getReader({ mode: "byob" });
  try { const r = await reader.read(new Uint8Array(BUFFER_BYTES));
    return { ok: r.done === true && (r.value?.byteLength ?? 0) === 0, done: r.done, bytes: r.value?.byteLength ?? 0 };
  } catch (e) { return { ok: false, error: String(e?.name ?? "Error") }; }
  finally { try { reader.releaseLock(); } catch {} await close(socket); }
}
async function peerError(socket) {
  const reader = socket.readable.getReader({ mode: "byob" });
  try { await reader.read(new Uint8Array(BUFFER_BYTES)); return { ok: false, unexpectedResolve: true }; }
  catch (e) { return { ok: true, rejected: true, error: String(e?.name ?? "Error") }; }
  finally { try { reader.releaseLock(); } catch {} await close(socket); }
}
export function createByobTcpProbeWorker() {
  return { async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET") return new Response("method not allowed", { status: 405 });
    if (url.pathname === "/health") return Response.json({ ok: true, role: "issue78-byob-probe" });
    if (url.pathname !== env.PROBE_PATH) return new Response("not found", { status: 404 });
    if (!env.BACKEND?.connect) return new Response("backend unavailable", { status: 503 });
    const results = {};
    try {
      results.defaultReader = await transfer(await env.BACKEND.connect(ADDRESS), "default");
      results.byobReader = await transfer(await env.BACKEND.connect(ADDRESS), "byob");
      if (!results.byobReader.supported) {
        results.byobFreshBuffers = { ok: true, skipped: "BYOB unavailable" };
        results.pendingReadCancel = { ok: true, skipped: "BYOB unavailable" };
        results.peerEof = { ok: true, skipped: "BYOB unavailable" };
        results.peerError = { ok: true, skipped: "BYOB unavailable" };
      } else {
        results.byobFreshBuffers = await transfer(await env.BACKEND.connect(ADDRESS), "byob", true);
        results.pendingReadCancel = await cancelPending(await env.BACKEND.connect(ADDRESS));
        results.peerEof = await eof(await env.BACKEND.connect(ADDRESS));
        results.peerError = await peerError(await env.BACKEND.connect(ADDRESS));
      }
      const ok = Object.values(results).every(x => x.ok === true);
      return Response.json({ ok, payloadBytes: PAYLOAD_BYTES, chunkBytes: CHUNK_BYTES, bufferBytes: BUFFER_BYTES,
        ...results, results,
        caveat: "API-visible lifecycle evidence only; not a bound on native socket buffering or total runtime memory." },
        { status: ok ? 200 : 500, headers: { "cache-control": "no-store" } });
    } catch (e) { return Response.json({ ok: false, results, error: String(e?.name ?? "Error"),
      message: String(e?.message ?? e).slice(0, 240) }, { status: 500 }); }
  } };
}
export default createByobTcpProbeWorker();
