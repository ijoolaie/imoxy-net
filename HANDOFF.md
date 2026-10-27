# imoxy-net — HANDOFF

> Living hand-off. Re-query the branch head after editing this file because this edit creates a new commit.

## Current status (2026-10-27)
- Repository: https://github.com/ijoolaie/imoxy-net (private).
- Merged PRs #1–#9: repository foundation, API/domain contract, security primitives, D1 account adapter, account service, auth/session service, HTTP auth/account routes, quota/usage foundations, and SQLite migration tests.
- Current PR #10: https://github.com/ijoolaie/imoxy-net/pull/10 — subscription lifecycle, protocol URI and Clash generators, and tests; still open and must not be merged until exact-head CI passes.
- Current work branch: feat/subscriptions.
- Branch head before this hand-off edit: 50d352ccffa93e031174001984a2ec4296599404.
- Current feature work: subscription token lifecycle and clean-room VLESS/Trojan/Shadowsocks URI plus Clash YAML generation. CI run 40469984483 passed on this branch head with all tests. An earlier run failed on malformed regex test syntax and a test that still treated Clash as unsupported; both were fixed before the passing run. Re-check after this hand-off commit.
- Product status: no Nova runtime parity claim, no production deployment, no live Cloudflare writes.

## Product target
Independently implement behavior matching Nova Proxy 5.0.0 (pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7) before imoxy-specific improvements. Web panel, Telegram bot and Android APK share domain services and authorization/quota rules. Support panel-only, Cloudflare-only, and combined modes.

## Current branch work
- Subscription token creation/list/revocation; only SHA-256 token hashes are stored. Expiry is capped by account expiry.
- Provisional Auto (newline-separated URI), Base64 (standard Base64 of Auto payload), and Clash format rendering.
- Clean-room URI generators for VLESS, Trojan and Shadowsocks; conservative Clash YAML for VLESS/Trojan/Shadowsocks over TCP/WebSocket/gRPC.
- Input validation covers UUIDs, host/port, safe text, cipher allowlists, duplicate Clash names and unsupported XHTTP cases.
- Added protocol compatibility documentation with explicit caveats and required reference/client tests.
- Subscription service is not yet wired to public HTTP delivery because persistent proxy-node configuration/secret encryption is not implemented.

## Known gaps
- Exact-head CI is not yet confirmed for the current PR head.
- The subscription service and protocol output are not verified against the pinned Nova runtime; no reference runtime has been run.
- Public subscription delivery and management routes are not wired; proxy-node configuration storage and encrypted credential handling are missing.
- D1 has SQLite migration tests, but Cloudflare D1-specific batch behavior, backups/restore, concurrency and rollback remain unverified.
- Quota evaluation is not wired into proxy traffic, and no atomic quota reservation/idempotent usage events exist.
- Cloudflare resource workflows, web panel, Telegram bot and Android APK remain unimplemented.
- Commercial distribution requires separate review of the observed PolyForm Noncommercial 1.0.0 terms.

## Next actions
1. Query exact branch SHA and CI after this hand-off edit; confirm docs-only commit passes and review PR #10 before merge.
2. Implement encrypted proxy-node configuration and its D1 migration; never persist plaintext proxy credentials.
3. Wire subscription management/public delivery to persistent node descriptors and the protocol generator.
4. Execute REF-009–013 against an authorized Nova 5.0.0 runtime and import generated configs into target clients.
5. Implement Cloudflare resource adapter read-only/mock-first, then web panel, Telegram bot and Android client over shared services.
6. Add data-plane quota reservation, idempotent usage reports, D1 integration/recovery and release certification.
7. End every repository-work response with a schematic status report for phases 0–13.

## Mandatory progress reporting
Every user-facing response about repository work ends with an evidence-based schematic report for every phase 0–13. Never claim completion without the phase exit gate.
