import { createApiHandler } from "./src/http/api.js";

const api = createApiHandler();

export default {
  fetch(request, env) {
    return api.fetch(request, env);
  }
};
