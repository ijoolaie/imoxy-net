# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PRs #1–#13: foundation, API/domain contract, security primitives, D1 account adapter, account service, auth/session service, auth/account routes, quota/usage foundations, SQLite migration tests, subscription lifecycle, protocol/Clash generators, and read-only Cloudflare inventory/planning with operating modes.
- PR #13 exact-head CI passed on 5e96db6b0ff1d6c927a3426d3a9f8a578b95a3c0.
- Current work branch: feat/web-panel.
- Branch head before this hand-off edit: 5c6e52f49616f00fa06ec2accd1f2b8da5ba8862.
- Current work adds a responsive same-origin browser panel, account listing/create, usage readout, Cloudflare inventory/dry-run preview, Workers Assets routing and static CSP. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, cloudflare-only and combined modes.

## Current branch work
- Added public/index.html, public/styles.css and public/app.js. The UI uses same-origin HttpOnly cookie sessions and textContent-based rendering.
- Login/session restore/logout, account list/create, read-only usage summaries and mode badge are wired to the shared API.
- Cloudflare inventory and dry-run plan preview are available in Cloudflare-enabled modes; there is no Apply action.
- Added public/_headers with CSP and static security headers.
- Worker routes non-API paths through Workers Assets when configured; wrangler.toml.example now documents the binding.
- Added docs/web-panel.md and updated operations, roadmap, acceptance plan and README.

## Known gaps
- Exact-head CI is not yet confirmed for this branch.
- The web panel is a first slice: account edit/disable/delete, subscriptions, nodes/protocol config, audit viewer, browser E2E and accessibility audit are missing.
- Subscription public delivery and persistent encrypted proxy-node configuration are not wired.
- Proxy data-plane quota enforcement, atomic reservations and idempotent usage events are not implemented.
- Cloudflare inventory/planning has only mocked tests; no real account or provider token was used, and no writes are exposed.
- Telegram bot and Android APK remain unimplemented.
- Reference scenarios have not been executed against an authorized Nova 5.0.0 runtime.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query exact branch SHA and CI after this hand-off edit; fix failures before merge.
2. Add browser E2E/accessibility checks and validate static asset routing on a test Worker.
3. Implement encrypted proxy-node storage, node CRUD and subscription delivery.
4. Implement Telegram bot and Android APK as clients of shared services/API.
5. Add data-plane quota reservation, idempotent usage reports and D1-specific recovery tests.
6. Execute Nova reference scenarios and release certification; only then consider phase 13 complete.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
