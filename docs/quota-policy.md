# Quota and usage policy — initial imoxy baseline

**Compatibility status:** This is a proposed implementation baseline. The pinned Nova runtime's exact quota boundaries, reset timezone, disabled/expired account behavior, and accounting semantics have not yet been observed.

## Rules implemented in the domain service

- An account must be active and not expired at the evaluation timestamp.
- Expiry is treated as inclusive: if expiresAt is less than or equal to the evaluation time, access is denied.
- A null total or daily quota means unlimited for that dimension; zero means no positive additional traffic is allowed.
- Total and daily quota decisions use upload plus download bytes. The initial daily boundary is UTC calendar day.
- The request's projected byte addition is denied if it would make total or daily usage exceed the corresponding limit. Equality with the limit is allowed.
- Counters and deltas are non-negative safe integers. The service fails closed if projected counters exceed the supported safe-integer range.
- Usage writes use an atomic SQLite/D1 upsert per account and UTC day. The D1 adapter validates the combined byte delta and conditionally refuses daily-row updates that would exceed JavaScript safe-integer bounds; a zero-change result is surfaced as a range error. A repeated valid call still adds the provided deltas again because no stable usage-event ID or deduplication ledger exists.

## Important enforcement limitation

The quota service is a shared policy/evaluation primitive, and the API exposes read-only usage summaries. It is **not yet a proxy data-plane enforcement mechanism**. A caller must check the quota before forwarding traffic and report measured upload/download deltas after forwarding. Because a preflight read and a later write are not an atomic reservation, concurrent data-plane workers can exceed the quota near a boundary. Do not claim hard quota enforcement until reservation/idempotency semantics and actual proxy traffic integration are implemented and tested.

## Data/API behavior

- Usage is stored in D1's `usage_daily` table with per-account UTC date rows. SQLite migration and upsert behavior is exercised in CI; Cloudflare D1-specific behavior still needs integration validation.
- The initial API read endpoint is `GET /api/v1/accounts/:id/usage?date=YYYY-MM-DD`; access requires the `usage.read` permission.
- No public usage-write endpoint exists; clients cannot submit arbitrary usage counters.
- Retention, correction/reconciliation, concurrent quota reservations, and provider/proxy-side measurement are pending.

## Required reference tests

Run REF-006 through REF-008 against the pinned Nova release and record:
- exact expiry boundary and timezone;
- total/daily quota equality and overage behavior;
- reset day/time and daylight-saving behavior;
- whether upload and download are combined and which protocol/control bytes count;
- disabled/expired status transitions;
- simultaneous requests at a quota boundary;
- accounting persistence after restart and behavior for delayed/replayed usage reports.


## Counter overflow guard update — 2026-10-27

The adapter-level guard reduces risk of daily counter precision loss, but it is not an atomic quota reservation and does not cap the lifetime aggregate across all daily rows. The store API currently has no stable event identifier, so retries can double-count; idempotency must be designed together with the proxy/data-plane reporting contract rather than inferred from account/date/delta values. Mock adapter tests are not real D1 concurrency evidence.


## Schema-level counter guard — 2026-10-27

Migration `0004_usage_daily_safe_integer_guards.sql` adds SQLite/D1 triggers that reject inserts and updates where an individual daily counter exceeds `Number.MAX_SAFE_INTEGER` or the daily upload-plus-download total exceeds it. This is defense-in-depth for writers that bypass the JavaScript adapter. SQLite migration tests cover insert and update rejection; actual Cloudflare D1 migration and trigger behavior still require integration verification. The guard does not solve cross-day lifetime-total overflow, replay idempotency, or atomic quota reservation.


## Lifetime aggregate overflow guard — 2026-10-28

`getUsageSummary` now performs a first-pass `SUM(CAST(... AS REAL))` bound check before running exact integer aggregates. This avoids SQLite integer `SUM` overflow escaping before application validation when multiple individually-safe daily rows exceed the JavaScript safe-integer limit. Exact totals are returned only after all approximate aggregate bounds are finite, non-negative, and no greater than `Number.MAX_SAFE_INTEGER`. SQLite regression coverage uses multiple safe daily rows whose lifetime total exceeds that bound. This is a fail-closed reporting safeguard, not a quota reservation, stable-event idempotency mechanism, proxy traffic integration, or real Cloudflare D1 proof.


## Usage-event identity and reservation design — 2026-10-28

The next implementation slice is design-gated by [usage-event-atomicity-design.md](usage-event-atomicity-design.md). Future usage events must include a stable producer-scoped event ID generated by the trusted data-plane source. Matching retries must not increment aggregates again; a reused ID with different immutable content must fail as a conflict. Event claim and aggregate mutation must be atomic. Quota reservation is a separate operation from event idempotency and must serialize checks of account state, total/daily remaining allowance, and counter bounds before forwarding traffic. None of these mechanisms is implemented yet. Real Cloudflare D1 tests are required; Node SQLite and mocked bindings are not a substitute.

## VLESS handler integration status — 2026-10-28

The restricted /proxy/vless handler now authenticates credentials and relays bytes, but it does not call createQuotaService, reserve quota, or persist measured usage. The current evaluate() method is a read-only preflight and record() is additive aggregate reporting; neither is safe hard enforcement under concurrent sessions. Do not mark quota enforcement implemented until a trusted event ledger and atomic pre-forward reservation/reconciliation are integrated at the actual byte-forwarding boundary, with concurrent reservation tests and real D1 validation.


## Atomic reservation implementation checkpoint — 2026-10-28

Branch `feat/atomic-quota-reservations` adds migration 0006, a conditional pre-forward reservation method, a stable producer/event ledger, and trigger-driven aggregate settlement. The domain service computes a SHA-256 hash over canonical immutable event fields and requires caller-supplied IDs so retries can reuse them. The reservation checks active account status, expiry, total usage plus active reservations, daily usage plus active reservations, and safe-integer boundaries.

This is a storage/domain primitive, **not yet hard quota enforcement**: the VLESS handler does not call it yet. Integrate one stable reservation per bounded forwarding chunk; reserve before writing to TCP, settle the actual accepted byte count afterward, and retain the reservation if settlement outcome is ambiguous. Release only when no bytes could have been forwarded. Never automatically free a reservation merely because its advisory lease timestamp elapsed. Real Cloudflare D1 validation remains mandatory.


## VLESS reserve/settle integration — 2026-10-28

Main now has the atomic reservation/event-ledger primitives from PR #53, but the next branch `feat/vless-quota-enforcement` wires them into the VLESS handler. It reserves each non-empty chunk before the TCP/WebSocket send and settles measured bytes afterward. If settlement is ambiguous after a send, it closes the session and keeps the reservation active. The branch requires a stable `PROXY_USAGE_PRODUCER_ID` binding. This integration remains pending exact-head CI and real Cloudflare D1 validation; do not treat it as production-ready.
