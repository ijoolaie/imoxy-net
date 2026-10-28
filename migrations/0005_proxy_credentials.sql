-- Store only a one-way hash of each proxy protocol credential.
-- Rotation revokes prior credentials and inserts a new row atomically.
CREATE TABLE IF NOT EXISTS proxy_credentials (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE CASCADE,
  credential_hash TEXT NOT NULL UNIQUE
    CHECK (length(credential_hash) = 64 AND credential_hash NOT GLOB '*[^0-9a-f]*'),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS proxy_credentials_account_active
  ON proxy_credentials(account_id, revoked_at);
