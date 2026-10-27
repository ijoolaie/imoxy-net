# Security model — initial threat assessment

**Status:** Initial controls and assumptions only; this is not a completed security review.

## Assets

- Administrator credentials, session bearer tokens, proxy credentials and subscription tokens.
- Proxy account settings, usage records, Cloudflare resource identifiers and configuration.
- Availability and integrity of the Worker, D1 database, and any provider-side resources.
- Audit history needed to investigate administrative changes.

## Trust boundaries

1. Untrusted browser, Telegram and Android clients to the versioned API.
2. API handlers to shared domain services and authorization policy.
3. Worker runtime to D1/KV and Cloudflare APIs.
4. Subscription clients to public subscription endpoints.
5. CI/deployment identity to source code and production secrets.

## Initial controls

- Passwords use PBKDF2-HMAC-SHA-256 with a random 16-byte salt and 210,000 iterations; encoded hashes include the scheme and iteration count.
- Session bearer credentials are generated from 32 random bytes. Only SHA-256 token hashes are intended for persistence; raw tokens are returned once to the caller.
- The crypto helpers use Web Crypto, reject malformed hash encodings and fail closed on invalid verification inputs.
- The D1 schema separates administrative principals/sessions from proxy accounts and stores subscription token hashes rather than raw tokens.
- Request validation rejects unknown fields and internal-role injection. Authorization must still be enforced by server-side services before any protected operation.
- Provider credentials must be configured as platform secrets and must never be stored in provider-resource metadata or logs.

## Threats requiring implementation and testing

- Login attempts use persistent fixed-window counters keyed by HMAC-derived IP and username hashes. Distributed credential stuffing, lockout usability and operational tuning still need abuse testing.
- Session issue/resolve/revoke primitives and HTTP login/logout/me routes are implemented. Browser sessions use Secure, HttpOnly, SameSite=Strict __Host cookies; cookie-authenticated mutations require same-origin Origin, and bearer-token clients use Authorization. Browser security still needs independent review and deployment testing.
- Initial role-based access checks and one-time bootstrap-owner service exist; route-level enforcement, recovery, MFA policy and session rotation are not implemented.
- JSON routes now return no-store, nosniff, referrer and restrictive CSP headers; account/session mutations are batched with audit events. Secret-redaction verification, audit retention and production abuse monitoring remain.
- D1 migration execution, transaction boundaries, concurrency, backup/restore and recovery have not been tested.
- Telegram identity linking, callback replay protection, Android secure storage and client compromise scenarios remain open.
- Cloudflare preview/confirmation, idempotency, least-privilege scopes and rollback remain open.

## Security release gates

- Add route-level tests for unauthenticated, expired, revoked and insufficient-role requests.
- Verify no response/log leaks passwords, raw tokens, provider secrets, SQL errors or stack traces.
- Test password hash version migration and session invalidation.
- Run dependency and static checks plus a reviewed threat-model update before release.
- Do not enable production or live provider writes until the security and recovery gates are satisfied.
