# imoxy-net

An independently implemented, behavior-compatible proxy management platform.

## Current status

This repository is a foundation, not a feature-complete replacement yet. Only the health endpoint is implemented. Proxy protocols, authentication, subscriptions, Cloudflare provisioning, bot, website and APK are not implemented until they have passing acceptance tests.

## Roadmap and engineering records

- [Phased product roadmap and exit gates](docs/roadmap.md)
- [Behavioral parity matrix](docs/parity-matrix.md)
- [Acceptance-test plan](docs/acceptance-test-plan.md)
- [Architecture](docs/architecture.md)
- [Reference baseline](docs/reference-baseline.md)
- [License review](docs/license-review.md)
- [Decision log](docs/decision-log.md)
- [Living hand-off](HANDOFF.md)
- [Engineering rules](AGENTS.md)

## Development

Requires Node.js 22+.

```sh
npm test
npm run check
```

## Product compatibility target

The initial target is behavioral parity with the selected reference release, followed by separately approved imoxy-specific changes. The pinned reference is documented in [the reference baseline](docs/reference-baseline.md).

Do not copy third-party source or assets without confirming the applicable license. Implement required behavior independently and record evidence for each parity claim.

## Interfaces and workflows

Planned interfaces: Telegram bot, web panel, and Android APK.

Planned workflows:
1. Panel only.
2. Cloudflare resources/settings only.
3. Panel plus Cloudflare resources/settings.

All interfaces must use the same domain services and authorization rules.
