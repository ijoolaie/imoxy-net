# imoxy.net — Product Roadmap and Phase Gates

**Status:** Active execution baseline; foundation merged, core design work started  
**Last updated:** 2026-10-27  
**Reference target:** Nova Proxy 5.0.0, pinned in [reference-baseline.md](reference-baseline.md)  
**Rule:** A phase is not complete because code exists; it is complete only when its exit criteria have reproducible evidence.

## Product destination

Deliver imoxy.net as an independently implemented, secure proxy-management platform with three interfaces over one versioned API and shared domain services:

- Web panel
- Telegram bot
- Android APK

Support all three operating modes without making one depend unnecessarily on another:

1. Panel only.
2. Cloudflare resources/settings only.
3. Panel + Cloudflare resources/settings.

Behavioral compatibility with the pinned reference is the first product milestone. Imoxy-specific differentiators follow only after the compatibility baseline is measured. The product must use its own identity and branding.

## Delivery principles

- Characterize externally observable reference behavior before implementing a feature.
- Build clean-room implementations; do not copy protected upstream source, assets, or branding.
- Review license and distribution constraints before release or monetization.
- Use one domain model and authorization policy across web, Telegram, and Android.
- Cloudflare actions start read-only or mocked. Live writes require previews, least-privilege credentials, explicit authorization, audit records, and tested rollback/recovery.
- Never claim a feature works without tests and evidence. Never treat an unknown CI result as success.
- Keep each phase reviewable; use small pull requests and preserve this roadmap, the parity matrix, acceptance plan, decision log, and hand-off.

## Phases

### Phase 0 — Repository governance and delivery baseline
**State:** In progress — baseline governance, CI, capability reporting, and phase tracking are in place. Final repository-wide audit and all exit checks are not yet certified.

Deliver:
- CI and reproducible local verification.
- Reference version and license review records.
- Architecture, parity matrix, acceptance-test plan, decision log, and living hand-off.
- Clear capability reporting so unimplemented features never return fake success.

Exit gate:
- PR diff reviewed; CI passes on the exact final PR head.
- No secrets, unexplained generated files, or unsafe live operations.
- Roadmap and hand-off link to current repository state.

### Phase 1 — Reference characterization and requirements freeze
**State:** In progress — pinned source evidence and prioritized REF-001–REF-032 scenarios are documented. None has been executed against an authorized Nova runtime; distribution-license review remains a blocker.

Deliver:
- Observable behavior inventory for setup/bootstrap, settings, users, limits, subscriptions, protocols, transports, network options, routing/fallback, diagnostics, and errors.
- Per-feature evidence record: reference version/commit, scenario, input, output, state change, side effect, and result.
- Explicit distinction between verified behavior, documented hypotheses, unsupported behavior, and unknowns.
- Legal review decision for the intended distribution and commercial model.

Exit gate:
- Every in-scope parity-matrix row has concrete black-box scenarios and a priority.
- Critical ambiguities and license blockers are documented; no implementation is falsely labeled as parity.

### Phase 2 — Domain model, configuration, and API contract
Deliver:
- Versioned API conventions and structured error format.
- Domain model for installation/configuration, users, credentials, expiry, limits, subscriptions, providers, and audit events.
- Capability negotiation and schema validation.
- Shared domain-service boundaries independent of the three clients.

Exit gate:
- API contract tests, schema validation, migration/versioning strategy, and deterministic error cases pass.
- No client duplicates authorization or quota business rules.

### Phase 3 — Security and identity foundation
**State:** In progress — password/session crypto, one-time owner bootstrap, HMAC-derived IP/account rate-limit keys, login/logout/me routes, secure HttpOnly cookie transport, same-origin mutation checks, session lifecycle and initial RBAC are implemented with tests. Real D1 integration, deployment configuration, deeper abuse testing and security review remain.

Deliver:
- Authentication, secure sessions/token lifecycle, logout/revocation, role/permission checks.
- Secret handling, encryption-at-rest strategy where applicable, redacted logs, rate limits, CSRF/origin protections for browser flows, and security headers.
- Threat model and abuse-case tests.

Exit gate:
- Unauthenticated, expired, revoked, and unauthorized access tests pass for every protected operation.
- Secrets are absent from source, responses, and logs; security review findings are resolved or explicitly blocked.

### Phase 4 — Persistence, migrations, and recovery
Deliver:
- Storage adapter and schema/migration management appropriate to the selected runtime.
- Backup/export, restore, upgrade, rollback, and failure behavior.
- Idempotency and concurrency safeguards for state-changing operations.

Exit gate:
- Data survives restarts and upgrades as designed.
- Migration, interrupted-write, duplicate-request, backup/restore, and rollback tests pass.

### Phase 5 — Core management behavior
**State:** In progress — authorization-gated account CRUD routes, shared quota evaluation, D1 usage counters and authorized usage-summary reads are implemented with tests. A conditional D1 upsert and migration 0004 schema triggers now reject per-day counter overflow, with adapter and SQLite migration regression coverage. Proxy data-plane enforcement, atomic quota reservations, stable-ID idempotent reporting, lifetime aggregate overflow handling and real D1 integration remain.

Deliver:
- First-run/bootstrap and configuration editing.
- Account lifecycle, credentials/keys, ports, expiry, notes, enabled/disabled state.
- Total/daily traffic and configured request, speed, and connection limits as applicable to the reference.
- Input validation and useful, stable error behavior.

Exit gate:
- Reference comparison and boundary tests pass for critical account and quota scenarios.
- Every mutation is authorized, validated, auditable, and safe to retry where promised.

### Phase 6 — Subscription and proxy compatibility
**State:** In progress — subscription token generation/storage/revocation, account-expiry caps, provisional Auto/Base64/Clash rendering, and clean-room VLESS/Trojan/Shadowsocks URI plus Clash YAML generators are implemented with tests. Public delivery, persistent proxy-node configuration, target-client smoke tests and reference output comparison remain.

Deliver:
- Subscription tokens/access rules, expiry/revocation, and supported output formats.
- Independently implemented required proxy protocols/transports and configuration generation.
- Byte-level or semantic comparisons against the pinned reference where appropriate.
- Compatibility and negative tests for malformed, expired, revoked, and unsupported requests.

Exit gate:
- Each claimed protocol, transport, and format has a reproducible passing test suite.
- Secrets and endpoint exposure match documented policies; no unsupported combination is advertised.

### Phase 7 — Cloudflare integration and operational workflows
**State:** In progress — read-only inventory, protected inventory/plan routes, deterministic dry-run planning and operating-mode gating are implemented with mocked tests. Real account verification, write workflows, explicit approval, idempotency and rollback remain.

Deliver:
- Provider adapter with mocked tests before live access.
- Resource/settings discovery, validation, safe previews/diffs, explicit confirmation for writes, least-privilege credentials, audit trail, retries/idempotency, and rollback/recovery plan.
- Workflow support for Cloudflare-only and combined operation, without requiring the panel to be enabled.
- Clear degraded-mode behavior when provider APIs are unavailable.

Exit gate:
- All three operating modes are independently tested.
- Mock/failure-injection tests pass; live write tests, if approved, use a controlled non-production scope and have verified recovery steps.

### Phase 8 — Web panel
**State:** In progress — responsive same-origin login/session shell, account list/create, usage summary, mode-aware Cloudflare inventory and dry-run preview are implemented. Account editing/deletion, subscriptions/nodes, audit UI, browser E2E/accessibility review and deployed-Worker validation remain.

Deliver:
- Own imoxy.net identity and responsive administration UI.
- Setup, login/session lifecycle, dashboards, configuration, account/limit management, subscriptions, provider resources, audit and diagnostics views.
- Accessible form validation, loading/empty/error states, and safe confirmation for destructive actions.

Exit gate:
- End-to-end tests cover critical user journeys and permissions.
- UI uses shared API/domain behavior; no security-critical business rule exists only in the browser.

### Phase 9 — Telegram bot
**State:** In progress — a secret-validated webhook, allowlisted read-only `/start`, `/help`, `/status`, and `/accounts`, and D1-backed seven-day `update_id` replay suppression, retry release on delivery failure, and two-minute recovery of abandoned processing claims are implemented with mocked/SQLite tests. PR #22 merged as `06abb6208b5abedce6fb629d95f3428ceeb50e34`; exact-head CI passed on `b06239c1cc3e89e51b59aa8ea837745977f0302e` (run 40477478274, pull_request; run 40477446750, push). PR #24 stale-claim recovery merged as `0a83419fd2d4a85c0f755f96d7a145fb7832a815`; exact-head CI passed on `fd9d54c8cf666dc2955348cdd6a7cb39edea0bf7` (run 40477847177). PR #27 private-chat-only hardening merged as `88aa54fb00fbc0ba8fe91db45773bbb4bfce5f38`; exact-head CI passed on `e625de2152ab201a6788e0916df197edb3042df5` (run 40495044071 pull_request; 40495036669 push). A regression test confirms that group-chat commands are ignored before claiming an update or sending account metadata. Main CI passed after PR #29 on `12cfb9f7e8c3f01a07346165bfdeb28c684893da` (run 40495393858). This privacy safeguard is not a Nova parity claim. Secure account linking, per-principal mapping, audited mutations, real D1 validation, live webhook validation and reference comparison remain.

Deliver:
- Secure account linking/authorization and command/menu flows.
- Supported management and status operations, understandable errors, abuse/rate protection, and audit events.
- Safe handling of secrets and callback replay/idempotency.

Exit gate:
- Bot operations enforce the same permissions, quotas, and domain rules as the web API.
- Unauthorized users, replayed callbacks, provider failures, and expired credentials are tested.

### Phase 10 — Android APK
**State:** In progress — a native Kotlin/XML client supports HTTPS-only API configuration, login, encrypted session persistence using Android Keystore, account-list refresh and logout. A Gradle/GitHub Actions debug-APK build is configured. Build CI, device installation, session/security tests, account mutation workflows, signing and release provenance remain.

Deliver:
- Android client connected to the shared versioned API.
- Secure token/session storage, login/logout, key management and the agreed core workflows.
- Network/error states, minimum supported Android version, signing/build pipeline, and release artifact provenance.

Exit gate:
- Reproducible build and installation smoke test.
- Critical user journeys, session expiry, API compatibility, and secure local storage checks pass.

### Phase 11 — Cross-interface parity and reliability
**State:** In progress — an API/Telegram account-list contract test and capability-reporting test pass on exact PR head `ab06dfc9c76ce39b2817adad425a7902984c9431` (CI run 40476873922); merged as `ff0de52785baadc5d87bbfb2ccc2f9256a5cccc4`. Browser/device E2E, full operation parity, failure injection and SLOs remain.

Deliver:
- Same scenario suite executed through API, web, Telegram, and Android where applicable.
- Consistent permissions, state transitions, quota enforcement, errors, and audit records.
- Load, timeout, rate-limit, storage/provider outage, partial-failure, and recovery tests.
- Observability with privacy-conscious retention and redaction.

Exit gate:
- Cross-interface tests show equivalent outcomes for shared operations.
- Critical reliability/security findings are closed; SLOs and operational alerts are defined.

### Phase 12 — Release certification and controlled rollout
**State:** Blocked — release checklist is documented, but license/distribution approval, reference parity evidence, real D1 recovery, staging deployment, client E2E, threat-model sign-off and production artifact provenance are not complete. No release candidate exists.

Deliver:
- License/distribution approval, threat-model sign-off, deployment runbook, secrets setup, backup/restore proof, rollback plan, support diagnostics, and release notes.
- Staging certification followed by a controlled production rollout.
- Verified web, bot, and APK release artifacts with version linkage.

Exit gate:
- All release-blocking acceptance, security, recovery, and compatibility tests pass on the release candidate.
- Deployment and rollback are rehearsed; no unapproved Cloudflare mutation or commercial-license assumption remains.

### Phase 13 — Imoxy-specific improvements
**State:** Not started — a separate candidate backlog is documented in [imoxy-improvements.md](imoxy-improvements.md), but feature implementation is intentionally gated until Phase 1 evidence and release/legal blockers are resolved.

Deliver:
- Product differentiators chosen from user evidence and operational needs, tracked separately from parity requirements.
- Independent acceptance criteria, privacy/security review, and release notes for each addition.

Exit gate:
- Additions do not regress the reference-compatible behaviors or the three operating modes.

## Supporting phase artifacts

- [Pinned reference evidence register](reference-evidence.md)
- [Cross-interface contract and reliability matrix](cross-interface-contracts.md)
- [Release certification and controlled rollout checklist](release-certification.md)
- [Post-parity imoxy-specific improvement backlog](imoxy-improvements.md)

## Priority order

1. Complete and verify Phase 0.
2. Phase 1: build the evidence-backed behavior inventory before feature coding.
3. Phase 2–4: establish API, security, and persistence foundations.
4. Phase 5–7: implement core domain behavior, subscriptions/protocols, and Cloudflare workflows.
5. Phase 8–10: deliver web, Telegram, and Android over the shared core.
6. Phase 11–12: cross-interface verification, reliability, and controlled release.
7. Phase 13: imoxy-specific improvements after parity is measured.

## Scope control and reporting

- Use status values: **Not started**, **In progress**, **Blocked**, **Complete**.
- Every phase report must list changed files/PR, tests executed, exact CI commit SHA and result, known gaps, and next action.
- A test passing on an earlier commit does not validate a later commit.
- A feature is not “complete” while its critical acceptance tests are missing.
- Estimates and calendar dates are intentionally not committed until task sizing, dependencies, and delivery capacity are measured.


### Security maintenance note — 2026-10-27

Fixed successful-login rate-limit cleanup to clear each HMAC-derived IP and normalized-username key individually. Added a regression assertion for multi-key cleanup. This strengthens the current imoxy auth implementation but does not close Phase 1 reference characterization or prove Nova parity.


### Quota data-integrity maintenance — 2026-10-27

The quota service rejects combined upload/download byte deltas outside the JavaScript safe-integer range before persistence, with a regression test asserting no write occurs. This does not complete Phase 5: atomic quota enforcement, idempotent reporting, data-plane integration, real D1 tests and Nova comparison remain open.


### Quota accounting follow-up — 2026-10-27

D1 daily-row writes now validate the combined byte delta and conditionally guard upload/download/request counters plus the combined daily byte total against JavaScript safe-integer overflow. Unit tests cover validation and the conditional no-change error path. No stable usage event ID exists in the current contract, so duplicate-report idempotency is explicitly not implemented. Next: define the proxy/data-plane event identity, add a unique usage-event ledger and transaction/reservation design, then verify with actual Cloudflare D1 concurrency tests before claiming hard quota enforcement.


Quota schema follow-up (2026-10-27): migration 0004 adds BEFORE INSERT/UPDATE triggers for safe-integer bounds on daily counters and combined daily bytes. SQLite CI tests the guard; Cloudflare D1 integration, lifetime totals, event idempotency and atomic reservation remain pending.


### Lifetime usage aggregate overflow guard — 2026-10-28

Phase 5 now includes a two-pass usage-summary query: a floating-point aggregate is used only to detect totals outside the supported safe-integer range, then exact integer sums run only when bounds are safe. Regression tests cover the adapter query path and SQLite's cross-day aggregate behavior. This does not close lifetime accounting correctness generally: real D1 compatibility, stable event IDs/deduplication, atomic quota reservation, and proxy data-plane enforcement remain open.


### Usage-event identity and atomic reservation design — 2026-10-28

Added [usage-event-atomicity-design.md](usage-event-atomicity-design.md) to specify stable producer-scoped event identity, immutable payload/replay rules, ledger + aggregate atomicity, a separate reservation contract, and required real-D1 integration tests. This is documentation/design work only. Phase 5 remains **In progress**; Phase 12 remains **Blocked**. No usage-event ledger, reservation, real D1 integration, data-plane enforcement, or Nova parity was added by this change.

### Quota producer integration gap — 2026-10-28

A source trace confirms `createQuotaService` is not wired into `src/http/api.js`; the capabilities endpoint still lists quota enforcement/usage accounting as pending, and no trusted proxy/data-plane usage reporter was found in the inspected source tree. The next work is not to expose a raw usage-write endpoint: first establish the trusted producer, authentication, account mapping, stable event IDs, and pre-forwarding reservation contract. Phase 5 remains **In progress** with hard enforcement blocked on this boundary; Phase 12 remains **Blocked**. See [architecture.md](architecture.md), [parity-matrix.md](parity-matrix.md), and [usage-event-atomicity-design.md](usage-event-atomicity-design.md).


## Critical-path correction — 2026-10-28

Source inspection against the pinned Nova Proxy 5.0.0 deployment model found a structural gap: Nova's documented single Worker serves the panel, subscriptions and proxy traffic, while the current imoxy `worker.js` routes requests to static assets or a management API. The inspected API contains no WebSocket upgrade/proxy protocol path and does not wire `createQuotaService`. Consequently, protocol URI/YAML generators and quota storage foundations do not constitute a working proxy replacement.

**Priority correction:** before implementing the usage-event ledger or quota reservations, Phase 6 must define and build a minimal end-to-end proxy data-plane vertical slice, with black-box acceptance scenarios first. The slice must identify client handshake/transport, account/subscription authentication, routing/forwarding, error/close behavior, and a trusted measurement point. Only then can usage IDs, pre-forwarding reservations and accounting be attached to the actual traffic lifecycle. Keep Phase 6 **In progress** and Phase 5 **In progress**; neither is complete. Phase 1 runtime characterization and the version-specific license/distribution review remain blockers to compatibility claims and release.


## Proxy data-plane MVP — acceptance-first next slice (2026-10-28)

The next implementation target is one independently written VLESS-over-WebSocket TCP vertical slice, contingent on authorized reference characterization confirming the supported combination. The design and P0/P1 scenarios are recorded in [proxy-data-plane-mvp.md](proxy-data-plane-mvp.md) and [reference-scenarios.md](reference-scenarios.md) (REF-033–039). No handler is implemented yet. First resolve the account credential lookup/storage contract, strict protocol parsing, Cloudflare TCP socket adapter, relay cleanup/backpressure, and the controlled Worker smoke-test setup. Do not mark the slice functional from Node unit tests alone. This is now the active Phase 6 path; Phase 5 quota reservation/idempotency must attach to the real data-plane measurement/forwarding boundary rather than precede it.


## Initial protocol parser foundation — 2026-10-28

The first code slice adds a pure VLESS TCP request parser and unit tests for version/command/address parsing, domain validation, incomplete headers and payload-offset preservation. This is a narrow Phase 6 foundation only: no WebSocket route, account credential lookup, upstream TCP connection, relay, quota enforcement, Cloudflare Worker smoke test, or Nova runtime comparison exists yet. Keep Phase 6 In progress and all proxy parity rows Not assessed. Next prerequisites are credential storage/lookup and a testable Worker TCP adapter; do not treat parser CI as an end-to-end proxy milestone.


## Proxy credential foundation — 2026-10-28

The current feature branch adds a hash-only proxy_credentials table, UUID issuance on account creation, hash lookup for the future data plane, and owner/admin-only credential rotation that revokes old credentials and audits the change. Raw UUIDs are returned only in create/rotate responses. Exact-head CI and real D1 validation are pending for this branch; no handler consumes these credentials yet. This removes one design blocker but does not make the proxy data plane functional. Phase 6 remains In progress.
