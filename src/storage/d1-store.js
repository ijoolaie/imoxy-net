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
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
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

    async createAccount(account, auditEvent) {
      assertAuditEvent(auditEvent);
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
      await db.batch([insert, db.prepare(audit.statement).bind(...audit.values)]);
      return this.getAccount(account.id);
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
        throw new Error("Usage counters exceed the supported safe-integer range.");
      }
      return { accountId, usageDate, totalBytes, dailyBytes, requestCount };
    },

    async recordUsage({ accountId, usageDate, uploadBytes, downloadBytes, requestCount = 1, updatedAt }) {
      if (typeof accountId !== "string" || !accountId ||
          typeof usageDate !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(usageDate) ||
          new Date(usageDate).toISOString().slice(0, 10) !== usageDate ||
          ![uploadBytes, downloadBytes, requestCount].every((value) => Number.isSafeInteger(value) && value >= 0) ||
          typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) {
        throw new TypeError("Usage record fields are invalid.");
      }
      await db.prepare(`INSERT INTO usage_daily
        (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(account_id, usage_date) DO UPDATE SET
          upload_bytes = usage_daily.upload_bytes + excluded.upload_bytes,
          download_bytes = usage_daily.download_bytes + excluded.download_bytes,
          request_count = usage_daily.request_count + excluded.request_count,
          updated_at = excluded.updated_at`).bind(
        accountId, usageDate, uploadBytes, downloadBytes, requestCount, updatedAt
      ).run();
    },
  };
}