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
    }
  };
}
