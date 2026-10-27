const API_BASE = "https://api.cloudflare.com/client/v4";
const ID_PATTERN = /^[a-f0-9]{32}$/i;
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

export class CloudflareProviderError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = "CloudflareProviderError";
    this.code = code;
    this.status = status;
  }
}

function validId(value, field) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError(`${field} must be a 32-character Cloudflare ID.`);
  }
  return value;
}

function requireConfig(env) {
  if (typeof env?.CLOUDFLARE_API_TOKEN !== "string" || env.CLOUDFLARE_API_TOKEN.length < 20) {
    throw new CloudflareProviderError("provider_not_configured", "Cloudflare API access is not configured.", 503);
  }
  const accountId = validId(env.CLOUDFLARE_ACCOUNT_ID, "CLOUDFLARE_ACCOUNT_ID");
  const zoneId = env.CLOUDFLARE_ZONE_ID ? validId(env.CLOUDFLARE_ZONE_ID, "CLOUDFLARE_ZONE_ID") : null;
  return { token: env.CLOUDFLARE_API_TOKEN, accountId, zoneId };
}

export function createCloudflareClient(env, { fetchImpl = globalThis.fetch } = {}) {
  const config = requireConfig(env);
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");

  async function getJson(path, query = {}) {
    const url = new URL(API_BASE + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: "GET",
        redirect: "error",
        headers: {
          authorization: `Bearer ${config.token}`,
          accept: "application/json"
        }
      });
    } catch {
      throw new CloudflareProviderError("provider_unavailable", "Cloudflare could not be reached.", 503);
    }
    let body;
    try { body = await response.json(); } catch {
      throw new CloudflareProviderError("provider_invalid_response", "Cloudflare returned an invalid response.", 502);
    }
    if (!response.ok || body?.success !== true) {
      if (response.status === 401) throw new CloudflareProviderError("provider_auth_failed", "Cloudflare rejected the configured credential.", 502);
      if (response.status === 403) throw new CloudflareProviderError("provider_permission_denied", "The Cloudflare credential lacks a required permission.", 502);
      if (response.status === 429) throw new CloudflareProviderError("provider_rate_limited", "Cloudflare rate-limited the request.", 503);
      throw new CloudflareProviderError("provider_request_failed", "The Cloudflare read request failed.", 502);
    }
    return body;
  }

  async function listPages(path, query = {}) {
    const all = [];
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page += 1) {
      if (page > MAX_PAGES) throw new CloudflareProviderError("provider_pagination_limit", "The Cloudflare inventory exceeds the configured page limit.", 502);
      const body = await getJson(path, { ...query, page, per_page: PAGE_SIZE });
      if (!Array.isArray(body.result)) throw new CloudflareProviderError("provider_invalid_response", "Cloudflare returned an unexpected inventory shape.", 502);
      all.push(...body.result);
      totalPages = Number.isSafeInteger(body.result_info?.total_pages) && body.result_info.total_pages > 0
        ? body.result_info.total_pages : page;
      if (totalPages > MAX_PAGES) throw new CloudflareProviderError("provider_pagination_limit", "The Cloudflare inventory exceeds the configured page limit.", 502);
    }
    return all;
  }

  return {
    async getAccount() {
      const body = await getJson(`/accounts/${config.accountId}`);
      const account = body.result;
      return { id: account.id, name: account.name, type: account.type, createdOn: account.created_on };
    },

    async listZones() {
      const rows = await listPages("/zones", { "account.id": config.accountId });
      return rows.map((zone) => ({
        id: zone.id, name: zone.name, status: zone.status, plan: zone.plan?.name ?? null
      }));
    },

    async listWorkerScripts() {
      const rows = await listPages(`/accounts/${config.accountId}/workers/scripts`);
      return rows.map((script) => ({
        id: script.id ?? script.script, modifiedOn: script.modified_on ?? null,
        createdOn: script.created_on ?? null, etag: script.etag ?? null
      }));
    },

    async listKVNamespaces() {
      const rows = await listPages(`/accounts/${config.accountId}/storage/kv/namespaces`);
      return rows.map((item) => ({ id: item.id, title: item.title }));
    },

    async listD1Databases() {
      const rows = await listPages(`/accounts/${config.accountId}/d1/database`);
      return rows.map((item) => ({ uuid: item.uuid, name: item.name, version: item.version, createdAt: item.created_at }));
    },

    async listDnsRecords(zoneId = config.zoneId) {
      if (!zoneId) throw new CloudflareProviderError("zone_not_configured", "A Cloudflare zone ID is required for DNS inventory.", 400);
      validId(zoneId, "zoneId");
      const rows = await listPages(`/zones/${zoneId}/dns_records`);
      return rows.map((item) => ({
        id: item.id, type: item.type, name: item.name, content: item.content,
        proxied: item.proxied ?? false, ttl: item.ttl ?? null
      }));
    },

    async listWorkerRoutes(zoneId = config.zoneId) {
      if (!zoneId) throw new CloudflareProviderError("zone_not_configured", "A Cloudflare zone ID is required for Worker route inventory.", 400);
      validId(zoneId, "zoneId");
      const rows = await listPages(`/zones/${zoneId}/workers/routes`);
      return rows.map((item) => ({ id: item.id, pattern: item.pattern, script: item.script ?? null }));
    },

    async getInventory({ zoneId = config.zoneId } = {}) {
      const [account, zones, workerScripts, kvNamespaces, d1Databases] = await Promise.all([
        this.getAccount(), this.listZones(), this.listWorkerScripts(),
        this.listKVNamespaces(), this.listD1Databases()
      ]);
      const [dnsRecords, workerRoutes] = zoneId
        ? await Promise.all([this.listDnsRecords(zoneId), this.listWorkerRoutes(zoneId)])
        : [[], []];
      return { account, zones, workerScripts, kvNamespaces, d1Databases, dnsRecords, workerRoutes, readOnly: true };
    }
  };
}
