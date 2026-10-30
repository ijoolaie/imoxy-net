# Cloudflare integration — read-only inventory and dry-run planning

**Status:** Read-only provider access and dry-run plan generation are implemented. No mutation endpoint exists. This is not a completed provisioning workflow.

## Operating modes

Configure the non-secret Worker variable `IMOXY_MODE` to one of:

- `panel-only` (default): account management and shared API are enabled; Cloudflare routes return 404.
- `cloudflare-only`: Cloudflare inventory/plan routes are enabled; account CRUD routes return 404.
- `combined`: both route families are enabled.

Authentication remains enabled in every mode. Mode changes require a reviewed deployment/configuration change.

## Required secrets and identifiers

- `CLOUDFLARE_API_TOKEN`: platform secret with the least read permissions required for the selected inventory endpoints.
- `CLOUDFLARE_ACCOUNT_ID`: 32-character account identifier.
- `CLOUDFLARE_ZONE_ID`: optional 32-character zone identifier for DNS and Worker route inventory.
- Never commit the API token or put it in ordinary Worker variables. Do not paste it into issue/PR text or logs.

## Read-only API

- `GET /api/v1/cloudflare/inventory` — requires an authenticated principal with `provider.read`.
- `POST /api/v1/cloudflare/plan` — accepts only a `desired` resource declaration, fetches current inventory, and returns a deterministic dry-run plan. Requires `provider.preview`.
- The provider client issues GET requests only. There are no create/update/delete calls and no automatic deletions.
- Plans sanitize resource objects to an explicit allowlist, mark each operation as requiring approval, and warn that Worker script source updates are not planned without a reliable content hash.

## Current limits

- Inventory covers account, zones, Worker scripts, KV namespaces, D1 databases, DNS records and zone Worker routes.
- Inventory pagination is bounded; inventories exceeding the configured page limit fail instead of silently truncating.
- Cloudflare account permissions and API response shapes have only mocked tests. No real token was used and no provider API call or mutation was made by this change.
- DNS plan logic is a preview only; it is not a transactional plan executor. DNS duplicate-record semantics, proxy settings, Worker deployments/bindings/secrets, KV/D1 creation, and rollback still need design.
- No write/apply route exists. A future write path must require a displayed plan hash, explicit confirmation, least-privilege token scopes, idempotency, audit, post-change verification and rollback.

## Test checklist before write support

1. Validate inventory endpoints against a dedicated Cloudflare test account with read-only token scope.
2. Test pagination, 401/403/429, malformed responses, rate limits and partial provider failures.
3. Compare planned resources with current inventory and manually verify each diff.
4. Design reversible operations and recovery before enabling any write operation.


## Restricted VLESS Worker session settings

The VLESS WebSocket handler requires four non-secret variables before it will accept sessions:

- PROXY_MAX_DOWNLOAD_BYTES: maximum cumulative download payload bytes forwarded per session.
- PROXY_MAX_SESSION_DURATION_MS: maximum authenticated session lifetime in milliseconds.
- PROXY_MAX_CONCURRENT_SESSIONS: mandatory installation-wide maximum number of active VLESS session leases.
- PROXY_SESSION_LEASE_GRACE_MS: positive cleanup grace added after the maximum session lifetime and bounded initial handshake/setup window before a stale lease stops counting.

All four must be positive base-10 safe integers; duration and grace must fit the platform timer range. Missing or invalid values cause the VLESS route to fail closed with HTTP 503. Account-level `max_connections` is enforced separately: NULL means no account-specific cap and zero denies new sessions. The Worker acquires a D1 lease before dialing upstream and releases it on close; failed/ambiguous release leaves the lease counted until expiry. Do not apply values to the currently observed bootstrap Worker: it is not aligned with the reviewed repository build, and its existing D1 contains data. Select values only for an explicitly isolated disposable environment after reviewing client impact, capacity, and cleanup. No values are set or deployed by this change.
