import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import test from "node:test";
import { encodeClientFrame, parseServerFrame, runSlowReaderSession } from "../scripts/vless-cloudflare-slow-reader-smoke.mjs";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function encodeServerFrame(opcode, payload) {
  const body = Buffer.from(payload);
  let header;
  if (body.length < 126) {
    header = Buffer.from([0x80 | opcode, body.length]);
  } else if (body.length <= 0xffff) {
    header = Buffer.from([0x80 | opcode, 126, body.length >> 8, body.length & 0xff]);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  return Buffer.concat([header, body]);
}

function parseClientFrame(buffer) {
  if (buffer.length < 2) return null;
  const marker = buffer[1] & 0x7f;
  let length = marker;
  let offset = 2;
  if (marker === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (marker === 127) {
    if (buffer.length < 10) return null;
    length = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }
  if ((buffer[1] & 0x80) === 0) throw new Error("client frame was not masked");
  if (buffer.length < offset + 4 + length) return null;
  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;
  const payload = Buffer.allocUnsafe(length);
  for (let index = 0; index < length; index += 1) {
    payload[index] = buffer[offset + index] ^ mask[index & 3];
  }
  return { opcode: buffer[0] & 0x0f, payload, bytesConsumed: offset + length };
}

test("rejects non-loopback targets before opening a socket", async () => {
  await assert.rejects(
    runSlowReaderSession({
      url: "ws://example.invalid:8787/proxy/vless",
      credential: "00112233-4455-6677-8899-aabbccddeeff"
    }),
    /127/
  );
});

test("encodes masked client frames and parses complete unmasked server frames", () => {
  const encoded = encodeClientFrame(0x2, Buffer.from("slow-reader"));
  assert.equal(encoded[1] & 0x80, 0x80);
  const decoded = parseClientFrame(encoded);
  assert.equal(decoded.opcode, 0x2);
  assert.equal(decoded.payload.toString(), "slow-reader");

  const serverFrame = encodeServerFrame(0x2, Buffer.alloc(300, 0x5a));
  assert.equal(parseServerFrame(serverFrame.subarray(0, 8)), null);
  const parsed = parseServerFrame(serverFrame);
  assert.equal(parsed.opcode, 0x2);
  assert.equal(parsed.payload.length, 300);
  assert.equal(parsed.payload[0], 0x5a);
});

test("reports the server WebSocket close code and reason when slow-reader echo ends early", async (t) => {
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let upgraded = false;
    let requestSeen = false;
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const boundary = buffer.indexOf("\r\n\r\n");
        if (boundary < 0) return;
        const request = buffer.subarray(0, boundary).toString("latin1");
        const key = request.match(/^sec-websocket-key:\s*(.+)$/im)?.[1]?.trim();
        if (!key) return socket.destroy(new Error("missing WebSocket key"));
        const accept = createHash("sha1").update(key + GUID).digest("base64");
        socket.write([
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          "Sec-WebSocket-Accept: " + accept,
          "",
          ""
        ].join("\r\n"));
        buffer = buffer.subarray(boundary + 4);
        upgraded = true;
      }
      while (upgraded) {
        const frame = parseClientFrame(buffer);
        if (!frame) break;
        buffer = buffer.subarray(frame.bytesConsumed);
        if (frame.opcode !== 0x2) continue;
        if (!requestSeen) {
          requestSeen = true;
          const reason = Buffer.from("client_write_queue_full");
          const closePayload = Buffer.alloc(2 + reason.length);
          closePayload.writeUInt16BE(1009, 0);
          reason.copy(closePayload, 2);
          socket.write(Buffer.concat([
            encodeServerFrame(0x2, Buffer.from([0, 0])),
            encodeServerFrame(0x8, closePayload)
          ]));
        }
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  await assert.rejects(
    runSlowReaderSession({
      url: `ws://127.0.0.1:${address.port}/proxy/vless`,
      credential: "00112233-4455-6677-8899-aabbccddeeff",
      payloadBytes: 16 * 1024,
      pauseMs: 1000,
      timeoutMs: 10000
    }),
    /closeCode=1009; closeReason="client_write_queue_full"/
  );
});

test("raw TCP WebSocket client pauses reads while echo data accumulates, then resumes losslessly", async (t) => {
  const initial = Buffer.from([0x17, 0x28, 0x39, 0x4a, 0xfb, 0xfc]);
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let upgraded = false;
    let firstFrame = true;
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!upgraded) {
        const boundary = buffer.indexOf("\r\n\r\n");
        if (boundary < 0) return;
        const request = buffer.subarray(0, boundary).toString("latin1");
        const key = request.match(/^sec-websocket-key:\s*(.+)$/im)?.[1]?.trim();
        if (!key) {
          socket.destroy(new Error("missing WebSocket key"));
          return;
        }
        const accept = createHash("sha1").update(key + GUID).digest("base64");
        socket.write([
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          "Sec-WebSocket-Accept: " + accept,
          "",
          ""
        ].join("\r\n"));
        buffer = buffer.subarray(boundary + 4);
        upgraded = true;
      }
      while (upgraded) {
        const frame = parseClientFrame(buffer);
        if (!frame) break;
        buffer = buffer.subarray(frame.bytesConsumed);
        if (frame.opcode === 0x8) {
          socket.end(encodeServerFrame(0x8, frame.payload));
          return;
        }
        if (frame.opcode !== 0x2) throw new Error("expected binary client frame");
        if (firstFrame) {
          firstFrame = false;
          assert.ok(frame.payload.subarray(-initial.length).equals(initial));
          socket.write(Buffer.concat([
            encodeServerFrame(0x2, Buffer.from([0, 0])),
            encodeServerFrame(0x2, initial)
          ]));
        } else {
          socket.write(encodeServerFrame(0x2, frame.payload));
        }
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const result = await runSlowReaderSession({
    url: `ws://127.0.0.1:${address.port}/proxy/vless`,
    credential: "00112233-4455-6677-8899-aabbccddeeff",
    payloadBytes: 16 * 1024,
    pauseMs: 1000,
    timeoutMs: 10000
  });

  assert.equal(result.uploadBytes, 6 + 16 * 1024);
  assert.equal(result.downloadBytes, 6 + 16 * 1024);
  assert.ok(result.pauseDelayMs >= 1000);
  assert.ok(result.pausedDurationMs >= 1000);
  assert.ok(result.framesReceived >= 1);
  assert.ok(result.firstByteAfterResumeMs >= 0);
  assert.equal(result.payloadBytes, 16 * 1024);
});
