# imoxy-net — HANDOFF

> Living hand-off. Update every session. Re-query the branch head after editing this file because the edit itself creates a new commit.

## Current status (2026-10-27)
- **Repository:** https://github.com/ijoolaie/imoxy-net (private)
- **Merged foundation PR:** [#1](https://github.com/ijoolaie/imoxy-net/pull/1), squash merge commit `2142591abdc863d7f7ab85f36a395fd7a8bc82a1`.
- **Current work branch:** `feat/domain-contract-and-schema`.
- **Branch head before this hand-off edit:** `e13525d5d8062b01982ef85b1bb92efc038aecae`.
- **CI:** PR #1 head `995fd4e7dd941502e9ab84ab9fc6719be10e736e` passed CI (run 40465498032). Main merge commit `2142591abdc863d7f7ab85f36a395fd7a8bc82a1` passed CI (run 40466075513). Feature branch run 40466348656 was still in progress on earlier SHA `1e13c25ef316849830d08ec7bc232b9d5157868d`; later commits include validation and migration fixes and require exact-head CI.
- **Product status:** still a foundation; no behavioral parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit `ad2116aa89f8c7db8248f8142c1432900d835eb7`) before imoxy-specific improvements. Keep the web panel, Telegram bot and Android APK on shared domain services and the same authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Changes in the current feature branch
- Added `migrations/0001_initial.sql`: proposed D1 schema for control-plane principals/sessions, proxy accounts, subscription token hashes, daily usage, installation settings, Cloudflare resource metadata and audit events.
- Added `src/domain/validation.js` and `test/domain-validation.test.js`: shared account input validation with strict field allowlist, username constraints, UTC timestamp validation, non-negative safe integer limits, and tests.
- Added `docs/api-contract.md`: v1 conventions, error envelope, planned resource endpoints, operating modes, and shared authorization requirements.
- Added `docs/reference-scenarios.md`: 28 prioritized black-box scenarios based on documented upstream feature claims. They are hypotheses, not runtime verification.
- Updated parity matrix, acceptance plan, decision log, roadmap and README to link scenarios and reflect actual progress.
- Validation bugs found by test design and fixed: JavaScript date parsing can normalize invalid calendar days, so the validator compares normalized and submitted calendar dates; empty PATCH payloads are rejected. Removed an unnecessary PRAGMA from the initial D1 migration.

## Still missing
- The new code has not yet been confirmed by CI on the current final branch SHA at the time of writing.
- No D1 migration has been executed; no storage adapter or migration/recovery tests exist.
- Authentication, session endpoints, account CRUD API, quota enforcement, subscriptions, protocol generation, Cloudflare adapter, web panel, Telegram bot and Android APK remain unimplemented.
- Reference black-box scenarios have not been run against a live authorized Nova 5.0.0 instance.
- No legal opinion has been obtained about commercial distribution under the observed PolyForm Noncommercial 1.0.0 license.
- No production deployment or live Cloudflare mutation has occurred.

## Next actions
1. Re-query the exact feature branch SHA and CI status after this hand-off commit.
2. Run/review the unit tests and SQL migration in an actual SQLite/D1-compatible test environment; fix any failures before opening/merging the next PR.
3. Continue Phase 1 with runtime evidence for high-priority reference scenarios, while preserving clean-room implementation.
4. Implement the storage adapter and migrations/recovery tests (Phase 4) and then the security/session layer (Phase 3) with fail-closed behavior.
5. Implement account CRUD through shared domain services with persistence, authorization, audit events and quota enforcement before building the three clients.
6. Open a small PR for this slice only after exact-head CI passes; do not merge feature work with unresolved checks.
7. Update this hand-off and the schematic phase report at the end of every repository-work response.

## Mandatory progress reporting
Every user-facing response about repository work ends with a schematic status report for every phase 0–13. Use only evidence-backed statuses and do not claim phase completion without its exit gate.
