# Nova Proxy behavioral parity matrix

Status vocabulary: **Not assessed**, **In progress**, **Verified**, **Blocked**, **Out of scope**. Do not mark a capability verified without reproducible tests and reference-release evidence.

| Domain | Required behavior to characterize | Status | Evidence / acceptance tests |
|---|---|---|---|
| Install and bootstrap | First-run setup, status, configuration changes, recovery | Not assessed | REF-001–002; runtime not run |
| Authentication | Login, session lifecycle, logout, authorization boundaries | Not assessed | REF-003–004; runtime not run |
| Admin panel | Navigation, forms, validation, errors, state transitions | Not assessed | Pending |
| Accounts | Create/edit/disable/delete, keys, ports, expiry, notes | Not assessed | REF-005–006; schema/input-validation foundation exists but reference behavior is unverified |
| Quotas | Total and daily traffic, request limits, speed and connection limits | Not assessed | REF-007–008; schema fields exist; enforcement and reference behavior unverified |
| Subscriptions | Token/key access, Auto/Base64/Clash formats, invalid/expired cases | Not assessed | REF-009–010; runtime not run |
| Protocols | VLESS, Trojan, Shadowsocks and supported transports | Not assessed | REF-011–013; runtime not run |
| Transports | WebSocket, gRPC, XHTTP, TLS/ECH and negotiation behavior | Not assessed | REF-013; runtime not run |
| Network options | WARP/WireGuard, chaining, backend mode, IPv4/IPv6, DNS | Not assessed | REF-014–017; runtime not run |
| Routing and resilience | Fallbacks, self-healing links, mirror failover, resistance policy | Not assessed | REF-015, REF-018–019; runtime not run |
| IP/domain tooling | Clean-IP selection, custom domains, Radar, node naming | Not assessed | REF-014, REF-017, REF-027; runtime not run |
| Content policies | Ads/porn controls and SNI audit, where applicable | Not assessed | REF-026; runtime not run |
| Telegram bot | Commands, authentication, account operations, error handling | Not assessed | Imoxy hardening: private-chat-only handling, allowlist, secret validation and replay suppression have unit/contract coverage; main CI passed on `12cfb9f7e8c3f01a07346165bfdeb28c684893da` (run 40495393858). REF-020 remains unrun against Nova; no parity is verified. |
| Deployment | Cloudflare bindings, KV/D1 schema, upgrades, rollback | Not assessed | REF-021; initial D1 schema draft added; migration/recovery not yet tested |
| Observability | Usage, audit logs, connection records, privacy controls | Not assessed | REF-025; initial audit/usage tables drafted; behavior and retention unverified |
| Interfaces | Web panel, Telegram bot, Android APK | Not assessed | Initial web panel and read-only Telegram/Android slices exist; Nova parity and end-to-end workflows are unverified |
| Workflows | Panel only; Cloudflare only; panel + Cloudflare | Not assessed | REF-022–024; not implemented or runtime-tested |
| Mixed protocol | One link combining VLESS and Trojan; fallback when one is blocked | Not assessed | REF-029; generator and real client fallback unverified |
| Risk and endpoint headers | Host risk classification, custom-domain warning, subscription response headers, ECH/SNI options | Not assessed | REF-030; version-specific 5.0.0 claims are documented hypotheses |
| Installation/update automation | One-click, Telegram installer, Wrangler deployment, update PR and rollback | Not assessed | REF-031; no reference deployment or update workflow was run |
| Client import behavior | Auto/Base64/Clash import in representative clients | Not assessed | REF-032; generated outputs are provisional and not runtime-compared |

Detailed prioritized cases and evidence requirements: [reference-scenarios.md](reference-scenarios.md). All cases currently remain unrun against the pinned runtime.

## Verification protocol

For each row:
1. Pin the exact reference release and document the legal basis for use.
2. Capture input, output, state changes, error codes, and relevant side effects.
3. Write black-box acceptance tests before implementation.
4. Implement independently and run the same cases against the reference and imoxy.
5. Record differences and resolve them before marking **Verified**.

Imoxy now has initial API/domain foundations and early web, Telegram, and Android slices. This implementation status is separate from Nova compatibility: no parity row is verified until repeatable black-box tests pass against the pinned runtime.
