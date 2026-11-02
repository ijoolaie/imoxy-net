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

The pinned reference documentation describes a single Cloudflare Worker serving the panel, subscription links, and proxy traffic. In imoxy, `worker.js` routes requests through `createVlessWebSocketHandler()` before static assets and the management API; `test/worker.test.js` verifies that `/proxy/vless` is reserved ahead of static assets and fails closed when proxy configuration is missing. The handler is a restricted VLESS-over-WebSocket TCP prototype with injected-adapter Node tests, not a complete Nova-compatible data plane. A disposable direct-D1 admission test has passed, but the temporary Worker could not be invoked from the available execution environment (HTTP 403), and no pinned Nova black-box run exists. Therefore protocol/transport parity rows remain **Not assessed**; describe the handler as implemented prototype code, not as verified proxy compatibility. Source references: [pinned Nova README](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md), [pinned deployment guide](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md).


## Restricted VLESS handler evidence — 2026-10-28

Main now contains a testable VLESS-over-WebSocket TCP prototype at /proxy/vless with hash-based credential lookup, account status/expiry checks, a strict host/port allowlist, and a Cloudflare TCP socket adapter. Tests use injected WebSocket/socket adapters; no live Cloudflare Worker/D1 smoke test or pinned Nova runtime comparison has been performed. Therefore all protocol/transport compatibility rows remain **Not assessed**, and this prototype must not be counted as verified Nova parity.

### Connected-peer IPv6 policy — 2026-10-28

imoxy now validates the syntax of the connected TCP peer address and (in PR #63, pending exact-head CI) rejects non-global IPv6 space plus selected special-purpose, transition and documentation prefixes. This is an imoxy security policy, not evidence of Nova behavioral parity. Hostname DNS rebinding, complete IANA special-purpose coverage, real Cloudflare runtime behavior and reference black-box comparison remain **Not assessed**.

### PR #63 connected IPv6 policy status — 2026-10-28

PR #63 is merged as `29fa597c5c649552d827396a218609ce895724f4` after exact-head CI passed (run `40643131921`). The implementation rejects non-global IPv6 and selected special-purpose, transition and documentation ranges before forwarding. This remains a conservative implementation policy, not a complete IANA registry or Nova parity evidence. Hostname DNS pinning and authorized Nova black-box comparison remain **Not assessed**.


### VLESS Worker runtime validation gate — 2026-10-28

DNS answer pinning is implemented and covered by Node tests with injected adapters, but actual Cloudflare Worker/D1 runtime behavior remains **Not assessed**. The [non-production VLESS smoke gate](nonprod-vless-smoke-gate.md) is a prepared runbook, not an executed test. Do not mark proxy transport or quota enforcement as Verified until controlled staging evidence and the required pinned Nova black-box scenarios are recorded. No live deployment or Cloudflare resource write has been performed.

## VLESS downstream buffering guard — 2026-10-28

Imoxy's restricted VLESS prototype now fails closed when WebSocket `bufferedAmount` cannot be measured or the next download chunk would exceed a 1 MiB queued-byte budget. Adapter tests cover both cases and assert no quota reservation or payload send occurs. This is an imoxy resource-safety guard, not Nova parity evidence. Runtime behavior on Cloudflare Workers and reference buffering semantics remain Not assessed.

## Correction — downstream backpressure remains unverified

Do not treat the earlier `bufferedAmount` adapter tests as Cloudflare runtime evidence. The official Workers WebSocket property list does not document `bufferedAmount`. PR #76's guard is being reverted in follow-up PR #77; real slow-client behavior, supported queue telemetry, bounded downstream buffering and Nova parity remain **Not assessed**.


## VLESS application-level session budget — 2026-10-30

The current implementation branch adds required per-session download-byte and maximum-lifetime settings, rejects missing/invalid settings before WebSocket allocation, and closes a non-reading session before forwarding a chunk that would exceed its cumulative download budget. Node tests cover the budget boundary and resource cleanup. This is an imoxy safety policy, not observed Nova behavior. Cloudflare Worker-internal WebSocket buffering, aggregate concurrent-session resource bounds, real Worker/D1 behavior, and Nova 5.0.0 parity remain **Not assessed**. Do not mark the proxy or quota rows Verified.


## Post-merge status correction — 2026-10-30

The per-session download-byte and maximum-lifetime policy described above is now merged into main as b5c44b16132c9f540de16ab9d4ce54ab5fa01fa4 (PR #104). Post-merge main CI run 41037834214 passed on that exact commit. This does not change the parity status: the policy is imoxy-specific, Worker-internal WebSocket buffering remains unproven, aggregate concurrent-session bounds remain open, and no live Worker/D1 or Nova runtime test has been run.


## VLESS concurrent-session limits — 2026-10-30

Per-account and installation-wide session admission are now implemented using D1-backed leases (PR #108, migration 0007). Automated SQLite-backed actual-SQL and handler lifecycle tests pass. The feature is **implemented but not reference/runtime verified**: real D1 concurrency/expiry and Worker lifecycle tests remain pending. The current imoxy policy treats `max_connections = 0` as fail-closed; Nova 5.0.0's exact zero semantics are still unknown. A Worker-global map is not a valid cross-isolate enforcement mechanism.

Issue #106 tracks the remaining real-D1/Worker runtime validation and Nova comparison gates. No concurrency or connection-limit parity claim is permitted until those tests pass against the pinned reference. This finding does not change the status of the other protocol rows.


## VLESS worker routing and bounded application-submitted output — 2026-10-30

The current `worker.js` imports and dispatches `createVlessWebSocketHandler()` before static assets and the management API. `test/worker.test.js` verifies route precedence and fail-closed behavior when proxy configuration is missing. This corrects the stale 2026-10-28 architecture note above; it does not establish successful live Worker invocation or protocol parity.

The VLESS handler serializes upstream reads behind synchronous downstream send and quota settlement. With the per-session download-byte ceiling and mandatory installation-wide D1 lease ceiling, the application-submitted downstream payload has a finite configured upper bound of `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)` bytes. This excludes Cloudflare runtime framing/copies and does not prove internal send-buffer capacity or total memory. The new deterministic Node test locks down the serialized-read behavior. Disposable Worker slow-reader runtime evidence and Nova REF-032 remain unverified.

## Real D1 quota-recovery SQL evidence — 2026-11-01

A disposable Cloudflare D1 database received the SQL contents of migrations 0001–0008 through the D1 API. Direct D1-primary checks passed for prepared-reservation expiry reclaim, forwarding-marked reservation retention, quota-denial under an uncertain reservation, marked usage settlement and daily aggregation, rejection of unmarked settlement, immutable forwarding marker, failed-batch rollback, and a 12-way quota-reservation race (exactly 5 × 10-byte reservations admitted under a 50-byte cap). The database was deleted and its absence verified. This does not execute the repository D1Store or VLESS handler inside a Worker, does not use a real TCP destination, and does not establish Nova behavior. All VLESS protocol/transport and quota parity rows remain **Not assessed**; Issue #78 remains open.

## Local VLESS handler-to-TCP integration evidence — 2026-11-02

The opt-in test/vless-local-tcp.integration.test.js was executed against the locally running TCP Echo Server on 127.0.0.1:5000. The actual VLESS handler and Node TCP socket exchanged a binary initial payload plus a 64 KiB later payload; returned bytes matched, SQLite-backed usage recorded equal upload/download totals, reservations settled, and the session lease was released. This is local integration evidence for the current implementation, not Nova Proxy 5.0.0 behavior. The connector uses a test-only synthetic peer identity to reach loopback; DNS and peer-validation policy are not covered. No VLESS/transport/quota parity row becomes Verified, and Issue #78 remains open for actual remote Worker + D1 + controlled TCP and backpressure/lifecycle evidence.


## 2026-11-02 — mixed DNS answers and cross-family TCP fallback

- Added an end-to-end handler regression over synthetic mixed A/AAAA DNS responses. Private IPv4 and ULA IPv6 records are filtered; failed IPv4 connection falls back to the next validated IPv6 address; peer pinning is checked before the initial payload is forwarded; upload quota is settled only after successful forwarding.
- The focused Node handler suite passed 53/53. This verifies current implementation behavior under deterministic adapters, not Nova Proxy 5.0.0 behavior. All relevant Nova proxy/DNS/transport parity rows remain **Not assessed** until black-box reference tests are run.


## 2026-11-02 — IANA special-purpose address coverage

- Added regression matrices for the current resolver's IPv4 and IPv6 handling against the IANA Special-Purpose Address Registries (2025-10-09 snapshot). The tests cover the registered private/shared, loopback, link-local, documentation, benchmarking, multicast/reserved, NAT64, transition, ULA, and IETF protocol-assignment families.
- This verifies the current implementation's conservative destination policy under Node, not Nova Proxy 5.0.0 behavior. Proxy/DNS rows remain **Not assessed** until reference black-box scenarios are executed.


## 2026-11-02 — partial Cloudflare remote-runtime evidence for VLESS handler

The actual VLESS handler/module graph executed under Wrangler 4.156.0 `wrangler dev --remote`: 3/3 WebSocket handshakes passed; 3/3 sessions using synthetic in-memory TCP and fake store/quota adapters returned the expected VLESS response and exact initial payload; a ~6.2-second paused-reader test later delivered all 4 MiB. This supports the narrow claim that the handler/module graph can execute and relay synthetic bytes on the remote Workers runtime.

It does not establish Nova Proxy 5.0.0 behavior, D1 binding integration, real outbound TCP, durable quota settlement, D1 session-lease lifecycle, DNS/peer identity under the Cloudflare connector, or Cloudflare-internal WebSocket buffer bounds. Keep VLESS transport and quota parity rows **Not assessed** pending black-box Nova comparison; keep the full non-production Worker/D1/TCP gate open.


## 2026-11-02 — disposable Wrangler Service Binding smoke workflow prepared

A manual GitHub Actions workflow and Node runner now provision a uniquely named disposable D1 database through the Cloudflare D1 API, apply checked-in migrations 0001–0008 through that API, seed one hash-only proxy credential, deploy the internal-only TCP Echo Worker with Wrangler, and start the actual VLESS handler under Wrangler remote preview with Worker-bound D1 and a Worker-to-Worker TCP Service Binding. The runner checks two concurrent clients, exact byte echo, D1 upload/download/request aggregates, settled reservation bytes, zero active reservations and zero remaining session leases, then deletes the run-owned Workers and D1 and verifies absence.

This is test infrastructure only. It has not yet been run from GitHub Actions. No new Cloudflare resource was created by this change, and it provides no new runtime or Nova parity evidence. All VLESS/transport/quota parity rows remain **Not assessed** until the workflow's actual result and separate reference comparisons exist.
