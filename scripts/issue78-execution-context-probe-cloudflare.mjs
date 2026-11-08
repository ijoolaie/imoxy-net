import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { runExecutionContextLifetimeProbe } from "./issue78-execution-context-probe.mjs";

const ROOT = process.cwd();
const ACCOUNT_ID = "0d548671f52ffc237fb80dcb2067ac1a";
const API_BASE = "https://api.cloudflare.com/client/v4";
const RUN_ID = process.env.GITHUB_RUN_ID;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (process.env.IMOXY_CONFIRM_DISPOSABLE_RUN !== "true") {
  throw new Error("Set the workflow confirmation input to true before provisioning the disposable Worker.");
}
if (!TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is not configured.");
if (process.env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT_ID) {
  throw new Error("The configured Cloudflare account ID does not match the approved imoxy test account.");
}
if (!/^[0-9]+$/.test(RUN_ID ?? "") || !/^[0-9]+$/.test(RUN_ATTEMPT ?? "")) {
  throw new Error("This script must run from a GitHub Actions workflow_dispatch run.");
}

const suffix = RUN_ID + "-" + RUN_ATTEMPT;
const workerName = "imoxy-issue78-context-probe-" + suffix;
const workerPath = "/accounts/" + ACCOUNT_ID + "/workers/scripts";
const configPath = path.join(ROOT, ".tmp-" + workerName + ".toml");
const routePath = "/_test/execution-context/" + randomUUID();
let previewProcess = null;
let previewLogs = "";
let previewAttempted = false;
let primaryError = null;

function tomlString(value) {
  return JSON.stringify(value);
}

function configForProbe() {
  return [
    "name = " + tomlString(workerName),
    'main = "./test/issue78-execution-context-probe-worker.js"',
    'compatibility_date = "2026-11-02"',
    "account_id = " + tomlString(ACCOUNT_ID),
    "workers_dev = false",
    "preview_urls = false",
    "",
    "[vars]",
    "SMOKE_EXECUTION_CONTEXT_PROBE_PATH = " + tomlString(routePath),
    ""
  ].join("\n");
}

async function api(pathname, options = {}) {
  const response = await fetch(API_BASE + pathname, {
    method: options.method ?? "GET",
    headers: {
      authorization: "Bearer " + TOKEN,
      "content-type": "application/json"
    },
    body: options.body
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 404 && options.allow404) return null;
  if (!response.ok || payload.success !== true) {
    throw new Error("Cloudflare API " + (options.method ?? "GET") + " request failed with HTTP " + response.status + ".");
  }
  return payload.result;
}

async function workerExists() {
  const scripts = await api(workerPath);
  return Array.isArray(scripts) && scripts.some((item) => item?.id === workerName);
}

async function deleteWorker() {
  if (await workerExists()) {
    await api(workerPath + "/" + encodeURIComponent(workerName), { method: "DELETE" });
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (!(await workerExists())) return;
    await delay(500);
  }
  throw new Error("Disposable ExecutionContext probe Worker still exists after cleanup.");
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (previewProcess?.exitCode !== null) {
      throw new Error("Wrangler remote preview exited before becoming ready.");
    }
    try {
      const response = await fetch("http://127.0.0.1:8787/health", {
        signal: AbortSignal.timeout(1200)
      });
      if (response.ok && (await response.text()) === "ok") return;
    } catch {}
    await delay(1000);
  }
  throw new Error("Wrangler remote preview did not become healthy within 60 seconds.");
}

async function startRemotePreview() {
  previewAttempted = true;
  previewProcess = spawn("npx", [
    "--yes", "wrangler@4.156.0", "dev", "--remote",
    "--config", configPath, "--ip", "127.0.0.1", "--port", "8787"
  ], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const capture = (chunk) => {
    previewLogs = (previewLogs + chunk.toString()).slice(-12_000);
  };
  previewProcess.stdout.on("data", capture);
  previewProcess.stderr.on("data", capture);
  previewProcess.on("error", (error) => {
    previewLogs = (previewLogs + "\nspawnErrorName=" + (error?.name ?? "Error")).slice(-12_000);
  });
  await waitForHealth();
}

async function stopRemotePreview() {
  if (!previewProcess || previewProcess.exitCode !== null) return;
  try { process.kill(-previewProcess.pid, "SIGTERM"); } catch {}
  for (let attempt = 0; attempt < 50 && previewProcess.exitCode === null; attempt += 1) {
    await delay(200);
  }
  if (previewProcess.exitCode === null) {
    try { process.kill(-previewProcess.pid, "SIGKILL"); } catch {}
    for (let attempt = 0; attempt < 20 && previewProcess.exitCode === null; attempt += 1) {
      await delay(100);
    }
  }
  previewProcess = null;
}

async function cleanup() {
  const failures = [];
  await stopRemotePreview();
  if (previewAttempted) {
    try { await deleteWorker(); } catch (error) { failures.push(error.message); }
  }
  await rm(configPath, { force: true });
  if (failures.length) throw new Error("Disposable probe cleanup failed: " + failures.join("; "));
}

async function main() {
  if (await workerExists()) {
    throw new Error("Refusing to overwrite an existing Worker with the disposable probe name.");
  }
  await writeFile(configPath, configForProbe(), { mode: 0o600 });
  await startRemotePreview();
  const result = await runExecutionContextLifetimeProbe({
    baseUrl: "ws://127.0.0.1:8787",
    routePath,
    previewOutput: () => previewLogs
  });
  console.log("Disposable ExecutionContext lifetime probe result: " + JSON.stringify({
    control: result.control,
    late: result.late,
    evidence: result.evidence
  }));
}

try {
  await main();
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanup();
    console.log("Disposable ExecutionContext probe Worker cleanup completed and absence was verified.");
  } catch (error) {
    console.error(error.message);
    if (!primaryError) primaryError = error;
  }
}

if (primaryError) {
  console.error(primaryError.stack ?? primaryError.message);
  process.exitCode = 1;
}
