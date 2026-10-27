# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private)
- Merged PR #1: repository foundation; main CI passed.
- Merged PR #2: API/domain contract, initial D1 schema, validation and 28 reference scenarios; main CI passed.
- Merged PR #3: Web Crypto password/session primitives and threat model; exact PR-head CI passed.
- Merged PR #4: D1 prepared-statement account storage adapter with mocked tests; exact PR-head CI run 40466989987 passed.
- Current work branch: feat/account-service.
- Branch head before this hand-off edit: 49c02eb60100439f4be62a44e39ce4ef0dc20932.
- Current feature work: authorization-gated account domain service and unit tests; exact-head CI is pending.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Work delivered
- Repository foundation and CI (PR #1).
- API/domain contract, initial D1 schema, account input validation/tests and 28 prioritized reference scenarios (PR #2).
- PBKDF2-HMAC-SHA-256 password hashing, fail-closed verification, random session bearer generation and SHA-256 token hashing, with tests and initial threat model (PR #3).
- Parameterized D1 account storage adapter with bounded ID-cursor listing and batched audit inserts (PR #4).
- Current branch adds src/domain/account-service.js. It requires an injected authorization policy, validates account inputs, sets server-controlled IDs/timestamps/defaults, and sends audit metadata with create/update/delete operations.
- Added test/account-service.test.js for fail-closed policy dependency, denied requests, validation, audit metadata, missing resources and update behavior.
- Updated architecture, acceptance plan and roadmap to track Phase 5 as in progress.

## Known gaps
- Current branch CI has not yet been confirmed on the exact final SHA.
- Account service tests use a fake store. Real D1 migration execution, schema constraints, transaction/batch semantics, concurrency, backup/restore and rollback remain unverified.
- Authentication/session endpoints, session expiry/revocation, secure cookies, CSRF/origin checks, rate limiting, bootstrap owner and concrete role policy are not implemented.
- Account CRUD HTTP routes are not wired; quota enforcement, usage accounting, subscription generation and proxy protocol rendering remain unimplemented.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Cloudflare adapter, web panel, Telegram bot and Android APK remain unimplemented.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query the exact feature branch SHA and CI run after this hand-off edit.
2. Fix any test findings; do not merge until CI passes on the exact latest PR head.
3. Complete authentication/session lifecycle and route-level authorization, with rate limiting and CSRF/origin controls before exposing protected routes.
4. Add actual D1 integration tests and schema/migration validation; exercise persistence and recovery.
5. Wire account routes to the domain service only after authentication is available; implement quotas/usage and subscription behavior.
6. Execute high-priority black-box scenarios against an authorized reference runtime and update parity evidence.
7. Keep Cloudflare read-only/mock-first; live writes require preview, explicit confirmation, least privilege and tested recovery.
8. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
