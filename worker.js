import { createApiHandler } from "./src/http/api.js";

const api = createApiHandler();

export default {
  fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (env?.ASSETS && !pathname.startsWith("/api/") && pathname !== "/health") {
      return env.ASSETS.fetch(request);
    }
    return api.fetch(request, env);
  }
};
