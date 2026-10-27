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
| Principals | `GET/POST /principals`, `PATCH/DELETE /principals/:id` | Owner/admin policy; password/session revocation |
| Proxy accounts | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id` | Shared expiry/quota rules; audited mutations |
| Subscriptions | `POST /accounts/:id/subscriptions`, `POST /subscriptions/:id/revoke` | Store token hashes only; never return a stored secret |
| Usage | `GET /accounts/:id/usage` | Explicit timezone/day boundary and bounded ranges |
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
