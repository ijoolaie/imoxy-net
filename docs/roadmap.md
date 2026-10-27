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
**State:** In progress; foundation PR exists.

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
**State:** In progress — authorization-gated account CRUD routes, shared quota evaluation, D1 usage counters and authorized usage-summary reads are implemented with tests. Proxy data-plane enforcement, atomic quota reservations, idempotent usage reporting and real D1 integration remain.

Deliver:
- First-run/bootstrap and configuration editing.
- Account lifecycle, credentials/keys, ports, expiry, notes, enabled/disabled state.
- Total/daily traffic and configured request, speed, and connection limits as applicable to the reference.
- Input validation and useful, stable error behavior.

Exit gate:
- Reference comparison and boundary tests pass for critical account and quota scenarios.
- Every mutation is authorized, validated, auditable, and safe to retry where promised.

### Phase 6 — Subscription and proxy compatibility
**State:** In progress — subscription token generation/storage/revocation, account-expiry caps, and provisional Auto/Base64 rendering are implemented as a tested domain service. Subscription HTTP delivery, Clash format, protocol generation, and reference output comparison remain.

Deliver:
- Subscription tokens/access rules, expiry/revocation, and supported output formats.
- Independently implemented required proxy protocols/transports and configuration generation.
- Byte-level or semantic comparisons against the pinned reference where appropriate.
- Compatibility and negative tests for malformed, expired, revoked, and unsupported requests.

Exit gate:
- Each claimed protocol, transport, and format has a reproducible passing test suite.
- Secrets and endpoint exposure match documented policies; no unsupported combination is advertised.

### Phase 7 — Cloudflare integration and operational workflows
Deliver:
- Provider adapter with mocked tests before live access.
- Resource/settings discovery, validation, safe previews/diffs, explicit confirmation for writes, least-privilege credentials, audit trail, retries/idempotency, and rollback/recovery plan.
- Workflow support for Cloudflare-only and combined operation, without requiring the panel to be enabled.
- Clear degraded-mode behavior when provider APIs are unavailable.

Exit gate:
- All three operating modes are independently tested.
- Mock/failure-injection tests pass; live write tests, if approved, use a controlled non-production scope and have verified recovery steps.

### Phase 8 — Web panel
Deliver:
- Own imoxy.net identity and responsive administration UI.
- Setup, login/session lifecycle, dashboards, configuration, account/limit management, subscriptions, provider resources, audit and diagnostics views.
- Accessible form validation, loading/empty/error states, and safe confirmation for destructive actions.

Exit gate:
- End-to-end tests cover critical user journeys and permissions.
- UI uses shared API/domain behavior; no security-critical business rule exists only in the browser.

### Phase 9 — Telegram bot
Deliver:
- Secure account linking/authorization and command/menu flows.
- Supported management and status operations, understandable errors, abuse/rate protection, and audit events.
- Safe handling of secrets and callback replay/idempotency.

Exit gate:
- Bot operations enforce the same permissions, quotas, and domain rules as the web API.
- Unauthorized users, replayed callbacks, provider failures, and expired credentials are tested.

### Phase 10 — Android APK
Deliver:
- Android client connected to the shared versioned API.
- Secure token/session storage, login/logout, key management and the agreed core workflows.
- Network/error states, minimum supported Android version, signing/build pipeline, and release artifact provenance.

Exit gate:
- Reproducible build and installation smoke test.
- Critical user journeys, session expiry, API compatibility, and secure local storage checks pass.

### Phase 11 — Cross-interface parity and reliability
Deliver:
- Same scenario suite executed through API, web, Telegram, and Android where applicable.
- Consistent permissions, state transitions, quota enforcement, errors, and audit records.
- Load, timeout, rate-limit, storage/provider outage, partial-failure, and recovery tests.
- Observability with privacy-conscious retention and redaction.

Exit gate:
- Cross-interface tests show equivalent outcomes for shared operations.
- Critical reliability/security findings are closed; SLOs and operational alerts are defined.

### Phase 12 — Release certification and controlled rollout
Deliver:
- License/distribution approval, threat-model sign-off, deployment runbook, secrets setup, backup/restore proof, rollback plan, support diagnostics, and release notes.
- Staging certification followed by a controlled production rollout.
- Verified web, bot, and APK release artifacts with version linkage.

Exit gate:
- All release-blocking acceptance, security, recovery, and compatibility tests pass on the release candidate.
- Deployment and rollback are rehearsed; no unapproved Cloudflare mutation or commercial-license assumption remains.

### Phase 13 — Imoxy-specific improvements
Deliver:
- Product differentiators chosen from user evidence and operational needs, tracked separately from parity requirements.
- Independent acceptance criteria, privacy/security review, and release notes for each addition.

Exit gate:
- Additions do not regress the reference-compatible behaviors or the three operating modes.

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
