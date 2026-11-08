export const VLESS_SMOKE_LIMITS = Object.freeze({
  maxDownloadBytes: 1024 * 1024,
  maxSessionDurationMs: 60_000,
  maxConcurrentSessions: 2,
  sessionLeaseGraceMs: 30_000
});

export const VLESS_SMOKE_MAX_APP_SUBMITTED_DOWNSTREAM_BYTES =
  VLESS_SMOKE_LIMITS.maxConcurrentSessions * (VLESS_SMOKE_LIMITS.maxDownloadBytes + 2);
export const VLESS_SMOKE_FRAME_BYTES = 16 * 1024;
export const VLESS_SMOKE_INITIAL_TRIGGER_BYTES = 6;
export const VLESS_SMOKE_BASELINE_SESSION_BYTES =
  VLESS_SMOKE_INITIAL_TRIGGER_BYTES + 4 * VLESS_SMOKE_FRAME_BYTES;
export const VLESS_SMOKE_SLOW_READER_PAYLOAD_BYTES = VLESS_SMOKE_LIMITS.maxDownloadBytes;
export const VLESS_SMOKE_EXPECTED_TOTAL_UPLOAD_BYTES =
  2 * VLESS_SMOKE_BASELINE_SESSION_BYTES + VLESS_SMOKE_INITIAL_TRIGGER_BYTES;
export const VLESS_SMOKE_EXPECTED_TOTAL_DOWNLOAD_BYTES =
  2 * VLESS_SMOKE_BASELINE_SESSION_BYTES + VLESS_SMOKE_SLOW_READER_PAYLOAD_BYTES;
export const VLESS_SMOKE_EXPECTED_SETTLED_BYTES =
  VLESS_SMOKE_EXPECTED_TOTAL_UPLOAD_BYTES + VLESS_SMOKE_EXPECTED_TOTAL_DOWNLOAD_BYTES;

export function buildVlessSmokeConfig({
  workerName,
  accountId,
  databaseName,
  databaseId,
  echoName,
  diagnosticsToken,
  usageProducerId
}) {
  for (const [key, value] of Object.entries({
    workerName, accountId, databaseName, databaseId, echoName, diagnosticsToken, usageProducerId
  })) {
    if (typeof value !== "string" || value.length === 0) {
      throw new TypeError(`${key} must be a non-empty string`);
    }
  }

  const quote = (value) => JSON.stringify(value);
  return [
    `name = ${quote(workerName)}`,
    'main = "./test/vless-service-binding-tcp-smoke-worker.js"',
    'compatibility_date = "2026-11-02"',
    `account_id = ${quote(accountId)}`,
    "workers_dev = false",
    "preview_urls = false",
    "",
    "[vars]",
    'PROXY_WS_PATH = "/proxy/vless"',
    'PROXY_ALLOWED_HOSTS = "probe.imoxy.invalid"',
    'PROXY_ALLOWED_PORTS = "5000"',
    `PROXY_USAGE_PRODUCER_ID = ${quote(usageProducerId)}`,
    `PROXY_MAX_DOWNLOAD_BYTES = ${quote(String(VLESS_SMOKE_LIMITS.maxDownloadBytes))}`,
    `PROXY_MAX_SESSION_DURATION_MS = ${quote(String(VLESS_SMOKE_LIMITS.maxSessionDurationMs))}`,
    `PROXY_MAX_CONCURRENT_SESSIONS = ${quote(String(VLESS_SMOKE_LIMITS.maxConcurrentSessions))}`,
    `PROXY_SESSION_LEASE_GRACE_MS = ${quote(String(VLESS_SMOKE_LIMITS.sessionLeaseGraceMs))}`,
    `SMOKE_DIAGNOSTICS_TOKEN = ${quote(diagnosticsToken)}`,
    "",
    "[[d1_databases]]",
    'binding = "DB"',
    `database_name = ${quote(databaseName)}`,
    `database_id = ${quote(databaseId)}`,
    'remote = true',
    "",
    "[[services]]",
    'binding = "PROXY_TCP_ECHO"',
    `service = ${quote(echoName)}`,
    ""
  ].join("\n");
}
