# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current state — 2026-10-27

- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Product goal: independently implement behaviorally compatible features against pinned Nova Proxy 5.0.0 commit `ad2116aa89f8c7db8248f8142c1432900d835eb7`, then add separately approved imoxy differentiators.
- Three target interfaces: web panel, Telegram bot, Android APK. They must share API/domain services and authorization/quota rules.
- Required modes: panel only; Cloudflare resources/settings only; panel + Cloudflare resources/settings.
- Merged PRs #1–#20 include the initial foundation, API/domain/security/persistence work, account/quota/subscription/protocol foundations, read-only Cloudflare inventory/dry-run plans, early web panel, read-only Telegram webhook, Android login/account-list debug client, pinned-reference evidence register and cross-interface contract tests.
- Most recent merged code/test PR: #20, commit `ff0de52785baadc5d87bbfb2ccc2f9256a5cccc4`. Exact PR-head CI passed on `ab06dfc9c76ce39b2817adad425a7902984c9431`, run 40476873922.
- Android debug APK was produced by workflow run 40475130813 as artifact `imoxy-android-debug` (SHA-256 digest recorded by GitHub as `ca898eefefb2dda20f79f799a0d8c18b20b3945d11b5552645e045461dea0912`). It is an unsigned debug artifact, not a production release.
- Current branch in this session: `docs/phase11-13-gates`. Its changes are not merged yet; exact-head CI must be checked after all edits.
- No production deployment, live Cloudflare write, live Telegram bot request or Nova runtime test has occurred.

## Implementation summary

- Worker API: health/capability reporting, authentication/session routes, account CRUD foundations, usage/quota foundations, subscription lifecycle, provisional URI/Clash generators, read-only Cloudflare inventory and dry-run planning.
- Web: same-origin login/session, account list/create, usage summary and Cloudflare inventory/preview; edit/delete, subscription/node UI, audit view, browser E2E and accessibility review remain.
- Telegram: secret-validated webhook and allowlisted read-only `/start`, `/help`, `/status`, `/accounts`; durable account linking, replay/idempotency and mutating workflows remain.
- Android: HTTPS-only API configuration, login, encrypted session token using Android Keystore/AES-GCM, account list/refresh and logout; no device test, account mutations, signing or release provenance.
- Cloudflare: read-only inventory and deterministic dry-run planning only. No apply/delete/write endpoint is enabled.
- Nova parity: no runtime behavior has been verified. Documentation is treated as a source of hypotheses, not runtime proof.

## Latest work — cross-interface and release gates

- Added `test/cross-interface.test.js` comparing API account listing with Telegram read-only output and verifying truthful capability reporting.
- Added `docs/cross-interface-contracts.md`, `docs/release-certification.md`, and `docs/imoxy-improvements.md`.
- Updated `docs/roadmap.md` with evidence-backed Phase 0/1/11/12/13 status and linked the supporting artifacts from README.
- Phase 11 is in progress; only the first API/Telegram contract and capability tests are proven.
- Phase 12 is blocked by legal/license approval, missing reference runtime evidence, real D1 recovery proof, staging/client E2E and release provenance.
- Phase 13 is intentionally not started. Candidate improvements are documented but not implemented before the parity/legal gates.

## Highest-priority next actions

1. Query exact head SHA and CI for `docs/phase11-13-gates`; repair any failures and merge only after review and exact-head CI success.
2. Execute REF-001–REF-032 against an authorized disposable instance of the pinned Nova commit; preserve sanitized input/output/state evidence.
3. Obtain qualified license/distribution review for the observed PolyForm Noncommercial 1.0.0 terms before distribution or monetization.
4. Add real D1 migration, backup/restore, concurrency and failure-injection tests.
5. Add browser E2E/accessibility checks, Android emulator/device smoke tests, Telegram replay protection and durable account linking.
6. Keep Cloudflare write operations disabled until least privilege, preview approval, idempotency and rollback are tested.
7. Only after measured parity and legal review, select and implement a Phase 13 candidate from `docs/imoxy-improvements.md`.

## Mandatory progress reporting

Every user-facing response about this repository ends with an evidence-based schematic report for every roadmap phase 0–13. Use only **Not started**, **In progress**, **Blocked**, or **Complete**; do not claim completion without the relevant exit gate.
