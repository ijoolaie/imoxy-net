const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const PRELUDE = Uint8Array.from([
  0x49, 0x4d, 0x58, 0x59, 0x2d, 0x52, 0x53, 0x54,
  0x2d, 0x50, 0x52, 0x45, 0x4c, 0x55, 0x44, 0x45
]);
const MAX_LINE_BYTES = 128;
const MAX_BUFFER_BYTES = MAX_LINE_BYTES + PRELUDE.byteLength;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_OBSERVATION_TIMEOUT_MS = 5000;
const CLEANUP_WAIT_MS = 1000;

function now() {
  return performance.now();
}

function errorName(error) {
  return typeof error?.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)
    ? error.name
    : "Error";
}

function isPublicIpv4(value) {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9][0-9]{0,2})$/.test(part))) return false;
  const [a, b, c, d] = parts.map(Number);
  if ([a, b, c, d].some((part) => part > 255)) return false;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168)) return false;
  if (a === 192 && (
    (b === 31 && c === 196) ||
    (b === 52 && c === 193) ||
    (b === 88 && c === 99) ||
    (b === 175 && c === 48)
  )) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

async function signCommand(token, mode, nonce) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(token),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("MODE " + mode + " " + nonce)
  ));
  return [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readConfig(env) {
  const ip = env?.FAULT_IP;
  const port = Number(env?.FAULT_PORT);
  const mode = env?.FAULT_MODE;
  const token = env?.FAULT_TOKEN;
  const probePath = env?.PROBE_PATH;
  if (!isPublicIpv4(ip)) throw new TypeError("A public literal IPv4 FAULT_IP is required.");
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535 ||
      String(port) !== String(env?.FAULT_PORT)) {
    throw new TypeError("A canonical FAULT_PORT between 1024 and 65535 is required.");
  }
  if (mode !== "FIN" && mode !== "RST") throw new TypeError("FAULT_MODE must be FIN or RST.");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    throw new TypeError("A one-run base64url FAULT_TOKEN is required.");
  }
  if (typeof probePath !== "string" ||
      !/^\/__issue78_tcp_fault_probe\/[A-Za-z0-9_-]{16,64}$/.test(probePath)) {
    throw new TypeError("A unique configured PROBE_PATH is required.");
  }
  return {
    ip,
    port,
    mode,
    token,
    probePath,
    allowHalfOpen: env?.ALLOW_HALF_OPEN === "true"
  };
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + "_timeout")), timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function concat(left, right) {
  if (left.byteLength + right.byteLength > MAX_BUFFER_BYTES) {
    throw new RangeError("TCP probe response exceeded its fixed buffer limit.");
  }
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left);
  result.set(right, left.byteLength);
  return result;
}

function createCursor(reader, timeoutMs) {
  let buffered = new Uint8Array(0);
  async function fill(requiredBytes) {
    while (buffered.byteLength < requiredBytes) {
      const result = await withTimeout(reader.read(), timeoutMs, "tcp_probe_read");
      if (result.done) throw new Error("tcp_probe_unexpected_eof");
      if (!(result.value instanceof Uint8Array)) throw new TypeError("tcp_probe_invalid_chunk");
      buffered = concat(buffered, result.value);
    }
  }
  return {
    async readLine() {
      while (true) {
        const newline = buffered.indexOf(0x0a);
        if (newline >= 0) {
          if (newline > MAX_LINE_BYTES) throw new RangeError("tcp_probe_line_too_long");
          const line = buffered.slice(0, newline);
          buffered = buffered.slice(newline + 1);
          const normalized = line.at(-1) === 0x0d ? line.slice(0, -1) : line;
          return decoder.decode(normalized);
        }
        if (buffered.byteLength >= MAX_LINE_BYTES) throw new RangeError("tcp_probe_line_too_long");
        await fill(buffered.byteLength + 1);
      }
    },
    async readExact(length) {
      await fill(length);
      const value = buffered.slice(0, length);
      buffered = buffered.slice(length);
      return value;
    }
  };
}

function sameBytes(left, right) {
  if (left.byteLength !== right.byteLength) return false;
  for (let i = 0; i < left.byteLength; i += 1) if (left[i] !== right[i]) return false;
  return true;
}

function captureRead(promise, localCloseStarted) {
  return Promise.resolve(promise).then(
    (result) => ({
      status: "fulfilled",
      done: result.done === true,
      bytes: result.value?.byteLength ?? 0,
      at: now(),
      afterLocalCleanup: localCloseStarted() !== null
    }),
    (error) => ({
      status: "rejected",
      errorName: errorName(error),
      at: now(),
      afterLocalCleanup: localCloseStarted() !== null
    })
  );
}

export function createTcpFaultProbeWorker(options = {}) {
  const injectedConnect = options.connectTcp;
  if (typeof injectedConnect !== "function") throw new TypeError("connectTcp is required");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const observationTimeoutMs = options.observationTimeoutMs ?? DEFAULT_OBSERVATION_TIMEOUT_MS;
  const cleanupWaitMs = options.cleanupWaitMs ?? CLEANUP_WAIT_MS;

  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method !== "GET") return new Response("method not allowed", { status: 405 });
      if (url.pathname === "/health" && !url.search) {
        return Response.json({ ok: true, role: "issue78-tcp-fault-probe" }, {
          headers: { "cache-control": "no-store" }
        });
      }
      if (url.pathname !== env?.PROBE_PATH || url.search) {
        return new Response("not found", { status: 404 });
      }

      let config;
      try {
        config = readConfig(env);
      } catch (error) {
        return Response.json({ ok: false, error: errorName(error) }, { status: 503 });
      }

      let socket = null;
      let reader = null;
      let writer = null;
      let closeStartedAt = null;
      let closeCompletedAt = null;
      let closeErrorName = null;
      let readOutcome = null;
      let closedOutcome = null;
      let commandWrite = null;
      let ackWrite = null;
      let openedAt = null;
      let readyAt = null;
      let ackAt = null;
      let observationTimedOut = false;
      let nonce = null;
      let primaryError = null;
      let observations = null;

      const localCloseStarted = () => closeStartedAt;
      async function closeSocket() {
        if (!socket || closeStartedAt !== null) return;
        closeStartedAt = now();
        try {
          await socket.close();
        } catch (error) {
          closeErrorName = errorName(error);
        } finally {
          closeCompletedAt = now();
        }
      }

      try {
        const connectTcp = injectedConnect;
        nonce = crypto.randomUUID().replaceAll("-", "");
        if (!/^[a-f0-9]{32}$/.test(nonce)) throw new Error("tcp_probe_nonce_invalid");

        socket = await withTimeout(connectTcp({
          hostname: config.ip,
          port: config.port,
          allowHalfOpen: config.allowHalfOpen
        }), timeoutMs, "tcp_probe_connect");

        if (!socket || !socket.opened || !socket.closed ||
            typeof socket.closed.then !== "function" ||
            typeof socket.close !== "function" ||
            typeof socket.readable?.getReader !== "function" ||
            typeof socket.writable?.getWriter !== "function") {
          throw new TypeError("tcp_probe_socket_shape_invalid");
        }

        // Attach immediately after connect resolves, before awaiting socket.opened.
        closedOutcome = Promise.resolve(socket.closed).then(
          () => ({
            status: "resolved",
            at: now(),
            afterLocalCleanup: localCloseStarted() !== null
          }),
          (error) => ({
            status: "rejected",
            errorName: errorName(error),
            errorType: error === undefined ? "undefined" : error === null ? "null" : typeof error,
            at: now(),
            afterLocalCleanup: localCloseStarted() !== null
          })
        );

        await withTimeout(socket.opened, timeoutMs, "tcp_probe_open");
        openedAt = now();
        reader = socket.readable.getReader();
        writer = socket.writable.getWriter();
        const cursor = createCursor(reader, timeoutMs);

        const signature = await signCommand(config.token, config.mode, nonce);
        const command = encoder.encode("MODE " + config.mode + " " + nonce + " " + signature + "\n");
        const commandStart = now();
        await withTimeout(writer.write(command), timeoutMs, "tcp_probe_command_write");
        commandWrite = { status: "fulfilled", durationMs: now() - commandStart };

        const ready = await cursor.readLine();
        if (ready !== "READY " + nonce) throw new Error("tcp_probe_ready_nonce_mismatch");
        const prelude = await cursor.readExact(PRELUDE.byteLength);
        if (!sameBytes(prelude, PRELUDE)) throw new Error("tcp_probe_prelude_mismatch");
        readyAt = now();

        const ackStart = now();
        await withTimeout(writer.write(encoder.encode("ACK " + nonce + "\n")), timeoutMs, "tcp_probe_ack_write");
        ackWrite = { status: "fulfilled", durationMs: now() - ackStart };
        ackAt = now();

        readOutcome = captureRead(reader.read(), localCloseStarted);
        const settled = await Promise.race([
          Promise.all([closedOutcome, readOutcome]).then((values) => ({ settled: true, values })),
          delay(observationTimeoutMs).then(() => ({ settled: false, values: null }))
        ]);
        observationTimedOut = !settled.settled;
        observations = settled.values;
      } catch (error) {
        primaryError = errorName(error);
      } finally {
        await closeSocket();
        if (reader && readOutcome) {
          const drained = await Promise.race([
            readOutcome.then((value) => ({ settled: true, value })),
            delay(cleanupWaitMs).then(() => ({ settled: false, value: null }))
          ]);
          if (drained.settled) readOutcome = Promise.resolve(drained.value);
          try { reader.releaseLock(); } catch {}
        } else {
          try { reader?.releaseLock(); } catch {}
        }
        try { writer?.releaseLock(); } catch {}
      }

      if (observations) {
        [closedOutcome, readOutcome] = observations;
      } else {
        if (closedOutcome) {
          const closed = await Promise.race([
            closedOutcome,
            delay(cleanupWaitMs).then(() => null)
          ]);
          if (closed) closedOutcome = closed;
        }
        if (readOutcome && typeof readOutcome.then === "function") {
          const read = await Promise.race([
            readOutcome,
            delay(cleanupWaitMs).then(() => null)
          ]);
          if (read) readOutcome = read;
        }
      }

      const expectedObservation =
        config.mode === "RST"
          ? closedOutcome?.status === "rejected" && closedOutcome.afterLocalCleanup === false
          : readOutcome?.status === "fulfilled" && readOutcome.done === true &&
            readOutcome.afterLocalCleanup === false;
      const ok = primaryError === null && !observationTimedOut && expectedObservation &&
        commandWrite?.status === "fulfilled" && ackWrite?.status === "fulfilled";

      return Response.json({
        ok,
        role: "issue78-tcp-fault-probe",
        mode: config.mode,
        target: { ip: config.ip, port: config.port },
        allowHalfOpen: config.allowHalfOpen,
        nonce,
        openedAt,
        readyAt,
        ackAt,
        commandWrite,
        ackWrite,
        socketClosed: closedOutcome ?? { status: "pending_or_unobserved" },
        readable: readOutcome ?? { status: "pending_or_unobserved" },
        observationTimedOut,
        cleanup: { closeStartedAt, closeCompletedAt, closeErrorName },
        error: primaryError,
        caveat: "Standalone raw TCP observation only; no D1 or VLESS admission lease. Packet capture is required to confirm an actual TCP RST."
      }, {
        status: ok ? 200 : 500,
        headers: { "cache-control": "no-store" }
      });
    }
  };
}
