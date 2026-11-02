import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
import {
  createServiceBindingTcpConnector,
  resolveServiceBindingSmokeDestination
} from "./vless-service-binding-tcp-connector.js";

const vlessProxy = createVlessWebSocketHandler({
  connectTcp: createServiceBindingTcpConnector(),
  resolveDestination: resolveServiceBindingSmokeDestination,
  onDiagnostic(event) {
    // Test-only, payload-free timing and byte counters. Never log credentials,
    // destination identifiers, reservation IDs, or payload contents.
    console.log(`VLESS_SMOKE_DIAG ${JSON.stringify(event)}`);
  }
});

export default {
  async fetch(request, env) {
    const response = await vlessProxy.fetch(request, env);
    if (response) return response;
    if (new URL(request.url).pathname === "/health" && request.method === "GET") {
      return new Response("ok", { headers: { "cache-control": "no-store" } });
    }
    return new Response("not found", { status: 404 });
  }
};
