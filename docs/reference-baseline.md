# Reference baseline

This document pins the first black-box characterization target. It does not authorize copying source code, assets, branding, or protected panel implementation.

- Repository: https://github.com/IRNova/Nova-Proxy
- Version: **5.0.0**
- Release date in upstream `version.json`: 2026-10-21
- Pinned reference commit: `ad2116aa89f8c7db8248f8142c1432900d835eb7`
- Upstream `worker.js` SHA-256 published in both `version.json` and `SHA256SUMS`: `239f1b358c1a511da1bf0103c995d746a55b6d532ed9af1ead1febeac4566935`
- License file observed on upstream `main`: **PolyForm Noncommercial 1.0.0**
- Upstream README states releases through 4.2.0 were MIT; Nova-authored changes from 4.3.0 onward are under PolyForm Noncommercial.
- Upstream license includes required copyright and commercial-use notice; commercial use, resale, paid redistribution and paid hosted access require a separate written commercial license.

## Feature changes to test in 5.0.0

- ECH key resolver defaults to plain DNS at `1.1.1.1`; old AliDNS/empty settings migrate on load.
- Optional decoy SNI for raw VLESS and Trojan TLS links; off by default and excluded from Clash, sing-box, Shadowsocks and plaintext outputs.
- Per-host exposure/risk labels, no-custom-domain warnings, and an admin audit view of what each config format sends.
- Subscription responses include endpoint-host and risk-class headers; unhealthy-host fallback behavior uses the configured endpoint host.
- Resistance Policy adds Enhanced fragment and removes the ECH warning.
- Dashboard activity list is bounded/scrollable.

These are documented behaviors and test hypotheses, not yet independently verified against a live reference instance.

## Source evidence and status

- Pinned README: https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/README.md
- Pinned package manifest: https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/package.json
- Pinned deployment guide: https://github.com/IRNova/Nova-Proxy/blob/ad2116aa89f8c7db8248f8142c1432900d835eb7/DEPLOY.md
- The feature inventory and source/evidence distinctions are maintained in [reference-evidence.md](reference-evidence.md).
- The prioritized executable scenarios now cover bootstrap/auth, accounts/quotas, subscriptions/protocols, network/fallback, bot, install/update, localization and client import. All remain **Not run** against a live pinned runtime.
- Repository API/domain tests are evidence of imoxy behavior only; they do not establish Nova compatibility.
- Imoxy's Telegram webhook currently ignores non-private chats before replay-claiming or sending a reply, to reduce accidental disclosure of account metadata. This is an independently chosen security safeguard, not a parity claim; REF-020 remains unrun against Nova.

## Implementation constraint

The imoxy goal is behavioral compatibility using an independent implementation. Do not copy the upstream minified/obfuscated worker or protected panel source. Derive test cases from externally observable behavior, protocol specifications, and documented user-facing behavior. Keep a record of the source of each requirement and obtain legal review if a planned implementation could be considered a derivative work or if the project's intended distribution model changes.

## Known baseline caveat

Upstream README's summary and release-notes paragraph have historically shown inconsistent version text. For this baseline, use the pinned commit, `version.json`, and `package.json` version as the release identifier; re-check before beginning the detailed parity phase.


## Authentication implementation note — 2026-10-27

An imoxy-only regression fix ensures successful login clears each IP/username rate-limit key separately. It does not establish equivalence with Nova Proxy; REF-003–004 remain pending live black-box characterization.


## Usage accounting implementation note — 2026-10-27

Imoxy rejects a combined upload/download delta that exceeds the JavaScript safe-integer range before persistence. This is a defensive implementation choice, not verified Nova behavior; REF-007–008 remain pending.


## Usage counter hardening note — 2026-10-27

The imoxy D1 adapter now rejects combined deltas outside the safe-integer range and guards per-day aggregate updates against safe-integer overflow. This is a defensive storage behavior, not a Nova compatibility finding. REF-006–008 remain unrun against the pinned runtime; real D1 behavior and replay/idempotency semantics remain unverified.


## Schema counter guard note — 2026-10-27

Imoxy migration 0004 adds schema-level triggers rejecting daily usage counters or combined daily bytes above JavaScript's safe-integer range. This is an imoxy storage-integrity choice, not a verified Nova behavior. Migration tests use SQLite; Cloudflare D1 compatibility and pinned-reference accounting semantics remain unverified.
