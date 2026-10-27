# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private)
- Merged PR #1: https://github.com/ijoolaie/imoxy-net/pull/1 — foundation; merge commit 2142591abdc863d7f7ab85f36a395fd7a8bc82a1, CI passed on PR head and main.
- Merged PR #2: https://github.com/ijoolaie/imoxy-net/pull/2 — API/domain contract, initial D1 schema, validation and reference scenarios; merge commit 2df44d025dddc90ca6e03c9da777b743d5c547c0; exact PR-head CI run 40466529161 passed.
- Current work branch: feat/security-foundation.
- Branch head before this hand-off edit: fe2a79f68231c888f283def69518f35a4234fbb8.
- Current feature work: initial Web Crypto password/session primitives and threat-model documentation added. Exact-head CI must be checked after this hand-off commit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. The web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Work delivered
- Merged repository foundation and CI (PR #1).
- Merged initial API contract, D1 schema draft, account input validation and tests, plus 28 prioritized reference scenarios (PR #2).
- Current branch adds src/security/crypto.js: salted PBKDF2-HMAC-SHA-256 password hashing, fail-closed password verification, random session bearer generation, and SHA-256 session-token hashing.
- Added test/security-crypto.test.js for password verification/tampering, weak inputs, random session credentials, token hashing and malformed hashes.
- Added docs/security-model.md describing assets, trust boundaries, initial controls, open threats and security release gates.
- Roadmap now tracks Phase 3 as in progress; no auth endpoints or authorization policy are claimed.

## Known gaps
- New security branch CI has not yet been confirmed on its exact final SHA.
- No HTTP login/logout/session endpoints, cookie settings, CSRF/origin checks, rate limits, bootstrap owner, role enforcement or session expiry/revocation enforcement.
- D1 migration has not been executed against a D1/SQLite environment; storage adapter, backup/restore and rollback tests are missing.
- Reference scenarios have not been executed against an authorized running Nova 5.0.0 instance.
- Account CRUD, quota enforcement, subscription generation, proxy protocol rendering, Cloudflare adapter, web panel, Telegram bot and Android APK remain unimplemented.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query the exact feature branch SHA and CI run after this hand-off edit.
2. Fix any CI/test findings; do not merge until CI passes on the exact latest PR head.
3. Add storage adapter and migration execution/recovery tests (Phase 4).
4. Implement session lifecycle and route-level authentication/authorization using these primitives; add throttling and cookie/CSRF controls before exposing login (Phase 3).
5. Implement account CRUD and audit writes through shared services.
6. Execute prioritized black-box scenarios against an authorized reference runtime and update the parity matrix with evidence.
7. Keep Cloudflare read-only/mock-first; live writes require preview, explicit confirmation and tested recovery.
8. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
