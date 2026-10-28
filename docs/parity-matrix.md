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


## Additional imoxy security regression (2026-10-27)

The authentication implementation now clears every HMAC-derived rate-limit key (IP and normalized username) after successful login. A regression test asserts that both counters are cleared. This is an imoxy correctness fix, not evidence of Nova parity; REF-003–004 remain unrun against the pinned runtime.


## Additional imoxy quota safety regression (2026-10-27)

The quota service now rejects a usage report when individually safe upload/download byte counts sum outside JavaScript's safe-integer range, before calling storage. A regression test asserts no usage write occurs. This is implementation hardening only; REF-007–008 remain unrun against Nova.


## Additional D1 usage-counter guard (2026-10-27)

The D1 adapter now rejects combined upload/download deltas outside the JavaScript safe-integer range and guards daily counter increments in the atomic upsert. If an existing daily row would exceed the supported safe-integer range, the upsert makes no change and the adapter reports a range error. Unit tests cover the SQL guard contract and zero-change failure path. This does not provide idempotency, lifetime-total reservation, real D1 evidence, or Nova parity.


## Quota/data-plane boundary audit — 2026-10-28

The current repository exposes account usage summaries and has a quota domain service/storage primitives, but `createQuotaService` is not wired into `src/http/api.js`, and the capabilities endpoint explicitly lists quota enforcement and usage accounting as pending. No trusted proxy/data-plane usage reporter was identified in the inspected source tree. Therefore quota enforcement, measured proxy traffic, and Nova parity remain **Not assessed**; the existing SQLite/adapter tests only verify imoxy-local arithmetic and storage behavior. Before changing the quota row to In progress/Verified on behavioral parity, identify the trusted usage source and exercise the same scenarios against pinned Nova Proxy 5.0.0 and imoxy. See [architecture.md](architecture.md) and [usage-event-atomicity-design.md](usage-event-atomicity-design.md).


## Critical architecture finding — 2026-10-28

The pinned reference documentation describes a single Cloudflare Worker serving the panel, subscription links, and proxy traffic. In imoxy, `worker.js` currently dispatches to static assets or the management API; the inspected API has no WebSocket upgrade/proxy protocol handler, and quota service is not wired into the API. Thus no proxy protocol/transport row should be interpreted as implemented merely because URI/YAML generators exist. All proxy traffic and transport rows remain **Not assessed** until a real client-to-Worker traffic path is implemented and repeatably tested against the pinned reference. Source references: [pinned Nova README](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md), [pinned deployment guide](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md).
