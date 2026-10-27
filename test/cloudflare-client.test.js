import test from "node:test";
import assert from "node:assert/strict";
import { createCloudflareClient, CloudflareProviderError } from "../src/providers/cloudflare-client.js";

const accountId = "0123456789abcdef0123456789abcdef";
const zoneId = "abcdef0123456789abcdef0123456789";
const env = {
  CLOUDFLARE_API_TOKEN: "test-token-secret-long-enough",
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_ZONE_ID: zoneId
};

function response(result, extra = {}) {
  return new Response(JSON.stringify({ success: true, result, ...extra }), {
    status: 200, headers: { "content-type": "application/json" }
  });
}

test("Cloudflare client requires a token and correctly shaped account ID", () => {
  assert.throws(() => createCloudflareClient({ CLOUDFLARE_ACCOUNT_ID: accountId }), CloudflareProviderError);
  assert.throws(() => createCloudflareClient({ ...env, CLOUDFLARE_ACCOUNT_ID: "bad" }), TypeError);
});

test("zone inventory paginates with bounded page size and only GET requests", async () => {
  const calls = [];
  const client = createCloudflareClient(env, {
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      const page = Number(new URL(url).searchParams.get("page"));
      return response([{ id: `zone-${page}`, name: `zone${page}.example.com`, status: "active" }],
        { result_info: { total_pages: 2 } });
    }
  });
  const zones = await client.listZones();
  assert.equal(zones.length, 2);
  assert.equal(zones[1].name, "zone2.example.com");
  assert.ok(calls.every((call) => call.options.method === "GET"));
  assert.ok(calls.every((call) => call.options.headers.authorization === `Bearer ${env.CLOUDFLARE_API_TOKEN}`));
  assert.ok(calls.every((call) => call.url.searchParams.get("per_page") === "50"));
});

test("inventory returns sanitized summaries and explicitly reports read-only behavior", async () => {
  const fetchImpl = async (rawUrl, options) => {
    const url = new URL(rawUrl);
    assert.equal(options.method, "GET");
    if (/\/accounts\/[a-f0-9]{32}$/.test(url.pathname)) return response({ id: accountId, name: "Example", type: "standard", created_on: "2020-01-01" });
    if (url.pathname.endsWith("/zones")) return response([{ id: zoneId, name: "example.com", status: "active", plan: { name: "Free" } }], { result_info: { total_pages: 1 } });
    if (url.pathname.endsWith("/workers/scripts")) return response([{ id: "worker-main", modified_on: "2026-01-01" }], { result_info: { total_pages: 1 } });
    if (url.pathname.endsWith("/storage/kv/namespaces")) return response([{ id: "kv1", title: "settings" }], { result_info: { total_pages: 1 } });
    if (url.pathname.endsWith("/d1/database")) return response([{ uuid: "d1-1", name: "imoxy", version: "production" }], { result_info: { total_pages: 1 } });
    if (url.pathname.endsWith("/dns_records")) return response([{ id: "dns1", type: "A", name: "example.com", content: "192.0.2.1", proxied: true, ttl: 1 }], { result_info: { total_pages: 1 } });
    if (url.pathname.endsWith("/workers/routes")) return response([{ id: "route1", pattern: "example.com/*", script: "worker-main" }], { result_info: { total_pages: 1 } });
    throw new Error("unexpected endpoint");
  };
  const inventory = await createCloudflareClient(env, { fetchImpl }).getInventory();
  assert.equal(inventory.readOnly, true);
  assert.equal(inventory.account.name, "Example");
  assert.equal(inventory.zones[0].plan, "Free");
  assert.equal(inventory.d1Databases[0].name, "imoxy");
  assert.equal(inventory.dnsRecords[0].content, "192.0.2.1");
});

test("provider errors are sanitized and never echo credentials or raw provider payloads", async () => {
  const client = createCloudflareClient(env, {
    fetchImpl: async () => new Response(JSON.stringify({
      success: false, errors: [{ message: "token test-token-secret-long-enough leaked" }]
    }), { status: 403 })
  });
  await assert.rejects(() => client.getAccount(), (error) => {
    assert.ok(error instanceof CloudflareProviderError);
    assert.equal(error.code, "provider_permission_denied");
    assert.equal(error.message.includes(env.CLOUDFLARE_API_TOKEN), false);
    return true;
  });
});

test("DNS and Worker route inventory require a valid zone ID", async () => {
  const client = createCloudflareClient({ ...env, CLOUDFLARE_ZONE_ID: undefined }, { fetchImpl: async () => response([]) });
  await assert.rejects(() => client.listDnsRecords(), (error) => error.code === "zone_not_configured");
  await assert.rejects(() => client.listWorkerRoutes("not-a-zone"), TypeError);
});
