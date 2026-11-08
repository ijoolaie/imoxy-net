import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const LOG_PREFIX = "IMOXY_EXECUTION_CONTEXT_PROBE ";

export async function runExecutionContextProbeCase({
  url,
  nonce,
  caseName,
  holdMs,
  WebSocketCtor = globalThis.WebSocket,
  wait = delay,
  now = () => performance.now(),
  timeoutMs = holdMs + 15_000
}) {
  if (typeof WebSocketCtor !== "function") throw new Error("Node WebSocket client is unavailable.");
  if (!["control", "late"].includes(caseName)) throw new Error("Invalid probe case.");
  if (!Number.isSafeInteger(holdMs) || holdMs < 1000 || holdMs > 45_000) {
    throw new Error("holdMs must be between 1000 and 45000.");
  }
  const target = new URL(url);
  if (target.protocol !== "ws:" || target.hostname !== "127.0.0.1" ||
      target.username || target.password || target.hash) {
    throw new Error("ExecutionContext probe requires a local ws://127.0.0.1 URL.");
  }
  target.searchParams.set("nonce", nonce);
  target.searchParams.set("case", caseName);

  return new Promise((resolve, reject) => {
    const socket = new WebSocketCtor(target);
    let openedAt = null;
    let finished = false;
    let timeout;
    const cleanup = () => clearTimeout(timeout);
    const fail = (error) => {
      if (finished) return;
      finished = true;
      cleanup();
      try { socket.close(); } catch {}
      reject(error);
    };
    timeout = setTimeout(() => fail(new Error(caseName + " WebSocket probe timed out.")), timeoutMs);

    socket.addEventListener("open", () => {
      if (openedAt !== null) return;
      openedAt = now();
      void wait(holdMs).then(() => {
        if (finished) return;
        const elapsedMs = now() - openedAt;
        if (elapsedMs < holdMs) {
          fail(new Error(caseName + " WebSocket closed before the required hold interval."));
          return;
        }
        if (socket.readyState === 1) socket.close(1000, "probe-complete");
      }, fail);
    });
    socket.addEventListener("error", () => fail(new Error(caseName + " WebSocket transport error.")));
    socket.addEventListener("close", () => {
      if (finished) return;
      if (openedAt === null) {
        fail(new Error(caseName + " WebSocket closed before opening."));
        return;
      }
      const elapsedMs = now() - openedAt;
      if (elapsedMs < holdMs) {
        fail(new Error(caseName + " WebSocket close was observed before the required hold interval."));
        return;
      }
      finished = true;
      cleanup();
      resolve({ case: caseName, holdMs, elapsedMs, closeObserved: true });
    });
  });
}

export function assertExecutionContextProbeLogs(output, nonce, expectedCases = ["control", "late"]) {
  if (typeof output !== "string" || !output) throw new Error("Wrangler preview output is empty.");
  const records = [];
  for (const line of output.split(/\r?\n/)) {
    const index = line.indexOf(LOG_PREFIX);
    if (index < 0) continue;
    const raw = line.slice(index + LOG_PREFIX.length).trim();
    try {
      const record = JSON.parse(raw);
      if (record?.nonce === nonce) records.push(record);
    } catch {
      throw new Error("Malformed ExecutionContext probe log record.");
    }
  }

  for (const caseName of expectedCases) {
    const selected = records.filter((record) => record.case === caseName);
    const events = selected.map((record) => record.event);
    const required = ["close_event", "wait_until_registered", "task_completed"];
    for (const event of required) {
      if (events.filter((value) => value === event).length !== 1) {
        throw new Error(caseName + " probe expected exactly one " + event + " marker.");
      }
    }
    if (events.includes("execution_context_unavailable") ||
        events.includes("wait_until_registration_error")) {
      const error = selected.find((record) => record.event === "wait_until_registration_error");
      throw new Error(caseName + " waitUntil registration failed: " + (error?.errorName ?? "context unavailable"));
    }
    const positions = required.map((event) => events.indexOf(event));
    if (!(positions[0] < positions[1] && positions[1] < positions[2])) {
      throw new Error(caseName + " probe lifecycle markers were out of order.");
    }
    if (selected.some((record) => !Number.isFinite(record.elapsedMs) || record.elapsedMs < 0)) {
      throw new Error(caseName + " probe contains invalid elapsed timing.");
    }
  }
  if (records.length !== expectedCases.length * 3) {
    throw new Error("ExecutionContext probe log contained missing, duplicate, or unexpected nonce-correlated markers.");
  }
  return { nonce, cases: expectedCases, eventsPerCase: 3 };
}

export async function runExecutionContextLifetimeProbe({
  baseUrl,
  routePath,
  previewOutput,
  WebSocketCtor = globalThis.WebSocket,
  wait = delay,
  now = () => performance.now()
}) {
  const nonce = randomUUID();
  const url = new URL(routePath, baseUrl).toString();
  const control = await runExecutionContextProbeCase({
    url, nonce, caseName: "control", holdMs: 5000, WebSocketCtor, wait, now
  });
  const late = await runExecutionContextProbeCase({
    url, nonce, caseName: "late", holdMs: 36_000, WebSocketCtor, wait, now
  });
  await wait(750);
  const evidence = assertExecutionContextProbeLogs(previewOutput(), nonce);
  return { nonce, control, late, evidence };
}
