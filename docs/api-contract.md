# API contract — v1 baseline

This contract is the implementation baseline for imoxy.net, not a claim that these operations already exist or match Nova Proxy. Routes are added only with tests and server-side authorization.

## Conventions

- Base path: `/api/v1`.
- JSON requests and responses use UTF-8 and `Cache-Control: no-store` for private or operational data.
- Mutations require authentication, authorization at the domain-service boundary, validation, and an audit event.
- Clients must not implement their own quota, permission, expiry, or provider-write rules.
- IDs are opaque strings. Timestamps are UTC RFC 3339 strings.
- Pagination uses opaque cursors; clients must not assume stable offset pagination.
- Unknown request fields are rejected on mutation endpoints.
- Idempotency keys are required for retried external side effects and supported mutation routes.

## Error envelope

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The request contains invalid fields.",
    "requestId": "opaque-request-id",
    "fields": { "username": "required" }
  }
}
```

The `fields` member is optional. Error messages are safe for clients and must not include secrets, SQL details, provider tokens, or stack traces. Expected codes include `unauthorized`, `forbidden`, `not_found`, `conflict`, `validation_failed`, `rate_limited`, `dependency_unavailable`, and `internal_error`.

## Resource outline

| Resource | Planned endpoints | Security and consistency requirements |
|---|---|---|
| Installation | `GET/PATCH /installation` | Owner/admin only for changes; schema-validated settings |
| Authentication | `POST /auth/bootstrap`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | One-time owner setup; rate-limited login; session token hash persistence; expiry/revocation; no password/token hashes in responses. Service and HTTP routes are implemented; deployment still requires configured D1 and secrets. |
| Principals | `GET/POST /principals`, `PATCH/DELETE /principals/:id` | Owner/admin policy; password/session revocation |
| Proxy accounts | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id`, `POST /accounts/:id/credential/rotate` | Shared expiry/quota rules; audited mutations. Create/rotate returns a raw VLESS UUID credential once; D1 stores only its SHA-256 hash. List/get never returns it. Rotation is owner/admin-only and revokes prior credentials atomically with an audit event. Proxy protocol lookup is a storage foundation, not yet wired to a traffic handler. |
| Subscriptions | `POST/GET /accounts/:id/subscriptions`, `POST /subscriptions/:id/revoke`, public subscription delivery | Domain token lifecycle supports provisional Auto/Base64/Clash rendering, and clean-room URI/Clash generators exist; HTTP management/delivery routes and persistent node configuration are not wired yet. Store token hashes only. |
| Usage | `GET /accounts/:id/usage?date=YYYY-MM-DD` | Read-only, `usage.read` permission, UTC date validation; write accounting remains internal and proxy enforcement is not yet wired |
| Cloudflare | `GET /providers/cloudflare/resources`, preview and confirm routes | Read-first; writes require least privilege, preview hash, explicit confirmation and audit |
| Audit | `GET /audit-events` | Authorized, filtered, bounded retention, secret redaction |
| Capabilities | `GET /capabilities` | Must report implemented features truthfully |

## Shared account input

Account mutations accept only `username`, `status`, `expiresAt`, `quotaBytes`, `dailyQuotaBytes`, `speedLimitKbps`, `maxConnections`, and `notes`. Quotas/limits are non-negative safe integers or `null` (unset). The initial username syntax and timestamp rules live in `src/domain/validation.js`; they are an imoxy implementation baseline pending reference characterization, not a verified Nova constraint.

## Operating modes

- `panel-only`: panel and domain services run without requiring Cloudflare credentials.
- `cloudflare-only`: provider workflows are available without requiring the web panel.
- `combined`: panel and provider workflows use the same domain services and policy.
- Missing provider credentials disable provider operations with a clear dependency error; they must not break local account management or health checks.
