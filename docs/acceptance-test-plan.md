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
- Verify stale lease expiry and bounded cleanup, including worker termination/restart behavior.
- Repeat concurrency and lifecycle tests against a dedicated disposable Cloudflare D1 database; SQLite tests are not sufficient to pass the runtime gate.

SQLite-backed actual-SQL and handler tests pass, and PR #108 is merged. A real disposable Cloudflare D1 concurrency/expiry test, controlled Worker smoke test, and Nova comparison remain required. No Worker deployment or Cloudflare mutation was performed.
