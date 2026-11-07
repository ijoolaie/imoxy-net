# Handoff addendum — 2026-11-07

This addendum supplements `HANDOFF.md`; it does not replace or rewrite that file.

## Current worktree

- Workspace: `C:\Users\Ali\imoxy-net-review-worktree`
- Current branch: `docs/handoff-post-pr208-2026-11-07`
- Base: `main` at `ccda78bf3cd439703880197a85173975e0c025c4`
- This branch contains only the post-merge handoff reconciliation for PR #208.

## PR #207 — D1 reservation verification batching (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/207
- Feature head: `340e129303da37280eb9fdf208e4d07f649d1566`
- Squash merge commit: `c38febb0dd1801c76eeb5e508227a549c14a903d`
- `reserveQuota` executes stale-reservation cleanup, conditional quota claim, and reservation verification SELECT in one D1 batch. The result row is read from the third batch result; immutable reservation identity checks and conflict handling remain intact.
- Exact-head CI passed (runs `42351468314` and `42351472292`); post-merge main CI passed (run `42351504525`).
- Local `cmd.exe /c npm run verify` on the code change: 253 total, 252 passed, 0 failed, 1 existing environment-gated skip.
- No Cloudflare workflow or resources were run or changed.

## PR #208 — deterministic per-chunk D1 request-count guard (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/208
- Feature head: `ccfcf9dee7ac527bdc8feb09cd456deb78405332`
- Squash merge commit: `ccda78bf3cd439703880197a85173975e0c025c4`
- Instrumented the SQLite-backed D1 test adapter to count external request boundaries separately from SQL statements inside a batch.
- A three-chunk quota lifecycle test asserts 9 D1 requests total: 6 batches (reserve + settlement per chunk) and 3 direct `first()` calls for forwarding markers.
- Focused integration file: 10 passed, 0 failed.
- Full `cmd.exe /c npm run verify`: 254 total, 253 passed, 0 failed, 1 existing environment-gated skip.
- Both exact-head CI checks passed (runs `42351772571` and `42351779276`); post-merge main CI passed (run `42351852848`).

## Current D1 request shape and limitations

- After PR #207, each successful quota chunk has three D1 request boundaries: one reserve batch, one conditional forwarding-marker request, and one settlement batch.
- PR #208 guards this request count deterministically in the local SQLite adapter. It does not measure Cloudflare D1 latency or establish the cause of Run #12's 30-second cutoff.
- Any further batching must preserve the forwarding boundary, immutable reservation/event identity checks, fail-closed behavior, and conservative retention of ambiguous forwarding-marked reservations.

## Issue #78 / runtime backpressure

- Issue: https://github.com/ijoolaie/imoxy-net/issues/78 (remains open).
- Run #12 failed in slow-reader acceptance after 151,552 / 4,194,304 downstream bytes, with close 1001 `session_duration_exceeded`; disposable Worker and D1 cleanup were verified.
- D1 latency remains a plausible contributor, not a proven root cause.
- Bounded Worker-internal downstream buffering remains unproven.
- Do not raise session/resource caps to force acceptance success. Any new Cloudflare smoke run requires fresh, explicit user authorization and must use the disposable workflow path.

## Main HANDOFF.md limitation

- `HANDOFF.md` is 302,410 bytes, exceeding the Raya text read/write limit of 262,144 bytes.
- Direct editing previously failed at the tool size limit. The main file was not rewritten, truncated, or modified through an alternate shell path.
- Keep this dated addendum as the current supplemental handoff until the main file can be safely reorganized using supported tooling.
