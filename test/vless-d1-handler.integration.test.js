import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createD1Store } from "../src/storage/d1-store.js";
import { createQuotaReservationService } from "../src/domain/quota-reservation-service.js";
import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
import { hashProxyCredential } from "../src/security/proxy-credentials.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const NOW = "2026-10-27T12:00:00.000Z";
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

function sqliteD1(db) {
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return db.prepare(sql).get(...values) ?? null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() {
          const result = db.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes) } };
        }
      };
    },
    async batch(statements) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  };
}

class FakeWebSocket extends EventTarget {
  constructor() { super(); this.sent = []; this.accepted = false; }
  accept() { this.accepted = true; }
  send(data) { this.sent.push(Array.from(data)); }
  close(code = 1000, reason = "") {
    const event = new Event("close");
    Object.defineProperties(event, { code: { value: code }, reason: { value: reason } });
    this.dispatchEvent(event);
  }
  receive(data) {
    const event = new Event("message");
    Object.defineProperty(event, "data", { value: data });
    this.dispatchEvent(event);
  }
}

function vlessRequest(payload = [0x11, 0x22, 0x33, 0x44]) {
  const uuid = Uint8Array.from(UUID.replaceAll("-", "").match(/.{2}/g), (part) => Number.parseInt(part, 16));
  const host = new TextEncoder().encode("example.test");
  return Uint8Array.from([
    0, ...uuid, 0, 1, 0x01, 0xbb, 2, host.length, ...host, ...payload
  ]);
}

function fakeSocket() {
  let controller;
  const writes = [];
  let closed = false;
  const socket = {
    opened: Promise.resolve({ remoteAddress: "93.184.216.34", localAddress: null }),
    readable: new ReadableStream({ start(value) { controller = value; } }),
    writable: new WritableStream({ write(value) { writes.push(Array.from(value)); } }),
    async close() {
      closed = true;
      try { controller.close(); } catch {}
    }
  };
  return {
    socket,
    writes,
    enqueue(value) { controller.enqueue(Uint8Array.from(value)); },
    get closed() { return closed; }
  };
}

async function waitFor(predicate, message) {
  for (let i = 0; i < 100; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.fail(message);
}

test("VLESS handler authenticates, admits, forwards and settles through the real D1 store adapter", async (t) => {
  const database = new DatabaseSync(":memory:");
  t.after(() => database.close());
  database.exec("PRAGMA foreign_keys = ON");
  for (const file of [
    "0001_initial.sql", "0002_auth_rate_limits.sql", "0003_telegram_webhook_updates.sql",
    "0004_usage_daily_safe_integer_guards.sql", "0005_proxy_credentials.sql",
    "0006_atomic_quota_reservations.sql", "0007_proxy_active_sessions.sql", "0008_quota_reservation_recovery.sql"
  ]) database.exec(migration(file));

  const db = sqliteD1(database);
  const store = createD1Store(db);
  const credentialHash = await hashProxyCredential(UUID);
  database.prepare(`INSERT INTO proxy_accounts
    (id, username, status, quota_bytes, daily_quota_bytes, max_connections, created_at, updated_at)
    VALUES ('acct-vless', 'vless_user', 'active', 1000, 500, 1, ?, ?)`).run(NOW, NOW);
  database.prepare(`INSERT INTO proxy_credentials (id, account_id, credential_hash, created_at)
    VALUES ('cred-vless', 'acct-vless', ?, ?)`).run(credentialHash, NOW);

  const quotaService = createQuotaReservationService({
    store,
    now: () => NOW,
    leaseDurationMs: 30_000
  });
  const client = new FakeWebSocket();
  const server = new FakeWebSocket();
  const upstream = fakeSocket();
  const handler = createVlessWebSocketHandler({
    storeFactory: () => store,
    quotaServiceFactory: () => quotaService,
    connectTcp: async () => upstream.socket,
    resolveDestination: async () => "93.184.216.34",
    webSocketPairFactory: () => [client, server],
    upgradeResponseFactory: () => new Response("upgraded", { status: 200 }),
    now: () => Date.parse(NOW),
    initialHandshakeTimeoutMs: 10_000,
    idleTimeoutMs: 120_000
  });
  const env = {
    DB: db,
    PROXY_WS_PATH: "/proxy/vless",
    PROXY_ALLOWED_HOSTS: "example.test",
    PROXY_ALLOWED_PORTS: "443",
    PROXY_USAGE_PRODUCER_ID: "vless-integration-test",
    PROXY_MAX_DOWNLOAD_BYTES: "1048576",
    PROXY_MAX_SESSION_DURATION_MS: "3600000",
    PROXY_MAX_CONCURRENT_SESSIONS: "10",
    PROXY_SESSION_LEASE_GRACE_MS: "60000"
  };
  const request = new Request("https://imoxy.test/proxy/vless", {
    headers: {
      upgrade: "websocket",
      connection: "Upgrade",
      "sec-websocket-version": "13",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ=="
    }
  });

  const response = await handler.fetch(request, env);
  assert.equal(response.status, 200);
  assert.equal(server.accepted, true);
  server.receive(vlessRequest());

  await waitFor(
    () => server.sent.some((frame) => frame.length === 2 && frame[0] === 0 && frame[1] === 0),
    "VLESS handshake response was not sent"
  );

  const usage = database.prepare(`SELECT upload_bytes, download_bytes, request_count
    FROM usage_daily WHERE account_id = 'acct-vless'`).get();
  assert.deepEqual({ ...usage }, { upload_bytes: 4, download_bytes: 0, request_count: 1 });
  const reservation = database.prepare(`SELECT status, actual_bytes FROM quota_reservations
    WHERE account_id = 'acct-vless'`).get();
  assert.deepEqual({ ...reservation }, { status: "settled", actual_bytes: 4 });
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM proxy_active_sessions WHERE account_id = 'acct-vless'").get().count, 1);
  assert.deepEqual(upstream.writes, [[0x11, 0x22, 0x33, 0x44]]);

  // Exercise the opposite relay direction through the same D1-backed handler:
  // TCP download bytes must be sent to the WebSocket and settled as download usage.
  const downloadChunk = [0xaa, 0xbb, 0xcc];
  upstream.enqueue(downloadChunk);
  await waitFor(
    () => server.sent.some((frame) => frame.length === downloadChunk.length &&
      frame.every((byte, index) => byte === downloadChunk[index])),
    "TCP download chunk was not forwarded to the WebSocket"
  );
  await waitFor(
    () => database.prepare("SELECT download_bytes FROM usage_daily WHERE account_id = 'acct-vless'")
      .get()?.download_bytes === downloadChunk.length,
    "D1-backed download usage was not settled"
  );

  const bidirectionalUsage = database.prepare(`SELECT upload_bytes, download_bytes, request_count
    FROM usage_daily WHERE account_id = 'acct-vless'`).get();
  assert.deepEqual({ ...bidirectionalUsage }, {
    upload_bytes: 4, download_bytes: downloadChunk.length, request_count: 1
  });
  const settledReservations = database.prepare(`SELECT status, actual_bytes FROM quota_reservations
    WHERE account_id = 'acct-vless' ORDER BY actual_bytes`).all();
  assert.deepEqual(settledReservations.map((row) => ({ ...row })), [
    { status: "settled", actual_bytes: 3 },
    { status: "settled", actual_bytes: 4 }
  ]);

  server.close(1000, "test_complete");
  await waitFor(
    () => database.prepare("SELECT COUNT(*) AS count FROM proxy_active_sessions WHERE account_id = 'acct-vless'").get().count === 0,
    "D1-backed session lease was not released after close"
  );
  assert.equal(upstream.closed, true);
});
