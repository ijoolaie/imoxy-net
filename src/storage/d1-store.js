const ACCOUNT_COLUMNS = Object.freeze({
  username: "username",
  status: "status",
  expiresAt: "expires_at",
  quotaBytes: "quota_bytes",
  dailyQuotaBytes: "daily_quota_bytes",
  speedLimitKbps: "speed_limit_kbps",
  maxConnections: "max_connections",
  notes: "notes"
});

const ACCOUNT_SELECT = `SELECT id, username, status, expires_at, quota_bytes,
  daily_quota_bytes, speed_limit_kbps, max_connections, notes, created_at, updated_at
  FROM proxy_accounts`;

function isValidUsageDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(value + "T00:00:00.000Z");
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function toAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    status: row.status,
    expiresAt: row.expires_at,
    quotaBytes: row.quota_bytes,
    dailyQuotaBytes: row.daily_quota_bytes,
    speedLimitKbps: row.speed_limit_kbps,
    maxConnections: row.max_connections,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function auditInsert(event, accountId) {
  return {
    statement: `INSERT INTO audit_events
      (id, actor_principal_id, action, resource_type, resource_id, outcome, request_id, details_json, created_at)
      SELECT ?, ?, ?, 'proxy_account', ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM proxy_accounts WHERE id = ?)`,
    values: [
      event.id, event.actorPrincipalId ?? null, event.action, accountId,
      event.outcome ?? "success", event.requestId ?? null,
      JSON.stringify(event.details ?? {}), event.createdAt, accountId
    ]
  };
}

function assertProxyCredential(record, accountId) {
  if (!record || typeof record.id !== "string" || !record.id ||
      typeof record.accountId !== "string" || record.accountId !== accountId ||
      typeof record.credentialHash !== "string" || !/^[0-9a-f]{64}$/.test(record.credentialHash) ||
      typeof record.createdAt !== "string" || !Number.isFinite(Date.parse(record.createdAt))) {
    throw new TypeError("A valid hash-only proxy credential record is required.");
  }
}

function assertAuditEvent(event) {
  if (!event || typeof event.id !== "string" || !event.id ||
      typeof event.action !== "string" || !event.action ||
      typeof event.createdAt !== "string" || !event.createdAt) {
    throw new TypeError("A valid audit event is required for every account mutation.");
  }
  if (event.outcome !== undefined && !["success", "denied", "failure"].includes(event.outcome)) {
    throw new TypeError("Invalid audit event outcome.");
  }
}

function principalAuditInsert(event, resourceType, resourceId, existenceSql, existenceValues) {
  if (!event || typeof event.id !== "string" || !event.id ||
      typeof event.action !== "string" || !event.action ||
      typeof event.createdAt !== "string" || !event.createdAt) {
    throw new TypeError("A valid audit event is required.");
  }
  const statement = `INSERT INTO audit_events
    (id, actor_principal_id, action, resource_type, resource_id, outcome, request_id, details_json, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE ${existenceSql}`;
  return {
    statement,
    values: [
      event.id, event.actorPrincipalId ?? null, event.action, resourceType, resourceId,
      event.outcome ?? "success", event.requestId ?? null,
      JSON.stringify(event.details ?? {}), event.createdAt, ...existenceValues
    ]
  };
}

export function createD1Store(db) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("A Cloudflare D1-compatible database binding is required.");
  }

  return {
    async getAccount(id) {
      if (typeof id !== "string" || !id) return null;
      const row = await db.prepare(`${ACCOUNT_SELECT} WHERE id = ? LIMIT 1`).bind(id).first();
      return toAccount(row);
    },

    async listAccounts({ limit = 50, afterId = null } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
        throw new TypeError("Account list limit must be an integer from 1 to 100.");
      }
      if (afterId !== null && (typeof afterId !== "string" || afterId.length > 128)) {
        throw new TypeError("Invalid account cursor.");
      }
      const sql = afterId === null
        ? `${ACCOUNT_SELECT} ORDER BY id ASC LIMIT ?`
        : `${ACCOUNT_SELECT} WHERE id > ? ORDER BY id ASC LIMIT ?`;
      const statement = db.prepare(sql);
      const result = afterId === null
        ? await statement.bind(limit + 1).all()
        : await statement.bind(afterId, limit + 1).all();
      const rows = result?.results ?? [];
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit).map(toAccount);
      return {
        items,
        nextCursor: hasMore ? items.at(-1)?.id ?? null : null
      };
    },

    async createAccount(account, auditEvent, credentialRecord = null) {
      assertAuditEvent(auditEvent);
      if (credentialRecord !== null) assertProxyCredential(credentialRecord, account.id);
      const insert = db.prepare(`INSERT INTO proxy_accounts
        (id, username, status, credential_secret_ref, expires_at, quota_bytes, daily_quota_bytes,
         speed_limit_kbps, max_connections, notes, created_at, updated_at)
        VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        account.id, account.username, account.status ?? "active", account.expiresAt ?? null,
        account.quotaBytes ?? null, account.dailyQuotaBytes ?? null,
        account.speedLimitKbps ?? null, account.maxConnections ?? null,
        account.notes ?? "", account.createdAt, account.updatedAt
      );
      const audit = auditInsert(auditEvent, account.id);
      const statements = [insert];
      if (credentialRecord) {
        statements.push(db.prepare(`INSERT INTO proxy_credentials
          (id, account_id, credential_hash, created_at, revoked_at)
          VALUES (?, ?, ?, ?, NULL)`).bind(
          credentialRecord.id, credentialRecord.accountId,
          credentialRecord.credentialHash, credentialRecord.createdAt
        ));
      }
      statements.push(db.prepare(audit.statement).bind(...audit.values));
      await db.batch(statements);
      return this.getAccount(account.id);
    },

    async findAccountByCredentialHash(credentialHash) {
      if (typeof credentialHash !== "string" || !/^[0-9a-f]{64}$/.test(credentialHash)) {
        throw new TypeError("A SHA-256 proxy credential hash is required.");
      }
      const row = await db.prepare(`SELECT c.id AS credential_id, a.id, a.username, a.status,
        a.expires_at, a.quota_bytes, a.daily_quota_bytes, a.speed_limit_kbps,
        a.max_connections, a.notes, a.created_at, a.updated_at
        FROM proxy_credentials c JOIN proxy_accounts a ON a.id = c.account_id
        WHERE c.credential_hash = ? AND c.revoked_at IS NULL LIMIT 1`).bind(credentialHash).first();
      if (!row) return null;
      return { credentialId: row.credential_id, account: toAccount(row) };
    },

    async rotateCredential(accountId, credentialRecord, auditEvent) {
      assertAuditEvent(auditEvent);
      assertProxyCredential(credentialRecord, accountId);
      const revoke = db.prepare(`UPDATE proxy_credentials SET revoked_at = ?
        WHERE account_id = ? AND revoked_at IS NULL`).bind(credentialRecord.createdAt, accountId);
      const insert = db.prepare(`INSERT INTO proxy_credentials
        (id, account_id, credential_hash, created_at, revoked_at)
        VALUES (?, ?, ?, ?, NULL)`).bind(
        credentialRecord.id, credentialRecord.accountId,
        credentialRecord.credentialHash, credentialRecord.createdAt
      );
      const audit = auditInsert(auditEvent, accountId);
      const results = await db.batch([revoke, insert, db.prepare(audit.statement).bind(...audit.values)]);
      return (results?.[1]?.meta?.changes ?? 0) === 1;
    },

    async updateAccount(id, changes, auditEvent) {
      assertAuditEvent(auditEvent);
      if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        throw new TypeError("Account changes must be an object.");
      }
      const keys = Object.keys(changes);
      if (keys.length === 0) throw new TypeError("At least one account field must change.");
      for (const key of keys) {
        if (!Object.hasOwn(ACCOUNT_COLUMNS, key)) throw new TypeError(`Unsupported account field: ${key}`);
      }

      const assignments = keys.map((key) => `${ACCOUNT_COLUMNS[key]} = ?`);
      assignments.push("updated_at = ?");
      const values = keys.map((key) => changes[key]);
      values.push(auditEvent.createdAt, id);
      const update = db.prepare(`UPDATE proxy_accounts SET ${assignments.join(", ")} WHERE id = ?`).bind(...values);
      const audit = auditInsert(auditEvent, id);
      const results = await db.batch([update, db.prepare(audit.statement).bind(...audit.values)]);
      const changed = results?.[0]?.meta?.changes;
      if (changed === 0) return null;
      return this.getAccount(id);
    },

    async deleteAccount(id, auditEvent) {
      assertAuditEvent(auditEvent);
      if (typeof id !== "string" || !id) return false;
      // Expired leases do not represent live sessions. Clean a bounded batch
      // before deletion; active leases remain protected by the FK restriction.
      await this.cleanupExpiredProxySessions({ at: auditEvent.createdAt, accountId: id, limit: 1000 });
      const audit = auditInsert(auditEvent, id);
      const results = await db.batch([
        db.prepare(audit.statement).bind(...audit.values),
        db.prepare("DELETE FROM proxy_accounts WHERE id = ?").bind(id)
      ]);
      return (results?.[1]?.meta?.changes ?? 0) > 0;
    },

    async findPrincipalByUsername(username) {
      if (typeof username !== "string" || !username) return null;
      const row = await db.prepare(`SELECT id, username, password_hash, role, status, created_at, updated_at
        FROM principals WHERE username = ? COLLATE NOCASE LIMIT 1`).bind(username).first();
      if (!row) return null;
      return {
        id: row.id, username: row.username, passwordHash: row.password_hash,
        role: row.role, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at
      };
    },

    async countPrincipals() {
      const row = await db.prepare("SELECT COUNT(*) AS count FROM principals").first();
      return Number(row?.count ?? 0);
    },

    async createInitialOwner(principal, auditEvent) {
      const insert = db.prepare(`INSERT INTO principals
        (id, username, password_hash, role, status, created_at, updated_at)
        SELECT ?, ?, ?, 'owner', 'active', ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM principals)`).bind(
        principal.id, principal.username, principal.passwordHash, principal.createdAt, principal.updatedAt
      );
      const audit = principalAuditInsert(
        auditEvent, "principal", principal.id,
        "EXISTS (SELECT 1 FROM principals WHERE id = ?)", [principal.id]
      );
      const results = await db.batch([insert, db.prepare(audit.statement).bind(...audit.values)]);
      return (results?.[0]?.meta?.changes ?? 0) === 1;
    },

    async createSession(session, auditEvent) {
      const insert = db.prepare(`INSERT INTO sessions
        (id, principal_id, token_hash, created_at, expires_at, last_seen_at, user_agent_hash, ip_prefix_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        session.id, session.principalId, session.tokenHash, session.createdAt, session.expiresAt,
        session.lastSeenAt ?? session.createdAt, session.userAgentHash ?? null, session.ipPrefixHash ?? null
      );
      const audit = principalAuditInsert(
        auditEvent, "session", session.id,
        "EXISTS (SELECT 1 FROM sessions WHERE id = ?)", [session.id]
      );
      await db.batch([insert, db.prepare(audit.statement).bind(...audit.values)]);
      return { ...session };
    },

    async findSessionByTokenHash(tokenHash) {
      const row = await db.prepare(`SELECT
        s.id AS session_id, s.principal_id, s.token_hash, s.created_at AS session_created_at,
        s.expires_at, s.revoked_at, s.last_seen_at,
        p.id AS joined_principal_id, p.username, p.role, p.status,
        p.created_at AS principal_created_at, p.updated_at AS principal_updated_at
        FROM sessions s JOIN principals p ON p.id = s.principal_id
        WHERE s.token_hash = ? LIMIT 1`).bind(tokenHash).first();
      if (!row) return null;
      return {
        id: row.session_id, principalId: row.principal_id, tokenHash: row.token_hash,
        createdAt: row.session_created_at, expiresAt: row.expires_at,
        revokedAt: row.revoked_at, lastSeenAt: row.last_seen_at,
        principal: {
          id: row.joined_principal_id, username: row.username, role: row.role,
          status: row.status, createdAt: row.principal_created_at, updatedAt: row.principal_updated_at
        }
      };
    },

    async touchSession(id, lastSeenAt) {
      await db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL")
        .bind(lastSeenAt, id).run();
    },

    async revokeSession(id, revokedAt, auditEvent) {
      const update = db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
        .bind(revokedAt, id);
      const audit = principalAuditInsert(
        auditEvent, "session", id,
        "EXISTS (SELECT 1 FROM sessions WHERE id = ? AND revoked_at = ?)", [id, revokedAt]
      );
      const results = await db.batch([update, db.prepare(audit.statement).bind(...audit.values)]);
      return (results?.[0]?.meta?.changes ?? 0) > 0;
    },

    async consumeAuthAttempt({ keyHash, windowStartedAt, now }) {
      if (typeof keyHash !== "string" || keyHash.length < 32) {
        throw new TypeError("An opaque hashed rate-limit key is required.");
      }
      const row = await db.prepare(`INSERT INTO auth_rate_limits (key_hash, window_started_at, attempt_count, updated_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(key_hash) DO UPDATE SET
          window_started_at = excluded.window_started_at,
          attempt_count = CASE
            WHEN auth_rate_limits.window_started_at = excluded.window_started_at
              THEN auth_rate_limits.attempt_count + 1
            ELSE 1
          END,
          updated_at = excluded.updated_at
        RETURNING attempt_count`).bind(keyHash, windowStartedAt, now).first();
      return Number(row?.attempt_count ?? 0);
    },

    async clearAuthAttempts(keyHash) {
      await db.prepare("DELETE FROM auth_rate_limits WHERE key_hash = ?").bind(keyHash).run();
    },

    async getUsageSummary(accountId, usageDate) {
      if (typeof accountId !== "string" || !accountId ||
          !isValidUsageDate(usageDate)) {
        throw new TypeError("A valid account ID and UTC usage date are required.");
      }
      // SQLite SUM(integer) can throw before JavaScript can validate a lifetime
      // total. First use REAL aggregation only as an overflow detector; only run
      // exact integer SUMs after proving every aggregate is within safe range.
      const estimate = await db.prepare(`SELECT
        COALESCE(SUM(CAST(upload_bytes AS REAL) + CAST(download_bytes AS REAL)), 0) AS total_bytes_approx,
        COALESCE(SUM(CASE WHEN usage_date = ?
          THEN CAST(upload_bytes AS REAL) + CAST(download_bytes AS REAL) ELSE 0 END), 0) AS daily_bytes_approx,
        COALESCE(SUM(CAST(request_count AS REAL)), 0) AS request_count_approx
        FROM usage_daily WHERE account_id = ?`).bind(usageDate, accountId).first();
      const estimates = [
        Number(estimate?.total_bytes_approx ?? 0),
        Number(estimate?.daily_bytes_approx ?? 0),
        Number(estimate?.request_count_approx ?? 0)
      ];
      if (!estimates.every((value) => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER)) {
        throw new RangeError("Usage counters exceed the supported safe-integer range.");
      }

      // Given non-negative integer rows, an aggregate whose REAL estimate is
      // within MAX_SAFE_INTEGER is also safe to sum exactly as an SQLite integer.
      const row = await db.prepare(`SELECT
        COALESCE(SUM(upload_bytes + download_bytes), 0) AS total_bytes,
        COALESCE(SUM(CASE WHEN usage_date = ? THEN upload_bytes + download_bytes ELSE 0 END), 0) AS daily_bytes,
        COALESCE(SUM(request_count), 0) AS request_count
        FROM usage_daily WHERE account_id = ?`).bind(usageDate, accountId).first();
      const totalBytes = Number(row?.total_bytes ?? 0);
      const dailyBytes = Number(row?.daily_bytes ?? 0);
      const requestCount = Number(row?.request_count ?? 0);
      if (![totalBytes, dailyBytes, requestCount].every(Number.isSafeInteger) ||
          totalBytes < 0 || dailyBytes < 0 || requestCount < 0) {
        throw new RangeError("Usage counters exceed the supported safe-integer range.");
      }
      return { accountId, usageDate, totalBytes, dailyBytes, requestCount };
    },

    async recordUsage({ accountId, usageDate, uploadBytes, downloadBytes, requestCount = 1, updatedAt }) {
      if (typeof accountId !== "string" || !accountId ||
          !isValidUsageDate(usageDate) ||
          ![uploadBytes, downloadBytes, requestCount].every((value) => Number.isSafeInteger(value) && value >= 0) ||
          !Number.isSafeInteger(uploadBytes + downloadBytes) ||
          typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) {
        throw new TypeError("Usage record fields are invalid.");
      }
      const result = await db.prepare(`INSERT INTO usage_daily
        (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id, usage_date) DO UPDATE SET
          upload_bytes = usage_daily.upload_bytes + excluded.upload_bytes,
          download_bytes = usage_daily.download_bytes + excluded.download_bytes,
          request_count = usage_daily.request_count + excluded.request_count,
          updated_at = excluded.updated_at
        WHERE usage_daily.upload_bytes <= 9007199254740991 - excluded.upload_bytes
          AND usage_daily.download_bytes <= 9007199254740991 - excluded.download_bytes
          AND usage_daily.request_count <= 9007199254740991 - excluded.request_count
          AND usage_daily.upload_bytes + usage_daily.download_bytes
            <= 9007199254740991 - excluded.upload_bytes - excluded.download_bytes`).bind(
        accountId, usageDate, uploadBytes, downloadBytes, requestCount, updatedAt
      ).run();
      if (result?.meta?.changes === 0) {
        throw new RangeError("Usage counters would exceed the supported safe-integer range.");
      }
    },

    async acquireProxySession({ sessionId, accountId, createdAt, expiresAt, at = createdAt, maxConcurrentSessions }) {
      const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;
      const createdTimestamp = typeof createdAt === "string" ? Date.parse(createdAt) : NaN;
      const expiryTimestamp = typeof expiresAt === "string" ? Date.parse(expiresAt) : NaN;
      const currentTimestamp = typeof at === "string" ? Date.parse(at) : NaN;
      if (!validId(sessionId) || !validId(accountId) ||
          !Number.isFinite(createdTimestamp) || !Number.isFinite(expiryTimestamp) ||
          !Number.isFinite(currentTimestamp) || currentTimestamp < createdTimestamp ||
          expiryTimestamp <= createdTimestamp || expiryTimestamp <= currentTimestamp ||
          !Number.isSafeInteger(maxConcurrentSessions) || maxConcurrentSessions < 1) {
        throw new TypeError("Proxy session admission fields are invalid.");
      }

      // Opportunistically prune a bounded batch. Expired leases are excluded
      // from the atomic admission predicate even if cleanup is unavailable.
      try { await this.cleanupExpiredProxySessions({ at, limit: 100 }); } catch {}

      const admission = await db.prepare(`INSERT INTO proxy_active_sessions
        (session_id, account_id, created_at, expires_at)
        SELECT ?, a.id, ?, ?
        FROM proxy_accounts a
        WHERE a.id = ? AND a.status = 'active'
          AND (a.expires_at IS NULL OR a.expires_at > ?)
          AND (a.max_connections IS NULL OR
            (SELECT COUNT(*) FROM proxy_active_sessions s
              WHERE s.account_id = a.id AND s.expires_at > ?) < a.max_connections)
          AND (SELECT COUNT(*) FROM proxy_active_sessions s
            WHERE s.expires_at > ?) < ?
        ON CONFLICT(session_id) DO NOTHING`).bind(
        sessionId, createdAt, expiresAt, accountId,
        at, at, at, maxConcurrentSessions
      ).run();

      const row = await db.prepare(`SELECT s.session_id, s.account_id, s.created_at, s.expires_at,
          a.status AS account_status, a.expires_at AS account_expires_at
        FROM proxy_active_sessions s
        JOIN proxy_accounts a ON a.id = s.account_id
        WHERE s.session_id = ? LIMIT 1`).bind(sessionId).first();
      if (!row) {
        return { allowed: false, duplicate: false, conflict: false, reason: "account_unavailable_or_session_limit" };
      }
      if (row.account_id !== accountId || row.created_at !== createdAt || row.expires_at !== expiresAt) {
        return { allowed: false, duplicate: true, conflict: true, reason: "session_id_conflict" };
      }
      if (row.account_status !== "active" ||
          (row.account_expires_at !== null && row.account_expires_at !== undefined &&
           Date.parse(row.account_expires_at) <= currentTimestamp) ||
          Date.parse(row.expires_at) <= currentTimestamp) {
        return { allowed: false, duplicate: true, conflict: false, reason: "session_lease_expired_or_account_unusable" };
      }
      return {
        allowed: true,
        duplicate: (admission?.meta?.changes ?? 0) === 0,
        conflict: false,
        session: { sessionId: row.session_id, accountId: row.account_id, createdAt: row.created_at, expiresAt: row.expires_at }
      };
    },

    async releaseProxySession({ sessionId, accountId }) {
      if (typeof sessionId !== "string" || !sessionId || sessionId.length > 128 ||
          typeof accountId !== "string" || !accountId || accountId.length > 128) {
        throw new TypeError("Proxy session release fields are invalid.");
      }
      const result = await db.prepare(`DELETE FROM proxy_active_sessions
        WHERE session_id = ? AND account_id = ?`).bind(sessionId, accountId).run();
      return (result?.meta?.changes ?? 0) === 1;
    },

    async cleanupExpiredProxySessions({ at, accountId = null, limit = 100 } = {}) {
      if (typeof at !== "string" || !Number.isFinite(Date.parse(at)) ||
          (accountId !== null && (typeof accountId !== "string" || !accountId || accountId.length > 128)) ||
          !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
        throw new TypeError("Proxy session cleanup fields are invalid.");
      }
      const accountClause = accountId === null ? "" : " AND account_id = ?";
      const values = accountId === null ? [at, limit] : [at, accountId, limit];
      const result = await db.prepare(`DELETE FROM proxy_active_sessions
        WHERE session_id IN (
          SELECT session_id FROM proxy_active_sessions
          WHERE expires_at <= ?${accountClause}
          ORDER BY expires_at ASC LIMIT ?
        )`).bind(...values).run();
      return result?.meta?.changes ?? 0;
    },

    async reserveQuota({ reservationId, accountId, usageDate, reservedBytes, createdAt, leaseExpiresAt }) {
      const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;
      if (!validId(reservationId) || !validId(accountId) || !isValidUsageDate(usageDate) ||
          !Number.isSafeInteger(reservedBytes) || reservedBytes < 1 ||
          typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt)) ||
          typeof leaseExpiresAt !== "string" || !Number.isFinite(Date.parse(leaseExpiresAt)) ||
          Date.parse(leaseExpiresAt) <= Date.parse(createdAt)) {
        throw new TypeError("Quota reservation fields are invalid.");
      }

      // Keep bounded stale-reservation cleanup and the conditional quota claim
      // in one D1 batch so each forwarded chunk does not pay an extra round trip.
      await db.batch([
        db.prepare(`UPDATE quota_reservations SET status = 'released', actual_bytes = 0, updated_at = ?
          WHERE reservation_id IN (SELECT reservation_id FROM quota_reservations
            WHERE status = 'active' AND account_id = ? AND forwarding_started_at IS NULL AND lease_expires_at <= ?
            ORDER BY lease_expires_at ASC LIMIT 100)`).bind(createdAt, accountId, createdAt),
        db.prepare(`INSERT INTO quota_reservations
          (reservation_id, account_id, usage_date, reserved_bytes, actual_bytes, status, created_at, lease_expires_at, updated_at, forwarding_started_at)
          SELECT ?, a.id, ?, ?, NULL, 'active', ?, ?, ?, NULL
          FROM proxy_accounts a
          WHERE a.id = ? AND a.status = 'active'
            AND (a.expires_at IS NULL OR a.expires_at > ?)
            AND (a.quota_bytes IS NULL OR
              COALESCE((SELECT SUM(upload_bytes + download_bytes) FROM usage_daily
                WHERE account_id = a.id), 0) +
              COALESCE((SELECT SUM(reserved_bytes) FROM quota_reservations
                WHERE account_id = a.id AND status = 'active'), 0) + ? <= a.quota_bytes)
            AND (a.daily_quota_bytes IS NULL OR
              COALESCE((SELECT upload_bytes + download_bytes FROM usage_daily
                WHERE account_id = a.id AND usage_date = ?), 0) +
              COALESCE((SELECT SUM(reserved_bytes) FROM quota_reservations
                WHERE account_id = a.id AND usage_date = ? AND status = 'active'), 0) + ? <= a.daily_quota_bytes)
          ON CONFLICT(reservation_id) DO NOTHING`).bind(
          reservationId, usageDate, reservedBytes, createdAt, leaseExpiresAt, createdAt,
          accountId, createdAt, reservedBytes, usageDate, usageDate, reservedBytes
        )
      ]);

      const row = await db.prepare(`SELECT reservation_id, account_id, usage_date, reserved_bytes,
        actual_bytes, status, created_at, lease_expires_at, updated_at
        FROM quota_reservations WHERE reservation_id = ? LIMIT 1`).bind(reservationId).first();
      if (row) {
        if (row.account_id !== accountId || row.usage_date !== usageDate || row.reserved_bytes !== reservedBytes ||
            row.created_at !== createdAt || row.lease_expires_at !== leaseExpiresAt) {
          return { allowed: false, conflict: true, reason: "reservation_id_conflict" };
        }
        return {
          allowed: row.status === "active",
          duplicate: true,
          reason: row.status === "active" ? null : "reservation_not_active",
          reservation: {
            reservationId: row.reservation_id, accountId: row.account_id, usageDate: row.usage_date,
            reservedBytes: row.reserved_bytes, actualBytes: row.actual_bytes, status: row.status,
            createdAt: row.created_at, leaseExpiresAt: row.lease_expires_at, updatedAt: row.updated_at
          }
        };
      }
      return { allowed: false, duplicate: false, reason: "quota_exceeded_or_account_unusable", reservation: null };
    },

    async markQuotaReservationForwarding({ reservationId, accountId, at }) {
      if (typeof reservationId !== "string" || !reservationId || reservationId.length > 128 ||
          typeof accountId !== "string" || !accountId ||
          typeof at !== "string" || !Number.isFinite(Date.parse(at))) {
        throw new TypeError("Quota reservation forwarding fields are invalid.");
      }
      // RETURNING makes the active-row/forwarding-marker check part of the
      // conditional write, avoiding a second D1 request per forwarded chunk.
      const row = await db.prepare(`UPDATE quota_reservations
        SET forwarding_started_at = COALESCE(forwarding_started_at, ?), updated_at = ?
        WHERE reservation_id = ? AND account_id = ? AND status = 'active'
          AND (forwarding_started_at IS NOT NULL OR (created_at <= ? AND lease_expires_at > ?))
        RETURNING forwarding_started_at`).bind(at, at, reservationId, accountId, at, at).first();
      return Boolean(row?.forwarding_started_at);
    },

    async settleUsageEvent({
      producerId, eventId, reservationId, accountId, usageDate,
      uploadBytes, downloadBytes, requestCount = 1, payloadHash, at
    }) {
      const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 128;
      if (!validId(producerId) || !validId(eventId) || !validId(reservationId) || !validId(accountId) ||
          !isValidUsageDate(usageDate) ||
          ![uploadBytes, downloadBytes, requestCount].every((value) => Number.isSafeInteger(value) && value >= 0) ||
          !Number.isSafeInteger(uploadBytes + downloadBytes) ||
          uploadBytes + downloadBytes > Number.MAX_SAFE_INTEGER ||
          typeof payloadHash !== "string" || !/^[0-9a-f]{64}$/.test(payloadHash) ||
          typeof at !== "string" || !Number.isFinite(Date.parse(at))) {
        throw new TypeError("Usage event fields are invalid.");
      }

      const batchResults = await db.batch([
        db.prepare(`INSERT INTO usage_events
          (producer_id, event_id, reservation_id, account_id, usage_date,
           upload_bytes, download_bytes, request_count, payload_hash, status, created_at)
          SELECT ?, ?, r.reservation_id, r.account_id, r.usage_date, ?, ?, ?, ?, 'claimed', ?
          FROM quota_reservations r
          WHERE r.reservation_id = ? AND r.account_id = ? AND r.usage_date = ?
            AND r.status = 'active' AND r.forwarding_started_at IS NOT NULL AND ? <= r.reserved_bytes
          ON CONFLICT(producer_id, event_id) DO NOTHING`).bind(
          producerId, eventId, uploadBytes, downloadBytes, requestCount, payloadHash, at,
          reservationId, accountId, usageDate, uploadBytes + downloadBytes
        ),
        db.prepare(`UPDATE usage_events SET status = 'applied'
          WHERE producer_id = ? AND event_id = ? AND status = 'claimed'
            AND reservation_id = ? AND account_id = ? AND usage_date = ?
            AND upload_bytes = ? AND download_bytes = ? AND request_count = ? AND payload_hash = ?`).bind(
          producerId, eventId, reservationId, accountId, usageDate,
          uploadBytes, downloadBytes, requestCount, payloadHash
        ),
        db.prepare(`SELECT producer_id, event_id, reservation_id, account_id, usage_date,
          upload_bytes, download_bytes, request_count, payload_hash, status
          FROM usage_events WHERE producer_id = ? AND event_id = ? LIMIT 1`).bind(producerId, eventId)
      ]);

      // Read the replay/conflict result in the same D1 batch as the atomic
      // claim+apply statements; this preserves exact payload verification.
      const row = batchResults?.[2]?.results?.[0] ?? null;
      if (!row) return { applied: false, duplicate: false, reason: "reservation_not_active_or_exceeded" };
      const samePayload = row.reservation_id === reservationId && row.account_id === accountId &&
        row.usage_date === usageDate && row.upload_bytes === uploadBytes &&
        row.download_bytes === downloadBytes && row.request_count === requestCount &&
        row.payload_hash === payloadHash;
      if (!samePayload) return { applied: false, duplicate: true, conflict: true, reason: "usage_event_id_conflict" };
      if (row.status !== "applied") return { applied: false, duplicate: false, reason: "usage_event_not_applied" };
      return { applied: true, duplicate: (batchResults?.[0]?.meta?.changes ?? 0) === 0, reservationId, eventId, status: row.status };
    },

    async releaseQuotaReservation({ reservationId, accountId, at }) {
      if (typeof reservationId !== "string" || !reservationId || reservationId.length > 128 ||
          typeof accountId !== "string" || !accountId ||
          typeof at !== "string" || !Number.isFinite(Date.parse(at))) {
        throw new TypeError("Quota reservation release fields are invalid.");
      }
      const result = await db.prepare(`UPDATE quota_reservations
        SET status = 'released', actual_bytes = 0, updated_at = ?
        WHERE reservation_id = ? AND account_id = ? AND status = 'active' AND forwarding_started_at IS NULL`).bind(at, reservationId, accountId).run();
      return (result?.meta?.changes ?? 0) === 1;
    },

    async getSubscriptionById(id) {
      if (typeof id !== "string" || !id) return null;
      const row = await db.prepare(`SELECT id, account_id, token_hash, formats_json, created_at,
        expires_at, revoked_at, last_accessed_at FROM subscriptions WHERE id = ? LIMIT 1`).bind(id).first();
      if (!row) return null;
      let formats = [];
      try { formats = JSON.parse(row.formats_json); } catch { formats = []; }
      return {
        id: row.id, accountId: row.account_id, tokenHash: row.token_hash,
        formats: Array.isArray(formats) ? formats : [],
        createdAt: row.created_at, expiresAt: row.expires_at,
        revokedAt: row.revoked_at, lastAccessedAt: row.last_accessed_at
      };
    },

    async listSubscriptions(accountId) {
      const result = await db.prepare(`SELECT id, account_id, formats_json, created_at,
        expires_at, revoked_at, last_accessed_at FROM subscriptions
        WHERE account_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`).bind(accountId).all();
      return (result?.results ?? []).map((row) => {
        let formats = [];
        try { formats = JSON.parse(row.formats_json); } catch { formats = []; }
        return {
          id: row.id, accountId: row.account_id, formats: Array.isArray(formats) ? formats : [],
          createdAt: row.created_at, expiresAt: row.expires_at,
          revokedAt: row.revoked_at, lastAccessedAt: row.last_accessed_at
        };
      });
    },

    async createSubscription(subscription, auditEvent) {
      const insert = db.prepare(`INSERT INTO subscriptions
        (id, account_id, token_hash, formats_json, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(
        subscription.id, subscription.accountId, subscription.tokenHash,
        JSON.stringify(subscription.formats), subscription.createdAt, subscription.expiresAt ?? null
      );
      const audit = principalAuditInsert(
        auditEvent, "subscription", subscription.id,
        "EXISTS (SELECT 1 FROM subscriptions WHERE id = ?)", [subscription.id]
      );
      await db.batch([insert, db.prepare(audit.statement).bind(...audit.values)]);
      return this.getSubscriptionById(subscription.id);
    },

    async findSubscriptionByTokenHash(tokenHash) {
      const row = await db.prepare(`SELECT
        s.id AS subscription_id, s.account_id, s.token_hash, s.formats_json,
        s.created_at AS subscription_created_at, s.expires_at AS subscription_expires_at,
        s.revoked_at, s.last_accessed_at,
        a.username AS account_username, a.status AS account_status, a.expires_at AS account_expires_at,
        a.quota_bytes, a.daily_quota_bytes
        FROM subscriptions s JOIN proxy_accounts a ON a.id = s.account_id
        WHERE s.token_hash = ? LIMIT 1`).bind(tokenHash).first();
      if (!row) return null;
      let formats = [];
      try { formats = JSON.parse(row.formats_json); } catch { formats = []; }
      return {
        id: row.subscription_id, accountId: row.account_id, tokenHash: row.token_hash,
        formats: Array.isArray(formats) ? formats : [],
        createdAt: row.subscription_created_at, expiresAt: row.subscription_expires_at,
        revokedAt: row.revoked_at, lastAccessedAt: row.last_accessed_at,
        account: {
          id: row.account_id, username: row.account_username, status: row.account_status,
          expiresAt: row.account_expires_at, quotaBytes: row.quota_bytes, dailyQuotaBytes: row.daily_quota_bytes
        }
      };
    },

    async touchSubscription(id, lastAccessedAt) {
      await db.prepare("UPDATE subscriptions SET last_accessed_at = ? WHERE id = ? AND revoked_at IS NULL")
        .bind(lastAccessedAt, id).run();
    },

    async revokeSubscription(id, revokedAt, auditEvent) {
      const update = db.prepare("UPDATE subscriptions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
        .bind(revokedAt, id);
      const audit = principalAuditInsert(
        auditEvent, "subscription", id,
        "EXISTS (SELECT 1 FROM subscriptions WHERE id = ? AND revoked_at = ?)", [id, revokedAt]
      );
      const results = await db.batch([update, db.prepare(audit.statement).bind(...audit.values)]);
      return (results?.[0]?.meta?.changes ?? 0) > 0;
    },
  };
}