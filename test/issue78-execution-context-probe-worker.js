import { createExecutionContextProbeRoute } from "./issue78-execution-context-probe.js";

const handleProbe = createExecutionContextProbeRoute();

export default {
  fetch(request, env, executionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return new Response("ok", { headers: { "cache-control": "no-store" } });
    }
    const response = handleProbe(request, env, executionContext);
    if (response) return response;
    return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
};
