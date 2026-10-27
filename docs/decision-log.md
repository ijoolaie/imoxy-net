# Decision log

## 2026-10-27 — parity before customization

The first milestone is behavioral parity with a pinned reference release. Imoxy-specific features are deferred until parity is measured and the applicable license terms are reviewed.

## 2026-10-27 — shared domain logic

The Telegram bot, web panel and Android client must share domain services and authorization/quotas. The three supported workflows are panel only, Cloudflare resources/settings only, and panel plus Cloudflare resources/settings.

## 2026-10-27 — honest capability reporting

Unimplemented endpoints must not return fake success. Current implementation is intentionally limited to health and capability reporting.

\n## 2026-10-27 — schema separates admin principals from proxy accounts\n\nThe initial D1 schema separates control-plane principals/sessions from end-user proxy accounts. Subscription tokens are represented by hashes; provider resource metadata excludes provider credentials. This is a proposed imoxy data model pending migration, threat-model, and reference-compatibility validation.\n\n## 2026-10-27 — documented feature list is not runtime evidence\n\nA prioritized black-box scenario inventory was added from the pinned README feature claims. These are hypotheses only until executed against an authorized instance of the pinned release. No reference behavior is marked verified.\n

## 2026-10-27 — parameterized D1 access and audited mutations

Account persistence uses prepared statements and a fixed field-to-column allowlist. Mutations require an audit event and use D1 batch operations to keep the account write and audit insert together. Current tests use a mocked D1-compatible binding; real D1 migration and concurrency behavior still require integration validation.


## 2026-10-27 — provisional UTC quota accounting

The first quota policy evaluates total and daily usage in UTC, treats null limits as unlimited and equality with the quota as allowed. This is an imoxy baseline, not a Nova parity claim. REF-006–008 must establish upstream expiry/quota boundaries, timezone and accounting semantics before compatibility is frozen. Hard enforcement is blocked on data-plane integration and atomic reservation/idempotency design.
