# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PR #1: repository foundation and CI.
- Merged PR #2: API/domain contract, D1 schema draft, account validation and 28 reference scenarios.
- Merged PR #3: password/session crypto and threat model.
- Merged PR #4: D1 account storage adapter and mocked tests.
- Merged PR #5: authorization-gated account service.
- Merged PR #6: auth/session service, one-time owner bootstrap, persistent rate limits and initial RBAC; CI passed on exact final head 5d68d1ec1662a026ed2b8d63b8dde2a4324af709.
- Current work branch: feat/http-auth-routes.
- Branch head before this hand-off edit: a432b7648d2bd3513bfb923350d4ae47a1c5246b.
- Current feature work: HTTP auth/session and account CRUD routes, cookie/origin protections, route tests, D1 setup docs. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Current branch work
- Added src/http/api.js and routed worker.js through it.
- Routes: GET /health, GET /api/v1/capabilities, POST /api/v1/auth/bootstrap, POST /api/v1/auth/login, GET /api/v1/auth/me, POST /api/v1/auth/logout, and account list/create/read/update/delete routes.
- Browser login uses Secure, HttpOnly, SameSite=Strict __Host cookie and does not return the raw token in JSON. Requests without Origin receive a bearer token for native/server clients. Cookie-authenticated mutations require a same-origin Origin header.
- Login/bootstrap rate limits derive HMAC-SHA-256 hashes for both request IP and normalized username; raw IP/username keys are not persisted.
- JSON parsing enforces content type and a 16 KiB body limit. API responses set no-store, nosniff, referrer and restrictive CSP headers and use structured safe error envelopes.
- Account routes call the shared account service, which requires authentication and uses the initial RBAC policy before reaching persistence.
- Updated D1 setup docs with binding and secret requirements. No deployment or migration has been run.

## Known gaps
- Exact-head CI has not yet been confirmed for this branch.
- D1 migrations, session behavior and account persistence are tested with mocks only; actual D1 integration, migration execution, concurrency, backup/restore and rollback are unverified.
- Auth bootstrap requires careful production exposure policy; remove BOOTSTRAP_OWNER_SECRET after initial setup. The route is protected by a 32+ character secret and HMAC rate limits, but real abuse tests are still required.
- No quota enforcement/usage accounting, subscriptions, proxy protocol/transport generation, Cloudflare resource workflow, web panel, Telegram bot or Android APK.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query exact feature branch SHA and CI after this hand-off edit; fix failures before merge.
2. Review all auth routes, particularly browser/native transport behavior, rate limiting, origin checks, error handling and bootstrap lifecycle.
3. Add real D1 integration tests for migrations, constraints, batch/audit behavior, rate-limit counters, session revocation and backup/restore.
4. Implement quota/usage services and subscription token lifecycle; then independently implement required proxy protocol/transport output.
5. Characterize the pinned Nova runtime and execute high-priority black-box scenarios; update parity matrix only with reproducible evidence.
6. Build Cloudflare integration read-only/mock-first with previews, explicit confirmation, least privilege and rollback.
7. Build web, Telegram and Android interfaces only over the shared API/domain services.
8. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
