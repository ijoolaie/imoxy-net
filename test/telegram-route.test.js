import test from "node:test";
import assert from "node:assert/strict";
import { createApiHandler } from "../src/http/api.js";

test("Worker API delegates the Telegram webhook path to the integration handler", async () => {
  const received = [];
  const api = createApiHandler({
    telegramFactory: () => ({
      async fetch(request, env) {
        received.push({ path: new URL(request.url).pathname, env });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
    })
  });
  const env = { TELEGRAM_WEBHOOK_SECRET: "configured" };
  const response = await api.fetch(new Request("https://imoxy.test/api/v1/integrations/telegram/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(received, [{ path: "/api/v1/integrations/telegram/webhook", env }]);
});
