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
- Latest verified functional main commit before PR #33: `3a7f6e3417bac0692c0ef3da9064ed8d09b64a9a`; CI run 40502210626 passed. PR #33 merged the quota overflow guard; main CI run 40503173647 is pending. This handoff update itself will create a newer documentation-only commit and requires its own CI verification.
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


- PR #33 quota overflow guard merged as `96f5955f7a2dc7cbc8517b70399ecdc2b48299c3`; exact-head PR CI passed on `f8795de34b2a717623a529cac0f277f915546655` (run 40503117630). The regression test verifies combined upload/download deltas outside the safe-integer range are rejected before storage. Post-merge main CI is pending at handoff update time. This is not Nova parity evidence.
