const url = process.env.IMOXY_VLESS_WS_URL;
const credential = process.env.IMOXY_VLESS_CREDENTIAL;
if (!url || !credential) throw new Error("IMOXY_VLESS_WS_URL and IMOXY_VLESS_CREDENTIAL are required.");
if (typeof WebSocket !== "function") throw new Error("Node WebSocket client is unavailable.");

const encoder = new TextEncoder();
const FRAME_BYTES = 16 * 1024;
const FRAME_COUNT = 4;
const SESSION_TIMEOUT_MS = 8_500;
const UUID_BYTES = Uint8Array.from(
  credential.replaceAll("-", "").match(/.{2}/g) ?? [],
  (part) => Number.parseInt(part, 16)
);
if (UUID_BYTES.byteLength !== 16) throw new Error("The test credential is not a UUID.");

function concat(...chunks) {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function vlessRequest(payload) {
  const host = encoder.encode("probe.imoxy.invalid");
  const header = Uint8Array.from([
    0, ...UUID_BYTES, 0, 1, 0x13, 0x88, 2, host.byteLength, ...host
  ]);
  return concat(header, payload);
}

function runSession(sessionIndex) {
  return new Promise((resolve, reject) => {
    const initial = Uint8Array.from([0x10 + sessionIndex, 0x20, 0x30, 0x40, 0xfe, 0xff]);
    const frames = Array.from({ length: FRAME_COUNT }, (_, frameIndex) =>
      Uint8Array.from({ length: FRAME_BYTES }, (_, byteIndex) =>
        (byteIndex * 31 + frameIndex * 17 + sessionIndex) & 0xff
      )
    );
    const expected = concat(initial, ...frames);
    const actual = new Uint8Array(expected.byteLength);
    const startedAt = Date.now();
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    let handshakeReceived = false;
    let receivedBytes = 0;
    let sentFrames = false;
    let finished = false;

    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (error) {
        try { socket.close(1011, "runtime smoke failed"); } catch {}
        reject(error);
      } else {
        resolve({
          session: sessionIndex + 1,
          uploadBytes: expected.byteLength,
          downloadBytes: receivedBytes,
          framesSent: frames.length + 1,
          elapsedMs: Date.now() - startedAt
        });
      }
    };

    const timer = setTimeout(() => finish(new Error(`session ${sessionIndex + 1} exceeded ${SESSION_TIMEOUT_MS}ms (readyState=${socket.readyState}, handshakeReceived=${handshakeReceived}, sentFrames=${sentFrames}, receivedBytes=${receivedBytes}/${expected.byteLength})`)), SESSION_TIMEOUT_MS);

    socket.addEventListener("open", () => {
      socket.send(vlessRequest(initial));
    });

    socket.addEventListener("message", async (event) => {
      try {
        const bytes = event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : event.data instanceof Blob
            ? new Uint8Array(await event.data.arrayBuffer())
            : null;
        if (!bytes) throw new Error("received a non-binary WebSocket frame");

        if (!handshakeReceived) {
          if (bytes.byteLength !== 2 || bytes[0] !== 0 || bytes[1] !== 0) {
            throw new Error(`unexpected VLESS handshake response: ${Array.from(bytes).join(",")}`);
          }
          handshakeReceived = true;
          if (!sentFrames) {
            sentFrames = true;
            for (const frame of frames) socket.send(frame);
          }
          return;
        }

        if (receivedBytes + bytes.byteLength > expected.byteLength) {
          throw new Error("received more echo bytes than were sent");
        }
        for (let index = 0; index < bytes.byteLength; index += 1) {
          if (bytes[index] !== expected[receivedBytes + index]) {
            throw new Error(`echo mismatch at byte ${receivedBytes + index}`);
          }
        }
        actual.set(bytes, receivedBytes);
        receivedBytes += bytes.byteLength;

        if (receivedBytes === expected.byteLength) {
          if (actual.some((byte, index) => byte !== expected[index])) {
            throw new Error("echo payload did not match exactly");
          }
          socket.close(1000, "runtime smoke complete");
        }
      } catch (error) {
        finish(error);
      }
    });

    socket.addEventListener("error", () => finish(new Error(`WebSocket error in session ${sessionIndex + 1}`)));
    socket.addEventListener("close", (event) => {
      if (!handshakeReceived || receivedBytes !== expected.byteLength) {
        finish(new Error(`session ${sessionIndex + 1} closed early (code=${event.code}, bytes=${receivedBytes}/${expected.byteLength})`));
      } else {
        finish();
      }
    });
  });
}

const results = await Promise.all([runSession(0), runSession(1)]);
const expectedPerSession = 6 + FRAME_BYTES * FRAME_COUNT;
const totalUpload = results.reduce((sum, result) => sum + result.uploadBytes, 0);
const totalDownload = results.reduce((sum, result) => sum + result.downloadBytes, 0);
if (results.some((result) => result.uploadBytes !== expectedPerSession || result.downloadBytes !== expectedPerSession)) {
  throw new Error("one or more sessions did not complete the exact binary echo");
}
console.log(JSON.stringify({
  ok: true,
  transport: "Cloudflare Worker WebSocket -> VLESS handler -> Service Binding TCP echo",
  concurrentClients: results.length,
  frameBytes: FRAME_BYTES,
  totalUploadBytes: totalUpload,
  totalDownloadBytes: totalDownload,
  sessions: results
}, null, 2));
