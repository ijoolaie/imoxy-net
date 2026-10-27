import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

const request = (path, method = "GET") => new Request(`https://imoxy.test${path}`, { method });

test("GET /health returns a healthy service response", async () => {
  const response = await worker.fetch(request("/health"));
  assert.equal(response.status, 200);
  assert.deepEqual(Object.fromEntries(Object.entries(await response.json()).filter(([key]) => key !== "requestId")), { status: "ok", service: "imoxy-net" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("capabilities explicitly distinguish implemented and pending features", async () => {
  const response = await worker.fetch(request("/api/v1/capabilities"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.implemented.includes("health"));
  assert.ok(body.implemented.includes("authentication-and-session-routes"));
  assert.ok(body.implemented.includes("account-management-routes"));
  assert.ok(body.pending.includes("proxy-protocols-and-transports"));
});

test("unknown paths return JSON 404", async () => {
  const response = await worker.fetch(request("/missing"));
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.code, "not_found");
  assert.ok(body.error.requestId);
});

test("unsupported methods do not accidentally serve the health endpoint", async () => {
  const response = await worker.fetch(request("/health", "POST"));
  assert.equal(response.status, 404);
});

test("static panel routes use the Assets binding while API routes remain in Worker", async () => {
  const calls = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        calls.push(new URL(request.url).pathname);
        return new Response("panel-asset", { status: 200, headers: { "content-type": "text/plain" } });
      }
    }
  };
  const panel = await worker.fetch(request("/"), env);
  assert.equal(await panel.text(), "panel-asset");
  assert.deepEqual(calls, ["/"]);
  const api = await worker.fetch(request("/api/v1/capabilities"), env);
  assert.equal(api.status, 200);
  assert.ok((await api.json()).implemented.includes("cloudflare-read-only-inventory-and-dry-run-plans"));
  assert.deepEqual(calls, ["/"]);
});
