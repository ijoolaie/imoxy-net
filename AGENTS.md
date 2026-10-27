# AGENTS.md — imoxy-net project rules

These rules apply to every contributor, coding agent, and maintenance session working in this repository.

## 1. Product goal and scope
- The first goal is behavioral parity with the pinned Nova Proxy reference, not a superficial UI imitation.
- Do not claim parity until the corresponding behavior has reproducible acceptance tests and evidence.
- Keep the web panel, Telegram bot, and Android client on shared domain services and the same authorization/quota rules.
- Support and test these workflows: (1) panel only, (2) Cloudflare resources/settings only, (3) panel plus Cloudflare resources/settings.
- Defer imoxy-specific product changes until the baseline behavior is measured, unless the user explicitly reprioritizes.

## 2. Documentation is mandatory
- Every work session MUST update `HANDOFF.md` before stopping. Record date/time, objective, repository/branch, changes, tests and their exact results, PR/commit links, blockers, decisions, and the next concrete step.
- Update relevant docs in the same change as code. At minimum, keep `docs/parity-matrix.md`, `docs/acceptance-test-plan.md`, `docs/decision-log.md`, and `docs/reference-baseline.md` consistent with the work performed.
- Never write that a test passed unless it was actually run and its result observed. Distinguish verified facts, assumptions, and pending work.
- When a task is interrupted, leave a restartable hand-off with exact paths, branch, commit SHA, and commands/steps for resuming.
- If a required document is missing, create it rather than silently skipping documentation.

## 3. Engineering workflow
- Inspect current repository state, branch, open PRs, and working-tree changes before editing.
- Make small, focused, reviewable changes on a feature/chore branch; do not commit directly to `main` unless explicitly authorized.
- Run the relevant checks locally and/or CI; inspect failures and fix or clearly document them.
- Review the resulting diff and verify the final files/commit before reporting completion.
- Avoid destructive operations, force pushes, production deploys, or live Cloudflare mutations without explicit authorization and a rollback plan.
- Do not merge a PR merely because it is mergeable. Require passing checks and a reviewed diff.

## 4. Compatibility-first development
- Pin the exact reference release and commit before implementing each behavior.
- For each capability, record observable inputs, outputs, state changes, error cases, and side effects.
- Write black-box acceptance tests before implementing the corresponding feature.
- Use protocol specifications and independently authored code. Do not copy protected upstream source, minified/obfuscated worker code, proprietary UI assets, or branding.
- Mark a matrix row `Verified` only after repeatable parity tests pass; otherwise use `Not assessed`, `In progress`, or `Blocked`.

## 5. Licensing and attribution
- Review version-specific license terms before using or distributing any upstream material.
- Do not assume older releases' licenses apply to later versions.
- Stop and request legal review when the intended use may violate noncommercial restrictions or could be a derivative-work issue.
- Keep license decisions and evidence in `docs/license-review.md` and `docs/reference-baseline.md`.

## 6. Security and privacy
- Never commit API keys, tokens, passwords, private keys, production environment files, or real user data.
- Enforce authentication, authorization, quotas, and input validation server-side, not only in the UI.
- Use least privilege, secure session handling, rate limits, and redacted/minimized logs.
- Test negative paths and boundary conditions, including expired/revoked sessions, quota edges, and provider failures.
- Use mocked adapters for Cloudflare mutations until environment, permissions, and rollback are explicitly reviewed.

## 7. Honest status reporting
- State precisely what is implemented, tested, untested, and deployed.
- Never describe scaffolding as a feature-complete product.
- Distinguish GitHub CI results by commit SHA; a successful earlier commit does not prove a later commit passed.
- Do not say a change was merged, deployed, or published without verifying that exact state.

## 8. Schematic progress report at the end of every response
- Every user-facing response about work on this repository MUST end with a compact schematic progress report, including interim replies, status updates, and partial completions. Do not omit it merely because the task is unfinished.
- The report MUST show overall project progress and progress for each roadmap phase (Phase 0 through Phase 13) using a compact visual status bar or table. Use consistent status labels: `Not started`, `In progress`, `Blocked`, `Complete`. Use percentage estimates only when they are evidence-based; otherwise use status labels and clearly avoid implying measured completion.
- Show the current active phase, its concrete completed items, remaining work, and blockers. Distinguish verified work from assumptions and untested work.
- Base phase status on `docs/roadmap.md`, acceptance evidence, current repository state, and CI results for the exact commit. A passing foundation CI does not mean later phases or product parity are complete.
- Keep the schematic concise enough to append to every response, but include all phases every time. Update `docs/roadmap.md` when a phase status changes materially, and keep `HANDOFF.md` aligned before ending the work session.
- Suggested format: overall status, active phase, then a compact Phase 0–13 row/list with status symbols and labels. Do not mark a phase complete without meeting its exit gate.

## 9. Session completion checklist
- [ ] Code and docs reflect the same state.
- [ ] Tests/checks run; results recorded with commit SHA.
- [ ] Diff and repository state inspected.
- [ ] `HANDOFF.md` updated with next steps.
- [ ] PR/commit links recorded.
- [ ] No unsupported completion or parity claims.
