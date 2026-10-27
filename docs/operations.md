# Operations and release safety

- Never deploy to a real Cloudflare account from CI until bindings, environments, and explicit release approvals are configured.
- Use least-privilege credentials stored as GitHub/Cloudflare secrets; never commit them.
- Run checks and tests on every pull request.
- Separate development, staging and production resources.
- Back up and validate data migrations before applying them.
- Provide rollback steps for worker code and schema changes.
- Review audit-log contents and retention for data minimization before production.

## Auth/API runtime setup

- Configure a D1 binding named DB and apply migrations in order (0001_initial.sql, 0002_auth_rate_limits.sql, then 0003_telegram_webhook_updates.sql if Telegram integration is enabled) in a non-production environment first.
- Set AUTH_RATE_LIMIT_SECRET as a platform secret to a cryptographically random value of at least 32 characters. It is used as an HMAC key; never place it in source control or ordinary vars.
- Set BOOTSTRAP_OWNER_SECRET as a separate random value of at least 32 characters for the one-time owner bootstrap route. Send it only in the X-Bootstrap-Secret header. Remove this secret after successful owner creation.
- Test browser login/logout using same-origin HTTPS. Browser sessions use the Secure, HttpOnly, SameSite=Strict __Host-imoxy_session cookie. Native clients without an Origin header receive a bearer token and must keep it in platform secure storage.
- No deployment or migration has been run by this repository change. Do not expose the service publicly until real D1 integration tests, backup/restore, origin and abuse tests, and a reviewed bootstrap procedure pass.


## Cloudflare read-only setup

- Set IMOXY_MODE to panel-only (default), cloudflare-only, or combined. Review the mode change before deployment; cloudflare-only disables account CRUD routes and panel-only disables Cloudflare routes.
- Add CLOUDFLARE_API_TOKEN as a platform secret with read-only least-privilege scopes, and set CLOUDFLARE_ACCOUNT_ID as the 32-character account ID. Set CLOUDFLARE_ZONE_ID only when DNS/Worker-route inventory is needed.
- The current provider client performs GET requests only. GET /api/v1/cloudflare/inventory and POST /api/v1/cloudflare/plan are read-only; no apply or delete endpoint exists.
- No Cloudflare credentials or live API access were used in tests. Validate against a dedicated test account before considering write support.


## Web panel assets

- The example Wrangler configuration binds the `public/` directory as Workers Assets and routes `/api/*` and `/health` through the Worker first.
- Static asset security headers and CSP are declared in `public/_headers`; keep scripts/styles same-origin and avoid third-party script sources.
- The web panel is an initial slice. No deployment, browser E2E run, custom-domain verification or real account-data test has been performed.
