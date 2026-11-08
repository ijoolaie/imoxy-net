import { createApiHandler } from "./src/http/api.js";
import { createVlessWebSocketHandler } from "./src/proxy/vless-websocket-handler.js";

const api = createApiHandler();
const vlessProxy = createVlessWebSocketHandler();

export default {
  async fetch(request, env, ctx) {
    const proxyResponse = await vlessProxy.fetch(request, env, ctx);
    if (proxyResponse) return proxyResponse;
    const pathname = new URL(request.url).pathname;
    if (env?.ASSETS && !pathname.startsWith("/api/") && pathname !== "/health") {
      return env.ASSETS.fetch(request);
    }
    return api.fetch(request, env);
  }
};
