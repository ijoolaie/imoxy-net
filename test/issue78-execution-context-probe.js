const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createExecutionContextProbeRoute({
  WebSocketPairClass = globalThis.WebSocketPair,
  ResponseClass = Response,
  log = (record) => console.log("IMOXY_EXECUTION_CONTEXT_PROBE " + JSON.stringify(record)),
  setTimer = setTimeout
} = {}) {
  return function handleExecutionContextProbe(request, env, executionContext) {
    const expectedPath = env?.SMOKE_EXECUTION_CONTEXT_PROBE_PATH;
    if (typeof expectedPath !== "string" || !/^\/_test\/execution-context\/[0-9a-f-]{36}$/i.test(expectedPath)) {
      return null;
    }
    const url = new URL(request.url);
    if (url.pathname !== expectedPath || request.method !== "GET") return null;
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("websocket upgrade required", { status: 426 });
    }

    const nonce = url.searchParams.get("nonce");
    const caseName = url.searchParams.get("case");
    if (!UUID_PATTERN.test(nonce ?? "") || !["control", "late"].includes(caseName)) {
      return new Response("not found", { status: 404 });
    }
    if (typeof WebSocketPairClass !== "function") {
      return new Response("websocket pair unavailable", { status: 500 });
    }

    const pair = new WebSocketPairClass();
    const client = pair[0] ?? pair.client;
    const server = pair[1] ?? pair.server;
    if (!client || !server || typeof server.accept !== "function") {
      return new Response("invalid websocket pair", { status: 500 });
    }

    const startedAt = Date.now();
    const emit = (event, extra = {}) => log({
      nonce,
      case: caseName,
      event,
      elapsedMs: Date.now() - startedAt,
      ...extra
    });

    server.accept();
    server.addEventListener("close", () => {
      emit("close_event");
      if (typeof executionContext?.waitUntil !== "function") {
        emit("execution_context_unavailable");
        return;
      }
      const task = new Promise((resolve) => setTimer(resolve, 500)).then(() => {
        emit("task_completed");
      });
      try {
        executionContext.waitUntil(task);
        emit("wait_until_registered");
      } catch (error) {
        emit("wait_until_registration_error", { errorName: error?.name ?? "Error" });
      }
    });

    return new ResponseClass(null, { status: 101, webSocket: client });
  };
}
