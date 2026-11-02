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


## Quota integration boundary audit — 2026-10-28

Source inspection found that the quota domain service is not wired into the HTTP API, while the API capability report still lists quota enforcement and usage accounting as pending. No trusted proxy/data-plane event producer was identified in the inspected source tree. The current usage table and overflow guards are control-plane storage foundations only; they do not establish measured proxy traffic, pre-forwarding quota enforcement, replay safety, or Nova parity. REF-007–008 remain unrun against the pinned Nova Proxy 5.0.0 runtime. Do not implement authoritative usage ingestion from arbitrary client reports; define the trusted producer and stable event-ID/retry contract first.

### Connected-peer address validation evidence — 2026-10-28

PR #62 strict IPv6 syntax validation passed exact-head CI and post-merge main CI. PR #63 expands connected-peer classification to normalized IPv6 and selected special-purpose ranges; its exact-head CI was pending at handoff time. These are implementation/security regression tests only. No authorized Nova runtime comparison or real Cloudflare Worker/D1 validation was performed; the corresponding parity rows must remain unverified.

## VLESS backpressure status — 2026-10-28

A 1 MiB downstream WebSocket buffered-byte guard is an imoxy safety decision. It has not been observed in the pinned Nova Proxy runtime and must not be presented as compatible behavior. The Cloudflare Worker `bufferedAmount` behavior and real slow-client behavior remain unverified pending a disposable Worker smoke test and authorized reference comparison.

## Correction — no downstream backpressure parity claim

The previously described `bufferedAmount` guard is not valid evidence of Cloudflare Worker behavior because that property is absent from the documented Worker WebSocket properties. Follow-up PR #77 removes the unsupported assumption. Downstream flow control and Nova reference behavior remain unverified.


## Imoxy VLESS session budget policy — 2026-10-30

A per-session cumulative download-byte budget and maximum session lifetime are being implemented as an imoxy fail-closed resource policy because the documented Workers WebSocket API does not expose an authoritative send-buffer/drain signal. The policy is not attributed to Nova Proxy 5.0.0 and must not be counted as behavioral parity. The corresponding Nova slow-client, termination, quota and concurrency semantics remain uncharacterized.


## Post-merge status correction — 2026-10-30

The per-session download-byte and maximum-lifetime policy described above is now merged into main as b5c44b16132c9f540de16ab9d4ce54ab5fa01fa4 (PR #104). Post-merge main CI run 41037834214 passed on that exact commit. This does not change the parity status: the policy is imoxy-specific, Worker-internal WebSocket buffering remains unproven, aggregate concurrent-session bounds remain open, and no live Worker/D1 or Nova runtime test has been run.


## Concurrent-session compatibility gap — 2026-10-30

The imoxy VLESS handler currently does not enforce the persisted `max_connections` account field or an installation-wide concurrent-session ceiling. This is an implementation gap, not a finding about Nova Proxy behavior. The pinned Nova runtime's exact cap semantics, boundary behavior, and treatment of already-open sessions remain uncharacterized. REF scenarios and repeatable black-box comparison are required before any parity claim.


## Concurrent-session implementation update — 2026-10-30

Imoxy now enforces an installation-wide VLESS session ceiling and an account-level cap for positive `max_connections` values through D1 leases (PR #108). This is implementation evidence only, not Nova compatibility evidence. The pinned Nova Proxy 5.0.0 artifact is protected/minified and the exact behavior of `max_connections = 0`, including whether zero means unlimited or deny-all, has not been characterized. Keep the parity row unverified until the reference runtime or authoritative source establishes the semantics and boundary behavior.


## Concurrent-session limit — evidence gap (2026-10-30)

The pinned Nova 5.0.0 README and GUIDE do not document a per-account `max_connections` contract or define the zero value. The pinned `version.json` marks the shipped worker artifact as protected; the release metadata, package manifest and user guide are not evidence of its runtime semantics. Do not infer whether zero means unlimited or deny-all, what counts as one connection, or how existing sessions are handled when a limit changes. REF-032 defines the required controlled black-box scenarios. Status remains **Not documented / Not run / Not verified**.


## Cloudflare VLESS remote-runtime evidence boundary — 2026-11-02

A Wrangler 4.156.0 remote-preview execution of imoxy's actual VLESS handler/module graph passed 3/3 WebSocket handshakes and 3/3 synthetic relay sessions using in-memory TCP and fake store/quota adapters; a paused-reader probe later received the complete 4 MiB payload. This is evidence about imoxy's current implementation on one Cloudflare remote-preview path only. It is not evidence about Nova Proxy 5.0.0, does not make any parity row Verified, and does not cover D1 binding, real TCP, or internal WebSocket buffer limits.


## 2026-11-02 — next Cloudflare runtime acceptance harness (not yet executed)

A manually gated workflow has been prepared to run the actual VLESS handler/module graph under Wrangler remote preview with a disposable Worker-bound D1 database and a Worker-to-Worker TCP Echo Service Binding. D1 migrations are applied through the Cloudflare D1 API; the echo Worker is deployed with Wrangler and has no public URL or route. The harness expects exact bidirectional byte counts, D1 quota settlement, and session lease release, followed by deletion and inventory verification of only run-owned resources.

This is a reproducible acceptance harness design, not runtime evidence. It has not been dispatched; no new Cloudflare Worker/D1 runtime result exists. It does not test Nova Proxy 5.0.0 and must not change any parity row to Verified.
