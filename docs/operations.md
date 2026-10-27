# Operations and release safety

- Never deploy to a real Cloudflare account from CI until bindings, environments, and explicit release approvals are configured.
- Use least-privilege credentials stored as GitHub/Cloudflare secrets; never commit them.
- Run checks and tests on every pull request.
- Separate development, staging and production resources.
- Back up and validate data migrations before applying them.
- Provide rollback steps for worker code and schema changes.
- Review audit-log contents and retention for data minimization before production.

## Auth/API runtime setup

- Configure a D1 binding named DB and apply migrations in order (0001_initial.sql, then 0002_auth_rate_limits.sql) in a non-production environment first.
- Set AUTH_RATE_LIMIT_SECRET as a platform secret to a cryptographically random value of at least 32 characters. It is used as an HMAC key; never place it in source control or ordinary vars.
- Set BOOTSTRAP_OWNER_SECRET as a separate random value of at least 32 characters for the one-time owner bootstrap route. Send it only in the X-Bootstrap-Secret header. Remove this secret after successful owner creation.
- Test browser login/logout using same-origin HTTPS. Browser sessions use the Secure, HttpOnly, SameSite=Strict __Host-imoxy_session cookie. Native clients without an Origin header receive a bearer token and must keep it in platform secure storage.
- No deployment or migration has been run by this repository change. Do not expose the service publicly until real D1 integration tests, backup/restore, origin and abuse tests, and a reviewed bootstrap procedure pass.
