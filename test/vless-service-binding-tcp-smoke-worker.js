import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
import {
  createServiceBindingTcpConnector,
  resolveServiceBindingSmokeDestination
} from "./vless-service-binding-tcp-connector.js";

const MAX_DIAGNOSTIC_EVENTS = 256;
const diagnosticEvents = [];
let droppedDiagnosticEvents = 0;

export function recordDiagnostic(event) {
  // Keep only the small, explicitly approved payload-free fields.
  const record = { event: String(event?.event ?? "unknown") };
  for (const key of ["direction", "bytes", "durationMs", "errorName"]) {
    const value = event?.[key];
    if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) {
      record[key] = value;
    }
  }
  if (diagnosticEvents.length >= MAX_DIAGNOSTIC_EVENTS) {
    diagnosticEvents.shift();
    droppedDiagnosticEvents += 1;
  }
  diagnosticEvents.push(record);
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
    droppedEvents: droppedDiagnosticEvents
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/_test/diagnostics" && request.method === "GET") {
      return diagnosticsResponse(request, env);
    }
    const response = await vlessProxy.fetch(request, env);
    if (response) return response;
    if (url.pathname === "/health" && request.method === "GET") {
      return new Response("ok", { headers: { "cache-control": "no-store" } });
    }
    return new Response("not found", { status: 404 });
  }
};
