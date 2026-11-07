# Handoff addendum — 2026-11-07

This addendum supplements `HANDOFF.md`; it does not replace or rewrite that file.

## Current worktree

- Workspace: `C:\Users\Ali\imoxy-net-review-worktree`
- Current branch: `test/d1-per-chunk-accounting-2026-11-07`
- Base: `main` at merged PR #207 commit `c38febb0dd1801c76eeb5e508227a549c14a903d`
- Current change: deterministic D1 request-boundary accounting in `test/quota-reservation-store.integration.test.js`.
- Working tree contains the test and handoff addendum changes pending PR #208.

## PR #207 — D1 reservation verification batching (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/207
- Feature head: `340e129303da37280eb9fdf208e4d07f649d1566`
- Squash merge commit: `c38febb0dd1801c76eeb5e508227a549c14a903d`
- `reserveQuota` now executes stale-reservation cleanup, conditional quota claim, and reservation verification SELECT in one D1 batch. The result row is read from the third batch result; immutable reservation identity checks and conflict handling remain intact.
- Exact-head CI passed (runs `42351468314` and `42351472292`); post-merge main CI passed (run `42351504525`).
- Local `cmd.exe /c npm run verify` on the code change: 253 total, 252 passed, 0 failed, 1 existing environment-gated skip.
- No Cloudflare workflow or resources were run or changed.

## Current D1 request-count test

- Instrumented the SQLite D1 test adapter to count external request boundaries without counting SQL statements executed inside one batch as separate requests.
- Added a three-chunk service/storage-path test. Each chunk executes one reservation batch, one conditional forwarding-marker request, and one settlement batch.
- Expected and observed total for three chunks: 9 D1 requests = 6 batches + 3 direct `first()` calls.
- Focused integration test file: 10 passed, 0 failed.
- Full `cmd.exe /c npm run verify`: 254 total, 253 passed, 0 failed, 1 existing environment-gated skip; exit code 0.
- `git diff --check`: passed.
- This is deterministic local adapter accounting only. It does not measure Cloudflare D1 latency or prove the runtime root cause for Run #12. The remaining per-chunk D1 shape is three calls; any further batching must preserve the forwarding boundary and conservative reservation retention semantics.

## Issue #78 / runtime backpressure

- Issue: https://github.com/ijoolaie/imoxy-net/issues/78 (remains open).
- Run #12 failed in slow-reader acceptance after 151,552 / 4,194,304 downstream bytes, with close 1001 `session_duration_exceeded`; disposable Worker and D1 cleanup were verified.
- Per-chunk D1 latency remains a plausible contributor, not a proven root cause. PR #207 removes one reserve-step D1 round trip, but its runtime latency impact has not been measured.
- Bounded Worker-internal downstream buffering remains unproven.
- Do not raise session/resource caps to force acceptance success. Any new Cloudflare smoke run requires fresh, explicit user authorization and must use the disposable workflow path.

## Main HANDOFF.md limitation

- `HANDOFF.md` is 302,410 bytes, exceeding the Raya text read/write limit of 262,144 bytes.
- Direct editing previously failed at the tool size limit. The main file was not rewritten, truncated, or modified through an alternate shell path.
- Keep this dated addendum as the current supplemental handoff until the main file can be safely reorganized using supported tooling.
