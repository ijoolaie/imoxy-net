# imoxy-net — HANDOFF

> Living hand-off. Update every session. The recorded branch SHA is the head observed immediately before this hand-off edit; editing this file creates a new commit, so always re-query GitHub after the edit.

## Current status (2026-10-27)
- **Repository:** https://github.com/ijoolaie/imoxy-net (private)
- **Working branch:** `chore/rebuild-foundation`
- **Pull request:** https://github.com/ijoolaie/imoxy-net/pull/1
- **PR state at last check:** open, not merged. GitHub reported `mergeable: false` on the latest query; recheck before acting.
- **Branch head observed immediately before this hand-off edit:** `001d5d0ce5602d3fb1a631155f9d212a56161ed7`
- **CI:** no workflow run was returned for that exact SHA by the last query; status is unknown, not passed.
- **Product status:** foundation only; not Nova Proxy parity and not production deployed.

## Goal
Build an independently implemented product with behavior matching a pinned Nova Proxy reference before adding imoxy-specific changes. The web panel, Telegram bot and Android APK must share domain services. Required workflows: panel only; Cloudflare resources/settings only; panel plus Cloudflare resources/settings.

## Completed
- Minimal Worker foundation with `GET /health` and `GET /api/v1/capabilities`.
- Node built-in tests for health, capability reporting, unknown routes and unsupported methods.
- GitHub Actions CI workflow and initial project documentation.
- `docs/reference-baseline.md`: Nova Proxy 5.0.0 baseline, reference commit, published worker checksum and documented release-behavior hypotheses.
- `AGENTS.md`: mandatory engineering, compatibility, security, licensing and documentation rules.
- `HANDOFF.md`: restart instructions and current evidence-based status.
- CI runs for commits `7c6383ae8bfc4f2f32ef2f86605e07328fcd9191` and `216790977ca6917adac707b765deb7feafcd0db2` completed successfully. These results do not prove later commits pass.

## Reference baseline and licensing
- Upstream: https://github.com/IRNova/Nova-Proxy
- Target: version 5.0.0; release date shown as 2026-10-21.
- Pinned reference commit: `ad2116aa89f8c7db8248f8142c1432900d835eb7`.
- Published worker SHA-256: `239f1b358c1a511da1bf0103c995d746a55b6d532ed9af1ead1febeac4566935`.
- Upstream license observed: PolyForm Noncommercial 1.0.0. Upstream README says releases through 4.2.0 were MIT and Nova-authored changes from 4.3.0 onward are PolyForm Noncommercial.
- Implement behavior independently. Do not copy protected source/assets. Review commercial and distribution rights before release.

## Known limitations
- Authentication/session management, accounts, quotas, subscription generation, proxy protocols/transports, Cloudflare provisioning, Telegram bot, web panel and Android client are not implemented.
- The parity matrix remains unassessed except for minimal foundation tests; those tests do not establish compatibility with Nova.
- No live Cloudflare mutations or deployment were performed.
- Do not merge PR #1 until the complete diff is reviewed and checks pass on the exact final head.

## Next actions
1. Re-query PR #1, branch head, changed files and CI for the exact current SHA.
2. Review the complete PR diff, including `AGENTS.md` and this hand-off; resolve why `mergeable` was false and ensure checks pass.
3. Pin and document the source of each 5.0.0 behavior requirement; write black-box acceptance cases without copying upstream implementation.
4. Prioritize characterization of install/bootstrap, authentication, account model, subscription formats and core protocol/transports.
5. Implement one small slice at a time; test it; update the parity matrix, acceptance plan, decision log and this hand-off.
6. Report only verified outcomes; never claim parity or production readiness without corresponding tests.

## Mandatory rule
At every session end, update this file with date, exact branch/commit state, changed files, test results, PR/CI state, blockers and next action. Never infer CI success from an older SHA.
