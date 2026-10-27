# imoxy-net

An independently implemented, behavior-compatible proxy management platform.

## Current status

This repository is a foundation, not a feature-complete replacement yet. Only the health endpoint is implemented. Proxy protocols, authentication, subscriptions, Cloudflare provisioning, bot, website and APK are not implemented until they have passing acceptance tests.

## Development

Requires Node.js 22+.

```sh
npm test
npm run check
```

## Product compatibility target

The initial target is behavioral parity with the selected Nova Proxy reference release, followed by separately approved imoxy-specific changes. See [the parity matrix](docs/parity-matrix.md), [architecture](docs/architecture.md), and [license review](docs/license-review.md).

Do not copy third-party source or assets without confirming the applicable license. Implement the required behavior independently and record evidence for each parity claim.

## Interfaces and workflows

Planned interfaces: Telegram bot, web panel, and Android APK.

Planned workflows:
1. Panel only.
2. Cloudflare resources/settings only.
3. Panel plus Cloudflare resources/settings.

All interfaces must use the same domain services and authorization rules.
