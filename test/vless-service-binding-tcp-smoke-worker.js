import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
import {
  createServiceBindingTcpConnector,
  resolveServiceBindingSmokeDestination
} from "./vless-service-binding-tcp-connector.js";

const MAX_DIAGNOSTIC_EVENTS = 256;
const MAX_LOGGED_DIAGNOSTIC_EVENTS = 64;
const MAX_LOGGED_LIFECYCLE_EVENTS = 32;
const MAX_TRANSFER_SUMMARIES = 16;
const MAX_LOGGED_TRANSFER_SUMMARIES = 16;
let loggedDiagnosticEvents = 0;
let loggedLifecycleEvents = 0;
let loggedTransferSummaries = 0;
const diagnosticEvents = [];
const transferSummaries = [];
let droppedDiagnosticEvents = 0;

function createStageTotals() {
  return { count: 0, bytes: 0, totalDurationMs: 0, maxDurationMs: 0 };
}

export function createTransferDiagnosticsAccumulator() {
  const totals = {
    scope: "worker-isolate-cumulative",
    closeSequence: 0,
    downloadChunksRead: 0,
    downloadBytesRead: 0,
    websocketSend: createStageTotals(),
    quotaReserve: createStageTotals(),
    quotaMarkForwarding: createStageTotals(),
    quotaSettle: createStageTotals()
  };

  const addStage = (stage, event) => {
    const durationMs = Number.isFinite(event.durationMs) && event.durationMs >= 0
      ? event.durationMs
      : 0;
    stage.count += 1;
    stage.bytes += Number.isSafeInteger(event.bytes) && event.bytes > 0 ? event.bytes : 0;
    stage.totalDurationMs += durationMs;
    stage.maxDurationMs = Math.max(stage.maxDurationMs, durationMs);
  };

  return {
    record(event) {
      const name = String(event?.event ?? "unknown");
      if (name === "tcp.read_chunk" && Number.isSafeInteger(event.bytes) && event.bytes > 0) {
        totals.downloadChunksRead += 1;
        totals.downloadBytesRead += event.bytes;
      } else if (name === "websocket.send.complete") {
        addStage(totals.websocketSend, event);
      } else if (name === "quota.reserve.complete" && event.direction === "download") {
        addStage(totals.quotaReserve, event);
      } else if (name === "quota.mark_forwarding.complete" && event.direction === "download") {
        addStage(totals.quotaMarkForwarding, event);
      } else if (name === "quota.settle.complete" && event.direction === "download") {
        addStage(totals.quotaSettle, event);
      }

      if (name !== "session.close.start") return null;
      totals.closeSequence += 1;
      return {
        ...totals,
        websocketSend: { ...totals.websocketSend },
        quotaReserve: { ...totals.quotaReserve },
        quotaMarkForwarding: { ...totals.quotaMarkForwarding },
        quotaSettle: { ...totals.quotaSettle }
      };
    }
  };
}

const transferDiagnostics = createTransferDiagnosticsAccumulator();

export function recordDiagnostic(event) {
  // Keep only the small, explicitly approved payload-free fields.
  const record = { event: String(event?.event ?? "unknown") };
  for (const key of ["direction", "bytes", "durationMs", "errorName", "kind", "reason", "code", "released"]) {
    const value = event?.[key];
    if (typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value)) ||
        typeof value === "boolean") {
      record[key] = value;
    }
  }
  if (diagnosticEvents.length >= MAX_DIAGNOSTIC_EVENTS) {
    diagnosticEvents.shift();
    droppedDiagnosticEvents += 1;
  }
  diagnosticEvents.push(record);
  const transferSummary = transferDiagnostics.record(record);
  if (transferSummary) {
    if (transferSummaries.length >= MAX_TRANSFER_SUMMARIES) transferSummaries.shift();
    transferSummaries.push(transferSummary);
    if (loggedTransferSummaries < MAX_LOGGED_TRANSFER_SUMMARIES) {
      console.log("VLESS_SMOKE_TRANSFER_SUMMARY " + JSON.stringify(transferSummary));
      loggedTransferSummaries += 1;
    }
  }
  const isLifecycleEvent = record.event.startsWith("session.") ||
    record.event === "websocket.close_event" ||
    record.event.startsWith("tcp.socket_close.");
  if (isLifecycleEvent && loggedLifecycleEvents < MAX_LOGGED_LIFECYCLE_EVENTS) {
    console.log("VLESS_SMOKE_LIFECYCLE " + JSON.stringify(record));
    loggedLifecycleEvents += 1;
  }
  if (loggedDiagnosticEvents < MAX_LOGGED_DIAGNOSTIC_EVENTS) {
    console.log("VLESS_SMOKE_DIAGNOSTIC " + JSON.stringify(record));
    loggedDiagnosticEvents += 1;
  } else if (loggedDiagnosticEvents === MAX_LOGGED_DIAGNOSTIC_EVENTS) {
    console.log("VLESS_SMOKE_DIAGNOSTIC further events suppressed");
    loggedDiagnosticEvents += 1;
  }
}

const vlessProxy = createVlessWebSocketHandler({
  connectTcp: createServiceBindingTcpConnector(),
  resolveDestination: resolveServiceBindingSmokeDestination,
  onDiagnostic: recordDiagnostic
});

function diagnosticsResponse(request, env) {
  const token = env?.SMOKE_DIAGNOSTICS_TOKEN;
  if (typeof token !== "string" || token.length < 32 ||
      request.headers.get("x-imoxy-smoke-diagnostics-token") !== token) {
    return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
  return new Response(JSON.stringify({
    scope: "current-worker-isolate",
    events: diagnosticEvents,
    droppedEvents: droppedDiagnosticEvents,
    transferSummaries
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export function createSmokeWorker({
  proxyFetch = (request, env, executionContext) => vlessProxy.fetch(request, env, executionContext)
} = {}) {
  return {
    async fetch(request, env, executionContext) {
      const url = new URL(request.url);
      if (url.pathname === "/_test/diagnostics" && request.method === "GET") {
        return diagnosticsResponse(request, env);
      }
      const response = await proxyFetch(request, env, executionContext);
      if (response) return response;
      if (url.pathname === "/health" && request.method === "GET") {
        return new Response("ok", { headers: { "cache-control": "no-store" } });
      }
      return new Response("not found", { status: 404 });
    }
  };
}

export default createSmokeWorker();
