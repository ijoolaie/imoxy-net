# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PRs #1–#10: foundation, API/domain contract, security primitives, D1 account adapter, account service, auth/session service, HTTP auth/account routes, quota/usage foundations, SQLite migration tests, and subscription token lifecycle.
- PR #11 was closed without merging because the original feature branch diverged from the squash-merged PR #10 and GitHub reported merge conflicts. Its protocol changes have been ported onto a fresh branch from the current main merge commit; no feature work was intentionally discarded.
- Current work branch: feat/protocol-generators.
- Branch head before this hand-off edit: 84b23bd02cbd466cce5764dc9b9eee0c41d00d63.
- Current work adds clean-room VLESS/Trojan/Shadowsocks URI generation, Clash YAML generation, Clash subscription rendering and associated tests/docs. CI on this rebased/ported branch has not yet run.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Current work
- Added src/domain/protocols.js with clean-room URI generation for VLESS, Trojan and Shadowsocks, plus a conservative Clash YAML subset.
- Added provisional Clash output to the subscription service. Auto is newline-separated URIs; Base64 is standard Base64 of Auto; Clash is generated from structured node descriptors.
- Tests cover URI encoding, IPv6 authority formatting, invalid UUIDs/ports/ciphers/names, Clash output, duplicate names and unsupported XHTTP cases.
- Added docs/protocol-compatibility.md with explicit non-parity caveats and required reference/client tests.
- Subscription service is still not wired to public HTTP delivery because persistent proxy-node configuration and credential encryption are not implemented.

## Known gaps
- Exact-head CI is pending on this new branch.
- Subscription output is not verified against the pinned Nova runtime; no reference runtime has been run.
- Public subscription delivery and management routes are not wired; persistent proxy-node configuration and encrypted credential handling are missing.
- Cloudflare D1-specific batch behavior, backup/restore, concurrency and rollback remain unverified.
- Quota evaluation is not wired into proxy traffic, and no atomic quota reservation/idempotent usage events exist.
- Cloudflare resource workflows, web panel, Telegram bot and Android APK remain unimplemented.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Open/verify a PR for this branch and check CI on the exact head.
2. Implement encrypted proxy-node configuration and its D1 migration; never persist plaintext proxy credentials.
3. Wire subscription management/public delivery to persistent node descriptors and the protocol generator.
4. Execute REF-009–013 against an authorized Nova 5.0.0 runtime and import generated configs into target clients.
5. Implement Cloudflare resource adapter read-only/mock-first, then web panel, Telegram bot and Android client over shared services.
6. Add data-plane quota reservation, idempotent usage reports, D1 integration/recovery and release certification.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
