import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createD1Store } from "../src/storage/d1-store.js";
import { createQuotaReservationService } from "../src/domain/quota-reservation-service.js";

const BASE = "2026-10-27T12:00:00.000Z";
const LATER = "2026-10-27T12:01:00.000Z";
const migration = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

function createFixture() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const file of [
    "0001_initial.sql", "0002_auth_rate_limits.sql", "0003_telegram_webhook_updates.sql",
    "0004_usage_daily_safe_integer_guards.sql", "0005_proxy_credentials.sql",
    "0006_atomic_quota_reservations.sql", "0007_proxy_active_sessions.sql",
    "0008_quota_reservation_recovery.sql"
  ]) db.exec(migration(file));
  db.prepare(`INSERT INTO proxy_accounts
    (id, username, status, quota_bytes, daily_quota_bytes, created_at, updated_at)
    VALUES ('acct-recovery', 'recovery_user', 'active', 100, 200, ?, ?)`).run(BASE, BASE);
  const d1 = {
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
  const store = createD1Store(d1);
  const service = createQuotaReservationService({ store, now: () => BASE, leaseDurationMs: 30_000 });
  return { db, service };
}

test("expired prepared reservations are reclaimed before a new quota admission", async (t) => {
  const { db, service } = createFixture();
  t.after(() => db.close());
  assert.equal((await service.reserve({ reservationId: "prepared-old", accountId: "acct-recovery", reservedBytes: 40 })).allowed, true);
  assert.equal(await service.markForwarding({ reservationId: "prepared-old", accountId: "acct-recovery", at: LATER }), false);
  const next = await service.reserve({
    reservationId: "prepared-new", accountId: "acct-recovery", reservedBytes: 100, at: LATER
  });
  assert.equal(next.allowed, true);
  assert.equal(db.prepare("SELECT status FROM quota_reservations WHERE reservation_id = 'prepared-old'").get().status, "released");
});

test("expired reservations that crossed the forwarding boundary remain charged", async (t) => {
  const { db, service } = createFixture();
  t.after(() => db.close());
  assert.equal((await service.reserve({ reservationId: "forwarded-old", accountId: "acct-recovery", reservedBytes: 40 })).allowed, true);
  assert.equal(await service.markForwarding({ reservationId: "forwarded-old", accountId: "acct-recovery" }), true);
  const next = await service.reserve({
    reservationId: "forwarded-new", accountId: "acct-recovery", reservedBytes: 70, at: LATER
  });
  assert.equal(next.allowed, false);
  assert.equal(db.prepare("SELECT status FROM quota_reservations WHERE reservation_id = 'forwarded-old'").get().status, "active");
});

test("release is allowed only before forwarding and a late settlement cannot resurrect it", async (t) => {
  const { db, service } = createFixture();
  t.after(() => db.close());
  await service.reserve({ reservationId: "safe-release", accountId: "acct-recovery", reservedBytes: 10 });
  assert.equal(await service.release({ reservationId: "safe-release", accountId: "acct-recovery" }), true);
  await assert.rejects(() => service.settle({
    producerId: "test", eventId: "late-event", reservationId: "safe-release",
    accountId: "acct-recovery", usageDate: "2026-10-27", uploadBytes: 1, downloadBytes: 0
  }), (error) => error.code === "usage_event_not_applied");
  await service.reserve({ reservationId: "uncertain", accountId: "acct-recovery", reservedBytes: 10 });
  await service.markForwarding({ reservationId: "uncertain", accountId: "acct-recovery" });
  assert.equal(await service.release({ reservationId: "uncertain", accountId: "acct-recovery" }), false);
  assert.equal(db.prepare("SELECT status FROM quota_reservations WHERE reservation_id = 'uncertain'").get().status, "active");
});

test("concurrent recovery and quota admission cannot over-allocate the recovered allowance", async (t) => {
  const { db, service } = createFixture();
  t.after(() => db.close());
  await service.reserve({ reservationId: "race-expired", accountId: "acct-recovery", reservedBytes: 40 });
  const results = await Promise.all([
    service.reserve({ reservationId: "race-a", accountId: "acct-recovery", reservedBytes: 60, at: LATER }),
    service.reserve({ reservationId: "race-b", accountId: "acct-recovery", reservedBytes: 60, at: LATER })
  ]);
  assert.equal(results.filter((result) => result.allowed).length, 1);
  const active = db.prepare("SELECT COALESCE(SUM(reserved_bytes), 0) AS bytes FROM quota_reservations WHERE status = 'active'").get();
  assert.equal(active.bytes, 60);
});
