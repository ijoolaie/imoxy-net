-- Atomic pre-forwarding quota reservations and idempotent measured usage events.
-- A reservation is a per-chunk allowance and must be created before forwarding.
-- Event rows are transitioned claimed -> applied inside one D1 batch. The trigger
-- applies aggregate accounting and settles the reservation in the same transaction.
CREATE TABLE IF NOT EXISTS quota_reservations (
  reservation_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  reserved_bytes INTEGER NOT NULL CHECK (reserved_bytes > 0 AND reserved_bytes <= 9007199254740991),
  actual_bytes INTEGER CHECK (actual_bytes IS NULL OR (actual_bytes >= 0 AND actual_bytes <= reserved_bytes)),
  status TEXT NOT NULL CHECK (status IN ('active', 'settled', 'released')),
  created_at TEXT NOT NULL,
  lease_expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((status = 'active' AND actual_bytes IS NULL) OR
         (status IN ('settled', 'released') AND actual_bytes IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS quota_reservations_account_date_status
  ON quota_reservations(account_id, usage_date, status);

CREATE TABLE IF NOT EXISTS usage_events (
  producer_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  upload_bytes INTEGER NOT NULL CHECK (upload_bytes >= 0 AND upload_bytes <= 9007199254740991),
  download_bytes INTEGER NOT NULL CHECK (download_bytes >= 0 AND download_bytes <= 9007199254740991),
  request_count INTEGER NOT NULL CHECK (request_count >= 0 AND request_count <= 9007199254740991),
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64 AND payload_hash NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL CHECK (status IN ('claimed', 'applied')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (producer_id, event_id),
  CHECK (upload_bytes + download_bytes <= 9007199254740991)
);
CREATE INDEX IF NOT EXISTS usage_events_account_date ON usage_events(account_id, usage_date);

CREATE TRIGGER IF NOT EXISTS usage_event_apply_validate
BEFORE UPDATE OF status ON usage_events
WHEN OLD.status = 'claimed' AND NEW.status = 'applied'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM quota_reservations r
    WHERE r.reservation_id = NEW.reservation_id
      AND r.account_id = NEW.account_id
      AND r.usage_date = NEW.usage_date
      AND r.status = 'active'
      AND NEW.upload_bytes + NEW.download_bytes <= r.reserved_bytes
  ) THEN RAISE(ABORT, 'usage event has no matching active reservation') END;
END;

CREATE TRIGGER IF NOT EXISTS usage_event_apply_aggregate
AFTER UPDATE OF status ON usage_events
WHEN OLD.status = 'claimed' AND NEW.status = 'applied'
BEGIN
  INSERT INTO usage_daily
    (account_id, usage_date, upload_bytes, download_bytes, request_count, updated_at)
  VALUES
    (NEW.account_id, NEW.usage_date, NEW.upload_bytes, NEW.download_bytes, NEW.request_count, NEW.created_at)
  ON CONFLICT(account_id, usage_date) DO UPDATE SET
    upload_bytes = usage_daily.upload_bytes + excluded.upload_bytes,
    download_bytes = usage_daily.download_bytes + excluded.download_bytes,
    request_count = usage_daily.request_count + excluded.request_count,
    updated_at = excluded.updated_at
  WHERE usage_daily.upload_bytes <= 9007199254740991 - excluded.upload_bytes
    AND usage_daily.download_bytes <= 9007199254740991 - excluded.download_bytes
    AND usage_daily.request_count <= 9007199254740991 - excluded.request_count
    AND usage_daily.upload_bytes + usage_daily.download_bytes
      <= 9007199254740991 - excluded.upload_bytes - excluded.download_bytes;

  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'usage aggregate exceeds safe-integer range') END;

  UPDATE quota_reservations
  SET status = 'settled', actual_bytes = NEW.upload_bytes + NEW.download_bytes,
      updated_at = NEW.created_at
  WHERE reservation_id = NEW.reservation_id AND status = 'active';
  SELECT CASE WHEN changes() = 0
    THEN RAISE(ABORT, 'quota reservation could not be settled') END;
END;

CREATE TRIGGER IF NOT EXISTS quota_reservation_immutable
BEFORE UPDATE OF reservation_id, account_id, usage_date, reserved_bytes, created_at, lease_expires_at ON quota_reservations
BEGIN
  SELECT RAISE(ABORT, 'quota reservation identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS usage_event_immutable
BEFORE UPDATE OF producer_id, event_id, reservation_id, account_id, usage_date,
  upload_bytes, download_bytes, request_count, payload_hash, created_at ON usage_events
BEGIN
  SELECT RAISE(ABORT, 'usage event payload is immutable');
END;
