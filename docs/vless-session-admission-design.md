# VLESS session admission and concurrency design

**Status:** First implementation merged; exact-head CI and SQLite-backed actual-SQL tests pass; live D1/Worker validation and Nova parity remain pending  
**Date:** 2026-10-30  
**Related:** [Issue #106](https://github.com/ijoolaie/imoxy-net/issues/106), [Issue #78](https://github.com/ijoolaie/imoxy-net/issues/78)

## Finding

The account schema and D1 adapter persist and return `proxy_accounts.max_connections`, but `src/proxy/vless-websocket-handler.js` does not read that field or enforce a concurrent-session limit. The handler's `state` object is allocated per request. A module-level `Map` would be isolate-local, would disappear on eviction/restart, and cannot coordinate all Worker instances. It is not an acceptable admission authority.

The recently merged `PROXY_MAX_DOWNLOAD_BYTES` and `PROXY_MAX_SESSION_DURATION_MS` values bound a single session's cumulative downstream bytes and lifetime. They do not bound the number of simultaneous sessions or total aggregate resources.

## Semantics to preserve

- `max_connections = NULL`: no per-account ceiling is configured.
- `max_connections = 0`: the current imoxy implementation fails closed and denies new sessions. The pinned Nova 5.0.0 interpretation has not been established; this is not a parity claim.
- Positive `max_connections`: admit only while the number of unexpired sessions for that account is below the configured value.
- `PROXY_MAX_CONCURRENT_SESSIONS`: mandatory positive installation-wide ceiling. This is separate from the account setting and is required to bound aggregate admitted sessions across all accounts.
- A lowered account ceiling affects new admissions; it does not evict already admitted sessions.
- Capacity denial and ambiguous admission outcomes fail closed before any upstream TCP connection is opened.

No numeric production value is selected here. The installation-wide value must be chosen from measured capacity and approved environment-specific limits before VLESS is enabled.

## Implemented first slice: D1-backed leases

The existing D1 database is the admission authority. Migration `0007_proxy_active_sessions.sql` adds the lease table; `createD1Store().acquireProxySession()` uses a **single conditional SQL write statement** for admission. There is no separate read-then-insert capacity check.

The statement must perform an `INSERT INTO ... SELECT` from the matching active, non-expired account and include both predicates in that same statement:

1. Account active-session count, considering only leases whose `expires_at` is later than the admission timestamp, is below `max_connections` when that value is not NULL.
2. Installation-wide unexpired lease count is below `PROXY_MAX_CONCURRENT_SESSIONS`.

A unique opaque `session_id` is the primary key. The Worker generates it once before admission. An identical retry must reuse the same ID; it must never mint a second ID to resolve an uncertain write. A zero-row result means no admission unless a lookup by the same ID proves that the original admission already succeeded for the same account. A mismatched existing ID is a conflict.

Cloudflare's D1 documentation states that write queries are forwarded to the primary database instance; read replicas are read-only. Keeping the count predicates and insert in one SQL write statement avoids a stale preflight read. SQLite statement atomicity is the basis of this design, but the actual D1 concurrency race remains a required disposable-D1 test. Do not claim the guarantee proven from a mock or local SQLite alone.

References:
- [D1 read replication and primary/write behavior](https://developers.cloudflare.com/d1/best-practices/read-replication/)
- [D1 Database API — batch transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [SQLite transaction semantics](https://www.sqlite.org/lang_transaction.html)

### Lease lifecycle

1. Authenticate the proxy credential and validate account status/expiry.
2. Resolve and validate the destination as the current handler already does.
3. Generate one session ID and acquire the D1 lease **before** opening the upstream TCP socket.
4. If admission is denied, conflicted, or ambiguous, close the WebSocket and do not dial upstream.
5. Record lease expiry after the maximum-session deadline plus a documented cleanup grace. The current handler's initial handshake timer also covers DNS/TCP setup before the authenticated lifetime timer starts, so the lease TTL must include the bounded pre-session setup window as well as the maximum authenticated lifetime and grace. Align the timer start and lease deadline explicitly in implementation/tests; never let a lease expire while its socket may still be active. The grace prevents delayed timer callbacks from allowing a second session while the first may still be alive. It may temporarily over-count after a crash; this is intentionally fail-closed.
6. Release the lease idempotently on every close path: client close/error, upstream close/error, idle timeout, maximum lifetime, quota denial, send/write failure, and setup failure after admission.
7. If release fails or the Worker is terminated, the lease remains counted until its expiry. Never delete an uncertain lease early.
8. Expired leases are excluded from admission counts immediately. Delete old rows with bounded opportunistic or scheduled cleanup; cleanup must not be part of the correctness predicate.

The handler now guards release with a one-shot state transition so repeated close/error callbacks cannot release a different lease or cause incorrect accounting. The lease deadline must include the handler's bounded pre-session setup/handshake window; otherwise a slow DNS/TCP setup could outlive the lease before the authenticated lifetime timer starts.

### Failure and retry rules

- D1 unavailable before admission: fail closed; no upstream socket.
- Admission write returns an ambiguous error: do not dial and do not retry under a new ID. If resolving the outcome, query only the same session ID/account; otherwise let the lease expire.
- Release error: close local/upstream resources anyway; leave the lease to expire.
- Duplicate session ID with identical account/lease identity: idempotent success only if the stored lease is still active and unexpired.
- Duplicate session ID with different account or identity: conflict and fail closed.
- Account disabled/expired before admission: deny even if capacity is available.
- Account cap changed after admission: existing session continues; new admissions use the current cap.

## Why not a Worker-global Map

Worker globals are not durable, not shared across isolates, and not an atomic coordination mechanism. They can be used only as a cache/optimization, never as the source of truth for an admission decision.

## Why not introduce a Durable Object immediately

Durable Objects provide per-object strongly consistent transactional storage and are suitable for coordination around a logical entity. If D1's real concurrency test or measured admission latency fails the requirement, a per-account Durable Object (stable ID derived from account ID) is the fallback. It must not be a single global singleton. A DO used only as an admission coordinator would not own the VLESS WebSocket or outbound TCP stream; that avoids coupling session transport to DO WebSocket hibernation.

The current repository has no Durable Object binding or migration. Adding one before testing the existing D1 primary path would add deployment/configuration and operational complexity without evidence that it is needed.

Reference: [Cloudflare Durable Objects — concepts](https://developers.cloudflare.com/durable-objects/concepts/what-are-durable-objects/).

## Implemented schema — migration 0007

Migration `0007_proxy_active_sessions.sql` adds the following table and indexes:

```sql
CREATE TABLE proxy_active_sessions (
  session_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES proxy_accounts(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX proxy_active_sessions_account_expiry
  ON proxy_active_sessions(account_id, expires_at);
CREATE INDEX proxy_active_sessions_expiry
  ON proxy_active_sessions(expires_at);
```

The exact migration must include identifier/date constraints consistent with the existing schema conventions. Account deletion must not silently remove an active lease while its TCP/WebSocket session may still be forwarding. Use a restrictive foreign key (or an equivalent explicit guard) so account deletion fails while any lease row exists; remove expired rows first with bounded cleanup. This intentionally prefers a temporary deletion block over freeing capacity while a session may remain alive. A global index is not required for a count predicate unless measurement shows it helps; avoid premature schema complexity.

## Test matrix

### Storage / SQL

- Exact account cap admits the final available slot; the next attempt is denied.
- Installation-wide cap denies the next session even when its account has no per-account cap.
- Two or more concurrent admissions racing for the last slot never over-admit.
- NULL account cap, zero account cap, positive cap, disabled account, and expired account.
- Duplicate same session ID and account is idempotent; same ID with a different account is a conflict.
- Release is idempotent and scoped to both session and account.
- Expired lease does not count; cleanup removes expired rows without changing admission behavior.
- Account deletion is rejected while a live lease exists; expired rows are cleaned before deletion. No cascade may free a slot while the old session can still forward.
- Every SQL input is bound; no user-supplied identifier is interpolated into SQL.

### Handler lifecycle

- Admission occurs before `connectTcp`; denied or ambiguous admission never dials.
- Successful admission is released on normal close, client close/error, upstream close/error, handshake/setup failure after acquisition, idle timeout, session lifetime, quota denial, download budget termination, upload/downstream send failure, and settlement failure.
- Multiple close/error events release once.
- Release failure does not prevent local WebSocket/TCP cleanup and does not free the lease early.
- Admission error cannot be retried with a fresh session ID.

### Runtime gate

- Run the concurrent last-slot race and lifecycle checks against an explicitly disposable Cloudflare D1 database.
- Run a controlled Worker smoke test only after the Worker and D1 target are independently proven disposable and isolated.
- Capture actual D1 results, migration version, Worker commit/version, and cleanup proof.
- Keep the bootstrap staging Worker and its non-empty D1 untouched.
- Compare `max_connections` behavior with the pinned Nova Proxy 5.0.0 runtime before marking any parity row verified.

## Explicit non-goals

- This design bounds admitted VLESS session count; it does not measure the Worker-internal WebSocket send buffer.
- It does not set a per-account speed cap or prove throughput shaping.
- It does not establish Nova compatibility.
- It does not authorize deployment, Cloudflare resource creation, D1 mutation, route/DNS changes, or production configuration.


## Implementation checkpoint — PR #108

- Merged to main: `8bc11df4aa6c5a8ae77d28a3b77312c35c33b8b9`.
- Exact PR-head CI: run `41040392148`, success. Push CI on the same head: run `41040222126`, success. Post-merge main CI: run `41040478912`, success.
- Added migration 0007, D1 acquire/release/cleanup methods, and VLESS handler admission before TCP dial.
- Added SQLite-backed tests against the actual D1 adapter SQL for per-account and installation-wide caps, last-slot races, duplicate/conflict behavior, disabled/expired accounts, stale lease cleanup, idempotent release, and restrictive account deletion.
- Added handler tests for admission-before-dial, denial/ambiguous failure, upstream setup failure, normal close, session lifetime, quota/download termination, and release failure.
- Live Cloudflare D1 concurrency behavior, deployed Worker lifecycle, lease grace adequacy, and cleanup after isolate termination remain unverified. Do not enable this in a deployed environment until the dedicated disposable D1/Worker gate passes.
- `PROXY_MAX_CONCURRENT_SESSIONS` and `PROXY_SESSION_LEASE_GRACE_MS` are required but have not been set in Cloudflare.
- The current zero-cap behavior is deliberately fail-closed; Nova 5.0.0 semantics for `max_connections = 0` remain an open reference question.
