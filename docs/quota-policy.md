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
