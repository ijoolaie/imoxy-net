# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current state — 2026-10-27

- PR #32 rate-limit cleanup fix merged as `3a7f6e3417bac0692c0ef3da9064ed8d09b64a9a`; exact-head PR CI passed on `94688a1251987566b0b35ea6c43a31c8d4ac3056` (run 40502142149) and post-merge main CI passed on `3a7f6e3417bac0692c0ef3da9064ed8d09b64a9a` (run 40502210626). The regression test verifies successful login clears both IP and normalized-username rate-limit counters. This is an imoxy correctness fix, not Nova parity evidence.

- Repository: https://github.com/ijoolaie/imoxy-net (public as of 2026-11-02). Treat repository source and commit history as public; no secret scan has been performed as part of this update.
- Product target: independently implement behaviorally compatible behavior against Nova Proxy 5.0.0, pinned commit `ad2116aa89f8c7db8248f8142c1432900d835eb7`, then add separately approved imoxy improvements.
- Interfaces: web panel, Telegram bot, Android APK. Shared API/domain services and authorization/quota policy are required.
- Required modes: panel only; Cloudflare resources/settings only; panel + Cloudflare resources/settings.
- PR #21 release/cross-interface gate docs merged as `0fcf083af6a56cb11e2f8ce96f13f14113836194`; exact-head CI passed on `2bbc73cf9929b1165e1d0b9a046ab947e80b9cab` (run 40477158901).
- PR #22 Telegram replay protection merged as `06abb6208b5abedce6fb629d95f3428ceeb50e34`; exact-head CI passed on `b06239c1cc3e89e51b59aa8ea837745977f0302e` (run 40477478274 pull_request; 40477446750 push).
- PR #24 stale-claim recovery merged as `0a83419fd2d4a85c0f755f96d7a145fb7832a815`; exact-head CI passed on `fd9d54c8cf666dc2955348cdd6a7cb39edea0bf7` (run 40477847177). A still-processing Telegram update may be reclaimed after two minutes; processed IDs are retained for seven-day dedupe.
- PR #23 operations/handoff update merged as `41dee349eff50f8c15ced05bd8d568126f863f33`; exact-head CI passed on `4140605cd90db5ecf5cc53c655ee22318c6304b8` (run 40477678955).
- PR #25 Phase 9 roadmap/handoff refresh merged as `ba0dc8d8a5ed4e7a45d7d720e72d6bd94feeaca9`; exact-head CI passed on `52d838e77ffdcaf128d12f50cce6f16bde1efa50` (run 40477982801).
- PR #20 cross-interface contract tests merged as `ff0de52785baadc5d87bbfb2ccc2f9256a5cccc4`; exact-head CI passed on `ab06dfc9c76ce39b2817adad425a7902984c9431` (run 40476873922).
- Android debug APK artifact from run 40475130813: `imoxy-android-debug`; GitHub reports SHA-256 digest `ca898eefefb2dda20f79f799a0d8c18b20b3945d11b5552645e045461dea0912`. Unsigned debug artifact only, not a production release.
- PR #27 Telegram private-chat restriction merged as `88aa54fb00fbc0ba8fe91db45773bbb4bfce5f38`; exact-head CI passed on `e625de2152ab201a6788e0916df197edb3042df5` (pull_request run 40495044071 and push run 40495036669). A regression test verifies an allowlisted user cannot run `/accounts` in a group, and ignored group updates create no replay claim.
- PR #28 hand-off/roadmap refresh merged as `7e2c414697063fdf404a13bb43ab86e18435619a`; main CI passed on that exact commit (run 40495242380). The functional security fix from PR #27 passed main CI on `88aa54fb00fbc0ba8fe91db45773bbb4bfce5f38` (run 40495094674).
- PR #29 post-merge CI hand-off correction merged as `12cfb9f7e8c3f01a07346165bfdeb28c684893da`; main CI passed on that exact commit (run 40495393858). No open PRs were present at the latest repository check.
- PR #30 documentation alignment merged as `e84ebd34e592a4f8042c603da12f37273879e7fe`; exact-head CI passed on `1e6894ebc71d2a6bcef8580238c2060c666e486c` (run 40497943180) and post-merge main CI passed on `e84ebd34e592a4f8042c603da12f37273879e7fe` (run 40498010237).
- Latest verified functional main commit: `96f5955f7a2dc7cbc8517b70399ecdc2b48299c3`; main CI run 40503173647 passed. Handoff documentation commit `13d7a62aeceb80fd64715030079cbeba1b5d05c6` also passed CI run 40503227987. This handoff update itself creates a newer documentation-only commit and requires its own CI verification.
- No production deployment, real Cloudflare write, live Telegram API call, or Nova runtime comparison has occurred.

## Implementation summary

- Worker API: health/capability reporting, authentication/session routes, account CRUD foundations, quota/usage foundations, subscription lifecycle, provisional protocol/Clash generators, read-only Cloudflare inventory and deterministic dry-run plans.
- Web panel: same-origin login/session, account list/create, usage summary, Cloudflare inventory/preview. Editing/deletion, subscriptions/nodes UI, audit UI, browser E2E and accessibility review remain.
- Telegram: secret-validated allowlisted read-only `/start`, `/help`, `/status`, `/accounts`; private-chat-only command handling; D1 update-ID deduplication, two-minute stale-claim recovery, seven-day cleanup and retry claim release on delivery failure. Group/channel updates are ignored before a replay claim or outbound message. Durable account linking, real D1 tests, and full workflows remain.
- Android: HTTPS-only API login, account list/refresh/logout and Android Keystore AES-GCM session storage; debug APK CI passes, but device install, E2E, signing and provenance remain.
- Cloudflare: read-only inventory and dry-run planning only; no apply/delete/write route.
- Reference parity: no runtime behavior has been verified. Documentation claims are hypotheses, not black-box proof.

## Phase 11–13

- Phase 11 is in progress: initial API/Telegram account list contract tests pass; full web/Android E2E, failure injection, SLOs and cross-interface mutation parity remain.
- Phase 12 is blocked: no legal/distribution approval, reference runtime evidence, real D1 backup/restore proof, staging deployment or production release artifact.
- Phase 13 is not started: candidates are documented in `docs/imoxy-improvements.md`; implementation remains gated until reference parity and legal review are complete.

## Next actions

1. Obtain an authorized disposable instance of pinned Nova Proxy 5.0.0 and qualified license/distribution review; until then REF-001–REF-032 cannot be black-box verified and release remains blocked.
2. Add real Cloudflare D1 migration, backup/restore, concurrency and failure-injection tests; SQLite tests are not a substitute for D1 validation.
3. Add browser E2E/accessibility checks, Android emulator/device tests, secure Telegram account linking and real webhook validation when credentials and a safe test environment are available.
4. Keep Cloudflare writes disabled until least privilege, preview approval, idempotency and rollback are tested.
5. Implement Phase 13 candidates only after parity and legal gates pass.

## Mandatory progress reporting

Every user-facing response about this repository ends with an evidence-based schematic report for every roadmap phase 0–13. Use only **Not started**, **In progress**, **Blocked**, or **Complete**. Never claim completion without the exit gate.


- PR #33 quota overflow guard merged as `96f5955f7a2dc7cbc8517b70399ecdc2b48299c3`; exact-head PR CI passed on `f8795de34b2a717623a529cac0f277f915546655` (run 40503117630). The regression test verifies combined upload/download deltas outside the safe-integer range are rejected before storage. Post-merge main CI passed on `96f5955f7a2dc7cbc8517b70399ecdc2b48299c3` (run 40503173647); `npm run verify` also passed on handoff commit `13d7a62aeceb80fd64715030079cbeba1b5d05c6` (run 40503227987). This is not Nova parity evidence.


## Latest work session — 2026-10-27 (quota storage integrity)

- Starting main state: `9cbad7d5c2a3d5555ef1a6d7f64a90f40fe69a5f`; no open PRs observed at session start.
- Objective: continue the quota accounting investigation, strengthen D1 daily usage counter integrity, and update progress evidence.
- Branch: `fix/quota-usage-counter-overflow`.
- Changed `src/storage/d1-store.js`: validate `uploadBytes + downloadBytes` as a safe integer; make conflict updates conditional on upload, download, request-count and combined daily bytes remaining within `Number.MAX_SAFE_INTEGER`; treat a zero-change result as a range error.
- Changed `test/d1-store.test.js`: assert the guarded SQL contract, reject an overflowing combined delta before storage, and cover a zero-change/range-error result.
- Updated `docs/parity-matrix.md`, `docs/acceptance-test-plan.md`, `docs/decision-log.md`, `docs/reference-baseline.md`, `docs/quota-policy.md`, and `docs/roadmap.md` to distinguish the guard from idempotency and reference parity.
- Verification at hand-off edit time: source and tests have been committed to this feature branch through GitHub; CI for this new branch has not yet been observed. Do not call this verified until PR-head CI completes.
- Important limitation: no stable usage-event ID exists in the current reporting contract. Retried reports can still double-count; do not fabricate idempotency using account/date/delta. The conditional update protects one daily row only; lifetime aggregation, cross-request quota reservation, proxy data-plane integration, and real D1 behavior remain open.
- Follow-up completion: PR #34 was reviewed and merged as `16afbb31ec368ae54572d04bc99cdd5b9b6729de`; exact-head CI run `40504545607` and post-merge main CI run `40504630349` both passed. PR #35 updated this hand-off with those results; its exact-head CI run `40504766511` passed and its post-merge main CI run `40504841576` passed on `038ca4523faef1268a088e2266001540afeedcee`.
- Next technical design: define stable usage-event identity at the proxy/data-plane boundary, add a unique event ledger and atomic reservation semantics, and test against real D1 concurrency/replay behavior. Do not claim hard quota enforcement before those gates pass.


## Verified follow-up — PR #34 (2026-10-27)

- PR #34 `fix(quota): guard D1 usage counter overflow` merged: https://github.com/ijoolaie/imoxy-net/pull/34.
- Exact PR-head commit `ec333ec0551c7a43636e953014d4e75cedd8266a`; CI run `40504545607` completed **success**. The `npm run verify` job passed.
- Merge commit on `main`: `16afbb31ec368ae54572d04bc99cdd5b9b6729de`; post-merge main CI run `40504630349` completed **success**.
- The branch diff was reviewed before merge; 9 files changed (D1 adapter, adapter tests, quota policy, acceptance plan, parity matrix, decision log, reference baseline, roadmap, hand-off).
- This is verified repository CI only. No real Cloudflare D1 integration/concurrency test, deployment, proxy data-plane enforcement, usage-event idempotency, or Nova runtime comparison was performed.
- Next step: design a stable usage-event ID at the future proxy/data-plane boundary, persist a unique usage-event ledger, then implement and test atomic reservation/idempotency against real D1. Do not derive IDs from account/date/delta because separate valid reports may share those values.


## Latest work session — 2026-10-27 (schema-level quota counter guard)

- Objective: add database-layer defense-in-depth so direct writers cannot bypass the daily safe-integer limits enforced by the D1 adapter.
- Starting main SHA: `94baa3670ecc3550815708ae8a4d08498682752d`; no open PRs were present at the start.
- Branch: `fix/quota-schema-safe-integer-guards`.
- Added migration `migrations/0004_usage_daily_safe_integer_guards.sql` with BEFORE INSERT and BEFORE UPDATE triggers. Triggers reject any daily upload/download/request counter above `Number.MAX_SAFE_INTEGER` and any combined daily upload-plus-download total above the same limit.
- Updated `test/schema-migrations.test.js` to apply migration 0004 and assert direct unsafe inserts and updates are rejected; the update test confirms the prior row remains unchanged.
- Updated quota policy, acceptance plan, decision log, reference baseline and roadmap to separate schema-level integrity from Nova parity, idempotency, lifetime aggregate overflow and atomic reservation.
- Initial PR-head CI run `40560943651` failed only in the new test's `deepStrictEqual`: Node SQLite returns a null-prototype row object, though all three values were correct. Normalized the row with object spread in commit `2dc888bc70a003a2db6b451ac59f57e71a5ebd75`; corrected PR-head CI run `40561139654` passed on head `ca1a49f35ff97960cba606c1d2e51d970d6a2b06`.
- Limits: these are SQLite migration tests, not proof of Cloudflare D1 trigger compatibility. No deployment, live D1 write, proxy traffic integration, or Nova runtime comparison performed.
- Next step: inspect the complete PR diff, require exact-head CI success before merging, then verify post-merge main CI and update this handoff with run IDs. Afterward prioritize lifetime aggregate behavior and stable usage-event identity/atomic reservation design.


## Verified follow-up — PR #37 (2026-10-27)

- PR #37 `fix(quota): enforce safe daily counters in schema` merged: https://github.com/ijoolaie/imoxy-net/pull/37.
- The first PR CI run `40560943651` failed due to a test-only null-prototype object assertion. The failure was inspected from logs, fixed by normalizing the SQLite row, and documented before merge.
- Corrected-head CI run `40561139654` passed on `ca1a49f35ff97960cba606c1d2e51d970d6a2b06` (`npm run verify` succeeded).
- Merge commit: `7ba029105c30cac33650aa2ca21eaf5c4e28afa9`; post-merge main CI run `40561215655` passed.
- Migration 0004 triggers are covered by SQLite CI only. Real Cloudflare D1 migration/trigger behavior, lifetime aggregate overflow, idempotent event reporting, atomic quota reservation, and Nova runtime parity remain unverified.
- Next: design usage-event identity and atomic reservation at the future proxy/data-plane boundary; first add repeatable reference scenarios and use a disposable D1 integration environment before claiming hard quota enforcement.


## Handoff verification — PR #38 (2026-10-27)

- PR #38 updated this handoff with PR #37's corrected-head and post-merge CI evidence: https://github.com/ijoolaie/imoxy-net/pull/38.
- PR #38 exact-head CI run `40561334546` passed on `b7dec228bc26e304d20f3ab03181cdec09ab8c6f`.
- PR #38 merge commit: `cbf7cb3e4da125c878d4fcb385ab0d09645dea8a`; post-merge main CI run `40561414404` passed on that exact commit.
- Repository check after merge: no open PRs.
- Current verified main SHA before this handoff-only follow-up: `cbf7cb3e4da125c878d4fcb385ab0d09645dea8a`.


## Quota accounting follow-up — 2026-10-28

- Branch `fix/lifetime-usage-aggregate-overflow` adds a two-pass `getUsageSummary` guard. It first checks approximate REAL aggregates so SQLite integer `SUM` cannot overflow before the service detects a cross-day lifetime total above `Number.MAX_SAFE_INTEGER`; it then runs exact integer sums only when the preflight bounds are safe.
- Regression coverage added for the D1-store query sequence, fail-closed behavior on unsafe approximate totals, and a real in-memory SQLite case with two individually safe daily rows whose lifetime total exceeds the safe-integer limit.
- This is only an aggregate-overflow guard. It does not implement event IDs/idempotency, atomic quota reservations, proxy traffic-path enforcement, or actual Cloudflare D1 integration. Do not claim hard quota enforcement.
- PR #40 merged as `5e560dd2071c3a649dec70e91d26f4983e371b60`; exact-head PR CI run `40630649047` passed on `cc8a7f2623050fef19d39d2696ac22bb84c1342d`, and post-merge main CI run `40630701788` passed on `5e560dd2071c3a649dec70e91d26f4983e371b60`. This hand-off evidence update is documentation-only and must pass its own exact-head and post-merge CI.

## New-chat resume checkpoint — 2026-10-28 07:36 (+03:30)

### Verified repository state at checkpoint

- Repository: `ijoolaie/imoxy-net`; default branch: `main`.
- Main HEAD before this handoff update: `7cfa9d1afaf57b76c3d122dab3afbe36c64d141f`.
- Latest main CI: run `40630803556`, commit `7cfa9d1afaf57b76c3d122dab3afbe36c64d141f`, conclusion **success**.
- Latest merged implementation PR: #40, lifetime usage aggregate overflow guard; merge commit `5e560dd2071c3a649dec70e91d26f4983e371b60`. Exact-head CI run `40630649047` passed on `cc8a7f2623050fef19d39d2696ac22bb84c1342d`; post-merge main CI run `40630701788` passed on the merge commit.
- Latest handoff evidence commit before this update: `7cfa9d1afaf57b76c3d122dab3afbe36c64d141f`; main CI run `40630803556` passed on that exact SHA.
- Open PR check at checkpoint: none.
- Latest code change adds a two-pass lifetime usage summary overflow guard. It protects against SQLite integer `SUM` overflow by preflighting approximate REAL totals and only then running exact sums when within the safe-integer range. Tests cover query sequence, fail-closed behavior and cross-day aggregate overflow in in-memory SQLite.
- This is repository CI/SQLite evidence only; Cloudflare D1 behavior, concurrency and migration compatibility are **not** proven. No deployment, live D1 mutation, proxy data-plane quota enforcement, or Nova runtime comparison has occurred.

### Current project intent and hard constraints

- First objective remains an independent behavioral/technical reconstruction of Nova Proxy 5.0.0, pinned to `ad2116aa89f8c7db8248f8142c1432900d835eb7`; do not claim parity without repeatable black-box evidence.
- Implement independently; do not copy Nova source, protected assets, minified worker code, or branding. The version-specific license/distribution review is a release blocker.
- Target clients: web panel, Telegram bot and Android APK over shared API/domain services. Preserve all operating modes: panel only; Cloudflare resources/settings only; combined panel + Cloudflare.
- Cloudflare functionality remains read-only inventory/dry-run only; no production deployment or real write without explicit approval, least privilege, preview, audit, and tested rollback.
- Never claim hard quota enforcement while stable event IDs/idempotency, atomic quota reservation, and proxy data-plane integration are missing.

### Next concrete work — resume here

1. Re-read `AGENTS.md`, this file, `docs/roadmap.md`, `docs/quota-policy.md`, `docs/parity-matrix.md`, `docs/acceptance-test-plan.md`, `docs/decision-log.md`, and `docs/reference-baseline.md` from current `main` before changing code.
2. Inspect `src/domain/quota-service.js`, `src/storage/d1-store.js`, the quota/D1/schema tests, and migrations to understand the current lifetime aggregate guard and report/write path.
3. Design the next quota-accounting slice around a **caller-provided stable usage-event ID** at the future proxy/data-plane boundary. Do not derive IDs from account/date/delta; separate legitimate events can share those values.
4. Before implementing idempotency or reservations, define and document atomicity semantics for event-ledger insertion + aggregate update + reservation, including duplicate/retry behavior, concurrent requests, safe-integer boundaries, failure rollback, and the exact Cloudflare D1 primitives to validate.
5. If no real/disposable D1 environment is available, implement only well-scoped contract/design tests and explicitly mark D1 concurrency/compatibility as blocked; do not disguise SQLite tests as D1 proof.
6. Use a focused feature branch and PR. Review the complete diff; require CI success on the exact PR head before merge; after merge, verify main CI on the merge commit. Update this handoff with exact run IDs/SHA and verify the handoff update's own CI. Do not deploy or perform live Cloudflare writes.
7. Continue to keep `docs/roadmap.md` and parity/acceptance/decision/reference docs consistent with evidence. Phase 12 remains blocked and Phase 13 remains not started.

### Copy/paste starter for the next chat

> Continue work on private GitHub repository `ijoolaie/imoxy-net`. First read `AGENTS.md` and `HANDOFF.md` from current `main`, then verify the current branch, open PRs and latest CI before making changes. Resume at quota accounting: inspect the lifetime aggregate overflow guard and design stable usage-event identity, idempotent reporting, and atomic quota reservation. Work hands-on through a focused branch/PR; inspect diffs, require exact-head CI, merge only after checks pass, verify post-merge CI, and update `HANDOFF.md` with evidence. Do not claim Nova parity, hard quota enforcement, real D1 validation, or deployment without proof. End every repository-work response with roadmap Phase 0–13 statuses.



## Latest work session — 2026-10-28 (usage-event atomicity design)

- Objective: resume from the quota-accounting checkpoint and define stable usage-event identity, idempotent reporting, and atomic reservation semantics before implementation.
- Branch: `docs/usage-event-atomicity-design` (documentation-only slice).
- Added `docs/usage-event-atomicity-design.md`: stable producer-scoped caller-provided event ID; same-ID/same-payload replay no-op; same-ID/different-payload conflict; event ledger + daily aggregate atomicity; safe-integer/failure semantics; distinct reservation lifecycle; and required disposable real-D1 integration gates.
- Updated `docs/decision-log.md`, `docs/quota-policy.md`, `docs/acceptance-test-plan.md`, and `docs/roadmap.md` to align the decision, limitations, and acceptance requirements. No application code, migration, ledger, reservation, or API behavior was changed.
- Public documentation check: Cloudflare D1 Worker API page (last updated 2026-06-22) describes `db.batch([...])` as batched SQL transactions that roll back the sequence if a statement fails. This is an external documentation finding, not runtime verification; the exact design must still be tested on an isolated disposable D1 database.
- Verification status: no local checkout/runtime was available through the GitHub file connector; no test command has been run in this session. PR-head CI and diff review are pending. Do not claim CI success until observed for the exact head SHA.
- Open PR search returned no open PRs at the checkpoint. Current branch changes are documentation-only and must be reviewed before merge.
- Important gaps remain unchanged: stable event IDs, usage ledger, replay deduplication, atomic quota reservation, proxy data-plane enforcement, real D1 migration/concurrency/backup-restore validation, authorized Nova runtime comparison, and version-specific license/distribution review are not complete.
- PR #43 is open: https://github.com/ijoolaie/imoxy-net/pull/43. Current head at this checkpoint is `e3a54ff8a410c3a23e0716f22efdfbf809e54a38`; seven commits, six documentation files changed. The complete patch was inspected. A follow-up review clarified the event `claimed` → `applied` transition so already-applied duplicate IDs cannot re-trigger aggregate updates.
- CI state at checkpoint: `fetch_commit_workflow_runs` returned no pull-request workflow runs for the current head and combined commit status returned no statuses. Treat this as **CI not observed**, not success. Do not merge while required exact-head CI is unconfirmed. PR metadata reports `mergeable: false`; recheck after GitHub recalculates mergeability.
- Next: determine why PR CI/status has not appeared or wait for GitHub to populate it; do not merge without exact-head verification. If checks pass, recheck mergeability and review the final diff, then merge, verify post-merge main CI, and update this hand-off with exact run IDs/SHA. The hand-off update itself requires its own CI verification.


## Follow-up — PR #43 merged (2026-10-28)

- PR #43: https://github.com/ijoolaie/imoxy-net/pull/43 was squash-merged after the complete six-file patch was reviewed and GitHub reported the branch mergeable.
- Exact PR head: `c22f6b6a4610426b9d4261d0f02dc82f5063a04d`. CI run #433, workflow run ID `40631341345`, completed successfully for that exact head: https://github.com/ijoolaie/imoxy-net/actions/runs/40631341345.
- Merge commit: `1ded95232255aae591508e46f86d095c2be8283f`.
- Scope remains documentation/design only. No application code, database migration, event ledger, idempotency behavior, quota reservation, production D1 changes, deployment, or Nova parity were implemented or verified.
- The earlier notes above that say PR #43 is open, CI is pending, and mergeability is false are historical checkpoint notes superseded by this follow-up.
- Post-merge main CI: not yet observable at the time of this update (workflow/status lookups returned no run/status for the merge SHA). Do not report post-merge CI as successful until the run for the resulting main commit is observed.
- Next: check workflow runs for the merge commit and current main HEAD; verify this hand-off update's own CI; then proceed to implementation planning only after the next scoped PR has explicit acceptance criteria and a testable real-D1 strategy. Keep Phase 5 In progress and Phase 12 Blocked.


## CI verification update — 2026-10-28

- Post-merge main hand-off commit `a913266c76eafb995384b6454fa93f1c1f6c20f8` completed CI successfully: run #435, workflow run ID `40631448090`, job `test`, including `npm run verify`: https://github.com/ijoolaie/imoxy-net/actions/runs/40631448090.
- This confirms repository verification on the hand-off update commit. It does not verify Cloudflare D1 runtime behavior or quota reservation, because those remain design-only and no real D1 integration tests were run.
- PR #43 head CI also passed on `c22f6b6a4610426b9d4261d0f02dc82f5063a04d` (run #433 / `40631341345`), and PR #43 was squash-merged as `1ded95232255aae591508e46f86d095c2be8283f`.
- This note itself changes `HANDOFF.md` and therefore triggers another main CI run; record its result in a subsequent update before claiming the hand-off is fully current.


## Final hand-off CI confirmation — 2026-10-28

- The follow-up hand-off commit `bd8923751d435ab0d38a3ec0a67fcfd1b09f40aa` also passed GitHub Actions CI: run #436, workflow run ID `40631481882`, job `test`, step `npm run verify`: https://github.com/ijoolaie/imoxy-net/actions/runs/40631481882.
- The repository's current structure contains a quota domain service and D1 aggregate store, but no confirmed trusted proxy/data-plane usage event producer was found in the inspected source tree. Do not invent producer IDs at the management API. Before wiring idempotent usage ingestion, establish the authenticated event source and its stable ID lifecycle; otherwise a ledger API would be disconnected from actual traffic.
- Next implementation slice should start with a source/contract investigation: trace all calls to `createQuotaService`, identify whether any trusted usage reporter exists, and define the integration boundary. If none exists, document that the management plane alone cannot truthfully enforce or meter real proxy traffic, and keep event ledger/reservation implementation blocked until the data-plane integration path is selected.
- The current note will trigger another main CI run; check it before asserting the hand-off is fully verified.


## Next-source audit — quota producer gap (2026-10-28)

- Created branch `docs/quota-data-plane-gap` from main after PR #43 merged.
- Source inspected: `src/http/api.js`, `src/domain/quota-service.js`, `src/storage/d1-store.js`, `docs/architecture.md`, `docs/reference-baseline.md`, and `docs/parity-matrix.md`.
- Finding: `src/http/api.js` does not import or instantiate `createQuotaService`; the API capability report explicitly leaves quota enforcement/usage accounting pending. No trusted proxy/data-plane usage producer was identified in the inspected source tree. Therefore quota policy/service and `usage_daily` are currently foundations, not live traffic metering or hard enforcement.
- Added docs in this branch to record the integration precondition. No runtime code, API endpoint, database migration, or production setting is changed.
- PR #43 was merged as `1ded95232255aae591508e46f86d095c2be8283f`. Its exact head CI passed in run #433 / `40631341345`. Main hand-off commit `bd8923751d435ab0d38a3ec0a67fcfd1b09f40aa` passed CI run #436 / `40631481882`. The current update's CI run #437 / `40631523297` had `npm run verify` completed successfully; verify the run concludes successfully before merge.
- Next: review the six-file documentation diff, create PR, require exact-head CI, merge only if passing, verify post-merge CI. Then choose/characterize the trusted proxy usage source and define the control-plane integration contract before implementing event ledger or reservations. Do not claim Nova parity, real D1 verification, or hard enforcement.


## PR #44 merged — quota producer boundary documented (2026-10-28)

- PR #44: https://github.com/ijoolaie/imoxy-net/pull/44 was reviewed and squash-merged after exact-head CI passed.
- Exact PR head: `1aac00f0d3409be753562992ad1ba0f38e3697f6`; CI run #439, workflow run ID `40631667645`, conclusion success: https://github.com/ijoolaie/imoxy-net/actions/runs/40631667645.
- Merge commit: `9cfa5e6f2cc17f659c68767ef87b85926decb8f6`.
- The merged six-file documentation change makes the missing trusted usage producer explicit in architecture, parity, baseline, acceptance, roadmap, and hand-off records. No runtime code or production resource was changed.
- Post-merge CI for the merge commit is not yet observable at the time of this note; verify before claiming it passed.
- Next active work: select and characterize the actual proxy/data-plane source that measures traffic. Current source has no identified trusted usage reporter, and `createQuotaService` is not wired into the API. Do not add a raw client-supplied usage endpoint or implement an unconnected ledger/reservation layer. First establish source, authentication, account mapping, stable event IDs, and the pre-forwarding reservation boundary; then create black-box tests against pinned Nova Proxy 5.0.0 where feasible.
- This hand-off update itself triggers main CI and requires its own verification.


## PR #44 post-merge CI confirmation — 2026-10-28

- Merge commit `9cfa5e6f2cc17f659c68767ef87b85926decb8f6` passed main CI run #440 / workflow run ID `40631704573`, including `npm run verify`: https://github.com/ijoolaie/imoxy-net/actions/runs/40631704573.
- PR #44 exact-head CI passed in run #439 / `40631667645`. The hand-off commit immediately preceding this note is `291e4aa009e16f399a91735ea6767e0a991245c9`; its CI run #441 is queued at this checkpoint and must be checked before claiming this latest hand-off revision passed.


## Latest hand-off CI confirmation — 2026-10-28

- The hand-off revision that triggered main workflow run #442 completed successfully: workflow run ID `40631744714`, job `test`, including `npm run verify`: https://github.com/ijoolaie/imoxy-net/actions/runs/40631744714.
- This verifies repository checks for that hand-off revision only. It does not establish real Cloudflare D1 behavior, quota reservations, trusted proxy traffic metering, Nova runtime parity, or production readiness.
- Current source review reconfirms `src/domain/quota-service.js` exposes read-only `evaluate()` and additive `record()`; `src/http/api.js` does not instantiate that service. No trusted proxy/data-plane usage reporter has been identified in the inspected source.
- Next work remains blocked on selecting the actual proxy/data-plane architecture and defining its authenticated usage-event contract. Do not expose client-authoritative byte reporting or build a disconnected ledger/reservation implementation.


## Critical-path finding — proxy data plane (2026-10-28)

- Verified from pinned Nova Proxy 5.0.0 documentation: its README describes one Cloudflare Worker serving the admin panel, subscription links and proxy traffic; its deployment guide says a deployment provisions/binds KV and D1 without an origin server. These are source-document findings, not a live black-box runtime comparison.
- Verified from imoxy source: `worker.js` dispatches non-API requests to `env.ASSETS` when configured and otherwise delegates to `createApiHandler()`. The inspected `src/http/api.js` has no WebSocket upgrade/proxy protocol handler and does not instantiate `createQuotaService`.
- Conclusion: current account CRUD, subscription format generators and quota tables are management-plane foundations, not a functioning proxy replacement. This explains a major part of the gap from the requested Nova-like product.
- Priority correction: define and implement a minimal, independently written end-to-end proxy data-plane slice before adding usage ledger/reservation code. First specify black-box handshake, transport, account/subscription authentication, forwarding, failure/close and trusted measurement scenarios. Then attach stable event identity and pre-forwarding quota reservation to the actual data-plane lifecycle.
- Source links: [pinned Nova README](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md), [pinned deployment guide](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md).
- No runtime code changed in this investigation; no real proxy traffic test, D1 validation, Nova runtime comparison, deployment or license approval occurred. Phase 5 and Phase 6 remain In progress; Phase 1 runtime characterization and Phase 12 release certification remain blocked.
- PR #45 hand-off correction merged as `2ba717e22bf9a2617193bc0b9c2f2fda98ce8040`. Exact-head CI for PR #45 passed on `a7db723684e664df554c37cdd156586fb20a1703` in run #443 / workflow ID `40634370577`, including `npm run verify`. Post-merge main CI for `2ba717e22bf9a2617193bc0b9c2f2fda98ce8040` was not yet observable at this update.


## Proxy data-plane MVP plan — 2026-10-28

- Added [docs/proxy-data-plane-mvp.md](docs/proxy-data-plane-mvp.md) with an acceptance-first plan for one independently authored VLESS-over-WebSocket TCP path; added REF-033–REF-039 in docs/reference-scenarios.md. This plan is not implementation and does not claim reference behavior was observed.
- The first slice is contingent on confirming the transport against an authorized Nova 5.0.0 runtime. It must include configured endpoint routing, credential/account lookup, strict parser bounds, no upstream dial before authentication, a Cloudflare TCP socket adapter, bidirectional relay/cleanup, and a controlled Worker smoke test.
- Key unresolved blocker: current account schema's proxy_accounts.credential_secret_ref does not by itself define how a proxy protocol credential is provisioned, securely stored/hashed, looked up, rotated and revoked. Resolve this before wiring a data-plane handler.
- Explicitly defer gRPC, XHTTP, Trojan, Shadowsocks, UDP/WARP, mixed fallback and hard quota claims from this first slice. Usage event identity and reservation must be attached only after the real traffic measurement/forwarding boundary exists.
- PR #46 docs: identify missing proxy data plane and reprioritize roadmap merged as e73deb13973bbd569580caae7b34118e2e598328. Exact-head CI run #445 / workflow ID 40634462117 passed on a454899d039ad872955dc821c7d8035f536d096b, including npm run verify. Post-merge main CI for e73deb13973bbd569580caae7b34118e2e598328 was not observable through the available workflow-run lookup at this hand-off update.
- No proxy runtime code, Cloudflare D1 integration, live traffic test, Nova black-box runtime test, deployment or license approval was performed. Phase 5 and Phase 6 remain In progress; Phase 1 characterization and Phase 12 release remain Blocked.


## Initial VLESS parser slice — 2026-10-28

- PR #47 added the acceptance-first proxy MVP plan and REF-033–REF-039. It merged as a2caf7eb63728078346744fd85fe6bf936e84dbd; exact-head CI run #447 / workflow ID 40634572250 passed on 022ac944b60a4cb437e20aabc1601c65010c3b06, including npm run verify. Post-merge main CI for a2caf7eb63728078346744fd85fe6bf936e84dbd has not been observed in the available workflow lookup.
- New focused code slice: src/proxy/vless-parser.js parses VLESS request headers and preserves initial payload; test/vless-parser.test.js covers valid domain/IPv4/IPv6, addons, ArrayBuffer input, unsupported version/command/address type, port zero, malformed/oversized/non-ASCII domains, truncation, and canonical UUID syntax.
- The parser deliberately does not authenticate the UUID, authorize destinations, dial upstream, accept WebSocket upgrades, relay bytes, or enforce quotas. This is protocol parsing groundwork only, not a working proxy path or Nova parity.
- Before a handler can use it, design credential provisioning and secure lookup/rotation/revocation; current proxy_accounts.credential_secret_ref is not a complete protocol-credential contract. Then add a Cloudflare TCP socket adapter and WebSocket relay with a controlled Worker smoke test.
- This feature branch has not yet been CI-verified; inspect the complete diff and require exact-head CI before merge. No live traffic, D1 integration, Nova runtime comparison, deployment, or license approval occurred.


## VLESS parser merge verification — 2026-10-28

- PR #48, clean-room VLESS TCP request parser, merged as 29bf54c78c3c5d5bcfe8eae3d8c8ec98a54ee920.
- Exact PR-head CI passed on da3259ad4c870388ed418aababf3476680a78bc4: run #455 / workflow ID 40634698040, including npm run verify. The parser tests cover header decoding and malformed inputs.
- This CI result is not evidence of Cloudflare socket behavior, a working WebSocket proxy route, trusted usage metering, quota enforcement, or Nova parity. The parser does not authenticate the UUID or dial/relay traffic.
- The earlier statement that the parser feature branch had not yet been CI-verified is a historical checkpoint, superseded by the exact-head success above.
- Post-merge main CI for merge commit 29bf54c78c3c5d5bcfe8eae3d8c8ec98a54ee920 has not been observed through the available workflow-run lookup.
- Next implementation prerequisite: define credential provisioning, hash-only storage, account lookup, rotation and revocation; then implement authenticated WebSocket routing and a Cloudflare TCP adapter. Do not open upstream sockets before credential/account and destination policy checks. The controlled Worker smoke test and reference comparison remain mandatory.


## Proxy credential lifecycle implementation — 2026-10-28 (feature branch pending)

- PR #49 hand-off correction merged as 6303aeabf1e576231c2291b42d1a5c9f036ff0be. Its exact-head CI passed on ff98985eea6ee94f865b63b691df55a8e544eee4 in run #457 / workflow ID 40634795963, including npm run verify. Post-merge main CI for that merge commit has not been observed in the available workflow lookup.
- Active branch: feat/proxy-credential-lifecycle. Added migration 0005_proxy_credentials.sql, random UUID credential generation, SHA-256 hash-only persistence, account-creation one-time credential return, hash lookup, owner/admin-only rotation with prior-credential revocation and audit, and tests for API/RBAC/storage/schema behavior.
- Raw credentials are not intended for account list/get or audit logs. The proxy handler is not yet wired to the credential lookup. The legacy proxy_accounts.credential_secret_ref field remains unused.
- This branch is not yet PR-head CI verified. Inspect the full diff and run exact-head CI before merging. SQLite migration tests do not prove real D1 batch atomicity/foreign-key behavior.
- Prior PR #48 merged as 29bf54c78c3c5d5bcfe8eae3d8c8ec98a54ee920; exact-head CI run #455 / workflow ID 40634698040 passed on da3259ad4c870388ed418aababf3476680a78bc4. The parser remains parser-only: no WebSocket handler, TCP socket, relay, quota enforcement, live traffic test, Nova runtime comparison or deployment.


## Credential lifecycle CI failure and correction — 2026-10-28

- Initial exact-head workflow run #477 / ID 40635058518 failed: 128 tests passed and 2 tests failed because two read-only service test doubles (cross-interface and Telegram) lacked the newly required rotateCredential storage method. The failure was in test fixture contracts, not in credential hashing or SQL assertions.
- Updated test/cross-interface.test.js and test/telegram-webhook.test.js to provide an explicit unused rotateCredential stub. The corrected exact head is 856a00ada6b5cdf9dfc02b7b22e1f3663ab1d98d; CI run #482 / workflow ID 40635123544 passed, including npm run verify.
- The failure is resolved. Review this exact head and merge only with the CI result above; the main branch has not yet consumed this PR. Real Cloudflare D1 atomicity remains unverified.


## Restricted VLESS WebSocket handler implementation — 2026-10-28 (feature branch pending)

- PR #50 credential lifecycle merged as dbc0cd4547e209ce2b94ee8723aaf935d35f5527. Exact-head CI passed on fcf176447b304a9fc11b57fc2f2ef92d488d325b in run #484 / workflow ID 40635163588, including npm run verify. The earlier run #477 failed because two read-only test doubles lacked the new rotateCredential method; fixtures were updated and the corrected head passed. Post-merge main CI for the merge commit has not been observed through the available workflow-run lookup.
- Credential lifecycle is now in main: migration 0005_proxy_credentials.sql; random UUID issuance at account creation; SHA-256 hash-only persistence; hash lookup; owner/admin-only rotation; prior credential revocation and audit; raw credential returned only once. The legacy credential_secret_ref field remains unused.
- Active branch: feat/vless-websocket-handler. Added src/proxy/vless-websocket-handler.js and route dispatch before static assets. It validates WebSocket upgrade, parses VLESS TCP, hashes/looks up the UUID, checks account active/expiry, requires explicit PROXY_ALLOWED_HOSTS and PROXY_ALLOWED_PORTS, blocks obvious private/local literals, then dials TCP and relays binary data both ways. The route defaults to /proxy/vless and can be configured with PROXY_WS_PATH.
- Safety limitation: host allowlists are only a prototype guard and do not prevent DNS rebinding to private addresses. No general-purpose production proxy should be exposed from this branch. No usage metering, quota reservation, speed/concurrency enforcement, real D1/Worker smoke test or Nova runtime comparison is complete.
- At this hand-off checkpoint, exact-head CI was still pending. The later verification section below supersedes this status. No deployment has occurred.


## Handler safety review update — 2026-10-28

- Added a 10-second initial-handshake timeout and a regression test; after timeout the session closes without opening an upstream socket. Latest exact head e94b0f93d34b97a0f97e46f64093281a9a07d18d passed CI run #510 / workflow ID 40635532913, including npm run verify.
- Credential rotation is intentionally documented as non-idempotent for now: a lost response can leave the caller without the replacement secret. Do not add automatic client retries until a safe recovery/idempotency contract is designed.
- Remaining security gaps include DNS rebinding/private-network protection for allowed hostnames, idle timeout, robust WebSocket backpressure, quota/accounting integration, speed/concurrency limits, and a real Cloudflare Worker/D1 smoke test. Do not deploy this prototype to production.


- Exact-head Node CI passed, but it uses injected WebSocket/TCP adapters. Do not treat it as a Cloudflare runtime smoke test; live Worker/D1 validation and Nova comparison remain outstanding.


## Restricted VLESS handler merge confirmation — 2026-10-28

- PR #51 merged as 88ddb38f813aa0f4fa4700724972015169749a48. Exact PR-head CI passed on cf0b6ceb61f5ee6702275cd8f8cf5d3a9f80af86 in run #515 / workflow ID 40635590418, including npm run verify. This supersedes the earlier branch-pending and run #510 checkpoints above.
- Main now contains the restricted /proxy/vless VLESS-over-WebSocket TCP prototype, the parser, hash-only credential issuance/lookup/rotation, explicit host/port allowlist, account active/expiry checks, and 10-second initial-handshake timeout.
- CI tests use injected WebSocket/TCP adapters. No real Cloudflare Worker/D1 smoke test, live traffic transfer, Nova black-box comparison, quota enforcement, usage event ledger, reservation, speed/concurrency enforcement, or production deployment has occurred. Post-merge main CI for 88ddb38f813aa0f4fa4700724972015169749a48 was not observable through the available workflow-run lookup.
- The next critical path is usage accounting and quota reservation tied to the actual handler forwarding boundary. Do not wire the existing read-only quota evaluate() as hard enforcement; it is race-prone and does not reserve capacity. Define stable event identity, atomic event/aggregate updates, per-chunk pre-forward reservation, completion/release behavior and stale-reservation recovery before claiming hard quotas.
- Security blockers remain: host allowlisting does not prevent DNS rebinding to private destinations; credential rotation is non-idempotent; idle timeout/backpressure/resource limits need hardening. Do not expose the route as a general-purpose production proxy or claim Nova parity.


## Atomic quota reservation branch — 2026-10-28 (pending CI/review)

- Active branch: `feat/atomic-quota-reservations`.
- Added migration `0006_atomic_quota_reservations.sql`: `quota_reservations`, `usage_events`, payload immutability checks, and a trigger that applies the daily aggregate and settles the matching reservation when a claimed event transitions to applied.
- Added `createQuotaReservationService`, requiring caller-supplied stable reservation/event IDs and hashing canonical event fields. Settlement takes the reservation's original `usageDate`, so a chunk reserved before UTC midnight does not silently move into the next day.
- Added D1 adapter methods for conditional quota reservation, idempotent event settlement and explicit release. Added SQLite schema/trigger tests and domain-service tests.
- Not yet connected to the VLESS handler. Do not claim quota enforcement until each bounded data chunk is reserved before forwarding and settled with measured bytes after forwarding. If settlement is ambiguous, retain the reservation; do not release it automatically on lease expiry. Release only when no bytes were forwarded.
- Exact-head CI is not yet observed. Even if CI passes, real Cloudflare D1 tests are still required for trigger behavior, batch rollback, uniqueness races and concurrency before deployment.
- Existing VLESS route remains restricted and not production-ready; DNS rebinding/private network, backpressure/idle limits, real Worker smoke tests and Nova black-box parity remain open.


## Quota reservation implementation merged — 2026-10-28

- PR #53 merged as `783ef21559d3655dac9e0b1a4071194d57237a3a`. Exact-head CI passed on `d0ea10355de9a9384fcdd6e20e72679b48423eb6` in runs #539 (push) and #540 (pull_request); `npm run verify` passed. Post-merge `main` CI passed in run #541 (`40636585805`).
- Main now contains migration 0006, `quota_reservations`, `usage_events`, trigger-driven event application and reservation settlement, plus `createQuotaReservationService`. SQLite tests verify the migration, one-time settlement/replay suppression, immutable payload/state transitions and domain behavior.
- Active branch `feat/vless-quota-enforcement` now wires reserve-before-forward and settle-after-forward around VLESS upload/download chunks. It requires a stable `PROXY_USAGE_PRODUCER_ID` environment value. If reserve fails, forwarding stops; if settlement fails after possible forwarding, the session closes and the reservation is intentionally retained.
- This handler integration is not yet merged or CI-verified. Real Cloudflare D1 concurrency/rollback/trigger testing is still absent. Do not deploy or claim production quota enforcement until that is completed.
- Reservation leases are advisory metadata; no automatic expiry release is allowed. A release is only safe if the caller knows no bytes were forwarded. DNS rebinding/private-network controls, idle/backpressure/concurrency limits, real Worker smoke tests and Nova parity remain open.


## VLESS quota enforcement integration merged — 2026-10-28

- PR #54 merged as `f9bc9bd790357521caad938a5de22026c242383d`. Exact-head CI passed on `6e58695155d2a2ed76acf5f6961b03ba6f44dca1` in runs #557 (push) and #558 (pull_request), both successful `npm run verify` checks. Post-merge main CI run #559 (`40636982645`) was queued at the last check; do not claim post-merge success until it completes.
- Main now calls the quota reservation service from the VLESS handler. Every non-empty upload/download chunk is reserved before its forwarding call and settled after the call returns. Request count is recorded once per connection. A denied reservation closes the session; a failed/ambiguous settlement closes the session and retains the reservation. A reservation whose creation response is ambiguous is released only before any forwarding began, and ID conflicts are never released.
- Required Worker binding: `PROXY_USAGE_PRODUCER_ID`, a stable installation/producer identifier (1–128 ASCII letters, digits, dot, underscore, colon or hyphen). It is not a secret. Configure it before enabling the route; missing/invalid values fail closed.
- PR #53's migration 0006 and event/reservation triggers are present in main, with SQLite migration/trigger tests. No real Cloudflare D1 test has been run. Before production use, validate migration application, `db.batch` rollback, trigger semantics, reservation races, replay/conflicting payloads and quota boundaries on a disposable D1 database.
- No deployment occurred. Main CI after PR #54 was not yet confirmed at handoff update time. DNS rebinding/private-network protection, idle timeout, robust backpressure, connection/speed limits, live Worker smoke tests and Nova black-box parity remain open. Do not mark Phase 5/6 complete or call the proxy production-ready.


## Quota storage integration tests — 2026-10-28

- PR #56 merged as `2eecb715ec993400d989d9a0faf4ec145ede82a1`. Exact-head CI passed on `cc4c64f036a2acb0cfaa20a2dbbabd3ecb47fbd3` in run #564 (`npm run verify`), and post-merge `main` CI passed on `2eecb715ec993400d989d9a0faf4ec145ede82a1` in run #565 (`40637275161`).
- `test/quota-reservation-store.integration.test.js` now exercises the actual D1 adapter SQL with a SQLite-backed implementation of the D1 `prepare/bind/first/all/run/batch` surface. It covers concurrent daily reservations, one-time settlement, replay/conflicting event payloads, unused reservation capacity and rollback on aggregate overflow.
- This materially improves SQL coverage but is **not** a real Cloudflare D1 test. No Cloudflare D1 credentials/connection or disposable D1 database is available through the current connected tools, so D1 transaction/trigger/batch semantics and live Worker behavior remain unverified. Do not deploy based on SQLite CI alone.
- Next gate: run migration 0006 and the same replay/concurrency/rollback scenarios against a disposable non-production D1 database, then perform a controlled Worker smoke test. Use a least-privilege Cloudflare token and do not touch production resources. No deployment has occurred.


## VLESS idle-session timeout hardening — 2026-10-28

- Branch `fix/vless-idle-session-timeout` adds a default 120-second inactivity timeout to authenticated VLESS WebSocket sessions. Inactivity timer is reset on client upload and upstream download activity; a generation guard makes already-cancelled timer callbacks harmless.
- Session closure cancels both handshake and idle timers. Invalid timeout configuration fails closed. Added tests for idle close, stale timer callbacks after new activity, upstream socket cleanup, and invalid timeout configuration.
- This is a bounded resource-control improvement only. It does not address DNS rebinding/private-network resolution, robust backpressure, per-account connection/speed limits, or actual Cloudflare runtime behavior. PR #58 merged as `ce0cc7912344ba0883720992a489df4e662ac8a3` after exact-head CI succeeded in run #576. No deployment occurred.


## VLESS inbound queue bound — 2026-10-28

- Branch `fix/vless-inbound-queue-bound` caps queued binary client WebSocket messages at 1 MiB before they enter the serialized handler queue. If an incoming message would exceed the cap, the session closes with `client_write_queue_full`; non-binary frames are rejected before queueing.
- This limits application-level queued inbound payload memory and prevents unbounded accumulation while an upstream write/reservation is slow. Tests cover burst overflow and text-frame rejection.
- This is not full backpressure: it does not bound Cloudflare's internal WebSocket receive buffers or downstream `server.send` buffering, and it does not impose per-account connection/speed limits. Await exact-head CI before merge. No deployment or live Worker/D1 test occurred.


## Verified follow-up — PR #60 (2026-10-28)

- PR #60, `fix(proxy): reject special-use destination literals`, merged by squash as `3f63f97b55b2ea19e771ae18a7c3f9b8e9eb3931`: https://github.com/ijoolaie/imoxy-net/pull/60.
- Exact-head CI run #597 / workflow ID `40640361156` passed on `55776b816c2b74216840d4838ed704105ce98e09`; `npm run verify` succeeded.
- Added connected-peer validation before creating the writer or forwarding initial VLESS payload. The handler fails closed if `socket.opened` rejects, `remoteAddress` is missing/malformed, or the reported peer matches a blocked literal range. Regression tests verify private/malformed peers do not receive payload and do not reserve quota.
- Expanded IPv4 special-use literal filtering and documented that hostname allowlisting is not complete DNS-rebinding protection.
- Evidence boundary: Node CI uses injected socket/WebSocket adapters. No real Cloudflare Worker or D1 smoke test, DNS-rebinding end-to-end test, deployment, or Nova runtime comparison was performed. Do not claim the route is production-ready or Nova-compatible.
- Next: review the connected-peer address parser for complete IPv4/IPv6 normalization and special-use handling; then obtain an authorized disposable Cloudflare D1/Worker environment for controlled, non-production tests. Do not perform live writes or deploy without explicit approval.

## Verified follow-up — PRs #61–#62 and IPv6 hardening in progress (2026-10-28)

- PR #61 handoff/roadmap evidence update merged as `3feaf05b7c6830b2adec8b0f96bad07134f90358`; exact-head CI run `40642002952` passed on `c2daab158672557d9b52c8156fd1bfd5aeddab11`. Post-merge main CI run `40642926708` passed on the merge commit.
- PR #62 strict IPv6 numeric parsing merged as `26dba7efa45d58de5982c1ffcdf5c5ff28018c77`; exact-head PR CI run `40642098509` passed on `dc43700ddcdf33d8cd75ffd64150f8b3b6df41bf` (push CI run `40642118251` also passed). Post-merge main CI run `40642950313` passed on the merge commit; `npm run verify` succeeded.
- PR #62 rejects malformed IPv6 group counts/compression, validates reported connected-peer address syntax before forwarding, and adds regression coverage for compressed public IPv6 and documentation space. This remains conservative syntax validation, not complete special-purpose address coverage.
- PR #63, https://github.com/ijoolaie/imoxy-net/pull/63, proposes a normalized IPv6 parser and fail-closed policy for non-global and selected special-purpose/transition/documentation ranges. Exact-head CI on `66f2e90fc2ff7dc0b58b17900408bcacfe3a24d2`, run `40643131921`, was **in progress** at this handoff update; do not merge until it passes and the diff is reviewed.
- Evidence boundary: these are adapter-based Node tests only. No real Cloudflare Worker/D1 test, DNS-answer pinning, deployment, or Nova runtime comparison occurred. Phase 6 remains In progress; Phase 12 remains Blocked.
- Next: finish PR #63 exact-head CI/review; then address hostname DNS rebinding and bounded relay/backpressure with a controlled, disposable Worker/D1 test plan. No live Cloudflare writes or deployment without explicit approval.

### Final status update — PR #63 and #64 (2026-10-28)

- PR #63 merged as `29fa597c5c649552d827396a218609ce895724f4`. Exact-head CI passed on `66f2e90fc2ff7dc0b58b17900408bcacfe3a24d2` (run `40643131921`). It normalizes IPv6 groups and rejects non-global IPv6 plus selected special-purpose, transition and documentation prefixes before forwarding. This remains conservative, selected-range filtering, not a complete IANA registry.
- PR #64 merged as `7a1856f311840466d080ed0606b1555474579584`; exact-head documentation CI passed in run `40643283669`.
- Post-merge main CI for PR #63 (run `40643515543`) and PR #64 (run `40643555979`) was still in progress at the time of this note; do not claim post-merge verification until both complete successfully.
- No deployment or live Cloudflare resource writes occurred. DNS answer pinning, disposable D1/Worker smoke tests, proxy resource limits/backpressure and Nova black-box comparison remain open.


## Latest work session — 2026-10-28 (DNS destination pinning)

- PR #65 documentation status note merged; its mainline evidence was checked before continuing.
- PR #66, [fix(proxy): pin TCP dials to validated DNS answers](https://github.com/ijoolaie/imoxy-net/pull/66), merged as `471e3a0d0cd9d0fc0fd2292b450e9a95aa026198`. Exact-head `npm run verify` passed on `c874882ae9179446cddad6ba1f2504c93dd8e063` (PR CI run `40647440374`; push CI run `40647434071`).
- Implementation resolves hostnames via Cloudflare DNS-over-HTTPS, normalizes the selected public numeric answer, connects directly to that IP, and requires the socket-reported peer to match before writer creation, quota reservation or forwarding. Resolver failures, invalid/private-only answers and peer mismatches fail closed. Tests cover public-answer selection, private answers, resolver failure, canonical numeric targets, timeout while DNS is pending, and connected-peer mismatch.
- Merge commit CI and this handoff update's own CI must still be verified after the documentation commit. No deployment or live Cloudflare resource writes occurred.
- Limitations: this application-level pinning depends on DNS-over-HTTPS availability and the Worker runtime's supported outbound fetch/TCP behavior. The selected-address policy is still not a complete maintained IANA special-purpose registry; mixed answer sets and IPv4/IPv6 fallback behavior require further review. No controlled Worker/D1 smoke test or Nova black-box comparison has been performed. Do not mark Phase 6 complete or claim production readiness.
- Next: verify main CI for the PR #66 merge commit; finish review of resolver edge cases and destination allowlist semantics; prepare a controlled non-production Worker/D1 smoke-test plan. Do not deploy or write live resources without explicit approval.


## Follow-up work session — 2026-10-28 (non-production smoke gate)

- Verified current `main` head: `796be026b8d41960bf77c99b5f48ff39d4d963fa`. Its CI run `40650164988` completed successfully; job `122688130054` reports `npm run verify` succeeded on that exact SHA.
- Checked repository tree: it contains `wrangler.toml.example`, but no active `wrangler.toml`; the example intentionally leaves the D1 binding commented out. No existing deployed Worker/D1 environment can be inferred from repository configuration.
- Open PR list was empty at inspection time.
- Created branch `docs/nonprod-vless-smoke-gate` and added `docs/nonprod-vless-smoke-gate.md`. The runbook covers staging-only preconditions, migrations/persistence, WebSocket/auth paths, DoH/TCP peer pinning, bidirectional relay, accounting/quota checks, cleanup and acceptance evidence.
- The runbook is **prepared, not executed**. No Cloudflare resources were created or changed, no deployment was performed, and no real D1/Worker or Nova black-box test was run.
- Next: update the acceptance plan and parity matrix to link this gate; review the PR diff and CI. To execute the gate, first obtain explicit authorization and a dedicated disposable Cloudflare Worker/D1 environment. Separately review DNS mixed-answer and IPv4/IPv6 fallback behavior, special-purpose address coverage, backpressure, and quota enforcement before any production-readiness claim.


## Phase completion audit — 2026-10-28

- Re-read `docs/roadmap.md`, acceptance plan, parity matrix, license review and release certification. The exit-gate rule means **no phase is currently Complete**; this is not a statement that no features have been implemented.
- Audited status: phases 0–11 In progress; phase 12 Blocked; phase 13 Not started. Phase 2 (domain/API contract) and Phase 4 (persistence/recovery) previously lacked explicit State lines in the roadmap; they are now explicitly marked In progress with remaining exit-gate evidence documented.
- Key cross-phase blockers: no authorized/pinned Nova runtime scenarios or completed distribution-license decision; no real Cloudflare D1 durability/concurrency/restore evidence; no deployed Worker/D1 VLESS smoke test; incomplete quota event identity/idempotency and hard data-plane enforcement; incomplete web/bot/device E2E; no release candidate.
- PR #67, https://github.com/ijoolaie/imoxy-net/pull/67, contains the non-production VLESS smoke runbook and this phase audit. CI passed on earlier PR head `c3cb92d0c53e891c0c8470fc920705744a07aa3a` (run `40650803938`); the new phase-audit commit `b207855a211db2f3742f7f1fd94e3baec9009e04` still requires its own exact-head CI result before merge.
- No Cloudflare resource was created or modified, and no deployment or Nova runtime comparison was performed.


## Verified status refresh — PRs #67–#68 (2026-10-28)

This section supersedes stale pending-merge notes above where they conflict with the verified repository state.

- PR #67 (non-production VLESS smoke gate and phase audit) is merged. Its runbook is documentation only and has **not** been executed against a real Worker/D1 environment.
- PR #68, [fix(proxy): support validated IPv4/IPv6 dial fallback](https://github.com/ijoolaie/imoxy-net/pull/68), is merged as `d3c9d6f5002696d3b9e5dcbd426f17d7c9f7f273`.
- Exact-head PR CI passed on `4ff167957939537853abf4ee625e6f407dc8e224` in runs [40653008200](https://github.com/ijoolaie/imoxy-net/actions/runs/40653008200) and [40653014105](https://github.com/ijoolaie/imoxy-net/actions/runs/40653014105).
- Post-merge `main` CI passed on merge commit `d3c9d6f5002696d3b9e5dcbd426f17d7c9f7f273` in run [40653294526](https://github.com/ijoolaie/imoxy-net/actions/runs/40653294526).
- PR #68 resolves and validates unique public numeric A/AAAA candidates, tries candidates sequentially only when connection/opening fails before any payload forwarding or quota reservation, and fails closed on connected-peer mismatch. Tests are adapter-based; this is not proof of complete SSRF protection or runtime behavior in Cloudflare.
- Current verified `main` head at this update is `d3c9d6f5002696d3b9e5dcbd426f17d7c9f7f273`.
- No live Cloudflare resources were created or modified, no deployment occurred, and no real Worker/D1 smoke test or Nova runtime comparison was performed.
- Remaining blockers are unchanged: selected-range special-purpose IP filtering is not a complete maintained IANA registry; relay/backpressure and quota/data-plane enforcement need further validation; real D1 durability/concurrency/recovery and end-to-end panel/bot/device tests remain outstanding; Nova compatibility and licensing review remain unresolved.
- Phase audit remains: phases 0–11 In progress, phase 12 Blocked, phase 13 Not started. No phase is declared Complete.
- Next: continue focused security review of TCP relay lifecycle, queue/resource bounds and quota reservation/settlement failure paths; prepare a controlled disposable Worker/D1 test only after explicit authorization. Do not deploy or mutate live Cloudflare resources without explicit approval.


## Verified follow-up — PR #70 (2026-10-28)

- PR #70, [fix(proxy): bound DNS fallback dial attempts](https://github.com/ijoolaie/imoxy-net/pull/70), was squash-merged after review and exact-head CI success.
- Exact PR head `1b67bc523c8395e516eaa59c05ecb6b77c6ced3e`; CI run [40656529915](https://github.com/ijoolaie/imoxy-net/actions/runs/40656529915) completed **success**.
- Merge commit on `main`: `45bc193983285dcbafcbeeed709fc5d14a8acd78`; post-merge main CI run [40657000940](https://github.com/ijoolaie/imoxy-net/actions/runs/40657000940) completed **success** on that exact SHA.
- Change: sequential DNS fallback dials are capped at eight validated candidates per handshake; regression coverage confirms candidate nine is not dialed and total failure closes with `upstream_unavailable`.
- Evidence boundary: this bounds the number of attempts but does not prove a complete special-purpose IP policy, a bounded TCP connect/open duration, Cloudflare runtime behavior, or production SSRF protection.
- No deployment or live Cloudflare resource changes occurred. Real Worker/D1 validation, relay/backpressure review, quota/data-plane verification, authorized Nova comparison, and license/distribution review remain blockers.
- Phase audit remains: phases 0–11 **In progress**, phase 12 **Blocked**, phase 13 **Not started**; no phase is Complete.
- Next technical review: bound the lifetime of an in-flight TCP connect/open operation so a stalled socket-open promise cannot outlive the handshake/session close path. Implement only with deterministic cancellation/cleanup tests and verify exact-head plus post-merge CI; no live deployment.


## Verified follow-up — PR #72 (2026-10-28)

- PR #72, [fix(proxy): close pending TCP dials on session timeout](https://github.com/ijoolaie/imoxy-net/pull/72), passed exact-head CI on `cfcac52ca949f5152babafdd693b068d5e128a17`; run [40657561213](https://github.com/ijoolaie/imoxy-net/actions/runs/40657561213).
- Squash merge commit: `6e3af7b8d0470f64d355fc6afcf81f23b45f0282`. Post-merge main CI run [40658000714](https://github.com/ijoolaie/imoxy-net/actions/runs/40658000714) was queued at the time of this update; do not treat it as passed until it completes successfully on this exact SHA.
- The handler races TCP connection creation and the socket `opened` promise against session closure, tracks the pending socket for cleanup, and closes a socket that resolves after the session has timed out. Two regression tests cover stalled `opened` and delayed connect resolution.
- These tests are adapter-based. They do not establish cancellation guarantees or cleanup behavior in the actual Cloudflare runtime; that remains an integration validation item.
- No deployment or live Cloudflare resource changes occurred.


## Verified status refresh — PRs #71–#73 (2026-10-28)

This update supersedes earlier pending-status notes where they conflict with the verified repository state.

- PR #71, [docs: record PR 70 merge and CI evidence](https://github.com/ijoolaie/imoxy-net/pull/71), is merged as `40b0d8b9805ff2764ad0c8049870c8913172c1cf`. Its exact-head CI passed in [run 40658106547](https://github.com/ijoolaie/imoxy-net/actions/runs/40658106547); post-merge main CI passed in [run 40658457456](https://github.com/ijoolaie/imoxy-net/actions/runs/40658457456).
- PR #72, [fix(proxy): close pending TCP dials on session timeout](https://github.com/ijoolaie/imoxy-net/pull/72), is merged as `6e3af7b8d0470f64d355fc6afcf81f23b45f0282`. Exact-head CI passed in [run 40657561213](https://github.com/ijoolaie/imoxy-net/actions/runs/40657561213), and post-merge main CI passed on that SHA in [run 40658000714](https://github.com/ijoolaie/imoxy-net/actions/runs/40658000714).
- PR #73, [fix(proxy): stop pending auth and DNS work on timeout](https://github.com/ijoolaie/imoxy-net/pull/73), is merged as `e7e57dc4d564a6876994bd6179fe4b0957487d7e`. Exact-head CI passed on `34c4bfdef82d9324ce8c6b90aeab43bc93bc48f2` in [run 40658310914](https://github.com/ijoolaie/imoxy-net/actions/runs/40658310914) and [run 40658329194](https://github.com/ijoolaie/imoxy-net/actions/runs/40658329194). Post-merge main CI passed on the current main SHA in [run 40697860018](https://github.com/ijoolaie/imoxy-net/actions/runs/40697860018).
- PR #73 races credential hashing, account lookup, and destination resolution against the session-close signal. If the handshake closes while one of these promises is pending, subsequent processing stops; the added regression test covers a DNS promise that never settles. This is adapter-level evidence, not a real Cloudflare runtime guarantee.
- PR #72 covers a stalled TCP `opened` promise and a connect promise that resolves after timeout. The pending socket is tracked for cleanup and late-created sockets are closed. Runtime cancellation/cleanup still needs integration validation.
- PR #70's eight-candidate sequential DNS fallback cap remains merged and covered by exact-head and post-merge CI, as recorded above.
- Latest verified `main` SHA at this update: `e7e57dc4d564a6876994bd6179fe4b0957487d7e`; latest main CI run [40697860018](https://github.com/ijoolaie/imoxy-net/actions/runs/40697860018) completed **success** on that exact SHA.
- No Cloudflare deployment or live resource changes occurred. No real Worker/D1 smoke test or Nova runtime comparison was performed.

### Current remaining gates

1. Validate connect/open timeout and cleanup behavior in a disposable real Cloudflare Worker environment.
2. Test D1 durability, transaction/concurrency behavior, quota reservation recovery, idempotency and hard data-plane enforcement.
3. Review downstream backpressure and memory bounds under slow-client/slow-upstream conditions.
4. Complete maintained special-purpose IPv4/IPv6 destination filtering and SSRF-focused tests.
5. Obtain authorized, pinned Nova reference scenarios and complete the behavior-parity matrix.
6. Resolve distribution-license review; complete panel, Telegram bot and Android client E2E and release certification.

Phase status remains unchanged: phases 0–11 In progress, phase 12 Blocked, phase 13 Not started; no phase is declared Complete. Do not deploy or mutate live Cloudflare resources without explicit approval.

## Latest work session — 2026-10-28 (VLESS downstream queue bound)

- Starting `main` SHA: `06209ff28b9bea54ef83f086f6a49ac5a6e5018f`; handoff-refresh main CI run `40701152811` was still in progress at session start.
- Branch: `fix/vless-downstream-buffer-bound`.
- Objective: reduce unbounded downstream WebSocket buffering in the restricted VLESS TCP relay.
- Change: before reserving quota or sending a TCP download chunk, inspect `server.bufferedAmount`; close with `downstream_write_queue_full` if it is missing/invalid or if current queued bytes plus the chunk exceed 1 MiB. Added unit tests for over-budget and unavailable telemetry.
- Scope/limits: this is an application-level queue guard, not complete transport backpressure. No Cloudflare Worker/D1 deployment, live write, or Nova runtime comparison. Confirm `bufferedAmount` support and real slow-client behavior in disposable Worker smoke tests.
- Required verification: review all changed files, require exact-head CI success before merge, verify post-merge main CI, then update this handoff with exact SHA/run IDs and verify the handoff commit's own CI.
- Release gates remain: real D1 transaction/concurrency/replay tests; controlled Worker smoke; DNS/special-address review; full speed/concurrency limits; Nova REF-001–039 black-box comparison; license/distribution review. Phase 5 and Phase 6 remain In progress; Phase 12 remains Blocked.

## Correction — Worker WebSocket buffering telemetry (2026-10-28)

PR #76 was merged as `c30bf31749a422159e34bc4dd052a65c648f7681` after exact-head CI run [40701877687](https://github.com/ijoolaie/imoxy-net/actions/runs/40701877687) passed. A subsequent review of the official Cloudflare Workers WebSocket API docs found that `bufferedAmount` is not listed among the documented Worker WebSocket properties. Browser WebSocket documentation does describe that property, but that does not establish Worker support. The guard must therefore not fail every real session merely because the property is absent.

Follow-up branch: `fix/worker-websocket-backpressure-compat`. It removes the unverified `bufferedAmount` dependency and its adapter-only tests. This is a compatibility correction, **not** a claim that downstream backpressure is solved. A bounded queue/backpressure strategy that is actually supported by the Worker runtime remains an open engineering task. Re-check the follow-up PR's exact-head CI and post-merge CI before treating this correction as complete. No Cloudflare deployment or live resource mutation has been performed.

## Current state — 2026-10-28 (latest verified follow-up)

- PR #76 bounded VLESS downstream buffering using `server.bufferedAmount`; its exact-head CI passed (run 40701877687), and main CI after merge passed (run 40703437818). This was superseded after reviewing the Cloudflare Workers WebSocket API documentation.
- PR #77 removed the assumption that Workers WebSocket supports the undocumented `bufferedAmount` property. It was squash-merged as `a153e2a4cdc500e442edc85657812c7ad95fe463`. Exact-head CI passed on run 40703707311; post-merge main CI passed on the exact merge commit (run 40704445086, completed/success).
- Tracking issue #78 records the unresolved downstream buffering/backpressure requirement and acceptance criteria: https://github.com/ijoolaie/imoxy-net/issues/78.
- Current VLESS handler still forwards download chunks with synchronous `server.send(bytes)`; do not claim bounded runtime WebSocket buffering or complete downstream backpressure. The 1 MiB client-to-TCP write queue bound is a separate control and does not prove the download path is bounded.
- `docs/nonprod-vless-smoke-gate.md` is a prepared runbook, not execution evidence. No Cloudflare deployment, D1 mutation, production change, or live runtime smoke test has been performed.
- Next action: investigate a runtime-supported flow-control mechanism and add deterministic slow-client tests. If no supported drain/buffer signal exists, document the platform limitation and implement the safest bounded session behavior. Use only an explicitly authorized disposable staging environment for runtime evidence.

## Current state — 2026-10-28 (VLESS downstream backpressure follow-up)

- PR #79 was squash-merged as `2a6a8013cbd8f12b0305179e97a5a3977aebed8d`. Its exact-head CI passed on `b368fc8454f34573c3a991fa7970e5b1ff7f8d0a` (run [40706245697](https://github.com/ijoolaie/imoxy-net/actions/runs/40706245697)). The regression test verifies fail-closed behavior after a download chunk has been sent: a later queued chunk is not forwarded, quota settlement is attempted once, the reservation is retained, and the upstream socket closes.
- PR #80 was squash-merged as `00b04890ac7358d99c67ad420314008167da95d4`. Its exact-head CI passed on `d71f6d307389f1f629ec2f70cd426d580f8a9286` (run [40707773065](https://github.com/ijoolaie/imoxy-net/actions/runs/40707773065)). It adds `docs/vless-runtime-backpressure-probe.md`, a bounded, isolated staging probe plan. The probe is a plan only and has not been run.
- PR #81 was squash-merged as `91343d86c7da66362f6a8db54a7739b7b0f93a36`; it updated this handoff with the latest known status and authorization gate. Issue #78 remains open and tracks the unresolved requirement: https://github.com/ijoolaie/imoxy-net/issues/78. These changes are partial progress, not proof of bounded Cloudflare Workers WebSocket internal buffering.
- Runtime probe gate: do not create or deploy a Worker, bind a route, mutate D1, or run a live smoke test until the owner explicitly authorizes a disposable staging environment and approves the hard byte/time/concurrency limits and cleanup procedure.
- Current risk remains: download forwarding uses synchronous `server.send(bytes)`; the documented Workers WebSocket API does not expose a documented drain signal or awaitable write. Client-side receive backlog and a bounded test run do not prove the Worker's internal send buffer is bounded. Do not reintroduce undocumented `bufferedAmount` assumptions.
- Next actions: obtain explicit staging authorization and approval of hard byte/time/concurrency limits plus cleanup; then execute the bounded probe, record observed evidence and limitations, and update issue #78/handoff. Keep the backpressure acceptance criterion open until the evidence supports a defensible design.



## Verified follow-up — PR #82 and downstream backpressure status (2026-10-28)

- PR #82 hand-off correction was squash-merged as `fd066796f5cdb35a52af32e7c9695b04e7694344`.
- Post-merge main CI run [40713599656](https://github.com/ijoolaie/imoxy-net/actions/runs/40713599656) completed **success** on that exact main commit; `npm run verify` passed.
- Repository check found issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) still open and no open PRs at the time of review.
- Re-inspected `src/proxy/vless-websocket-handler.js`: the download loop reads one upstream chunk, reserves quota, calls synchronous `server.send(bytes)`, awaits settlement, and only then reads the next chunk. This supports the narrower claim that the application does not intentionally read ahead into its own download queue. It does **not** bound the Worker's internal WebSocket send buffer, and a fake WebSocket test cannot establish behavior for a slow/non-reading client in the real runtime.
- The 1 MiB `MAX_QUEUED_CLIENT_BYTES` limit remains an upload-side client-to-TCP write queue bound; it is not a download buffer limit. Settlement failure remains fail-closed and retains the reservation.
- `docs/vless-runtime-backpressure-probe.md` remains a plan only. The proposed probe caps (10 seconds, 8 MiB total attempted bytes, 16 KiB frame, two concurrent clients) are not yet approved and have not been executed. No Worker was deployed, no route or D1 was changed, and no live smoke test was run.
- Next: continue only non-live design/test work until explicit owner authorization names a disposable staging Worker/hostname and approves the hard limits and cleanup. Do not reintroduce undocumented `bufferedAmount` assumptions. Keep issue #78 open until a defensible runtime-backed solution or explicitly bounded application policy is validated.
- Phase audit: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.


## Verified follow-up — PR #83–#85 and current CI status (2026-10-28)

- PR #83 refreshed the downstream-backpressure handoff and merged as `fadfe9d4f30af66291b617bfabbd1022a974961e`; exact-head CI run [40715286207](https://github.com/ijoolaie/imoxy-net/actions/runs/40715286207) passed.
- PR #84 documented the Cloudflare Workers WebSocket API review and acceptance criteria; it merged as `3d4f5be5feea74405a8b8798c34f167be8307df5`. Exact-head CI [40715995910](https://github.com/ijoolaie/imoxy-net/actions/runs/40715995910) and post-merge main CI [40716464366](https://github.com/ijoolaie/imoxy-net/actions/runs/40716464366) both passed.
- PR #85, [docs: record flow-control review handoff](https://github.com/ijoolaie/imoxy-net/pull/85), merged as `e3a55f0a66fa77c4fb90df8659bd2e49bcdb8085`. Exact-head CI [40716588590](https://github.com/ijoolaie/imoxy-net/actions/runs/40716588590) passed. Main CI on the merge commit is [40717743878](https://github.com/ijoolaie/imoxy-net/actions/runs/40717743878), currently in progress at this handoff edit; recheck before describing it as passed.
- Important correction: PR #85 initially repeated the prior #83/#84 status block rather than adding the intended distinct PR #85/CI evidence. This replacement removes that duplicate and records the actual evidence. It is a documentation correction, not a change to runtime behavior.
- Official Workers WebSocket API documentation does not document `bufferedAmount`, a drain event, or an awaitable send result. This is documentation evidence only, not proof about undocumented runtime internals. Do not reintroduce the removed `server.bufferedAmount` assumption.
- Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open. Sequential upstream reads and quota settlement constrain application read-ahead but do not prove the runtime's internal WebSocket queue is bounded. A hard per-session byte/time cap remains a candidate application policy, not approved or implemented.
- The staging probe in `docs/vless-runtime-backpressure-probe.md` remains a plan only. Its proposed caps (10 seconds, 8 MiB total attempted bytes, 16 KiB frame, two concurrent clients) have not been approved or executed. No Worker deployment, route binding, D1 mutation, or live smoke test occurred.
- Before a live probe, require explicit owner authorization for a disposable staging Worker/hostname, approved byte/time/frame/concurrency limits, and cleanup procedure. A bounded probe cannot by itself prove internal buffer boundedness.
- Phase audit unchanged: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.


## Verified proxy follow-up — PRs #86–#88 (2026-10-28)

- PR #86 corrected the flow-control handoff evidence and merged as `d381a6fe14d88b27d45ee0f9515a8100b73e8036`; exact-head CI [40718032142](https://github.com/ijoolaie/imoxy-net/actions/runs/40718032142) and post-merge main CI [40718852342](https://github.com/ijoolaie/imoxy-net/actions/runs/40718852342) passed.
- PR #87 added two DNS-family fallback regression tests: tolerate one failed DoH family query when the other yields a public address, and fail closed when the only successful family returns only a private address. It merged as `0ed3d69bfce75c0be26b2cc47cbbf6fd18ca5de1`; exact-head CI [40720336626](https://github.com/ijoolaie/imoxy-net/actions/runs/40720336626) and post-merge main CI [40720791132](https://github.com/ijoolaie/imoxy-net/actions/runs/40720791132) passed.
- PR #88 added validation that DoH JSON answer data matches the declared DNS family (A → IPv4, AAAA → IPv6), with regression coverage for mismatched answers. It merged as `0a245d8ee5626e8e54dca02f208627e0b75db6c9`; exact-head CI [40721283734](https://github.com/ijoolaie/imoxy-net/actions/runs/40721283734) passed. Post-merge main CI [40721786728](https://github.com/ijoolaie/imoxy-net/actions/runs/40721786728) is in progress at this update; recheck before claiming it passed.
- These changes strengthen resolver input validation and regression coverage. They do not establish full SSRF protection, complete special-purpose address coverage, runtime backpressure, Nova parity, or production readiness.
- Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open. The disposable Worker/D1 smoke gate and slow/non-reading downstream probe remain unexecuted; no deployment, route binding, or D1 mutation was performed.
- Phase audit: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.

## Post-merge verification — PR #89 (2026-10-28)

- PR #89, [docs: record verified DNS resolver hardening handoff](https://github.com/ijoolaie/imoxy-net/pull/89), merged as `89e63afec37970783387b51341b69610b162c92c` after its exact-head CI run [40721938418](https://github.com/ijoolaie/imoxy-net/actions/runs/40721938418) completed successfully.
- Post-merge main CI run [40722382675](https://github.com/ijoolaie/imoxy-net/actions/runs/40722382675) passed on the exact main commit `89e63afec37970783387b51341b69610b162c92c` (`npm run verify`). This verifies the repository's current automated Node checks only; it is not a Cloudflare runtime or Nova parity test.
- No open pull requests were found at the time of this audit. Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open; no approved disposable staging Worker/hostname or cleanup authorization has been supplied, so the slow-reader runtime probe remains unexecuted. No Worker deployment, route binding, D1 mutation, or live smoke test occurred.
- Next safe work: continue static review and deterministic tests for Phase 6 without choosing an unapproved session byte/time policy. Before any live probe, obtain explicit owner approval for the disposable staging resource, test limits, and cleanup procedure.
- Phase audit remains: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.


## Verified proxy follow-up — PRs #90–#92 (2026-10-29)

- PR #90 refreshed the handoff with the main-CI evidence and the unresolved downstream WebSocket backpressure issue. It merged as `0b2c1ddfe661e3ef623ae09cf1149786b2965bdb`; main CI run [40723571897](https://github.com/ijoolaie/imoxy-net/actions/runs/40723571897) passed on that exact SHA.
- PR #91 added regression assertions that both A and AAAA DoH requests use the fixed `https://cloudflare-dns.com` origin and `redirect: "error"`. It merged as `d3cc84f43b10933d2d0790783d4a3085835c3b27`; post-merge main CI [40726276770](https://github.com/ijoolaie/imoxy-net/actions/runs/40726276770) passed on that exact SHA.
- PR #92 added a deterministic downstream `server.send()` failure test. It verifies the relay closes with `downstream_write_failed`, no settlement is recorded for the failed chunk, and the ambiguous reservation is not released. PR-head CI [40726755197](https://github.com/ijoolaie/imoxy-net/actions/runs/40726755197) passed on exact head `4ebeaada50479be9ce91170b3165946cf0c0c026`; PR #92 was then squash-merged as `55de20c97df471bd60510c0ecf021e5a3417b095`.
- Post-merge main CI for PR #92's merge commit has not yet been observed in the workflow-run listing; do not claim it passed until a run on the exact merge SHA is confirmed.
- These are unit/regression tests and repository CI evidence only. They do not prove Cloudflare's internal WebSocket send buffer is bounded, and they do not establish Nova parity or production readiness. Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open; the disposable slow-reader Worker probe is still a plan and has not been executed. No Worker deployment, route binding, D1 mutation, or live smoke test was performed.
- Next: verify post-merge CI on the current main SHA; then continue static proxy review and deterministic tests. Keep the live probe gated on explicit approval of a disposable staging Worker/hostname, byte/time/frame/concurrency caps, and cleanup.
- Phase audit unchanged: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.


## Verified follow-up — PRs #94–#95 (2026-10-29)

- PR #94 removed stale documentation instructions requiring the undocumented Workers WebSocket `bufferedAmount` guard and marked runtime-buffer boundedness as unresolved. It merged as `520c9ce1bf5c08919f9b061420609bd3cd81b8b9`; post-merge main CI run [40840562813](https://github.com/ijoolaie/imoxy-net/actions/runs/40840562813) passed on that exact SHA.
- PR #95 added a deterministic regression test proving that when download quota settlement fails, the relay closes the session and cancels the upstream reader before another read. It merged as `0840c650ce69b4fc2217dc1916b80f62176376d1`; post-merge main CI run [40844388178](https://github.com/ijoolaie/imoxy-net/actions/runs/40844388178) completed **success** on that exact SHA.
- These tests establish application-level failure handling and read serialization only. They do **not** establish that Cloudflare's internal WebSocket send buffer is bounded or drained, and they are not Nova runtime parity evidence.
- Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open. The disposable slow/non-reading-client runtime probe remains a plan and has not been executed; no Worker deployment, route binding, D1 mutation, or live runtime smoke test was performed.
- Next safe step: continue static review and deterministic tests against the open #78 acceptance criteria. Any runtime probe remains gated on explicit owner approval of a disposable staging Worker/hostname, hard byte/time/frame/concurrency limits, and cleanup.
- Current verified main SHA before this handoff refresh: `0840c650ce69b4fc2217dc1916b80f62176376d1`; post-merge CI run `40844388178` passed on that exact SHA. This handoff refresh requires its own PR-head CI and post-merge main CI verification.
- Phase audit: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.


## Verified follow-up — PR #96 and post-merge CI (2026-10-29)

- PR #96 records the verification evidence for PRs #94–#95 and the remaining Cloudflare runtime buffering limitation. Its exact-head CI run [40845813269](https://github.com/ijoolaie/imoxy-net/actions/runs/40845813269) passed on `9cc2c6dfa16350eee3627d173a3d3194d2eb91dd`; PR #96 was squash-merged as `2f9303a5ca6cb2ec532b6654458fd8968fc1ce69`.
- Post-merge main CI run [40846117876](https://github.com/ijoolaie/imoxy-net/actions/runs/40846117876) completed **success** on exact main SHA `2f9303a5ca6cb2ec532b6654458fd8968fc1ce69`; `npm run verify` passed.
- Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open. Existing tests prove application-level fail-closed behavior and stop subsequent TCP reads after settlement failure; they do not prove a bounded Cloudflare internal WebSocket buffer. The runtime probe remains unexecuted pending explicit approval of a disposable staging Worker, limits, and cleanup.
- No Worker deployment, route mutation, D1 write, or live probe occurred. No open PRs were present at this check.
- Next safe work: continue static review and deterministic Phase 6 tests without inventing an unsupported drain signal or imposing an unapproved download cap. Phase 6 remains active.
- Phase audit unchanged: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.

## Latest work session — 2026-10-29 (PR #97 post-merge verification)

- PR #97 (documentation-only handoff refresh) merged: https://github.com/ijoolaie/imoxy-net/pull/97.
- PR #97 exact-head CI passed on `2ba43188f48a9d4100cf4b9b01de14ef2d03dc87` (run 40847215058).
- Post-merge `main` CI passed on exact commit `f94cdb6d709f78095d49b9e9fa4890c4ac09cc24` (run 40847648565): https://github.com/ijoolaie/imoxy-net/actions/runs/40847648565.
- No open pull requests were observed at this check.
- Issue #78 remains open. Its bounded downstream WebSocket runtime probe is a plan only; no Worker, route, D1, or production resource was created or changed.
- Rechecked the official Cloudflare Workers WebSockets runtime documentation on 2026-10-29: https://developers.cloudflare.com/workers/runtime-apis/websockets/ (page says last updated 2026-10-12). The documented WebSocket surface includes synchronous `send()`, `readyState`, and close/error/message events, but does not document `bufferedAmount`, an awaitable send/drain API, or a send-buffer size. This supports continuing to treat runtime-internal buffering as unproven; it does not prove the runtime has no internal flow control.
- Cloudflare TCP Sockets documentation describes readable/writable streams and awaitable `writer.write()`, but that flow control is on the TCP side and does not itself provide a downstream WebSocket drain signal: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/.
- Remaining next step: choose and test an explicit slow/non-reading-client policy using bounded application-managed work; any live probe remains gated on explicit owner authorization and a disposable staging target.


## Latest work session — 2026-10-30 (runtime gate re-check)

- Verified current `main` at `34f6843dbac978d88040e18e4f86f24a56ec7982`; main CI run [41011354893](https://github.com/ijoolaie/imoxy-net/actions/runs/41011354893) completed successfully on that exact SHA. The run's `test` job is successful.
- No open pull requests were present at the repository check. Issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78) remains open.
- Re-read `AGENTS.md`, `src/proxy/vless-websocket-handler.js`, `docs/vless-runtime-backpressure-probe.md`, `docs/cloudflare-integration.md`, `docs/usage-event-atomicity-design.md`, and `wrangler.toml.example`.
- Current implementation still uses synchronous downstream `server.send(bytes)`; application-level serialized upstream reads and fail-closed quota settlement are covered by tests, but internal Workers WebSocket buffering is not proven bounded. Do not use undocumented `bufferedAmount` assumptions or treat a finite probe as proof of a general queue bound.
- Owner authorization to proceed with a disposable staging probe was explicitly given in the conversation on 2026-10-30. This does **not** identify/authorize a particular Cloudflare account, Worker, hostname/route, or D1 database; does not approve creating resources or changing routes; and does not approve the previously proposed 10-second / 8-MiB / 16-KiB / two-client limits. No Cloudflare credentials, local Wrangler identity, staging resources, or cleanup operator have been verified. No deployment, resource creation, route change, D1 write, or runtime probe was performed.
- Raya MCP workspace listing for `C:\\Users\\Ali\\imoxy-net-review-worktree` returned `ENOENT`; local Wrangler authentication remains unverified.
- Next: continue non-live engineering review. For live staging work, obtain the exact disposable Worker/hostname and approved hard limits/cleanup plan; do not request secrets in chat. Keep Issue #78 open. For the separate VLESS/D1 smoke gate, require a disposable D1 identifier and local authenticated Wrangler access; do not bind production D1.
- Phase audit remains evidence-based: phases 0–11 **In progress**; phase 12 **Blocked**; phase 13 **Not started**. No phase is Complete.


## Cloudflare staging audit — 2026-10-30

- Local Raya MCP was reachable; the previous missing worktree path was restored by cloning the private repository into the allowed path `C:\\Users\\Ali\\imoxy-net-review-worktree`. The clone was clean at `main`, commit `633c5a1c06f754c4bd797b7e2a2ed73a3360a9f8`. Local follow-up process execution later became unavailable because the Raya MCP server returned an initialization conflict; do not claim a fresh local test run from this session.
- Wrangler `4.151.2` authenticated to Cloudflare account `0d548671f52ffc237fb80dcb2067ac1a`. The local OAuth profile reports broad write scopes (including Workers and D1); use a dedicated least-privilege read-only token/profile for future routine inspection. No token or credential value was copied into repository files or chat.
- Read-only Worker inspection found `imoxy-net-api-staging`, Workers.dev enabled, preview URLs enabled, compatibility date `2026-10-15`, no custom domain, and no matching zone Worker route in the account's visible zones. Latest observed deployment is 100% version `4c920102-cd00-4d59-b68a-1b6e0b9ffd5c`, created `2026-10-23T06:30:38Z`; Wrangler reports its source as `Unknown (version_upload)`. Do not infer this is a release built from current main.
- Worker settings show D1 binding `IDENTITY_DB` pointing to `imoxy-net-staging-identity` (`fdf810ea-e96c-4d1f-b7af-aac6e2b746c6`). Read-only remote inspection found 11 tables and 5 migration rows. Aggregate counts observed: users 1, tenants 1, identity_accounts 1, sessions 2, audit_events 2, workflow_plans 1. These were SELECT-only; `changed_db=false`, `rows_written=0`.
- Public Workers.dev smoke observation: `GET /health` returned HTTP 200 with `{"ok":true,"service":"imoxy-net-api","stage":"bootstrap"}`. `GET /api/v1/capabilities`, `/api/v1/accounts`, and `/api/v1/auth/me` each returned HTTP 501 `not_implemented`. Current repository `worker.js` and `src/http/api.js` implement these routes and return a different health payload; therefore the live Worker is not behaviorally aligned with current main and appears to be an earlier bootstrap deployment. This is a confirmed deployment-drift signal, not proof of the exact deployed source revision.
- The account-level Workers.dev subdomain is `shilterfekanworkgd`; the tested script hostname was `imoxy-net-api-staging.shilterfekanworkgd.workers.dev`. No D1 writes, migrations, Worker uploads/deployments, route/DNS changes, secret reads, or resource creation occurred.
- Staging smoke gate remains **not executed/passing**. Do not use this Worker for VLESS, authentication, or quota runtime validation until the correct reviewed build is deployed to an explicitly confirmed isolated target and all production-separation/cleanup gates are met. Existing D1 has nonzero rows; preserve it and do not reset it.
- PR #101 was merged after exact-head CI run `41012770561` completed successfully on `8297e85a27d8fb3848a5803e7e02bf0c2bc7820c`; post-merge main CI run `41014845274` completed successfully on merge SHA `633c5a1c06f754c4bd797b7e2a2ed73a3360a9f8` (`npm run verify` job successful). Issue #78 remains open.
- Next: resolve the bootstrap-vs-main deployment drift in a separately approved deployment plan; first identify the exact Worker target/environment and prove it is disposable and isolated. Keep the current Worker and D1 unchanged until that is established. Then perform the documented smoke gate with explicit allowlisted test destination, hard limits and cleanup verification.


## Latest work session — 2026-10-30 (VLESS per-session budget)

- Owner approved the policy to terminate a VLESS session at a finite cumulative download-byte ceiling or maximum authenticated lifetime. Implementation is on branch fix/vless-session-download-budget, PR #104: https://github.com/ijoolaie/imoxy-net/pull/104.
- Handler changes require positive decimal safe-integer PROXY_MAX_DOWNLOAD_BYTES and PROXY_MAX_SESSION_DURATION_MS; invalid/missing values return HTTP 503 before WebSocket pair allocation. A download TCP chunk that would exceed the remaining session budget is rejected whole before reservation/send; a hard lifetime timer closes the WebSocket and upstream resources. Existing reserve-before-forward, settle-after-forward, and ambiguous reservation retention semantics remain unchanged.
- Added Node tests for missing/invalid settings, a non-reading downstream peer, exact byte boundary, and session-duration cleanup. Full local Node suite passed on 2026-10-30: 187/187 tests, 0 failures, exit code 0 (13.0 seconds). The run included the new VLESS budget tests and Worker route regression. Node-only timer handles use optional unref(); Cloudflare numeric timer handles are unaffected. The earlier PR CI failure was a stale worker.test.js fixture expectation; the fixture now supplies the required session settings and is covered by the rerun.
- Updated decision log, acceptance plan, parity matrix, reference baseline, roadmap and runtime probe documentation. Added required VLESS settings to Cloudflare integration docs. Duplicate appended documentation blocks were removed during local cleanup.
- This policy bounds cumulative bytes and lifetime per session only. It does not prove Worker-internal WebSocket buffer size or a global bound across unlimited concurrent sessions. Nova slow-client behavior remains uncharacterized.
- No Cloudflare values were configured; no Worker deployment, route/DNS change, D1 mutation, or live runtime probe occurred. The existing bootstrap staging Worker and non-empty D1 remain untouched. Issue #78 stays open.
- Local full-suite verification passed: 187/187 tests, 0 failures; worker.js syntax check passed; git diff --check passed. PR-head CI run 41037356708 completed success on exact commit 7c320f42e85102ee0c7fffe0cc62103172227352, including npm run verify. PR #104 remains open pending final review/merge. Next: define aggregate concurrency policy and complete the disposable Worker/D1 runtime gates; no live resources were changed.


## Post-merge verification — PR #104 (2026-10-30)

- PR #104 is merged into main as b5c44b16132c9f540de16ab9d4ce54ab5fa01fa4: https://github.com/ijoolaie/imoxy-net/pull/104.
- Exact PR-head CI run 41037647099 passed on 1a2e18948a41c7cb5f79ec72368e263451c603c3. Post-merge main CI run 41037834214 passed on the exact merge commit b5c44b16132c9f540de16ab9d4ce54ab5fa01fa4; npm run verify succeeded.
- Local full Node suite passed 187/187 with 0 failures; node --check worker.js and git diff --check passed.
- Issue #78 remains open. The merged per-session budget policy requires PROXY_MAX_DOWNLOAD_BYTES and PROXY_MAX_SESSION_DURATION_MS and is fail-closed when either is missing/invalid. No values were configured in Cloudflare.
- This is not proof of Worker-internal WebSocket buffering or aggregate bounds across concurrent sessions. No Worker deployment, route/DNS change, D1 mutation, or live probe occurred. The bootstrap staging Worker and its non-empty D1 remain untouched.
- Next gates: define aggregate concurrent-session resource policy; identify and prove an isolated disposable Worker/hostname and disposable D1; select approved byte/time/frame/concurrency limits and cleanup; then run the controlled slow-reader and Worker/D1 smoke probes. Phase 6 remains In progress and Phase 12 remains Blocked.


## Latest work session — 2026-10-30 (VLESS session admission audit)

- Starting main: `6b19f5762bc17b31d1202f3cd2995b58c47cda11`, PR #103 merge. PR #103 is merged; push CI run `41038724536` completed **success** on that exact main commit.
- Audited current `src/proxy/vless-websocket-handler.js`, `src/storage/d1-store.js`, account schema, D1 quota reservation implementation, and existing VLESS tests.
- Confirmed `proxy_accounts.max_connections` is present in migration 0001 and mapped to `account.maxConnections` by the D1 adapter, but the VLESS handler never reads `maxConnections`. No account-level concurrent-session cap is enforced.
- Confirmed the handler allocates request-local session state. A Worker-global `Map` cannot coordinate across isolates/instances and is not durable; do not use it for admission.
- The per-session download-byte/lifetime limits merged in PR #104 do not bound concurrent sessions or installation-wide aggregate resource use.
- Opened Issue #106: https://github.com/ijoolaie/imoxy-net/issues/106.
- Proposed first implementation: D1-backed active-session leases with a single conditional `INSERT ... SELECT` write that checks the active account, optional per-account `max_connections`, and mandatory positive installation-wide `PROXY_MAX_CONCURRENT_SESSIONS` in the same statement. Acquire before upstream TCP dial; release idempotently on every close path; ambiguous leases remain until expiry after a bounded grace. Durable Objects remain a per-account fallback only if real D1 concurrency/latency evidence requires them; no global singleton.
- This is a design/documentation checkpoint only. No session lease migration, handler code, Worker binding, Cloudflare resource, D1 database, route, DNS, or deployment was changed. Real D1 concurrency and Worker runtime gates remain pending.
- Updated the session-admission design, decision log, acceptance plan, architecture, parity matrix, reference baseline, and roadmap on branch `docs/vless-session-admission-design`.
- Current active phase: Phase 6 — Subscription/proxy compatibility. Per-account and installation-wide concurrent-session admission remain unimplemented; downstream Worker-internal WebSocket buffering remains unproven; no Nova parity claim is made.
- Next: review the exact documentation diff, obtain exact-head CI, then implement migration + atomic D1 lease acquire/release and handler lifecycle integration with SQLite-backed actual-SQL concurrency tests. Only after that, run the controlled real-D1/Worker gate against a proven disposable target. Preserve the bootstrap staging Worker and its non-empty D1.


## Latest work session — 2026-10-30 (VLESS concurrent-session admission implementation)

- Starting main: `8bc11df4aa6c5a8ae77d28a3b77312c35c33b8b9`.
- PR #108 merged: https://github.com/ijoolaie/imoxy-net/pull/108.
- Exact PR-head CI run `41040392148`: **success** on `ed7d27a92907157260552c2f868eb151221f7fa4`.
- Push CI run `41040222126`: **success** on the same head.
- Post-merge main CI run `41040478912`: **success** on merge commit `8bc11df4aa6c5a8ae77d28a3b77312c35c33b8b9`.
- Added migration `0007_proxy_active_sessions.sql` with account FK `ON DELETE RESTRICT`, active-lease timestamps and expiry indexes.
- Added D1 methods `acquireProxySession`, `releaseProxySession`, and bounded `cleanupExpiredProxySessions`. Admission uses one parameterized conditional `INSERT ... SELECT` that checks account state/expiry, positive per-account `max_connections`, and mandatory installation-wide `PROXY_MAX_CONCURRENT_SESSIONS` in the same SQL statement.
- VLESS handler now acquires a lease before outbound TCP dial. Lease expiry includes the initial handshake/setup timeout, maximum session duration and required `PROXY_SESSION_LEASE_GRACE_MS`. Release is one-shot and occurs after local/upstream cleanup; ambiguous admission/release remains fail-closed and can leave a lease counted until expiry.
- Automated tests now cover per-account/global caps, last-slot racing attempts, NULL/zero behavior, disabled/expired accounts, duplicate/conflicting IDs, expiry and bounded cleanup, restrictive account deletion, admission-before-dial, denial/error, setup failure, session timeout, quota/download termination, and release failure.
- Exact-head PR CI, same-head push CI, and post-merge main CI all pass. This validates the repo test suite and SQLite-backed actual adapter SQL, **not** real Cloudflare D1 concurrency or Worker runtime behavior.
- New required non-secret Worker settings: `PROXY_MAX_CONCURRENT_SESSIONS` and `PROXY_SESSION_LEASE_GRACE_MS`, in addition to the existing byte/lifetime settings. No values have been configured in Cloudflare.
- Issue #106 remains open for real disposable D1/Worker validation and Nova reference semantics. `max_connections = 0` is currently fail-closed in imoxy; the pinned Nova 5.0.0 meaning is not verified and no parity claim is made.
- Issue #78 remains open for downstream WebSocket buffering/resource behavior.
- No Cloudflare Worker was deployed; no D1 database was migrated or mutated; no route/DNS changes or production setting changes occurred. The bootstrap staging Worker and its non-empty D1 remain untouched.
- Current phase: Phase 6 — Subscription/proxy compatibility, In progress. Phase 12 remains Blocked.
- Next: validate the atomic admission race, expiry and release against a separately provisioned disposable Cloudflare D1 and controlled Worker. Do not use the bootstrap staging target. Before that live gate, establish the exact Nova 5.0.0 `max_connections = 0` semantics from an authoritative reference or black-box scenario.


## Latest work session — 2026-10-30 (Cloudflare disposable target audit)

- Main at start: `099422495b0820a4d548c98fb32f1530a7a76d44`.
- PR #109 merged the implementation status and roadmap documentation. Exact-head CI run `41040744220` passed; post-merge main CI run `41040854968` passed on `099422495b0820a4d548c98fb32f1530a7a76d44`.
- Performed read-only Cloudflare account, Worker script, Worker binding and D1 metadata inspection.
- Found `imoxy-net-api-staging` bound to `imoxy-net-staging-identity` through `IDENTITY_DB`; Cloudflare reports 11 tables. This is the bootstrap staging target and remains untouched.
- No separate imoxy test Worker/D1 pair was present in the listed resources. Other D1 databases belong to separately named resources or lack evidence of being disposable; they are not candidates.
- Updated `docs/nonprod-vless-smoke-gate.md` with the inventory and explicit no-mutation decision. Added the same blocker to Issue #106.
- No D1 query, migration, seed, delete, Worker setting update, deploy, route/DNS change, or resource creation occurred during this audit.
- PR #108 implementation remains merged and automated CI remains green. Issue #106 stays open because real D1 concurrency/expiry and Worker runtime gates cannot safely run without an explicitly isolated disposable target. Nova `max_connections = 0` semantics are also unverified.
- Next: identify/provision a dedicated disposable Worker + D1 pair with explicit authorization and cleanup proof; then run the D1 race/expiry tests and controlled Worker lifecycle smoke. Until then, do not use the existing staging or unrelated databases.


## Latest work session — 2026-10-30 (VLESS lease cleanup hardening)

- Main at start: `4df6762fc34980457e275238fd380f39e6606894`.
- PR #111 merged: https://github.com/ijoolaie/imoxy-net/pull/111.
- Exact PR-head CI run `41041117714`: **success** on `3d5a8871729a2eeaf7676b5c33139459482414b0`.
- Same-head push CI run `41041095771`: **success**.
- Post-merge main CI run `41041196795`: **success** on `4df6762fc34980457e275238fd380f39e6606894`.
- New admission best-effort prunes at most 100 expired session leases. Expired rows are excluded from the capacity predicates even if pruning fails. Requests with an expiry at/before admission time are rejected.
- Added SQLite-backed test coverage for opportunistic cleanup and bounded pruning. Full repository verification passes.
- Existing Cloudflare inventory blocker remains: no dedicated disposable imoxy Worker/D1 pair; `imoxy-net-api-staging` remains bound to the 11-table `imoxy-net-staging-identity` database and untouched.
- No live D1/Worker runtime test, Cloudflare mutation, deployment, migration, route/DNS change, or environment-setting change occurred.
- Issue #106 remains open for live disposable D1/Worker tests and Nova `max_connections = 0` semantics. Issue #78 remains open for downstream Worker buffering behavior.
- Next: only continue to live runtime validation after an explicitly authorized disposable Worker and D1 target is available. Otherwise continue static/code and reference analysis without touching current Cloudflare resources.


## Final verification checkpoint — 2026-10-30

- Current main: `63ea239fe08ad32bffbc1a5171ed79ee3262441a`.
- PR #112 merged the lease-cleanup design, acceptance, decision-log and HANDOFF updates.
- Exact-head PR CI run `41041302739`: **success**. Post-merge main CI run `41041363490`: **success**.
- The full `npm run verify` workflow completed with **198 tests passed, 0 failed**.
- No open PRs remain. Open issues: #106 (real D1/Worker admission validation and Nova zero-cap semantics) and #78 (downstream Worker WebSocket buffering/resource bounds).
- Cloudflare read-only inventory still shows no dedicated disposable imoxy Worker/D1 pair. Existing `imoxy-net-api-staging` and its 11-table `imoxy-net-staging-identity` D1 remain untouched; unrelated D1 databases are not candidates.
- Phase 6 remains In progress; Phase 12 remains Blocked. Do not mark session concurrency or Nova parity complete until the live D1/Worker and reference gates pass.


## Latest work session — 2026-10-30 (Nova concurrent-session reference audit)

- Current main at start: `b69a6e8ab14c32074fcc51d3a765ad50bd377b4b`.
- Inspected pinned Nova Proxy 5.0.0 metadata, README, GUIDE and package manifest at `ad2116aa89f8c7db8248f8142c1432900d835eb7`.
- README and GUIDE do not document `max_connections`, a per-account simultaneous-connection limit, or the meaning of zero. `version.json` marks the shipped 1.3 MB worker artifact as protected and publishes its checksum; no runtime semantics were inferred from that artifact.
- Added REF-032 to cover NULL/0/1/2 caps, parallel sessions, exact capacity+1, close/reconnect, expiry/revocation and behavior after lowering a cap.
- Conclusion: Nova zero-cap behavior and the unit counted by the limit remain **Not documented / Not run / Not verified**. Imoxy's current zero=deny-all rule remains an explicit imoxy fail-closed policy only.
- No reference deployment was available or exercised; no protected source was copied; no Cloudflare resources were changed.
- Next: obtain a disposable reference instance at the pinned version and execute REF-032. Until then, keep Issue #106 open and do not claim Nova parity.


## Latest work session — 2026-10-30 (reference audit and issue status)

- Main at start: `b69a6e8ab14c32074fcc51d3a765ad50bd377b4b`.
- PR #114 merged as `cb53e9b1c99aa12ad81d6278f181563998d3e632`: https://github.com/ijoolaie/imoxy-net/pull/114.
- PR-head CI run `41067890695` passed on `b27fcc1b2d60c5386b0417f65e00473e7340b254`; post-merge main CI run `41067985094` passed on the exact merge commit.
- Pinned Nova 5.0.0 README and GUIDE do not document `max_connections`, what one connection represents, or zero semantics. The pinned version metadata marks the shipped worker artifact as protected. No source-derived or runtime parity claim was made.
- Added REF-032 for account caps NULL/0/1/2, concurrent VLESS sessions, capacity+1, slot release/reconnect, expiry/revocation and behavior after lowering a cap. Evidence register and reference baseline now classify these semantics as Not documented / Not run / Not verified.
- Updated Issue #106 with the reference evidence. Imoxy's current zero=deny-all remains a deliberate fail-closed implementation policy, not an established Nova behavior.
- Updated Issue #78 to record that D1-backed account/global admission leases now exist in repository code; the issue remains open for slow-reader behavior, application-managed queue proof and live Worker/D1 validation. The internal Workers WebSocket send-buffer remains unmeasured.
- Automated concurrency evidence is still SQLite-backed: 20 concurrent adapter attempts for one remaining account slot admit exactly one. This is not evidence of Cloudflare D1's live concurrency behavior.
- No disposable Nova reference runtime or imoxy Worker/D1 pair is available. Existing bootstrap staging and unrelated Cloudflare resources remain untouched. No deployment, D1 mutation, route/DNS change, or environment setting change occurred.
- Current main CI is green. No open PRs remain at this checkpoint. Open issues #106 and #78 remain correctly open. Phase 6 remains In progress; Phase 12 remains Blocked.
- Next: obtain an explicitly disposable reference runtime and separately authorized imoxy Worker/D1 pair. Execute REF-032 and the D1/slow-reader gates only there; do not infer results or touch existing staging resources.
## 2026-10-30 — VLESS session-lease code review (no code change)

- Re-read AGENTS.md, current HANDOFF.md, docs/roadmap.md, docs/decision-log.md, migrations/0007_proxy_active_sessions.sql, src/storage/d1-store.js, src/proxy/vless-websocket-handler.js, and test/quota-reservation-store.integration.test.js.
- Reviewed the admission statement: a single parameterized INSERT ... SELECT checks active/unexpired account state, per-account unexpired lease count, installation-wide unexpired lease count, and inserts the unique session ID in one SQL statement. It does not use a read-then-insert capacity check. The follow-up SELECT only classifies the result/idempotent duplicate; a false negative there would deny service, not over-admit. D1 official documentation describes each database as single-threaded, processing queries one at a time, and routes writes to the primary. This supports the serialization rationale for the conditional write, but does not replace a live D1 race test.
- Timestamp review: account expiry is normalized by shared validation to canonical UTC ISO strings; VLESS lease createdAt, expiresAt, and admission at are generated with toISOString(). Lexical SQL comparisons are therefore consistent for current production call paths. The lower-level store methods accept any Date.parse()-valid timestamp, so callers bypassing the shared handler/service contract must continue to provide canonical UTC values; no current external call path was found.
- Lifecycle review: the lease deadline includes handshake timeout + configured maximum session duration + grace; the session timer starts after successful setup. Close paths close/cancel upstream resources before attempting a single idempotent lease release. Ambiguous release retains capacity until expiry. Expired leases are excluded in the admission predicate even if bounded cleanup fails. Lowering an account cap only blocks new admissions; existing leases are not evicted, matching the documented policy.
- Session identity: the primary key prevents a different session from reusing an ID with different account/timestamps; an exact duplicate is treated idempotently. The handler uses crypto.randomUUID() by default. The safety assumption is uniqueness of that opaque ID; no evidence of a practical collision was found.
- SQLite-backed tests cover exact account/global caps, NULL/zero account caps, disabled/expired accounts, duplicate/conflicting IDs, idempotent release, stale expiry cleanup, account-delete FK protection, and 20-way concurrent admission. These are not Cloudflare D1 tests.
- Review outcome: no confirmed code defect found in the inspected admission/lease lifecycle. No code change or deployment was justified. Keep Issue #106 open for real disposable D1 race/expiry tests and Nova REF-032; keep Issue #78 open for slow-reader/backpressure and disposable Worker runtime proof.
- Current main is ea066417ac22d0da1062732dae1b0b7c5cc47edb. PR #115 is merged. The available combined-status query returned no status entries for this SHA and the commit-workflow lookup only exposes PR-triggered runs; therefore this session does not independently certify CI for the latest main commit. The previous recorded main CI evidence must not be generalized to this new commit.
- No Cloudflare resources, D1 data, environment variables, routes, DNS, or deployments were changed.

## 2026-10-30 — PR #116 merged; runtime gates unchanged

- PR #116 (`docs(review): record VLESS session lease audit`) was squash-merged into `main` as `373948bc8f8495d2e8a970bf618355e2dd57b0f8`.
- Exact PR-head CI run `41069802838` completed successfully; job `test` and step `npm run verify` both succeeded. This is PR-head CI evidence. The connector did not return a post-merge workflow run for the squash commit, so do not describe this as post-merge CI.
- No open PRs remained at this checkpoint. Issues #106 and #78 remain open; the focused review findings and remaining runtime requirements were added as issue comments.
- No confirmed defect was found in the D1 admission/lease code. The live disposable D1 race/expiry test, Nova REF-032, and real disposable Worker slow-reader/backpressure probe remain release gates.
- No Cloudflare resources, existing staging data, environment settings, routes, DNS, or deployments were changed.

## Disposable Cloudflare D1 validation — 2026-10-30

- Created isolated temporary resources `imoxy-net-validation-db` and `imoxy-net-validation-worker`; the Worker had only a D1 binding to the disposable database. Existing staging and unrelated resources were not changed.
- Real Cloudflare D1 API/primary tests used the production account/session schema and the production conditional `INSERT ... SELECT` admission predicate. 20 concurrent attempts with account cap 3 admitted exactly 3; 12 concurrent attempts across two accounts with global cap 2 admitted exactly 2.
- Release changed one row; repeated release changed zero; a new admission succeeded after release. Disabled, expired, and zero-cap accounts admitted no new session. Bounded expiry cleanup removed one expired lease. Deleting an account with a live lease was rejected by the restrictive FK.
- The temporary Worker upload and its D1 binding were verified in Cloudflare settings, but invocation was blocked: outbound requests to its `workers.dev` URL returned 403 from the available execution environment. Thus this is direct real-D1 API evidence, not an end-to-end production Worker test. No WebSocket slow-reader/runtime-buffer probe was completed.
- Both temporary resources were deleted and resource-list checks confirmed their absence. No staging or existing user resource was modified.
- Evidence and limitations: [docs/d1-runtime-validation-2026-10-30.md](docs/d1-runtime-validation-2026-10-30.md). Issue #106 and #78 remain open; Nova REF-032 remains unverified. Do not mark either issue complete.

## PR #118 merge and CI verification — 2026-10-30

- PR #118 merged as `dfa2d1a7dcf2fa6955857de544e56299e156e86d`: https://github.com/ijoolaie/imoxy-net/pull/118.
- Exact PR-head CI run `41074368112` passed on `c9135e6d49adffc2bb33d15d5e55a6104b33326b`; job `test` and `npm run verify` passed.
- Post-merge main CI run `41074443500` passed on the exact merge commit `dfa2d1a7dcf2fa6955857de544e56299e156e86d`; job `test` and `npm run verify` passed.
- PR #118 changed documentation only. Issues #106 and #78 remain open; the Worker invocation and slow-reader gates remain unresolved.


## 2026-10-30 — VLESS downstream serialization test and evidence correction

- Inspected `worker.js` and `test/worker.test.js`: the production entrypoint already dispatches `/proxy/vless` through `createVlessWebSocketHandler()` before static assets/API. The older 2026-10-28 parity-matrix architecture note claiming there was no Worker proxy route was stale; it is corrected in the current matrix. This route is still a restricted prototype, not Nova parity.
- Inspected the full downstream pump: each TCP `reader.read()` is followed by the complete `reserveAndSettle()` operation; `server.send()` is synchronous and settlement is awaited before another read. Whole chunks exceeding the remaining `PROXY_MAX_DOWNLOAD_BYTES` are rejected before send. Send/settlement failures close the session.
- Added a deterministic test with a non-consuming fake WebSocket and a held quota-settlement promise. It asserts that a second upstream read/send cannot proceed until the first send's settlement completes, and that the next over-budget chunk is rejected before reservation/send. Exact-head CI run `41077052986` passed on `a401fdf34157c9c88449a4d6108e852652024dc6`; job `test` and `npm run verify` passed.
- Derived bound: application-submitted downstream payload is at most `PROXY_MAX_DOWNLOAD_BYTES + 2` bytes per admitted session (two-byte VLESS response header), and at most `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)` across admitted sessions. This is not a measurement of internal WebSocket buffering, framing, runtime copies, or total Worker memory.
- Real disposable D1 direct-SQL admission tests are complete (see `docs/d1-runtime-validation-2026-10-30.md`); production D1Store/Worker invocation and the slow-reader Cloudflare runtime probe remain open because the temporary Worker URL was inaccessible (HTTP 403). Nova REF-032 remains unrun. No staging/production resources were changed in this continuation.


## PR #121 merge and post-merge verification — 2026-10-30

- PR #121 merged by squash as `5f63b03f4bbee2dfd473317b22166b1bce5206b3`: https://github.com/ijoolaie/imoxy-net/pull/121.
- Final PR-head `96db6e27a6242b36957a6f6b345494644017d7c8` passed exact-head CI run `41077238216`; job `test` and `npm run verify` passed.
- Post-merge main CI run `41077371663` passed on the exact merge commit `5f63b03f4bbee2dfd473317b22166b1bce5206b3`; job `test` and `npm run verify` passed.
- Main is at `5f63b03f4bbee2dfd473317b22166b1bce5206b3`. No open PRs remained immediately after merge. Issues #106 and #78 remain open for production Worker invocation, runtime slow-reader evidence and Nova REF-032.

## PR #123 — D1Store SQLite integration coverage — 2026-10-30

- Reviewed the current src/storage/d1-store.js, test/d1-store.test.js, VLESS handler configuration, migration 0007, and the existing disposable-D1 validation evidence.
- Identified a concrete test-coverage gap: existing D1Store unit tests use a SQL-call mock, so they do not execute the production admission SQL through the JavaScript wrapper against a SQL engine.
- Added test/d1-store-sqlite.test.js using Node 22's built-in node:sqlite, the checked-in initial schema, migration 0007, and a small D1-compatible adapter. It exercises per-account and installation caps, duplicate lease idempotency, expiry cleanup, release, and restrictive account deletion through createD1Store.
- Exact PR-head CI run 41080879160 passed on 78d988687e508944271ad9babfa042b9bc9f04b5; job test and step npm run verify passed. This is SQLite wrapper evidence only, not Cloudflare D1 concurrency, Worker invocation, or Nova REF-032 evidence.
- PR #123 is open for review: https://github.com/ijoolaie/imoxy-net/pull/123. No merge or post-merge CI is claimed here.
- No Cloudflare resources, staging data, bindings, routes, or deployments were changed. Issues #106 and #78 remain open for their separate runtime/reference gates.
- Next: review PR #123's exact diff and CI, merge only while the exact head remains unchanged and checks are green, then verify post-merge main CI. Continue investigating lease/configuration edge cases only if code evidence identifies a defect.

## PR #123 merge and post-merge verification — 2026-10-30

- PR #123 merged by squash as 969f96b1ca1e15befd9ee9cbf5dbf025f391b429: https://github.com/ijoolaie/imoxy-net/pull/123.
- Final PR-head ed4d71916ad729e9f9ad6c462a0747c5beabf860 passed exact-head CI run 41081184391; job test and npm run verify passed.
- Post-merge main CI run 41081292762 passed on the exact merge commit 969f96b1ca1e15befd9ee9cbf5dbf025f391b429; job test and npm run verify passed.
- Main is now at 969f96b1ca1e15befd9ee9cbf5dbf025f391b429. The D1Store SQLite wrapper gap is now covered by test/d1-store-sqlite.test.js. This does not replace live D1 concurrency/Worker runtime or Nova REF-032 evidence; Issues #106 and #78 remain open.
- No Cloudflare resources, existing staging data, environment settings, routes, DNS, or deployments were changed.

## 2026-10-31 — deployed D1Store wrapper validation and Issue #106 closure

- Updated the local checkout to the exact current main commit `c3a8cc8f0490ec2e3744d87eb6ab305dcc2d061b`. Full Node suite passed **201/201**; `node --check worker.js` passed.
- Created a disposable D1 database `imoxy-probe-d1-20261031` (UUID `991f6736-e3cd-4fcf-b1e9-1df76a70b2df`) in WEUR, with read replication disabled. Applied checked-in migrations `0001_initial.sql` and `0007_proxy_active_sessions.sql`.
- Created a dedicated Worker `imoxy-d1-wrapper-probe-20261031`, bound only to that database. It imported the exact `src/storage/d1-store.js` module from the main checkout and invoked `createD1Store(env.DB)` methods through deployed Worker HTTP requests.
- Runtime results: 20 concurrent account-cap attempts at cap 3 admitted exactly 3; 12 concurrent attempts across two NULL-cap accounts at installation cap 2 admitted exactly 2. Exact duplicate retry was idempotently allowed; same ID with a different account was rejected as a conflict. Release returned true then false on repeat. Disabled, expired and zero-cap accounts were denied. The wrapper removed one stale lease. A live lease blocked account deletion through the restrictive FK; after release deletion succeeded. Final active lease count was zero.
- D1 API query metadata showed `served_by_primary=true` in WEUR/AMS. This is real Cloudflare D1 + deployed Worker evidence for the D1Store wrapper, not merely direct SQL or SQLite evidence.
- Cleanup: Worker deletion and D1 deletion both returned HTTP 200. Follow-up inventories confirmed the exact Worker and database were absent. Existing staging and unrelated resources were not changed.
- Issue #106 was updated with this evidence and closed as completed. Production VLESS limits remain unset. This does not exercise the full VLESS WebSocket route or prove Nova REF-032; Issue #78 remains open for slow-reader/backpressure and runtime-internal WebSocket buffer evidence. Phase 6 remains In progress; Phase 12 remains Blocked.


## 2026-10-31 — post-PR #125 runtime-gate review

- Starting main: `a475abd750de75c171a2347c778fca4ba78ebc08` (PR #125 merge commit). PR #125 recorded the deployed D1Store wrapper validation follow-up; main CI run `41170509146` completed **success** on this exact commit, including `npm run verify`. No open pull requests were present at this review; Issue #78 is the remaining open runtime blocker, while Issue #106 is closed.
- Re-read `AGENTS.md`, the current `HANDOFF.md`, roadmap, acceptance plan, backpressure probe, non-production smoke gate, Issue #78, and the current `src/proxy/vless-websocket-handler.js` implementation.
- Confirmed the current application-side controls: initial VLESS request buffering is capped at 64 KiB; queued client→TCP WebSocket message data is capped at 1 MiB; TCP download reads are sequential and each non-empty chunk is reserved, synchronously submitted with `server.send()`, and settled before the next TCP read; cumulative per-session download bytes are capped by required `PROXY_MAX_DOWNLOAD_BYTES`; and admitted sessions are bounded by the required installation-wide D1 lease ceiling.
- The application-submitted downstream payload therefore has a code-derived configured ceiling of `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)` bytes, excluding Cloudflare-internal buffering, framing, runtime copies, and other Worker memory. The 1 MiB queue constant applies to client→TCP uploads, not the downstream WebSocket send buffer. The Workers send API remains synchronous and no documented drain/buffer telemetry has been established. Do not reintroduce `bufferedAmount` or describe the runtime-internal send buffer as bounded.
- Issue #78 remains open. The prior disposable Worker invocation attempt was blocked by HTTP 403; that Worker and its D1 were deleted and absence verified. The existing `imoxy-net-api-staging` Worker and its non-empty `imoxy-net-staging-identity` D1 are not disposable and remain untouched. The previously recorded authorization to perform a disposable slow-reader probe does not identify an approved target, hostname, byte/time/frame/concurrency ceilings, or cleanup operator; those operational details must be established before creating or using resources.
- No source code, Cloudflare resources, bindings, routes, DNS, environment settings, or deployments were changed in this review. No new tests were run locally; the exact current main commit's CI result above is the observed verification evidence.
- Current active phase: Phase 6 — Subscription/proxy compatibility (**In progress**). Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No Nova REF-032 or full VLESS Worker route parity claim is made.
- Next concrete step: establish an actually reachable, explicitly disposable Cloudflare Worker target with approved hard probe limits and cleanup ownership; then execute the reading-client baseline and non-reading-client slow-reader probe against the actual VLESS route, capturing send latency/errors, received bytes, close behavior, quota reservation/settlement, and resource cleanup. Keep Worker-internal buffer boundedness **unproven** unless an authoritative runtime signal exists. In parallel, obtain a legally approved disposable Nova 5.0.0 reference instance for REF-032; do not infer `max_connections = 0` semantics from imoxy's fail-closed policy.


## 2026-10-31 — disposable generic WebSocket runtime observation

- Starting main: `1cba0d125c96a6e568c37c9f91c01052d4c3e996` (PR #126 merge); no open PRs observed. The exact-head main CI run `41176577706` was previously verified successful on this commit.
- Executed a newly created, standalone Worker on the account's existing workers.dev subdomain. It had no D1 binding, custom hostname/route, third-party TCP destination, or connection to the existing staging Worker. The temporary Worker sent fixed 16 KiB binary frames, capped at 256 frames / 4 MiB per connection and 9 seconds; two sequential connections stayed within the previously approved 8 MiB combined budget.
- Baseline client received exactly 4,194,304 bytes over 256 frames; Worker reported 2,570 ms send duration and zero send exceptions. A second client deliberately did not call ReceiveAsync for five seconds, then resumed and received the same 4,194,304 bytes; Worker again reported 2,570 ms send duration and zero send exceptions. The observed Worker-side `bufferedAmount` was zero and did not provide a useful queue measurement.
- Important scope limitation: this was a generic WebSocket sender, not the actual `/proxy/vless` handler. It did not exercise VLESS authentication/parsing, outbound DNS/TCP, D1 quota reservation/settlement, session admission leases, or real proxy close/error paths. Frames did not include sequence numbers and per-send latency distributions/log metrics were not captured. Therefore this is a bounded generic-runtime observation only; it does not satisfy the full probe or non-production VLESS/D1 smoke gate.
- Cleanup: the disposable Worker was deleted and absence verified in the account's Worker inventory; only `imoxy-net-api-staging` and `iran-price-scout` remained. The temporary local PowerShell client was deleted. No existing staging resource was changed.
- Issue #78 was updated with the observed result and residual risk. Worker-internal WebSocket buffer boundedness remains **unproven**; Issue #78 remains open. Phase 6 remains **In progress** and Phase 12 remains **Blocked**.
- Next: design a controlled invocation of the actual VLESS handler using a dedicated disposable Worker + D1 + controlled TCP destination, with separately reviewed credentials, limits and cleanup. Do not reuse the existing staging Worker/D1 or the generic probe result as evidence of proxy-path correctness.


## PR #127 verification — 2026-10-31

- PR #127 `docs(runtime): record bounded generic WebSocket observation` merged as `0ead7b51ce090dc136a5401fe67df83d17c292a1`: https://github.com/ijoolaie/imoxy-net/pull/127.
- Exact PR-head CI run `41177777416` passed on `a712da989f37eefef83d08513a2af68526dba7fc`; post-merge main CI run `41177821676` passed on the exact merge commit `0ead7b51ce090dc136a5401fe67df83d17c292a1` (`npm run verify`).
- Issue #78 was updated with this evidence. No code or runtime resources changed in PR #127; it is a documentation/evidence correction only.
- Current next gate: actual VLESS route validation still requires a separately isolated disposable Worker + D1 + test credential + controlled TCP destination. The previous generic WebSocket test is not evidence for that path. Existing staging resources remain off-limits. Obtain explicit approval for the disposable D1 and controlled TCP test target before provisioning. Issue #78 remains open; Phase 6 In progress; Phase 12 Blocked.


## VLESS handler 1101 diagnostic — 2026-10-31

- Starting `main`: `329077f09d961539ec89df4e4eedb631ed23434d`; no open PRs were present. Working branch: `docs/vless-1101-runtime-diagnostic-20261031`.
- The first isolated VLESS route probe was initially reported as HTTP 500 `1101`; subsequent Workers Logs review showed the diagnostic wrapper also returned the handler's intentional `null` for Cloudflare root-path probes, producing `Incorrect type for Promise: the Promise did not resolve to 'Response'.` Do not attribute that root-path 1101 to the handler. The corrected wrapper's plain HTTP route preflight returned the expected 426; one handler WebSocket handshake succeeded, but repetitions were inconsistent.
- A real .NET `ClientWebSocket` upgrade to `/proxy/vless` returned Cloudflare HTTP 500 `error code: 1101`. No VLESS payload was sent, so protocol authentication, D1, outbound TCP, quota reservation/settlement, and relay behavior were not reached.
- Control: a separate minimal Worker using the same native `WebSocketPair`, `server.accept()`, and `Response(status: 101, webSocket)` pattern successfully connected and echoed a message from the same account/runtime. This narrows the failure to the handler's upgrade execution path or its interaction with the runtime; it does not identify the exact exception.
- Workers Observability query returned no event rows for the diagnostic Worker, so no runtime stack was captured. Do not claim a root cause or mark Issue #78 resolved.
- Cleanup: both temporary Workers were deleted; inventory confirmed only `imoxy-net-api-staging` and `iran-price-scout` remained. All temporary PowerShell scripts were removed. No D1 database was created and no existing staging resource was changed.
- Issue #78 received diagnostic comment `6540326949`. Issue remains open.
- Next step: add temporary, narrowly scoped instrumentation around the handler's pre-upgrade stages and the returned 101 response; repeat handshake only. Do not send VLESS payload until handshake succeeds. Then proceed to the authorized isolated D1/TCP test sequence with the existing strict byte/time/concurrency limits.
- This session made no application-code or deployment changes. No CI result is implied by this documentation update; PR-head and post-merge main CI must be verified separately.


## Verified follow-up — PR #129 and VLESS pre-upgrade control (2026-10-31)

- PR #129 `docs(proxy): record isolated VLESS 1101 diagnosis` merged as `ee1d324b404ac1b24170cb9b38aef8afd77ce11f`: https://github.com/ijoolaie/imoxy-net/pull/129.
- Exact PR-head CI run `41178670494` passed on `840136f8630cfaa2a8a7b91f276c4fbf4dc18261`; the `npm run verify` step succeeded. Post-merge main CI run `41178891571` passed on the exact merge commit `ee1d324b404ac1b24170cb9b38aef8afd77ce11f`; its `npm run verify` step succeeded.
- Issue #78 received follow-up comments `6540326949` (full-handler 1101 diagnostic) and `6540384132` (pre-upgrade primitive control). Issue #78 remains open.
- Additional control: a standalone Worker without application imports exercised native WebSocketPair, accept, the handler-shaped session state and `sessionClosed` Promise, the `closeSession` cleanup shape, message/close/error listeners, and a 10-second timer. A real .NET ClientWebSocket connected and echoed binary data successfully. This shows those basic primitives work in the account/runtime; it does not identify the full handler's failing operation and does not exercise VLESS, D1, TCP, quota, leases, or relay.
- A separate experimental copy with an injected HTTP-200 upgrade factory returned 1101 even on a plain HTTP request. Because that copy's module-upload/startup path was not independently validated, treat the run as **inconclusive and discarded**; it is not evidence about the production handler. Its Worker and temporary scripts were deleted.
- Cleanup verified only `imoxy-net-api-staging` and `iran-price-scout` remained. All temporary PowerShell scripts were removed. No D1 database, TCP destination, existing staging resource, route or DNS record was changed in these diagnostics.
- Next: stage-by-stage instrumentation of the actual handler using a verified module bundle and an explicit plain-HTTP preflight first; then isolate the 101 response path. Do not send VLESS payload until a valid handshake succeeds. Issue #78 and Phase 6 remain In progress; Phase 12 remains Blocked.


## Diagnostic-wrapper correction and repeatability status — 2026-10-31

- A Workers Logs query identified a concrete source of the earlier 1101 reports: the disposable Worker wrapper returned the VLESS handler's `null` result directly for non-matching paths. Cloudflare's workers.dev root probes invoke `GET /`; the handler intentionally returns `null` outside `/proxy/vless`. Workers Logs recorded `Incorrect type for Promise: the Promise did not resolve to 'Response'.` This is a wrapper bug and must not be attributed to the VLESS handler.
- A corrected wrapper converts an unhandled `null` to an explicit 404. With the current handler module and injected in-memory store/quota adapters, HTTP `GET /` returned 404 and a non-upgrade `GET /proxy/vless` returned 426 `websocket_upgrade_required` as expected.
- One isolated ClientWebSocket run against the actual handler with fake store/quota and TCP disabled reached Open state and closed normally. Later repeated handshake attempts against subsequent diagnostic Workers were not consistent (HTTP 1101/timeout); Workers Logs did not show a matching WebSocket invocation for those attempts. Treat the one successful handshake as a single observation, not a repeatable acceptance pass.
- A synthetic in-memory TCP relay attempt did not reach a confirmed handshake. No VLESS payload/authentication, D1, outbound TCP, quota settlement, lease behavior or bidirectional relay is proven by this pass.
- Issue #78 received correction comment `6543656113`. Issue remains open.
- Cleanup: all 14 disposable Workers created during this pass were deleted; inventory verified only `imoxy-net-api-staging` and `iran-price-scout` remain. Five temporary PowerShell scripts were removed. No D1 database, TCP endpoint, production/staging resource, route or DNS record was changed.
- Next: use a stable harness that always returns a Response for unmatched paths; obtain repeatable handler WebSocket handshake evidence and a synthetic VLESS request before provisioning the isolated D1 and controlled TCP target. Phase 6 remains In Progress; Phase 12 remains Blocked.


## 2026-10-31 — post-PR #131 acceptance-gate review

- Reconfirmed `main` is `a48b1dd8f2ea104af96b9bc352c395c21191b977` (PR #131 merge); post-merge CI run [41203542526](https://github.com/ijoolaie/imoxy-net/actions/runs/41203542526) completed **success** on that exact SHA. No open PRs were found and Issue #78 remains the sole open issue.
- Re-read the actual handler and its Node tests. The test suite already contains deterministic non-reading-peer cases: it blocks the downstream settlement promise and asserts the upstream reader does not advance; it also verifies the configured cumulative download budget closes a non-reading peer before a later chunk is sent. These are meaningful application-level regression tests, not Cloudflare runtime evidence.
- The handler's downstream pump is sequential: one TCP read is followed by quota reservation, synchronous `server.send()`, and settlement before the next TCP read. The configured per-session download cap and D1 concurrent-session lease ceiling bound application-submitted payload. They do **not** measure Cloudflare's internal WebSocket queue or prove its memory bound.
- Read-only Cloudflare inventory currently lists only `imoxy-net-api-staging` and `iran-price-scout`. The D1 inventory lists the three pre-existing databases `iran-price-scout-db`, `imoxy-net-staging-identity`, and `ivory-tide-05e8-db`; none is accepted as a disposable VLESS test database. No temporary diagnostic Worker is present. No Worker, D1, binding, route, DNS record, setting, or deployment was changed in this review.
- The inventory's D1 list reports `num_tables: 0` for each entry, which conflicts with prior observations recorded for the existing staging identity database. Treat this field as an unreliable inventory summary; do not infer that the existing database is empty or safe to mutate. The staging identity database remains off-limits.
- Test gap is now sharply scoped: the Node suite has deterministic fake-socket/fake-WebSocket slow-reader and quota/lease cleanup coverage; the missing evidence is a **repeatable actual Cloudflare VLESS handler handshake and end-to-end controlled TCP relay with a dedicated disposable D1**. One prior actual-handler handshake succeeded, but later attempts were inconsistent; no VLESS payload or relay is accepted as passed.
- Next gate: first establish a verified, reachable disposable Worker module bundle with stage-by-stage pre-upgrade diagnostics; repeat the actual handler handshake at least three times with the corrected wrapper. Only after repeatability, provision the separately isolated D1/test credential/controlled TCP endpoint under the existing hard limits and cleanup plan. Do not reuse either existing Worker or any listed D1 database.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**. This review changes no application behavior and makes no Nova parity claim.


## 2026-10-31 — disposable VLESS runtime harness attempt (failed; cleaned)

- On main `7c82376d981893f82c497b85211e16450a4598d7`, a fresh isolated worktree was created from the exact main SHA. `npm test` passed **201/201** and `node --check worker.js` passed. The existing review worktree was not modified; its three pre-existing dirty documentation files were preserved.
- Uploaded the current production VLESS handler and its seven-module local import graph to a uniquely named disposable Worker. The wrapper used fake store/quota adapters, a sentinel DB value, no D1 binding, and a TCP adapter that throws if called. It instrumented Worker fetch, WebSocketPair creation, `server.accept()`, listener registration and upgrade-response creation. The workers.dev subdomain was explicitly enabled for this temporary Worker only.
- Three actual Node WebSocket client attempts failed. HTTP requests to `/health`, `/`, and `/proxy/vless` all returned Cloudflare 1101 before any VLESS payload was sent.
- To isolate the source, the same temporary Worker was successively replaced with (a) a minimal ES-module fetch handler and (b) a minimal classic `addEventListener("fetch")` handler. Both still returned 1101. This means the observed failure is **not attributable specifically to the VLESS handler or its import graph**; the temporary upload/activation/runtime harness itself is not currently a valid acceptance target.
- Read-only requests to the two pre-existing Workers' `/health` endpoints returned HTTP 200. Observability queries for the temporary Worker returned no event/invocation rows. The exact cause of the temporary Worker 1101 remains unresolved; do not infer it is a VLESS handler exception.
- Cleanup: the temporary Worker `imoxy-vless-handshake-20261031-b` was deleted. Inventory confirmed only `imoxy-net-api-staging` and `iran-price-scout` remain. No D1 was created or changed; all three pre-existing D1 databases remain untouched. Both temporary Git worktrees were removed. The original review worktree still has exactly its three pre-existing modified documentation files.
- Issue #78 received diagnostic comment `6544024756`. No VLESS payload/authentication, DNS/TCP, D1 quota reserve/settle, session lease, relay, or runtime backpressure test passed. Issue #78 remains open; internal Workers WebSocket buffering remains unproven.
- Next: compare the exact API upload + workers.dev activation sequence against a previously successful disposable Worker deployment, establish a working minimal control first, then upload the production handler and require at least three repeatable handshakes. Do not create D1 or TCP test resources until this gate passes.


## 2026-10-31 — VLESS handler constructor isolation follow-up

- A disposable Worker confirmed the native Workers `WebSocketPair` has enumerable keys `0` and `1`; `Object.keys()` and `Object.values()` both returned two socket objects exposing `accept`, `send`, and `close`. This removes the suspected non-enumerable-pair shape as an explanation for the handler's `Object.values(pair)` extraction.
- Separate import-only Workers returned HTTP 200 for `account-service` (with `validation` and `proxy-credentials`), `quota-reservation-service` (with its transitive dependencies), `vless-parser`, and `d1-store`. An import-only Worker for `vless-websocket-handler` also returned HTTP 200 and exposed the expected exports.
- A Worker importing all modules together returned 1101. More specifically, Workers that invoked `createVlessWebSocketHandler()` returned Cloudflare 1101 even when the call was moved inside `fetch` and wrapped in `try/catch`, and even when every constructor option was explicitly overridden. The import-only handler Worker itself succeeded. Observability invocation queries for the failed constructor request returned zero rows; the exact failing stage is therefore unresolved. Do not claim a caught JavaScript exception or a proven code-level root cause.
- The test did not reach a VLESS WebSocket upgrade or payload. No credential lookup, DNS/TCP, D1, quota reservation/settlement, session lease, or relay was exercised. The native pair-shape control is not a VLESS acceptance test and does not measure internal WebSocket buffering.
- Cleanup: all 12 newly created diagnostic Workers were deleted successfully; the one remaining route-control name was already absent. Final Worker inventory contains only the pre-existing `imoxy-net-api-staging` and `iran-price-scout`. D1 inventory remains the same three pre-existing databases; no D1 was created or changed. No existing Worker, route, DNS record, binding, or production setting was changed.
- Issue #78 received follow-up comment `6544803626`. Issue #78 remains open. Next: isolate the smallest constructor-equivalent expression that triggers the 1101, using one controlled change per disposable Worker; only after the constructor and actual handshake are repeatable should VLESS payload and D1/TCP gates proceed. Production proxy settings remain unset; Phase 6 remains In progress and Phase 12 remains Blocked.


## 2026-11-01 — Wrangler remote-preview VLESS evidence and D1 gate

- Resume base: `main` at `8f54a53ed470fc7f1d5293a3c1d6228c38a1eff0` (PR #134 merge). Repository audit found no open PRs at the time of the check. Latest verified functional work remains the merged VLESS/session/quota implementation; the newest 2026-10-31 runtime evidence had not yet been reconciled into this hand-off.
- Newer Issue #78 comment `6546090435` supersedes the earlier constructor-1101 diagnostic for the Wrangler remote-preview path. Using Wrangler 4.156.0 and `wrangler dev --remote`, the actual repository VLESS handler and its production module graph loaded and ran in Cloudflare's remote runtime.
- Observed: minimal health/404/WebSocket echo controls passed; constructor-equivalent control passed 3/3; actual handler returned expected 426 for non-upgrade; actual `/proxy/vless` WebSocket handshakes passed 3/3; synthetic VLESS requests exercised parser, credential-hash adapter, account lookup, destination allowlist, resolver, admission and TCP connector adapters; synthetic TCP intentionally failed closed as expected; synthetic in-memory TCP plus fake store/quota adapters produced expected VLESS response `[0,0]` and exact four-byte initial payload in 3/3 sessions.
- Slow-reader observation: a raw TCP WebSocket client paused reads for approximately 6.2 seconds, then resumed and received the VLESS response plus all 4,194,304 download bytes in 256 binary frames. This demonstrates successful delivery of this bounded synthetic stream only. It does not measure Cloudflare's internal WebSocket send-buffer bound, prove longer pauses or aggregate concurrency, or exercise real D1/TCP.
- Isolation/limitations: no D1 binding/database was attached; store/quota were fake adapters and TCP was synthetic. No external destination was contacted. No live production Worker, existing staging Worker, route, DNS, binding or pre-existing D1 was changed. Wrangler preview and temporary local files were stopped/removed.
- Follow-on isolated D1 attempt: the owner-authorized disposable database `imoxy-vless-probe-20261031-2003` was created in WEUR and then deleted after the execution safety layer blocked `wrangler d1 migrations apply DB --remote` before execution. No migration or SQL query ran. Post-cleanup inventory confirmed only the three pre-existing D1 databases remain. This is **not** real-D1 VLESS evidence; the D1-backed VLESS gate remains blocked.
- Issue #78 remains open. Internal WebSocket buffering remains unproven; actual VLESS handler + synthetic relay has partial runtime evidence, but actual D1-backed VLESS relay, real outbound TCP, longer/aggregate slow-reader tests, lifecycle-after-isolate-termination, and Nova REF-032 remain outstanding. Do not enable production proxy settings or claim Nova parity.
- Next concrete step: resolve an approved, supported execution path for migrations and SQL against a newly isolated disposable D1 without bypassing the execution safety layer; then rerun the actual handler with that D1 and a controlled TCP endpoint under explicit byte/time/concurrency limits. If no approved path is available, keep the gate blocked and continue only local deterministic tests/documentation.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**. No phase is Complete.



## 2026-11-01 — PR #135 merged; downstream-queue implementation audit

- Current repository baseline: `main` at merge commit `9e1e58046fcf11014954b46a04e2c6ccd82bc616` (squash merge of PR #135). The branch is cleanly based on the prior main commit `8f54a53ed470fc7f1d5293a3c1d6228c38a1eff0`.
- PR #135 is merged: https://github.com/ijoolaie/imoxy-net/pull/135. The final PR head `47ba450be06e878a5dfba6b12362438420ab4c08` passed GitHub Actions CI run `41276784445` (run 868, job `test`, `npm run verify`, conclusion success). This exact-head check ran before merge; no post-merge workflow run was returned for the merge commit at the time of this hand-off.
- Reviewed the current VLESS handler and tests in `src/proxy/vless-websocket-handler.js` and `test/vless-websocket-handler.test.js`. Existing deterministic coverage already includes: a 1 MiB application-managed client upload queue cap; serializing upstream reads behind downstream WebSocket send and quota settlement; preventing a second TCP read while settlement is held; rejecting a chunk that exceeds the remaining per-session download budget before reservation/send; quota-settlement failure closing/cancelling the upstream reader; and session lease release/cleanup behavior.
- No application-code change was made in this continuation. The tests above are repository/Node adapter evidence; they do not prove Cloudflare's internal WebSocket send-buffer bound. The Wrangler remote-preview slow-reader observation remains synthetic TCP with fake store/quota adapters, not real D1 or real outbound TCP.
- Issue #78 remains open. Do not close it or claim backpressure acceptance until the isolated actual Worker + D1 + controlled TCP test and longer/aggregate slow-reader evidence are obtained. The D1 migration command was previously blocked before SQL execution; do not bypass that safety layer.
- Current active branch for this hand-off update: `docs/handoff-after-pr135-20261101`, based on merge commit above. No production/staging Worker, route, DNS, D1, or proxy settings were changed.
- Next concrete action: establish an approved Cloudflare D1 migration/query execution path that passes the execution safety controls; if unavailable, keep real-D1 acceptance blocked and continue deterministic local tests only. Phase 6 remains **In progress**, Phase 12 **Blocked**, and no phase is Complete.


## 2026-11-01 — PR #136/#137 merged; local D1-backed VLESS handler integration

- PR #136 was merged as `382c54e64f99e20177618d24ecf73b7f6e7e732f`; main now includes the previous handoff and implementation/test audit.
- Added `test/vless-d1-handler.integration.test.js` in PR #137. It runs the actual VLESS WebSocket handler with `createD1Store` and `createQuotaReservationService` against an in-memory SQLite adapter after applying migrations 0001–0007. It verifies hashed-credential authentication, durable session admission, initial upload forwarding, atomic quota settlement, and session lease release on close.
- PR #137 was merged as `973785e57618c37ea90c88fae5afcd13e222dc5d`. GitHub Actions CI run `41277197509` (run 872) passed on the exact PR head `412b8c6a91dab301fc51f2b0cf4c901e95b23832`.
- This is local SQLite adapter integration evidence, not a real Cloudflare D1 test. It does not prove D1 remote binding/runtime behavior, real outbound TCP, Cloudflare internal WebSocket send-buffer boundedness, longer/aggregate slow-reader behavior, or isolate-termination lifecycle behavior.
- Cloudflare D1 inventory was read-only and showed three existing databases: `iran-price-scout-db`, `imoxy-net-staging-identity`, and `ivory-tide-05e8-db`. No existing database was changed. The previous disposable probe database remains deleted.
- Cloudflare documents both Wrangler remote migrations and D1 SQL API endpoints. However, using the SQL API to repeat an operation blocked by the execution safety layer would bypass that control, so no SQL or migration was sent through the API. Do not touch the existing staging database for this test.
- Issue #78 remains open. The actual remote D1 + controlled TCP gate and runtime backpressure evidence remain outstanding. No production/staging Worker, route, DNS, binding, existing D1, or proxy settings were changed.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## 2026-11-01 — PR #139 merged; bidirectional D1-backed VLESS handler integration

- PR #139 `test(vless): cover D1-backed download forwarding and settlement` merged as `315cd3540147e3aac8210e8a23542b661b6c59d4`: https://github.com/ijoolaie/imoxy-net/pull/139.
- The test extends `test/vless-d1-handler.integration.test.js` to exercise the TCP-to-WebSocket download path in the same integration scenario that already covered WebSocket-to-TCP upload.
- The exact PR head `76f9fe12c41b3e234b4aeec769c6ee282268a868` passed CI run `41278427561`; `npm run verify` succeeded and all **202/202** Node tests passed. The new path verifies a three-byte TCP download reaches the WebSocket, download usage is settled, both upload/download quota reservations are `settled`, and daily usage records upload=4, download=3, request_count=1.
- Post-merge main CI run `41278479810` passed on the exact merge commit `315cd3540147e3aac8210e8a23542b661b6c59d4`.
- Scope is test-only and uses the in-memory SQLite D1 adapter. It is not live Cloudflare D1/Worker evidence and does not exercise real outbound TCP or measure Cloudflare's internal WebSocket send buffer. Longer/aggregate slow-reader behavior and isolate-termination lifecycle remain unproven.
- Issue #78 received evidence comment `6554107210` and remains open. No Cloudflare resource, existing D1 database, route, DNS, binding, production setting, or deployment was changed.
- Main at this handoff update's starting point: `315cd3540147e3aac8210e8a23542b661b6c59d4`. This documentation PR requires its own exact-head and post-merge CI verification.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## 2026-11-01 — PR #141 merged; Worker custom VLESS route precedence

- PR #141 `test(worker): cover custom VLESS route precedence` merged as `1c4e36df4a16d1d70f8a34d61917aba8de20d359`: https://github.com/ijoolaie/imoxy-net/pull/141.
- Added a Worker-entrypoint test for a non-default `PROXY_WS_PATH` (`/private/vless-gateway`). It sends a valid WebSocket-upgrade-shaped request while providing the required finite proxy limits and a static Assets stub, but deliberately omits the DB binding.
- The test verifies the configured VLESS path is intercepted by the proxy handler before static Assets routing and fails closed with `503 proxy_not_configured`; the Assets binding receives no request. This is deterministic Node/Worker-entrypoint routing evidence, not a live Cloudflare Worker deployment or proxy data-plane acceptance test.
- Exact PR head `73b28c80463b55d8432640d7f8726568968ca613` passed GitHub Actions CI run `41280045647` (run 880): `npm run verify`, **203/203** tests passed, 0 failed. Post-merge main CI run `41280078491` (run 881) passed on the exact merge commit; `npm run verify` completed with **203/203** tests passing and 0 failures.
- No application runtime behavior changed. No production/staging Worker, D1, route, DNS, binding, or proxy setting was changed.
- Issue #78 remains open. The real Cloudflare D1 + controlled TCP relay, longer/aggregate slow-reader tests, and isolate-termination lifecycle evidence remain outstanding. Cloudflare internal WebSocket buffering is still not proven.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.

## 2026-11-01 — local sync and reserved VLESS route collision fix

- Reconnected to the local Raya MCP workspace and inspected `C:\Users\Ali\imoxy-net-review-worktree`. The previous branch `docs/d1-worker-wrapper-runtime-validation` had one commit whose tree matched commit `a475abd`, already contained in the newer remote main history. It was 18 commits behind current `origin/main`.
- Preserved the three pre-existing uncommitted documentation edits in stash `preserve-user-doc-edits-before-main-sync-2026-11-01`; no file edits were discarded. Left the original feature branch and its commit intact.
- Fast-forwarded local `main` from `c3a8cc8` to `fda7f304851302eee39ea7acaad03e8160129345`. Local main was clean after synchronization.
- On branch `fix/vless-route-reserved-paths-20261101`, reproduced a routing collision: setting `PROXY_WS_PATH=/api/v1/capabilities` caused a normal API GET to return HTTP 426 because the VLESS handler is called before API routing.
- Updated `src/proxy/vless-websocket-handler.js` so configured VLESS paths equal to `/api`, under `/api/`, or equal to `/health` are declined; normal API/health routing then proceeds. Added Worker-entrypoint regressions for the API and health collisions.
- The new API collision test failed before the code fix (426 instead of expected 200). After the fix, the targeted Worker tests passed **9/9**; full local Node suite passed **205/205**, 0 failed. `node --check src/proxy/vless-websocket-handler.js` and `git diff --check` passed.
- Committed as `b4d7d596f5bc748af73d8b75ad637735b0811c70`, pushed to `fix/vless-route-reserved-paths-20261101`, and opened as PR #143: https://github.com/ijoolaie/imoxy-net/pull/143. Exact-head GitHub CI is pending at this handoff edit; no Cloudflare resource or setting was changed.
- Issue #78 remains open; this route-collision fix does not prove Cloudflare internal WebSocket buffering, real D1-backed VLESS relay, real outbound TCP, aggregate slow-reader behavior, isolate lifecycle, or Nova parity.
- Next step: review the exact PR #143 diff, require exact-head CI success, and merge only after the passing checks are observed.

## 2026-11-01 — PR #143 merged; reserved Worker path protection verified

- PR #143 `fix(proxy): protect reserved Worker routes from VLESS path` was squash-merged as `e24bb1f986b74c12d5b05d0d07a77693a7677492`: https://github.com/ijoolaie/imoxy-net/pull/143.
- Final PR head `8c0f7f72e319069ed50c9bf7892ab79e3b3db68c` passed CI runs `41281486317` and `41281489713`; both ran `npm run verify` and passed **205/205** tests with 0 failures.
- Post-merge main CI run `41281542490` passed on the exact merge commit `e24bb1f986b74c12d5b05d0d07a77693a7677492`; `npm run verify` passed **205/205** tests, 0 failures.
- The fix protects the Worker API namespace and `/health` from custom VLESS path collisions. It does not change default VLESS routing or establish Cloudflare runtime/D1/TCP/backpressure acceptance.
- Local `main` was fast-forwarded to the exact merge commit and verified clean. The prior three user documentation edits remain preserved in the named stash; the original feature branch remains intact.
- Issue #78 remains open. Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.
- Next step: continue closing the isolated real-D1 + controlled TCP VLESS runtime gate without bypassing the execution safety control; retain the slow-reader/internal-buffer and Nova REF-032 acceptance gaps.

## 2026-11-01 — PR #145/#146 merged; VLESS destination and teardown hardening

- PR #145 `fix(proxy): reject NAT64 destinations embedding private IPv4` merged as `50ae97bc899a7d199c47b0a3bbb9ab4d6a6c643c`: https://github.com/ijoolaie/imoxy-net/pull/145.
- The resolver now rejects IPv6 destinations in the RFC 6052 well-known NAT64 prefix (`64:ff9b::/96`) and RFC 8215 local-use prefix (`64:ff9b:1::/48`), preventing embedded loopback/RFC1918 IPv4 addresses from passing the global-unicast IPv6 filter. A DoH regression test verifies those two embedded private destinations are filtered while a public IPv6 answer remains eligible.
- PR #145 exact-head CI run `41283613971` passed; post-merge main CI run `41283659820` passed on the exact merge commit.
- PR #146 `fix(proxy): keep VLESS session cleanup from blocking` merged as `1d0253d3f16ed8fe3a078b56044e33d7a9e1207d`: https://github.com/ijoolaie/imoxy-net/pull/146.
- Lifecycle review found that sequentially awaiting `reader.cancel()` and `writer.abort()` before closing the TCP socket could leave the socket and session lease cleanup blocked if either stream cleanup promise never settled. The handler now initiates TCP socket close operations first and awaits them before attempting lease release; reader cancellation and writer abort are then started without awaiting their potentially stalled promises. This follows the Cloudflare TCP Socket contract: `Socket.close()` returns a Promise and forcibly closes both stream sides (https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).
- Added deterministic regression coverage with never-settling reader-cancel and writer-abort promises. The test verifies TCP socket close and lease release still occur. This is Node adapter evidence; it does not prove Cloudflare runtime cancellation behavior or isolate-termination cleanup.
- Final PR #146 head `f32e040e047c94e154c8f261bdf911fee8863da3` passed CI runs `41284015956` and `41284017999`; post-merge main CI run `41284051758` passed on the exact merge commit `1d0253d3f16ed8fe3a078b56044e33d7a9e1207d`.
- The first draft of PR #146 did not await the Cloudflare TCP socket's close Promise before releasing the lease. Review against the official runtime contract caught this; the final merged revision closes the socket first, then initiates stream cleanup without awaiting it. Only the final head above is accepted.
- Current remote main: `1d0253d3f16ed8fe3a078b56044e33d7a9e1207d`. The local checkout `C:\\Users\\Ali\\imoxy-net-review-worktree` remains at `4d80c158bbf0d2d3612f88ab29ffd332005b0abe`, clean on local `main`; an attempted fast-forward pull was blocked by the execution safety layer. Do not misreport the local checkout as synchronized. The earlier documentation stash and feature branch remain preserved.
- No Worker deployment, D1 operation, route/DNS/binding change, or live TCP probe occurred. Issue #78 remains open; internal WebSocket buffering, real D1 + controlled TCP, longer/aggregate slow-reader behavior, and isolate-termination lifecycle remain outstanding.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.
- Next: synchronize the local checkout only through an approved Git operation, then continue deterministic lifecycle tests and pursue the isolated real-D1/controlled-TCP gate only through an approved execution path. Do not bypass the safety control.

## 2026-11-01 — PR #149 merged; quota reservation crash recovery implemented

- PR #149 `fix(quota): recover only pre-forward reservations` was squash-merged: https://github.com/ijoolaie/imoxy-net/pull/149.
- Final PR head: `eb248dc6a5f44865884a401d45c312f5956ff9df`. Exact-head CI run `41293808453` passed. Post-merge main CI run `41293877915` passed on merge commit `56cc104982df830dca1dd7c6ec2555e6d051d517`.
- Added migration `0008_quota_reservation_recovery.sql` with an immutable `forwarding_started_at` marker. Existing active reservations are conservatively backfilled as uncertain so the migration cannot release quota for traffic that may already have crossed the network boundary.
- `reserveQuota()` opportunistically reclaims only expired active reservations with a null forwarding marker, scoped to the account being admitted. Quota admission remains a conditional SQL insert, so concurrent attempts cannot jointly exceed quota.
- Added `markQuotaReservationForwarding()` and the quota service `markForwarding()` transition. The VLESS handler must durably mark forwarding intent before upload writes or WebSocket download sends; if that transition fails or is ambiguous, it fails closed and retains the reservation.
- Explicit reservation release now applies only while the marker is null. Usage settlement requires the marker, and the database trigger enforces that requirement. The marker is immutable after it is set.
- Added SQLite integration tests for legacy active-row backfill, expiry reclaim before forwarding, retention after forwarding intent, rejection of late settlement after release, pre-forward release, and concurrent recovery/admission. Existing VLESS bidirectional integration verifies forwarding and exact usage settlement with the new marker.
- Local full suite passed **212/212**; `node --check worker.js` and syntax checks for all changed JavaScript files passed; `git diff --check` passed. There is no `lint` script in package.json, so no lint command is claimed.
- This is in-memory SQLite adapter evidence, not live Cloudflare D1 or Worker evidence. No remote D1 migration, Worker deployment, live outbound TCP, route/DNS/binding change, or production resource mutation occurred.
- Issue #148 was closed as completed after PR #149 merged. Issue #78 remains open: Cloudflare internal WebSocket send-buffer boundedness, actual remote D1 + controlled TCP, longer/aggregate slow-reader tests, isolate-termination lifecycle behavior, and Nova REF-032 remain outstanding.
- Local `main` was fast-forwarded from `354e1bb25fc30da2d7fbec8ced7642bdad0597de` to the exact merge commit `56cc104982df830dca1dd7c6ec2555e6d051d517`. The quota implementation branch remains preserved.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.
- Next: pursue the isolated real-D1 + controlled-TCP VLESS runtime gate only through an approved execution path. Do not bypass the execution safety control or use the existing staging database.

## 2026-11-01 — disposable real Cloudflare D1 SQL validation of quota recovery

- Objective: exercise migration 0008 and the quota reservation recovery SQL against an actual Cloudflare D1 primary using the supported Cloudflare D1 API, after the Wrangler remote-migration command had been blocked before SQL execution. This used the previously recorded narrow owner authorization for one disposable D1 database (Issue #78 comment `6546310096`); it did not extend authorization to Worker creation, binding/route/DNS changes, or a controlled TCP destination.
- Created disposable EU D1 `imoxy-vless-d1-20261101-1355`, UUID `62d98499-d54f-4168-bcab-db88fcd2784f`, jurisdiction `eu`, primary region `EEUR`, read replication disabled.
- Applied exact SQL contents of migrations 0001–0008 through Cloudflare D1 API `/query`: 0001 as a multi-statement script, 0002–0008 as a D1 API batch. This was **not** `wrangler d1 migrations apply`; Wrangler's `d1_migrations` history table was not created. Do not represent this as a Wrangler migration-history test.
- D1 schema inspection confirmed expected application tables, quota/session indexes and triggers; `forwarding_started_at` column present; `PRAGMA foreign_keys` = 1; `PRAGMA foreign_key_check` returned no rows.
- Prepared expiry recovery: an expired unmarked 40-byte reservation was released and a 100-byte new reservation admitted under a 100-byte account/daily cap.
- Uncertain expiry: an expired marked 40-byte reservation remained active; a 70-byte new reservation was denied under the 100-byte cap; explicit release changed 0 rows.
- Settlement: marked reservation accepted upload=2/download=3/request_count=1; event became applied, reservation settled with actual_bytes=5, daily usage matched.
- Unmarked settlement was rejected by `usage_event_apply_requires_forwarding` with `SQLITE_CONSTRAINT_TRIGGER`; event remained claimed, reservation active, and usage stayed zero. A D1 batch containing that failed transition rolled back the preceding event insert (follow-up count 0).
- Attempt to clear a set forwarding marker was rejected by `quota_reservation_forwarding_marker_immutable`; marker remained unchanged.
- Concurrency: 12 concurrent direct D1 API quota INSERT attempts of 10 bytes under a 50-byte account/daily cap; exactly 5 inserted, 7 denied, final active reserved bytes exactly 50.
- All test queries were served by the D1 primary in `EEUR`. The disposable database was deleted successfully; follow-up inventory contained exactly the three pre-existing databases and confirmed the test DB absent. Existing staging and unrelated D1 resources were not modified.
- Scope: direct D1 API SQL evidence only. No `createD1Store()`/VLESS handler ran inside a Worker; no Worker was created/deployed or bound; no TCP destination was contacted; no route/DNS/binding or production/staging setting changed. No test of Wrangler migration bookkeeping, isolate termination, or Cloudflare WebSocket buffering. Issue #78 remains open.
- Documentation updated: `docs/d1-runtime-validation-2026-10-30.md`, `docs/nonprod-vless-smoke-gate.md`, `docs/acceptance-test-plan.md`, `docs/decision-log.md`, `docs/parity-matrix.md`, and `docs/roadmap.md`.
- Documentation PR #151 https://github.com/ijoolaie/imoxy-net/pull/151 was squash-merged as `2e12a3d713d32469cf7c7ea30a7cbb4cc18fbaf9`. Final PR head `9e09f935cca377c7d4d3974920f3b1e22c1b8203` passed exact-head CI run `41298932201`; post-merge main CI run `41298980143` passed on the exact merge commit. Local `main` was fast-forwarded to that merge commit and re-verified clean.
- Remaining blocker: no controlled TCP echo destination owned/controlled by the user has been provided, and no explicit approval for creating a disposable Worker plus hard test limits/cleanup procedure was found. Do not create a Worker or contact a destination until these are supplied/approved.
- Local verification on base `abc38a1392cc57a2ad7b3ca388d4a42820a232bb`: `node --check worker.js` passed; `npm test` passed **212/212**; `git diff --check` passed after normalizing the two edited Markdown EOF newlines. This session changed documentation only; no source/test code changed.
- Phase 4/5 gained partial real-D1 SQL evidence but remain In progress. Phase 6 remains In progress; Phase 12 Blocked; Phase 13 Not started. No phase is Complete.

## 2026-11-02 — local VLESS-to-TCP Echo integration slice

- Starting repository state: local main at bd68f56b32fb8451086be5e7815c0a1ac1483ce4, clean and aligned with origin/main. No source or documentation edits were present before this session.
- Added test/vless-local-tcp.integration.test.js. The opt-in test runs the production createVlessWebSocketHandler() against the user's locally running TCP Echo Server at 127.0.0.1:5000 using a real Node TCP socket. It applies migrations 0001–0008 to in-memory Node SQLite, uses createD1Store(), credential hashing, real quota reservation/forwarding/settlement methods, and active-session lease acquisition/release.
- The test sends a binary initial VLESS payload and a subsequent 64 KiB payload through the handler and the actual local TCP echo socket, verifies byte-for-byte returned WebSocket data, verifies exact equal upload/download usage totals, verifies all quota reservations settled, and verifies the active-session lease is released.
- The injected connector deliberately maps the handler's synthetic public peer identity 93.184.216.34 to the actual loopback socket. This keeps production private-destination checks unchanged, but means DNS resolution and connected-peer validation are not exercised. The WebSocketPair is fake and SQLite is not Cloudflare D1. This is local integration only, not Worker-to-TCP, live D1 binding, Cloudflare internal WebSocket buffer/backpressure, isolate-termination, or Nova parity evidence.
- Focused opt-in command with the Echo Server running: IMOXY_TCP_ECHO_TEST=1 node --experimental-sqlite --test test/vless-local-tcp.integration.test.js. Observed result: 1 test passed, 0 failed, 0 skipped (duration approximately 226 ms).
- Full default local suite: npm test passed 212 tests, 0 failed, 1 skipped (the new opt-in test). This was observed after adding the test. `npm run verify` and final diff checks are still pending at handoff edit time.
- Updated docs/acceptance-test-plan.md, docs/parity-matrix.md, docs/decision-log.md, and docs/roadmap.md with scope and evidence. Phase 6 remains In progress; Phase 12 remains Blocked; Phase 13 remains Not started. Issue #78 remains open.
- No Cloudflare Worker, D1, route, DNS, binding, proxy setting, or production/staging resource was created, changed, or contacted. The Echo Server remains loopback-only.
- Next: run npm run verify, git diff --check, inspect the complete diff and working tree; then open a focused PR if the review is clean. Do not commit directly to main or claim remote CI until exact-head CI is observed.

### Verification follow-up — 2026-11-02

- Re-ran the focused opt-in test after making its byte-stream assertion independent of TCP chunk boundaries: **1/1 passed**, 0 failed, 0 skipped (about 240 ms), with the loopback Echo Server running.
- Re-ran the default full suite: **212 passed, 0 failed, 1 skipped** (the opt-in local Echo integration test), total 213 tests.
- `node --check worker.js` passed. `git diff --check` passed; Git emitted only the repository's expected LF-to-CRLF working-copy warnings for edited Markdown files.
- The `npm run verify` wrapper could not be started through the managed-process tool because `npm` was not on that tool's PATH (`spawn npm ENOENT`). Its constituent checks were run separately: worker syntax check and full `npm_test` check both passed. Do not claim the wrapper command itself ran.


## Latest work session — 2026-11-02 (VLESS DNS family fallback)

- PR #153 was squash-merged as `d163868f3e72063ab72ba9e1884ae15997a41d95`; post-merge GitHub Actions check on that exact main commit completed **success**. The local worktree was fast-forwarded from `bd68f56` to this exact `main` commit before starting the next change.
- Added a deterministic test to `test/vless-websocket-handler.test.js` that exercises the real VLESS handler with synthetic mixed A/AAAA DoH answers. It filters private IPv4/ULA IPv6 answers, attempts a validated public IPv4 candidate, falls back after a dial failure to a public IPv6 candidate, validates the connected peer against the pinned IPv6 address, then forwards and settles the initial upload.
- Focused VLESS handler suite passed **53/53**, 0 failed/skipped. Full repository suite after this test passed **213**, 0 failed, 1 skipped (the opt-in local TCP Echo integration test), total 214. `git diff --check` passed; only the expected LF-to-CRLF working-copy warning was emitted.
- No production Worker, D1, route, DNS, binding, proxy setting, or external TCP destination was changed or contacted. This test uses synthetic DNS responses and fake WebSocket/TCP adapters; it is not Cloudflare runtime or Nova parity evidence.
- Issue #78 remains open. Internal Workers WebSocket buffer behavior, real Worker-bound D1 + controlled TCP, longer/aggregate slow-reader behavior, and isolate-termination lifecycle evidence remain outstanding.
- Branch: `test/vless-ipv4-ipv6-dial-fallback-20261102`; PR #154 exact head `184e82397c06fc99fdeb864406befeb46abbe234` passed GitHub Actions CI run #918, including `npm run verify`. The subsequent handoff-only update requires its own exact-head CI check before merge.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## Latest work session — 2026-11-02 (IANA destination-address coverage)

- PR #153 merged as `d163868f3e72063ab72ba9e1884ae15997a41d95`; exact post-merge main CI passed. PR #154 merged as `58b117d9b3b3ec2bb7454eb3d06f733f2c496d54`; exact PR-head CI run #919 and post-merge main CI both passed `npm run verify`.
- PR #154 adds deterministic mixed A/AAAA DNS filtering and IPv4-to-IPv6 fallback coverage. Its test validates peer pinning before forwarding initial payload and checks upload settlement and lease cleanup. This uses synthetic DNS and fake WebSocket/TCP adapters only.
- PR #155 adds IPv4/IPv6 numeric-literal regression matrices based on the IANA Special-Purpose Address Registries (updated 2025-10-09). It documents conservative rejection of the full 192.0.0.0/24 and 2001::/23 parent blocks, including more-specific protocol-anycast entries, while preserving the globally reachable AS112-v6 range for explicit allowlisting.
- PR #155 `test(vless): cover IANA special-purpose address ranges` merged as `c75e61d73126cd352c734792b4a80babd1ae2c79`; final PR head `5f43890ea3a4394a8d576727e228a75630dde777` passed exact-head CI run #927 and post-merge main CI run #928, both including `npm run verify`.
- Issue #78 remains open. No Cloudflare Worker, D1, route, DNS, binding, proxy setting, or external TCP destination was changed. Workers internal WebSocket buffering, actual Worker-bound D1 + controlled TCP, aggregate slow-reader behavior, isolate-termination lifecycle, and Nova parity remain unproven.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## 2026-11-02 — PR #155 merged; IANA address-filter regression coverage

- PR #155 merged as `c75e61d73126cd352c734792b4a80babd1ae2c79`. Exact PR-head CI run #927 and post-merge main CI run #928 both completed **success**, including `npm run verify`.
- The merged tests cover numeric IPv4/IPv6 special-purpose destination samples from the IANA registries last updated 2025-10-09. They verify conservative rejection of 192.0.0.0/24 and 2001::/23 parent ranges (including more-specific protocol-anycast exceptions), and keep globally reachable AS112-v6 eligible for explicit destination-host allowlisting.
- PR #154 also merged as `58b117d9b3b3ec2bb7454eb3d06f733f2c496d54`; exact PR-head CI run #919 and post-merge main CI both passed.
- Issue #78 remains open. The new coverage is deterministic Node address-policy evidence only; no live Worker/D1/TCP runtime or Nova parity is established.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## Latest work session — 2026-11-02 (partial DNS-family resilience)

- Added three deterministic tests to `test/vless-websocket-handler.test.js`: keep valid AAAA candidates when the A query fails; keep valid A candidates when the AAAA query fails; ignore malformed and RR-type/family-mismatched DNS JSON records while retaining valid candidates.
- The tests lock the resolver's current `Promise.allSettled` policy: one address-family DNS failure does not discard the other family's valid results; malformed answers are ignored; no valid public result remains a fail-closed error.
- Branch: `test/vless-dns-partial-family-resilience-20261102`; final test+documentation head `48417fa8f86ab1dc1d93cc38a33a9e211782cb95` passed GitHub Actions run #931 (`npm run verify`). PR #157 is open pending merge.
- No production Worker, D1, route, DNS, binding, proxy setting, or external destination was changed. Synthetic DoH response tests are not live DNS/Cloudflare runtime/Nova evidence. Issue #78 remains open.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## 2026-11-02 — PR #157 merged; partial DNS-family resilience

- PR #157 `test(vless): cover partial DNS family failures` merged as `979bbfe9af60e785a2335aa3edb61b42f087699d`. Exact final PR head `9e046337506d83b09b203cf35e705c1a977d4342` passed GitHub Actions run #932; post-merge `main` CI run #933 also passed `npm run verify` on the exact merge commit.
- Added deterministic tests for valid AAAA results surviving an A-query failure, valid A results surviving an AAAA-query failure, and malformed or RR-type/family-mismatched DNS records being ignored. The resolver fails closed when no valid public answer remains.
- The test inputs are synthetic DoH responses. No live DNS, Cloudflare Worker/D1/TCP, production resource, or Nova runtime was used. Issue #78 remains open.
- No open PRs remained at the time of this handoff update. Main was at `979bbfe9af60e785a2335aa3edb61b42f087699d` with post-merge CI success.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## Latest work session — 2026-11-02 (Workers VPC controlled TCP smoke harness)

- Reviewed an existing three-commit test branch based on the previous main commit. Rebased its content onto the current main line after PRs #157 and #158 had advanced main.
- Corrected the Wrangler config: direct Workers VPC Network bindings to a specific Cloudflare Tunnel use `tunnel_id`; `network_id` is for `cf1:network` or `cf1:vnet:<UUID>`. This was checked against Cloudflare's current VPC Networks and Binding API documentation.
- Added a test-only Worker wrapper, unit tests, and a disposable Wrangler config. The wrapper maps one fixed synthetic public peer to one RFC1918 TCP target through `PROXY_VPC.connect()`. It overrides the handler-visible `remoteAddress`; therefore it deliberately bypasses real private-peer identity validation and must never be imported by production code.
- Added a bounded runbook section documenting Workers VPC beta/plaintext-TCP caveats, `cloudflared` version/QUIC prerequisites, isolation and cleanup steps. Expanded CI push branch coverage to include `test/**` so test branches receive the same `npm run verify` workflow.
- No Tunnel, Worker, D1, route, DNS record, binding, firewall rule, or local TCP server configuration was created or changed. The live VPC smoke test remains not executed. Existing staging Worker/D1 remain excluded.
- PR #159 contains the rebased VPC harness. Exact-head CI and review are pending.
- Issue #78 remains open: this harness can potentially exercise the VLESS handler with a controlled private TCP endpoint, but does not itself establish live VPC reachability, Worker-bound D1 correctness, slow-reader behavior, or Cloudflare-internal WebSocket buffer bounds.
- Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## 2026-11-02 — PR #159 merged; Workers VPC smoke harness prepared

- PR #159 `test(vless): prepare isolated Workers VPC TCP smoke harness` merged as `ea11fa7115e3768f339c7014ad8a2a50716cea0d`.
- Exact final PR head `e1725a017d401ed3db81081321479bbc4c0b0453` passed pull-request CI run #938 and push CI run #937; post-merge `main` CI run #939 passed `npm run verify` on the exact merge commit.
- The merged harness includes a test-only VLESS Worker wrapper, unit tests, and a disposable Wrangler config. Direct Workers VPC Tunnel binding is correctly configured with `tunnel_id`; CI now runs on `test/**` push branches.
- The VPC connector maps one fixed synthetic public peer to an RFC1918 target and overrides the handler-visible `remoteAddress`. It intentionally bypasses actual private-peer identity verification; this remains test-only and must never enter `worker.js` or production configuration.
- The VPC runbook records the beta/plaintext-TCP caveat, `cloudflared` prerequisites, isolation, and cleanup. No Tunnel, Worker, D1, route, DNS, binding, firewall rule, or local TCP server configuration was created or changed. The live VPC/Worker/D1/TCP test remains not executed.
- Issue #78 remains open. The harness does not establish live VPC connectivity, Worker-bound D1 correctness, slow-reader behavior, or Cloudflare-internal WebSocket buffer bounds.
- No open PRs remained after #159. Phase 6 remains **In progress**; Phase 12 remains **Blocked**; Phase 13 remains **Not started**. No phase is Complete.


## Current session — 2026-11-02 — Cloudflare Service Binding TCP smoke path

- Repository: `ijoolaie/imoxy-net`; branch: `test/cloudflare-service-binding-tcp-smoke`; base main commit: `f92bfbc5a6570f3a473fe86de84443a7828d9a21`.
- User reprioritized the goal: credible Cloudflare runtime evidence for VLESS matters more than retaining the Workers VPC route; alternate test transport is acceptable. Existing Production and pre-existing staging remain explicitly out of scope.
- Added `test/vless-service-binding-tcp-echo-worker.js`: internal-only `connect(socket)` TCP echo handler. Cloudflare documentation says this handler accepts TCP only when forwarded from another Worker through a Service Binding; it is not a public TCP listener.
- Added `test/vless-service-binding-tcp-smoke-worker.js`: injects a test-only connector into the existing production VLESS handler, forwards only the fixed synthetic peer `93.184.216.34:5000` through `PROXY_TCP_ECHO.connect()`, and maps the handler's peer identity synthetically. This seam is explicitly not proof of a real peer IP.
- Added isolated Wrangler example configs for the VLESS Worker (new disposable D1 + service binding) and backend echo Worker (no workers.dev, routes, or domains).
- Added unit tests for fixed destination, Service Binding invocation, synthetic identity mapping, and rejection of other destinations/missing binding.
- Exact branch commits created by this session: `f9a8e46e5f68a58589c7a7ea90a5097141c131d6`, `4d769cf2ed98d1c01bb44ad3ce136a632cbec4df`, `17979fc25100919e7bbb7563ad85cac61576b833`, `f1629a3604b74be98e4d83ece45b4545997cc47c`, `46abe392017c3e3924bbb144c267d1135fedcfc4`, `fe03107b3e3898915347c9fc4a9d93f4208d4153`, `d5650178125e2bc31ac2037db307ae8be53ffa15`.
- Tests: not run in this environment; CI result pending. Do not report pass until exact PR-head CI is observed.
- Runtime: no Cloudflare resources created or changed. No disposable D1, Workers, routes, secrets, tunnels or VPC services created. No Production or existing staging resources touched.
- Remaining: run exact branch CI; review diff; add a real external WebSocket VLESS client runner and safe disposable deploy/cleanup workflow; seed only disposable D1 with a test credential; run the approved probe (10 s, 8 MiB, 16 KiB frames, max 2 clients); delete test resources and verify absence. Keep this Service Binding result separate from Workers VPC acceptance and Cloudflare-internal WebSocket backpressure claims.


## Post-merge verification — 2026-11-02 — PR #161

- PR #161 merged by squash: https://github.com/ijoolaie/imoxy-net/pull/161; main commit `60918bba2eecba04e947a1701f85adcf1d8f960b`.
- Exact PR-head CI for `38322c433afd5c4ac11eb06833a651a9d1d6a1f3`: `npm run verify` passed (runs 41450169221 and 41450176376).
- Exact post-merge main CI for `60918bba2eecba04e947a1701f85adcf1d8f960b`: passed (run 41450325053).
- The PR introduces only test scaffolding, unit tests, and acceptance documentation. No runtime Cloudflare deployment or live VLESS/D1/TCP probe was run. No Cloudflare resources were created or changed.
- Next concrete step: implement and verify an isolated external test client and a disposable deploy/seed/cleanup workflow. First prove whether Worker-to-Worker Service Binding HTTP forwarding can deliver a WebSocket upgrade; current Cloudflare docs explicitly document raw TCP Service Binding forwarding but do not clearly document this WebSocket test-client route. If unsupported, use a dedicated external CI runner after safe deployment. Do not claim the runtime test is ready until that client path is demonstrated.
- Keep Workers VPC, actual peer identity, D1-in-Worker integration, and Cloudflare-internal WebSocket buffer/backpressure as separate acceptance claims. Existing production and staging resources remain untouched.


## Cloudflare runtime smoke attempt and cleanup — 2026-11-02

- PR #162 merged: https://github.com/ijoolaie/imoxy-net/pull/162; main commit `54a41c46a31052c8fb119e218ae371721320d7a8`. PR-head CI passed. The one-shot external runtime workflow run `41452175268` failed immediately with `WebSocket error in session 1`; it did not verify a VLESS handshake or TCP echo.
- PR #163 merged: https://github.com/ijoolaie/imoxy-net/pull/163; main commit `0b527a5d8fb109fd6a581a4112d03a0fa107c0e3`. It isolates the test connector from the Worker entrypoint to avoid Cloudflare treating a named helper export as a named Worker handler. PR-head CI and post-merge main CI passed. This corrected the module shape but did not by itself resolve the deployed smoke Worker's HTTP 500.
- A dedicated disposable D1 and disposable Workers were uploaded for diagnosis (VLESS smoke, TCP echo, runner, and isolated health/import/connector probes). The VLESS smoke Worker's `/health` returned HTTP 500; no successful VLESS handshake or relay was observed. Direct D1 checks found no successful usage/relay evidence.
- All temporary resources were deleted: `imoxy-vless-smoke-runner-disposable`, `imoxy-vless-service-smoke-disposable`, `imoxy-vless-tcp-echo-disposable`, `imoxy-health-smoke-disposable`, `imoxy-vless-import-check-disposable`, `imoxy-health-d1-smoke-disposable`, `imoxy-vless-handler-check-disposable`, `imoxy-vless-connector-check-disposable`, `imoxy-vless-relay-check-disposable`, and D1 `imoxy-vless-svc-smoke-20261102` (`612ab20a-efaa-4285-9393-e629230c203c`).
- Post-cleanup Cloudflare inventory confirmed zero remaining resources with those names/ID. Remaining Workers are only `imoxy-net-api-staging` and `iran-price-scout`; remaining D1 databases are only the three pre-existing databases (`imoxy-net-staging-identity`, `iran-price-scout-db`, `ivory-tide-05e8-db`). Tunnel and Workers VPC service inventories remain empty. No production or pre-existing staging resource was modified.
- The one-shot workflow is being removed from the current tree because it points at deleted disposable resources and embeds a now-useless test credential. The generic Node WebSocket client script remains available for a future controlled deployment.
- Next concrete step: diagnose the HTTP 500 with a Wrangler-native deployment (rather than the direct multipart API upload used in this attempt), enable and inspect invocation logs, first verify a minimal Worker with the exact entrypoint, then reintroduce D1 and the Service Binding one at a time. Do not claim live VLESS/TCP or D1 runtime acceptance until the external client gets a valid VLESS handshake, exact byte echo, usage settlement, and lease release.


## 2026-11-02 — reconcile Wrangler remote-preview evidence with failed API-upload attempt

A prior Wrangler 4.156.0 `wrangler dev --remote` run successfully executed the actual VLESS handler/module graph on Cloudflare's remote Workers runtime. The recorded evidence is:

- 3/3 real WebSocket handshakes at `/proxy/vless` succeeded.
- 3/3 VLESS sessions using synthetic in-memory TCP and fake store/quota adapters returned the expected two-byte VLESS response `[0,0]` and exact four-byte initial payload.
- A raw TCP WebSocket client paused reads for approximately 6.2 seconds, then resumed and received all 4,194,304 bytes in 256 binary data frames (257 frames including the VLESS response); the session closed normally with `upstream_closed`.

This is partial Cloudflare remote-runtime evidence for the real handler/module graph and synthetic relay. It does **not** include a D1 binding, real Cloudflare outbound TCP, real credential persistence/quota settlement, or real D1 lease lifecycle. The slow-reader observation does not measure or prove Cloudflare-internal WebSocket buffer bounds.

This evidence is distinct from the later one-shot direct multipart API upload attempt (PR #162 workflow run `41452175268`), which failed at the external client's first WebSocket connection and whose uploaded disposable Worker returned HTTP 500 on `/health`. PR #163 corrected its module export shape but did not resolve that API-upload harness failure. Those failures do not invalidate the independently successful Wrangler remote-preview run; neither do they satisfy the full Worker/D1/TCP acceptance gate.

All disposable resources from the API-upload attempt were deleted and their absence verified. Existing staging and Production remain untouched. The next useful gate is to run the actual handler under a Wrangler-native remote preview with a dedicated disposable D1 binding and controlled Worker-to-Worker TCP echo Service Binding, using the existing external Node WebSocket client and the approved limits (10 seconds, 8 MiB, 16 KiB frames, max 2 clients). Do not bypass the safety control that blocked Wrangler remote D1 migration execution; use only an approved D1 provisioning/migration path. Keep the D1 and TCP acceptance claims blocked until the exact Worker-bound results and cleanup are observed.


Restart point: main currently includes PR #164 (merge commit `894901cf482c67491348f58073d373f8c4ba87fd`). There are no open PRs at the start of this session. Worktree/branch is not available through the GitHub connector; a documentation-only branch `docs/reconcile-vless-wrangler-runtime-evidence` contains the reconciliation in progress. No Cloudflare resource was created or changed in this documentation pass.


## 2026-11-02 — prepare isolated Wrangler + D1 + Service Binding smoke workflow

- User reports that the Cloudflare API token was created with D1 Read/Edit and Workers Scripts Edit, limited to the imoxy Cloudflare account, and stored as the GitHub repository secret CLOUDFLARE_API_TOKEN. The integration cannot read GitHub secret presence or value; no token was requested or exposed in chat.
- Repository state before edits: main at 932df5314bd41636015bbc45c008e38f722c7601; no open PRs; main had only android.yml and ci.yml under .github/workflows.
- Created branch test/vless-cloudflare-service-binding-gate.
- Added scripts/vless-service-binding-cloudflare-smoke.mjs and .github/workflows/vless-cloudflare-smoke.yml. The manual workflow requires confirm_disposable_run=true and runs only from main. It pins the approved account ID, uses run/attempt-specific names, creates D1 through the Cloudflare API, applies migrations 0001–0008 through the D1 query API, seeds a hash-only credential, deploys the internal-only TCP Echo Worker with Wrangler, and starts the VLESS handler through Wrangler remote preview with D1 and a Worker-to-Worker TCP Service Binding.
- Acceptance assertions: two concurrent clients, 16 KiB frames, 8.5-second external-client timeout, 10-second handler lifetime, 8 MiB account quota; exact upload/download totals 131,084 bytes each, request count 2, fully settled reservation bytes, no active/released reservations, and no remaining session leases.
- Cleanup uses only run-specific Worker names and the created D1 UUID, then verifies exact resource absence. Echo and VLESS configs set workers_dev=false and preview_urls=false; no routes or custom domains are added. Existing Production and staging resources are excluded.
- Updated docs/parity-matrix.md, docs/acceptance-test-plan.md, docs/decision-log.md, docs/reference-baseline.md, docs/nonprod-vless-smoke-gate.md, docs/roadmap.md, and package.json. The CI syntax check now includes both VLESS smoke scripts.
- No Cloudflare resource was created or modified in this session. The new workflow has not been dispatched. No remote tests were run. CI will run on the PR head.
- Next: inspect the full branch diff and workflow/script; run PR CI; merge only after checks pass; owner must manually dispatch Actions → VLESS Cloudflare disposable smoke with confirmation enabled. Inspect logs and verify cleanup before reporting any runtime result.
- Active phase: Phase 6. Full Worker-bound D1/TCP gate remains blocked/not accepted until the workflow has actually passed. Phases 0–13 remain as recorded in docs/roadmap.md.


## 2026-11-02 — merged smoke workflow and runtime config correction

- PR #166 merged as 0be7ab3edc309954dffecd1a2960c48a240e668d. It adds the manually dispatched disposable Cloudflare VLESS smoke workflow and runner. Exact-head PR CI passed on 4d8ef3146cb4ee048ca2b65071dceab8952dd4b1 before merge.
- Post-merge review found a runtime-only identifier mismatch in the generated VLESS Wrangler config. The smoke workflow was explicitly held and not dispatched while this was corrected.
- PR #167 merged as 56c323815e6d8af090d2d33d9361d76c2c705be6. It fixes the D1 UUID variable in the config generator and removes migrations_dir from the Wrangler remote-preview config so the workflow cannot implicitly invoke Wrangler migration execution. The checked-in SQL migrations remain applied through the D1 API only. Exact-head CI passed on cfb3639625064d9dd0ab7d48e5093efbf2de38c2 (runs 41467164874 and 41467157117).
- The current main branch contains the fixed runner. No Cloudflare resources were created or modified, and the manual workflow has not been dispatched. GitHub secret presence/value is not readable by the repository integration.
- Next: after the handoff note merges, owner manually runs Actions → VLESS Cloudflare disposable smoke with confirm_disposable_run=true. Inspect exact D1 usage, settled reservations, session lease release, and cleanup verification before making any runtime claim. Stop on any cleanup error and inspect inventory.
- Active phase remains Phase 6. The Worker-bound D1/TCP gate remains In progress/Blocked pending a real successful workflow run; Phase 12 remains Blocked. Other phase states remain as recorded in docs/roadmap.md.

## 2026-11-02 — Cloudflare Service Binding smoke failure and correction in progress

- Objective: diagnose the first real disposable Cloudflare Worker-bound D1 + Worker-to-Worker TCP Service Binding smoke run.
- Repository: `ijoolaie/imoxy-net`; branch: `fix/vless-service-binding-await-and-smoke-diagnostics`; base: current `main` at `6da9570433129f0b5e74cb7a56d0cb5b268f119b`.
- User supplied GitHub Actions job URL: https://github.com/ijoolaie/imoxy-net/actions/runs/41469175764/job/125357924676.
- Observed run: workflow `VLESS Cloudflare disposable smoke`, event `workflow_dispatch`, run 41469175764, job 125357924676; conclusion **failure**.
- Verified successful steps: all D1 migrations 0001–0008 applied via Cloudflare D1 API; internal-only disposable TCP Echo Worker deployed via Wrangler; cleanup deleted the run-owned VLESS/Echo Worker scripts and disposable D1; the workflow logged that absence was verified.
- Failure: external Node WebSocket client timed out in session 1 after 8.5 seconds. No successful VLESS handshake/echo, Worker-bound usage settlement, or session-lease release was established.
- Corrective branch changes:
  - `test/vless-service-binding-tcp-connector.js`: await `env.PROXY_TCP_ECHO.connect(...)`, supporting both Promise and synchronous Socket return values.
  - `test/vless-service-binding-tcp-smoke-worker.test.js`: add asynchronous binding regression test.
  - `scripts/vless-cloudflare-runtime-smoke.mjs`: timeout reports readyState, handshake state, frame-send state, and received bytes.
  - `scripts/vless-service-binding-cloudflare-smoke.mjs`: include captured Wrangler remote-preview output on client failure.
  - Updated parity matrix, acceptance plan, decision log, reference baseline, roadmap, and non-production smoke gate with the observed failure and limits.
- No Cloudflare resource was created or modified by this corrective branch work. The failed workflow's cleanup was verified in its own logs. Production and pre-existing staging remain untouched.
- Tests: GitHub CI run [41470748385](https://github.com/ijoolaie/imoxy-net/actions/runs/41470748385) passed `npm run verify` on branch head `0182d50a5f96bdd714ba963e610d11e829d984df` (including the corrected connector, regression test, diagnostics, and documentation). The exact code/test portion had also passed on `f017a158a6c5acbf96526453c6062003d746f6d2` in run 41470557428. Earlier intermediate CI failures were caused by malformed literal newline escapes and then a comment swallowing the connector declaration; both were corrected before the passing run. No local test run was performed.
- PR #169 merged as `3f756a18222e02d1fd63b9f1cbba56359a92b3e9`: https://github.com/ijoolaie/imoxy-net/pull/169. Exact PR-head CI run 41470869578 and post-merge main CI run 41470978094 both passed `npm run verify`. The correction is now on main. Next, manually dispatch a fresh isolated workflow from Actions with `confirm_disposable_run=true`; the current GitHub integration has no workflow-dispatch action. Inspect detailed Wrangler/client diagnostics plus D1 accounting and cleanup. Do not claim runtime acceptance unless all gates pass.
- Active phase: Phase 6. Phases 0–5 and 7–11 remain In progress; Phase 12 Blocked; Phase 13 Not started. No phase is Complete.


## 2026-11-02 — relay-stage diagnostic instrumentation

- Objective: localize the second disposable Cloudflare Service Binding smoke stall without changing traffic limits or touching existing Cloudflare resources.
- Repository: ijoolaie/imoxy-net; branch: test/vless-relay-stage-diagnostics; base: b4fd8f64f53c68737e4c6c7d26bb0efc8fb0a77f.
- Reconfirmed main at b4fd8f64f53c68737e4c6c7d26bb0efc8fb0a77f and no open PRs before creating this branch.
- Second runtime evidence: run [41471462310](https://github.com/ijoolaie/imoxy-net/actions/runs/41471462310) completed VLESS handshake and sent frames, but received 16,390/65,542 bytes before the 8.5-second timeout. Complete echo, D1 accounting/settlement, and session lease release were not accepted. Run-owned resource cleanup and absence verification passed. No production or pre-existing staging resource was touched.
- Changes on this branch: optional onDiagnostic callback in src/proxy/vless-websocket-handler.js; payload-free timing for quota reserve, mark-forwarding, TCP write/read, WebSocket send, and quota settle; disposable VLESS Worker logs these events; disposable Echo Worker counts chunks/bytes via a pass-through transform; handler unit test verifies event coverage and redaction. Default production behavior remains no-op because callback defaults to null.
- Commits so far: 758c047fa558e6b9943a1a76370a2c8899c6f628, c681751b6129ed2848ba4e823aa8dc25510a316c, 022623d256dad926aa4fab28f39628422ee71384, b2be06411b4b851cce7ab35daf46e89b28b4aebe.
- Tests: not yet observed for this branch. No Cloudflare workflow dispatched and no Cloudflare resources created or modified. Runtime caps remain 10 seconds, 8 MiB, 16 KiB frames, max two clients.
- Next: review the exact diff and syntax; run npm run verify via branch CI; fix any failures; update docs with exact CI SHA/result; open a focused PR. Do not rerun Cloudflare until diagnostics code/test passes CI and the diff is reviewed. Then a manually dispatched isolated run may proceed under the existing approval and cleanup rules.
- Active phase: Phase 6. Phases 0–5 and 7–11 In progress; Phase 12 Blocked; Phase 13 Not started. No phase is Complete.


## Verification update — 2026-11-02

- Exact code/test head `c3906ceee8c6912c3b9a99800ee26caf5655f614` passed GitHub Actions CI run [41474182459](https://github.com/ijoolaie/imoxy-net/actions/runs/41474182459), step `npm run verify` success.
- Intermediate commit `e6bfc0fc31453ad306cd523597a0e72bc8e35b02` had a failing CI run [41474144661](https://github.com/ijoolaie/imoxy-net/actions/runs/41474144661): the diagnostic regression test was added before the harness passed the callback. The callback wiring was added in `c3906ce...`, and the exact latest code/test head passed. No failure is being hidden or treated as passing.
- Current branch has documentation-only follow-up commits after the tested code/test head. Recheck exact final branch head and its CI before PR review.
- No Cloudflare workflow dispatched; no Cloudflare resources created or modified.


## PR review and merge gate — 2026-11-02

- Opened PR #170: https://github.com/ijoolaie/imoxy-net/pull/170 (`test(vless): instrument disposable relay stages`). Exact PR-head CI run [41474770298](https://github.com/ijoolaie/imoxy-net/actions/runs/41474770298) completed `npm run verify` successfully on `2f961bf196f6140eb932cb7f61da45181ea3f408`.
- Reviewed the nine-file diff: optional callback defaults to null; production callers do not enable it; the disposable Worker alone emits redacted stage events; the echo transform logs byte/chunk counts only; tests cover callback event presence and redaction. Existing limits and resource isolation are unchanged.
- A squash-merge request for PR #170 was blocked by the host safety controls. Do not attempt to bypass the block. PR remains open pending an authorized merge action.
- No Cloudflare workflow was dispatched and no Cloudflare resources were created or modified.
- Next: merge PR #170 through the normal GitHub UI/authorized path; verify post-merge main CI; only then manually dispatch the isolated diagnostic smoke workflow and inspect per-stage logs plus D1 accounting/cleanup. Existing Production and staging remain out of scope.


## Post-merge update — 2026-11-02

- PR #170 was successfully squash-merged. Merge commit: `2e32f2ceeff85ef18ff830b5cdb2aeb095ca422a`. The prior note that the merge was blocked is historical and superseded by this update.
- Post-merge `main` CI run [41475812834](https://github.com/ijoolaie/imoxy-net/actions/runs/41475812834) checked out the merge commit and `npm run verify` completed successfully; the overall workflow was still finishing post-job cleanup at last inspection.
- No Cloudflare workflow was dispatched; no Cloudflare resources were created or modified.
- Next gate: confirm run 41475812834 is fully completed successfully, then manually dispatch `VLESS Cloudflare disposable smoke` from `main` with `confirm_disposable_run=true`. Inspect diagnostic stage events and Echo counters, require exact bidirectional byte totals, D1 reservation settlement, zero active leases, and verified deletion of only run-owned Worker/D1 resources. Keep 10-second, 8-MiB, 16-KiB, max-two-client caps. Never touch Production or existing staging.
- Active phase remains Phase 6; no phase exit criteria are met.


## Post-merge update — 2026-11-02

- PR #170 was successfully squash-merged. Merge commit: `2e32f2ceeff85ef18ff830b5cdb2aeb095ca422a`. The earlier note that merge was blocked is historical and superseded by this update.
- Post-merge `main` CI run [41475812834](https://github.com/ijoolaie/imoxy-net/actions/runs/41475812834) completed successfully on that exact merge commit; `npm run verify` passed.
- No Cloudflare workflow was dispatched; no Cloudflare resources were created or modified.
- Next gate: manually dispatch `VLESS Cloudflare disposable smoke` from `main` with `confirm_disposable_run=true`. Inspect diagnostic stage events and Echo counters; require exact bidirectional byte totals, D1 reservation settlement, zero active leases, and verified deletion of only run-owned Worker/D1 resources. Keep 10-second, 8-MiB, 16-KiB, max-two-client caps. Never touch Production or existing staging.
- Active phase remains Phase 6; no phase exit criteria are met.

## 2026-11-02 — bounded relay diagnostics retrieval

- Objective: make the failed disposable relay run observable after Wrangler remote-preview console output omitted callback markers.
- Repository: `ijoolaie/imoxy-net`; branch: `test/vless-bounded-diagnostics-clean` based directly on current `main`.
- Added a test-only `GET /_test/diagnostics` endpoint to the disposable VLESS smoke Worker. Access requires a random per-run token from the temporary Wrangler config. The response is `no-store` and contains at most 256 allowlisted records (event, direction, bytes, durationMs, errorName), plus a dropped-event count. No payloads, credentials, account/session identifiers, reservation IDs, or destinations are included.
- Added tests for token gating, field allowlisting/redaction, and bounded retention. Earlier exact-head implementation CI passed run [41480382039](https://github.com/ijoolaie/imoxy-net/actions/runs/41480382039); this clean branch requires its own exact-head CI.
- Updated parity matrix, acceptance plan, decision log, reference baseline, roadmap, and nonproduction smoke gate to record the diagnostic channel and evidence boundary.
- Limitation: the ring buffer is isolate-local. If the diagnostic fetch reaches a different Worker isolate, an empty response is inconclusive. Do not interpret it as proof that handler events did not occur.
- No Cloudflare workflow was dispatched; no Cloudflare resources were created or modified. Existing Production and staging remain out of scope. Preserve the 10-second, 8-MiB, 16-KiB, and two-client limits.
- Next: verify exact-head CI, inspect the clean diff against `main`, open a focused PR, and wait for exact PR-head CI before the user manually dispatches the isolated smoke workflow.

## Post-merge update — 2026-11-02

- PR #173 merged successfully as `ff3c25ae1013357cffdc5035f876de1d321fc8dc`: https://github.com/ijoolaie/imoxy-net/pull/173.
- Exact PR-head CI run [41520377660](https://github.com/ijoolaie/imoxy-net/actions/runs/41520377660) passed `npm run verify`; post-merge `main` CI run [41520550650](https://github.com/ijoolaie/imoxy-net/actions/runs/41520550650) also passed `npm run verify` on the merge commit.
- Superseded PR #172 was closed unmerged because it included duplicate historical changes from the already-merged PR #170. The replacement PR #173 is based directly on `main` and contains only 10 focused files.
- Issue #78 updated with the merge and runtime gate.
- No Cloudflare workflow was dispatched and no Cloudflare resources were created or modified. The diagnostics buffer is isolate-local; an empty response from another isolate is inconclusive.

## 2026-11-04 — local VLESS audit and Cloudflare smoke follow-up

- Objective: continue both the local VLESS verification path and the explicitly authorized disposable Cloudflare runtime path.
- Repository/workspace: `ijoolaie/imoxy-net`, `C:\\Users\\Ali\\imoxy-net-review-worktree`; branch `fix/vless-smoke-timeout-diagnostics`; current branch head remains `1cdb34a8e82364f9cda1de1a730d94cd7b9a2c28` per the preceding verified session.
- Git status was clean and tracking its origin branch; `git diff --check` passed. No source changes were made.
- Re-ran `npm test`: 233 tests, 232 passed, 0 failed, 1 skipped. The skipped test is `test/vless-local-tcp.integration.test.js` unless `IMOXY_TCP_ECHO_TEST=1` and a TCP echo server is available.
- Located an already-running process named `TcpEchoServer`; an attempt to start a second listener on 127.0.0.1:5000 was safely rejected by EADDRINUSE and the existing process was not modified. With `IMOXY_TCP_ECHO_TEST=1`, ran `node --experimental-sqlite --test test/vless-local-tcp.integration.test.js`: 1 passed, 0 failed, 0 skipped. This exercises the handler against local TCP echo plus SQLite-backed D1 adapter, including exact bidirectional bytes, quota settlement and lease release; it is not Cloudflare Worker/D1 runtime proof.
- Re-ran the three syntax checks equivalent to `npm run check`; `worker.js`, `scripts/vless-cloudflare-runtime-smoke.mjs`, and `scripts/vless-service-binding-cloudflare-smoke.mjs` each exited 0. A direct `npm run verify` invocation was not completed in this session; do not claim the composite command ran.
- Reviewed `.github/workflows/vless-cloudflare-smoke.yml` and its runner. It is workflow_dispatch-only, restricted to `main` plus `confirm_disposable_run=true`, pins the approved test account, creates run/attempt-unique D1 and Worker resources, applies migrations 0001–0008, uses an internal-only Worker-to-Worker TCP Service Binding, enforces bounded limits, and cleans up only resources it created with absence verification.
- User explicitly authorized both local and Cloudflare paths in this turn. However, the available GitHub integration exposes no workflow-dispatch action (only read operations and rerun actions); no supported dispatch was available. Do not substitute raw API calls, shell/gh CLI, or another tool to bypass this limitation. Owner must manually dispatch Actions → “VLESS Cloudflare disposable smoke” from `main` with `confirm_disposable_run=true`. Then inspect the exact run, D1 accounting, bidirectional byte totals, zero active leases/reservations, and cleanup absence before claiming acceptance.
- No Cloudflare workflow was dispatched in this session; no Cloudflare resources, existing staging, or Production were changed. PR #175 remains open and untouched. PR #176 remains merged.
- Next: owner manually dispatches the bounded workflow through GitHub Actions UI; after it completes, inspect logs/jobs and confirm resource cleanup. Separately, continue local code review for unresolved IPv4/IPv6 special-purpose filtering and runtime-buffer bounds; these remain distinct from test passes.
- Phase status unchanged: Phase 6 In progress; Phase 12 Blocked; Phase 13 Not started; no phase is Complete.
- Next: manually dispatch `VLESS Cloudflare disposable smoke` from `main` with `confirm_disposable_run=true`, then inspect the stage diagnostics, exact bidirectional byte totals, D1 reservation settlement, zero active leases, and verified deletion of only run-owned resources. Keep the 10-second, 8-MiB, 16-KiB, max-two-client caps. Never touch Production or existing staging.

## 2026-11-04 — continuation verification

- Rechecked the local worktree: branch `fix/vless-smoke-timeout-diagnostics` at `1cdb34a8e82364f9cda1de1a730d94cd7b9a2c28`, tracking origin; only `HANDOFF.md` is modified. `git diff --check` passed (Git emitted only the expected LF-to-CRLF working-copy warning).
- Re-ran the complete `npm test` suite: 233 tests, 232 passed, 0 failed, 1 skipped; exit code 0. The one skip remains the opt-in local TCP integration test, which passed when explicitly enabled in the preceding session.
- Reconfirmed the GitHub integration exposes no workflow-dispatch action. No Cloudflare workflow was dispatched and no Cloudflare resources were created or changed. Manual GitHub Actions dispatch remains the required next gate; do not bypass the connector limitation with raw API/CLI/shell.

## 2026-11-04 — VLESS destination and buffering audit

- Reviewed `src/proxy/vless-websocket-handler.js` destination validation, DNS-over-HTTPS A/AAAA handling, numeric address normalization, connected-peer pin verification, handshake/idle/session timers, and WebSocket message queueing. IPv4 and IPv6 special-purpose filtering has dedicated regression coverage, including ORCHIDv2 and NAT64; DNS answers are family-checked, normalized, deduplicated, and filtered before numeric pinned dialing. Connected peer identity is checked before any initial payload is forwarded.
- Reviewed buffer/relay controls: initial handshake buffer is capped at 64 KiB; queued client messages at 1 MiB; dial candidates at 8; download budget is finite/config-required; upstream reads are serialized behind downstream send/settlement to prevent unbounded app-managed accumulation. Tests cover queue overflow, slow/non-reading downstream, download limit, stalled DNS/connect/open, and cleanup.
- No concrete defect was established in this read-only pass; this is code/test review, not proof against every IANA special-purpose allocation, DNS-provider behavior, or Cloudflare runtime semantics. No code change was justified without a reproducible failing case.
- Re-ran `npm test` on branch head `1cdb34a8e82364f9cda1de1a730d94cd7b9a2c28`: 233 tests, 232 passed, 0 failed, 1 skipped; exit code 0 (29.1 seconds). The skipped test is the opt-in local TCP integration test, which passed explicitly in the prior session.
- Cloudflare dispatch remains blocked by missing supported workflow-dispatch action in the GitHub integration. No Cloudflare resources were created/modified. Next gate remains owner-run GitHub Actions dispatch from `main` with `confirm_disposable_run=true`, followed by full byte/accounting/lease/cleanup evidence review.
- No source changes, commits, pushes, merges, or roadmap status changes. PR #175 remains open; PR #176 merged. Production and existing staging untouched. Phase 6 remains In progress; Phase 12 Blocked; Phase 13 Not started; no phase is Complete.
- No source changes, commits, pushes, merges, or phase-status changes were made. PR #175 remains open and untouched; PR #176 remains merged. Production and existing staging remain untouched.
- Active phase remains Phase 6; no phase exit criteria are met.

## 2026-11-04 — Cloudflare disposable smoke run #5 results

- User supplied job URL: https://github.com/ijoolaie/imoxy-net/actions/runs/41788516473/job/126436155967. GitHub read-only inspection confirms workflow run 41788516473 (run #5, attempt 1), branch `main`, commit `026b7aff1fd6cc13cf063350e951760a9e0c7465`, completed with conclusion `failure`. Job 126436155967 failed only at `Run isolated Cloudflare VLESS smoke`; setup, checkout, and Node setup succeeded.
- All D1 migrations 0001–0008 applied and the internal disposable TCP Echo Worker deployed. The Node VLESS client reported `ok: true` for two concurrent Worker WebSocket → VLESS handler → Service Binding TCP echo sessions. Exact totals: upload 131,084 bytes and download 131,084 bytes; each session transferred 65,542 bytes in each direction and received the complete echo. This resolves the previous partial-echo symptom for this run.
- Final Worker-bound D1 counters: upload 131,084; download 131,084; request_count 2; active reservations 0; settled reservations 44; released reservations 0; settled bytes 262,168. The 44 settled reservation rows reflect transport chunking and are not by themselves evidence of a quota-accounting failure: settled bytes exactly equal upload plus download.
- Acceptance failed because `activeSessions=1` remained at the end of the runner's 15-second polling window; expected 0. This is a real lease-release/cleanup acceptance failure. Do not claim Cloudflare runtime acceptance. The remaining row may be a close-event/lease-release timing or Worker-isolate lifecycle issue; current logs do not establish which. The handler calls `closeSession` on the server WebSocket close event and awaits TCP socket closure before attempting `releaseProxySession`; release errors are intentionally swallowed to retain uncertain leases. Need targeted evidence before changing this behavior.
- The test-only diagnostics request returned `available:false, error: TypeError`; this is consistent with the local Wrangler preview diagnostics fetch being unavailable, but the log does not identify the underlying network/runtime cause. The diagnostics ring buffer is isolate-local, so this is not proof that handler callbacks did not execute. No diagnostic events were available to correlate lease acquisition/release.
- Cleanup completed and verified absence of the run-owned disposable Worker and D1 database. GitHub reported no run artifacts. No Production or pre-existing staging resource was touched.
- Next: investigate lease release with a deterministic regression test and additional payload-free diagnostic evidence, distinguishing server WebSocket close delivery, socket-close completion, D1 release invocation/result, and isolate shutdown. Preserve conservative behavior on ambiguous release errors. Do not merely weaken the acceptance assertion or force-delete/expire active leases. Any code changes must be on the existing feature branch, tested locally and by exact-head CI, then reviewed in a focused PR; do not commit to main or merge without explicit request. PR #175 remains open and untouched; PR #176 remains merged.
- No source code changes, commits, pushes, merges, or Cloudflare dispatches were made during this review. The run itself was manually dispatched by the repository owner; its own cleanup passed. Phase 6 remains In Progress, Phase 12 Blocked, Phase 13 Not started; no phase is Complete.
## 2026-11-04 - VLESS lease-release follow-up review

- Rechecked the session lifecycle implementation, D1 release query, and focused tests on `fix/vless-smoke-timeout-diagnostics`. No source-code changes were made.
- `src/storage/d1-store.js` deletes a lease only when both `session_id` and `account_id` match, and reports whether exactly one row changed. Existing SQLite-backed tests cover successful release, idempotent second release, account isolation/conflict behavior, expiry cleanup, and active-lease deletion constraints. The focused D1/quota test run passed 10/10.
- The VLESS handler's current `onDiagnostic` events cover quota reserve/mark/settle and TCP/WebSocket forwarding, but do not record WebSocket close-event delivery, close reason, TCP socket-close completion, lease-release invocation, boolean result, or release error class. Thus Run #5 has no stage evidence for the exact failing boundary.
- Existing handler tests use `FakeWebSocket.close()` that synchronously dispatches a `close` event. This is useful for deterministic unit tests but does not model asynchronous/delayed close-event delivery from the Cloudflare runtime. The handler test file passed 59/59; this does not prove Cloudflare close-event semantics.
- Clarified the diagnostics route: `test/vless-service-binding-tcp-smoke-worker.js` is the disposable VLESS wrapper Worker; it constructs the VLESS handler with the payload-free diagnostic recorder and serves `/_test/diagnostics` from the same wrapper. It is not implemented in production `worker.js` and is not served by the separate TCP Echo Worker. The runner's fetch TypeError therefore remains an unexplained preview-fetch failure, not evidence that the endpoint is absent or that handler diagnostics did not run.
- No deterministic local defect currently reproduces the Run #5 active lease. Do not change the D1 predicate, weaken the zero-active-session acceptance check, force-delete a lease, or infer that a false release result is harmless. Next code-focused step, if authorized, is to add payload-free lifecycle events for admission, close event, socket close, and release result (including the false/no-row case), plus tests with delayed/independently controlled close-event delivery and a blocked/rejected socket-close promise. Preserve fail-closed behavior on ambiguous release.
- Focused checks: `test/vless-websocket-handler.test.js` passed 59/59; `test/quota-reservation-store.integration.test.js` plus `test/d1-store-sqlite.test.js` passed 10/10. `git diff --check` passed with only the existing LF-to-CRLF warning. Worktree still contains only the pre-existing `HANDOFF.md` modification; no source changes, commits, pushes, merges, or Cloudflare runs.
- PR #175 remains open and untouched; PR #176 remains merged. Production and pre-existing staging remain untouched. Phase 6 remains In Progress; Phase 12 Blocked; Phase 13 Not started; no phase is Complete.

## 2026-11-04 - VLESS lifecycle diagnostics and regression coverage

- Added payload-free handler diagnostics for successful session lease acquisition, WebSocket close-event delivery, close initiation (close code and internal reason), pending/active TCP socket close start/completion/error, and lease release start/result/error class. The release result is explicitly recorded as a boolean; a false result is not treated as successful deletion.
- Preserved conservative behavior: lease release remains single-shot; exceptions remain ambiguous and do not trigger a speculative retry or force-free. TCP socket close completion remains awaited before the lease release call. Stream reader cancellation/writer abort remain non-blocking cleanup.
- Updated the disposable VLESS smoke wrapper's recorder allowlist for the lifecycle fields (kind/reason/code/released), preserving payload/session/account/reservation exclusion. Added a separate bounded lifecycle log budget (32 records) so high-volume TCP chunk logs cannot crowd close/release evidence out of the GitHub job log. Existing general diagnostic log budget remains 64; in-memory ring remains 256.
- Added handler regression coverage that gates TCP socket close on a manually released promise and proves lease release does not begin until socket close completes; asserts diagnostic event ordering and payload-free fields. Extended the existing failed-upstream/repeated-close test to assert lease acquisition, close, and release event ordering.
- Extended wrapper diagnostics test to prove lifecycle metadata (including boolean release result) survives the allowlist while identifiers/payload remain excluded; endpoint remains token-gated, bounded, and no-store.
- Verification: \`npm run verify\` exited 0; it ran \`npm run check\` and \`npm test\`. Full suite: 234 tests, 233 passed, 0 failed, 1 skipped. The modified handler-focused test file passed 60/60 before full verify; wrapper diagnostics test passed 5/5. Explicit \`node --check\` passed for all four modified JavaScript source/test files.
- This instrumentation does not establish the Cloudflare runtime root cause and has not been deployed or exercised in a new Cloudflare run. Run #5 remains failed acceptance due to one active session lease at the end of polling. No workflow dispatch/rerun was performed.
- No commits, pushes, or merges. PR #175 remains open and untouched; PR #176 remains merged. Production and pre-existing staging remain untouched. Phase 6 remains In Progress; Phase 12 Blocked; Phase 13 Not started; no phase is Complete.

## 2026-11-04 - lifecycle diagnostics change review and verification

- Reviewed the complete five-file diff on `fix/vless-smoke-timeout-diagnostics`. Lifecycle fields are explicitly allowlisted; identifiers and payload data remain excluded. Lifecycle log output has its own 32-record cap, separate from the general 64-record cap and 256-event in-memory ring.
- Replaced two malformed replacement-character headings in this handoff with ASCII hyphens; no source behavior changed by that documentation cleanup.
- Re-ran `npm run verify`: `npm run check` and the full Node test suite both exited 0; 234 tests, 233 passed, 0 failed, 1 skipped. The skip is the opt-in local TCP integration test.
- `git diff --check` passed; only the standard Windows LF-to-CRLF working-copy warnings appeared. Changes remain limited to `HANDOFF.md`, the VLESS WebSocket handler, disposable smoke Worker, and their two focused test files.
- Runtime acceptance is still unproven: Cloudflare disposable smoke run #5 remains failed with `activeSessions=1`. No new Cloudflare dispatch, deployment, or resource mutation was performed. Production and existing staging remain untouched.
- PR #175 remains open and untouched; PR #176 remains merged. No merge was performed. Phase 6 remains In Progress; Phase 12 Blocked; Phase 13 Not started; no phase is Complete.

## 2026-11-04 - lifecycle diagnostics PR handoff

- Final review branch: `fix/vless-lifecycle-diagnostics`, based directly on `main`; implementation commit `720b59bde17a542bea32454445b6e19abd6d21cd` (`fix(vless): add session lifecycle diagnostics`). The branch comparison against `main` contained exactly one commit and five intended files: this handoff, the VLESS WebSocket handler, the disposable smoke Worker, and their two focused test files.
- Opened PR #178: https://github.com/ijoolaie/imoxy-net/pull/178. It is open and unmerged. PR #177 was closed unmerged as a superseded draft because its original branch ancestry included already-squash-merged PR #176 changes. The temporary branch `fix/vless-smoke-timeout-diagnostics` was left intact; no force-push was used.
- Exact-head CI for implementation commit `720b59bde17a542bea32454445b6e19abd6d21cd` completed successfully: run 41803187022 (CI run 1094), job `test`, including `npm run verify`.
- Local `npm run verify` passed: 234 tests, 233 passed, 0 failed, 1 skipped (opt-in local TCP integration). `git diff --check` passed and the worktree was clean before this handoff update.
- No PR was merged. PR #175 remains open and untouched; PR #176 remains merged. Cloudflare smoke run #5 remains a runtime acceptance failure (`activeSessions=1`). No new Cloudflare workflow dispatch, deploy, or resource mutation occurred. Production and existing staging remain untouched.
- Phase status unchanged: Phase 6 In Progress; Phase 12 Blocked; Phase 13 Not started; no phase is Complete.
