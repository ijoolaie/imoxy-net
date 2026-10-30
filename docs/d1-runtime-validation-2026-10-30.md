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
