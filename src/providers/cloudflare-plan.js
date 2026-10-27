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

function cleanText(value, field, max = 253) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\\u0000-\\u001f\\u007f]/.test(value)) {
    throw new TypeError(`${field} is invalid.`);
  }
  return value.trim();
}

function normalizeResource(type, item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new TypeError(`${type} items must be objects.`);
  if (type === "kvNamespaces") return { title: cleanText(item.title, "KV namespace title", 64) };
  if (type === "d1Databases") return { name: cleanText(item.name, "D1 database name", 64) };
  if (type === "workerScripts") return { id: cleanText(item.id, "Worker script ID", 128) };
  if (type === "dnsRecords") {
    const recordType = cleanText(item.type, "DNS record type", 8).toUpperCase();
    if (!["A", "AAAA", "CNAME", "TXT"].includes(recordType)) throw new TypeError("DNS record type is unsupported.");
    const name = cleanText(item.name, "DNS record name", 253);
    const content = cleanText(item.content, "DNS record content", 2048);
    if (item.proxied !== undefined && typeof item.proxied !== "boolean") throw new TypeError("DNS proxied must be boolean.");
    if (item.ttl !== undefined && item.ttl !== null &&
        (!Number.isSafeInteger(item.ttl) || item.ttl < 1 || item.ttl > 2_147_483_647)) {
      throw new TypeError("DNS TTL is invalid.");
    }
    return { type: recordType, name, content, proxied: item.proxied ?? false, ttl: item.ttl ?? null };
  }
  throw new TypeError("Unsupported Cloudflare resource type.");
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
    "Destructive deletion operations are never generated automatically.",\n    "Worker script content updates are not planned because script source hashes are not available in this inventory."
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
