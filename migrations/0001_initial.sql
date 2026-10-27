-- imoxy-net initial schema. Apply with Wrangler/D1 migration tooling.
-- Secrets are represented by hashes or external secret references, never plaintext tokens.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS principals (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  principal_id TEXT NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  user_agent_hash TEXT,
  ip_prefix_hash TEXT
);
CREATE INDEX IF NOT EXISTS sessions_principal_expiry ON sessions(principal_id, expires_at);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS proxy_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
  credential_secret_ref TEXT,
  expires_at TEXT,
  quota_bytes INTEGER CHECK (quota_bytes IS NULL OR quota_bytes >= 0),
  daily_quota_bytes INTEGER CHECK (daily_quota_bytes IS NULL OR daily_quota_bytes >= 0),
  speed_limit_kbps INTEGER CHECK (speed_limit_kbps IS NULL OR speed_limit_kbps >= 0),
  max_connections INTEGER CHECK (max_connections IS NULL OR max_connections >= 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS proxy_accounts_status_expiry ON proxy_accounts(status, expires_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  formats_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  last_accessed_at TEXT
);
CREATE INDEX IF NOT EXISTS subscriptions_account ON subscriptions(account_id);
CREATE INDEX IF NOT EXISTS subscriptions_expiry ON subscriptions(expires_at);

CREATE TABLE IF NOT EXISTS usage_daily (
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  upload_bytes INTEGER NOT NULL DEFAULT 0 CHECK (upload_bytes >= 0),
  download_bytes INTEGER NOT NULL DEFAULT 0 CHECK (download_bytes >= 0),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, usage_date)
);

CREATE TABLE IF NOT EXISTS installation_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES principals(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS provider_resources (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('cloudflare')),
  resource_type TEXT NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  observed_at TEXT NOT NULL,
  UNIQUE(provider, resource_type, external_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_principal_id TEXT REFERENCES principals(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
  request_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_events_created ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS audit_events_actor_created ON audit_events(actor_principal_id, created_at);
