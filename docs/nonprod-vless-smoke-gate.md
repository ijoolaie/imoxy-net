# Non-production VLESS Worker/D1 smoke gate

**Status:** Partially executed. A Wrangler 4.156.0 remote-preview run passed actual-handler WebSocket handshakes and synthetic relay/slow-reader probes, but did not use Worker-bound D1 or real outbound TCP. A separate direct multipart API-upload attempt failed and was cleaned up. The complete acceptance gate has not passed.

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
- A Wrangler 4.156.0 `wrangler dev --remote` run passed 3/3 actual-handler WebSocket handshakes, 3/3 synthetic in-memory TCP relay sessions with fake store/quota adapters, and a ~6.2-second paused-reader test that received all 4 MiB after resume. This is partial remote-runtime evidence only.
- A separate direct multipart API-upload attempt on 2026-11-02 returned HTTP 500 on `/health` and its external WebSocket client failed before a VLESS handshake. That failure is specific to that upload/harness path and does not negate the independent Wrangler remote-preview result. The disposable resources were deleted and inventory verified.
- No successful VLESS session has yet used a Worker-bound Cloudflare D1 binding or a real Cloudflare outbound TCP destination. No D1 usage settlement/lease lifecycle is proven inside the deployed handler path.
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
- The initial Observability query returned no rows; a later corrected query captured the root-probe wrapper exception `Incorrect type for Promise: the Promise did not resolve to 'Response'`. This explains root-path 1101 but does not establish a repeatable VLESS WebSocket handshake.
- Both temporary Workers were deleted and inventory confirmed that only the pre-existing `imoxy-net-api-staging` and `iran-price-scout` scripts remained. Temporary client scripts were removed. No D1 or existing staging resource was changed.

**Interpretation at the time:** generic Workers WebSocket support was available, but the handler upgrade path had not been isolated. Subsequent Workers Logs review identified a diagnostic-wrapper bug that returned `null` for unmatched root-path requests; this caused the observed root-path 1101 and must not be attributed to the handler. A corrected wrapper returned 404 for `/` and 426 for a plain HTTP request to `/proxy/vless`. One actual-handler ClientWebSocket handshake succeeded, but later repetitions were inconsistent. The full handler handshake is therefore not yet a repeatable pass.


## Additional pre-upgrade primitive control — 2026-10-31

A minimal standalone Worker, without application module imports or D1/TCP bindings, reproduced the handler's basic pre-upgrade primitives: native WebSocketPair creation, `server.accept()`, the handler-shaped session state and closure, a `sessionClosed` Promise, timer setup/cleanup, and message/close/error event listeners. A real ClientWebSocket completed the handshake and echoed a binary payload. The disposable Worker and local script were deleted; inventory confirmed only the two pre-existing account Workers remained.

This narrows the investigation but does not prove the full handler path. A separately packaged experimental copy using an injected HTTP-200 upgrade factory returned 1101 even for plain HTTP; because its module startup was not independently validated, that result is discarded as inconclusive. The next diagnostic must first prove the actual module bundle handles plain HTTP as expected, then instrument each pre-upgrade stage and the 101 response. No VLESS, D1, TCP, quota or relay behavior has passed in the deployed handler runtime.


## Diagnostic-wrapper correction — 2026-10-31

Workers Logs identified that the earlier disposable wrapper returned the VLESS handler's `null` result directly for paths it does not own. Cloudflare workers.dev root probes request `GET /`; the handler returns `null` outside `/proxy/vless`, producing the runtime error `Incorrect type for Promise: the Promise did not resolve to 'Response'.` This explains the root-path HTTP 500/1101 and is a harness bug, not evidence that the VLESS handler throws 1101.

A corrected wrapper now maps unhandled `null` to an explicit 404. Under that wrapper, root GET returned 404 and plain GET `/proxy/vless` returned the expected 426. One real ClientWebSocket handshake against the handler with in-memory store/quota adapters and TCP disabled succeeded, but subsequent repeats were inconsistent and not a passing gate. The synthetic relay attempt did not reach a confirmed handshake. No VLESS payload, D1, TCP, quota settlement, leases or relay are proven. All 14 disposable Workers and five temporary local scripts from this diagnostic pass were deleted; only the two pre-existing Workers remain. Existing staging resources were untouched.

**Next gate:** the direct D1 SQL layer has now been validated separately (see the 2026-11-01 section below). The remaining end-to-end gate requires a controlled TCP destination and explicit authorization for a disposable Worker/runtime test with fixed limits; then bind only the disposable D1 and run the real VLESS handler path.

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

## Optional controlled TCP path through Workers VPC

The repository has a test-only Worker wrapper in `test/vless-vpc-smoke-worker.js` and an isolated example config in `wrangler.vless-smoke.toml.example`. This provides a possible route to exercise the actual VLESS handler against a private TCP Echo Server without exposing that server to the public Internet.

### Architecture and limits

- The disposable Worker uses the production VLESS handler, but injects a fixed resolver and a test-only connector. Only the reserved hostname `probe.imoxy.invalid`, synthetic handler peer `93.184.216.34`, and TCP port `5000` are accepted.
- The connector maps that fixed synthetic peer to one RFC1918 IPv4 target through the `PROXY_VPC` binding. It deliberately substitutes the handler-visible `remoteAddress` with the synthetic public identity. **This bypasses actual private-peer identity verification and is a test seam only**; it must never be imported by `worker.js` or production configuration.
- Workers VPC Network bindings support raw TCP via `connect()`. For a direct binding to a specific Cloudflare Tunnel, Wrangler uses `tunnel_id`; `network_id` is for `cf1:network` or `cf1:vnet:<UUID>`. See the [VPC Networks configuration](https://developers.cloudflare.com/workers-vpc/configuration/vpc-networks/) and [Workers Binding API](https://developers.cloudflare.com/workers-vpc/api/).
- Workers VPC is currently beta and VPC TCP is plaintext. The tunnel connector must be able to route to the chosen private target. Cloudflare documents `cloudflared` 2025.7.0 or later and QUIC/UDP 7844 for this VPC tunnel path; see [Cloudflare Tunnel for Workers VPC](https://developers.cloudflare.com/workers-vpc/configuration/tunnel/).

### Required isolation before running

1. Create a dedicated disposable Cloudflare Tunnel and a dedicated disposable D1 database; do not reuse `imoxy-net-api-staging`, its existing D1, or any unrelated project resource.
2. Run `cloudflared` on the same private network as the TCP Echo Server. Configure a private network route to the server's RFC1918 address and ensure the server listens only on that private interface. Do not expose port 5000 publicly or add a public hostname/ingress.
3. Confirm the tunnel UUID, private target IP, account, and cleanup owner. Use the corrected `tunnel_id` field in `wrangler.vless-smoke.toml.example`; replace only the disposable D1 ID and tunnel UUID.
4. Apply migrations only to the disposable D1, create one staging-only proxy credential through a reviewed path, and use the config's narrow host/port and byte/session limits.
5. Test one baseline and one slow-reading client sequentially. Capture exact bidirectional bytes, quota totals, session lease release, Worker logs, tunnel network logs, and cleanup evidence. Do not run throughput or multi-client stress tests in this gate.
6. Delete the disposable Worker and D1, remove the disposable Tunnel and private route, stop `cloudflared`, and verify exact resource absence.

The VPC harness unit tests validate fixed peer/port/target gating and adapter cleanup only. They do not create Cloudflare resources, prove VPC connectivity, exercise a live Worker, validate the actual private peer address, or establish internal WebSocket buffer bounds. The live VPC smoke gate remains **not executed** until a separately authorized disposable environment and cleanup plan are actually used.


## 2026-11-02 — reconcile Wrangler remote-preview evidence with failed API-upload attempt

A prior Wrangler 4.156.0 `wrangler dev --remote` run successfully executed the actual VLESS handler/module graph on Cloudflare's remote Workers runtime. The recorded evidence is:

- 3/3 real WebSocket handshakes at `/proxy/vless` succeeded.
- 3/3 VLESS sessions using synthetic in-memory TCP and fake store/quota adapters returned the expected two-byte VLESS response `[0,0]` and exact four-byte initial payload.
- A raw TCP WebSocket client paused reads for approximately 6.2 seconds, then resumed and received all 4,194,304 bytes in 256 binary data frames (257 frames including the VLESS response); the session closed normally with `upstream_closed`.

This is partial Cloudflare remote-runtime evidence for the real handler/module graph and synthetic relay. It does **not** include a D1 binding, real Cloudflare outbound TCP, real credential persistence/quota settlement, or real D1 lease lifecycle. The slow-reader observation does not measure or prove Cloudflare-internal WebSocket buffer bounds.

This evidence is distinct from the later one-shot direct multipart API upload attempt (PR #162 workflow run `41452175268`), which failed at the external client's first WebSocket connection and whose uploaded disposable Worker returned HTTP 500 on `/health`. PR #163 corrected its module export shape but did not resolve that API-upload harness failure. Those failures do not invalidate the independently successful Wrangler remote-preview run; neither do they satisfy the full Worker/D1/TCP acceptance gate.

All disposable resources from the API-upload attempt were deleted and their absence verified. Existing staging and Production remain untouched. The next useful gate is to run the actual handler under a Wrangler-native remote preview with a dedicated disposable D1 binding and controlled Worker-to-Worker TCP echo Service Binding, using the existing external Node WebSocket client and the approved limits (10 seconds, 8 MiB, 16 KiB frames, max 2 clients). Do not bypass the safety control that blocked Wrangler remote D1 migration execution; use only an approved D1 provisioning/migration path. Keep the D1 and TCP acceptance claims blocked until the exact Worker-bound results and cleanup are observed.


## 2026-11-02 — manually dispatched Wrangler Service Binding runner prepared

The new workflow .github/workflows/vless-cloudflare-smoke.yml runs only from main after an explicit confirm_disposable_run=true input. It requires the repository secret CLOUDFLARE_API_TOKEN and pins the account ID in code. The script checks for exact-name collisions, provisions a run-unique EU D1 through the Cloudflare API, applies migrations 0001–0008 through the D1 query API, seeds one hash-only test credential, deploys the internal Echo Worker through Wrangler, and starts the actual VLESS handler in Wrangler remote preview with D1 and a Service Binding.

The two-client smoke is bounded by the existing client timeout (8.5 seconds), handler session lifetime (10 seconds), account quota (8 MiB), 16 KiB frames, and two concurrent sessions. Acceptance requires exact upload/download totals, request count, fully settled reservation bytes, no active/released reservations, and no active session leases. Cleanup deletes only the unique Worker names and D1 created for that run and verifies their absence.

**Current status: first execution attempted; acceptance failed at the external VLESS client.** Run 41469175764 provisioned and migrated disposable D1, deployed the echo Worker, and verified cleanup, but the first client timed out before handshake/echo and D1 settlement assertions. The corrective change is under PR #169; after it merges, run a fresh manually confirmed workflow and inspect diagnostics. If cleanup verification fails, stop and inspect account inventory before any retry. Existing staging and Production remain out of scope.

## 2026-11-02 — first Wrangler + D1 + Service Binding run

GitHub Actions run [41469175764](https://github.com/ijoolaie/imoxy-net/actions/runs/41469175764) created a uniquely named disposable EU D1 database, applied migrations 0001–0008 through the D1 API, deployed the internal-only TCP Echo Worker, and attempted the actual VLESS handler through Wrangler remote preview. The external Node client timed out in session 1 after 8.5 seconds before reporting a successful VLESS handshake/echo. The workflow then deleted the run-owned Worker and D1 and verified their absence. No successful Worker-bound usage settlement or session lease lifecycle was observed.

The connector is being corrected to await the Service Binding `connect()` result and to test a promise-returning binding. The smoke runner also captures the remote-preview logs and reports client state on timeout. The next runtime attempt must wait for exact-head CI and must again use only fresh run-scoped resources. Do not reuse this failed run's resource names or infer a pass from successful provisioning/cleanup.
