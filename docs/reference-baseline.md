# Reference baseline

This document pins the first black-box characterization target. It does not authorize copying source code, assets, branding, or protected panel implementation.

- Repository: https://github.com/IRNova/Nova-Proxy
- Observed version in upstream `package.json` and README badge: **5.0.0**
- Pinned reference commit: `ad2116aa89f8c7db8248f8142c1432900d835eb7`
- Commit date: 2026-10-21
- License file observed on upstream `main`: **PolyForm Noncommercial 1.0.0**
- Upstream README states releases through 4.2.0 were MIT; Nova-authored changes from 4.3.0 onward are under PolyForm Noncommercial.
- Upstream license includes required copyright and commercial-use notice; commercial use, resale, paid redistribution and paid hosted access require a separate written commercial license.

## Implementation constraint

The imoxy goal is behavioral compatibility using an independent implementation. Do not copy the upstream minified/obfuscated worker or protected panel source. Derive test cases from externally observable behavior, protocol specifications, and documented user-facing behavior. Keep a record of the source of each requirement and obtain legal review if a planned implementation could be considered a derivative work or if the project's intended distribution model changes.

## Known baseline caveat

Upstream README's summary and release-notes paragraph have historically shown inconsistent version text. For this baseline, use the pinned commit and `package.json` version as the release identifier; re-check before beginning the detailed parity phase.
