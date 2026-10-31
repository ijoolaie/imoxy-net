# Proxy data-plane MVP — acceptance-first implementation plan

**Status:** A restricted VLESS-over-WebSocket TCP handler prototype is now implemented in main. Exact-head Node CI run #515 passed, but real Cloudflare Worker/D1 smoke tests are still required; it is not a production proxy or Nova parity claim.  
**Reference:** Nova Proxy 5.0.0, pinned commit ad2116aa89f8c7db8248f8142c1432900d835eb7.  
**Purpose:** Replace management-only progress with the smallest verifiable end-to-end proxy path, implemented independently.

## Why this is the next slice

The pinned reference README describes a Cloudflare Worker that serves its panel, subscription links and proxy traffic. The pinned deployment guide describes a single Worker with KV and D1 and no origin server. In imoxy, worker.js currently dispatches to static assets or createApiHandler(); the inspected API has no WebSocket upgrade or proxy protocol path. URI/YAML generators do not prove that a client can connect.

Source references: [pinned Nova README](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md), [pinned deployment guide](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md). These documents are hypotheses to guide black-box tests, not proof of observed runtime behavior.

## MVP boundary

Implement one independently authored, testable VLESS-over-WebSocket TCP path first, provided the authorized reference characterization confirms it is an in-scope supported combination. Do not hard-code an assumed WebSocket path or undocumented defaults: discover them from settings/reference evidence and make deployment configuration explicit.

The vertical slice must connect these boundaries end to end:

1. **Worker routing:** distinguish normal panel/API requests from the configured proxy WebSocket endpoint; reject wrong methods, paths, and upgrade headers safely.
2. **Credential/account lookup:** authenticate the protocol credential against an active account; reject disabled/expired/unknown credentials before opening an upstream socket. Credential provisioning, hash-only storage, hash lookup, and owner/admin rotation/revocation are merged through a proxy_credentials table; raw UUIDs are returned only once. The current prototype consumes the lookup, but real D1 validation remains pending. The legacy proxy_accounts.credential_secret_ref field remains unused.
3. **Protocol parser:** validate version, UUID/credential, command, address type, destination address and port with strict bounds; reject malformed or unsupported requests without dialing upstream.
4. **Upstream adapter:** use the Cloudflare Workers TCP socket capability behind a small adapter so parsing and policy can be unit-tested without a live socket. No arbitrary destination is contacted until authentication and all parser/policy checks pass.
5. **Bidirectional relay:** preserve byte order, propagate close/error/half-close behavior where the runtime supports it, handle backpressure, and close sockets on timeout, cancellation or failed handshake.
6. **Usage observation boundary:** identify exactly where uploaded/downloaded bytes can be measured. This first slice must not claim quota enforcement until atomic reservation and accounting are connected to the real forwarding lifecycle.
7. **Evidence:** run deterministic parser/handler tests in CI and a controlled Cloudflare Worker smoke test with a disposable account and known test endpoint before marking the path functional.

## Acceptance scenarios to write before implementation

- **P0 — valid handshake:** a valid configured credential and supported VLESS TCP request upgrade successfully, connect to a controlled test endpoint, and relay a known byte sequence in both directions.
- **P0 — invalid credential:** unknown, malformed, disabled or expired account is rejected before any upstream dial; response/close behavior is captured.
- **P0 — malformed protocol input:** truncated headers, invalid UUID, unsupported command/address type, invalid port and oversized domain are rejected without upstream activity.
- **P0 — route/upgrade validation:** wrong path, non-WebSocket request, and invalid upgrade headers do not create a proxy session.
- **P0 — relay failure:** upstream connect failure, client disconnect, upstream close, idle timeout and cancellation close both sides without leaking a socket or hanging the request.
- **P1 — boundary safety:** concurrent connections, maximum header sizes, slow initial frames, fragmented WebSocket messages and binary payload handling do not bypass parser limits.
- **P1 — usage instrumentation:** measured ingress/egress byte totals are correct for a deterministic transfer, but remain observational only until reservation and event idempotency gates pass.
- **Reference comparison:** execute equivalent cases against the authorized pinned Nova runtime and record request, response/close behavior, side effects and differences. Until that happens, label compatibility **Not assessed**.

## Security and implementation constraints

- Independently implement from protocol specifications and observed external behavior; do not copy Nova's obfuscated worker, panel assets or branding.
- Never accept a client-supplied account ID or byte count as proof of identity or usage.
- Do not dial upstream before authentication and validation. Apply destination/port policy and prevent malformed-input, resource-exhaustion and open-proxy behavior.
- Keep secrets out of logs and responses; account credential creation, hash/secret storage, rotation, and revocation must be reviewed.
- Keep Cloudflare API writes disabled; this data-plane path should not require provider-management credentials.
- Use no live user or production account. The test endpoint and account must be disposable and explicitly scoped.
- The Nova 5.0.0 license/distribution question remains a release blocker. The plan does not grant rights to copy or redistribute upstream material.

## Explicit non-goals for this slice

- Do not claim full Nova parity.
- Do not implement gRPC, XHTTP, Trojan, Shadowsocks, mixed-protocol fallback, WARP, proxy chaining or UDP in this first vertical slice.
- Do not implement a disconnected usage-event ledger or read-then-write quota check and call it hard enforcement.
- Do not deploy to production or mark Phase 5, Phase 6 or Phase 12 complete.

## Exit gate

The slice is complete only when the parser and handler acceptance tests pass, the controlled Worker smoke test proves bidirectional traffic, failure cases prove cleanup/no unauthenticated dial, and the parity matrix records the exact evidence and remaining differences. A green Node CI run alone is not sufficient evidence of Cloudflare socket/runtime behavior.


## Restricted handler prototype — 2026-10-28

The current feature branch adds a Worker route at /proxy/vless (overridable with PROXY_WS_PATH; default /proxy/vless). It authenticates the parsed UUID using the SHA-256 credential lookup, rejects inactive/expired accounts, requires PROXY_ALLOWED_HOSTS and PROXY_ALLOWED_PORTS, blocks obvious private/local destination literals, and opens a Cloudflare TCP socket only after those checks. It relays the initial payload and subsequent binary WebSocket messages to TCP, and TCP bytes back to WebSocket, with a 10-second initial handshake timeout and basic close/error cleanup.

This remains a restricted prototype. Host allowlists do not by themselves prevent DNS rebinding to private addresses; do not use a user-controlled or broad allowlist in production. No quota reservation/accounting, speed or connection limits, robust backpressure policy, DNS/private-network enforcement, D1 runtime test, controlled Worker smoke test, or Nova black-box comparison has been completed. A Node test passing with injected WebSocket/socket adapters is not proof of Cloudflare runtime correctness.


Credential rotation currently returns a one-time secret and is not idempotent. Clients must not automatically retry a rotation request after an ambiguous network failure; a production-safe retry/recovery contract is still needed.


## Quota reservation primitives — 2026-10-28

The feature branch `feat/atomic-quota-reservations` adds migration 0006, stable-ID usage events, conditional reservations, and trigger-driven aggregate settlement. These are not yet wired into the VLESS handler and do not mean hard quota enforcement is active. Exact-head CI and real Cloudflare D1 concurrency/rollback tests are required before integrating or deploying.


## VLESS quota integration branch — 2026-10-28

The active branch `feat/vless-quota-enforcement` connects the reservation/event primitives to the actual VLESS forwarding boundary: reserve each non-empty chunk before sending, then settle measured upload/download bytes. A failed/ambiguous settlement closes the session and leaves the reservation active. `PROXY_USAGE_PRODUCER_ID` must be a stable installation identifier. Exact-head CI and real Cloudflare D1 validation are pending; this is not a deployment approval.


## VLESS quota integration merged — 2026-10-28

Main now reserves every non-empty upload/download chunk before forwarding and settles its measured byte count afterward through the event ledger. Missing `PROXY_USAGE_PRODUCER_ID` fails closed. If settlement is ambiguous after possible forwarding, the session stops and the reservation remains held. This has passing exact-head Node CI, but no real Cloudflare Worker/D1 validation; it is not deployment approval or a Nova parity claim.


## Runtime upgrade investigation — 2026-10-31

A deployed diagnostic Worker ran the current handler module with fake in-memory store/quota adapters and a sentinel DB binding. A real ClientWebSocket upgrade to `/proxy/vless` failed with HTTP 500 `error code: 1101` before any VLESS payload was sent. A separate minimal Worker using the same WebSocketPair/accept/101 pattern completed a real echo on the same account/runtime. The failure is therefore narrowed to the handler upgrade path or its interaction with the runtime, but the exact exception is still unknown (Workers Observability returned no event rows). Both temporary Workers and local test scripts were removed; no D1, TCP destination, or existing staging resource was touched. Phase 6 remains In progress; do not mark the proxy MVP functional until the handler handshake and subsequent bidirectional relay pass the controlled smoke gate.


## Pre-upgrade primitive control — 2026-10-31

A minimal disposable Worker without application imports successfully exercised the same broad pre-upgrade WebSocket primitives used by the handler: WebSocketPair, accept, session-state/closure shape, timer setup/cleanup, and message/close/error listeners. A real ClientWebSocket handshake and binary echo succeeded. This narrows but does not resolve the full handler's 1101 failure. An additional experimental module bundle with an injected HTTP-200 response returned 1101 even for plain HTTP; because that bundle's startup was not independently validated, the result is discarded as inconclusive. Both temporary Workers and local scripts were deleted; existing staging resources were untouched. Next step remains validated module-bundle preflight and stage-by-stage instrumentation before any VLESS payload is sent.


## Diagnostic-wrapper correction — 2026-10-31

The earlier 1101 result was partly misattributed. Workers Logs showed that the disposable wrapper returned the handler's `null` for unmatched root-path probes, causing `Incorrect type for Promise: the Promise did not resolve to 'Response'.` The handler intentionally returns `null` outside its configured route; the wrapper must translate that to a real 404. With that correction, root GET returned 404 and plain HTTP `/proxy/vless` returned 426. One actual-handler ClientWebSocket handshake succeeded with in-memory store/quota and TCP disabled, but subsequent repeats were inconsistent. The synthetic relay attempt did not reach a confirmed handshake. No VLESS authentication/payload, D1, real TCP, quota settlement, session lease or bidirectional relay is yet accepted as passed. All temporary Workers and local scripts were cleaned up; existing staging resources remain untouched. Phase 6 remains In Progress and the data-plane gate remains blocked on repeatable handler handshake and controlled end-to-end relay evidence.
