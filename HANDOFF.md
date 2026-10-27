# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PRs #1–#8: foundation, API/domain contract, security primitives, D1 account adapter, account service, auth/session service, HTTP auth/account routes, quota/usage foundations.
- Merged PR #9: SQLite migration/schema integration tests; exact PR-head CI run 40469034249 passed with 62 tests.
- Current work branch: feat/subscriptions.
- Branch head before this hand-off edit: d04bc8a56c9c465235777a7c5413c9c2bf38de99.
- Current feature work: subscription token lifecycle and provisional Auto/Base64 rendering service with D1 persistence and tests. Exact-head CI must be checked after this edit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Current branch work
- Added src/domain/subscription-service.js for subscription token creation, list, idempotent revocation, account/subscription expiry checks, and Auto/Base64 text rendering over injected URI entries.
- Subscription tokens are generated randomly; D1 persists only token hashes. Management lists omit both raw tokens and hashes.
- D1 adapter supports create/list/find/revoke/touch operations with audit batching.
- Extended RBAC with subscription read/create/revoke permissions for admin/operator roles; viewer cannot revoke.
- Added tests for expiry caps, inactive accounts, raw-token secrecy, revocation, Auto/Base64 equivalence, malformed formats, D1 persistence and RBAC.
- Updated roadmap, API contract, acceptance plan, decision log and README.
- The subscription service is not yet wired to public HTTP delivery because protocol-entry generation and reference-verified output formats are not yet implemented.

## Known gaps
- Exact-head CI is not yet confirmed for this branch.
- Cloudflare D1 has not been exercised against a real database; SQLite migration tests pass, but D1-specific batch behavior, backup/restore, concurrency and rollback remain unverified.
- Subscription Auto/Base64 behavior is a provisional imoxy implementation, not verified Nova compatibility; Clash format and HTTP subscription delivery are not wired.
- Proxy protocol/transport generation and traffic-data-plane quota enforcement remain unimplemented.
- Cloudflare provider workflows, web panel, Telegram bot and Android APK remain unimplemented.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query exact branch SHA and CI after this hand-off edit; fix failures before merge.
2. Implement protocol endpoint models/generation and reference-compare VLESS/Trojan/Shadowsocks URI output.
3. Wire subscription management and public delivery routes after the output generator is ready; verify Auto/Base64/Clash semantics.
4. Add actual Cloudflare D1 integration and recovery validation when scoped credentials/database are available.
5. Build Cloudflare adapter read-only/mock-first, then web panel, Telegram bot and Android client over the shared API.
6. Execute parity scenarios and controlled release/security gates.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
