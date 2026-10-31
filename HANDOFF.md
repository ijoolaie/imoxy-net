# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current state — 2026-10-27

- PR #32 rate-limit cleanup fix merged as `3a7f6e3417bac0692c0ef3da9064ed8d09b64a9a`; exact-head PR CI passed on `94688a1251987566b0b35ea6c43a31c8d4ac3056` (run 40502142149) and post-merge main CI passed on `3a7f6e3417bac0692c0ef3da9064ed8d09b64a9a` (run 40502210626). The regression test verifies successful login clears both IP and normalized-username rate-limit counters. This is an imoxy correctness fix, not Nova parity evidence.

- Repository: https://github.com/ijoolaie/imoxy-net (private).
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
