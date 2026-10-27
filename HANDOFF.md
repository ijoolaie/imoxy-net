# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PRs #1–#8: repository foundation, API/domain contract and scenario inventory, security primitives, D1 account adapter, account service, auth/session service, HTTP auth/account routes, and quota/usage foundations.
- PR #7 CI passed on head 925fa00520a25da3370faddb18b670ca57ee9554; PR #8 CI passed on head c41814158de5d35a2682dbdcd90db950bdcc3d15.
- Current work branch: test/sqlite-migrations.
- Branch head before this hand-off edit: 88b7f6ee29c20f2179738b1f032f7d2c211f1d0e.
- Current feature work: execute both SQL migrations in Node SQLite with foreign keys and verify constraints, counters, rate-limit windows and cascade behavior. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Work delivered
- Authenticated HTTP routes for bootstrap, login, session inspection/logout, account CRUD and read-only usage summaries.
- Shared password/session, account, authorization and quota services; D1 adapters for principals, sessions, accounts, audit events, rate limits and usage.
- Current branch adds test/schema-migrations.test.js using Node's built-in SQLite module and runs tests with --experimental-sqlite.
- The migration test executes 0001_initial.sql and 0002_auth_rate_limits.sql with foreign keys enabled; verifies table creation, invalid role/quota/FK rejection, additive usage counters, rate-limit window reset, and cascading account deletion while retaining audit history.
- This closes part of the SQLite syntax/schema-validation gap but does not validate Cloudflare D1 deployment/batch semantics.

## Known gaps
- Exact-head CI is not yet confirmed for this branch.
- Cloudflare D1 migrations have not been applied to an actual account/database; D1-specific behavior, production backup/restore, rollback, concurrency and interrupted-write recovery remain unverified.
- Quota evaluation and usage accounting are not wired into a proxy data plane. There are no atomic quota reservations or idempotent usage event IDs, so hard concurrent enforcement is not available.
- Subscription token lifecycle and output formats, proxy protocol/transport generation, Cloudflare workflows, web panel, Telegram bot and Android APK remain unimplemented.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query exact branch SHA and CI after this hand-off edit; resolve all failures before merge.
2. Add D1-specific integration/recovery validation when a Cloudflare test database and scoped credentials are available.
3. Implement idempotent usage-event ingestion and atomic reservation semantics before claiming hard quota enforcement.
4. Implement subscription token lifecycle and formats/protocol generation against evidence from the pinned reference.
5. Build Cloudflare adapter read-only/mock-first, then web panel, Telegram bot and Android client over the shared core.
6. Execute parity scenarios, security/reliability tests and controlled release gates.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
