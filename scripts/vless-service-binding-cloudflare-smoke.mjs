import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkPreviewHealth, redactPreviewOutput, summarizePreviewProcess } from "./vless-smoke-preview-diagnostics.mjs";
import { setTimeout as delay } from "node:timers/promises";
import { waitForSessionLeaseDrain } from "./vless-smoke-session-drain.mjs";

const ROOT = process.cwd();
const ACCOUNT_ID = "0d548671f52ffc237fb80dcb2067ac1a";
const API_BASE = "https://api.cloudflare.com/client/v4";
const MAX_TEST_BYTES = 16 * 1024 * 1024;
const EXPECTED_SESSION_BYTES = 6 + 4 * 16 * 1024;
const SLOW_READER_PAYLOAD_BYTES = 4 * 1024 * 1024;
const SLOW_READER_SESSION_BYTES = 6 + SLOW_READER_PAYLOAD_BYTES;
const EXPECTED_TOTAL_BYTES = 2 * EXPECTED_SESSION_BYTES + SLOW_READER_SESSION_BYTES;
const EXPECTED_REQUEST_COUNT = 3;
const RUN_ID = process.env.GITHUB_RUN_ID;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (process.env.IMOXY_CONFIRM_DISPOSABLE_RUN !== "true") {
  throw new Error("Set the workflow confirmation input to true before provisioning disposable resources.");
}
if (!TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is not configured.");
if (process.env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT_ID) {
  throw new Error("The configured Cloudflare account ID does not match the approved imoxy test account.");
}
if (!/^[0-9]+$/.test(RUN_ID ?? "") || !/^[0-9]+$/.test(RUN_ATTEMPT ?? "")) {
  throw new Error("This script must run from a GitHub Actions workflow_dispatch run.");
}

const suffix = RUN_ID + "-" + RUN_ATTEMPT;
const echoName = "imoxy-vless-smoke-echo-" + suffix;
const vlessName = "imoxy-vless-smoke-vless-" + suffix;
const databaseName = "imoxy-vless-smoke-d1-" + suffix;
const echoConfig = path.join(ROOT, ".tmp-" + echoName + ".toml");
const vlessConfig = path.join(ROOT, ".tmp-" + vlessName + ".toml");
const databasePath = "/accounts/" + ACCOUNT_ID + "/d1/database";
const workerPath = "/accounts/" + ACCOUNT_ID + "/workers/scripts";
let databaseId = null;
let databaseAttempted = false;
let echoAttempted = false;
let vlessAttempted = false;
let previewProcess = null;
let previewLogs = "";
let primaryError = null;

function headers() {
  return {
    authorization: "Bearer " + TOKEN,
    "content-type": "application/json"
  };
}

async function api(pathname, options = {}) {
  const response = await fetch(API_BASE + pathname, {
    method: options.method ?? "GET",
    headers: headers(),
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 404 && options.allow404) return null;
  if (!response.ok || payload.success !== true) {
    const details = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.message).join("; ")
      : "Cloudflare API request failed";
    throw new Error((options.method ?? "GET") + " " + pathname + " returned " + response.status + ": " + details);
  }
  return payload.result;
}

async function optionalResource(pathname) {
  return api(pathname, { allow404: true });
}

async function d1Query(sql) {
  const result = await api(databasePath + "/" + encodeURIComponent(databaseId) + "/query", {
    method: "POST",
    body: { sql }
  });
  const items = Array.isArray(result) ? result : [result];
  const failed = items.find((item) => item?.success === false || item?.error);
  if (failed) throw new Error("D1 query failed: " + (failed.error ?? "unknown D1 error"));
  return items.flatMap((item) => Array.isArray(item?.results) ? item.results : []);
}

async function readActiveSessionCount(accountLiteral) {
  const rows = await d1Query(
    "SELECT COUNT(*) AS active_sessions FROM proxy_active_sessions WHERE account_id = " + accountLiteral
  );
  const count = Number(rows[0]?.active_sessions ?? -1);
  return Number.isSafeInteger(count) && count >= 0 ? count : -1;
}

async function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
    timeout: options.timeout ?? 180_000,
    maxBuffer: 8 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n").slice(-6000);
    throw new Error(command + " " + args.join(" ") + " failed (" + result.status + "):\n" + output);
  }
  return result.stdout ?? "";
}

function tomlString(value) {
  return JSON.stringify(value);
}

function configForEcho() {
  return [
    "name = " + tomlString(echoName),
    'main = "./test/vless-service-binding-tcp-echo-worker.js"',
    'compatibility_date = "2026-11-02"',
    "account_id = " + tomlString(ACCOUNT_ID),
    "workers_dev = false",
    "preview_urls = false",
    ""
  ].join("\n");
}

function configForVless(databaseUuid, diagnosticsToken) {
  return [
    "name = " + tomlString(vlessName),
    'main = "./test/vless-service-binding-tcp-smoke-worker.js"',
    'compatibility_date = "2026-11-02"',
    "account_id = " + tomlString(ACCOUNT_ID),
    "workers_dev = false",
    "preview_urls = false",
    "",
    "[vars]",
    'PROXY_WS_PATH = "/proxy/vless"',
    'PROXY_ALLOWED_HOSTS = "probe.imoxy.invalid"',
    'PROXY_ALLOWED_PORTS = "5000"',
    'PROXY_USAGE_PRODUCER_ID = ' + tomlString("imoxy-vless-smoke-" + suffix),
    'PROXY_MAX_DOWNLOAD_BYTES = "8388608"',
    'PROXY_MAX_SESSION_DURATION_MS = "30000"',
    'PROXY_MAX_CONCURRENT_SESSIONS = "2"',
    'PROXY_SESSION_LEASE_GRACE_MS = "30000"',
    "SMOKE_DIAGNOSTICS_TOKEN = " + tomlString(diagnosticsToken),
    "",
    "[[d1_databases]]",
    'binding = "DB"',
    "database_name = " + tomlString(databaseName),
    "database_id = " + tomlString(databaseUuid),
    "remote = true",
    "",
    "[[services]]",
    'binding = "PROXY_TCP_ECHO"',
    "service = " + tomlString(echoName),
    ""
  ].join("\n");
}

async function waitForHealth(child) {
  const url = "http://127.0.0.1:8787/health";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error("Wrangler remote preview exited before becoming ready.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
      if (response.ok && (await response.text()) === "ok") return;
    } catch {}
    await delay(1000);
  }
  throw new Error("Wrangler remote preview did not expose its local health endpoint within 60 seconds.");
}

async function startRemotePreview() {
  previewProcess = spawn("npx", [
    "--yes", "wrangler@4.156.0", "dev", "--remote",
    "--config", vlessConfig, "--ip", "127.0.0.1", "--port", "8787"
  ], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  previewLogs = "";
  const capture = (chunk) => {
    previewLogs = (previewLogs + chunk.toString()).slice(-12000);
  };
  previewProcess.stdout.on("data", capture);
  previewProcess.stderr.on("data", capture);
  previewProcess.on("error", (error) => {
    previewProcess.spawnErrorName = error?.name ?? "Error";
    previewLogs += "\n" + error.message;
  });
  vlessAttempted = true;
  try {
    await waitForHealth(previewProcess);
  } catch (error) {
    throw new Error(error.message + "\nWrangler output:\n" + previewLogs.slice(-6000));
  }
}

async function stopRemotePreview() {
  if (!previewProcess || previewProcess.exitCode !== null) return;
  try { process.kill(-previewProcess.pid, "SIGTERM"); } catch {}
  for (let i = 0; i < 50 && previewProcess.exitCode === null; i += 1) await delay(200);
  if (previewProcess.exitCode === null) {
    try { process.kill(-previewProcess.pid, "SIGKILL"); } catch {}
    for (let i = 0; i < 20 && previewProcess.exitCode === null; i += 1) await delay(100);
  }
  previewProcess = null;
}

async function workerExists(name) {
  const scripts = await api(workerPath);
  return Array.isArray(scripts) && scripts.some((item) => item?.id === name);
}

async function deleteWorker(name) {
  if (await workerExists(name)) {
    await api(workerPath + "/" + encodeURIComponent(name), { method: "DELETE" });
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (!(await workerExists(name))) return;
    await delay(500);
  }
  throw new Error("Disposable Worker still exists after cleanup: " + name);
}

async function cleanup() {
  const failures = [];
  await stopRemotePreview();
  for (const name of [vlessName, echoName]) {
    if (!vlessAttempted && name === vlessName) continue;
    if (!echoAttempted && name === echoName) continue;
    try { await deleteWorker(name); } catch (error) { failures.push(error.message); }
  }
  if (databaseAttempted) {
    try {
      if (!databaseId) {
        const found = await optionalResource(databasePath + "/" + encodeURIComponent(databaseName));
        databaseId = found?.uuid ?? null;
      }
      if (databaseId) {
        await api(databasePath + "/" + encodeURIComponent(databaseId), { method: "DELETE", allow404: true });
      }
      const remaining = await optionalResource(databasePath + "/" + encodeURIComponent(databaseName));
      if (remaining !== null) failures.push("Disposable D1 database still exists after cleanup: " + databaseName);
    } catch (error) {
      failures.push(error.message);
    }
  }
  await Promise.all([
    rm(echoConfig, { force: true }),
    rm(vlessConfig, { force: true })
  ]);
  if (failures.length) throw new Error("Cleanup verification failed:\n" + failures.join("\n"));
}

async function fetchSmokeDiagnostics(token) {
  const unavailableContext = async (details) => ({
    available: false,
    ...details,
    previewProcess: summarizePreviewProcess(previewProcess),
    previewHealth: await checkPreviewHealth(),
    previewOutputTail: redactPreviewOutput(previewLogs, [
      TOKEN,
      token,
      process.env.IMOXY_VLESS_CREDENTIAL
    ]).slice(-4000)
  });
  try {
    const response = await fetch("http://127.0.0.1:8787/_test/diagnostics", {
      headers: { "x-imoxy-smoke-diagnostics-token": token },
      signal: AbortSignal.timeout(2000)
    });
    if (!response.ok) return unavailableContext({ status: response.status });
    return { available: true, ...(await response.json()) };
  } catch (error) {
    return unavailableContext({ errorName: error?.name ?? "Error" });
  }
}

async function main() {
  const dbByNamePath = databasePath + "/" + encodeURIComponent(databaseName);
  if (await workerExists(echoName)) throw new Error("Refusing to overwrite an existing Worker: " + echoName);
  if (await workerExists(vlessName)) throw new Error("Refusing to overwrite an existing Worker: " + vlessName);
  if (await optionalResource(dbByNamePath)) throw new Error("Refusing to overwrite an existing D1 database: " + databaseName);

  databaseAttempted = true;
  const created = await api(databasePath, {
    method: "POST",
    body: {
      name: databaseName,
      jurisdiction: "eu",
      read_replication: { mode: "disabled" }
    }
  });
  databaseId = created?.uuid;
  if (typeof databaseId !== "string" || !databaseId) throw new Error("Cloudflare did not return the disposable D1 database UUID.");

  const migrationDirectory = path.join(ROOT, "migrations");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((name) => /^[0-9]+.*\.sql$/.test(name))
    .sort();
  if (migrationFiles.length !== 8) throw new Error("Expected exactly the reviewed migrations 0001–0008; found " + migrationFiles.length + ".");
  for (const name of migrationFiles) {
    const sql = await readFile(path.join(migrationDirectory, name), "utf8");
    await d1Query(sql);
    console.log("Applied D1 SQL migration " + name + " through the Cloudflare D1 API.");
  }

  const accountId = randomUUID();
  const credentialId = randomUUID();
  const credential = randomUUID();
  const diagnosticsToken = randomUUID();
  const credentialHash = createHash("sha256").update(credential.toLowerCase()).digest("hex");
  const createdAt = new Date().toISOString();
  const username = "vless-smoke-" + suffix;
  const literal = (value) => "'" + String(value).replaceAll("'", "''") + "'";

  await d1Query(
    "INSERT INTO proxy_accounts (id, username, status, credential_secret_ref, expires_at, quota_bytes, daily_quota_bytes, speed_limit_kbps, max_connections, notes, created_at, updated_at) VALUES (" +
    [accountId, username, "active"].map(literal).join(", ") +
    ", NULL, NULL, " + MAX_TEST_BYTES + ", " + MAX_TEST_BYTES + ", NULL, 2, " +
    literal("Disposable Worker-to-Worker TCP smoke fixture") + ", " + literal(createdAt) + ", " + literal(createdAt) + ")"
  );
  await d1Query(
    "INSERT INTO proxy_credentials (id, account_id, credential_hash, created_at, revoked_at) VALUES (" +
    [credentialId, accountId, credentialHash, createdAt].map(literal).join(", ") + ", NULL)"
  );

  await writeFile(echoConfig, configForEcho(), { mode: 0o600 });
  await writeFile(vlessConfig, configForVless(databaseId, diagnosticsToken), { mode: 0o600 });

  echoAttempted = true;
  await run("npx", ["--yes", "wrangler@4.156.0", "deploy", "--config", echoConfig], { timeout: 180_000 });
  console.log("Deployed the internal-only disposable TCP Echo Worker through Wrangler.");

  await startRemotePreview();
  const accountLiteral = literal(accountId);
  const smoke = spawnSync(process.execPath, ["scripts/vless-cloudflare-runtime-smoke.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      IMOXY_VLESS_WS_URL: "ws://127.0.0.1:8787/proxy/vless",
      IMOXY_VLESS_CREDENTIAL: credential
    },
    encoding: "utf8",
    timeout: 35_000,
    maxBuffer: 2 * 1024 * 1024
  });
  if (smoke.error) throw smoke.error;


  if (smoke.status !== 0) {
    throw new Error("The VLESS WebSocket/TCP smoke client failed (" + smoke.status + "):\n" +
      [smoke.stdout, smoke.stderr, "Wrangler remote preview output:\n" + previewLogs].filter(Boolean).join("\n").slice(-12000));
  }
  console.log("VLESS smoke client result:\n" + smoke.stdout.trim());

  const baselineDiagnostics = await fetchSmokeDiagnostics(diagnosticsToken);
  console.log("Baseline lifecycle diagnostics (payload-free): " + JSON.stringify(baselineDiagnostics));

  const baselineDrain = await waitForSessionLeaseDrain({
    readActiveSessions: () => readActiveSessionCount(accountLiteral),
    wait: delay,
    attempts: 30,
    intervalMs: 500
  });
  console.log("Baseline session-lease drain: " + JSON.stringify(baselineDrain));
  if (!baselineDrain.drained) {
    const diagnostics = await fetchSmokeDiagnostics(diagnosticsToken);
    throw new Error("Baseline client session leases did not drain before slow-reader admission: " +
      JSON.stringify({ baselineDrain, baselineDiagnostics, diagnostics }));
  }

  const slowReader = spawnSync(process.execPath, ["scripts/vless-cloudflare-slow-reader-smoke.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      IMOXY_VLESS_WS_URL: "ws://127.0.0.1:8787/proxy/vless",
      IMOXY_VLESS_CREDENTIAL: credential,
      IMOXY_SLOW_READER_UPLOAD_INTERVAL_MS: "25"
    },
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 2 * 1024 * 1024
  });
  if (slowReader.error || slowReader.status !== 0) {
    const diagnostics = await fetchSmokeDiagnostics(diagnosticsToken);
    let activeSessionsAtFailure = null;
    let activeReservationsAtFailure = null;
    try {
      activeSessionsAtFailure = await readActiveSessionCount(accountLiteral);
      const rows = await d1Query(
        "SELECT SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_reservations FROM quota_reservations WHERE account_id = " + accountLiteral
      );
      activeReservationsAtFailure = Number(rows[0]?.active_reservations ?? 0);
    } catch (error) {
      activeReservationsAtFailure = { queryErrorName: error?.name ?? "Error" };
    }
    throw new Error("The VLESS slow-reader client failed (" + (slowReader.status ?? "spawn-error") + "):\\n" +
      JSON.stringify({
        stdout: slowReader.stdout,
        stderr: slowReader.stderr,
        spawnErrorName: slowReader.error?.name ?? null,
        activeSessionsAtFailure,
        activeReservationsAtFailure,
        diagnostics,
        previewOutputTail: redactPreviewOutput(previewLogs, [
          TOKEN, diagnosticsToken, credential
        ]).slice(-4000)
      }, null, 2));
  }
  console.log("VLESS slow-reader client result:\\n" + slowReader.stdout.trim());

  const diagnostics = await fetchSmokeDiagnostics(diagnosticsToken);


  console.log("VLESS smoke stage diagnostics (payload-free):\\n" + JSON.stringify(diagnostics, null, 2));


  let usage = null;
  let activeSessions = null;
  let activeReservations = null;
  let settledReservations = null;
  let releasedReservations = null;
  let settledBytes = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const usageRows = await d1Query(
      "SELECT COALESCE(SUM(upload_bytes), 0) AS upload_bytes, COALESCE(SUM(download_bytes), 0) AS download_bytes, COALESCE(SUM(request_count), 0) AS request_count FROM usage_daily WHERE account_id = " + accountLiteral
    );
    const sessionRows = await d1Query(
      "SELECT COUNT(*) AS active_sessions FROM proxy_active_sessions WHERE account_id = " + accountLiteral
    );
    const reservationRows = await d1Query(
      "SELECT SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_reservations, SUM(CASE WHEN status = 'settled' THEN 1 ELSE 0 END) AS settled_reservations, SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) AS released_reservations, COALESCE(SUM(CASE WHEN status = 'settled' THEN actual_bytes ELSE 0 END), 0) AS settled_bytes FROM quota_reservations WHERE account_id = " + accountLiteral
    );
    usage = usageRows[0] ?? {};
    activeSessions = Number(sessionRows[0]?.active_sessions ?? -1);
    activeReservations = Number(reservationRows[0]?.active_reservations ?? 0);
    settledReservations = Number(reservationRows[0]?.settled_reservations ?? 0);
    releasedReservations = Number(reservationRows[0]?.released_reservations ?? 0);
    settledBytes = Number(reservationRows[0]?.settled_bytes ?? 0);
    if (Number(usage.upload_bytes) === EXPECTED_TOTAL_BYTES &&
        Number(usage.download_bytes) === EXPECTED_TOTAL_BYTES &&
        activeSessions === 0 && activeReservations === 0 &&
        releasedReservations === 0 && settledReservations > 0 &&
        settledBytes === EXPECTED_TOTAL_BYTES * 2) break;
    await delay(500);
  }

  if (Number(usage?.upload_bytes) !== EXPECTED_TOTAL_BYTES ||
      Number(usage?.download_bytes) !== EXPECTED_TOTAL_BYTES ||
      Number(usage?.request_count) !== EXPECTED_REQUEST_COUNT ||
      activeSessions !== 0 || activeReservations !== 0 || releasedReservations !== 0 ||
      settledReservations < 1 || settledBytes !== EXPECTED_TOTAL_BYTES * 2) {
    throw new Error("Worker-bound D1 acceptance mismatch: " + JSON.stringify({
      usage, activeSessions, activeReservations, settledReservations,
      releasedReservations, settledBytes,
      expectedUploadBytes: EXPECTED_TOTAL_BYTES,
      expectedDownloadBytes: EXPECTED_TOTAL_BYTES
    }));
  }

  console.log(JSON.stringify({
    ok: true,
    evidence: "Wrangler remote preview + Worker-bound D1 + Worker-to-Worker TCP Service Binding",
    accountScope: "fixed disposable-test Cloudflare account only",
    clients: 3,
    slowReaderPayloadBytes: SLOW_READER_PAYLOAD_BYTES,
    slowReaderPauseMs: 2500,
    frameBytes: 16 * 1024,
    sessionLimitMs: 30_000,
    uploadBytes: Number(usage.upload_bytes),
    downloadBytes: Number(usage.download_bytes),
    requestCount: Number(usage.request_count),
    activeSessionsAfterClose: activeSessions,
    activeReservationsAfterClose: activeReservations,
    settledReservations: settledReservations,
    releasedReservations: releasedReservations,
    settledReservationBytes: settledBytes
  }, null, 2));
}

try {
  await main();
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanup();
    console.log("Disposable Worker and D1 cleanup completed and absence was verified.");
  } catch (error) {
    console.error(error.message);
    if (!primaryError) primaryError = error;
  }
}

if (primaryError) {
  console.error(primaryError.stack ?? primaryError.message);
  process.exitCode = 1;
}
