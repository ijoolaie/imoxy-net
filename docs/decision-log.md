# Decision log

## 2026-10-27 — parity before customization

The first milestone is behavioral parity with a pinned reference release. Imoxy-specific features are deferred until parity is measured and the applicable license terms are reviewed.

## 2026-10-27 — shared domain logic

The Telegram bot, web panel and Android client must share domain services and authorization/quotas. The three supported workflows are panel only, Cloudflare resources/settings only, and panel plus Cloudflare resources/settings.

## 2026-10-27 — honest capability reporting

Unimplemented endpoints must not return fake success. Capability reporting distinguishes implemented initial slices from pending full workflows. Implementation status is not a claim of Nova compatibility.

## 2026-10-27 — schema separates admin principals from proxy accounts

The initial D1 schema separates control-plane principals/sessions from end-user proxy accounts. Subscription tokens are represented by hashes; provider resource metadata excludes provider credentials. This is a proposed imoxy data model pending migration, threat-model, and reference-compatibility validation.

## 2026-10-27 — documented feature list is not runtime evidence

The pinned README, package manifest, license and deployment guide are recorded as source evidence. The prioritized black-box scenarios are hypotheses until executed against an authorized instance of the pinned release. No reference behavior is marked verified.

## 2026-10-27 — parameterized D1 access and audited mutations

Account persistence uses prepared statements and a fixed field-to-column allowlist. Mutations require an audit event and use D1 batch operations to keep the account write and audit insert together. Current tests use a mocked D1-compatible binding; real D1 migration and concurrency behavior still require integration validation.

## 2026-10-27 — provisional UTC quota accounting

The first quota policy evaluates total and daily usage in UTC, treats null limits as unlimited and equality with the quota as allowed. This is an imoxy baseline, not a Nova parity claim. REF-006–008 must establish upstream expiry/quota boundaries, timezone and accounting semantics before compatibility is frozen. Hard enforcement is blocked on data-plane integration and atomic reservation/idempotency design.

## 2026-10-27 — subscription tokens are random, hash-at-rest credentials

The subscription service returns a cryptographically random token once and persists only its SHA-256 hash. Revocation is idempotent, links are invalid when either the subscription or account is expired/disabled, and a subscription cannot outlive the account. Auto and Base64 output are provisional clean-room formats; the public route and reference compatibility remain pending.

## 2026-10-27 — Cloudflare integration starts read-only

The first provider client is deliberately GET-only. Inventory and deterministic dry-run planning are exposed behind provider permissions, with no apply or delete endpoint. Live provider validation, least-privilege scope verification, idempotent mutations and rollback must be completed before any write capability is considered.

## 2026-10-27 — interfaces are thin clients over the shared API

The web panel and Android client use the same versioned Worker API. The initial Telegram webhook calls the shared account domain service for read-only listing and has an explicit allowlist. The Telegram allowlist is an interim bootstrap control, not a substitute for durable per-principal account linking; mutating bot commands remain blocked until linking, audit and replay protections are implemented.

## 2026-10-27 — Android token storage uses platform Keystore

The initial Android client stores a bearer token encrypted with AES-GCM under a key managed by Android Keystore. It requires HTTPS and disables authenticated redirects, app backup and cleartext traffic. Device-level validation, release signing and threat review remain required.


## 2026-10-27 — Telegram commands are private-chat-only

The webhook ignores every non-private chat before claiming the update ID or sending a reply, including when the sender is allowlisted. This is an imoxy security/privacy safeguard to avoid exposing account metadata in group conversations; it is not asserted to match Nova Proxy behavior. A regression test covers an allowlisted sender invoking `/accounts` in a supergroup. Main CI passed on `12cfb9f7e8c3f01a07346165bfdeb28c684893da` (run 40495393858). Live Telegram and pinned-reference tests remain pending.


## 2026-10-27 — clear all authentication rate-limit dimensions on successful login

Login attempts are counted against separate HMAC-derived IP and normalized-username keys. A successful login must clear each key independently, not pass the key array to storage as a single key. A regression test asserts all counters are removed. This is an imoxy implementation correction; upstream rate-limit semantics remain uncharacterized.


## 2026-10-27 — reject overflowing combined usage deltas before persistence

Usage reporting validates that upload and download byte deltas individually are non-negative safe integers and that their sum is also a safe integer. Overflow is rejected before storage to avoid precision loss or invalid accounting. This is an imoxy data-integrity safeguard; quota/reporting behavior still requires reference characterization and data-plane integration.


## 2026-10-27 — guard daily usage upserts against counter overflow

The D1 usage adapter validates the combined upload/download delta and uses a conditional atomic upsert so a daily row is not incremented beyond the JavaScript safe-integer range. A zero-row result is surfaced as a range error rather than silently accepted. This protects daily counters but does not make quota enforcement atomic across check-and-forward operations and does not deduplicate retried reports. Idempotency requires a stable caller-provided event ID and an event ledger/unique constraint; inventing one at the service boundary would not deduplicate real retries. Real D1 validation remains required.
