const SUPPORTED_TYPES = new Set(["kvNamespaces", "d1Databases", "dnsRecords", "workerScripts"]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function digest(value) {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function normalizeKey(type, item) {
  if (type === "kvNamespaces") return item.title;
  if (type === "d1Databases") return item.name;
  if (type === "workerScripts") return item.id;
  return `${item.type}|${item.name}`;
}

function compareFields(type, current, desired) {
  if (type === "dnsRecords") return ["content", "proxied", "ttl"].some((key) => current[key] !== desired[key]);
  if (type === "workerScripts") return desired.desiredHash !== undefined && current.etag !== desired.desiredHash;
  return false;
}

/** Build a reviewable plan only. It never performs provider mutations or automatic deletions. */
export async function buildCloudflarePlan({ current, desired }) {
  if (!current || !desired || typeof current !== "object" || typeof desired !== "object") {
    throw new TypeError("Current inventory and desired resources are required.");
  }
  const operations = [];
  const warnings = [
    "This is a dry-run plan; no Cloudflare writes are performed.",
    "Destructive deletion operations are never generated automatically."
  ];
  for (const type of SUPPORTED_TYPES) {
    const wanted = desired[type] ?? [];
    const existing = current[type] ?? [];
    if (!Array.isArray(wanted) || !Array.isArray(existing)) throw new TypeError(`${type} must be an array.`);
    const currentByKey = new Map(existing.map((item) => [normalizeKey(type, item), item]));
    for (const item of wanted) {
      const key = normalizeKey(type, item);
      if (typeof key !== "string" || !key) throw new TypeError(`Each ${type} item needs a stable key.`);
      const before = currentByKey.get(key);
      if (!before) {
        operations.push({ type, operation: "create", key, desired: item, requiresExplicitApproval: true });
      } else if (compareFields(type, before, item)) {
        operations.push({ type, operation: "update", key, current: before, desired: item, requiresExplicitApproval: true });
      }
    }
  }
  operations.sort((a, b) => a.type.localeCompare(b.type) || a.key.localeCompare(b.key) || a.operation.localeCompare(b.operation));
  const planId = await digest(stableJson(operations));
  return { planId, readOnly: true, requiresExplicitApproval: operations.length > 0, operations, warnings };
}
