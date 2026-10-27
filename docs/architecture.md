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
