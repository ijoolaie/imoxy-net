# Phase 0 governance audit

**Audit date:** 2026-11-06  
**Audited base:** `main` at `63076f575d62217048d03d906ae4751551cf5f90` (PR #195 merge)  
**Working branch:** `docs/phase0-governance-audit-20261106`  
**Scope:** repository policy, licensing evidence, CI reproducibility, security reporting, and GitHub delivery controls. Read-only inspection plus local verification; no deployment or provider mutation.

## Verified controls

| Area | Evidence | Result |
|---|---|---|
| Contributor/agent rules | `AGENTS.md` | Present; requires feature branches, exact-head CI, honest evidence, docs/handoff updates, and no unauthorized live operations. |
| Security policy | `SECURITY.md` | Present; asks for private/coordinated disclosure and prohibits committing secrets/configuration. |
| Project status disclosure | `README.md` | Clearly states the product is incomplete and not production-certified; documents major implementation/runtime limitations. |
| Roadmap and acceptance records | `docs/roadmap.md`, parity matrix, acceptance plan, decision log, reference baseline, `HANDOFF.md` | Present and linked from README. Roadmap correctly keeps phases 0–11 in progress, phase 12 blocked, and phase 13 not started. |
| JavaScript verification | `package.json`, `.github/workflows/ci.yml` | `npm run verify` is the CI command; Node 22 is declared. |
| Local verification | 2026-11-06 run on base SHA above | `cmd.exe /c npm run verify` exit 0; syntax checks passed; 240 tests total, 239 passed, 0 failed, 1 skipped (opt-in local TCP integration). |
| Test failure posture | Test output | No failed tests; one intentionally opt-in integration test was skipped and is not counted as runtime acceptance. |
| Android CI definition | `.github/workflows/android.yml` | Debug APK build workflow exists; it is not a signed release. Local build could not be run because `gradle` is not installed/on PATH in this workspace. |
| Cloudflare smoke guard | `.github/workflows/vless-cloudflare-smoke.yml` | Manual dispatch only; requires a boolean confirmation, main ref, and a bounded disposable smoke script. This audit did not dispatch it. |
| Secret/config ignore rules | `.gitignore` | Ignores `.env`, `.env.*`, Wrangler state, build outputs, and common local artifacts. Ignore rules are not a substitute for scanning repository history or secret rotation. |
| JavaScript dependencies | `package.json` | No npm runtime/dev dependencies are declared. |
| Android dependency declarations | `app/build.gradle.kts` | No app library dependencies are currently declared; Android Gradle plugins are versioned in the root build file. |

## Gaps and unresolved controls

1. **Project license is not declared.** No root `LICENSE` file was present in the repository listing. Do not infer that the project is MIT/open-source or that third-party reference terms grant rights to this repository. The project owner must select and approve the imoxy-net license before public distribution.
2. **Reference distribution rights are unresolved.** `docs/reference-baseline.md` pins Nova Proxy 5.0.0 at `ad2116aa89f8c7db8248f8142c1432900d835eb7` and records the observed upstream PolyForm Noncommercial 1.0.0 terms. The existing `docs/license-review.md` release gate remains unchecked. Any commercial use, paid hosting, resale, or redistribution requiring separate permission remains blocked pending written legal clearance from the rights holder and appropriate legal review. Do not copy protected upstream source/assets.
3. **Branch protection could not be verified.** GitHub's branch-protection endpoint returned HTTP 403 (integration permission unavailable). This is unknown, not proof that protection is disabled. Repository owner should verify required PR reviews, required status checks, up-to-date branch policy, and restrictions on direct pushes to `main` in GitHub Settings.
4. **No CODEOWNERS file was present** in the inspected `.github` tree. Ownership/review routing is therefore not documented in-repository. Add CODEOWNERS only after the owner confirms the intended reviewers.
5. **Security reporting route is underspecified.** `SECURITY.md` requests private disclosure but does not give a dedicated contact address or confirm that GitHub private vulnerability reporting is enabled. Owner should configure one private reporting route and document it without publishing secrets.
6. **Workflow action references use mutable major tags** (for example `actions/checkout@v4`, `actions/setup-node@v4`). Consider pinning third-party actions to verified full commit SHAs and using Dependabot updates; this audit did not change workflow supply-chain policy.
7. **Local Android build is unverified.** The Android workflow is configured, but local `gradle --no-daemon :app:assembleDebug` could not start because Gradle is unavailable on this machine. Require a successful Android Actions run for Android changes and retain artifact provenance.
8. **Push CI branch filters omit `docs/**`.** The CI workflow runs on pull requests to main, so documentation PRs receive PR CI; direct push runs on docs branches are not configured. This is acceptable under the PR-only workflow but should remain intentional.

## Decisions and next actions

- Keep Phase 0 **In progress**; do not mark it complete.
- Keep Phase 1 and Release blocked from distribution claims until the version-specific upstream license and intended project distribution/commercial model receive a documented legal decision.
- Owner action required: decide the imoxy-net repository license; confirm the project's distribution/commercial intent; verify main branch protection; configure a private vulnerability-reporting route; confirm CODEOWNERS/reviewer policy.
- Engineering follow-up: pin workflow actions to verified SHAs and configure automated dependency updates in a separate reviewed change.
- Local check result above is repository test evidence only; it does not establish Android build success, Cloudflare runtime acceptance, Nova parity, legal clearance, or production readiness.
- No Cloudflare workflow, Worker, D1, DNS, route, secret, or existing staging/production resource was changed during this audit.
