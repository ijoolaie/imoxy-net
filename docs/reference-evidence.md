# Reference evidence register — Nova Proxy 5.0.0

**Target commit:** `ad2116aa89f8c7db8248f8142c1432900d835eb7`  
**Reference repository:** https://github.com/IRNova/Nova-Proxy  
**Evidence snapshot date:** 2026-10-30  
**Runtime access:** Not provided in this work session; no reference deployment was exercised.

## Evidence categories

- **Documented claim:** Explicitly stated in a file at the pinned commit. This is evidence that the upstream documentation makes the claim, not proof that runtime behavior matches it.
- **Source-derived hypothesis:** Inferred from configuration/release metadata and must be confirmed through an external interface or a controlled runtime.
- **Runtime verified:** Repeated black-box observation on the pinned release with sanitized request/response and state-change evidence. None of the capabilities below currently qualify.
- **Imoxy implementation evidence:** Tests show how this repository behaves. It does not establish Nova parity.

## Primary source records

| Record | URL | What it establishes | Limits |
|---|---|---|---|
| Pinned README | https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md | User-facing feature claims, setup paths, protocols/formats, bot and network features | Documentation only; not runtime evidence |
| Pinned package manifest | https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/package.json | Package version 5.0.0 and described Cloudflare bindings/scripts | Does not prove deployment flow succeeds |
| License | https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/LICENSE | Terms attached to the pinned reference | Requires legal interpretation for intended product/distribution |
| Deployment guide | https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md | Documented setup/update/rollback path | Must be exercised in a disposable authorized account |
| Guide | https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/GUIDE.md | Detailed user-facing feature and settings descriptions | Documentation may be incomplete or inconsistent with runtime |
| Pinned version metadata | https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/version.json | Identifies 5.0.0, release date, protected worker flag and published SHA-256 | Does not document per-account connection-limit semantics; protected worker is not used as a source for implementation copying or unsupported inference |

## Documented capability inventory (hypotheses, not verified)

| Area | Claims in pinned README / release notes | Required black-box confirmation |
|---|---|---|
| Deployment | One Cloudflare Worker with KV and D1; one-click deployment, Telegram installer, Wrangler CLI; post-deploy setup | Required bindings, first-run state, setup claim, failure recovery, upgrades and rollback |
| Accounts | Multi-user accounts, per-user quota, expiry, daily limits and private subscription link | Defaults, credential generation, exact expiry/quota boundary, revocation and deletion semantics |
| Subscription formats | Auto, Base64 and Clash | Content type, headers, cache behavior, ordering, escaping and malformed/expired-token behavior |
| Proxy protocols | VLESS, Trojan, Shadowsocks; a mixed protocol link containing VLESS and Trojan | URI/Clash output and actual client import/connect behavior for each supported combination |
| Transports | gRPC, XHTTP over WebSocket + TLS; README's protocol combinations need precise resolution | Exact supported protocol × transport × TLS matrix, handshake and negative cases |
| Network paths | WARP/WireGuard, proxy chaining and backend mode; UDP calls require WARP or backend according to README | Required provider resources, UDP semantics, routing, fallback and outage behavior |
| Clean IP | Nova Radar scans candidate Cloudflare IPs for current network and applies a selected result | Candidate source, ranking inputs, network requests, persisted changes and reversibility |
| Resistance policy | Presets described as port spread, domestic bypass, ad/tracker blocking and other censorship-resistance settings | Exact setting diff, defaults, generated config changes, rollback and false-positive behavior |
| Mirror failover | Optional GitHub mirror for subscription links | Token scope, repository writes, failure/retry semantics, public exposure and fallback order |
| Telegram | User management through bot; README claims EN/FA/RU support | Command list, role mapping, locale coverage, rate/replay protection, audit events and account parity |
| Node naming | Template variables such as flag/country/city/name/date | Supported token list, locale formatting, invalid template behavior and determinism |
| Self-healing links | Fallback addresses if worker domain/host changes or goes down | Health criteria, fallback order, cache TTL, recovery and stale-host handling |
| Risk/audit changes in 5.0.0 | ECH resolver default, optional decoy SNI for raw VLESS/Trojan TLS, host risk labels, no-custom-domain warning, audit view, endpoint/risk response headers | Defaults/migrations, exact header names/values, format-specific inclusion/exclusion and secret exposure |
| Localization | README claims bilingual panel and elsewhere lists English, Persian and Russian coverage | Per-screen translation completeness, RTL behavior, date/number formats and fallback |
| Release automation | Daily update check opens a PR with worker/version files; optional hands-off updates | Workflow permissions, diff limits, preview gates, rollback and secret scope |

## Execution state

- The documentation inventory is grounded in the pinned README and repository metadata fetched during this session.
- No Nova runtime instance, Cloudflare deployment, Telegram installer or end-user client was exercised.
- No matrix row may be marked **Verified** from this document alone.
- Reference source code, bundled UI assets, branding and minified worker artifacts are not to be copied into imoxy. Use these records to write independently authored tests and implementations.
- The observed PolyForm Noncommercial 1.0.0 terms are a release blocker until the intended distribution/commercial model has been reviewed by qualified counsel.

## Next executable sequence

1. Obtain permission to use a disposable reference deployment of the pinned commit, with no real user data.
2. Capture baseline configuration and exact version/checksum before each run.
3. Execute REF-001–REF-013 first, including bootstrap, auth, account boundaries, subscriptions and protocol formats.
4. Execute network, fallback, mirror, bot and localization scenarios only in isolated test resources.
5. Store sanitized artifacts with timestamp, scenario ID, expected/observed behavior and reviewer.
6. Update the parity matrix only after repeatable outcomes; preserve mismatches as explicit requirements rather than silently adapting the implementation.


## Concurrent-session limit evidence check — 2026-10-30

The pinned 5.0.0 README, GUIDE, package manifest and release metadata were inspected for `max_connections`, connection-limit, and simultaneous-connection descriptions. The user-facing README and GUIDE contain no documented per-account connection-limit contract. `version.json` marks the shipped 1.3 MB `worker.js` artifact as protected and publishes its checksum; no runtime observation is available. Therefore there is **no authoritative documentary evidence** for whether zero means unlimited or deny-all, what a connection counts as, when a slot is released, or how existing sessions behave after a cap change.

Do not infer Nova semantics from imoxy's schema, imoxy's `NULL/0` policy, other proxy projects, or the protected worker artifact. REF-032 records the required black-box scenarios. Current evidence classification: **Not documented / Not run / Not verified**.
