# Cross-interface contract and reliability matrix

**Status:** In progress. Exact-head Node CI passes for the initial API/Telegram contract tests; this is not full interface certification.

## Evidence completed

- The shared account listing and Telegram `/accounts` command are exercised using a test store and mocked Telegram delivery.
- The contract asserts that username/status are consistent and sensitive fields are not exposed in the Telegram summary.
- Capability reporting is tested to distinguish initial web/Telegram/Android slices from incomplete full workflows.
- Exact-head PR head `ab06dfc9c76ce39b2817adad425a7902984c9431` passed CI run 40476873922; the change was merged as `ff0de52785baadc5d87bbfb2ccc2f9256a5cccc4`.

## Shared-operation contract

| Operation | Worker API | Web panel | Telegram | Android | Remaining evidence |
|---|---|---|---|---|---|
| Authenticate | Login/session endpoints; bearer token for non-browser clients, HttpOnly cookie for browser | Uses same-origin cookie session | Static numeric allowlist only; not account linking | Uses bearer session and Android Keystore encrypted persistence | Cross-client expiry/revocation and deployed API tests |
| List accounts | Shared account domain service with server-side RBAC | Calls API | Calls shared account domain service with viewer permission | Calls API | Browser/device E2E; pagination and permission parity |
| Create/update/delete account | Protected API routes | Initial create/list only | Not available | Not available | UI workflows and Telegram linked-principal mutations |
| Usage/quota | Shared usage and quota service foundations | Read-only usage summary | Not exposed | Not exposed | Data-plane enforcement, atomic reservation and identical quota edge behavior |
| Cloudflare inventory/preview | Protected read-only provider API | Mode-aware preview UI | Not exposed | Not exposed | Real least-privilege account test; writes remain disabled |
| Subscription/protocol | Service/generator foundations; public delivery pending | Not yet exposed in UI | Not exposed | Not exposed | Persistent nodes, public delivery and client import/connect tests |

## Remaining reliability gates

- Failure injection for D1/provider/Telegram and sanitized error envelopes.
- Browser E2E and accessibility review.
- Android emulator/device installation and session-expiry tests.
- Telegram replay/idempotency and durable user-account linking.
- Rate limits, storage/provider outage, partial-failure and recovery tests.
- Execute identical reference-derived account, expiry, quota and subscription scenarios through every applicable interface.
- Define SLOs, alerts, log redaction and retention. No Nova parity claim until reference runtime comparisons pass.
