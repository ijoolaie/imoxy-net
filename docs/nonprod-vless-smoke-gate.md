# Non-production VLESS Worker/D1 smoke gate

**Status:** Prepared; not executed. This document is a runbook, not evidence of a successful deployment or test.

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
   - Inspect aggregate usage and reservation records before and after each test. Document any ambiguity/retry behavior; do not claim exactly-once accounting without a stable producer event ID and integration evidence.

7. **Cleanup and sign-off**
   - Revoke/delete test credentials and sessions, remove test data, and clean up temporary resources only under the approved cleanup plan.
   - Preserve redacted logs and a pass/fail matrix.
   - Stop release progression on any unexplained socket peer, byte-count, quota, persistence, or secret-handling discrepancy.

## Acceptance criteria

The gate passes only when all applicable steps are executed in the actual non-production Cloudflare Worker and D1 environment, evidence is attached to the run record, and all failures are explained or fixed. Unit tests/CI alone do not pass this gate. A pass does not establish Nova parity; that additionally requires the pinned Nova reference and repeatable black-box scenarios.

## Current blockers

- No verified dedicated non-production Worker/D1 environment or authorization to provision/use one is recorded.
- The repository has a template rather than an active Wrangler configuration with a D1 binding.
- No deployed Worker/D1 smoke run, DNS-rebinding end-to-end test, or Nova runtime comparison has been performed.
- IPv4/IPv6 fallback semantics, the completeness of special-purpose address filtering, relay backpressure and hard quota enforcement still need independent review.


## Live Cloudflare observation — 2026-10-30 (not a passing smoke test)

A read-only inspection of the account's Worker named `imoxy-net-api-staging` found a D1 binding named `IDENTITY_DB` pointing to `imoxy-net-staging-identity` (`fdf810ea-e96c-4d1f-b7af-aac6e2b746c6`). The database already contains nonzero identity/session/audit records; do not reset it or use it as a disposable test database.

The Worker has Workers.dev enabled and no custom domain or matching zone route was found in the visible account inventory. Its latest observed deployment/version was created on 2026-10-23 and Wrangler reports source `Unknown (version_upload)`.

A public, unauthenticated GET to the Worker hostname returned:
- `GET /health`: HTTP 200 with stage `bootstrap`.
- `GET /api/v1/capabilities`, `/api/v1/accounts`, and `/api/v1/auth/me`: HTTP 501 `not_implemented`.

This differs from the current repository's Worker/API implementation. Treat it as deployment drift; the exact deployed source revision has not been proven. No deployment, resource mutation, route/DNS change, D1 write, or secret read was performed.

**Decision:** This target is not accepted for the VLESS/D1 smoke gate. Do not deploy to it, alter its bindings, run migrations, or use its existing D1 data for test mutations until the owner-approved isolation/production-separation and cleanup checks identify the exact disposable target. The gate remains not executed.
