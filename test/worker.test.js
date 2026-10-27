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
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("unsupported methods do not accidentally serve the health endpoint", async () => {
  const response = await worker.fetch(request("/health", "POST"));
  assert.equal(response.status, 404);
});
