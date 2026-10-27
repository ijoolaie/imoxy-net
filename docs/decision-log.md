# Decision log

## 2026-10-27 — parity before customization

The first milestone is behavioral parity with a pinned reference release. Imoxy-specific features are deferred until parity is measured and the applicable license terms are reviewed.

## 2026-10-27 — shared domain logic

The Telegram bot, web panel and Android client must share domain services and authorization/quotas. The three supported workflows are panel only, Cloudflare resources/settings only, and panel plus Cloudflare resources/settings.

## 2026-10-27 — honest capability reporting

Unimplemented endpoints must not return fake success. Current implementation is intentionally limited to health and capability reporting.
