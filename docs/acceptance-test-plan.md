# Acceptance test plan

## Required comparison record

For each scenario record: reference release/commit, environment, request/action, input, expected output, observed output, state changes, logs/side effects, and pass/fail.

## Initial scenarios

- Telegram webhook rejects invalid secret headers, oversized bodies, non-JSON payloads and unsupported methods.
- Telegram commands are ignored for users outside the explicit numeric allowlist and for all non-private chats, even when the sender is allowlisted; tests use mocked Telegram delivery only.
- Telegram `/accounts` invokes the shared account service with viewer-level permission and exposes only username/status; mutations and secret material are not exposed.
- Telegram API route wiring is tested independently from the provider network.
- Android accepts HTTPS API URLs only, disables redirects for authenticated requests, and does not log or bundle bearer tokens.
- Android session tokens are encrypted with an Android Keystore key; local logout clears encrypted state even when server revocation cannot be confirmed.
- Android debug APK builds under JDK 17/Gradle 8.9 and is uploaded as a CI artifact; device/E2E verification remains pending.

- Static panel assets are served through the Workers Assets binding while /api/* and /health remain routed through the Worker.
- Browser UI uses same-origin cookie sessions, renders untrusted API values with textContent, and exposes no Cloudflare apply action.
- Cloudflare UI visibility follows operating mode; browser E2E, accessibility audit and deployed-Worker tests remain pending.


- Cloudflare client sends GET only, paginates within a bound, sanitizes provider errors and never echoes credentials.
- Protected inventory and dry-run plan routes require an authenticated principal; unauthenticated calls never reach the provider client.
- Dry-run plans mark operations for explicit approval, omit deletions, sanitize resource fields and perform no writes.
- panel-only, cloudflare-only and combined modes are validated; unrelated route families are disabled.
- Tests use mocked provider responses only. Real account read-scope validation, D1/config integration and recovery are still required.


- VLESS WebSocket, Trojan gRPC, Shadowsocks, IPv6 authority formatting, and a conservative Clash YAML subset have unit tests.
- Invalid UUIDs, ports, ciphers, unsafe names, duplicate Clash names and unsupported XHTTP Clash output are rejected.
- These generated outputs are clean-room provisional behavior. REF-009–013 and target-client import/connection tests are still required for parity.


- Subscription creation returns a random raw token once and stores only the token hash; management listings never return raw tokens or token hashes.
- Subscription expiry is capped by account expiry; inactive accounts cannot receive links; unsupported formats are rejected.
- Revocation is idempotent; revoked, expired and unavailable links fail closed; Auto and Base64 produce equivalent URI content.
- These Auto/Base64 rules are provisional imoxy behavior. REF-009–010 must verify actual Nova token and format semantics before parity is claimed.


- Both SQL migrations execute in Node SQLite with foreign keys enabled; tests assert expected tables, role/quota/FK constraints, additive usage upserts, auth rate-limit window reset, and cascade behavior while preserving audit history.
- This validates SQLite syntax and schema behavior locally in CI, but does not replace a deployed Cloudflare D1 migration/batch/recovery test.


- Total/daily quota equality is allowed; projected overage is denied, with total-quota failure taking precedence when both dimensions exceed.
- Disabled/expired accounts are denied; null quotas are unlimited and zero quotas deny positive traffic.
- Usage deltas are non-negative safe integers, stored per UTC day, and usage summaries validate calendar dates.
- The current quota service is only a policy primitive: concurrent hard enforcement, idempotent reports, and actual proxy data-plane measurement remain unverified. See docs/quota-policy.md.


- Initial owner bootstrap requires a configured 32+ character secret and is one-time under the store's conditional insert.
- Login uses a uniform unauthorized result for missing users, wrong passwords and disabled principals; persistent rate limiting returns 429 after the configured attempt ceiling.
- Sessions store only token hashes, expire at the configured UTC deadline, reject revoked/expired sessions, and support logout/revocation.
- RBAC denies inactive principals and role-inappropriate actions. These are initial imoxy policy tests, not verified Nova policy.


- Account domain service refuses construction without an explicit authorization policy.
- Denied account operations do not reach persistence; create/update/delete mutations include actor, action and request audit metadata.
- Account creation sets server-controlled IDs/timestamps and defaults; update rejects unknown or empty fields; missing reads/deletes return not-found.


- D1 adapter reads use bound parameters and map persisted account fields consistently.
- Account listing bounds page size and returns a stable ID cursor.
- Account create/update/delete operations are coupled to an audit insert through D1 batch statements; mocked adapter tests cover the query contract. A real D1 integration test is still required.
- Adapter rejects unsupported update fields, empty changes, missing audit metadata and invalid page sizes.


- Password hashes use salted PBKDF2-SHA-256; correct passwords verify, incorrect passwords and malformed hashes fail closed.
- Session credentials use cryptographically random tokens; persistence stores a token hash rather than the raw bearer token.
- Weak password input, invalid iteration settings, and malformed/short session tokens are rejected.


- Domain validation rejects unknown fields and internal-role injection.
- Username constraints, UTC timestamps, quota safe-integer bounds, nullable limits, and notes length have unit tests.
- The initial D1 schema defines principals/sessions, proxy accounts, subscription-token hashes, daily usage, installation settings, provider-resource metadata and audit events. Migration execution, concurrent writes, backups and restore are not yet verified.
- Reference scenarios are enumerated in [reference-scenarios.md](reference-scenarios.md); all remain unrun against the pinned reference.

- Health endpoint returns a stable, uncached JSON response.
- Unknown routes return a structured not-found response.
- Authentication tests cover valid, invalid, expired and revoked sessions.
- Every protected operation rejects unauthenticated and unauthorized callers.
- Account creation/edit/disable/delete persists the expected fields.
- Quota boundaries cover zero, just below, exactly at, and just above limits.
- Subscription outputs are checked byte-for-byte where deterministic and semantically where generated values vary.
- Cloudflare operations are tested with mocked adapters before any live account mutation.
- Bot, web and Android interfaces invoke the same domain rules.
- Failure injection covers unavailable storage, provider errors, timeouts and partial provisioning.

Executable repository tests currently cover API/auth/session behavior, account-domain authorization and audit metadata, quota-policy boundaries, subscription lifecycle, protocol formatting, Cloudflare read-only inventory/dry-run planning, operating-mode gating, Telegram webhook security/replay handling, cross-interface account-list contracts, SQLite migration constraints, and Android build configuration. The CI suite is an imoxy implementation test suite, not proof of Nova parity. All REF-001–REF-032 scenarios remain unrun against the pinned reference; real D1 integration/recovery, deployed Worker, browser/device E2E, and live Telegram webhook validation remain pending.


- After a successful login, all rate-limit counters consumed for the request (IP and normalized username) are cleared individually; a regression test uses multiple opaque keys and asserts the store is empty. This verifies imoxy behavior only and does not establish Nova rate-limit parity.


- Usage reporting rejects combined upload/download byte deltas outside the safe-integer range before persistence; regression coverage verifies the storage adapter is not called. This is imoxy safety behavior, not Nova parity evidence.


- D1 usage upserts reject combined byte deltas outside the safe-integer range before execution; conditional conflict updates refuse per-day upload, download, request-count, or combined daily-byte totals that would exceed the supported range. Adapter tests verify the guard clauses and zero-change failure path. Real D1 concurrency/transaction behavior remains unverified; usage-event idempotency is not implemented because the current reporting contract has no stable event identifier.


- Migration `0004_usage_daily_safe_integer_guards.sql` must apply successfully and reject direct insert/update attempts that exceed safe-integer bounds for upload, download, request count, or combined daily bytes. SQLite CI covers the migration and trigger behavior; run the same cases on a disposable Cloudflare D1 database before release certification.


## Future usage event ledger and quota reservation contract (design only)

Before implementation is accepted, cover stable producer-scoped event IDs, same-ID/same-payload replay no-op, same-ID/different-payload conflict, two different IDs with identical deltas both counting, missing/invalid IDs rejected before storage, safe-integer overflow, retry after ambiguous outcomes using the same ID, and storage failure without partial aggregate mutation. Reservation tests must cover concurrent boundary claims, duplicate reservation IDs, insufficient quota, expiry/disabled accounts, completion reconciliation, idempotent release, and abandoned-reservation recovery. A disposable real Cloudflare D1 integration gate must verify migrations/triggers, batch rollback, uniqueness races, aggregate exact-once behavior, concurrent reservation semantics, and backup/restore/reconciliation. Until these pass, usage-event idempotency and hard quota enforcement remain unimplemented and unverified. See [usage-event-atomicity-design.md](usage-event-atomicity-design.md).

## Quota integration precondition (2026-10-28)

Before implementing usage-event ingestion, document and test the authenticated trusted producer boundary. Required evidence includes: where byte counts are measured, how the producer authenticates to imoxy, who authorizes the account mapping, when stable event IDs are generated, how retries preserve IDs, how an event is tied to a reservation before traffic is forwarded, and how producer outages/ambiguous responses are handled. A management API accepting caller-supplied byte counts is not an acceptable substitute. The quota service must be wired through the intended domain/API boundary, and the capability report must not claim enforcement until end-to-end tests prove it. Nova parity additionally requires executing REF-007–008 against pinned Nova 5.0.0; imoxy-only unit tests are insufficient.

### Proxy connected-peer IPv6 regression cases — 2026-10-28

CI regression cases cover malformed IPv6 syntax, compressed public IPv6, documentation space, and (in PR #63 pending exact-head CI) loopback/mapped, NAT64 well-known, IETF protocol-assignment, 6to4 and documentation prefixes. These tests use injected socket adapters; they do not replace a controlled Cloudflare Worker/D1 smoke test or DNS-rebinding test.

### PR #63 connected IPv6 regression status — 2026-10-28

PR #63 is merged after exact-head CI passed (run `40643131921`). Adapter-based regression tests cover malformed IPv6, compressed public IPv6, documentation ranges, loopback/mapped IPv4, NAT64 well-known prefix, IETF protocol assignments and 6to4. A real Cloudflare Worker/D1 smoke test and DNS-rebinding validation remain separate acceptance gates.


### Non-production VLESS Worker/D1 smoke gate — 2026-10-28

The controlled staging runbook is [nonprod-vless-smoke-gate.md](nonprod-vless-smoke-gate.md). Its status is **prepared, not executed**. Required evidence includes actual deployed Worker/D1 migration and persistence behavior, authenticated WebSocket handshake, DoH resolution and numeric TCP peer pinning, bidirectional bytes, timeout/close behavior, and reservation/usage consistency. No production environment may be used for this gate. Passing Node adapter tests or CI is not a substitute for running the gate in a dedicated disposable Cloudflare environment. No Worker/D1 deployment or live Cloudflare resource mutation has been performed.

## Superseded VLESS downstream queue guard — historical only

The former `bufferedAmount`/1 MiB guard and `downstream_write_queue_full` behavior were removed because the property is not documented by the current Cloudflare Workers WebSocket API. Do not implement or test this as current expected behavior. An injected adapter cannot establish runtime API support. Downstream runtime-buffer boundedness remains **Not verified**; see the follow-up acceptance evidence below.

## Correction — Worker WebSocket bufferedAmount assumption

The earlier adapter test for `server.bufferedAmount` is superseded: Cloudflare Workers' official WebSocket API reference lists `readyState` and `binaryType` but does not document `bufferedAmount`. Do not use an adapter-only fake property as evidence of runtime support. A disposable Worker smoke test must first establish supported telemetry and slow-client behavior. Downstream queue bounding/backpressure remains **Not verified**.


## Follow-up — downstream WebSocket acceptance evidence (2026-10-28)

The official [Workers WebSocket runtime API](https://developers.cloudflare.com/workers/runtime-apis/websockets/) documents synchronous `send()` and `readyState`, but does not document `bufferedAmount`, a drain event, or an awaitable send result. Treat the following as separate acceptance gates:

- **Application-managed work:** the selected policy must put a hard, testable bound on data read/retained by the handler and define when a slow/non-reading session is terminated. Do not silently introduce a throughput-breaking download cap; document and approve its product impact first.
- **Quota integrity:** test the exact reserve-before-forward / settle-after-forward sequence, including send/settlement errors, retained ambiguous reservations, and ensuring no later chunks are forwarded after a fail-closed condition.
- **Runtime evidence:** in an explicitly authorized disposable staging Worker, run the bounded reading-client baseline and separate non-reading-client probe. Record runtime/version, attempted and received bytes, send latency/errors, close behavior, stop reason, and cleanup. Do not infer internal buffer size from client backlog.
- **Completion claim:** if no authoritative runtime queue/drain signal is available, explicitly leave Worker-internal buffer boundedness unproven even if the bounded probe appears stable. Issue #78 and Phase 6 must not be marked complete solely on unit tests or this probe.

No live runtime test is authorized or implied by this checklist. See [vless-runtime-backpressure-probe.md](vless-runtime-backpressure-probe.md) for isolation and cleanup gates.


## VLESS per-session downstream budget acceptance — 2026-10-30

The handler requires positive safe-integer `PROXY_MAX_DOWNLOAD_BYTES` and `PROXY_MAX_SESSION_DURATION_MS` settings. Missing, zero, malformed, unsafe, or timer-overflow duration values must fail closed with HTTP 503 before WebSocket acceptance.

Node regression coverage must prove:
- A downstream peer that never consumes messages receives no more than the configured cumulative download budget; the first whole TCP chunk that would exceed the remaining budget is not reserved, sent, or settled.
- A chunk ending exactly at the configured byte boundary is accepted; the next chunk triggers `download_limit_exceeded`.
- The hard session-duration timer closes the WebSocket and upstream TCP resources with `session_duration_exceeded`.
- Existing reserve-before-send, settle-after-send, and ambiguous-reservation retention behavior remains intact.
- No code path reads `bufferedAmount` or assumes an awaitable WebSocket send/drain API.

These tests establish a per-session application policy only. They do not prove Worker-internal buffer size, aggregate resource bounds across unlimited concurrent sessions, actual Cloudflare runtime behavior, D1 integration, or Nova parity. Keep the disposable Worker slow-reader probe and controlled Worker/D1 smoke gate as separate pending gates. Do not enable VLESS in a live environment until reviewed finite settings are supplied and the target is proven isolated.


## VLESS concurrent-session admission — 2026-10-30 (implemented; live runtime gate pending)

The handler now enforces per-account and installation-wide admission through D1-backed leases. The implementation and lifecycle contract are documented in [vless-session-admission-design.md](vless-session-admission-design.md), Issue #106.

Before accepting the implementation:
- Require a positive safe-integer installation-wide `PROXY_MAX_CONCURRENT_SESSIONS` setting; do not invent a production value or default.
- Prove a single conditional D1 write admits no more than the account cap and installation cap, including concurrent attempts racing for the final slot.
- Verify `NULL` account cap means no account-specific ceiling and zero denies all new sessions.
- Verify admission happens before upstream TCP dial and that ambiguous/unavailable admission fails closed.
- Verify release is idempotent and runs for every handler close/error/timeout path; failed release leaves the lease counted until expiry.
- Verify stale lease expiry and bounded cleanup: each admission best-effort prunes at most 100 expired rows, expired rows never count toward capacity, and a lease already expired at admission is rejected. Include worker termination/restart behavior.
- Repeat concurrency and lifecycle tests against a dedicated disposable Cloudflare D1 database; SQLite tests are not sufficient to pass the runtime gate.

SQLite-backed actual-SQL and handler tests pass, and PR #108 is merged. A disposable real-Cloudflare-D1 direct-SQL concurrency/expiry test passed on 2026-10-30 (see `docs/d1-runtime-validation-2026-10-30.md`); this does not exercise the production D1Store wrapper or deployed Worker. The production D1Store wrapper has since passed in a disposable deployed Worker; full VLESS route/handler runtime, Nova comparison and a controlled slow-reader runtime probe remain required. No production/staging Worker was deployed or changed.


## VLESS downstream send serialization and finite application-submitted byte bound — 2026-10-30

The VLESS relay's upstream pump performs exactly one `reader.read()`, then awaits `reserveAndSettle()` before requesting another chunk. For download traffic, `reserveAndSettle()` calls synchronous `server.send(bytes)` and then awaits quota settlement; if send or settlement fails, the session closes and the pump does not read/forward another chunk. The handler rejects a whole chunk before reservation/send if it would exceed the remaining `PROXY_MAX_DOWNLOAD_BYTES` budget. A deterministic test with a deliberately non-consuming WebSocket and a held settlement promise proves no second TCP read/send proceeds while settlement is pending.

For configured positive safe-integer values, the application-submitted downstream payload is bounded per admitted session by `PROXY_MAX_DOWNLOAD_BYTES` plus the two-byte VLESS response header. The mandatory global D1 lease ceiling bounds the aggregate application-submitted payload by at most `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)` bytes, excluding WebSocket framing/runtime copies and implementation overhead. This is a bound on bytes submitted by the application, **not** a measurement or proof of Cloudflare's internal WebSocket buffer or total Worker memory. The D1 lease expiry is designed to outlive the active session by handshake/setup + maximum lifetime + grace, so it conservatively limits simultaneous admitted sessions.

### Operational budget envelope — proposed, not configured

The two settings must be selected as a pair because the installation-wide D1 lease ceiling multiplies the per-session cumulative download allowance. The enforceable application-submitted payload ceiling is:

`aggregateSubmittedBytes <= globalConcurrentSessions * (perSessionDownloadBytes + 2)`

The two bytes are the VLESS response header, once per admitted session. The whole-chunk check prevents a final TCP chunk from crossing the configured per-session payload ceiling. This arithmetic excludes WebSocket framing, runtime queueing, copies, JS/object overhead, TCP buffers, D1 state, and all other Worker memory; it is **not** a Worker-memory estimate or safety proof.

| Example profile | Per-session download cap | Installation-wide active sessions | Maximum application-submitted payload |
| --- | ---: | ---: | ---: |
| Conservative first rollout candidate | 1 MiB | 2 | 2,097,156 bytes (2 MiB + 4) |
| Existing larger Service Binding smoke fixture | 8 MiB | 2 | 16,777,220 bytes (16 MiB + 4) |
| Unit-test fixture scale, not a deployment recommendation | 1 MiB | 100 | 104,857,800 bytes (100 MiB + 200) |

**Recommended operational starting point for a separately approved, controlled rollout:** cap each session at 1 MiB and the installation globally at 2 concurrent sessions. Keep the existing 60-second lifetime ceiling as a separate time bound where that profile is used. This is a deliberately small application-work envelope, not a claim that 2 MiB is a safe runtime-memory ceiling. Do not copy the 100-session unit-test fixture into deployment configuration. The 8 MiB / 2-session profile is useful as a bounded test fixture but should be treated as a later expansion tier, not the initial operating setting.

Before increasing either value:
1. Calculate and record the resulting aggregate submitted-byte ceiling with the formula above; assess it against an explicitly allocated Worker resource budget with headroom for framing, copies, upload queues, TCP and runtime overhead. The repository currently has no measurement that can translate submitted bytes into total Worker memory.
2. Require a deliberate non-reading-client test on an authorized disposable runtime, including send latency, errors/close behavior, exact byte counts, sequence continuity, D1 lease cleanup, and resource cleanup. A successful bounded run remains observational and does not reveal the internal queue size.
3. Increase one dimension at a time. Raising concurrency multiplies the aggregate ceiling; raising the per-session cap increases both the possible queued work per slow client and the aggregate ceiling. Recalculate after every change.
4. Keep the installation-wide D1 lease cap mandatory and independently verify its configured value; per-account `max_connections` is an additional restriction, not a substitute for the global cap. A session-duration limit bounds occupancy time but does not reduce the byte ceiling.
5. Do not promote any proposed values into existing staging or production bindings without a separate explicit owner decision and deployment authorization.

No deployment values are selected by this document, and no Cloudflare resource/configuration was changed by this review.

Keep the disposable Worker slow-reader probe open to observe runtime send latency/errors/close behavior; do not infer internal buffer capacity from client-side backlog. Keep Nova parity separate and unverified.

## VLESS session-admission runtime status correction — 2026-10-31

The disposable real-D1 gate now invokes the exact production `src/storage/d1-store.js` module from a deployed temporary Worker bound only to a disposable D1 database. Concurrent account/global cap races, duplicate/conflicting session IDs, release idempotency, disabled/expired/zero-cap denial, bounded expiry cleanup, and restrictive account deletion passed. The Worker and database were deleted and their absence verified. See [d1-runtime-validation-2026-10-30.md](d1-runtime-validation-2026-10-30.md). Issue #106 is closed as completed.

Remaining independent gates: full VLESS handler/Worker end-to-end runtime lifecycle, behavior after isolate termination, production capacity selection/configuration (still unset), Nova REF-032, and Issue #78's slow-reader/backpressure/internal-buffer evidence. This wrapper test does not satisfy those gates and does not authorize enabling VLESS in production.

## VLESS handler constructor runtime gate — 2026-10-31

The current disposable runtime investigation confirms that native `WebSocketPair` shape/enumerability works and that the individual production modules (`account-service`, `quota-reservation-service`, `vless-parser`, `d1-store`, and the import-only `vless-websocket-handler`) can be imported in isolated Workers. However, a Worker that calls `createVlessWebSocketHandler()` returns Cloudflare 1101 even with all options overridden and a surrounding `try/catch`; the corresponding failed invocation is not present in the queried invocation dataset. This is an unresolved constructor/Worker-runtime gate, not evidence that the VLESS handshake or handler lifecycle works.

Do not proceed to VLESS payload, credential, TCP, D1 quota, session-lease, relay, or slow-reader tests until a minimal constructor-equivalent control and the real handler constructor both return normally, and the real handler completes at least three repeatable WebSocket handshakes. No D1 or TCP resources are needed for this gate. Issue #78 remains open; Cloudflare-internal WebSocket buffer/backpressure remains unproven.

**Historical status correction (2026-11-01):** The subsequent Wrangler 4.156.0 `wrangler dev --remote` run recorded below passed the constructor-equivalent control and actual `/proxy/vless` handshake 3/3. The handshake gate is therefore satisfied for that preview path; the D1-backed relay and runtime-buffer gates remain outstanding.


## Actual VLESS handler Wrangler remote-preview observation — 2026-10-31

A separate runtime test used Wrangler 4.156.0 with `wrangler dev --remote`, avoiding the earlier direct API upload + workers.dev activation path that returned 1101 even for minimal scripts. The preview executed on Cloudflare's remote runtime while a client connected through the local Wrangler preview endpoint. See Issue #78 comment `6546090435`.

Observed results:
- Minimal Worker health returned 200, non-matching path returned 404, and WebSocket echo succeeded.
- Constructor-equivalent control completed three independent handshakes/echoes.
- The actual repository module graph loaded; the real handler returned the expected 426 for a non-upgrade request and completed three of three WebSocket handshakes at `/proxy/vless`.
- A synthetic request traversed the actual VLESS parser, credential-hash adapter, account lookup, destination allowlist, resolver adapter, session-admission adapter and TCP connector adapter. A deliberately failing TCP stub produced the expected `upstream_unavailable` close; no external destination was dialed.
- With synthetic in-memory TCP and fake store/quota adapters, three of three sessions returned VLESS response `[0,0]` and echoed the exact four-byte initial payload.
- A raw TCP WebSocket client paused reads for approximately 6.2 seconds, then resumed and received all 4,194,304 download bytes in 256 binary frames (257 frames including the two-byte VLESS response); the session closed normally with `upstream_closed`.

This is partial Cloudflare runtime evidence for the actual handler and a synthetic relay, not an end-to-end production data-plane acceptance test. No D1 binding/database was attached; store/quota were fake and TCP was synthetic. The observation does not measure the Worker's internal WebSocket send-buffer bound or prove behavior for longer pauses, larger aggregate concurrency, real D1, or real outbound TCP. Keep Issue #78 open and keep internal-buffer boundedness **unproven**.

The subsequent isolated D1 attempt created a disposable WEUR database but the execution safety layer blocked the remote migration command before it ran. No SQL was applied or queried; the temporary database was deleted and inventory confirmed only the three pre-existing databases remain. Real-D1 VLESS handler/relay acceptance therefore remains blocked. Do not bypass the safety control; use an approved execution path or leave this gate blocked.

## Custom VLESS route collision protection — 2026-11-01

- A configured `PROXY_WS_PATH` under `/api` (including `/api/*`) or equal to `/health` must not intercept or shadow the Worker management API or health endpoint.
- Worker-entrypoint tests verify a collision with `/api/v1/capabilities` still returns the API's 200 response and a collision with `/health` still returns the health 200 response.
- The regression was observed before the fix: the API request returned 426 because the VLESS handler ran first. The handler now declines these reserved paths so normal Worker routing proceeds.
- This is local Node/Worker-entrypoint coverage only; it is not Cloudflare runtime or Nova parity evidence.

## Direct Cloudflare D1 quota-recovery checks — 2026-11-01 (partial acceptance only)

A disposable EU D1 received the SQL contents of migrations 0001–0008 through the Cloudflare D1 API. Direct primary queries verified:
- migration schema objects, `forwarding_started_at`, foreign-key enforcement and an empty foreign-key check;
- release/reclaim of an expired prepared reservation before a new quota admission;
- retention of an expired forwarding-marked reservation, denial of an over-quota new reservation, and refusal to explicitly release the uncertain reservation;
- successful marked usage settlement and exact upload/download daily aggregation;
- rejection of unmarked settlement by the migration 0008 trigger;
- rollback of the claimed event insert when a D1 batch's settlement step failed;
- immutability of an established forwarding marker;
- 12 concurrent 10-byte reservation attempts under a 50-byte cap, with exactly 5 admitted and 50 bytes reserved.

The disposable D1 was deleted and inventory confirmed it absent. This was direct D1 API SQL, not the repository's D1Store/VLESS handler running in a Worker and not a Wrangler migration-history test. It does not satisfy the full Worker/D1/TCP smoke gate or establish Nova parity. Do not mark the VLESS transport or quota parity rows Verified.

## Local VLESS-to-TCP Echo integration — 2026-11-02

Adds an opt-in integration test in test/vless-local-tcp.integration.test.js against the user's TCP Echo Server on 127.0.0.1:5000. Start that server first, then run:

```powershell
$env:IMOXY_TCP_ECHO_TEST = "1"
npm test -- --test-name-pattern="real local TCP echo server"
```

The test uses the production VLESS handler, an actual Node TCP socket connected to loopback, migrations 0001–0008, createD1Store() through the existing Node/SQLite D1-compatible adapter, credential hashing, session admission, and quota reserve/forward/settle. It checks a binary initial VLESS payload plus a 64 KiB later upload, byte-for-byte echoed WebSocket output, exact upload/download usage totals, settled reservations, and session-lease release.

Important test seam: the injected local connector maps the handler's synthetic public peer identity (93.184.216.34) to the local loopback TCP socket so the production private-destination policy remains unchanged. DNS resolution and connected-peer identity validation are therefore not tested here. WebSocketPair is a deterministic fake; SQLite is not Cloudflare D1. This proves local handler-to-real-TCP integration only, not a deployed Worker, remote D1, public TCP connectivity, Cloudflare internal WebSocket buffering, or Nova parity. The test is opt-in and skipped by default unless IMOXY_TCP_ECHO_TEST=1.


## 2026-11-02 — mixed DNS answers and cross-family TCP fallback

- Added a deterministic VLESS-handler test using mixed A/AAAA DNS-over-HTTPS answers: RFC1918/ULA answers are filtered, a public IPv4 candidate is attempted first, and when that dial fails the handler connects to the validated public IPv6 candidate.
- The test verifies the connected peer matches the pinned IPv6 address, the initial VLESS payload is not forwarded until connection/peer validation succeeds, usage is reserved/settled only for the forwarded upload, and session cleanup releases the lease.
- Focused handler suite: 53/53 passed. This is Node adapter evidence with synthetic DNS responses and a fake WebSocket; it does not prove external DNS, Cloudflare TCP runtime, Worker/D1 integration, or Nova parity. The remote runtime gate in Issue #78 remains open.


## 2026-11-02 — IANA special-purpose address coverage

- Added IPv4 and IPv6 literal-destination matrices based on the IANA Special-Purpose Address Registries (both last updated 2025-10-09). Cases cover private/shared, loopback, link-local, documentation, benchmarking, multicast/reserved, NAT64, transition, ULA, and IETF protocol-assignment blocks.
- The tests explicitly document the conservative deny policy for the full 192.0.0.0/24 and 2001::/23 parent blocks, including more-specific protocol-anycast entries. The globally reachable 2620:4f:8000::/48 AS112-v6 block remains eligible for explicit host allowlisting.
- The resolver is exercised with numeric literals, so these tests do not depend on external DNS. This is address-policy regression evidence only; it is not Cloudflare Worker/D1/TCP or Nova parity evidence.


## 2026-11-02 — partial DNS-family failure and malformed answer handling

- Added deterministic resolver tests for A-query failure with a valid AAAA answer, AAAA-query failure with a valid A answer, and malformed or family-mismatched DNS JSON records.
- Expected behavior: a failed address-family lookup does not discard valid candidates from the other family; malformed records and records whose declared RR type does not match the address family are ignored; if no valid public candidate remains, resolution still fails closed.
- These are Node tests with synthetic DoH responses, not live DNS, Cloudflare Worker TCP, or Nova parity evidence.


## VLESS Cloudflare Service Binding TCP runtime path (test-only)

- A disposable VLESS Worker may inject a connector that calls a dedicated backend Worker via a Service Binding's `connect(host:port)`.
- The backend exports `connect(socket)` and echoes the raw TCP stream. This is Worker-to-Worker TCP forwarding, not a public TCP listener and not Workers VPC.
- The smoke connector is restricted to `probe.imoxy.invalid` → synthetic `93.184.216.34:5000`; it maps the peer identity only to preserve the production handler's numeric peer-pin test seam. It does not prove the actual network peer identity.
- Deploy the echo Worker with no public URL, route, or domain. Deploy the VLESS Worker with a new disposable D1 database and only the Service Binding to the echo Worker.
- Required live acceptance still needs an external WebSocket client, actual Worker-bound D1 credentials/quota state, exact upload/download/usage verification, cleanup, and post-cleanup resource inventory. Hard limits: 10 seconds, 8 MiB, 16 KiB frames, at most 2 clients.
- Passing this test does not establish Workers VPC, private-network Tunnel behavior, public TCP ingress, or Cloudflare-internal WebSocket send-buffer bounds.


## 2026-11-02 — Cloudflare runtime attempt result

- PR #162 added an external Node WebSocket client and a one-shot workflow. Workflow run `41452175268` failed immediately with `WebSocket error in session 1`; the deployed VLESS smoke Worker also returned HTTP 500 for `/health`. No successful VLESS handshake, TCP echo, or Worker-bound D1 usage settlement was observed.
- PR #163 corrected the Worker entrypoint module shape by moving the connector helper out of the main Worker module; CI passed, but the API-uploaded disposable Worker still returned HTTP 500.
- All disposable Workers and the disposable D1 created for this attempt were deleted, and a fresh inventory verified their absence. Existing staging and Production were not changed.
- The current one-shot workflow is removed because its disposable endpoint has been deleted. The reusable external client remains in `scripts/vless-cloudflare-runtime-smoke.mjs`; run only against a newly deployed, isolated target with a fresh test credential.
- Status remains **Blocked / not accepted** pending a Wrangler-native deployment, a working Worker health route, real VLESS handshake + TCP echo, D1 usage settlement and lease release, and verified cleanup. Do not mark Phase 6 or Phase 11 complete.


## 2026-11-02 — reconcile Wrangler remote-preview evidence with failed API-upload attempt

A prior Wrangler 4.156.0 `wrangler dev --remote` run successfully executed the actual VLESS handler/module graph on Cloudflare's remote Workers runtime. The recorded evidence is:

- 3/3 real WebSocket handshakes at `/proxy/vless` succeeded.
- 3/3 VLESS sessions using synthetic in-memory TCP and fake store/quota adapters returned the expected two-byte VLESS response `[0,0]` and exact four-byte initial payload.
- A raw TCP WebSocket client paused reads for approximately 6.2 seconds, then resumed and received all 4,194,304 bytes in 256 binary data frames (257 frames including the VLESS response); the session closed normally with `upstream_closed`.

This is partial Cloudflare remote-runtime evidence for the real handler/module graph and synthetic relay. It does **not** include a D1 binding, real Cloudflare outbound TCP, real credential persistence/quota settlement, or real D1 lease lifecycle. The slow-reader observation does not measure or prove Cloudflare-internal WebSocket buffer bounds.

This evidence is distinct from the later one-shot direct multipart API upload attempt (PR #162 workflow run `41452175268`), which failed at the external client's first WebSocket connection and whose uploaded disposable Worker returned HTTP 500 on `/health`. PR #163 corrected its module export shape but did not resolve that API-upload harness failure. Those failures do not invalidate the independently successful Wrangler remote-preview run; neither do they satisfy the full Worker/D1/TCP acceptance gate.

All disposable resources from the API-upload attempt were deleted and their absence verified. Existing staging and Production remain untouched. The next useful gate is to run the actual handler under a Wrangler-native remote preview with a dedicated disposable D1 binding and controlled Worker-to-Worker TCP echo Service Binding, using the existing external Node WebSocket client and the approved limits (10 seconds, 8 MiB, 16 KiB frames, max 2 clients). Do not bypass the safety control that blocked Wrangler remote D1 migration execution; use only an approved D1 provisioning/migration path. Keep the D1 and TCP acceptance claims blocked until the exact Worker-bound results and cleanup are observed.


## 2026-11-02 — manually dispatched Wrangler + D1 + Service Binding smoke

The new .github/workflows/vless-cloudflare-smoke.yml is restricted to workflow_dispatch on main and requires the operator to set confirm_disposable_run=true. It consumes only CLOUDFLARE_API_TOKEN; the account ID is pinned in the runner and checked before any write. Resource names are unique to the GitHub run/attempt and use the imoxy-vless-smoke- prefix. Existing Workers, D1 databases, Production, and staging resources are never selected as targets.

The runner:
- Creates one EU D1 database through the Cloudflare D1 API and applies exactly migrations 0001–0008 through the D1 query API (not Wrangler remote migrations).
- Seeds one disposable active account and a SHA-256-only credential record.
- Deploys the TCP Echo Worker with Wrangler, workers_dev=false, preview_urls=false, and no route/domain.
- Runs the production VLESS handler/module graph through wrangler dev --remote, with a D1 binding and the Service Binding to that echo Worker; the VLESS Worker config also disables workers.dev and preview URLs.
- Uses the existing external Node client for two concurrent sessions, 16 KiB frames, an 8.5-second client timeout, a 10-second handler lifetime, and an 8 MiB account quota. Each client sends 65,542 payload bytes; expected D1 upload and download totals are each 131,084 bytes and request count is 2.
- Requires settled reservation bytes to equal combined upload/download bytes, no active or released reservations, and no remaining session leases.
- Stops the preview, deletes only the two run-specific Worker script names and D1 database, then verifies that those exact resources are absent.

The workflow has **not yet been dispatched**. A successful run would establish a bounded Worker-bound D1 + Service Binding TCP smoke for this harness only; it would not establish Nova parity, real public outbound TCP, VPC/private-network behavior, or Cloudflare-internal WebSocket buffer bounds. Any cleanup-verification failure is a hard failure and requires manual inventory review before another run.

## 2026-11-02 — Service Binding TCP smoke follow-up

The first real disposable Wrangler + D1 + Worker-to-Worker TCP Service Binding run (GitHub Actions run 41469175764) applied all eight migrations and deployed the echo Worker, but the first external VLESS client timed out after 8.5 seconds. Cleanup of the run-owned Worker and D1 completed and their absence was verified. Follow-up acceptance must:
- await the Service Binding TCP connect call before inspecting the returned Socket;
- include timeout-stage diagnostics (handshake received, frame-send state, echoed bytes, socket ready state) and captured Wrangler remote-preview output;
- rerun only after the correction passes exact-head CI, then require exact bidirectional byte counts, D1 usage/reservation settlement, zero active leases, and verified cleanup.

The failed run is not a passing handshake/relay/D1-accounting test.


## 2026-11-02 — second-run failure localization

The second disposable runtime attempt (run 41471462310) completed the VLESS handshake and sent frames, but timed out after receiving 16,390/65,542 expected bytes. The test did not establish complete echo, D1 accounting, or lease release. The next test build emits payload-free start/completion/error timings for D1 reserve, forwarding mark, TCP write/read, WebSocket send, and D1 settle, plus test-only echo chunk counters. Acceptance requires identifying the stalled boundary, preserving the 10-second/8-MiB/16-KiB/two-client caps, exact bidirectional byte totals, successful D1 settlement, zero active leases, and verified cleanup. Do not rerun Cloudflare until exact-head CI passes and the diagnostic diff is reviewed.


The diagnostic implementation and handler regression test passed `npm run verify` on exact branch head `c3906ceee8c6912c3b9a99800ee26caf5655f614` (GitHub Actions run [41474182459](https://github.com/ijoolaie/imoxy-net/actions/runs/41474182459)). No live Cloudflare rerun has been performed.

## 2026-11-02 — diagnostic retrieval follow-up

The console-only callback events were absent from Wrangler remote-preview logs in run 41477742794. The smoke Worker now exposes a test-only GET /_test/diagnostics endpoint, protected by a random per-run token passed in a temporary Wrangler config and required in a request header. It returns no-store JSON with at most 256 allowlisted payload-free events and a dropped-event count. The buffer is isolate-local; an empty response is inconclusive if the request reaches another isolate. The harness test covers token gating, field allowlisting/redaction, and bounded retention. Do not rerun Cloudflare until exact-head CI and diff review pass. Keep the 10-second, 8-MiB, 16-KiB, and two-client caps unchanged.

## Current Workers WebSocket API and close semantics � 2026-11-06

The current official API reference documents synchronous `WebSocket.send()` and `readyState`/`binaryType`, but no documented send-buffer size, `bufferedAmount`, drain event, or awaitable send result. Keep the finite application-submitted payload bound described above and do not claim that it measures runtime-internal buffering. The VLESS smoke compatibility date (`2026-11-02`) is after the `2026-04-07` default activation of automatic close-frame replies. Because the handler uses default `server.accept()`, the runtime acknowledges peer Close frames before firing `close`; asynchronous TCP close and D1 lease release continue separately. Half-open mode is documented for proxy coordination but should not be enabled without a cancellable/bounded dial contract and tests proving that a stalled dial cannot indefinitely hold the close handshake. This is a lifecycle design note, not a diagnosis of smoke run #5. Issue #78 remains open and the disposable slow-reader probe remains unrun.

Source: https://developers.cloudflare.com/workers/runtime-apis/websockets/ (last updated 2026-10-12).

## TCP dial cancellation regression � 2026-11-06

The handler now passes a per-candidate `AbortSignal` to the TCP connector adapter and aborts it when the session closes. The default Cloudflare adapter checks the signal after module import and before the synchronous `connect()` call, avoiding creation of a new TCP socket when the handshake has already timed out. If the socket was already returned, the existing tracked pending-socket cleanup still closes it before releasing the D1 admission lease. Cooperative connectors can cancel promptly; connectors that ignore the signal and an import that never settles remain conservative pending-cleanup risks. A deterministic handler test covers abort-before-socket-creation and confirms the lease is released only after the connector settles. This is local evidence, not Cloudflare runtime acceptance.

Cloudflare TCP sockets API: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/ (last updated 2026-10-13).

## VLESS slow-reader runtime harness — 2026-11-06 (implemented; Cloudflare run pending)

PR #199 was squash-merged as `024c571e13534ad0e76801b3c9e2aa6afefcaa80`. The disposable VLESS Worker/D1 smoke workflow now runs two baseline clients concurrently, then one sequential 4 MiB slow-reader client. The latter is a raw TCP WebSocket client restricted to the local Wrangler preview endpoint; it pauses the TCP socket's receive side with `socket.pause()` while the 4 MiB echo is produced, waits an additional 2.5 seconds, resumes with `socket.resume()`, and verifies exact byte-for-byte continuity. It reports upload/download bytes, sent/received frame counts, pause duration, first-byte-after-resume timing, and total elapsed time.

The smoke fixture now expects three sessions: 4,325,394 upload bytes and the same download bytes, three requests, 8,650,788 settled reservation bytes, zero active sessions/reservations, and no released reservations. The disposable daily quota fixture is 16 MiB; the slow-reader session remains below the existing 8 MiB per-session download cap. The workflow still requires the explicit `confirm_disposable_run=true` dispatch input and deletes/verifies absence of its uniquely named Worker and D1 resources.

Local `npm run verify` passed 243 tests with one existing environment-gated TCP echo test skipped; PR-head CI run `42240286389` passed on `7e4eb2c91f429bc921a928ccc034ed3de44839b1`. A local mock TCP/WebSocket integration test validates the pause/resume and exact echo behavior.

**Evidence boundary:** this adds a genuine client-side TCP receive pause to the actual VLESS smoke harness, but does not measure Cloudflare's internal WebSocket queue, runtime memory, or a send-drain signal. PR #199 did not execute the Cloudflare workflow. The disposable Worker/D1 runtime gate remains pending separate explicit owner authorization; Issue #78 stays open and internal-buffer boundedness remains **unproven**. No Cloudflare resources/configuration were changed by PR #199.

## 2026-11-07 — slow-reader Run #10 and D1 round-trip optimization

Disposable Cloudflare smoke Run #10 (workflow run `42346904497`, exact main SHA `a109b6a2a67bb80f6350f28567ff3af896d9c3e5`) passed the two-client baseline and lease drain, then failed the 4 MiB slow-reader stage after 143,360 bytes. The Worker closed with `1001 session_duration_exceeded` at the unchanged 30-second session cap; active session count was zero and one forwarding-marked quota reservation remained active. The latter is intentionally retained after an ambiguous post-forwarding transport outcome to avoid undercounting; it is not eligible for pre-forwarding release/reclaim. Disposable Worker and D1 cleanup was verified.

Preview logs showed repeated D1 reserve/forwarding-marker/settlement latency around 230–360 ms per chunk, while WebSocket send itself was effectively immediate. The current adapter used separate D1 requests for stale-reservation cleanup + reservation claim, forwarding-marker update + verification read, and settlement batch + event verification read. This is evidence of a plausible throughput bottleneck, not proof of a sole root cause.

Feature branch `perf/d1-quota-roundtrip-batching-2026-11-07` reduces those D1 request boundaries without changing quota semantics: stale cleanup + conditional reservation claim are one D1 batch; forwarding marker is a conditional `UPDATE ... RETURNING`; event claim + apply + immutable-payload verification SELECT are one D1 batch. SQLite-backed tests preserve concurrent quota admission, replay/conflict, expiry recovery, aggregate rollback, and end-to-end VLESS handler accounting. Focused tests passed 35/35. Full `npm run verify` passed: 252 passed, 1 existing environment-gated skip, 0 failed. One earlier full-suite attempt exposed a test-adapter gap for SELECT results inside D1 batch; the adapter was corrected and the full suite rerun successfully.

**Evidence boundary:** these are local SQLite/Node tests only. No Cloudflare run was dispatched for this branch; D1 batch SELECT response shape and the 30-second Worker runtime behavior still require an approved disposable smoke. Keep all configured caps, security conditions, and staging/production unchanged. Issue #78 remains open; Worker-internal buffering/backpressure is still unproven.
