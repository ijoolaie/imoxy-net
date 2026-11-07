# Handoff addendum — 2026-11-07

This addendum supplements `HANDOFF.md`; it does not replace or rewrite that file.

## Current worktree

- Workspace: `C:\Users\Ali\imoxy-net-review-worktree`
- Current branch: `docs/handoff-post-pr210-2026-11-07`
- Base: `main` at `fadb7247bd2452eb01a33135f0aaff83fc66fcdc`
- This branch reconciles the supplemental handoff after PR #210. Documentation PR CI is pending.

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
- Exact-head CI passed (run `42352171383`); post-merge main CI passed (run `42352193572`).

## PR #210 — close-vs-forwarding-marker race (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/210
- Feature head: `23e87a4e49620adf20e6b4e42d2c6f0f7c2991b0`
- Squash merge commit: `fadb7247bd2452eb01a33135f0aaff83fc66fcdc`
- A deterministic test delayed `markForwarding`, closed the WebSocket while that D1 request was pending, then resolved it. Before the fix the test failed because the handler still called `server.send()` after session closure.
- Handler now re-checks `state.closed` after successful marker completion and before transport I/O. If closed, it sends nothing and does not settle. The reservation is not released because the marker may have committed; conservative retention is preserved.
- Complementary race test closes during pending reserve; after reserve returns, the unmarked reservation is released and forwarding is never marked.
- Targeted regression passed; full `test/vless-websocket-handler.test.js`: 65 passed. Full local `cmd.exe /c npm run verify`: 256 total, 255 passed, 0 failed, 1 existing environment-gated skip.
- Both exact-head CI checks passed (runs `42352762136` and `42352770587`); post-merge main CI passed (run `42352797976`).

## Current D1 request shape and limitations

- Each successful quota chunk has three D1 request boundaries: one reserve batch, one conditional forwarding-marker request, and one settlement batch.
- PR #208 guards this request count deterministically in the local SQLite adapter. It does not measure Cloudflare D1 latency or establish the cause of Run #12's 30-second cutoff.
- Further batching must preserve the forwarding boundary, immutable reservation/event identity checks, fail-closed behavior, and conservative retention of ambiguous forwarding-marked reservations.

## Issue #78 / runtime backpressure

- Issue: https://github.com/ijoolaie/imoxy-net/issues/78 (remains open).
- Run #12 failed in slow-reader acceptance after 151,552 / 4,194,304 downstream bytes, with close 1001 `session_duration_exceeded`; disposable Worker and D1 cleanup were verified.
- D1 latency remains a plausible contributor, not a proven root cause.
- PR #210 fixes a deterministic lifecycle race but does not establish bounded Worker-internal downstream buffering or prove Run #12's runtime latency root cause.
- Do not raise session/resource caps to force acceptance success. Any new Cloudflare smoke run requires fresh, explicit user authorization and must use the disposable workflow path.

## Main HANDOFF.md limitation

- `HANDOFF.md` is 302,410 bytes, exceeding the Raya text read/write limit of 262,144 bytes.
- Direct editing previously failed at the tool size limit. The main file was not rewritten, truncated, or modified through an alternate shell path.
- Keep this dated addendum as the current supplemental handoff until the main file can be safely reorganized using supported tooling.

## PR candidate — upload write / session-close race (2026-11-07)

- Working branch: `fix/upload-write-close-race-2026-11-07`.
- PR #212: https://github.com/ijoolaie/imoxy-net/pull/212 (merged 2026-11-07). Exact-head CI run `42353683946` succeeded on HEAD `92b802375c4cb1dc9ba3c34b85526b953ca99e6e`; squash merge commit `3c4ea87df7ae194b98af0707ecc6909f6f84f9e5`; post-merge `main` CI run `42353953894` succeeded.
- PR #212 tracks the feature branch; latest commit also includes this handoff reconciliation. No Cloudflare workflow or resource was run or changed.
- Deterministic regression first reproduced the defect: closing a session while `writer.write()` remained unresolved released the session admission lease prematurely.
- Handler now tracks the in-flight upload write promise. Session close closes the TCP socket, requests writer abort, waits for the pending write to settle, and only then releases the session lease. If the write remains unresolved, the persisted lease is retained until expiry rather than released speculatively.
- A successful write that resolves after WebSocket closure still proceeds to quota settlement, preserving accounting for potentially forwarded bytes.
- Added upload-side pending-forwarding-marker close test: it verifies no TCP write occurs after closure and that the potentially committed forwarding reservation is retained conservatively.
- Focused `test/vless-websocket-handler.test.js`: 67 passed, 0 failed.
- Full `cmd.exe /c npm run verify`: 258 total, 257 passed, 0 failed, 1 existing environment-gated skip; syntax/check stage passed.
- `git diff --check`: passed (only Git LF/CRLF advisory warnings).
- Runtime/Cloudflare behavior is not proven by these local tests. Issue #78 remains open; no Worker/D1 resource was touched and no Cloudflare smoke was run.
- PR #212 is merged; exact-head and post-merge `main` CI both succeeded. No Cloudflare Worker/D1 resources or runtime workflows were run. Issue #78 remains open: next engineering work should continue with deterministic local tests/analysis of backpressure and lifecycle/accounting behavior. Any Cloudflare smoke/runtime run still requires fresh, explicit user authorization and must use the disposable workflow path.

## PR #213 — handoff reconciliation after PR #212 (merged)

- PR: https://github.com/ijoolaie/imoxy-net/pull/213
- Feature head: `ed71259fdf03fa97fbad11975ee3385b55f83688`; squash merge commit: `ac56aa821d3ecbc9ef5a0fcdf2e32ed8a10d7497`.
- Exact-head CI and post-merge `main` CI passed; post-merge run `42354094913` succeeded.

## Issue #78 deterministic follow-up — 2026-11-07

- Workspace branch: `work/issue78-d1-analysis`, based on `origin/main` at `ac56aa821d3ecbc9ef5a0fcdf2e32ed8a10d7497`; clean before this handoff-only update.
- Re-read `AGENTS.md`, the quota reservation service/store, the SQLite D1 adapter tests, the VLESS D1 integration test, and WebSocket handler tests.
- Ran: `node --experimental-sqlite --test test/quota-reservation-store.integration.test.js test/vless-d1-handler.integration.test.js test/vless-websocket-handler.test.js`.
- Result: 78 tests passed, 0 failed, 0 skipped (exit 0; 36.25s).
- Confirmed current local evidence: exactly 3 D1 request boundaries per successfully forwarded quota chunk (reserve batch, forwarding marker request, settlement batch); the handler also serializes subsequent upstream reads behind the prior downstream send/settlement path in a deterministic non-reading-peer test.
- These are local SQLite/mock-level properties only. They neither measure Cloudflare D1 latency nor prove Worker-internal WebSocket buffering is bounded. Run #12's D1 latency hypothesis remains unproven.
- No code changes, Cloudflare workflow dispatches, Worker/D1 resource mutations, or runtime smoke runs were performed in this follow-up.
- Next concrete step: decide whether to add an end-to-end D1-boundary counter to the VLESS handler integration harness (to tie actual relay chunks to the existing 3-boundary invariant), while preserving fail-closed and immutable identity semantics. Keep Issue #78 open; any Cloudflare runtime run needs fresh explicit user authorization.

## PR #216 — handler-to-D1 request-boundary assertion — 2026-11-07

- PR: https://github.com/ijoolaie/imoxy-net/pull/216
- The initial PR head `e2f1764f79b5419675976db0c0360c5ad8c220e3` had successful GitHub Actions CI run `42355891856`, job `128353787778`; no reviews or inline review threads were present.
- GitHub compare showed the PR branch was one commit behind current `main` and reported merge state `dirty`. Rebased the feature branch onto `origin/main` at `ea037c43cd1d6a434a898e43efa450d94a4f6a5a`, preserving only the intended integration-test change; handoff content from the old branch was not carried over.
- The integration test change counts external D1 request boundaries (batch as one, standalone first/all/run as one) and asserts exactly three requests for the actual downstream relay chunk: two batches plus one direct forwarding-marker first().
- After rebasing, `cmd.exe /c npm run verify` passed again: 258 total, 257 passed, 0 failed, 1 existing environment-gated skip. `git diff --check` passed.
- The rebased clean-base head was `d46a3ecdfcc3c250984a8f27bc57d051fac49509`. Exact-head PR CI run `42357001355`, job `128357162358`, succeeded (including `npm run verify`); no reviews or inline review threads were present; GitHub reported mergeable/clean.
- PR #216 was squash-merged as `6ebd5df62ecfee7992b14d2f728346b966033cbc` on 2026-11-07.
- Post-merge main CI run `42357035248`, job `128357265777`, succeeded on that exact merge commit (including `npm run verify`).
- Existing deterministic slow/non-reading-peer tests assert serialized upstream reads behind downstream send/settlement and stop further reads after settlement failure. This does not establish runtime WebSocket internal-buffer bounds.
- Issue #78 was updated with comment `6704683196`. No Cloudflare workflow, Worker, or D1 resource was run or changed. Issue #78 remains open.

## PR #218 candidate — Issue #78 documentation evidence reconciliation — 2026-11-07

- Current branch: `docs/issue78-pr216-merge-handoff-2026-11-07`, based on main after PR #217 merge commit `7796547a701019ed7c57ffa69da70e0e9b69dee5`.
- Updated `docs/decision-log.md`, `docs/acceptance-test-plan.md`, and `docs/vless-runtime-backpressure-probe.md` with PR #216 merge/CI evidence, the exact three external D1 request boundaries per successful downstream relay chunk, and the current official Cloudflare Workers WebSocket API review.
- Official API reference last updated 2026-10-12 continues to document synchronous `send()` and `readyState/binaryType`, with no documented `bufferedAmount`, drain event, or awaitable send result. This is a documented-surface finding only.
- Recorded the existing application-level bounds and test coverage without claiming Cloudflare internal queue/memory boundedness. Issue #78 remains open pending an explicitly authorized disposable runtime probe.
- Documentation-only; `git diff --check` passed. No Cloudflare workflow or Worker/D1 resource was run or changed.

## PR #219 — late upstream read after WebSocket close — merged 2026-11-07

- PR: https://github.com/ijoolaie/imoxy-net/pull/219
- Feature head: `72f2ba6e7d35e0fa6a7a234bee0868530190f328`; squash merge commit: `118a4b513a14166d0da7d8a592584436b3177f57`.
- Added a deterministic test in `test/vless-websocket-handler.test.js`: hold the upstream `reader.read()` promise, close the WebSocket, verify TCP socket close precedes admission lease release, then resolve the read late and assert no quota reservation, downstream send, or duplicate lease release.
- The first proposed expectation (hold the lease until the read promise settles) was rejected after it conflicted with the existing test/invariant that stalled stream cleanup must not hold capacity once TCP socket close has completed. No production handler code change was made.
- Targeted test passed. Full `cmd.exe /c npm run verify`: 259 total, 258 passed, 0 failed, 1 existing environment-gated skip. `git diff --check` passed.
- Exact-head CI run `42358151005`, job `128360647589`, succeeded; PR was mergeable/clean with no reviews or unresolved threads.
- Post-merge main CI run `42358202495`, job `128360799635`, succeeded on the exact merge commit.
- Issue #78 was updated with comment `6704839714`. This is local Node/mock lifecycle evidence only; it does not prove Cloudflare WebSocket internal queue boundedness. No Cloudflare workflow, Worker, or D1 resource was run or changed. Issue #78 remains open.
