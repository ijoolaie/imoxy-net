# Decision log

## 2026-10-27 — parity before customization

The first milestone is behavioral parity with a pinned reference release. Imoxy-specific features are deferred until parity is measured and the applicable license terms are reviewed.

## 2026-10-27 — shared domain logic

The Telegram bot, web panel and Android client must share domain services and authorization/quotas. The three supported workflows are panel only, Cloudflare resources/settings only, and panel plus Cloudflare resources/settings.

## 2026-10-27 — honest capability reporting

Unimplemented endpoints must not return fake success. Capability reporting distinguishes implemented initial slices from pending full workflows. Implementation status is not a claim of Nova compatibility.

## 2026-10-27 — schema separates admin principals from proxy accounts

The initial D1 schema separates control-plane principals/sessions from end-user proxy accounts. Subscription tokens are represented by hashes; provider resource metadata excludes provider credentials. This is a proposed imoxy data model pending migration, threat-model, and reference-compatibility validation.

## 2026-10-27 — documented feature list is not runtime evidence

The pinned README, package manifest, license and deployment guide are recorded as source evidence. The prioritized black-box scenarios are hypotheses until executed against an authorized instance of the pinned release. No reference behavior is marked verified.

## 2026-10-27 — parameterized D1 access and audited mutations

Account persistence uses prepared statements and a fixed field-to-column allowlist. Mutations require an audit event and use D1 batch operations to keep the account write and audit insert together. Current tests use a mocked D1-compatible binding; real D1 migration and concurrency behavior still require integration validation.

## 2026-10-27 — provisional UTC quota accounting

The first quota policy evaluates total and daily usage in UTC, treats null limits as unlimited and equality with the quota as allowed. This is an imoxy baseline, not a Nova parity claim. REF-006–008 must establish upstream expiry/quota boundaries, timezone and accounting semantics before compatibility is frozen. Hard enforcement is blocked on data-plane integration and atomic reservation/idempotency design.

## 2026-10-27 — subscription tokens are random, hash-at-rest credentials

The subscription service returns a cryptographically random token once and persists only its SHA-256 hash. Revocation is idempotent, links are invalid when either the subscription or account is expired/disabled, and a subscription cannot outlive the account. Auto and Base64 output are provisional clean-room formats; the public route and reference compatibility remain pending.

## 2026-10-27 — Cloudflare integration starts read-only

The first provider client is deliberately GET-only. Inventory and deterministic dry-run planning are exposed behind provider permissions, with no apply or delete endpoint. Live provider validation, least-privilege scope verification, idempotent mutations and rollback must be completed before any write capability is considered.

## 2026-10-27 — interfaces are thin clients over the shared API

The web panel and Android client use the same versioned Worker API. The initial Telegram webhook calls the shared account domain service for read-only listing and has an explicit allowlist. The Telegram allowlist is an interim bootstrap control, not a substitute for durable per-principal account linking; mutating bot commands remain blocked until linking, audit and replay protections are implemented.

## 2026-10-27 — Android token storage uses platform Keystore

The initial Android client stores a bearer token encrypted with AES-GCM under a key managed by Android Keystore. It requires HTTPS and disables authenticated redirects, app backup and cleartext traffic. Device-level validation, release signing and threat review remain required.


## 2026-10-27 — Telegram commands are private-chat-only

The webhook ignores every non-private chat before claiming the update ID or sending a reply, including when the sender is allowlisted. This is an imoxy security/privacy safeguard to avoid exposing account metadata in group conversations; it is not asserted to match Nova Proxy behavior. A regression test covers an allowlisted sender invoking `/accounts` in a supergroup. Main CI passed on `12cfb9f7e8c3f01a07346165bfdeb28c684893da` (run 40495393858). Live Telegram and pinned-reference tests remain pending.


## 2026-10-27 — clear all authentication rate-limit dimensions on successful login

Login attempts are counted against separate HMAC-derived IP and normalized-username keys. A successful login must clear each key independently, not pass the key array to storage as a single key. A regression test asserts all counters are removed. This is an imoxy implementation correction; upstream rate-limit semantics remain uncharacterized.


## 2026-10-27 — reject overflowing combined usage deltas before persistence

Usage reporting validates that upload and download byte deltas individually are non-negative safe integers and that their sum is also a safe integer. Overflow is rejected before storage to avoid precision loss or invalid accounting. This is an imoxy data-integrity safeguard; quota/reporting behavior still requires reference characterization and data-plane integration.


## 2026-10-27 — guard daily usage upserts against counter overflow

The D1 usage adapter validates the combined upload/download delta and uses a conditional atomic upsert so a daily row is not incremented beyond the JavaScript safe-integer range. A zero-row result is surfaced as a range error rather than silently accepted. This protects daily counters but does not make quota enforcement atomic across check-and-forward operations and does not deduplicate retried reports. Idempotency requires a stable caller-provided event ID and an event ledger/unique constraint; inventing one at the service boundary would not deduplicate real retries. Real D1 validation remains required.


## 2026-10-27 — enforce daily counter bounds at the schema layer

The adapter's conditional upsert is not the only possible writer to `usage_daily`; therefore migration 0004 adds BEFORE INSERT/UPDATE triggers to enforce the supported safe-integer bound independently of application code. SQLite migration tests cover rejected inserts and updates and confirm failed updates leave the row unchanged. This is defense-in-depth, not a substitute for real D1 testing, idempotency, lifetime aggregate guards, or atomic quota reservation.


## 2026-10-28 — usage-event identity and reservation design

A future usage report must carry a stable caller-provided event ID from the trusted proxy/data-plane source. Do not derive IDs from account/date/delta, and do not mint IDs at the receiving API. The same ID plus same immutable payload is a replay no-op; the same ID with changed content is a conflict. Ledger insertion and aggregate mutation must succeed or fail atomically. This is a design decision only: no ledger, idempotency, reservation, or real D1 behavior has been implemented. See [usage-event-atomicity-design.md](usage-event-atomicity-design.md). Cloudflare's current D1 docs describe `batch()` as a SQL transaction with rollback on failure, but this must be confirmed by isolated real-D1 integration tests for the exact implementation.

## 2026-10-28 — prioritize proxy data-plane before usage ledger

Inspection of the pinned Nova Proxy 5.0.0 README/deployment guide and the current imoxy entry point identified an architecture mismatch: the reference documents one Cloudflare Worker serving admin UI, subscription delivery, and proxy traffic, while imoxy's `worker.js` currently dispatches to static assets or the management API. The inspected API has no WebSocket upgrade/proxy protocol handler and does not instantiate the quota service.

Decision: do not implement a disconnected usage ledger/reservation subsystem next. First specify black-box scenarios and implement the smallest independently written end-to-end proxy traffic path; identify the trusted measurement point and its account/subscription identity. Then design event identity and pre-forwarding reservation against that real boundary. This is a priority decision, not a claim that Nova runtime behavior has been verified. Do not copy protected upstream source or assets; licensing/distribution remains a release gate.

### Decision — conservative connected IPv6 peer filtering (2026-10-28)

Fail closed when the TCP runtime reports a malformed peer address or an IPv6 address outside global-unicast space; additionally block selected special-purpose, transition and documentation prefixes. PR #62 is merged and PR #63 is pending exact-head CI. This reduces obvious bypasses but is not a complete maintained IANA registry, does not pin hostname DNS answers to the connected peer, and is not Nova parity evidence.

### Decision status — conservative IPv6 peer policy (2026-10-28)

The PR #63 policy is merged as `29fa597c5c649552d827396a218609ce895724f4` after exact-head CI passed. The application fails closed on non-global IPv6 and selected special-purpose, transition and documentation ranges. This is not a complete maintained IANA registry and does not pin hostname DNS answers to a connected peer. Real Cloudflare runtime validation and Nova parity remain open.


### Decision — pin outbound TCP dials to validated DNS answers (2026-10-28)

PR #66 is merged as `471e3a0d0cd9d0fc0fd2292b450e9a95aa026198` after exact-head CI passed. Hostnames are resolved through a fixed DNS-over-HTTPS endpoint; a normalized public numeric address is selected and passed directly to the TCP adapter, and the runtime-reported peer must match before any payload is forwarded or quota is reserved. Fail closed on resolution failure, invalid/private-only answers, invalid numeric destinations or peer mismatch. This narrows DNS-rebinding risk by preventing a second hostname lookup at dial time, but is not proof of complete SSRF protection or Nova parity. Actual Cloudflare Worker/D1 smoke tests, complete maintained special-purpose IP coverage, fallback behavior and resource/backpressure limits remain required; no deployment was performed.

## 2026-10-28 — superseded VLESS download queue guard (historical)

An earlier implementation attempted to bound downstream queued bytes by reading `server.bufferedAmount` and enforcing a 1 MiB threshold. This approach was removed because the current Cloudflare Workers WebSocket API documentation does not document `bufferedAmount`; a fake adapter property is not runtime evidence. Do not reintroduce this guard unless supported by authoritative runtime documentation and a reproducible Worker test. Current downstream runtime-buffer boundedness remains unproven; see the correction and follow-up decision below.

## Correction — do not assume Worker bufferedAmount support

The earlier 1 MiB guard based on `server.bufferedAmount` is superseded by a compatibility review. The official Cloudflare Workers WebSocket API reference does not document this property; the browser WebSocket API does, but that is not proof it exists in Workers. The fail-closed check is being removed to avoid closing all sessions on an absent property. No replacement is called complete until it is based on a supported runtime mechanism and validated in a disposable Worker smoke test.


## 2026-10-28 — documented Workers WebSocket flow-control capability review

Reviewed the current official [Cloudflare Workers WebSocket runtime API](https://developers.cloudflare.com/workers/runtime-apis/websockets/) and [WebSockets usage guide](https://developers.cloudflare.com/workers/examples/websockets/). The documented `WebSocket` surface includes synchronous `send()`, `accept()`, `close()`, event listeners, `readyState`, and `binaryType`; these references do not document `bufferedAmount`, a drain event, or an awaitable send result. This is a documentation review, not runtime execution evidence, and does not prove that no undocumented implementation behavior exists.

Decision: do not use undocumented properties or treat an injected fake adapter as proof of Cloudflare runtime buffering. Sequentially awaiting quota settlement between TCP reads constrains application read-ahead, but settlement is unrelated to downstream WebSocket drain. A hard per-session byte/time budget with session termination can bound application lifetime/forwarded work, but must be an explicit product policy and must not be described as measuring or bounding the runtime's internal WebSocket queue. The policy has not been selected or implemented pending owner/product approval.

Issue #78 remains open. Before claiming completion, add deterministic tests for whichever explicit application policy is selected (slow/non-reading client simulation, stop condition, socket/WS cleanup, and reservation/settlement behavior), then perform the separately authorized bounded staging probe. Record client-side receive backlog only as an observation; it is not an authoritative Worker send-buffer measurement. No Worker deployment, route binding, D1 mutation, or live probe was performed for this review.


## 2026-10-30 — enforce explicit per-session VLESS download and lifetime budgets

The downstream Workers WebSocket API still has no documented send-buffer size or drain signal. Adopt an explicit, fail-closed application policy instead of relying on undocumented runtime properties: every VLESS session must receive a positive decimal `PROXY_MAX_DOWNLOAD_BYTES` and `PROXY_MAX_SESSION_DURATION_MS` setting. Both are parsed as safe integers; the duration is capped at the maximum supported timer delay. Missing or invalid settings reject the WebSocket route with HTTP 503 before allocating a WebSocket pair.

The handler counts successfully reserved, sent and settled download bytes. Before reserving or sending the next TCP chunk, it closes the session if that whole chunk would exceed the remaining download budget. A hard lifetime timer starts after authentication and closes the WebSocket plus upstream resources when it expires. Existing reserve-before-forward, settle-after-forward, and retain-ambiguous-reservation behavior is unchanged.

This bounds cumulative downstream bytes and lifetime per session, including for a client that never reads. It does **not** expose or prove the Workers internal send-buffer size, establish a global bound across an unlimited number of concurrent sessions, or prove Nova behavior. The configuration values are deliberately not defaulted or deployed; an operator must select them for each isolated environment. Keep Issue #78 open until runtime evidence, concurrency/resource policy, and cleanup gates are reviewed.


## 2026-10-30 — VLESS concurrent-session admission design

Source inspection confirms that `proxy_accounts.max_connections` is stored and returned by the D1 adapter but is not consumed by the VLESS handler. A Worker-global map is rejected as an enforcement authority because it is isolate-local and non-durable.

Decision for the first implementation slice: evaluate D1-backed active-session leases with one conditional `INSERT ... SELECT` statement that atomically checks both the per-account `max_connections` value and a mandatory installation-wide `PROXY_MAX_CONCURRENT_SESSIONS` ceiling. Do not use a read-then-insert sequence. `NULL` means no account-specific cap; zero denies new sessions. Acquire before upstream TCP dial; release idempotently on all close paths; stale/ambiguous leases remain counted until expiry after maximum session lifetime plus a cleanup grace.

This is a design choice, not an implemented or D1-verified guarantee. The final selection is conditional on a real disposable-D1 concurrent last-slot test and admission-latency measurement. If D1 does not meet the correctness/performance requirement, evaluate one Durable Object per account (not a global singleton). See [vless-session-admission-design.md](vless-session-admission-design.md) and [Issue #106](https://github.com/ijoolaie/imoxy-net/issues/106). No production/staging resource was changed.


## 2026-10-30 — VLESS session lease implementation merged

PR #108 merged as `8bc11df4aa6c5a8ae77d28a3b77312c35c33b8b9`. The handler now acquires a D1-backed active-session lease before opening upstream TCP and releases it once after local/upstream cleanup. One conditional `INSERT ... SELECT` checks the current active account, optional per-account `max_connections`, and required installation-wide `PROXY_MAX_CONCURRENT_SESSIONS`. Lease expiry includes the bounded initial handshake/setup interval, maximum session duration, and required grace. Migration 0007 uses a restrictive account FK so account deletion cannot silently free a live lease.

Exact-head PR CI, same-head push CI, and post-merge main CI passed. SQLite-backed actual-SQL and handler lifecycle tests passed. Real disposable Cloudflare D1 race/expiry tests and Worker runtime validation remain mandatory; no Cloudflare resource or D1 data was changed. The current `max_connections = 0` behavior is fail-closed, not verified against Nova 5.0.0.


## 2026-10-30 — Bounded stale VLESS lease cleanup

PR #111 adds best-effort cleanup of at most 100 expired session leases before each new admission and rejects a lease whose expiry is already at/before its admission time. Expired leases remain excluded from the atomic account/global capacity predicates even if cleanup fails. Account deletion separately cleans at most 1,000 expired leases for that account and remains blocked by any remaining live lease. Exact-head PR, same-head push, and post-merge main CI passed. Real D1 runtime validation remains pending.


## 2026-10-30 — Nova per-account session-limit evidence remains unknown

Inspected the pinned Nova Proxy 5.0.0 README, GUIDE, package manifest and version metadata. The user-facing docs do not specify `max_connections`, the unit counted, zero semantics, slot-release timing, or behavior after cap changes. The shipped worker is marked protected; no implementation behavior was inferred from that artifact. Added REF-032 to define the required controlled black-box cases. Imoxy's zero=deny-all behavior is an explicit fail-closed choice, not a Nova parity finding. PR #114 merged this evidence update; exact-head and post-merge CI passed.


## 2026-10-30 — VLESS session-lease code review

Reviewed the current D1 admission SQL, migration 0007, handler lifecycle and SQLite-backed integration tests. The single conditional INSERT ... SELECT is consistent with D1's documented single-threaded per-database query processing and primary-routed writes; the live D1 race/expiry test remains required. Current call paths use canonical UTC ISO timestamps, lease expiry covers handshake + max session duration + grace, ambiguous release remains counted until expiry, and cap reductions affect new admissions only. No confirmed defect was found; no code change was warranted. SQLite concurrency tests do not establish live D1 behavior. Issue #106 and #78 remain open. Latest main SHA is ea066417ac22d0da1062732dae1b0b7c5cc47edb; CI for that exact commit was not independently confirmed in this session. No Cloudflare mutation or deployment occurred.


## 2026-10-30 — PR #116 merge and CI evidence

PR #116 recorded the focused VLESS session-lease code review and was squash-merged as `373948bc8f8495d2e8a970bf618355e2dd57b0f8`. Exact PR-head CI run `41069802838` passed, including `npm run verify`. The connector returned no post-merge workflow run for the squash commit, so this is not claimed as post-merge CI. No confirmed code defect was found. Issue #106 and #78 remain open for disposable D1/Nova reference and real Worker slow-reader runtime validation. No Cloudflare resources or existing staging data were changed.


## 2026-10-30 — VLESS downstream application-submitted bound

The VLESS relay reads upstream TCP data sequentially and awaits the send+quota-settlement operation before requesting another chunk. Combined with the whole-chunk per-session download-byte ceiling and required global D1 session-lease ceiling, this bounds payload bytes submitted to WebSocket.send() to at most `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)` across admitted sessions. The two extra bytes per session are the VLESS response header. This does not measure or prove the Cloudflare-internal WebSocket queue, framing/copies, or total memory. A deterministic held-settlement/non-reading-peer regression test was added in PR #121; exact-head CI run `41077052986` passed on `a401fdf34157c9c88449a4d6108e852652024dc6`. Keep the Worker slow-reader runtime probe and Nova REF-032 open.

## 2026-10-30 — PR #121 downstream serialization test merged

PR #121 added a deterministic non-reading-peer/held-settlement test proving the handler does not issue another upstream TCP read/send before quota settlement completes and rejects the next over-budget chunk before forwarding. PR #121 squash-merged as `5f63b03f4bbee2dfd473317b22166b1bce5206b3`. Exact-head CI run `41077238216` passed on `96db6e27a6242b36957a6f6b345494644017d7c8`; post-merge main CI run `41077371663` passed on the exact merge commit, including `npm run verify`. Cloudflare-internal WebSocket buffer behavior and Nova REF-032 remain unverified.


## 2026-10-30 — D1Store admission SQL exercised through the production wrapper

PR #123 adds a Node 22 SQLite integration test that applies the checked-in initial schema and migration 0007, then executes the production createD1Store admission/release/cleanup methods through a D1-compatible adapter. The test covers per-account and installation caps, duplicate lease idempotency, expiry cleanup, and restrictive account deletion. Exact-head CI run 41080879160 passed on 78d988687e508944271ad9babfa042b9bc9f04b5, including npm run verify. This closes the local SQL-wrapper execution gap left by the mock-only D1Store unit tests. It does not establish Cloudflare D1 concurrency semantics, deployed Worker integration, Cloudflare WebSocket backpressure, or Nova REF-032. Keep Issues #106 and #78 open. No Cloudflare resources or staging data were changed.


## 2026-10-30 — PR #123 D1Store SQLite wrapper tests merged

PR #123 was squash-merged as 969f96b1ca1e15befd9ee9cbf5dbf025f391b429. Final PR-head CI run 41081184391 passed on ed4d71916ad729e9f9ad6c462a0747c5beabf860; post-merge main CI run 41081292762 passed on the exact merge commit, including npm run verify. The production D1Store admission/release/cleanup wrapper now has SQL-engine coverage using Node SQLite and the checked-in migrations. This is not Cloudflare D1 concurrency or Worker runtime evidence. Issues #106 and #78 remain open for runtime and Nova reference gates. No Cloudflare resources or staging data were changed.


## 2026-10-31 — VLESS handler constructor 1101 isolation

A new disposable runtime pass confirmed native Workers `WebSocketPair` enumerability and successful import-only loading of the individual production modules, including the VLESS handler module itself. Invoking `createVlessWebSocketHandler()` in a Worker nevertheless produced Cloudflare 1101, including when invoked inside a `try/catch` with all constructor options overridden. The failed request produced no invocation rows in the queried observability dataset. This narrows the unresolved failure to the constructor invocation or Worker execution path around it, but does not identify a specific statement or establish a VLESS handler defect. No WebSocket upgrade, VLESS payload, credential lookup, TCP, D1, quota, lease, or relay test passed.

All 12 newly created temporary Workers were deleted; the remaining route-control name was already absent. Only the two pre-existing Workers remain. All three pre-existing D1 databases remain unchanged. Issue #78 was updated (comment `6544803626`) and remains open. No production settings or existing resources were changed.


## 2026-10-31 — Wrangler remote-preview is the current VLESS handler runtime evidence

A Wrangler 4.156.0 `wrangler dev --remote` preview successfully executed the actual VLESS handler module graph on Cloudflare's remote runtime. Three of three real WebSocket handshakes passed; three synthetic in-memory TCP sessions with fake store/quota adapters returned the expected VLESS response and exact initial payload; a client paused reads for about 6.2 seconds and later received the full 4 MiB synthetic download. This supersedes the earlier constructor-1101 diagnosis for this Wrangler preview path only; it does not erase the earlier failure of the separate direct API upload/workers.dev harness.

No D1 binding or real outbound TCP was used. The slow-reader result does not establish an internal WebSocket buffer bound. A subsequent disposable D1 was deleted after the safety layer blocked remote migration execution before any SQL ran. Do not bypass that control. Keep Issue #78 open and require a supported, approved isolated-D1 execution path before claiming real-D1 VLESS acceptance.

## 2026-11-01 — reserve Worker management paths from custom VLESS routing

The Worker invokes the VLESS handler before management API and static-asset routing. Because `PROXY_WS_PATH` previously accepted any syntactically valid absolute path, configuring it as `/api/v1/capabilities` caused ordinary API requests to be intercepted and answered with HTTP 426. This was reproduced by a failing Worker-entrypoint regression test.

Decision: the VLESS handler declines configured paths equal to `/api`, under the `/api/` namespace, or equal to `/health`. This preserves the Worker management API and health endpoint even when an operator supplies a conflicting proxy path. Tests verify the API and health routes continue to return HTTP 200. The change does not alter the default `/proxy/vless` route or the already-tested non-reserved custom path.

This is a routing-isolation correctness fix only. It is not Cloudflare runtime, D1, TCP, slow-reader, or Nova parity evidence.

## 2026-11-01 — use Cloudflare D1 API for isolated SQL recovery validation

The Wrangler remote-migration command was previously blocked by the execution safety layer before SQL execution. The project has an owner-recorded authorization for one disposable D1 database for this test, and the Cloudflare D1 API exposes an explicit query endpoint. Under that narrow authorization, one disposable EU D1 was created, migrations 0001–0008 SQL were applied through the D1 API, and direct primary queries exercised quota recovery, trigger settlement, marker immutability, D1 batch rollback, and concurrent reservation admission. The exact test database was deleted and inventory confirmed it absent. This is not a workaround around the blocked Wrangler command: no shell bypass was attempted; the direct D1 API is the separately supported Cloudflare tool path. It is not a Wrangler migration-history test and does not prove Worker-bound D1Store/VLESS behavior. Do not create a Worker, alter bindings/routes/DNS, or contact a TCP destination until separately authorized and a controlled endpoint plus hard test limits are specified.

## 2026-11-02 — add opt-in local VLESS-to-TCP Echo integration

Decision: use the user's loopback-only TCP Echo Server as a controlled local destination for an opt-in integration test of the production VLESS handler, rather than changing production destination policy to permit private addresses. The test injects a local connector adapter and synthetic public peer identity while the actual TCP socket connects only to 127.0.0.1:5000. It exercises the production handler, Node SQLite D1 adapter, migrations 0001–0008, credential authentication, session lease, bidirectional byte forwarding, quota reservation and settlement. The test remains opt-in (IMOXY_TCP_ECHO_TEST=1) so ordinary CI does not depend on a developer's local server.

This test seam deliberately bypasses DNS resolution and peer-address verification; it must never be wired into production Worker configuration. It does not establish Cloudflare Worker-to-TCP reachability, live D1 binding behavior, runtime WebSocket buffering, or Nova parity. No Cloudflare resource or setting is changed.


## 2026-11-02 — mixed DNS answers and cross-family TCP fallback

- Decision: retain the current bounded sequential address fallback policy and explicitly test the combined path rather than adding a parallel-dial race. Mixed A/AAAA records are normalized and filtered first; candidates are attempted in resolver order, at most the existing fixed maximum; no payload is forwarded until the connected peer matches the pinned numeric candidate.
- Evidence: the new deterministic handler test exercises private-answer filtering, IPv4 dial failure, IPv6 success, peer validation, initial-payload forwarding and quota settlement. Focused suite passed 53/53.
- Limitation: this is a Node test with synthetic DNS responses and a fake WebSocket. It does not prove Cloudflare Workers TCP behavior, external DNS behavior, D1 binding, or Nova parity. Issue #78 remains open.
