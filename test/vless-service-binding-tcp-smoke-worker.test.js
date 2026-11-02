import test from "node:test";
import assert from "node:assert/strict";
import {
  VLESS_SERVICE_BINDING_SMOKE_HOST,
  VLESS_SERVICE_BINDING_SMOKE_PEER,
  VLESS_SERVICE_BINDING_SMOKE_PORT
} from "./vless-service-binding-tcp-smoke-worker.js";

test("service-binding smoke target is a fixed synthetic hostname, peer, and TCP port", () => {
  assert.equal(VLESS_SERVICE_BINDING_SMOKE_HOST, "probe.imoxy.invalid");
  assert.equal(VLESS_SERVICE_BINDING_SMOKE_PEER, "93.184.216.34");
  assert.equal(VLESS_SERVICE_BINDING_SMOKE_PORT, 5000);
});
