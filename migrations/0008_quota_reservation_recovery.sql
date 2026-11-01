-- Distinguish reservations that are safe to reclaim from those whose bytes may have crossed the network.
ALTER TABLE quota_reservations ADD COLUMN forwarding_started_at TEXT;

-- Existing active reservations predate this marker. Conservatively classify them
-- as uncertain so an upgrade never frees quota for traffic that may have crossed.
UPDATE quota_reservations
SET forwarding_started_at = created_at
WHERE status = 'active' AND forwarding_started_at IS NULL;

CREATE INDEX IF NOT EXISTS quota_reservations_recovery
  ON quota_reservations(status, forwarding_started_at, lease_expires_at);

CREATE TRIGGER IF NOT EXISTS quota_reservation_forwarding_marker_immutable
BEFORE UPDATE OF forwarding_started_at ON quota_reservations
WHEN OLD.forwarding_started_at IS NOT NULL
  AND NEW.forwarding_started_at IS NOT OLD.forwarding_started_at
BEGIN
  SELECT RAISE(ABORT, 'quota forwarding marker is immutable');
END;

CREATE TRIGGER IF NOT EXISTS usage_event_apply_requires_forwarding
BEFORE UPDATE OF status ON usage_events
WHEN OLD.status = 'claimed' AND NEW.status = 'applied'
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM quota_reservations r
    WHERE r.reservation_id = NEW.reservation_id
      AND r.account_id = NEW.account_id
      AND r.usage_date = NEW.usage_date
      AND r.status = 'active'
      AND r.forwarding_started_at IS NOT NULL
      AND NEW.upload_bytes + NEW.download_bytes <= r.reserved_bytes
  ) THEN RAISE(ABORT, 'usage event reservation has not started forwarding') END;
END;
