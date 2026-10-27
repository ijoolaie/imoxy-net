CREATE TABLE IF NOT EXISTS telegram_webhook_updates (
  update_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed')),
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_telegram_webhook_updates_received_at
  ON telegram_webhook_updates(received_at);
