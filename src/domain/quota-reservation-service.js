import { DomainError } from "./account-service.js";

function validId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function validUsageDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function validTimestamp(value, field) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`${field} must be a valid timestamp.`);
  }
  return new Date(Date.parse(value)).toISOString();
}

function validBytes(value, field, { allowZero = true } = {}) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new TypeError(`${field} must be a valid non-negative safe integer.`);
  }
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Trusted internal quota reservation API. IDs are supplied by the trusted
 * producer and must be generated once, before forwarding, then reused on retry.
 * This service must not be exposed as an unauthenticated client reporting API.
 */
export function createQuotaReservationService({
  store,
  now = () => new Date().toISOString(),
  leaseDurationMs = 30_000
} = {}) {
  if (!store || typeof store.reserveQuota !== "function" ||
      typeof store.settleUsageEvent !== "function" ||
      typeof store.releaseQuotaReservation !== "function") {
    throw new TypeError("Quota reservation storage methods are required.");
  }
  if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1) {
    throw new TypeError("The reservation lease duration must be a positive safe integer.");
  }

  return {
    async reserve({ reservationId, accountId, reservedBytes, at = now() }) {
      if (!validId(reservationId) || !validId(accountId)) throw new TypeError("Reservation and account IDs are required.");
      validBytes(reservedBytes, "reservedBytes", { allowZero: false });
      const createdAt = validTimestamp(at, "at");
      const leaseExpiresAt = new Date(Date.parse(createdAt) + leaseDurationMs).toISOString();
      const usageDate = createdAt.slice(0, 10);
      const result = await store.reserveQuota({
        reservationId, accountId, usageDate, reservedBytes, createdAt, leaseExpiresAt
      });
      if (result?.conflict) throw new DomainError("reservation_conflict", "The reservation ID is already bound to different data.", 409);
      if (!result?.allowed) {
        return { allowed: false, reason: result?.reason ?? "quota_unavailable", reservation: result?.reservation ?? null };
      }
      return { allowed: true, duplicate: Boolean(result.duplicate), reservation: result.reservation };
    },

    async settle({
      producerId, eventId, reservationId, accountId, usageDate,
      uploadBytes, downloadBytes, requestCount = 1, at = now()
    }) {
      for (const [field, value] of Object.entries({ producerId, eventId, reservationId, accountId })) {
        if (!validId(value)) throw new TypeError(`${field} is required.`);
      }
      validBytes(uploadBytes, "uploadBytes");
      validBytes(downloadBytes, "downloadBytes");
      validBytes(requestCount, "requestCount");
      const totalBytes = uploadBytes + downloadBytes;
      if (!Number.isSafeInteger(totalBytes)) throw new TypeError("Combined usage bytes must be a safe integer.");
      if (!validUsageDate(usageDate)) throw new TypeError("usageDate must be a valid UTC date.");
      const timestamp = validTimestamp(at, "at");
      const canonicalPayload = JSON.stringify({
        producerId, eventId, reservationId, accountId, usageDate,
        uploadBytes, downloadBytes, requestCount
      });
      const payloadHash = await sha256Hex(canonicalPayload);
      const result = await store.settleUsageEvent({
        producerId, eventId, reservationId, accountId, usageDate,
        uploadBytes, downloadBytes, requestCount, payloadHash, at: timestamp
      });
      if (result?.conflict) throw new DomainError("usage_event_conflict", "The usage event ID is already bound to different content.", 409);
      if (!result?.applied) {
        throw new DomainError("usage_event_not_applied", "The usage event could not be applied to an active quota reservation.", 409);
      }
      return result;
    },

    async release({ reservationId, accountId, at = now() }) {
      if (!validId(reservationId) || !validId(accountId)) throw new TypeError("Reservation and account IDs are required.");
      const timestamp = validTimestamp(at, "at");
      return store.releaseQuotaReservation({ reservationId, accountId, at: timestamp });
    }
  };
}
