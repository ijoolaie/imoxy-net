# imoxy-net — HANDOFF

> Living hand-off. Update every session. The recorded branch SHA is the head observed immediately before this hand-off edit; editing this file creates a new commit, so always re-query GitHub after the edit.

## Current status (2026-10-27)
- **Repository:** https://github.com/ijoolaie/imoxy-net (private)
- **Working branch:** `chore/rebuild-foundation`
- **Pull request:** https://github.com/ijoolaie/imoxy-net/pull/1
- **PR state at last check:** open, not merged. Latest metadata query returned `mergeable: true`; re-query after the newest commits.
- **Branch head observed immediately before this hand-off edit:** `84b2dec7eab489ff7d34c6d58e49dbe5f99d1a96`
- **CI:** CI for `fe696735c4149deab297169d76e62aba09db0bea` completed successfully (run 40464587527). The roadmap and README commits after that SHA still require CI validation; do not infer their status.
- **Product status:** foundation only; not behaviorally equivalent to the reference and not production deployed.

## Goal
Build an independently implemented product with behavior matching a pinned reference release before adding imoxy-specific changes. The web panel, Telegram bot and Android APK must share domain services. Required workflows: panel only; Cloudflare resources/settings only; panel plus Cloudflare resources/settings.

## Completed
- Minimal Worker foundation with `GET /health` and `GET /api/v1/capabilities`.
- Node built-in tests for health, capability reporting, unknown routes and unsupported methods.
- GitHub Actions CI workflow and initial project documentation.
- `docs/reference-baseline.md`: reference version 5.0.0, pinned commit, published worker checksum and documented behavior hypotheses.
- `AGENTS.md`: engineering, compatibility, security, licensing and documentation rules.
- `docs/roadmap.md`: 14 phases from governance and reference characterization through core services, Cloudflare, web, Telegram, Android, certification and imoxy-specific improvements.
- README links to the roadmap and engineering records.
- `HANDOFF.md`: restart instructions and evidence-based status.
- CI for commits `7c6383ae8bfc4f2f32ef2f86605e07328fcd9191`, `216790977ca6917adac707b765deb7feafcd0db2`, and `fe696735c4149deab297169d76e62aba09db0bea` was reported successful. Only the last of these was queried in this session; later commits need their own results.

## Reference baseline and licensing
- Upstream: https://github.com/IRNova/Nova-Proxy
- Target: version 5.0.0; release date shown as 2026-10-21.
- Pinned reference commit: `ad2116aa89f8c7db8248f8142c1432900d835eb7`.
- Published worker SHA-256: `239f1b358c1a511da1bf0103c995d746a55b6d532ed9af1ead1febeac4566935`.
- Upstream license observed: PolyForm Noncommercial 1.0.0. Upstream README says versions through 4.2.0 were MIT and Nova-authored changes from 4.3.0 onward are PolyForm Noncommercial.
- Implement behavior independently. Do not copy protected source/assets. Review commercial and distribution rights before release.

## Known limitations
- Authentication/session management, accounts, quotas, subscription generation, proxy protocols/transports, Cloudflare provisioning, Telegram bot, web panel and Android client are not implemented.
- The parity matrix remains unassessed except for minimal foundation tests; those tests do not establish compatibility.
- No live Cloudflare mutations or deployment were performed.
- Do not merge PR #1 until the complete diff is reviewed and checks pass on the exact final head.

## Next actions
1. Query PR #1 and CI for the exact current head after the roadmap/handoff commits.
2. Review the complete PR diff, especially the new roadmap and existing project governance docs; resolve any remaining checks or mergeability issues.
3. Start Phase 1: source each required behavior, turn the parity matrix into prioritized black-box scenarios, and record what is documented versus independently verified.
4. Prioritize install/bootstrap, authentication, account model, subscription formats, and core protocol/transports for characterization.
5. Implement one small slice at a time; test it; update the parity matrix, acceptance plan, decision log, roadmap, and this hand-off.
6. Report only verified outcomes; never claim parity or production readiness without corresponding tests.

## Mandatory rule
At every session end, update this file with date, exact branch/commit state, changed files, test results, PR/CI state, blockers and next action. Never infer CI success from an older SHA.
