# Telegram bot — initial read-only integration

**Status:** Initial webhook slice; not a complete bot or Nova-compatible implementation.

## Scope

- Webhook endpoint: `POST /api/v1/integrations/telegram/webhook`.
- Requires Telegram's `X-Telegram-Bot-Api-Secret-Token` header to match `TELEGRAM_WEBHOOK_SECRET`.
- Requires `TELEGRAM_BOT_TOKEN` for outbound `sendMessage` calls.
- Requires an explicit comma-separated `TELEGRAM_ALLOWED_USER_IDS` numeric allowlist. Unknown users are silently ignored.
- Supports `/start`, `/help`, `/status` and `/accounts`; account listing uses the shared account domain service and viewer permission.
- Account output is intentionally limited to username/status and the first 20 results. No credentials, notes, subscription tokens or mutation controls are exposed.
- Input is JSON-only and bounded to 16 KiB. Provider/database failures are returned as generic errors and do not expose secrets.
- Telegram `update_id` values are claimed in D1 before processing; duplicate deliveries are suppressed. Failed outbound delivery releases the pending claim so Telegram can retry; abandoned `processing` claims can be reclaimed after two minutes. Processed claims are retained for seven days before cleanup.
- Apply migration `0003_telegram_webhook_updates.sql` before enabling the webhook; replay protection fails closed when the D1 binding is missing or returns an invalid result.

## Configuration

Set the three values as platform secrets/environment configuration; never commit real values:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (at least 32 characters)
- `TELEGRAM_ALLOWED_USER_IDS` (comma-separated Telegram numeric user IDs)

Configure Telegram's webhook URL to the deployed endpoint and configure the same webhook secret token. No bot token or real Telegram API call is used by tests.

## Known gaps

- This initial slice uses a static Telegram user-ID allowlist and read-only commands; secure account linking, per-principal identity mapping, audited mutations, callback replay protection and richer bot flows are not implemented.
- There is no live webhook registration or deployment.
- Delivery retries can repeat a read-only reply; a durable update-idempotency store is not implemented.
- Bot commands have not been compared against an authorized Nova reference runtime.
