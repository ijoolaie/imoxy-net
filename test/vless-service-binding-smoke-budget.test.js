import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildVlessSmokeConfig,
  VLESS_SMOKE_EXPECTED_SETTLED_BYTES,
  VLESS_SMOKE_MAX_APP_SUBMITTED_DOWNSTREAM_BYTES,
  VLESS_SMOKE_EXPECTED_TOTAL_DOWNLOAD_BYTES,
  VLESS_SMOKE_EXPECTED_TOTAL_UPLOAD_BYTES,
  VLESS_SMOKE_LIMITS,
  VLESS_SMOKE_SLOW_READER_PAYLOAD_BYTES
} from "../scripts/vless-service-binding-smoke-budget.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("disposable Service Binding budget matches the owner-approved test envelope", () => {
  assert.deepEqual(VLESS_SMOKE_LIMITS, {
    maxDownloadBytes: 1024 * 1024,
    maxSessionDurationMs: 60_000,
    maxConcurrentSessions: 2,
    sessionLeaseGraceMs: 30_000
  });
  assert.equal(VLESS_SMOKE_SLOW_READER_PAYLOAD_BYTES, VLESS_SMOKE_LIMITS.maxDownloadBytes);
  assert.equal(VLESS_SMOKE_MAX_APP_SUBMITTED_DOWNSTREAM_BYTES, 2_097_156);
  assert.equal(VLESS_SMOKE_EXPECTED_TOTAL_UPLOAD_BYTES, 131_090);
  assert.equal(VLESS_SMOKE_EXPECTED_TOTAL_DOWNLOAD_BYTES, 1_179_660);
  assert.equal(VLESS_SMOKE_EXPECTED_SETTLED_BYTES, 1_310_750);
  assert.ok(VLESS_SMOKE_SLOW_READER_PAYLOAD_BYTES <= VLESS_SMOKE_LIMITS.maxDownloadBytes);
});

test("generated disposable Worker config carries every approved limit", () => {
  const config = buildVlessSmokeConfig({
    workerName: "imoxy-vless-smoke-vless-123-1",
    accountId: "disposable-account-id",
    databaseName: "imoxy-vless-smoke-d1-123-1",
    databaseId: "disposable-d1-id",
    echoName: "imoxy-vless-smoke-echo-123-1",
    diagnosticsToken: "test-only-diagnostics-token",
    usageProducerId: "imoxy-vless-smoke-123-1"
  });

  assert.match(config, /PROXY_MAX_DOWNLOAD_BYTES = "1048576"/);
  assert.match(config, /PROXY_MAX_SESSION_DURATION_MS = "60000"/);
  assert.match(config, /PROXY_MAX_CONCURRENT_SESSIONS = "2"/);
  assert.match(config, /PROXY_SESSION_LEASE_GRACE_MS = "30000"/);
  assert.match(config, /workers_dev = false/);
  assert.match(config, /preview_urls = false/);
  assert.match(config, /service = "imoxy-vless-smoke-echo-123-1"/);
});

test("checked-in template and runtime harness share the tested budget builder", async () => {
  const template = await readFile(path.join(ROOT, "wrangler.vless-service-binding-smoke.toml.example"), "utf8");
  const harness = await readFile(path.join(ROOT, "scripts/vless-service-binding-cloudflare-smoke.mjs"), "utf8");
  const slowReader = await readFile(path.join(ROOT, "scripts/vless-cloudflare-slow-reader-smoke.mjs"), "utf8");

  assert.match(template, /PROXY_MAX_DOWNLOAD_BYTES = "1048576"/);
  assert.match(template, /PROXY_MAX_SESSION_DURATION_MS = "60000"/);
  assert.match(template, /PROXY_MAX_CONCURRENT_SESSIONS = "2"/);
  assert.match(template, /PROXY_SESSION_LEASE_GRACE_MS = "30000"/);
  assert.match(harness, /buildVlessSmokeConfig/);
  assert.match(harness, /VLESS_SMOKE_SLOW_READER_PAYLOAD_BYTES/);
  assert.match(harness, /IMOXY_VLESS_SLOW_READER_PAYLOAD_BYTES/);
  assert.match(slowReader, /IMOXY_VLESS_SLOW_READER_PAYLOAD_BYTES/);
  assert.doesNotMatch(harness, /PROXY_MAX_DOWNLOAD_BYTES = "8388608"/);
  assert.doesNotMatch(harness, /PROXY_MAX_SESSION_DURATION_MS = "30000"/);
});

test("config builder rejects missing resource identifiers", () => {
  assert.throws(() => buildVlessSmokeConfig({
    workerName: "worker",
    accountId: "account",
    databaseName: "database",
    databaseId: "",
    echoName: "echo",
    diagnosticsToken: "token"
  }), /databaseId must be a non-empty string/);
});
