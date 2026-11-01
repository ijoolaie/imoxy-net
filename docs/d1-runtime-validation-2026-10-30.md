# Disposable Cloudflare D1 validation — 2026-10-30

## Scope and isolation

A dedicated D1 database named `imoxy-net-validation-db` and a dedicated Worker named `imoxy-net-validation-worker` were created solely for this validation. The Worker was configured with a single D1 binding to that new database. Existing staging and unrelated databases/workers were not modified.

The D1 schema used the production `proxy_accounts` shape and migration 0007's `proxy_active_sessions` table, indexes, and restrictive account foreign key. Tests executed directly against the Cloudflare D1 API/primary. The admission SQL reproduced the production `INSERT ... SELECT` conditional predicate in `createD1Store().acquireProxySession()`.

## Results

- Per-account cap: 20 concurrent admission attempts with `max_connections=3` admitted exactly 3; the active-row count was exactly 3.
- Installation-wide cap: 12 concurrent attempts across two accounts with global cap 2 admitted exactly 2; the active-row count was exactly 2. The test explicitly casts the API's string-encoded global-cap parameter to INTEGER, preserving the production numeric comparison semantics.
- Release and retry: deleting an admitted lease changed 1 row; repeating the same delete changed 0 rows; a new admission after release changed 1 row.
- Fail-closed admission: disabled account, expired account, and `max_connections=0` each produced zero inserted rows.
- Expiry cleanup: a lease whose expiry was before the test clock was inserted, then the bounded cleanup removed exactly 1 row.
- Referential protection: deleting an account with an active lease was rejected by the restrictive foreign key.
- A preliminary direct-D1 20-way test independently returned exactly 3 admissions for a cap of 3.

## Worker runtime limitation

The temporary Worker upload succeeded and Cloudflare settings confirmed the expected D1 binding. Its version was created. However, the available execution environment blocked requests to the Worker's `workers.dev` URL with HTTP 403; the web retrieval path also could not access that URL. Therefore the Worker was **not invoked**, and these results must not be described as end-to-end Worker-path tests.

No WebSocket slow-reader probe was completed. No evidence was obtained about Cloudflare-internal WebSocket send-buffer size or drain/backpressure behavior. Issue #78 remains open.

## Cleanup

The temporary Worker and D1 database were both deleted through Cloudflare API. A subsequent resource-list check confirmed that both names were absent. No staging or pre-existing Cloudflare resource was changed.

## Interpretation and remaining gates

The real-D1 concurrent conditional-write results support the correctness of the account/global admission predicate under concurrent D1 requests. They do not independently prove the production Worker's runtime integration, all JavaScript D1Store wrapper behavior, Worker lifecycle behavior, or Nova Proxy 5.0.0 semantics. Issue #106 remains open for production Worker-path validation and Nova REF-032. Issue #78 remains open for a runtime-capable slow-reader probe. Do not mark either issue complete from this evidence alone.

## Follow-up: production D1Store wrapper invoked in a deployed disposable Worker — 2026-10-31

The earlier 2026-10-30 section above records a separate temporary Worker whose endpoint could not be reached (HTTP 403); that limitation applied to that earlier test and is superseded for the D1Store wrapper gate by this successful follow-up.

- Created disposable D1 `imoxy-probe-d1-20261031` (UUID `991f6736-e3cd-4fcf-b1e9-1df76a70b2df`) in WEUR with replication disabled; applied the checked-in initial schema and migration 0007.
- Deployed Worker `imoxy-d1-wrapper-probe-20261031` (compatibility date 2026-10-31) with only that D1 binding. Its `worker.js` imported the exact repository `src/storage/d1-store.js` as an ES module and called `createD1Store(env.DB)`; requests were issued by a Node 22.23.2 client and returned HTTP 200 for successful store operations.
- Account race: 20 simultaneous `acquireProxySession` calls with account cap 3 and global cap 10 admitted exactly 3 / denied 17.
- Installation race: 12 simultaneous calls across two accounts with `max_connections=NULL` and global cap 2 admitted exactly 2 / denied 10.
- Same-ID/same-account retry returned `allowed=true, duplicate=true`; same ID with another account returned `allowed=false, conflict=true`.
- Release returned true once and false on repeat. Disabled, expired, and zero-cap accounts were denied. The production wrapper's bounded cleanup removed one expired lease. A live lease blocked account deletion through the restrictive FK; after release, deletion succeeded. Final lease count was zero.
- D1 metadata showed writes/queries served by the primary in WEUR/AMS.
- Worker and D1 deletion each returned HTTP 200; follow-up account inventories confirmed both exact resources absent. Existing staging Worker and D1 were untouched.

This satisfies the disposable real-D1 + deployed-Worker D1Store wrapper validation for Issue #106; that issue was closed as completed after recording the evidence. It does not test the full production VLESS handler route, lease behavior after isolate termination, Nova REF-032, or downstream WebSocket slow-reader/backpressure. Issue #78 remains open. Production proxy settings remain unset.

## 2026-11-01 — Disposable D1 API validation of quota recovery migration (isolated; cleaned up)

A disposable EU D1 database was created under the previously recorded one-database test authorization:
- Name: `imoxy-vless-d1-20261101-1355`
- UUID: `62d98499-d54f-4168-bcab-db88fcd2784f`
- Jurisdiction: `eu`; primary region: `EEUR`; read replication disabled.
- No pre-existing D1 database was used.

The exact SQL contents of migrations 0001–0008 were applied through the Cloudflare D1 API `/query` endpoint. Migration 0001 was submitted as a multi-statement SQL script; migrations 0002–0008 were submitted in a D1 API batch. This was **not** a Wrangler `d1 migrations apply` run and did not create Wrangler's `d1_migrations` history table. It verifies the checked-in SQL against real D1, not Wrangler migration bookkeeping.

### Observed D1-primary results

- Schema inspection found the expected application tables, quota/session indexes, and triggers; `quota_reservations.forwarding_started_at` was present. `PRAGMA foreign_keys` returned 1 and `PRAGMA foreign_key_check` returned no rows.
- Prepared expiry recovery: an expired 40-byte reservation with a null forwarding marker was changed to `released`; the same account then admitted a new 100-byte reservation under a 100-byte quota.
- Uncertain expiry retention: an expired 40-byte reservation with a forwarding marker remained `active`; a further 70-byte reservation under a 100-byte quota was not inserted; explicit release changed zero rows.
- Settlement: a marked reservation accepted a 2-byte upload + 3-byte download event; the event became `applied`, the reservation became `settled` with `actual_bytes=5`, and daily usage recorded upload=2, download=3, request_count=1.
- Fail-closed settlement: applying an event for an unmarked reservation was rejected by `usage_event_apply_requires_forwarding` with `SQLITE_CONSTRAINT_TRIGGER`; the event remained `claimed`, the reservation remained `active`, and usage counters remained zero.
- D1 batch rollback: a batch containing a claimed event followed by the forbidden unmarked settlement was rejected; a follow-up query confirmed the event insert was rolled back (count 0).
- Marker immutability: clearing a previously set marker was rejected by `quota_reservation_forwarding_marker_immutable`; a follow-up query confirmed the marker was unchanged.
- Concurrent quota admission: 12 concurrent requests each attempted to reserve 10 bytes under a 50-byte account/daily cap. Exactly 5 inserts succeeded, 7 were denied, and the final active reservation total was exactly 50 bytes.
- All query responses were served by the D1 primary in `EEUR`.

### Cleanup and limits

The disposable database was deleted successfully. A subsequent account inventory returned exactly the three pre-existing databases and confirmed the test UUID/name was absent. No existing staging or unrelated D1 was modified.

This is **direct Cloudflare D1 SQL/API evidence only**. It does not execute `createD1Store()` or the VLESS handler inside a Worker, does not validate Wrangler migration history, does not exercise a real outbound TCP destination, and does not test isolate termination or WebSocket buffering. No Worker was created or deployed, no binding/route/DNS setting was changed, and no TCP destination was contacted. Issue #78 remains open.
 Production proxy settings remain unset.
