# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PR #1: repository foundation and CI.
- Merged PR #2: API/domain contract, D1 schema draft, validation and 28 reference scenarios.
- Merged PR #3: password/session crypto and threat model.
- Merged PR #4: D1 account storage adapter and mocked tests.
- Merged PR #5: authorization-gated account service.
- Merged PR #6: auth/session service, one-time owner bootstrap, persistent rate limits and initial RBAC.
- Merged PR #7: HTTP auth/session and account CRUD routes with secure cookie/origin controls; CI run 40468360634 passed with 47 tests.
- Current work branch: feat/quota-usage.
- Branch head before this hand-off edit: ab3529e259f95de342a5e3e8f997c57150b64780.
- Current feature work: quota policy service, D1 usage counters and authorized usage-summary route. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Current branch work
- Added src/domain/quota-service.js to evaluate active/expired accounts, total and daily quotas, projected byte additions, and measured usage deltas.
- Added D1 usage-summary queries and atomic per-account/per-UTC-day usage upserts.
- Added GET /api/v1/accounts/:id/usage?date=YYYY-MM-DD with session authentication, usage.read permission, account existence check and strict UTC calendar-date validation.
- Added quota service and D1 usage tests for exact-limit/over-limit boundaries, unlimited/zero quotas, expired/disabled accounts, UTC date storage, invalid deltas and impossible calendar dates.
- Added docs/quota-policy.md. It explicitly says this is a provisional imoxy baseline, not verified Nova behavior, and not hard data-plane enforcement.
- Updated roadmap, acceptance plan, API contract, decision log and README.

## Known gaps
- Exact-head CI is not yet confirmed for this branch.
- D1 migration/schema and batch semantics are still only mock-tested; no real D1 migration, concurrency, backup/restore or rollback test has run.
- Quota service is not integrated into a proxy data plane. No atomic quota reservations or idempotent usage event IDs exist, so hard concurrent enforcement is not available.
- Subscription generation, protocol/transport rendering, Cloudflare workflows, web panel, Telegram bot and Android APK remain unimplemented.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query exact feature branch SHA and CI after this hand-off edit; fix any failures before merge.
2. Add real D1 migration and integration tests, then backup/restore and concurrency checks.
3. Add idempotent usage-event ingestion and atomic reservation semantics before claiming hard quota enforcement.
4. Characterize reference quota/subscription/protocol behavior and implement those formats independently.
5. Build the Cloudflare adapter read-only/mock-first, then the web panel, Telegram bot and Android client on shared services.
6. Execute parity scenarios, security/reliability tests and controlled release gates.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
