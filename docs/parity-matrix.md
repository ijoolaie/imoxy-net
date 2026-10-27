# Nova Proxy behavioral parity matrix

Status vocabulary: **Not assessed**, **In progress**, **Verified**, **Blocked**, **Out of scope**. Do not mark a capability verified without reproducible tests and reference-release evidence.

| Domain | Required behavior to characterize | Status | Evidence / acceptance tests |
|---|---|---|---|
| Install and bootstrap | First-run setup, status, configuration changes, recovery | Not assessed | Pending |
| Authentication | Login, session lifecycle, logout, authorization boundaries | Not assessed | Pending |
| Admin panel | Navigation, forms, validation, errors, state transitions | Not assessed | Pending |
| Accounts | Create/edit/disable/delete, keys, ports, expiry, notes | Not assessed | Pending |
| Quotas | Total and daily traffic, request limits, speed and connection limits | Not assessed | Pending |
| Subscriptions | Token/key access, Auto/Base64/Clash formats, invalid/expired cases | Not assessed | Pending |
| Protocols | VLESS, Trojan, Shadowsocks and supported transports | Not assessed | Pending |
| Transports | WebSocket, gRPC, XHTTP, TLS/ECH and negotiation behavior | Not assessed | Pending |
| Network options | WARP/WireGuard, chaining, backend mode, IPv4/IPv6, DNS | Not assessed | Pending |
| Routing and resilience | Fallbacks, self-healing links, mirror failover, resistance policy | Not assessed | Pending |
| IP/domain tooling | Clean-IP selection, custom domains, Radar, node naming | Not assessed | Pending |
| Content policies | Ads/porn controls and SNI audit, where applicable | Not assessed | Pending |
| Telegram bot | Commands, authentication, account operations, error handling | Not assessed | Pending |
| Deployment | Cloudflare bindings, KV/D1 schema, upgrades, rollback | Not assessed | Pending |
| Observability | Usage, audit logs, connection records, privacy controls | Not assessed | Pending |
| Interfaces | Web panel, Telegram bot, Android APK | Not assessed | Pending |
| Workflows | Panel only; Cloudflare only; panel + Cloudflare | Not assessed | Pending |

## Verification protocol

For each row:
1. Pin the exact reference release and document the legal basis for use.
2. Capture input, output, state changes, error codes, and relevant side effects.
3. Write black-box acceptance tests before implementation.
4. Implement independently and run the same cases against the reference and imoxy.
5. Record differences and resolve them before marking **Verified**.

The health endpoint is the only currently implemented capability. This matrix is not a claim of parity.
