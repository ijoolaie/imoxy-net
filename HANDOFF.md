# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PR #1: repository foundation; CI passed.
- Merged PR #2: API/domain contract, initial D1 schema, account validation and 28 reference scenarios; CI passed.
- Merged PR #3: password/session crypto and threat model; CI passed.
- Merged PR #4: D1 account storage adapter with mocked tests; exact-head CI passed.
- Merged PR #5: authorization-gated account service; exact-head CI passed.
- Current work branch: feat/auth-service.
- Branch head before this hand-off edit: 51dc2ea960e038b7cb2a342ac4f9622018f24e61.
- Current feature work: auth/session service, D1 principal/session/rate-limit persistence and tests. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Current branch work
- Added migration 0002_auth_rate_limits.sql for persistent fixed-window authentication attempt counts keyed by opaque hashes.
- Extended the D1 adapter with principal lookup, one-time owner insertion, session creation/lookup/touch/revocation, and atomic rate-limit upsert/clear operations. Mutations are batched with audit events.
- Added src/security/auth-service.js with one-time owner bootstrap using a configured 32+ character secret, rate-limited login, uniform unauthorized responses, token-hash-only session persistence, expiry/revocation checks, logout, and an initial RBAC policy.
- Added tests for owner bootstrap, invalid shared secrets, login, rate limiting, session expiry/revocation, and role permissions, plus mocked D1 auth-store tests.
- Updated security model, API contract, acceptance plan and roadmap. Authentication is still service-layer only; no HTTP auth routes are exposed.

## Known gaps
- Exact-head CI is not yet confirmed for this branch.
- The D1 migration and SQL statements have only mocked adapter coverage; no actual D1/SQLite integration, backup/restore, concurrency or interrupted-write test has run.
- The HTTP layer does not yet derive the opaque rate-limit key from request identity or secret material. Login/logout routes, request token extraction, secure cookie handling, CSRF/origin validation and security headers are not wired.
- Auth bootstrap needs route-level origin/rate controls before it is exposed.
- Account CRUD HTTP routes, quotas/usage enforcement, subscriptions, protocol rendering, Cloudflare workflows, web panel, Telegram bot and Android APK remain unimplemented.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query the exact feature branch SHA and CI after this hand-off edit.
2. Fix all CI/test findings; merge only after exact-head CI passes and the diff is reviewed.
3. Add route-level origin/CSRF protections, derive rate-limit keys from request context with server-side secret material, and wire login/bootstrap/logout/me routes.
4. Wire account HTTP routes through the auth service and account service; never bypass the shared authorization policy.
5. Add actual D1 migration/integration tests and recovery tests.
6. Implement quotas, usage accounting and subscription/protocol generation only after reference scenarios are characterized.
7. Keep Cloudflare read-only/mock-first; live writes require preview, explicit confirmation, least privilege and tested recovery.
8. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
