# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private)
- Merged PR #1: https://github.com/ijoolaie/imoxy-net/pull/1 — foundation; main CI passed.
- Merged PR #2: https://github.com/ijoolaie/imoxy-net/pull/2 — API/domain contract, initial D1 schema, validation and 28 reference scenarios; main CI passed on merge commit 2df44d025dddc90ca6e03c9da777b743d5c547c0.
- Merged PR #3: https://github.com/ijoolaie/imoxy-net/pull/3 — Web Crypto password/session primitives and threat model; merge commit e9841b82027760b299ef1fd672133d5edb2cbb3b, CI passed on exact PR head 9fc666c62031b25cb179ab15c1c3f57cdaaa55cc.
- Current work branch: feat/storage-adapter.
- Branch head before this hand-off edit: db28f8168628e73acecc6c1f05425c4255b50448.
- Current feature work: D1 prepared-statement account adapter and mocked adapter tests; exact-head CI has not yet been checked.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. The web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Work delivered
- Foundation and CI (PR #1).
- API/domain contract, initial D1 schema, shared account validation and tests, and 28 prioritized reference scenarios (PR #2).
- PBKDF2-HMAC-SHA-256 password hashing, fail-closed verification, random session bearer generation and SHA-256 token hashing, with tests and initial threat model (PR #3).
- Current branch adds src/storage/d1-store.js with parameterized account reads, bounded ID-cursor listing, create/update/delete, strict update-field allowlist, and D1 batch coupling of mutations with audit inserts.
- Added test/d1-store.test.js for bound parameters, mapping, page limits/cursors, audit batching, unknown fields, and invalid audit metadata.
- Updated roadmap, acceptance plan, decision log and README to mark Phase 4 in progress and distinguish mocked adapter tests from real D1 integration.

## Known gaps
- Current feature branch CI is not yet verified on the exact final SHA.
- D1 schema has not been applied to an actual D1 database; mock tests do not prove SQLite syntax, D1 batch semantics, concurrency, backup/restore or rollback.
- No HTTP login/logout/session endpoints, cookie settings, CSRF/origin checks, rate limits, bootstrap owner, role enforcement or session expiry/revocation enforcement.
- No account CRUD HTTP routes or domain service that applies authorization and quota rules.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Subscription generation, proxy protocol rendering, Cloudflare adapter, web panel, Telegram bot and Android APK remain unimplemented.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Re-query exact branch SHA and CI; fix all test failures before merge.
2. Add real SQLite/D1 migration validation and test schema constraints; verify batch semantics and interrupted-write behavior.
3. Build the account domain service and protected routes with session validation, role checks, audit events, quotas and idempotency.
4. Add login/session lifecycle routes only after cookie/CSRF/origin controls, rate limiting, and bootstrap-owner setup are implemented.
5. Execute high-priority black-box scenarios against an authorized reference runtime and update the parity matrix with evidence.
6. Continue provider integration mock-first; live writes require preview, explicit confirmation, least privilege and tested recovery.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
