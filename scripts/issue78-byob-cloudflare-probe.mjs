import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = process.cwd();
const ACCOUNT_ID = "0d548671f52ffc237fb80dcb2067ac1a";
const API_BASE = "https://api.cloudflare.com/client/v4";
const RUN_ID = process.env.GITHUB_RUN_ID;
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (process.env.IMOXY_CONFIRM_DISPOSABLE_RUN !== "true") {
  throw new Error("Set confirm_disposable_run=true before provisioning disposable Workers.");
}
if (!TOKEN) throw new Error("CLOUDFLARE_API_TOKEN is not configured.");
if (process.env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT_ID) {
  throw new Error("The configured Cloudflare account ID does not match the approved imoxy test account.");
}
if (!/^[0-9]+$/.test(RUN_ID ?? "") || !/^[0-9]+$/.test(RUN_ATTEMPT ?? "")) {
  throw new Error("This script must run from a GitHub Actions workflow_dispatch run.");
}

const suffix = RUN_ID + "-" + RUN_ATTEMPT;
const echoName = "imoxy-issue78-byob-echo-" + suffix;
const probeName = "imoxy-issue78-byob-probe-" + suffix;
const probePath = "/__issue78_byob_probe/" + randomUUID();
const echoConfig = path.join(ROOT, ".tmp-" + echoName + ".toml");
const probeConfig = path.join(ROOT, ".tmp-" + probeName + ".toml");
const workerPath = "/accounts/" + ACCOUNT_ID + "/workers/scripts";
let echoAttempted = false;
let probeAttempted = false;
let previewProcess = null;
let previewOutput = "";
let primaryError = null;

function redact(value) {
  let output = String(value ?? "").replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
  if (TOKEN) output = output.replaceAll(TOKEN, "[REDACTED]");
  return output;
}

async function api(pathname, options = {}) {
  const response = await fetch(API_BASE + pathname, {
    method: options.method ?? "GET",
    headers: {
      authorization: "Bearer " + TOKEN,
      "content-type": "application/json"
    },
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

function configForEcho() {
  return [
    "name = " + JSON.stringify(echoName),
    'main = "./test/issue78-byob-probe-echo-worker.js"',
    'compatibility_date = "2026-11-09"',
    "account_id = " + JSON.stringify(ACCOUNT_ID),
    "workers_dev = false",
    "preview_urls = false",
    ""
  ].join("\n");
}

function configForProbe() {
  return [
    "name = " + JSON.stringify(probeName),
    'main = "./test/issue78-byob-probe-worker.js"',
    'compatibility_date = "2026-11-09"',
    "account_id = " + JSON.stringify(ACCOUNT_ID),
    "workers_dev = false",
    "preview_urls = false",
    "",
    "[vars]",
    "PROBE_PATH = " + JSON.stringify(probePath),
    "",
    "[[services]]",
    'binding = "BACKEND"',
    "service = " + JSON.stringify(echoName),
    ""
  ].join("\n");
}

function runWrangler(args, timeout = 180_000) {
  const result = spawnSync("npx", ["--yes", "wrangler@4.156.0", ...args], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    encoding: "utf8",
    timeout,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error("Wrangler " + args.join(" ") + " failed (" + result.status + "):\n" +
      redact([result.stdout, result.stderr].filter(Boolean).join("\n")).slice(-8000));
  }
  return result.stdout ?? "";
}

async function waitForHealth() {
  let last = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (previewProcess?.exitCode !== null) {
      throw new Error("Wrangler remote preview exited before becoming ready.\n" + redact(previewOutput).slice(-8000));
    }
    try {
      const response = await fetch("http://127.0.0.1:8787/health", {
        signal: AbortSignal.timeout(1500)
      });
      const body = await response.text();
      last = { status: response.status, contentType: response.headers.get("content-type"), body: body.slice(0, 1000) };
      if (response.ok) {
        let json;
        try { json = JSON.parse(body); } catch {}
        if (json?.ok === true && json?.role === "issue78-byob-probe") return;
      }
    } catch (error) {
      last = { errorName: error?.name ?? "Error" };
    }
    await delay(1000);
  }
  throw new Error("Wrangler remote preview health check failed: " + JSON.stringify(last) +
    "\nWrangler output:\n" + redact(previewOutput).slice(-8000));
}

async function startRemotePreview() {
  previewProcess = spawn("npx", [
    "--yes", "wrangler@4.156.0", "dev", "--remote",
    "--config", probeConfig, "--ip", "127.0.0.1", "--port", "8787"
  ], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  previewOutput = "";
  const capture = (chunk) => { previewOutput = (previewOutput + chunk.toString()).slice(-16000); };
  previewProcess.stdout.on("data", capture);
  previewProcess.stderr.on("data", capture);
  previewProcess.on("error", (error) => {
    previewProcess.spawnErrorName = error?.name ?? "Error";
    previewOutput += "\n" + error.message;
  });
  probeAttempted = true;
  await waitForHealth();
}

async function stopRemotePreview() {
  if (!previewProcess || previewProcess.exitCode !== null) return;
  try { process.kill(-previewProcess.pid, "SIGTERM"); } catch {}
  for (let index = 0; index < 50 && previewProcess.exitCode === null; index += 1) await delay(200);
  if (previewProcess.exitCode === null) {
    try { process.kill(-previewProcess.pid, "SIGKILL"); } catch {}
    for (let index = 0; index < 20 && previewProcess.exitCode === null; index += 1) await delay(100);
  }
  previewProcess = null;
}

async function main() {
  if (await workerExists(echoName)) throw new Error("Refusing to overwrite existing Worker: " + echoName);
  if (await workerExists(probeName)) throw new Error("Refusing to overwrite existing Worker: " + probeName);

  await writeFile(echoConfig, configForEcho(), { mode: 0o600 });
  await writeFile(probeConfig, configForProbe(), { mode: 0o600 });

  echoAttempted = true;
  const deployOutput = runWrangler(["deploy", "--config", echoConfig]);
  console.log("Disposable internal TCP Echo Worker deployed through Wrangler. " +
    redact(deployOutput).slice(-2000));

  await startRemotePreview();
  const response = await fetch("http://127.0.0.1:8787" + probePath, {
    method: "GET",
    signal: AbortSignal.timeout(30_000)
  });
  const body = await response.text();
  const result = (() => { try { return JSON.parse(body); } catch { return null; } })();
  const headers = {
    cfRay: response.headers.get("cf-ray"),
    contentType: response.headers.get("content-type"),
    server: response.headers.get("server")
  };
  console.log("BYOB probe HTTP response: " + JSON.stringify({
    status: response.status,
    headers,
    body: body.slice(0, 6000)
  }));
  if (!response.ok || result?.ok !== true) {
    throw new Error("BYOB probe failed its response contract. Wrangler output:\n" +
      redact(previewOutput).slice(-10000));
  }

  console.log("BYOB probe result: " + JSON.stringify(result));
  console.log("Interpretation: six disposable lifecycle cases completed. Results do not establish a bound on native socket buffering.");
}

async function cleanup() {
  const failures = [];
  await stopRemotePreview();
  for (const [name, attempted] of [[probeName, probeAttempted], [echoName, echoAttempted]]) {
    if (!attempted) continue;
    try { await deleteWorker(name); }
    catch (error) { failures.push(error.message); }
  }
  await Promise.all([
    rm(echoConfig, { force: true }),
    rm(probeConfig, { force: true })
  ]);
  if (failures.length) throw new Error("Disposable cleanup verification failed:\n" + failures.join("\n"));
}

try {
  await main();
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanup();
    console.log("Disposable preview and TCP Echo Worker cleanup completed; absence verified.");
  } catch (error) {
    console.error(error.message);
    if (!primaryError) primaryError = error;
  }
}

if (primaryError) {
  console.error(redact(primaryError.stack ?? primaryError.message));
  process.exitCode = 1;
}
