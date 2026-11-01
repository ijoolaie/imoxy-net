import test from "node:test";
import assert from "node:assert/strict";
import { createQuotaReservationService } from "../src/domain/quota-reservation-service.js";

const NOW = "2026-10-27T23:59:59.900Z";

function fixture(overrides = {}) {
  const calls = { reserve: [], settle: [], release: [] };
  const store = {
    async reserveQuota(input) {
      calls.reserve.push(input);
      return { allowed: true, duplicate: false, reservation: { ...input, status: "active" } };
    },
    async markQuotaReservationForwarding(input) { calls.markForwarding = input; return true; },
    async settleUsageEvent(input) {
      calls.settle.push(input);
      return { applied: true, duplicate: calls.settle.length > 1, eventId: input.eventId };
    },
    async releaseQuotaReservation(input) {
      calls.release.push(input);
      return true;
    },
    ...overrides
  };
  return { service: createQuotaReservationService({ store, now: () => NOW, leaseDurationMs: 30_000 }), calls };
}

test("reservation uses a stable caller-supplied ID and computes UTC date and lease", async () => {
  const { service, calls } = fixture();
  const result = await service.reserve({ reservationId: "reserve-1", accountId: "acct-1", reservedBytes: 512 });
  assert.equal(result.allowed, true);
  assert.equal(calls.reserve[0].reservationId, "reserve-1");
  assert.equal(calls.reserve[0].usageDate, "2026-10-27");
  assert.equal(calls.reserve[0].leaseExpiresAt, "2026-10-28T00:00:29.900Z");
});

test("reservation denial is returned without pretending traffic is allowed", async () => {
  const { service } = fixture({ reserveQuota: async () => ({ allowed: false, reason: "quota_exceeded" }) });
  const result = await service.reserve({ reservationId: "reserve-1", accountId: "acct-1", reservedBytes: 1 });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "quota_exceeded");
});

test("settlement hashes canonical immutable event data and preserves reservation date across midnight", async () => {
  const { service, calls } = fixture();
  const input = {
    producerId: "worker-1", eventId: "event-1", reservationId: "reserve-1",
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 20,
    downloadBytes: 30, requestCount: 1, at: "2026-10-28T00:00:01.000Z"
  };
  await service.settle(input);
  await service.settle(input);
  assert.equal(calls.settle[0].usageDate, "2026-10-27");
  assert.equal(calls.settle[0].at, "2026-10-28T00:00:01.000Z");
  assert.match(calls.settle[0].payloadHash, /^[0-9a-f]{64}$/);
  assert.equal(calls.settle[0].payloadHash, calls.settle[1].payloadHash);
});

test("settlement rejects conflicting event IDs and failed reservation application", async () => {
  const { service } = fixture({ settleUsageEvent: async () => ({ applied: false, conflict: true }) });
  await assert.rejects(() => service.settle({
    producerId: "worker-1", eventId: "event-1", reservationId: "reserve-1",
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 1, downloadBytes: 0
  }), (error) => error.code === "usage_event_conflict" && error.status === 409);

  const denied = fixture({ settleUsageEvent: async () => ({ applied: false, reason: "reservation_not_active" }) });
  await assert.rejects(() => denied.service.settle({
    producerId: "worker-1", eventId: "event-1", reservationId: "reserve-1",
    accountId: "acct-1", usageDate: "2026-10-27", uploadBytes: 1, downloadBytes: 0
  }), (error) => error.code === "usage_event_not_applied" && error.status === 409);
});

test("release only delegates an explicit reservation ID and validates input", async () => {
  const { service, calls } = fixture();
  assert.equal(await service.release({ reservationId: "reserve-1", accountId: "acct-1" }), true);
  assert.equal(calls.release[0].reservationId, "reserve-1");
  await assert.rejects(() => service.reserve({ reservationId: "reserve-2", accountId: "acct-1", reservedBytes: 0 }), TypeError);
  await assert.rejects(() => service.settle({
    producerId: "worker-1", eventId: "event-1", reservationId: "reserve-1",
    accountId: "acct-1", usageDate: "2026-02-30", uploadBytes: 1, downloadBytes: 0
  }), TypeError);
});
