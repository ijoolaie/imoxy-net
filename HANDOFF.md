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
- Next actions: review/merge PRs #79 and #80 through normal repository review; then obtain explicit staging authorization, execute the bounded probe, record observed evidence and limitations, and update issue #78/handoff. Keep the backpressure acceptance criterion open until the evidence supports a defensible design.

