import test from "node:test";
import assert from "node:assert/strict";
import {
  checkPreviewHealth,
  redactPreviewOutput,
  summarizePreviewProcess
} from "../scripts/vless-smoke-preview-diagnostics.mjs";

test("preview process summary distinguishes absent, running, and exited children", () => {
  assert.deepEqual(summarizePreviewProcess(null), { state: "not_started" });
  assert.deepEqual(summarizePreviewProcess({ exitCode: null, signalCode: null, killed: false }), {
    state: "running", exitCode: null, signalCode: null, killed: false
  });
  assert.deepEqual(summarizePreviewProcess({ exitCode: 1, signalCode: null, killed: false }), {
    state: "exited", exitCode: 1, signalCode: null, killed: false
  });
});

test("preview output redacts known credentials and bearer tokens", () => {
  const output = "diagnostics=secret-diagnostics-token credential=secret-client-credential Authorization: Bearer abc.def.ghi";
  const redacted = redactPreviewOutput(output, [
    "secret-diagnostics-token",
    "secret-client-credential"
  ]);
  assert.equal(redacted.includes("secret-diagnostics-token"), false);
  assert.equal(redacted.includes("secret-client-credential"), false);
  assert.equal(redacted.includes("abc.def.ghi"), false);
  assert.equal(redacted.includes("[REDACTED]"), true);
});

test("preview health probe reports HTTP availability and fetch errors without throwing", async () => {
  assert.deepEqual(await checkPreviewHealth(async () => new Response("ok", { status: 200 })), {
    available: true, status: 200
  });
  assert.deepEqual(await checkPreviewHealth(async () => new Response("unavailable", { status: 503 })), {
    available: false, status: 503
  });
  assert.deepEqual(await checkPreviewHealth(async () => { throw new TypeError("fetch failed"); }), {
    available: false, errorName: "TypeError"
  });
});
