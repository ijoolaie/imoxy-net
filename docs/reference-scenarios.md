# Reference behavior scenarios — Nova Proxy 5.0.0

**Pinned reference:** `ad2116aa89f8c7db8248f8142c1432900d835eb7`  
**Evidence discipline:** The feature list below is transcribed as a *documented hypothesis* from the pinned README. It has not been independently exercised against a running reference build. Nothing in this file is marked verified.

| ID | Priority | Area | Scenario | Expected evidence to capture | Current evidence |
|---|---|---|---|---|---|
| REF-001 | P0 | Bootstrap | First install with no existing state | Setup flow, required bindings, default values, resulting records | README/setup hypothesis; runtime unknown |
| REF-002 | P0 | Bootstrap | Restart after successful setup | Persisted state and idempotent startup behavior | Unknown |
| REF-003 | P0 | Auth | Valid and invalid admin login | Status, response shape, lockout/rate behavior, session cookie/token settings | Unknown |
| REF-004 | P0 | Auth | Expired/revoked session on protected route | Exact rejection and whether session state changes | Unknown |
| REF-005 | P0 | Accounts | Create, edit, disable, re-enable and delete account | Fields, generated identifiers/credentials, defaults, audit side effects | README describes multi-user management; exact behavior unknown |
| REF-006 | P0 | Accounts | Expiry at past, present and future boundaries | Effective status and exact time boundary | README describes expiry; exact behavior unknown |
| REF-007 | P0 | Quotas | Total and daily usage at limit boundaries | Whether request/connection is accepted, reset timezone, accounting units | README describes per-user quota/daily limits; exact behavior unknown |
| REF-008 | P1 | Quotas | Speed and concurrent connection limits | Enforcement point, boundary and error/close behavior | README feature hypothesis; runtime unknown |
| REF-009 | P0 | Subscription | Valid, malformed, expired and revoked subscription token | Status, cache headers, credential exposure, access side effects | README describes private subscription links; exact behavior unknown |
| REF-010 | P0 | Subscription | Auto, Base64 and Clash output | Content, ordering, encoding, URL escaping and stable fields | README documents these formats; output unverified |
| REF-011 | P0 | Protocols | VLESS and Trojan config generation | URI/JSON structure, defaults, transport combinations, credentials | README feature hypothesis; runtime unknown |
| REF-012 | P1 | Protocols | Shadowsocks generation and import | Cipher support, URI format, encoding and invalid-input behavior | README feature hypothesis; runtime unknown |
| REF-013 | P1 | Transport | WebSocket, gRPC and XHTTP over TLS combinations | Accepted matrix, handshake behavior and generated links | README feature hypothesis; runtime unknown |
| REF-014 | P1 | Network | IPv4/IPv6, DNS and custom domain changes | Validation, propagation, generated endpoint changes and rollback | Unknown |
| REF-015 | P1 | Resilience | Fallback/self-healing link behavior after domain change | Ordered fallback list, timeouts, cache lifetime and recovery | README feature hypothesis; runtime unknown |
| REF-016 | P1 | Network | WARP/WireGuard and backend/chaining modes | Required resources, UDP behavior, failure handling and limits | README feature hypothesis; runtime unknown |
| REF-017 | P1 | IP optimization | Clean-IP scan and selected-IP application | Browser requests, provider dependencies, ranking and persisted changes | README describes Radar; runtime unknown |
| REF-018 | P1 | Routing | Resistance-policy preset on/off | Exact changed settings, reversible diff and generated config changes | README feature hypothesis; runtime unknown |
| REF-019 | P1 | Mirror | GitHub subscription mirror failover | Token scope, repository writes, URL stability, retries and secret handling | README feature hypothesis; runtime unknown |
| REF-020 | P1 | Bot | Telegram linking and account CRUD | Command list, role checks, locale, replay handling and audit events | README documents EN/FA/RU bot management; runtime unknown |
| REF-021 | P1 | Deployment | Cloudflare resource discovery and upgrade | Worker/KV/D1 names, bindings, schema versions and rollback behavior | README says one Worker/KV/D1; exact workflow unknown |
| REF-022 | P1 | Modes | Panel-only mode without provider credentials | Panel functions available; provider-specific functions clearly disabled | Required imoxy mode; reference behavior to characterize |
| REF-023 | P1 | Modes | Cloudflare-only mode without web panel | Provider workflows available through supported interface; no panel dependency | Required imoxy mode; reference behavior to characterize |
| REF-024 | P1 | Modes | Combined panel and provider workflow | Same state, permissions and audit events across both | Required imoxy mode; reference behavior to characterize |
| REF-025 | P2 | Privacy | Usage, connection records and audit visibility | Data collected, retention, access boundaries and redaction | README feature hypothesis; runtime unknown |
| REF-026 | P2 | Content policy | Ad/tracker blocking and SNI audit toggles | Scope, defaults, false-positive behavior and exact side effects | README feature hypothesis; runtime unknown |
| REF-027 | P2 | Node naming | Template variables and locale formatting | Supported placeholders, unknown-placeholder behavior and output | README feature hypothesis; runtime unknown |
| REF-028 | P2 | Localization | English, Persian/RTL and Russian flows | Layout direction, validation, date/number formats and translation fallback | README documents EN/FA/RU in different areas; exact coverage unknown |
| REF-029 | P0 | Mixed protocol | Generate and import a combined VLESS + Trojan link; simulate one transport being unavailable | Whether a single subscription includes both, client selection/fallback order and failure recovery | README documents mixed protocol; runtime unknown |
| REF-030 | P1 | Risk / endpoint audit | Compare raw VLESS/Trojan TLS links against Clash, sing-box, Shadowsocks and plaintext outputs; inspect subscription response headers | ECH defaults/migrations, decoy SNI inclusion/exclusion, exact header names/values, endpoint risk labels and secret exposure | Version 5.0.0 README/baseline hypothesis; runtime unknown |
| REF-031 | P0 | Install/update | Run one-click deployment, Telegram installer and Wrangler path in separate disposable accounts; then test update PR and rollback | Created resources/bindings, required secrets, setup claim, workflow permissions, diff boundaries and recovery | README/package/deploy guide documents these paths; not exercised |
| REF-032 | P0 | Client compatibility | Import Auto, Base64 and Clash outputs into representative clients and test connect/disconnect plus expired/revoked links | Import success, protocol selection, actual connectivity, refresh/cache behavior and invalid-link errors | README lists formats and clients; runtime unknown |

## Execution record template

For each scenario, create a dated record containing:
- reference version and exact commit;
- environment/runtime and deployment configuration;
- starting database/settings state;
- exact action/request and sanitized input;
- response status, headers and body;
- resulting state, logs and external side effects;
- repeated-run/idempotency result;
- evidence artifact location and reviewer;
- outcome: **Verified**, **Mismatch**, **Blocked**, or **Not run**.

Do not use the public README alone to claim runtime verification. Execute the scenarios against an authorized instance of the pinned reference release before freezing compatibility requirements. Implement imoxy behavior independently; do not copy upstream source, bundled UI, or assets.


## Proxy data-plane scenarios — added 2026-10-28

The current Worker/API source has no confirmed proxy traffic handler, so add these P0/P1 cases before implementation. The route and protocol defaults must be captured from an authorized pinned-reference instance; do not assume undocumented defaults.

| ID | Priority | Area | Scenario | Required evidence | Current status |
|---|---|---|---|---|---|
| REF-033 | P0 | Proxy data plane | Valid VLESS-over-WebSocket TCP session | Upgrade response, protocol handshake, upstream destination, bidirectional payload and close behavior | Not run; no imoxy handler |
| REF-034 | P0 | Proxy auth | Unknown, disabled, expired or malformed account credential | Rejection behavior and proof no upstream dial occurred | Not run; credential lookup contract missing |
| REF-035 | P0 | Protocol parser | Truncated header, unsupported command/address type, invalid port or oversized host | Rejection/close behavior and no upstream side effect | Not run |
| REF-036 | P0 | Worker routing | Wrong endpoint path, method or non-WebSocket request | Stable error behavior and no session/socket allocation | Not run |
| REF-037 | P0 | Relay reliability | Upstream connect failure, client/upstream close, timeout and cancellation | Both sides cleaned up; no leaked or hanging socket | Not run |
| REF-038 | P1 | Usage observation | Known bidirectional transfer | Correct measured ingress/egress bytes at the actual forwarding boundary | Not run; no trusted producer |
| REF-039 | P1 | Resource limits | Slow initial frame, fragmented messages, concurrent sessions and maximum header sizes | Bounded resource use and no parser bypass | Not run |

See [proxy-data-plane-mvp.md](proxy-data-plane-mvp.md) for the acceptance-first MVP boundary and explicit non-goals. These scenarios are requirements to execute, not evidence that Nova behavior has been verified.
