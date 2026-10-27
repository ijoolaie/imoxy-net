# imoxy-net — HANDOFF

> Living hand-off document. Update this file in every work session before stopping.

## Current status
- **Updated:** 2026-10-27
- **Repository:** https://github.com/ijoolaie/imoxy-net (private)
- **Working branch:** `chore/rebuild-foundation`
- **Pull request:** https://github.com/ijoolaie/imoxy-net/pull/1
- **PR state at last check:** open, not merged; reported mergeable.
- **Latest known branch commit:** `1abda54e8015677b111316749c1ff1dbcea59f8e`
- **Product status:** foundation only; not Nova Proxy parity and not production deployed.

## Goal
Build an independently implemented product with behavior matching a pinned Nova Proxy reference before adding imoxy-specific changes. The web panel, Telegram bot and Android APK must share domain services. Required workflows: panel only; Cloudflare resources/settings only; panel plus Cloudflare resources/settings.

## Completed in the current session
- Rebuilt a minimal Worker foundation with `GET /health` and `GET /api/v1/capabilities`.
- Added Node built-in tests for health, capability reporting, unknown routes and unsupported methods.
- Added GitHub Actions CI workflow and initial project documentation.
- Added `docs/reference-baseline.md` with the Nova Proxy 5.0.0 baseline, release commit and published worker checksum.
- Initial CI run for commit `7c6383ae8bfc4f2f32ef2f86605e07328fcd9191` completed successfully.
- CI run for commit `216790977ca6917adac707b765deb7feafcd0db2` completed successfully.
- A later documentation commit `1abda54e8015677b111316749c1ff1dbcea59f8e` was confirmed present on the PR branch; a workflow result for that exact SHA was not returned at last check.

## Reference baseline and licensing
- Upstream: https://github.com/IRNova/Nova-Proxy
- Target: version 5.0.0, release date shown as 2026-10-21.
- Pinned reference commit: `ad2116aa89f8c7db8248f8142c1432900d835eb7`.
- Published worker SHA-256: `239f1b358c1a511da1bf0103c995d746a55b6d532ed9af1ead1febeac4566935`.
- Upstream license observed: PolyForm Noncommercial 1.0.0; upstream README says versions through 4.2.0 were MIT and Nova-authored changes from 4.3.0 onward are PolyForm Noncommercial.
- Implement behavior independently. Do not copy protected source or assets. Review commercial/distribution rights before release.

## Known limitations
- Authentication/session management, accounts, quotas, subscription generation, proxy protocols/transports, Cloudflare provisioning, Telegram bot, web panel and Android client are not implemented.
- The parity matrix remains unassessed except for the minimal foundation tests; those tests do not establish compatibility with Nova.
- No live Cloudflare mutations or deployment were performed.
- Do not merge PR #1 until the latest head commit's checks and diff are reviewed.

## Next actions
1. Recheck PR #1 state, branch head SHA, changed files and CI for the exact current head.
2. Ensure `AGENTS.md`, this hand-off and the docs are included in the PR.
3. Pin and document the source of each 5.0.0 behavior requirement; turn documented behavior into black-box acceptance cases without copying upstream implementation.
4. Prioritize baseline characterization of install/bootstrap, authentication, account model, subscription formats, and core protocol/transports.
5. Implement one small slice at a time, test it, update the parity matrix and acceptance plan, and update this hand-off.
6. Keep every completion report evidence-based; never claim parity or production readiness without corresponding tests.

## Required update rule
At the end of every future session, update this file with the latest date, exact branch and commit SHA, changed files, tests and results, PR/CI state, blockers, and the next action.
