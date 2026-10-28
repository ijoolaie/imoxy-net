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
