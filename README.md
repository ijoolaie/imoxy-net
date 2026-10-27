# imoxy-net

An independently implemented proxy-management platform targeting evidence-based behavioral compatibility with Nova Proxy 5.0.0. This repository is under active development and is **not yet a complete or production-certified replacement**.

## Current implementation

- Versioned Worker API with health/capability reporting, secure authentication/session routes, initial role-based authorization, account CRUD, quota/usage foundations, subscription lifecycle, and provisional VLESS/Trojan/Shadowsocks URI and Clash configuration generators.
- D1-oriented persistence adapters and migrations, with Node/SQLite schema tests. Real Cloudflare D1 deployment, backup/restore and concurrency behavior still require validation.
- Read-only Cloudflare inventory and dry-run planning; no provider apply/write route is present.
- Initial responsive web panel for login, account listing/creation, usage summaries and Cloudflare preview. Browser E2E and deployed Worker validation remain pending.
- Telegram bot and Android APK are not complete. No Nova runtime parity or production deployment is claimed.

## Roadmap and engineering records

- [Phased product roadmap and exit gates](docs/roadmap.md)
- [Behavioral parity matrix](docs/parity-matrix.md)
- [Versioned API contract](docs/api-contract.md)
- [Security model and threat assessment](docs/security-model.md)
- [Quota policy and usage accounting limits](docs/quota-policy.md)
- [Reference scenarios](docs/reference-scenarios.md)
- [Protocol and subscription output compatibility](docs/protocol-compatibility.md)
- [Cloudflare integration and operating modes](docs/cloudflare-integration.md)
- [Web panel implementation and limitations](docs/web-panel.md)
- [Acceptance-test plan](docs/acceptance-test-plan.md)
- [Architecture](docs/architecture.md)
- [Reference baseline](docs/reference-baseline.md)
- [License review](docs/license-review.md)
- [Decision log](docs/decision-log.md)
- [Living hand-off](HANDOFF.md)
- [Engineering rules](AGENTS.md)

## Development

Requires Node.js 22 or later.

```sh
npm run verify
```

The verification command runs syntax checks and the Node test suite. The SQLite tests use Node's experimental SQLite support where required.

## Product compatibility target

The initial target is behavioral parity with the pinned reference release, followed by separately approved imoxy-specific improvements. The pinned reference and observed licensing terms are documented in [the reference baseline](docs/reference-baseline.md) and [license review](docs/license-review.md).

Implement behavior independently. Do not copy upstream source, protected assets or branding. Do not claim a capability is compatible until repeatable reference comparisons and acceptance tests support that claim.

## Interfaces and operating modes

Target interfaces: web panel, Telegram bot and Android APK. They must share the same API, domain services, authorization and quota rules.

Required operating modes:
1. Panel only.
2. Cloudflare resources/settings only.
3. Panel plus Cloudflare resources/settings.

Cloudflare integration currently supports read-only inventory and dry-run planning only. No live deployment or Cloudflare mutation has been performed.
