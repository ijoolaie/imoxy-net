export function summarizePreviewProcess(child) {
  if (!child) return { state: "not_started" };
  if (child.spawnErrorName) {
    return {
      state: "spawn_error",
      errorName: child.spawnErrorName,
      exitCode: child.exitCode,
      signalCode: child.signalCode ?? null,
      killed: Boolean(child.killed)
    };
  }
  return {
    state: child.exitCode === null ? "running" : "exited",
    exitCode: child.exitCode,
    signalCode: child.signalCode ?? null,
    killed: Boolean(child.killed)
  };
}

export function redactPreviewOutput(output, secrets = []) {
  let result = String(output ?? "").replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 8) {
      result = result.replaceAll(secret, "[REDACTED]");
    }
  }
  return result;
}

export async function checkPreviewHealth(fetchImpl = fetch) {
  try {
    const response = await fetchImpl("http://127.0.0.1:8787/health", {
      signal: AbortSignal.timeout(1000)
    });
    return { available: response.ok, status: response.status };
  } catch (error) {
    return { available: false, errorName: error?.name ?? "Error" };
  }
}
