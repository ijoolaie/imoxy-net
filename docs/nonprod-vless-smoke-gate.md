# Non-production VLESS Worker/D1 smoke gate

**Status:** Partially executed; the 2026-10-31 VLESS handler upgrade attempt failed with Cloudflare 1101. The complete acceptance gate has not passed.

## Why this gate exists

Node tests exercise the VLESS handler with injected socket, resolver, WebSocket, store and quota adapters. They do not prove that Cloudflare Workers supports the exact outbound DNS-over-HTTPS + `cloudflare:sockets` path, that D1 migrations and bindings are correct in a deployed Worker, or that traffic/accounting behaves correctly in the target runtime.

The repository currently has `wrangler.toml.example`, not an active `wrangler.toml`; its D1 binding is deliberately commented out. No environment should be inferred to exist from that template.

## Safety preconditions

Do not run this against production or create/alter Cloudflare resources until an owner explicitly authorizes a dedicated disposable staging account/database and a rollback/cleanup plan.

Before any deployment, an operator must:
- Create or identify a **dedicated non-production** Worker and D1 database.
- Confirm the account, database, Worker name, zone/route and token scopes are staging-only.
- Use least-privilege credentials in the operator's local secret store; never paste tokens into chat, files, CI logs, or commit history.
- Review migrations and record the exact starting database state.
- Set a destination allowlist to a test-controlled public endpoint and a narrow port; do not allow arbitrary hosts or ports.
- Define cleanup steps and who is authorized to execute them.

## Test sequence and evidence to capture

Record timestamp, Worker deployment version/commit, Wrangler version, D1 database identifier (redacted/alias only), migration versions, test client/version, destination, expected/observed results and logs with secrets removed.

1. **Static/runtime preflight**
   - Confirm the Worker starts with the intended environment bindings and serves `/health`.
   - Confirm the configured VLESS path and destination host/port allowlist are present.
   - Confirm positive safe-integer PROXY_MAX_DOWNLOAD_BYTES, PROXY_MAX_SESSION_DURATION_MS, PROXY_MAX_CONCURRENT_SESSIONS, and PROXY_SESSION_LEASE_GRACE_MS settings are present; missing/invalid values must fail closed before WebSocket allocation.
   - Confirm a missing D1 binding or missing usage-producer identity fails closed; do not use a production credential to make the test pass.

2. **D1 migrations and persistence**
   - Apply migrations only to the disposable D1 database using the reviewed procedure.
   - Verify expected tables/triggers exist and basic read/write/rollback behavior matches the migration contract.
   - Create a staging account/credential through the supported management path, then verify the credential lookup works without exposing raw credential material.
   - Capture migration output and query results with IDs redacted. A local SQLite test is not a substitute for this step.

3. **WebSocket handshake and authentication**
   - A valid WebSocket upgrade with a valid staging credential reaches the handler.
   - Invalid/missing credentials, unsupported method, non-upgrade request, inactive/expired account and unconfigured policy are rejected without opening an outbound socket. A non-matching path must not invoke the VLESS handler or dial an outbound socket.
   - Confirm no raw token or credential is logged.

4. **DNS resolution and TCP peer pinning**
   - Use a controlled public hostname with known A/AAAA answers and an allowed port.
   - Confirm the handler dials a numeric address and the socket's reported `remoteAddress` matches the selected numeric address.
   - Verify a private-only/no-answer hostname and a resolver failure fail closed.
   - Exercise a deterministic peer mismatch in unit tests; do not attempt rebinding against third-party infrastructure.
   - Record actual runtime support for DoH `fetch`, `redirect: "error"`, and `cloudflare:sockets`; any incompatibility is a blocker, not a reason to bypass validation.

5. **Bidirectional relay and lifecycle**
   - Send a small known byte sequence from client to controlled test endpoint and verify exact bytes.
   - Send a known response back and verify exact bytes at the client.
   - Verify initial VLESS response framing, clean close, idle timeout, handshake timeout, malformed input, text frame rejection and bounded queue behavior.
   - Do not run throughput or stress tests until explicit rate, concurrency and cost limits are approved.

6. **Quota/accounting consistency**
   - Confirm reservation happens before upload bytes are forwarded.
   - Confirm upload/download byte counts match the controlled payload and are settled/released exactly as the implementation contract expects.
   - Test quota denial and D1/provider failure; verify denied bytes are not forwarded and failed accounting does not silently become an accepted session.
   - Race concurrent session admissions for the final per-account and installation-wide slot; verify the D1 lease table never over-admits, capacity denial happens before TCP dial, close releases once, and stale leases expire conservatively.
   - Inspect aggregate usage and reservation records before and after each test. Document any ambiguity/retry behavior; do not claim exactly-once accounting without a stable producer event ID and integration evidence.

7. **Cleanup and sign-off**
   - Revoke/delete test credentials and sessions, remove test data, and clean up temporary resources only under the approved cleanup plan.
   - Preserve redacted logs and a pass/fail matrix.
   - Stop release progression on any unexplained socket peer, byte-count, quota, persistence, or secret-handling discrepancy.

## Acceptance criteria

The gate passes only when all applicable steps are executed in the actual non-production Cloudflare Worker and D1 environment, evidence is attached to the run record, and all failures are explained or fixed. Unit tests/CI alone do not pass this gate. A pass does not establish Nova parity; that additionally requires the pinned Nova reference and repeatable black-box scenarios.

## Current blockers

- No persistent dedicated non-production Worker/D1 environment is configured. Disposable D1 and Worker resources have been provisioned for bounded tests and deleted after each run.
- The D1Store wrapper and session-lease concurrency behavior have separate disposable-D1 evidence (see HANDOFF.md); those tests do not prove the complete VLESS handler path.
- The current VLESS handler's WebSocket upgrade failed with HTTP 500 `1101` on 2026-10-31 even with fake store/quota adapters. No VLESS payload, DNS/TCP, quota settlement, or relay test has passed in the actual Worker runtime.
- No controlled TCP destination has yet been used for a successful end-to-end VLESS relay, and no Nova runtime comparison has been performed.
- IPv4/IPv6 fallback semantics, the completeness of special-purpose address filtering, downstream runtime-buffer boundedness, and actual D1 lease behavior under the deployed VLESS handler still need independent review.


## Live Cloudflare observation — 2026-10-30 (not a passing smoke test)

A read-only inspection of the account's Worker named `imoxy-net-api-staging` found a D1 binding named `IDENTITY_DB` pointing to `imoxy-net-staging-identity` (`fdf810ea-e96c-4d1f-b7af-aac6e2b746c6`). The database already contains nonzero identity/session/audit records; do not reset it or use it as a disposable test database.

The Worker has Workers.dev enabled and no custom domain or matching zone route was found in the visible account inventory. Its latest observed deployment/version was created on 2026-10-23 and Wrangler reports source `Unknown (version_upload)`.

A public, unauthenticated GET to the Worker hostname returned:
- `GET /health`: HTTP 200 with stage `bootstrap`.
- `GET /api/v1/capabilities`, `/api/v1/accounts`, and `/api/v1/auth/me`: HTTP 501 `not_implemented`.

This differs from the current repository's Worker/API implementation. Treat it as deployment drift; the exact deployed source revision has not been proven. No deployment, resource mutation, route/DNS change, D1 write, or secret read was performed.

**Decision:** This target is not accepted for the VLESS/D1 smoke gate. Do not deploy to it, alter its bindings, run migrations, or use its existing D1 data for test mutations until the owner-approved isolation/production-separation and cleanup checks identify the exact disposable target. The gate remains not executed.


## Cloudflare target inventory — 2026-10-30 (read-only; no target accepted)

Read-only account inventory found:
- Worker script `imoxy-net-api-staging`, tagged as the imoxy staging service.
- Its `IDENTITY_DB` binding points to D1 database `imoxy-net-staging-identity`; Cloudflare reports 11 tables. This is the existing bootstrap staging database and is not disposable.
- No separate imoxy test Worker or test D1 binding was found in the listed resources.
- Other D1 databases exist for separately named resources (`iran-price-scout-db` and `ivory-tide-05e8-db`). There is no evidence that either is disposable or authorized for imoxy tests; do not use them.

**Decision at inventory time:** No accepted VLESS end-to-end target was available in the read-only inventory. Subsequent disposable test resources were created only for bounded isolated diagnostics and were deleted after use. Existing staging resources remain untouched. Each future test must continue to provision its own isolated Worker/D1 and cleanup plan; do not reuse the bootstrap staging Worker/database.


## VLESS handler upgrade diagnostic — 2026-10-31 (failed; isolated)

A current-source diagnostic was executed against a newly created standalone Worker. The production handler module and its local import graph were uploaded; store and quota services were injected as in-memory stubs, and the required DB environment variable was only a sentinel. No D1 database or outbound TCP target was used.

- A real .NET ClientWebSocket upgrade to `/proxy/vless` returned HTTP 500 `error code: 1101` before the handshake completed.
- A separate minimal Worker using the same native WebSocketPair/accept/101-response pattern completed a WebSocket connection and echo on the same account/runtime.
- No VLESS payload was sent. Authentication, DNS, TCP, quota, leases, relay, slow-reader behavior and settlement were not exercised.
- Observability query returned no event rows; the exact exception remains unknown.
- Both temporary Workers were deleted and inventory confirmed that only the pre-existing `imoxy-net-api-staging` and `iran-price-scout` scripts remained. Temporary client scripts were removed. No D1 or existing staging resource was changed.

**Interpretation at the time:** generic Workers WebSocket support was available, but the handler upgrade path had not been isolated. Subsequent Workers Logs review identified a diagnostic-wrapper bug that returned `null` for unmatched root-path requests; this caused the observed root-path 1101 and must not be attributed to the handler. A corrected wrapper returned 404 for `/` and 426 for a plain HTTP request to `/proxy/vless`. One actual-handler ClientWebSocket handshake succeeded, but later repetitions were inconsistent. The full handler handshake is therefore not yet a repeatable pass.


## Additional pre-upgrade primitive control — 2026-10-31

A minimal standalone Worker, without application module imports or D1/TCP bindings, reproduced the handler's basic pre-upgrade primitives: native WebSocketPair creation, `server.accept()`, the handler-shaped session state and closure, a `sessionClosed` Promise, timer setup/cleanup, and message/close/error event listeners. A real ClientWebSocket completed the handshake and echoed a binary payload. The disposable Worker and local script were deleted; inventory confirmed only the two pre-existing account Workers remained.

This narrows the investigation but does not prove the full handler path. A separately packaged experimental copy using an injected HTTP-200 upgrade factory returned 1101 even for plain HTTP; because its module startup was not independently validated, that result is discarded as inconclusive. The next diagnostic must first prove the actual module bundle handles plain HTTP as expected, then instrument each pre-upgrade stage and the 101 response. No VLESS, D1, TCP, quota or relay behavior has passed in the deployed handler runtime.


## Diagnostic-wrapper correction — 2026-10-31

Workers Logs identified that the earlier disposable wrapper returned the VLESS handler's `null` result directly for paths it does not own. Cloudflare workers.dev root probes request `GET /`; the handler returns `null` outside `/proxy/vless`, producing the runtime error `Incorrect type for Promise: the Promise did not resolve to 'Response'.` This explains the root-path HTTP 500/1101 and is a harness bug, not evidence that the VLESS handler throws 1101.

A corrected wrapper now maps unhandled `null` to an explicit 404. Under that wrapper, root GET returned 404 and plain GET `/proxy/vless` returned the expected 426. One real ClientWebSocket handshake against the handler with in-memory store/quota adapters and TCP disabled succeeded, but subsequent repeats were inconsistent and not a passing gate. The synthetic relay attempt did not reach a confirmed handshake. No VLESS payload, D1, TCP, quota settlement, leases or relay are proven. All 14 disposable Workers and five temporary local scripts from this diagnostic pass were deleted; only the two pre-existing Workers remain. Existing staging resources were untouched.

**Next gate:** repeat the handler handshake using the corrected wrapper, then send one synthetic VLESS request through fake adapters. Only after those are repeatable should the isolated D1 and controlled TCP acceptance sequence begin.
