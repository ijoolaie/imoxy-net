# Web panel — first operational slice

**Status:** The responsive browser shell is implemented and consumes the shared API. This is not a finished Nova-equivalent panel.

## Implemented

- Same-origin login with the API's Secure, HttpOnly, SameSite=Strict session cookie; the browser UI does not read or persist bearer tokens.
- Session restore through /api/v1/auth/me and logout through /api/v1/auth/logout.
- Account listing, create form, quota/expiry fields, and read-only daily/total usage summaries.
- Mode badge and conditional visibility for panel-only, cloudflare-only and combined modes.
- Cloudflare inventory and dry-run plan preview; there is no Apply button and no write route.
- Responsive CSS, accessible labels/status messages, textContent-based rendering, no third-party scripts, and a restrictive static-asset CSP.

## Not yet implemented

- Account edit/disable/delete, subscription management, protocol configuration, node management, quota usage corrections and audit viewer.
- Rich filtering/search/pagination, mobile-specific workflows, i18n and detailed error recovery.
- Browser automation/E2E tests and accessibility audit.
- Production asset routing, custom-domain/TLS checks and real D1-backed login/account flow have not been exercised in a deployed Worker.

## Security notes

- API requests are same-origin and use browser credentials; no cross-origin CORS is enabled.
- UI output uses DOM text nodes rather than HTML interpolation.
- Cloudflare plans are preview-only. Do not add client-side apply logic until a reviewed approval/idempotency/rollback workflow exists.
