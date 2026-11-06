import { connect } from "node:net";
import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const FRAME_BYTES = 16 * 1024;
const INITIAL_PAYLOAD = Buffer.from([0x17, 0x28, 0x39, 0x4a, 0xfb, 0xfc]);
const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export function encodeClientFrame(opcode, payload) {
  const body = Buffer.from(payload);
  const mask = randomBytes(4);
  let header;
  if (body.length < 126) {
    header = Buffer.from([0x80 | opcode, 0x80 | body.length]);
  } else if (body.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  const masked = Buffer.allocUnsafe(body.length);
  for (let index = 0; index < body.length; index += 1) {
    masked[index] = body[index] ^ mask[index & 3];
  }
  return Buffer.concat([header, mask, masked]);
}

export function parseServerFrame(buffer) {
  if (buffer.length < 2) return null;
  const first = buffer[0];
  const second = buffer[1];
  if ((first & 0x70) !== 0 || (second & 0x80) !== 0) {
    throw new Error("invalid server WebSocket frame flags");
  }
  let length = second & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buffer.length < 10) return null;
    const wideLength = buffer.readBigUInt64BE(2);
    if (wideLength > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("server WebSocket frame exceeds the safe length limit");
    }
    length = Number(wideLength);
    offset = 10;
  }
  if (buffer.length < offset + length) return null;
  return {
    fin: (first & 0x80) !== 0,
    opcode: first & 0x0f,
    payload: buffer.subarray(offset, offset + length),
    bytesConsumed: offset + length
  };
}

function makeExpectedPayload(payloadBytes) {
  const payload = Buffer.allocUnsafe(payloadBytes);
  for (let offset = 0; offset < payloadBytes; offset += 1) {
    const frameIndex = Math.floor(offset / FRAME_BYTES);
    const byteIndex = offset % FRAME_BYTES;
    payload[offset] = (byteIndex * 31 + frameIndex * 17 + 7) & 0xff;
  }
  return Buffer.concat([INITIAL_PAYLOAD, payload]);
}

function makeVlessRequest(credential) {
  if (typeof credential !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(credential)) {
    throw new Error("IMOXY_VLESS_CREDENTIAL must be a canonical UUID");
  }
  const uuid = Buffer.from(credential.replaceAll("-", ""), "hex");
  const host = Buffer.from("probe.imoxy.invalid", "utf8");
  const header = Buffer.concat([
    Buffer.from([0]),
    uuid,
    Buffer.from([0, 1, 0x13, 0x88, 2, host.length]),
    host,
    INITIAL_PAYLOAD
  ]);
  return header;
}

function writeWithBackpressure(socket, frame) {
  return new Promise((resolve, reject) => {
    if (socket.destroyed || !socket.writable) {
      reject(new Error("WebSocket TCP connection closed while sending"));
      return;
    }
    if (socket.write(frame)) {
      resolve();
      return;
    }
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("WebSocket TCP connection closed before write drain"));
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("drain", onDrain);
      socket.off("close", onClose);
      socket.off("error", onError);
    };
    socket.once("drain", onDrain);
    socket.once("close", onClose);
    socket.once("error", onError);
  });
}

export async function runSlowReaderSession({
  url,
  credential,
  payloadBytes = 4 * 1024 * 1024,
  pauseMs = 2500,
  timeoutMs = 45000
}) {
  const target = new URL(url);
  if (target.protocol !== "ws:" || target.hostname !== "127.0.0.1" ||
      target.pathname !== "/proxy/vless" ||
      target.username || target.password) {
    throw new Error("slow-reader probe requires ws://127.0.0.1/proxy/vless without embedded credentials");
  }
  if (!Number.isSafeInteger(payloadBytes) || payloadBytes < FRAME_BYTES || payloadBytes > 6 * 1024 * 1024) {
    throw new Error("payloadBytes must be between one frame and 6 MiB");
  }
  if (!Number.isSafeInteger(pauseMs) || pauseMs < 1000 || pauseMs > 10000) {
    throw new Error("pauseMs must be between 1000 and 10000");
  }

  const expected = makeExpectedPayload(payloadBytes);
  const startedAt = Date.now();
  const key = randomBytes(16).toString("base64");
  const expectedAccept = createHash("sha1").update(key + WEBSOCKET_GUID).digest("base64");

  return new Promise((resolve, reject) => {
    const socket = connect({
      host: target.hostname,
      port: Number(target.port || 80)
    });
    socket.setNoDelay(true);
    let input = Buffer.alloc(0);
    let httpUpgraded = false;
    let handshakeReceived = false;
    let uploadStarted = false;
    let uploadFinished = false;
    let pausedAt = null;
    let resumedAt = null;
    let firstByteAfterResumeAt = null;
    let receivedBytes = 0;
    let framesReceived = 0;
    let fragmentOpcode = null;
    let fragments = [];
    let finished = false;
    let pauseTimer = null;

    const timer = setTimeout(() => fail(new Error(
      `slow-reader session timed out (readyState=${socket.destroyed ? "closed" : "open"}, handshake=${handshakeReceived}, received=${receivedBytes}/${expected.length})`
    )), timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      if (pauseTimer) clearTimeout(pauseTimer);
      socket.removeAllListeners("data");
    };
    const fail = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      socket.destroy();
      reject(error);
    };
    const succeed = () => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve({
        uploadBytes: expected.length,
        downloadBytes: receivedBytes,
        payloadBytes,
        pauseDelayMs: pauseMs,
        pausedDurationMs: resumedAt - pausedAt,
        firstByteAfterResumeMs: firstByteAfterResumeAt === null ? null : firstByteAfterResumeAt - resumedAt,
        elapsedMs: Date.now() - startedAt,
        framesSent: Math.ceil(payloadBytes / FRAME_BYTES) + 1,
        framesReceived
      });
      socket.end(encodeClientFrame(0x8, Buffer.from([0x03, 0xe8])));
    };

    const sendInitial = async () => {
      try {
        await writeWithBackpressure(socket, encodeClientFrame(0x2, makeVlessRequest(credential)));
      } catch (error) {
        fail(error);
      }
    };

    const sendUpload = async () => {
      if (uploadStarted) return;
      uploadStarted = true;
      socket.pause();
      pausedAt = Date.now();
      try {
        const payload = expected.subarray(INITIAL_PAYLOAD.length);
        for (let offset = 0; offset < payload.length; offset += FRAME_BYTES) {
          await writeWithBackpressure(
            socket,
            encodeClientFrame(0x2, payload.subarray(offset, Math.min(offset + FRAME_BYTES, payload.length)))
          );
        }
        uploadFinished = true;
        pauseTimer = setTimeout(() => {
          resumedAt = Date.now();
          socket.resume();
        }, pauseMs);
      } catch (error) {
        fail(error);
      }
    };

    const handleMessage = (opcode, payload) => {
      if (opcode === 0x8) {
        if (receivedBytes !== expected.length) {
          const closeCode = payload.length >= 2 ? payload.readUInt16BE(0) : null;
          const closeReason = payload.length > 2 ? payload.subarray(2).toString("utf8") : "";
          fail(new Error(
            `server closed before exact echo completed (${receivedBytes}/${expected.length}; closeCode=${closeCode ?? "none"}; closeReason=${JSON.stringify(closeReason)})`
          ));
        }
        return;
      }
      if (opcode === 0x9) {
        void writeWithBackpressure(socket, encodeClientFrame(0xA, payload)).catch(fail);
        return;
      }
      if (opcode === 0xA) return;
      if (opcode !== 0x2) {
        fail(new Error("server sent an unsupported WebSocket data opcode"));
        return;
      }
      if (!handshakeReceived) {
        if (payload.length !== 2 || payload[0] !== 0 || payload[1] !== 0) {
          fail(new Error("unexpected VLESS handshake response"));
          return;
        }
        handshakeReceived = true;
        void sendUpload();
        return;
      }
      if (firstByteAfterResumeAt === null && resumedAt !== null && payload.length > 0) {
        firstByteAfterResumeAt = Date.now();
      }
      framesReceived += 1;
      for (let index = 0; index < payload.length; index += 1) {
        if (receivedBytes >= expected.length || payload[index] !== expected[receivedBytes]) {
          fail(new Error(`slow-reader echo mismatch at byte ${receivedBytes + index}`));
          return;
        }
        receivedBytes += 1;
      }
      if (receivedBytes === expected.length && uploadFinished) succeed();
    };

    const parseFrames = () => {
      while (httpUpgraded) {
        const frame = parseServerFrame(input);
        if (!frame) return;
        input = input.subarray(frame.bytesConsumed);
        if (frame.opcode === 0x0) {
          if (fragmentOpcode === null) {
            fail(new Error("unexpected WebSocket continuation frame"));
            return;
          }
          fragments.push(frame.payload);
          if (frame.fin) {
            const payload = Buffer.concat(fragments);
            const opcode = fragmentOpcode;
            fragmentOpcode = null;
            fragments = [];
            handleMessage(opcode, payload);
          }
        } else if (!frame.fin && (frame.opcode === 0x2 || frame.opcode === 0x1)) {
          if (fragmentOpcode !== null) {
            fail(new Error("nested WebSocket fragmented message"));
            return;
          }
          fragmentOpcode = frame.opcode;
          fragments = [frame.payload];
        } else {
          handleMessage(frame.opcode, frame.payload);
        }
        if (finished) return;
      }
    };

    socket.on("error", fail);
    socket.on("close", () => {
      if (!finished && receivedBytes !== expected.length) {
        fail(new Error(`TCP connection closed early (${receivedBytes}/${expected.length})`));
      }
    });
    socket.on("data", (chunk) => {
      if (resumedAt !== null && firstByteAfterResumeAt === null && chunk.length > 0) {
        firstByteAfterResumeAt = Date.now();
      }
      input = Buffer.concat([input, chunk]);
      if (!httpUpgraded) {
        const boundary = input.indexOf("\r\n\r\n");
        if (boundary < 0) return;
        const header = input.subarray(0, boundary).toString("latin1");
        const accept = header.match(/^sec-websocket-accept:\s*(.+)$/im)?.[1]?.trim();
        if (!/^HTTP\/1\.1 101\b/.test(header) || accept !== expectedAccept) {
          fail(new Error("server rejected the WebSocket upgrade or returned an invalid accept key"));
          return;
        }
        input = input.subarray(boundary + 4);
        httpUpgraded = true;
        void sendInitial();
      }
      parseFrames();
    });

    socket.once("connect", () => {
      socket.write([
        `GET ${target.pathname}${target.search} HTTP/1.1`,
        `Host: ${target.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        ""
      ].join("\r\n"));
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.IMOXY_VLESS_WS_URL;
  const credential = process.env.IMOXY_VLESS_CREDENTIAL;
  if (!url || !credential) {
    throw new Error("IMOXY_VLESS_WS_URL and IMOXY_VLESS_CREDENTIAL are required.");
  }
  const result = await runSlowReaderSession({ url, credential });
  console.log(JSON.stringify({
    ok: true,
    transport: "raw TCP WebSocket client with socket.pause()/resume()",
    readerPause: "paused while 4 MiB upload is echoed; resumed after configured delay",
    ...result
  }, null, 2));
}
