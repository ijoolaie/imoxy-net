import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { Readable, Writable } from "node:stream";
import { DatabaseSync } from "node:sqlite";
import { createD1Store } from "../src/storage/d1-store.js";
import { createQuotaReservationService } from "../src/domain/quota-reservation-service.js";
import { createVlessWebSocketHandler } from "../src/proxy/vless-websocket-handler.js";
import { hashProxyCredential } from "../src/security/proxy-credentials.js";

const UUID = "123e4567-e89b-12d3-a456-426614174000";
const NOW = "2026-11-02T00:00:00.000Z";
const enabled = process.env.IMOXY_TCP_ECHO_TEST === "1";
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

function vlessRequest(payload) {
  const uuid = Uint8Array.from(UUID.replaceAll("-", "").match(/.{2}/g), (part) => Number.parseInt(part, 16));
  const host = new TextEncoder().encode("echo.test");
  return Uint8Array.from([0, ...uuid, 0, 1, 0x13, 0x88, 2, host.length, ...host, ...payload]);
}

function connectLocalEcho() {
  const socket = createConnection({ host: "127.0.0.1", port: 5000 });
  const opened = new Promise((resolve, reject) => {
    socket.once("connect", () => resolve({
      // The handler requires a public pinned-peer identity. This test-only
      // adapter maps that synthetic identity to the local loopback echo socket.
      // Production DNS/peer validation is NOT exercised by this test.
      remoteAddress: "93.184.216.34",
      localAddress: socket.localAddress
    }));
    socket.once("error", reject);
  });
  return {
    opened,
    readable: Readable.toWeb(socket),
    writable: Writable.toWeb(socket),
    async close() {
      if (socket.destroyed) return;
      await new Promise((resolve) => {
        socket.once("close", resolve);
        socket.destroy();
      });
    }
  };
}

async function waitFor(predicate, message) {
  for (let i = 0; i < 500; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

test("VLESS handler relays through a real local TCP echo server and settles both directions", {
  skip: !enabled && "Set IMOXY_TCP_ECHO_TEST=1 and start TCP Echo Server on 127.0.0.1:5000."
}, async (t) => {
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
    VALUES ('acct-local-echo', 'local_echo', 'active', 10485760, 10485760, 1, ?, ?)`).run(NOW, NOW);
  database.prepare(`INSERT INTO proxy_credentials (id, account_id, credential_hash, created_at)
    VALUES ('cred-local-echo', 'acct-local-echo', ?, ?)`).run(credentialHash, NOW);

  const quotaService = createQuotaReservationService({ store, now: () => NOW, leaseDurationMs: 30_000 });
  const client = new FakeWebSocket();
  const server = new FakeWebSocket();
  let tcpConnection;
  t.after(async () => {
    server.close(1000, "local_echo_test_cleanup");
    await tcpConnection?.close();
  });
  const handler = createVlessWebSocketHandler({
    storeFactory: () => store,
    quotaServiceFactory: () => quotaService,
    connectTcp: async () => {
      tcpConnection = connectLocalEcho();
      return tcpConnection;
    },
    // Deliberately synthetic: destination policy/DNS pinning is not the subject
    // of this local transport integration test.
    resolveDestination: async () => ["93.184.216.34"],
    webSocketPairFactory: () => [client, server],
    upgradeResponseFactory: () => new Response("upgraded", { status: 200 }),
    now: () => Date.parse(NOW),
    initialHandshakeTimeoutMs: 10_000,
    idleTimeoutMs: 30_000
  });
  const env = {
    DB: db,
    PROXY_WS_PATH: "/proxy/vless",
    PROXY_ALLOWED_HOSTS: "echo.test",
    PROXY_ALLOWED_PORTS: "5000",
    PROXY_USAGE_PRODUCER_ID: "vless-local-echo-test",
    PROXY_MAX_DOWNLOAD_BYTES: "1048576",
    PROXY_MAX_SESSION_DURATION_MS: "60000",
    PROXY_MAX_CONCURRENT_SESSIONS: "2",
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

  const initialUpload = Uint8Array.from([0x00, 0x01, 0x7f, 0x80, 0xfe, 0xff]);
  server.receive(vlessRequest(initialUpload));
  await waitFor(() => server.sent.some((frame) => frame.length === 2 && frame[0] === 0 && frame[1] === 0),
    "VLESS handshake response was not sent");
  const secondUpload = Uint8Array.from({ length: 64 * 1024 }, (_, index) => (index * 31) & 0xff);
  server.receive(secondUpload);
  const expectedEcho = Uint8Array.from([...initialUpload, ...secondUpload]);
  await waitFor(() => server.sent.slice(1).reduce((sum, frame) => sum + frame.length, 0) >= expectedEcho.length,
    "TCP echo bytes did not reach the WebSocket");
  const actualEcho = Uint8Array.from(server.sent.slice(1).flat());
  assert.deepEqual(actualEcho, expectedEcho, "VLESS TCP relay changed, lost, or duplicated bytes");

  const usage = database.prepare(`SELECT upload_bytes, download_bytes, request_count
    FROM usage_daily WHERE account_id = 'acct-local-echo'`).get();
  assert.deepEqual({ ...usage }, {
    upload_bytes: initialUpload.length + secondUpload.length,
    download_bytes: initialUpload.length + secondUpload.length,
    request_count: 1
  });
  const reservations = database.prepare(`SELECT status, actual_bytes FROM quota_reservations
    WHERE account_id = 'acct-local-echo'`).all();
  assert.ok(reservations.length >= 3, "expected upload and download reservations");
  assert.ok(reservations.every((row) => row.status === "settled"));
  assert.equal(reservations.reduce((sum, row) => sum + row.actual_bytes, 0),
    2 * (initialUpload.length + secondUpload.length));

  server.close(1000, "local_echo_test_complete");
  await waitFor(() => database.prepare(
    "SELECT COUNT(*) AS count FROM proxy_active_sessions WHERE account_id = 'acct-local-echo'"
  ).get().count === 0, "D1-backed session lease was not released");
});