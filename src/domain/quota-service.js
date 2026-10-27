import { DomainError } from "./account-service.js";

function parseNow(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new TypeError("The quota clock must return a valid timestamp.");
  return timestamp;
}

function validateBytes(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer.`);
  }
}

export function createQuotaService({
  store,
  now = () => new Date().toISOString()
}) {
  if (!store || typeof store.getAccount !== "function" ||
      typeof store.getUsageSummary !== "function" ||
      typeof store.recordUsage !== "function") {
    throw new TypeError("Account and usage storage methods are required.");
  }

  return {
    async evaluate(accountId, { bytesToAdd = 0, at = now() } = {}) {
      validateBytes(bytesToAdd, "bytesToAdd");
      const timestamp = parseNow(at);
      const usageDate = new Date(timestamp).toISOString().slice(0, 10);
      const account = await store.getAccount(accountId);
      if (!account) throw new DomainError("not_found", "The requested account was not found.", 404);
      const usage = await store.getUsageSummary(accountId, usageDate);
      const projectedTotalBytes = usage.totalBytes + bytesToAdd;
      const projectedDailyBytes = usage.dailyBytes + bytesToAdd;
      if (![projectedTotalBytes, projectedDailyBytes].every(Number.isSafeInteger)) {
        throw new DomainError("usage_overflow", "Usage counters exceed the supported range.", 503);
      }

      let reason = null;
      if (account.status === "expired" || (account.expiresAt && Date.parse(account.expiresAt) <= timestamp)) reason = "account_expired";
      else if (account.status !== "active") reason = "account_disabled";
      else if (account.quotaBytes !== null && account.quotaBytes !== undefined &&
          projectedTotalBytes > account.quotaBytes) reason = "total_quota_exceeded";
      else if (account.dailyQuotaBytes !== null && account.dailyQuotaBytes !== undefined &&
          projectedDailyBytes > account.dailyQuotaBytes) reason = "daily_quota_exceeded";

      return {
        allowed: reason === null,
        reason,
        accountId,
        usageDate,
        totalUsedBytes: usage.totalBytes,
        dailyUsedBytes: usage.dailyBytes,
        projectedTotalBytes,
        projectedDailyBytes,
        remainingTotalBytes: account.quotaBytes == null ? null : Math.max(0, account.quotaBytes - usage.totalBytes),
        remainingDailyBytes: account.dailyQuotaBytes == null ? null : Math.max(0, account.dailyQuotaBytes - usage.dailyBytes)
      };
    },

    async record(accountId, { uploadBytes, downloadBytes, requestCount = 1, at = now() }) {
      validateBytes(uploadBytes, "uploadBytes");
      validateBytes(downloadBytes, "downloadBytes");
      if (!Number.isSafeInteger(uploadBytes + downloadBytes)) {
        throw new TypeError("The combined usage byte delta must be a non-negative safe integer.");
      }
      validateBytes(requestCount, "requestCount");
      const timestamp = parseNow(at);
      const account = await store.getAccount(accountId);
      if (!account) throw new DomainError("not_found", "The requested account was not found.", 404);
      const usageDate = new Date(timestamp).toISOString().slice(0, 10);
      await store.recordUsage({
        accountId,
        usageDate,
        uploadBytes,
        downloadBytes,
        requestCount,
        updatedAt: new Date(timestamp).toISOString()
      });
      return this.evaluate(accountId, { at: new Date(timestamp).toISOString() });
    }
  };
}
