# Handoff addendum — 2026-11-07

This addendum supplements `HANDOFF.md`; it does not replace or rewrite that file.

## Current worktree

- Workspace: `C:\Users\Ali\imoxy-net-review-worktree`
- Current feature branch: `test/forwarding-close-race-2026-11-07`
- Base: `main` at `e192687988d4ee036c58470c9bfeb8686f604121`
- Current change: deterministic close-vs-forwarding-marker race test and post-marker closed-state guard; PR creation/CI pending.

## PR #207 — D1 reservation verification batching (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/207
- Feature head: `340e129303da37280eb9fdf208e4d07f649d1566`
- Squash merge commit: `c38febb0dd1801c76eeb5e508227a549c14a903d`
- `reserveQuota` executes stale-reservation cleanup, conditional quota claim, and reservation verification SELECT in one D1 batch. Identity/conflict checks remain intact.
- Exact-head CI passed (runs `42351468314` and `42351472292`); post-merge main CI passed (run `42351504525`).
- Local verify on the code change: 253 total, 252 passed, 0 failed, 1 existing environment-gated skip.

## PR #208 — deterministic per-chunk D1 request-count guard (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/208
- Feature head: `ccfcf9dee7ac527bdc8feb09cd456deb78405332`
- Squash merge commit: `ccda78bf3cd439703880197a85173975e0c025c4`
- SQLite-backed D1 test adapter counts external request boundaries separately from SQL statements inside a batch.
- Three successful quota chunks assert 9 D1 requests total: 6 batches (reserve + settlement per chunk) and 3 direct forwarding-marker calls.
- Focused integration file: 10 passed. Full local verify: 254 total, 253 passed, 0 failed, 1 existing environment-gated skip.
- Exact-head CI passed (runs `42351772571` and `42351779276`); post-merge main CI passed (run `42351852848`).

## PR #209 — handoff reconciliation (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/209
- Feature head: `058ef175c478f9fabe84f8b2542ef9f83f9fdeec`
- Squash merge commit: `e192687988d4ee036c58470c9bfeb8686f604121`
- Updated this supplemental handoff with PR #207/#208 outcomes, exact CI evidence, D1 request shape, and Issue #78 limitations.
- Exact-head CI passed (run `42352171383`); post-merge main CI passed (run `42352193572`).

## Current D1 request shape and limitations

- After PR #207, each successful quota chunk has three D1 request boundaries: one reserve batch, one conditional forwarding-marker request, and one settlement batch.
- PR #208 guards this request count deterministically in the local SQLite adapter. It does not measure Cloudflare D1 latency or establish the cause of Run #12's 30-second cutoff.
- Further batching must preserve the forwarding boundary, immutable reservation/event identity checks, fail-closed behavior, and conservative retention of ambiguous forwarding-marked reservations.

## Current close-vs-forwarding-marker race finding

- A new deterministic test delayed `markForwarding`, closed the WebSocket while the D1 marker call was pending, then resolved the marker operation.
- Before the fix, the test failed: after closure, the handler still called `server.send()` and emitted the downstream payload.
- Fix: after a successful marker result, the handler now re-checks `state.closed` before transport I/O. If already closed, it returns without sending or settling.
- The reservation is deliberately **not released** in this case: the forwarding marker may have committed, so conservative retention remains required.
- Complementary test covers closure while `reserve` is pending: after reserve returns, the handler releases the still-unmarked reservation and never calls `markForwarding`.
- Targeted race test passed after the fix; full handler test file: 65 passed, 0 failed.
- Full `cmd.exe /c npm run verify`: 256 total, 255 passed, 0 failed, 1 existing environment-gated skip; exit code 0.
- `git diff --check`: passed before commit.

## Issue #78 / runtime backpressure

- Issue: https://github.com/ijoolaie/imoxy-net/issues/78 (remains open).
- Run #12 failed in slow-reader acceptance after 151,552 / 4,194,304 downstream bytes, with close 1001 `session_duration_exceeded`; disposable Worker and D1 cleanup were verified.
- D1 latency remains a plausible contributor, not a proven root cause.
- The new close-race fix is local deterministic lifecycle evidence; it does not establish bounded Worker-internal downstream buffering or prove Run #12's root cause.
- Do not raise session/resource caps to force acceptance success. Any new Cloudflare smoke run requires fresh, explicit user authorization and must use the disposable workflow path.

## Main HANDOFF.md limitation

- `HANDOFF.md` is 302,410 bytes, exceeding the Raya text read/write limit of 262,144 bytes.
- Direct editing previously failed at the tool size limit. The main file was not rewritten, truncated, or modified through an alternate shell path.
- Keep this dated addendum as the current supplemental handoff until the main file can be safely reorganized using supported tooling.
