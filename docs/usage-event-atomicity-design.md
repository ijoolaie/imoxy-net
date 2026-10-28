# Usage event identity, idempotency, and quota reservation design

**Status:** First schema/storage/domain slice implemented on `feat/atomic-quota-reservations`; not yet wired into the proxy handler or validated on Cloudflare D1  
**Date:** 2026-10-28  
**Scope:** Phase 5 accounting correctness and prerequisites for future proxy/data-plane enforcement

## Problem statement

The current `createQuotaService().record()` path accepts byte deltas without an event identity and calls `recordUsage()`, which adds the deltas to an account/day aggregate. A retried delivery therefore counts twice. `evaluate()` reads current totals but does not reserve capacity, so two concurrent requests can both observe remaining quota and both proceed. Existing safe-integer guards prevent selected arithmetic overflow; they do not solve either problem.

Never derive event identity from account ID, date, upload/download totals, or request count: distinct legitimate events can share those values.

## Required identity contract

The future trusted proxy/data-plane reporter must provide a stable, opaque `usageEventId` for one immutable measurement event. It must be generated at the event source before delivery/retry and remain unchanged across every retry.

- Validate non-empty bounded identifier syntax and length at the API/domain boundary.
- Scope uniqueness to the event producer/installation (for example, a composite producer ID + event ID) unless a globally unique namespace is explicitly guaranteed.
- Bind an ID to immutable canonical content: account ID, event timestamp/day, upload bytes, download bytes, request count, and producer identity/version.
- If an existing ID arrives with identical canonical content, return the recorded outcome without adding usage again.
- If an existing ID arrives with different content, reject it as an idempotency conflict; never overwrite the first event.
- A report without an event ID is not eligible for the future idempotent write path. Do not silently mint an ID at the receiving API, because a retried request would get a new one.
- Do not accept arbitrary client-side usage reports as authoritative. The event source must be authenticated and authorized.

## Data model direction (not yet a migration)

Add an append-only `usage_events` ledger with at least:

- `producer_id`, `event_id` (unique together);
- `account_id`, event time, derived UTC accounting date;
- upload/download byte deltas and request count;
- canonical payload hash or equivalent immutable-field comparison;
- outcome/status and creation timestamp.

Add an index for account/date aggregation or reconciliation. Keep raw identifiers opaque and avoid storing credentials or unnecessary network metadata. Retention and deletion policy must be decided before production use. A duplicate event must not create a second ledger row or increment aggregates.

The existing `usage_daily` table can remain a materialized aggregate, but the event ledger becomes the source for replay detection and reconciliation. Define a rebuild/reconciliation procedure before relying on aggregate correctness.

## Atomicity contract

A successful event write must make the ledger record and daily aggregate visible together, exactly once. A failed write must leave neither a newly accepted event nor a partial aggregate increment.

1. In one D1 batch, insert a unique event row in a non-final `claimed` state using `ON CONFLICT DO NOTHING`; the event key and immutable payload are checked before any counter change.
2. The aggregate-update statement must be conditioned on this newly claimed row still being in `claimed` state. A previously completed duplicate is already `applied`, so it must not satisfy the condition and cannot increment counters again.
3. Mark the row `applied` only after the guarded aggregate mutation succeeds. Because the statements run in one atomic batch, an error or failed guard must roll back both the event claim and aggregate mutation. Verify the exact D1 result/rollback semantics in the disposable integration suite.
4. On a duplicate key, compare immutable payload fields/hash: identical content returns the stored outcome without changing counters; different content is an idempotency conflict. Do not let a duplicate's existing `applied` row re-trigger aggregation.
5. Validate per-event deltas, combined bytes, resulting daily counters, and supported lifetime totals before accepting the event. All overflow paths fail closed.
6. Treat storage errors or ambiguous outcomes as retryable only with the same stable event ID. Never retry with a new ID.
7. Keep quota reservation as a separate atomic state machine; do not accept a report in a way that bypasses the reservation/forwarding contract. If accounting observed-but-denied traffic is needed, model it explicitly rather than conflating it with accepted usage.

### D1 implementation constraint

Cloudflare's current D1 Worker API documents `db.batch([...])` as sequential batched SQL transactions that roll back the sequence if a statement fails. It does not support a normal interactive `BEGIN` transaction spanning arbitrary Worker-side logic. Design the operation as database-side conditional statements and a single `batch()`, with SQL predicates preventing aggregate updates when the event claim did not succeed. Do not infer correctness from a mock alone: test rollback, uniqueness races, `meta.changes`/RETURNING behavior, and trigger compatibility on a disposable real D1 database before calling this verified.

Reference: [Cloudflare D1 Database API — batch()](https://developers.cloudflare.com/d1/worker-api/d1-database/).

## Atomic quota reservation is a separate contract

Event deduplication alone does not prevent over-quota forwarding. The future data plane must reserve the requested/estimated allowance before forwarding, or use an equivalent serialization mechanism. Reservation must atomically check account status/expiry, total remaining quota, daily remaining quota, and safe-integer bounds before incrementing reserved counters. Completion reconciles reservation with measured bytes; failures release unused reservation idempotently. A reservation ID must itself be stable across retries.

Do not add a read-then-write `evaluate()` call and describe it as a reservation. The current `evaluate()` is a read-only policy check, and `record()` is additive reporting, not hard enforcement.

Open design decisions before implementation:

- Maximum reservation size and how protocols account for control/overhead bytes.
- Lease/expiry and recovery of abandoned reservations.
- Whether total quota includes observed, reserved, or only finalized bytes.
- Handling of late events that arrive after reservation release or across UTC-day boundaries.
- Corrections/reversals and immutable audit/reconciliation semantics.
- Whether a stored idempotency response must be byte-for-byte stable across software versions.

## Required tests before implementation is accepted

### Domain/contract tests

- Missing, malformed, oversized, and unauthorized event IDs fail before storage.
- Same key + same payload replay is a no-op and returns the same outcome.
- Same key + changed account/date/deltas/request count is a conflict and leaves state unchanged.
- Two different event IDs with identical payload values both count (proves no derived-key collision).
- Overflow in upload + download, daily counters, lifetime counters, and request count fails closed.
- Storage error and retry after an ambiguous response with the same ID never double-count.
- Reservation duplicate/retry, insufficient quota, expiry/disabled account, boundary equality, concurrent claims, completion, release, and stale-reservation recovery are covered.

### Real D1 integration gate

Use an isolated disposable D1 database, not production. Apply all migrations from a clean database and test:

- supported trigger/migration syntax;
- batch rollback when a later statement fails;
- duplicate event ID under concurrent submissions;
- exactly one aggregate increment for matching replays;
- conflict on mismatched payload;
- concurrent quota reservations at the same boundary;
- safe-integer boundary and trigger behavior;
- backup/restore and reconciliation from the ledger.

Record database/runtime details, test commands, outcomes, and commit SHA. SQLite unit tests remain useful but are not evidence of D1-specific semantics.

## Current status and implementation boundary

- Implemented: per-daily-row safe-integer guards and a fail-closed lifetime aggregate overflow preflight.
- Not implemented: stable event identity, event ledger, replay deduplication, atomic reservations, proxy/data-plane integration.
- Not verified: real Cloudflare D1 transaction/trigger/concurrency behavior, Nova Proxy runtime parity, or production enforcement.
- Release implication: Phase 5 remains in progress; Phase 12 remains blocked.


## Producer boundary update — 2026-10-28

The restricted VLESS-over-WebSocket handler now identifies the trusted measurement boundary, but does not yet persist usage or enforce quotas. Candidate producer identity is a stable per-installation identifier; each connection gets a random connection ID before any forwarding, and each direction uses a monotonically increasing sequence to form an event ID. The event payload must bind account, UTC date, direction/byte delta, sequence, and connection/producer identity. Retries within the session must reuse the same event ID and immutable payload; never mint a new ID for a retry.

For accounting, upload bytes are observable after the client-to-TCP writer accepts a binary chunk; download bytes are observable when the Worker successfully hands a TCP chunk to the WebSocket send path. The exact counting point and control/response bytes must still be characterized against the pinned Nova runtime. These are candidate boundaries, not yet verified parity semantics.

Quota reservations must be created/extended atomically before forwarding each chunk. A successful forwarding chunk then consumes its reservation and records the idempotent event. If the event write has an ambiguous result, retry the same event ID. If the Worker dies after forwarding but before the event is committed, keep the reservation fail-closed until a reconciliation/recovery process can safely resolve it; do not expire/release such reservations blindly and allow over-quota traffic. Per-day reservation identity must handle UTC day rollover. No event ledger or reservation is implemented yet.


## Implementation checkpoint — 2026-10-28

Migration 0006 adds `quota_reservations` and `usage_events`. The D1 adapter now has an atomic conditional reservation insert, a stable-ID event settlement path, and a release operation for reservations that are known not to have forwarded any bytes. The domain service requires caller-supplied reservation/event IDs, derives a canonical SHA-256 payload hash, and preserves the reservation's original UTC usage date across midnight.

A SQLite trigger transitions a newly claimed event to applied, updates `usage_daily`, and settles its reservation as part of the same SQL statement/transaction. Replays with the same producer/event key cannot re-apply an already-applied row; mismatched immutable payloads return a conflict. Safe-integer aggregate failures abort the statement.

Important limits:
- This is not yet connected to `src/proxy/vless-websocket-handler.js`; no hard quota enforcement claim is valid until the handler reserves before each forward and settles measured bytes afterward.
- Lease expiry is advisory metadata only. Never automatically release an expired reservation: a Worker may have forwarded bytes before dying. Recovery must reconcile the event/forwarding outcome or retain the reservation fail-closed.
- `releaseQuotaReservation` is only safe when the caller knows no bytes were forwarded.
- SQLite migration/trigger tests and mocked D1 adapter tests do not prove D1 batch/trigger semantics. Run a controlled real D1 concurrency, rollback, replay and trigger smoke test before enabling the feature.
- The producer identity must be trusted and stable for retries; never expose this service as an arbitrary client-supplied usage-report endpoint.
