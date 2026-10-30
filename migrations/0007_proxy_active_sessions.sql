-- Durable active-session leases for per-account and installation-wide VLESS admission.
-- A restrictive account FK prevents deletion from silently freeing an active slot.
CREATE TABLE IF NOT EXISTS proxy_active_sessions (
  session_id TEXT PRIMARY KEY CHECK (length(session_id) BETWEEN 1 AND 128),
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS proxy_active_sessions_account_expiry
  ON proxy_active_sessions(account_id, expires_at);
CREATE INDEX IF NOT EXISTS proxy_active_sessions_expiry
  ON proxy_active_sessions(expires_at);
