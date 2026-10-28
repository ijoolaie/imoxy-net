# Architecture (initial proposal)

## Design principles

- One domain/service layer shared by the Telegram bot, web panel and Android client.
- Explicit adapters for persistence, Cloudflare APIs, and protocol/subscription rendering.
- Authorization and quota enforcement in shared services, never only in UI handlers.
- Keep secrets out of source control and redact credentials from logs.
- Treat deployment and infrastructure operations as explicit, auditable actions.

## Proposed boundaries

- HTTP/worker adapter: request parsing, routing, response formatting.
- Identity and policy: authentication, sessions, roles, account state and quotas.
- Domain services: users, nodes, subscriptions, usage and configuration.
- Infrastructure adapters: KV/D1 or selected persistence, Cloudflare resources, Telegram.
- Clients: web panel, bot and Android APK.

These boundaries are proposals and must be reconciled with the reference behavior before the implementation expands.


## Current implementation slice

- `src/domain/account-service.js` is the shared account lifecycle boundary and requires an injected authorization policy; it validates payloads before persistence and passes audit metadata to the D1 adapter.
- `src/storage/d1-store.js` contains the provider-specific D1 query adapter. Clients and HTTP routes must call the domain service, not the storage adapter directly.
- These are initial components only. Authentication/session resolution, quota enforcement, actual D1 integration, and HTTP routing are still required before the account workflow is usable end to end.


## Quota/data-plane integration boundary — 2026-10-28

A source trace found that `src/domain/quota-service.js` is not imported by `src/http/api.js`; the API capabilities response still lists `quota-enforcement-and-usage-accounting` as pending. The current repository has a quota policy service and a D1 `usage_daily` aggregate adapter, but the inspected source tree does not establish a trusted proxy/data-plane reporter that supplies measured traffic. Consequently, current quota code is not proof of real traffic metering or pre-forwarding enforcement.

Do not wire a public management endpoint that accepts arbitrary client-reported usage as authoritative, and do not invent a new event ID at the receiver. Before implementing the event ledger, select and document the trusted usage producer, authentication/authorization between producer and control plane, stable event-ID generation and retry semantics, and how traffic is reserved before forwarding. If the proxy data plane is external, document the integration contract and failure modes. Until then, idempotent accounting and hard enforcement remain blocked on source integration, even though the storage design is documented.


## Reference architecture gap — 2026-10-28

The pinned Nova Proxy 5.0.0 README describes one Cloudflare Worker that serves the administration panel, subscription links, and proxy traffic; its deployment guide states that one deployment provisions/binds KV and D1 and does not require an origin server. Evidence: [pinned README](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md) and [pinned deployment guide](https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md). These are source-document findings, not black-box runtime verification.

The current imoxy entry point, `worker.js`, dispatches non-API requests to `env.ASSETS` when configured and sends other requests to `createApiHandler()`. The inspected `src/http/api.js` has management routes but contains no WebSocket upgrade handling, proxy protocol handshake, or `createQuotaService` wiring. Subscription format generation and account CRUD are therefore not evidence of a functioning proxy data plane.

This is a critical architectural mismatch, not a small missing endpoint. Before adding further quota-ledger/reservation code, define the independently implemented data-plane scope and deployment architecture: supported protocol/transport handlers, subscription delivery, routing/fallback behavior, trusted usage measurement, quota reservation before forwarding, and shared settings/account state. Prioritize the smallest end-to-end vertical slice that proves a real client can connect through the Worker and receive traffic under tests. Do not copy the pinned upstream obfuscated `worker.js` or protected assets. The reference license/distribution review remains a release gate.


## Restricted proxy route prototype — 2026-10-28

Main now routes /proxy/vless before static assets and the management API. It implements a restricted VLESS-over-WebSocket TCP path with hash-only credential lookup, account active/expiry checks, explicit host/port allowlists, and a Cloudflare TCP socket adapter. It is intentionally fail-closed when the database or allowlist is missing. This is a first vertical slice only: real Cloudflare Worker/D1 runtime behavior, DNS/private-network protections beyond the allowlist, usage metering, quota reservations, speed/concurrency enforcement, and Nova parity are unverified.
