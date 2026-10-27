# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PRs #1–#12: foundation, API/domain contract, security, D1 account adapter, account service, auth/session service, auth/account routes, quota/usage foundations, SQLite migration tests, subscription lifecycle, and protocol/Clash generators.
- Merged PR #12 CI passed on exact head cd70edebf5f8c7c3123581db1a8d418558c7b999.
- Current work branch: feat/cloudflare-readonly.
- Branch head before this hand-off edit: e13649a95c9454e6b506ba6d84327356adc27543.
- Current work adds a GET-only Cloudflare client, protected inventory and dry-run plan routes, sanitized plan generation, and panel-only/cloudflare-only/combined mode gating. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules.

## Current branch work
- src/providers/cloudflare-client.js performs GET-only account, zone, Worker script, KV, D1, DNS and Worker-route inventory with bounded pagination and sanitized errors.
- src/providers/cloudflare-plan.js creates deterministic, sanitized dry-run plans for KV, D1, DNS and Worker resources. Operations require explicit approval; deletion is never generated automatically, and Worker source updates are not planned without content hashes.
- src/http/api.js exposes authenticated GET /api/v1/cloudflare/inventory and POST /api/v1/cloudflare/plan. No write/apply endpoint exists.
- src/domain/operating-mode.js supports panel-only (default), cloudflare-only and combined; unrelated route families return 404.
- Tests use mocked Cloudflare responses only. No Cloudflare token, real account, provider API call or live mutation was used.
- Added docs/cloudflare-integration.md and updated operations, roadmap, acceptance, API contract and README.

## Known gaps
- Exact-head CI is not yet confirmed for this branch.
- The provider inventory/plan API has not been tested against a real Cloudflare account; actual permission scopes, endpoint shape variations, provider rate limits and partial failures remain unverified.
- No provider writes, apply/confirmation workflow, idempotency, post-change verification or rollback exist.
- D1 Cloudflare-specific batch behavior, backup/restore, concurrency and rollback remain unverified.
- Subscription delivery is not wired to persistent proxy-node configuration; quota service is not wired to a proxy data plane.
- Web panel, Telegram bot and Android APK remain unimplemented.
- Reference scenarios have not been executed against an authorized Nova 5.0.0 runtime.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Open/verify a PR and check CI on the exact current head.
2. Validate read-only inventory against a dedicated Cloudflare test account with least-privilege scopes.
3. Implement encrypted proxy-node configuration and subscription delivery; never persist plaintext proxy credentials.
4. Add D1-specific integration/recovery tests and atomic/idempotent quota reporting.
5. Build Cloudflare writes only after a displayed plan hash, explicit confirmation, idempotency, audit, verification and rollback exist.
6. Build the web panel, Telegram bot and Android APK over the shared API/domain services.
7. Execute Nova reference scenarios, security/reliability tests and release gates.
8. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
