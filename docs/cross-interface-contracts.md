# Cross-interface contract and reliability matrix

**Status:** Initial shared API/Telegram contract checks exist. Full cross-interface parity is not yet certified.

## Shared-operation contract

| Operation | Worker API | Web panel | Telegram | Android | Remaining evidence |
|---|---|---|---|---|---|
| Authenticate | Login/session endpoints; bearer token for non-browser clients, HttpOnly cookie for browser | Uses same-origin cookie session | Not available; static numeric allowlist is an interim read-only gate | Uses bearer session and Android Keystore encrypted persistence | Cross-client expiry/revocation and real deployed API tests |
| List accounts | Shared account domain service with server-side RBAC | Calls API | Calls shared account domain service with viewer permission | Calls API | Cross-interface identity/status contract test; browser/device E2E |
| Create/update/delete account | Protected API routes | Initial create/list only | Not available | Not available | UI workflows and Telegram linked-principal mutations |
| Usage/quota | Shared usage and quota service foundations | Read-only usage summary | Not exposed | Not exposed | Data-plane enforcement, atomic reservation and identical quota edge behavior |
| Cloudflare inventory/preview | Protected read-only provider API | Mode-aware preview UI | Not exposed | Not exposed | Real least-privilege account test; writes remain disabled |
| Subscription/protocol | Service/generator foundations; public delivery pending | Not yet exposed in UI | Not exposed | Not exposed | Persistent nodes, public delivery and client import/connect tests |

## Reliability and security gates

- Run `npm run verify` on every change and record the exact commit SHA.
- Android CI must build a debug APK; a successful build is not device-install or production-release certification.
- Keep Cloudflare inventory/plan tests mocked until a dedicated test account and least-privilege scopes are approved.
- Inject storage/provider/Telegram failures and verify sanitized error envelopes without secrets.
- Test expired/revoked sessions, unauthorized roles, request limits, rate limits and repeated operations.
- Add browser E2E, Android emulator/device tests and a Telegram webhook replay/idempotency test before marking Phase 11 complete.
- Run the same reference-derived account, expiry, quota and subscription scenarios through every applicable interface. Do not claim Nova parity without an authorized reference runtime.
