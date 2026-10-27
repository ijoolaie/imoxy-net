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
