# imoxy.net — Product Roadmap and Phase Gates

**Status:** Active execution baseline; foundation merged, core design work started  
**Last updated:** 2026-11-02
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
**State:** In progress — versioned API conventions, capability reporting, domain services and schema validation have partial implementation/tests; the complete contract, migration/versioning strategy, deterministic error coverage and cross-client rule centralization have not passed the exit gate.

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
**State:** In progress — D1-oriented adapters and migrations plus Node/SQLite migration regression tests exist. On 2026-11-01, SQL migrations 0001–0008 were applied to one disposable Cloudflare D1 database through the D1 API; the quota-recovery schema and triggers plus selected direct-SQL behavior were verified on the primary. This is real D1 SQL evidence, but not Worker-bound D1 persistence, backup/export, restore, interrupted Worker writes, or rollback evidence.

Deliver:
- Storage adapter and schema/migration management appropriate to the selected runtime.
- Backup/export, restore, upgrade, rollback, and failure behavior.
- Idempotency and concurrency safeguards for state-changing operations.

Exit gate:
- Data survives restarts and upgrades as designed.
- Migration, interrupted-write, duplicate-request, backup/restore, and rollback tests pass.

### Phase 5 — Core management behavior
**State:** In progress — authorization-gated account CRUD routes, shared quota evaluation, D1 usage counters and authorized usage-summary reads are implemented with tests. Migration 0004 and safe-integer aggregate guards protect daily and lifetime usage reporting. Atomic per-chunk quota reservations and stable producer/event-ID usage settlement are integrated into the VLESS forwarding path; SQLite-backed tests exercise the actual D1 adapter SQL for concurrency, replay/conflict, release and rollback. A 2026-11-01 disposable real-D1 API probe additionally exercised the actual conditional quota-reservation INSERT, expiry cleanup, forwarding-marker retention, settlement triggers, immutable marker and a 12-way reservation race (5 × 10-byte reservations admitted under a 50-byte cap). An unmarked settlement was rejected and the failed D1 batch left no event row. This was direct D1 API SQL, not the repository D1Store/Worker runtime path. Worker-bound D1 transaction/recovery validation, real VLESS TCP relay, reference quota-boundary comparison and reconciliation remain.

Deliver:
- First-run/bootstrap and configuration editing.
- Account lifecycle, credentials/keys, ports, expiry, notes, enabled/disabled state.
- Total/daily traffic and configured request, speed, and connection limits as applicable to the reference.
- Input validation and useful, stable error behavior.

Exit gate:
- Reference comparison and boundary tests pass for critical account and quota scenarios.
- Every mutation is authorized, validated, auditable, and safe to retry where promised.

### Phase 6 — Subscription and proxy compatibility
**State:** In progress — subscription token generation/storage/revocation, account-expiry caps, provisional Auto/Base64/Clash rendering, clean-room URI/YAML generators, and a restricted VLESS-over-WebSocket TCP prototype with credential checks, destination allowlists, reserve-before-forward quota integration, per-session download-byte/lifetime budgets, DNS pinning and selected private/special-address filtering are implemented with tests. D1-backed admission leases now enforce positive per-account `max_connections` caps and the mandatory installation-wide `PROXY_MAX_CONCURRENT_SESSIONS` ceiling before upstream TCP dial; release and bounded stale-lease cleanup are implemented with automated SQLite/handler tests (PR #108). A disposable real-Cloudflare-D1 test on 2026-10-30 verified the account-cap race (20 attempts, cap 3, exactly 3 admitted), installation-cap race (12 attempts across two accounts, cap 2, exactly 2 admitted), release/retry, disabled/expired/zero-cap denial, and bounded expiry cleanup. The temporary D1 and Worker were deleted after testing. The Worker was uploaded and its D1 binding verified, but invocation was blocked by HTTP 403 from the available execution environment; production Worker-path and Nova runtime behavior remain unverified. The existing staging D1 remains untouched. The zero-cap meaning is not yet verified against Nova. The actual handler/module graph subsequently ran under Wrangler 4.156.0 `wrangler dev --remote`: 3/3 `/proxy/vless` handshakes passed; synthetic in-memory TCP with fake store/quota adapters completed 3/3 VLESS sessions and a ~6.2-second paused-reader test delivered the full 4 MiB after resume. This is partial remote-runtime evidence only: no D1 binding or real outbound TCP was used, and internal WebSocket buffer boundedness remains unproven. On 2026-11-01, a separate disposable EU D1 database received SQL migrations 0001–0008 through the Cloudflare D1 API. Direct D1-primary checks verified pre-forward expiry reclaim, post-forward retention and quota denial, successful usage settlement, rejection of unmarked settlement, marker immutability, D1 batch rollback, and a 12-way quota-reservation race (5 admitted under a 50-byte cap). The database was deleted and inventory confirmed only the three pre-existing databases remain. This is D1 SQL evidence only: no Worker was created/bound, no TCP destination was contacted, and it does not complete VLESS end-to-end acceptance. A test-only Workers VPC smoke harness is prepared with a dedicated Tunnel binding example and a private TCP Echo target path; live execution still requires a disposable Tunnel, Worker and D1, reviewed isolation/cleanup, and explicit scoped authorization. The VLESS relay serializes upstream reads behind downstream send+quota settlement; combined with the per-session download ceiling and global lease cap, application-submitted payload is bounded by `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)` (excluding framing/runtime copies). A deterministic non-reading-peer/held-settlement regression passes. Cloudflare-internal WebSocket buffer behavior remains unproven. Broader special-purpose address filtering now has IPv4/IPv6 regression matrices based on the IANA registries (2025-10-09 snapshot); live Cloudflare Worker destination-filter behavior, speed shaping, public delivery, target-client tests, and reference output comparison remain. A deterministic Node handler test now covers mixed A/AAAA answers with private-address filtering and sequential fallback from a failed public IPv4 dial to a pinned public IPv6 peer; this does not establish Cloudflare runtime or Nova behavior.

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


## Restricted VLESS WebSocket handler prototype — 2026-10-28

The active feature branch adds /proxy/vless (configurable via PROXY_WS_PATH) with VLESS TCP header parsing, hash-based account credential lookup, active/expiry checks, an explicit host/port allowlist, Cloudflare TCP socket adapter, and bidirectional WebSocket/TCP relay tests using injected adapters. This is a restricted prototype, not full Nova parity. Exact-head Node CI run #510 passed; real Cloudflare Worker/D1 smoke, robust DNS/private-network policy, quota enforcement/accounting, speed/concurrency limits and black-box reference comparison remain outstanding. Do not deploy or mark Phase 6 complete.


## Post-merge data-plane status — 2026-10-28

PR #51 is merged as 88ddb38f813aa0f4fa4700724972015169749a48. Its exact-head CI passed on cf0b6ceb61f5ee6702275cd8f8cf5d3a9f80af86 in run #515, including npm run verify. Main now contains a restricted VLESS-over-WebSocket TCP prototype with credential lookup, account status/expiry checks, destination allowlist and basic relay cleanup. It is not a production proxy. Next implement stable usage event identity and atomic pre-forward quota reservations, then test concurrency and recovery on disposable real D1; do not use read-only evaluate() as hard enforcement. Phase 5 and Phase 6 remain In progress; Phase 12 remains Blocked.


## Atomic quota reservation implementation slice — 2026-10-28

Branch `feat/atomic-quota-reservations` adds migration 0006, D1 store methods for conditional reservations and idempotent event settlement, trigger-driven usage aggregate updates, and a trusted domain service that hashes immutable event payloads. SQLite schema tests cover event settlement, replay suppression, reservation bounds and invalid over-reservation. This slice is not yet wired into the VLESS handler and is not hard enforcement. Exact-head CI and real Cloudflare D1 concurrency/rollback tests are required. Next: verify the migration and triggers on SQLite CI, then validate D1 semantics and integrate bounded chunk reserve/settle at the actual forwarding boundary without auto-releasing ambiguous reservations.


## VLESS quota enforcement integration — 2026-10-28

PR #53 merged the reservation/event-ledger primitives and exact-head CI plus post-merge main CI passed. The active branch `feat/vless-quota-enforcement` integrates reserve-before-forward and settle-after-forward into VLESS upload/download chunks. It requires a stable producer ID and retains reservations on ambiguous settlement. Exact-head CI, real D1 transaction/trigger/concurrency validation, private-network/DNS protections, resource limits and Nova behavior comparison remain mandatory gates.


## VLESS quota integration merged — 2026-10-28

PR #54 merged as `f9bc9bd790357521caad938a5de22026c242383d`; exact-head CI passed on `6e58695155d2a2ed76acf5f6961b03ba6f44dca1` in runs #557/#558. Main now integrates per-chunk reserve-before-forward and settle-after-forward into VLESS upload/download. Phase 5 remains In progress because real D1 transaction/trigger/concurrency/recovery tests and quota-boundary validation are not done. Phase 6 remains In progress because real Worker smoke tests, DNS/private-network hardening, resource limits and Nova behavior comparison are missing. Phase 12 remains Blocked. No deployment occurred.


## Quota SQL integration coverage — 2026-10-28

PR #56 adds SQLite-backed integration tests for the actual D1 adapter SQL. Exact-head CI passed in run #564, and post-merge main CI passed in run #565. Covered: concurrent reservation denial at the daily limit, event replay suppression and conflict rejection, reservation settlement/release, and rollback on aggregate overflow. This is not a real Cloudflare D1 integration. Phase 5 remains In progress until disposable D1 concurrency/rollback/trigger tests and a controlled Worker smoke test pass.


### VLESS idle-session resource control — 2026-10-28

Branch `fix/vless-idle-session-timeout` adds a default 120-second inactivity timeout for authenticated VLESS WebSocket sessions, resets it on upload/download activity, guards against stale timer callbacks, and closes the upstream socket on timeout. Unit tests cover timeout, activity reset, stale timer behavior and invalid configuration. This does not complete Phase 6: DNS rebinding/private-network protections, backpressure, connection/speed limits, live Worker/D1 validation and Nova black-box parity remain open. Await exact-head CI before merge; Phase 5 and Phase 6 remain **In progress**, and Phase 12 remains **Blocked**.


### Connected upstream peer validation — 2026-10-28

PR #60 is merged as `3f63f97b55b2ea19e771ae18a7c3f9b8e9eb3931`. Exact-head CI run #597 (`40640361156`) passed on `55776b816c2b74216840d4838ed704105ce98e09`, including `npm run verify`. The VLESS handler now validates the TCP socket's reported `remoteAddress` before forwarding the initial payload and fails closed on missing, malformed, or blocked peer addresses; special-use IPv4 literal filtering and regression tests were expanded. This is still defense in depth: hostname DNS resolution is not pinned by the application, and adapter-based Node tests do not prove Cloudflare runtime behavior. Phase 6 remains **In progress**; real Worker/D1 testing, full DNS-rebinding validation, backpressure/resource limits and Nova black-box comparison remain outstanding. Phase 12 remains **Blocked**.

### Connected IPv6 peer policy — 2026-10-28

PR #62 strict numeric IPv6 parsing is merged as `26dba7efa45d58de5982c1ffcdf5c5ff28018c77`; exact-head CI run `40642098509` passed and post-merge main CI run `40642950313` passed. PR #63 adds normalized IPv6 expansion and conservative rejection of non-global and selected special-purpose/transition/documentation ranges; exact-head CI run `40643131921` on `66f2e90fc2ff7dc0b58b17900408bcacfe3a24d2` was still in progress at the time of this note. This is defense in depth only: complete IANA range coverage, DNS pinning, real Worker/D1 tests and Nova comparison remain open. Phase 6 remains **In progress**; Phase 12 remains **Blocked**.

### PR #63/#64 final status — 2026-10-28

PR #63 merged as `29fa597c5c649552d827396a218609ce895724f4`; exact-head CI run `40643131921` passed. It normalizes IPv6 and conservatively rejects non-global plus selected special-purpose/transition/documentation ranges. PR #64 documentation update merged as `7a1856f311840466d080ed0606b1555474579584`; exact-head CI run `40643283669` passed. Post-merge main CI runs `40643515543` and `40643555979` were still in progress when this note was written. Phase 6 remains **In progress**; DNS pinning, real Worker/D1 validation, backpressure/connection limits and Nova comparison remain open. Phase 12 remains **Blocked**.


## DNS pinning milestone — 2026-10-28

PR #66 merged as `471e3a0d0cd9d0fc0fd2292b450e9a95aa026198`; exact-head CI passed on `c874882ae9179446cddad6ba1f2504c93dd8e063` (PR run `40647440374`, push run `40647434071`). Hostnames are resolved through DNS-over-HTTPS, validated public numeric answers are normalized and used directly as TCP dial targets, and the reported connected peer must match the pinned address before forwarding/quota reservation. Regression tests cover resolver failures, private-only answers, canonical targets, timeout during resolution and peer mismatch.

This remains unverified in the actual Cloudflare Worker/D1 runtime. DNS-over-HTTPS availability, Worker socket semantics, complete special-purpose address coverage, destination allowlist behavior, connection/resource limits, backpressure and Nova black-box parity remain open. Phase 6 stays **In progress** and Phase 12 stays **Blocked**. No deployment or live Cloudflare writes occurred.


## Phase completion audit — 2026-10-28

This is a gate-based status audit, not a percentage estimate. A phase is marked Complete only when its own exit criteria have reproducible evidence on the relevant final commit/environment. A green `npm run verify` is useful repository evidence but does not substitute for runtime, reference, legal, recovery, client-device, or deployment gates.

| Phase | Audited status | Evidence-based reason it is not Complete |
|---|---|---|
| 0 — Repository governance | In progress | Governance/docs/CI exist; final repository-wide audit and all exit checks are not certified. |
| 1 — Reference characterization | In progress | REF-001–REF-032 are documented, but no authorized Nova runtime scenarios were executed and distribution-license review remains open. |
| 2 — Domain/API contract | In progress | Partial API/domain contracts and tests exist; complete schema/versioning/error and shared-rule exit gate is not demonstrated. |
| 3 — Security and identity | In progress | Auth/session/RBAC tests exist; real D1 integration, deployed configuration, deeper abuse tests and security sign-off remain. |
| 4 — Persistence and recovery | In progress | Migrations and SQLite tests exist; real D1 durability, backup/restore, interrupted-write, concurrency and rollback evidence is missing. |
| 5 — Core management | In progress | Account CRUD and quota foundations exist; real D1 concurrency/recovery validation, complete data-plane enforcement, lifetime accounting edge cases and end-to-end proof of idempotency remain. |
| 6 — Subscription/proxy compatibility | In progress | Restricted VLESS/WS TCP prototype, DNS pinning and adapter tests exist; real D1 admission predicate tests now pass against a disposable D1 primary, but full VLESS route/handler runtime invocation, complete address-policy/fallback coverage, target-client, backpressure/limits and Nova comparison remain unverified. |
| 7 — Cloudflare operations | In progress | Inventory and dry-run planning are tested; real account verification, approved write workflows, idempotency and rollback are absent. |
| 8 — Web panel | In progress | Initial login/account/usage/preview screens exist; critical browser E2E, remaining workflows, accessibility and deployed-Worker validation remain. |
| 9 — Telegram bot | In progress | Initial read-only commands and mocked/SQLite replay tests exist; secure account linking, real D1/webhook validation, audited mutations and parity remain. |
| 10 — Android APK | In progress | Initial Kotlin client and debug-build pipeline exist; device install/E2E, security/session verification, core workflows and signed release provenance remain. |
| 11 — Cross-interface reliability | In progress | Limited API/Telegram contract tests exist; complete shared-operation parity, browser/device E2E, failure injection and SLOs remain. |
| 12 — Release certification | Blocked | License/distribution approval, reference evidence, real D1 recovery, staging/client E2E, security sign-off and release provenance are missing. |
| 13 — Imoxy-specific improvements | Not started | Deliberately gated until parity and release/legal blockers are resolved. |

**Audit conclusion:** 0 phases Complete; 11 phases In progress (0–11); Phase 12 Blocked; Phase 13 Not started. This is a phase-exit assessment, not a claim that no implementation work has been done.

**Next exit-gate sequence:** (1) close Phase 0 audit gaps; (2) execute prioritized Phase 1 reference scenarios and obtain a documented license/distribution decision; (3) prove Phase 2–4 contract/security/persistence against the actual target runtime; (4) complete stable-ID quota accounting and real D1 validation in Phase 5; (5) execute the controlled Worker/D1 smoke gate linked from [nonprod-vless-smoke-gate.md](nonprod-vless-smoke-gate.md) and compare critical proxy outputs to the pinned reference for Phase 6; then certify the client, cross-interface and release gates. Do not promote a phase to Complete solely because its implementation files or unit tests exist.

## VLESS downstream buffer guard — 2026-10-28

The active branch `fix/vless-downstream-buffer-bound` adds a fail-closed 1 MiB bound for WebSocket queued download bytes before quota reservation/send, with unit tests for over-budget and unmeasurable buffer state. This reduces one application-level queue risk but does not complete backpressure, speed/concurrency limits, Cloudflare runtime validation or Nova parity. Phase 6 remains In progress; Phase 12 remains Blocked until the existing release gates pass.

## Correction — Worker downstream flow control is still open

The 1 MiB downstream guard added in PR #76 relied on `server.bufferedAmount`, which is not documented in Cloudflare Workers' WebSocket API. Follow-up PR #77 removes this unsupported assumption. Do not count downstream backpressure as implemented or verified: a supported mechanism and disposable Worker slow-client test are still required. Phase 6 remains In progress; Phase 12 remains Blocked.

## VLESS per-session budget implementation — 2026-10-30

The active branch `fix/vless-session-download-budget` introduces mandatory finite per-session download-byte and session-duration settings. The handler fails closed when either setting is absent/invalid, stops before reserving/sending a download chunk that would exceed the cumulative budget, and terminates the session with upstream cleanup at the lifetime ceiling. Deterministic Node coverage is added for missing configuration, non-reading downstream peers, exact byte boundaries, and session timeout.

This is an application-level bound per session, not proof of Worker-internal WebSocket buffer size or a global aggregate bound across concurrent sessions. No production/staging values are configured, no Worker was deployed, and no live runtime or D1 test was run. Phase 6 remains **In progress**; Issue #78 and Phase 12 remain open/blocked pending CI, controlled runtime evidence, concurrency policy, D1 validation and Nova comparison.


## Post-merge status correction — 2026-10-30

The per-session download-byte and maximum-lifetime policy described above is now merged into main as b5c44b16132c9f540de16ab9d4ce54ab5fa01fa4 (PR #104). Post-merge main CI run 41037834214 passed on that exact commit. This does not change the parity status: the policy is imoxy-specific, Worker-internal WebSocket buffering remains unproven, aggregate concurrent-session bounds remain open, and no live Worker/D1 or Nova runtime test has been run.

## Session-admission runtime evidence update — 2026-10-31

The production D1Store JavaScript wrapper has now been invoked inside a deployed disposable Worker against a disposable Cloudflare D1 database. Exact concurrent account/global cap results and lifecycle checks passed; both temporary resources were deleted and their absence verified. Issue #106 is closed as completed. This is not a full VLESS route/runtime test and does not establish Nova REF-032 or Cloudflare WebSocket backpressure. Phase 6 remains **In progress**; Issue #78 remains open; Phase 12 remains **Blocked**. Production proxy limits remain unset.

## Generic WebSocket runtime observation — 2026-10-31

A disposable standalone Worker test was executed after explicit approval. A reading client and a client that paused reads for five seconds each received 4 MiB (256 × 16 KiB) without send exceptions; each Worker run completed sending in 2.57 seconds. The observed Worker-side `bufferedAmount` remained zero and was not a useful queue metric. The temporary Worker and local client script were deleted and absence of the Worker was verified.

**Scope:** this was a generic WebSocket endpoint, not the VLESS route. It did not test VLESS authentication, DNS/TCP dialing, D1 quota reservation/settlement, session leases, or the complete proxy lifecycle. No sequence-number or per-send latency distribution evidence was collected. It is not a pass of [the VLESS/D1 smoke gate](nonprod-vless-smoke-gate.md), and it does not prove a runtime-internal memory/buffer bound. Issue #78 remains open; Phase 6 remains **In progress** and Phase 12 remains **Blocked**.


## Runtime diagnostic update — 2026-10-31

The latest actual VLESS-handler Worker attempt returned Cloudflare HTTP 500 `error code: 1101` during WebSocket upgrade, even with injected in-memory store/quota adapters. A minimal Worker using the same native WebSocketPair/accept/101 response pattern succeeded on the same account/runtime. No VLESS payload, D1, TCP, quota, or relay behavior was reached. The failure is narrowed to the handler upgrade path but its exact cause is not yet known; observability returned no event rows. Disposable Workers and local scripts were cleaned up; existing staging resources were untouched. Phase 6 remains In progress and the proxy data-plane exit gate remains blocked on a successful handler handshake and controlled end-to-end relay.


## Pre-upgrade primitive control — 2026-10-31

A minimal disposable Worker without application imports successfully exercised the basic WebSocketPair/accept, session-state/closure, timer, and message/close/error-listener pattern, completing a real ClientWebSocket handshake and binary echo. This does not prove the full VLESS handler. A separate instrumented application-module copy returned 1101 even for plain HTTP, but its module startup was not independently validated and the run is discarded as inconclusive. Disposable resources were cleaned up; existing staging was untouched. Phase 6 remains In progress and the VLESS runtime gate remains blocked pending verified module-bundle preflight and successful handler handshake.


## Diagnostic-wrapper correction — 2026-10-31

Workers Logs exposed a diagnostic harness bug behind the earlier root-path 1101: the wrapper returned the handler's intentional `null` for unmatched paths, while Cloudflare workers.dev probes `GET /`. The runtime recorded `Incorrect type for Promise: the Promise did not resolve to 'Response'.` A corrected wrapper maps `null` to 404; root GET returned 404 and plain HTTP `/proxy/vless` returned the expected 426. One actual-handler WebSocket handshake succeeded with fake store/quota and TCP disabled, but repeat attempts were inconsistent. The synthetic VLESS relay attempt did not reach a confirmed handshake. This corrects the earlier claim that 1101 was conclusively in the VLESS handler; it does not establish a repeatable handshake or any VLESS/D1/TCP/quota/lease/relay pass. All 14 disposable Workers and five temporary scripts were deleted; only the two pre-existing Workers remain. No D1 or existing staging resource changed. Phase 6 remains In Progress; Phase 12 remains Blocked.

## 2026-11-02 — local VLESS-to-TCP integration slice

Added opt-in test test/vless-local-tcp.integration.test.js for the actual VLESS handler against the user's loopback TCP Echo Server. The focused test passed with the echo process running: one test passed, zero failed or skipped. It uses migrations 0001–0008 and the Node SQLite D1-compatible adapter; it verifies binary initial payload and 64 KiB later payload round-trip, bidirectional usage settlement, and session lease cleanup. The test-only connector maps a synthetic public peer identity to 127.0.0.1; it intentionally does not exercise DNS or destination peer validation. Full repository tests also passed with this opt-in test skipped by default. This is local integration evidence only; it does not close Issue #78 or prove Worker, remote D1, Cloudflare backpressure, or Nova parity. Phase 6 remains In progress, Phase 12 Blocked, Phase 13 Not started.


## 2026-11-02 — mixed DNS answers and cross-family TCP fallback

- The VLESS handler test suite now includes a mixed DNS + cross-family fallback case. Synthetic A/AAAA responses contain private and public candidates; private candidates are filtered, a public IPv4 dial failure falls through to public IPv6, and the handler validates the connected peer before forwarding the initial payload.
- Focused Node test result: 53/53 passed. This closes a deterministic test gap in the current implementation only; Phase 6 remains **In progress** because complete special-purpose address coverage, actual Cloudflare Worker/D1/TCP behavior, internal WebSocket buffer boundedness, isolate lifecycle, speed shaping, target clients, and Nova black-box comparison remain incomplete.


## 2026-11-02 — IANA special-purpose address coverage

- Added IPv4/IPv6 literal-destination regression matrices based on the IANA Special-Purpose Address Registries. The tests explicitly preserve conservative deny behavior for the 192.0.0.0/24 and 2001::/23 parent ranges and keep globally reachable AS112-v6 eligible for an explicit host allowlist.
- CI for the initial PR #155 head passed `npm run verify`; the documentation update creates a new head and requires a fresh exact-head CI check. Phase 6 remains **In progress**; no runtime or Nova parity claim is made.


## 2026-11-02 — Phase 6 runtime gate prepared, not executed

A manually dispatched GitHub Actions workflow and runner are prepared for the actual VLESS handler under Wrangler remote preview with a dedicated disposable D1 binding and controlled Worker-to-Worker TCP echo Service Binding. Migrations are applied through the Cloudflare D1 API; the run checks exact bytes, D1 settlement and lease release, then deletes and verifies only run-owned resources. The workflow has not yet been dispatched. Phase 6 remains **In progress** and Phase 12 remains **Blocked**; no new runtime acceptance evidence or Nova parity claim is recorded.

## 2026-11-02 — Phase 6 Cloudflare gate update

The first manually dispatched Worker-bound D1 + Worker-to-Worker TCP Service Binding run (41469175764) successfully provisioned disposable D1, applied migrations 0001–0008, deployed the internal-only echo Worker, and verified cleanup. The external VLESS client timed out after 8.5 seconds in its first session. Phase 6 remains **In progress**; the live Worker/D1/TCP acceptance exit gate remains open. PR #169 merged the connector-await correction, Promise-returning binding regression test, and improved failure diagnostics; exact PR-head and post-merge main CI passed. A successful repeat run with exact bytes, D1 settlement, lease release, and verified cleanup is still required.

## 2026-11-02 — Phase 6 diagnostic retrieval refinement

The latest disposable runtime attempt (41477742794) completed the handshake but stalled before the full relay and did not expose console-only stage markers. The smoke harness now retrieves bounded, payload-free handler diagnostics through a per-run-token-protected test endpoint. Exact-head CI passed (run 41480382039); no Cloudflare rerun has occurred. Phase 6 remains **In progress** until full Worker-bound relay, D1 settlement, lease release, and verified cleanup pass. Existing traffic caps and isolation constraints remain unchanged.
