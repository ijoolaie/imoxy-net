-- Defense-in-depth: keep each daily counter and combined daily bytes inside
-- JavaScript's exact integer range even if a writer bypasses the D1 adapter.
CREATE TRIGGER IF NOT EXISTS usage_daily_safe_integer_insert
BEFORE INSERT ON usage_daily
WHEN NEW.upload_bytes > 9007199254740991
  OR NEW.download_bytes > 9007199254740991
  OR NEW.request_count > 9007199254740991
  OR NEW.upload_bytes + NEW.download_bytes > 9007199254740991
BEGIN
  SELECT RAISE(ABORT, 'usage_daily counter exceeds safe-integer range');
END;

CREATE TRIGGER IF NOT EXISTS usage_daily_safe_integer_update
BEFORE UPDATE OF upload_bytes, download_bytes, request_count ON usage_daily
WHEN NEW.upload_bytes > 9007199254740991
  OR NEW.download_bytes > 9007199254740991
  OR NEW.request_count > 9007199254740991
  OR NEW.upload_bytes + NEW.download_bytes > 9007199254740991
BEGIN
  SELECT RAISE(ABORT, 'usage_daily counter exceeds safe-integer range');
END;
