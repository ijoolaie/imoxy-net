import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
import {
  createServiceBindingTcpConnector,
  resolveServiceBindingSmokeDestination
} from "./vless-service-binding-tcp-connector.js";

const vlessProxy = createVlessWebSocketHandler({
  connectTcp: createServiceBindingTcpConnector(),
  resolveDestination: resolveServiceBindingSmokeDestination
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
