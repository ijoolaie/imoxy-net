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

## Disposable Cloudflare probe authorization checkpoint — 2026-11-07 14:09 +03:30

- User explicitly accepted the proposed bounded, isolated disposable runtime probe. Scope: disposable Worker and disposable D1 only; no existing staging/production resources; no cap increases; keep 1101/network investigation deferred.
- Raya MCP availability/config and workspace roots were checked. Workspace `C:\Users\Ali\imoxy-net-review-worktree` is reachable; current branch `docs/issue78-pr219-handoff-2026-11-07` was clean and synced with origin at the time of check.
- Reviewed `.github/workflows/vless-cloudflare-smoke.yml` on `main`. It is a `workflow_dispatch`-only workflow named **VLESS Cloudflare disposable smoke**. It requires boolean input `confirm_disposable_run=true`, and its job is guarded to run only on `refs/heads/main` with that confirmation. It runs `scripts/vless-service-binding-cloudflare-smoke.mjs`, with a 15-minute job timeout and workflow-owned disposable Worker/D1 cleanup.
- GitHub connector tools available in this environment expose workflow-run reads and reruns, but no workflow-dispatch action. Project policy prohibits dispatching via alternate API/CLI/shell routes. Therefore no workflow was dispatched and no Cloudflare Worker/D1 resource was created or modified in this turn.
- Next required user action: open the GitHub Actions workflow **VLESS Cloudflare disposable smoke**, select branch `main`, check `confirm_disposable_run`, and click **Run workflow**. This is the existing approved disposable VLESS/D1 smoke path; do not substitute a different workflow or run local Wrangler deployment commands.
- After the user dispatches, provide the run URL/ID so the run, logs, exact assertions, and cleanup verification can be inspected. Keep Issue #78 open; a successful bounded smoke is still not proof of Worker-internal WebSocket buffer boundedness.

## Disposable Cloudflare probe Run #13 — 2026-11-07

- User supplied run/job: https://github.com/ijoolaie/imoxy-net/actions/runs/42376029306 and https://github.com/ijoolaie/imoxy-net/actions/runs/42376029306/job/128413674614.
- Workflow checked out exact main commit `14fd4d2c1a52ec0e3bbf24eaa0c4415d66f2a7a1` (PR #220 merge).
- D1 disposable database migrations 0001–0008 applied; internal-only disposable TCP echo Worker deployed.
- Baseline VLESS Worker WebSocket → handler → Service Binding TCP echo succeeded with two concurrent clients. Each uploaded/downloaded 65,542 bytes; aggregate 131,084 bytes in each direction.
- Failed before slow-reader admission at baseline lease drain: `drained=false`, `activeSessions=1` after 30 polls. Lifecycle diagnostics were available for current Worker isolate but empty (`events=[]`, `droppedEvents=0`); root cause remains unidentified.
- No slow-reader/backpressure stage ran; no new evidence about Worker-internal WebSocket buffering. Not an observed 1101 failure.
- Workflow log explicitly confirms disposable Worker and D1 cleanup completed and absence was verified. No staging/production resources touched.
- Issue #78 remains open. Comment added: https://github.com/ijoolaie/imoxy-net/issues/78#issuecomment-6707426872.
- Next work: isolate baseline close/lease-drain path deterministically and improve narrowly scoped disposable diagnostics if needed. Do not bypass the lease gate, weaken accounting, or rerun Cloudflare until a concrete diagnostic change is ready. No further runtime execution in this turn.

## Issue #78 follow-up — baseline lease-drain investigation — 2026-11-07

- Rechecked the local `closeSession` path in `src/proxy/vless-websocket-handler.js`: close marks the session closed, resolves `sessionClosed`, clears timers, closes the WebSocket, aborts/waits for a pending connect, closes pending/active TCP sockets, requests reader cancel/writer abort without awaiting those potentially stalled stream operations, waits for a pending upload write, then attempts the persisted lease release.
- Existing deterministic handler tests already cover: duplicate close/release idempotence, stalled reader/writer cleanup, late admission resolution, delayed TCP socket close, delayed D1 lease release, and release failure. No uncovered local close-stage gap was established by inspection.
- Ran targeted Node tests for those six lifecycle cases using `cmd.exe /c npm test -- --test-name-pattern=...`: 6 matched tests passed, 0 failed. The Node runner also reported 43 discovered test files/subtests in its output; no full-suite verification was run in this follow-up.
- Run #13's empty diagnostics remain unexplained. The disposable smoke Worker stores diagnostics in module-level isolate-local arrays and serves them through a separate HTTP request to `/_test/diagnostics`; a different Worker isolate handling that diagnostics request is a plausible explanation for an empty response, but this has not been proven. Existing console lifecycle logs may provide an independent observation path and should be checked before changing handler semantics.
- The recurring `activeSessions=1` at baseline in Runs #11 and #13 is still not attributed to a specific close stage. Do not infer that the D1 release itself is stuck; current evidence cannot distinguish missing/delayed close-event delivery, isolate-local diagnostic visibility, socket-close wait, pending upload write, or storage release.
- No code changes, branch switch, commit, push, PR, Cloudflare workflow dispatch, or Worker/D1 resource mutation was performed. No new runtime authorization was requested or used.
- Current workspace branch observed: `docs/issue78-pr219-handoff-2026-11-07`; local modification remains limited to this addendum. `HANDOFF.md` remains untouched due its >256 KiB size and supported-tool limit.
- Next safe step: inspect Run #13's raw preview lifecycle log lines and the diagnostics-fetch implementation together; if the HTTP diagnostics endpoint is isolate-ambiguous, make a narrowly scoped disposable-harness-only change to collect logs through the preview process rather than modifying the production handler or relaxing lease/accounting rules. Any new Cloudflare runtime execution still requires fresh explicit user authorization.

## Issue #78 follow-up — Run #13 diagnostics transport review — 2026-11-07

- Re-established Raya MCP availability and confirmed workspace roots. Current workspace: `C:\\Users\\Ali\\imoxy-net-review-worktree`; current branch observed by `git_status`: `docs/issue78-pr219-handoff-2026-11-07`, tracking its origin branch; only this addendum is modified.
- Retrieved the complete GitHub Actions job log for Run #13 (job `128413674614`). It confirms two concurrent baseline clients each transferred 65,542 bytes in each direction (aggregate 131,084 bytes each way); baseline drain remained `activeSessions=1` after 30 polls. The job log contains no `VLESS_SMOKE_LIFECYCLE` or `VLESS_SMOKE_DIAGNOSTIC` lines from the remote Worker.
- Inspected `test/vless-service-binding-tcp-smoke-worker.js`: diagnostics are held in module-level arrays and the HTTP endpoint explicitly labels its scope `current-worker-isolate`. The separate request to `/_test/diagnostics` can be routed to a different Worker isolate from the WebSocket requests, so `events=[]` and `droppedEvents=0` do not establish that no lifecycle events occurred. This is a plausible observability gap, not a proven explanation for the lease leak.
- Inspected `scripts/vless-service-binding-cloudflare-smoke.mjs`: Wrangler preview stdout/stderr are captured locally, but the script does not stream or otherwise persist remote Worker isolate logs. Its diagnostics fallback includes only the local preview process output tail. The GitHub job log shows that this path did not expose the lifecycle console records in Run #13.
- Inspected the smoke-worker unit test: it validates bounded/payload-free diagnostics and token gating in one in-process isolate, but does not test multi-isolate routing or correlate WebSocket requests with the diagnostics read.
- No handler lifecycle defect is established by this review. Do not infer that D1 lease release is stuck, do not weaken the lease gate/accounting, and do not alter production handler semantics based on the empty diagnostics response.
- Recommended next engineering step: make a narrowly scoped disposable-harness diagnostics improvement that persists only approved payload-free lifecycle records in a cross-isolate observable sink (or uses an explicitly supported Worker log-tail capture path), with bounded retention, token/access controls, cleanup, and tests. Before implementing, inspect the existing D1 schema/migration and Cloudflare workflow constraints to choose the least invasive sink; avoid adding a production migration or changing staging/production bindings. Then run local tests and full verify, PR exact-head CI, and only after the concrete change is ready request fresh explicit authorization for any Cloudflare runtime probe.
- No code changes, Cloudflare dispatch, Worker/D1 mutation, commit, or push occurred in this follow-up. Main `HANDOFF.md` remains untouched because it exceeds the supported 256 KiB text-tool limit.
- Additional design review: the disposable workflow applies exactly migrations 0001–0008 and the current schema has no diagnostics table. Adding a production migration would be unnecessary scope. The workflow is restricted to manual dispatch on `main` with `confirm_disposable_run=true`, and the smoke script already emits payload-free lifecycle records with `console.log`; a dedicated remote Worker log-tail capture attached before client traffic is the least invasive candidate to evaluate next. It would need bounded capture, redaction, process cleanup, explicit handling of tail startup failure, and tests. No CLI/runtime command was executed in this review.

## Issue #78 follow-up — corrected diagnostics approach and local implementation — 2026-11-07

- Correction to the preceding recommendation: official Cloudflare documentation states that `wrangler tail` does not support targeting Previews. Do not add a `wrangler tail` process to this disposable `wrangler dev --remote` harness. The docs also state that `console.log` is supported in remote preview mode. Sources: Cloudflare Workers Preview test/debug docs and Console API docs.
- Root cause of missing visible lifecycle lines in Run #13's GitHub job output is now narrowed to the harness presentation path: `startRemotePreview()` already captures Wrangler stdout/stderr in bounded `previewLogs`; the smoke Worker already emits payload-free `VLESS_SMOKE_LIFECYCLE` console records; but successful `fetchSmokeDiagnostics()` returned only the isolate-local endpoint payload. The `previewOutputTail` was included only when the diagnostics endpoint failed. Thus a successful-but-empty isolate-local endpoint hid the independent console-log evidence path from the failure report.
- On feature branch `fix/issue78-preview-console-diagnostics-2026-11-07`, based on current origin/main `14fd4d2c1a52ec0e3bbf24eaa0c4415d66f2a7a1`, updated the preview diagnostics helper to build a shared redacted/bounded preview context and changed successful as well as unavailable diagnostics responses to include preview process state, preview health, and the redacted Wrangler output tail.
- Added unit coverage for successful preview context inclusion, secret redaction, and 4,000-character output-tail bounding. No Worker handler semantics, production migrations, resource caps, session limits, bindings, or Cloudflare resources were changed.
- This remains a harness observability improvement only. It does not itself prove that the remote preview's stdout contains Worker lifecycle console records; that must be confirmed by the next explicitly authorized disposable run. If records still do not appear, the failure report will now make that absence visible rather than silently omitting the capture.
- No Cloudflare workflow dispatched and no remote resource created or modified in this turn.

- Local validation for the preview-context change: focused test `node --experimental-sqlite --test test/vless-smoke-preview-diagnostics.test.js` passed 5/5. Full `cmd.exe /c npm run verify` passed: syntax check succeeded; 261 tests discovered, 260 passed, 1 pre-existing environment-gated skip, 0 failed. `git diff --check` passed (only Git LF/CRLF advisory warnings).
- Current working branch is `fix/issue78-preview-console-diagnostics-2026-11-07`; based on exact current origin/main SHA above. Modified files: this addendum, `scripts/vless-service-binding-cloudflare-smoke.mjs`, `scripts/vless-smoke-preview-diagnostics.mjs`, and `test/vless-smoke-preview-diagnostics.test.js`. No commit/push/PR yet at this checkpoint.

## PR #221 merge and post-merge verification — 2026-11-07

- PR #221 (`test: expose remote preview lifecycle logs on smoke failure`) merged successfully: https://github.com/ijoolaie/imoxy-net/pull/221
- Feature head: `ef9483e5d91c4b83ddbdf2820950835910016b9b`; merge commit: `c389b6db2063c87a310a8ddf752fc28812b05f26`.
- Exact feature-head CI: both PR-triggered and push-triggered test jobs succeeded (runs `42379324393` and `42379316290`).
- Post-merge main CI on the merge commit succeeded (run `42379356346`, job `128423509433`).
- PR review submissions and review threads were both empty before merge; PR was mergeable and clean. Merge was performed under the user's standing authorization for completed PRs satisfying exact-head CI, no unresolved review threads, and mergeability.
- Issue #78 comment `6707857003` records the Run #13 diagnostics finding, PR #221 merge, and that no runtime probe was run. Issue #78 remains open.
- The workspace was moved to a fresh documentation-only branch based on the merge commit to reconcile this handoff. No code changes or Cloudflare actions occurred after PR #221 merged.

## PR #222 merge and post-merge verification — 2026-11-07

- PR #222 (documentation-only handoff reconciliation after PR #221): https://github.com/ijoolaie/imoxy-net/pull/222.
- PR head: `c870b5b5c1a711f4fa30db27ab132ffff81a7cab`; squash merge commit: `e7680b19b0fc44991713886f6f835366d9c1a95b`.
- The PR initially had no check runs while open. Workflow review confirmed `.github/workflows/ci.yml` runs on `pull_request` to `main`; the docs-only path was not excluded by push path filters. A `test` check subsequently succeeded on the exact PR head, with no review submissions or unresolved review threads and a mergeable PR.
- PR #222 was squash-merged. Post-merge main CI run `42381030369` completed with conclusion `success` on the exact merge commit `e7680b19b0fc44991713886f6f835366d9c1a95b`.
- Local workspace fetched origin and switched to a new documentation-only branch `docs/issue78-pr222-handoff-2026-11-07`, based on the verified merge commit. The prior PR #222 branch is merged and was not reused.
- No code, Cloudflare workflow, Worker, D1 resource, staging, or production resource was changed or run in this follow-up.
- Issue #78 remains open. Run #13's baseline lease drain is still unresolved; empty isolate-local HTTP diagnostics are not proof that lifecycle events were absent. PR #221 ensures successful and unavailable diagnostics responses both include a bounded, redacted Wrangler preview output tail. Whether remote Worker lifecycle console records actually appear there remains unverified until a future separately authorized disposable runtime run.
- Next engineering step: continue deterministic local analysis of the close/lease-drain path and harness evidence. Do not change production handler semantics or lease/accounting gates without a reproduced defect. If the next necessary evidence requires Cloudflare runtime, request fresh explicit user authorization first. Keep 1101/domain/VPN investigation at final priority.
- Main `HANDOFF.md` remains unchanged because its 302,410-byte size exceeds the supported 256 KiB text-tool limit. This addendum is updated instead; no alternate write path was used.

## Issue #78 follow-up — local baseline lease-drain analysis — 2026-11-07

- Re-established Raya MCP availability and workspace roots. Fetched `origin`; the prior local documentation branch was clean at PR #223 head `03775927c004a1024064acc417678946399b66f2`. Created a fresh feature branch `fix/issue78-baseline-lease-drain-analysis-2026-11-07` from the fetched `origin/main` commit `cac2102e435b80ea6d75873a111be0656be22d26`. Working tree was clean before analysis.
- Rechecked PR #223 post-merge CI run `42381566629`: job `test` (`128430088061`) completed successfully on the exact merge commit `cac2102e435b80ea6d75873a111be0656be22d26`.
- Re-inspected `src/proxy/vless-websocket-handler.js`, `src/storage/d1-store.js`, `scripts/vless-service-binding-cloudflare-smoke.mjs`, `scripts/vless-cloudflare-runtime-smoke.mjs`, `scripts/vless-smoke-session-drain.mjs`, and `test/vless-service-binding-tcp-smoke-worker.js`.
- Confirmed smoke clients send a normal WebSocket Close only after exact echo validation, then wait for their own close event. Handler close path synchronously marks state closed, resolves the close signal, closes WebSocket, waits for pending connect cleanup, closes TCP sockets, requests reader/writer cleanup without awaiting potentially stalled stream operations, waits for any pending upload write, then awaits D1 lease release.
- Existing deterministic tests cover delayed socket close, delayed D1 release, release failure, late admission, stalled stream cleanup, pending upload write, pending upstream read, and duplicate close/release. Static inspection did not reveal a new untested close-stage defect; do not change handler semantics without a reproduced failure.
- Reconfirmed the diagnostics endpoint stores events in module-level arrays explicitly scoped to `current-worker-isolate`. The separate HTTP diagnostics request can be routed to a different isolate than the WebSocket clients; therefore `events=[]` / `droppedEvents=0` cannot prove lifecycle events were never emitted. This remains a plausible observability limitation, not a proven cause of `activeSessions=1`.
- Ran `cmd.exe /c node --test test/vless-websocket-handler.test.js test/vless-smoke-session-drain.test.js test/vless-service-binding-tcp-smoke-worker.test.js`: 76 passed, 0 failed, 0 skipped (exit 0; 37.27s). This is local deterministic/mock coverage only.
- No source code changes, Cloudflare dispatch, Worker/D1 mutation, or staging/production action occurred. No new runtime authorization was used. The handoff-only update was committed as `d7d20e2af5806aa0379aedc832925f5821dfbf06` and pushed for PR #224. Issue #78 remains open; bounded Worker-internal WebSocket buffering and the Run #13 lease-drain failure remain unproven/unattributed.
- Next step: use the now-merged PR #221 Wrangler preview-output capture in the next separately authorized disposable runtime run to inspect whether lifecycle console records are present; do not run it without fresh explicit user authorization. Keep 1101/domain/VPN at final priority.
- `HANDOFF.md` remains untouched because it exceeds the supported 256 KiB text-tool limit; this addendum is the safe supplemental handoff.

## PR #224 — baseline lease-drain analysis handoff — 2026-11-07

- PR: https://github.com/ijoolaie/imoxy-net/pull/224
- Initial documentation-only commit: `d7d20e2af5806aa0379aedc832925f5821dfbf06`, based on main `cac2102e435b80ea6d75873a111be0656be22d26`.
- The PR records the successful PR #223 post-merge CI result, the local lifecycle-path review, the 76/76 targeted test result, and the isolate-local diagnostics limitation. It does not change application code or runtime configuration.
- Exact-head CI run `42382624318` completed successfully on PR HEAD `89f325da8b8ca7a7004a75a28c4d4481406ba2bb` (job `test`, `128433270881`). PR reviews and inline review threads were empty; the diff was reviewed and the PR was mergeable.
- PR #224 was squash-merged under the standing authorization. Merge commit: `0b316988940a40bba2e2cfffd4fc6a7a93ea6949`. `origin/main` now points to that exact commit. No post-merge workflow run was returned for the docs-only merge; PR exact-head CI is green.

## Issue #78 follow-up - post-PR #225 full verification and lifecycle review - 2026-11-07

- Re-established Raya MCP availability and workspace roots. Fetched `origin`; confirmed PR #224 was squash-merged as `0b316988940a40bba2e2cfffd4fc6a7a93ea6949` and PR #225 was squash-merged as `0411c60dfa281bd9514fb082dd1073000a088736`. PR #224 exact-head CI run `42382624318`, job `128433270881`, completed successfully. PR #224 had no review submissions or unresolved inline review threads. PR #225 records the merge and validation; GitHub returned no post-merge workflow run for the docs-only merge.
- Created clean feature branch `review/issue78-harness-diagnostics-boundary-2026-11-07` from current `origin/main` at `0411c60dfa281bd9514fb082dd1073000a088736`; no existing work was overwritten.
- Re-inspected the handler close path and D1 session release: `closeSession` marks closed and resolves the close signal, closes the WebSocket, aborts/waits for tracked pending connect cleanup, closes pending/active TCP sockets, requests reader/writer cleanup without awaiting potentially stalled stream operations, waits for an in-flight upload write, then awaits `releaseProxySession`. D1 release is a scoped parameterized DELETE by session/account ID and reports whether exactly one row was deleted.
- Existing deterministic tests cover the material async boundaries: delayed connect/open, late socket cleanup, delayed socket close, pending upload write, pending upstream read, stalled reader/writer cleanup, delayed/failed D1 release, late admission, and duplicate close/release. This review did not reproduce a new defect or justify changing handler/accounting semantics.
- Reconfirmed the isolate-local diagnostics limitation: module-level event arrays are scoped to the current Worker isolate, while the separate diagnostics HTTP request is not guaranteed to reach the same isolate as the WebSocket requests. Empty diagnostics therefore cannot identify the failing close stage. PR #221's Wrangler output-tail inclusion makes the independent preview-console evidence visible in future failure reports, but no runtime run has yet verified those records.
- Ran `cmd.exe /c npm run verify` on the current main code: syntax/check stage passed; 261 tests discovered, 260 passed, 0 failed, 1 environment-gated skip (exit 0). This is local validation only.
- `git diff --check` passed before this handoff update. No application code, Worker/D1 resource, Cloudflare workflow, staging, or production resource was changed or run. No new Cloudflare runtime authorization was used.
- Issue #78 remains open: Run #13 baseline lease drain remains unattributed and Worker-internal WebSocket buffering remains unproven. Next evidence step is a fresh, explicitly authorized disposable runtime run to inspect whether lifecycle console records appear in the captured Wrangler preview output. Do not dispatch without that fresh authorization. Keep 1101/domain/VPN investigation at final priority.
- Main `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB file-tool limit; this addendum remains the supplemental handoff.
## PR #226 merge - 2026-11-07

- PR #226 (`docs: record post-PR225 Issue #78 verification`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `e4b1373db31a20eeca380d1b46b19664f147c785`; exact-head CI run `42383254932`, job `128435158873`, conclusion `success`.
- Rechecked immediately before merge: PR mergeable, no submitted reviews, no unresolved review threads. Merge commit `6ee4294e14573bd4621d9779bd8bc0ce354bd930`.
- Documentation-only change (12 lines in `HANDOFF-ADDENDUM-2026-11-07.md`). No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or run.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. A new disposable Cloudflare runtime probe still requires fresh explicit user authorization. Keep 1101/domain/VPN investigation at final priority.

## PR #227 merge - 2026-11-07

- PR #227 (`docs: record Issue #78 PR #226 merge`) was squash-merged under the standing merge authorization after exact-head CI completed successfully. PR head `ef1402242699a2d167c81f6a13975a503567cebc`; exact-head check `test` run `42383387115`, job `128435557434`, conclusion `success`.
- Rechecked immediately before merge: PR mergeable, no submitted reviews, no unresolved review threads. Merge commit `b60729aa0dba983a9a411548c9753d9e1bc40d73`.
- Documentation-only change. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or run.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. A new disposable Cloudflare runtime probe still requires fresh explicit user authorization. Keep 1101/domain/VPN investigation at final priority.

## PR #228 merge - 2026-11-07

- PR #228 (`docs: record Issue #78 PR #227 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `12daacd9f6da420de831ed9a1acbc0702c99ad45`; CI workflow run `42383469692`, conclusion `success`.
- Rechecked immediately before merge: PR mergeable, no submitted reviews, no unresolved review threads. Merge commit `d8eee429f4831878e425e3e90000ab93c8d0a596`.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or run.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Any new disposable Cloudflare runtime probe requires fresh explicit user authorization. Keep 1101/domain/VPN investigation at final priority.

## PR #229 merge - 2026-11-07

- PR #229 (`docs: record Issue #78 PR #228 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `bf2dc6fca9b91feb9de8005de01d20fc8448da94`; CI workflow run `42383703200`, conclusion `success`.
- Rechecked before merge: PR mergeable/clean, no submitted reviews, no unresolved review threads. Merge commit `902c98ff41c0000222cda46e855e1b4458e3a475`.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or run.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Any new disposable Cloudflare runtime probe requires fresh explicit user authorization. Keep 1101/domain/VPN investigation at final priority.

## PR #230 merge - 2026-11-07

- PR #230 (`docs: record Issue #78 PR #229 merge`) was squash-merged under standing merge authorization after exact-head CI succeeded. PR head `1b7a262db829e95727742acddaf2c6cd822a4c9a`; CI workflow run `42384383150`, conclusion `success`.
- Rechecked before merge: PR mergeable, no submitted reviews, no unresolved review threads. Merge commit `e2fecf02a8c0bfeb53378141ceb6af9659de3569`.
- Local `cmd.exe /c npm run verify` on this docs branch passed syntax checks and tests: 261 discovered, 260 passed, 0 failed, 1 environment-gated skip.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or run.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Any new disposable Cloudflare runtime probe requires fresh explicit user authorization. Keep 1101/domain/VPN investigation at final priority.

## PR #231 merge — 2026-11-07

- PR #231 (`docs: record Issue #78 PR #230 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `1dc8c81f8c69cfed5b7bcb5a9504b4f364ac1ecd`; CI workflow run `42384503765`, job `128438932809` (`test`), conclusion `success`; the `Run npm run verify` step also succeeded.
- Immediately before merge, PR #231 was open and mergeable with no submitted reviews and no unresolved inline review threads. Expected-head SHA was supplied to the merge operation. Squash merge commit: `b03746e8fafc2b6f0e617a4e1d4ee4526f05a7e4`.
- Local workspace fetched `origin` and created a fresh documentation branch `docs/issue78-pr231-merge-handoff-2026-11-07` from that exact `origin/main` merge commit. Worktree was clean at branch creation.
- Documentation-only change. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource was changed or run. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Keep deterministic local investigation as the next step and 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #232 merge — 2026-11-07

- PR #232 (`docs: record Issue #78 PR #231 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `32f6db436e88ffd2c5a5081f092e70364b8243ae`; CI workflow run `42389340723`, job `128453404806` (`test`), conclusion `success`; the `Run npm run verify` step also succeeded.

- Immediately before merge, PR #232 was open and mergeable with no submitted reviews and no unresolved inline review threads. Expected-head SHA was supplied to the merge operation. Squash merge commit: `23e3defa04ac6c8608b21e23833909047300ff9d`.
- Local workspace fetched `origin` and created a fresh documentation branch `docs/issue78-pr232-merge-handoff-2026-11-07` from that exact `origin/main` merge commit. Worktree was clean at branch creation.
- Documentation-only change. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource was changed or run. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Keep deterministic local investigation as the next step and 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #233 merge — 2026-11-07

- PR #233 (`docs: record Issue #78 PR #232 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `7be8ae1f97cd7f1fc5f808571f5fdbb43a416eb0`; CI workflow run `42389481791`, job `128453829619` (`test`), conclusion `success`; the `Run npm run verify` step also succeeded.
- Immediately before merge, PR #233 was open and mergeable with no submitted reviews and no unresolved inline review threads. Squash merge commit: `c4b28466ef3139a16a5dbec6d2e0feafa79b8434`.
- Local workspace successfully fetched `origin` and confirmed `origin/main` at that exact merge commit. The fresh branch `docs/issue78-pr233-merge-handoff-2026-11-07` is based on that commit; worktree was clean before this addendum update.
- Documentation-only handoff reconciliation. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource was changed or run. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #234 merge — 2026-11-07

- PR #234 (`docs: record Issue #78 PR #233 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `d8a46c171c5c0ce2edef92fb40922189aff8c53e`; CI workflow run `42391381088`, job `128459497654` (`test`), conclusion `success`; the `Run npm run verify` step succeeded.
- Immediately before merge, PR #234 was open and mergeable/clean with no submitted reviews and no unresolved inline review threads. Expected-head SHA `d8a46c171c5c0ce2edef92fb40922189aff8c53e` was supplied to the merge operation. Squash merge commit: `7a2c7f063591a249547c61f979f53e316fbdfb74`.
- Local workspace fetched `origin` and created fresh branch `docs/issue78-pr234-merge-handoff-2026-11-07` from that exact `origin/main` merge commit. Worktree was clean at branch creation.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #235 merge — 2026-11-07

- PR #235 (`docs: record Issue #78 PR #234 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `a54960ab35acd0bd465f25a89ce1d5ce394a8fef`; CI workflow run `42391552677`, job `128460020776` (`test`), conclusion `success`; the `Run npm run verify` step succeeded.
- Immediately before merge, PR #235 was open and mergeable/clean with no submitted reviews and no unresolved inline review threads. Expected-head SHA `a54960ab35acd0bd465f25a89ce1d5ce394a8fef` was supplied to the merge operation. Squash merge commit: `b2d459e27fc64f1695baade9e60de6ca16e55f55`.
- Local workspace fetched `origin` and created fresh branch `docs/issue78-pr235-merge-handoff-2026-11-07` from that exact `origin/main` merge commit. Worktree was clean at branch creation.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #236 merge — 2026-11-08

- PR #236 (`docs: record Issue #78 PR #235 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `c3dc5dc725bfa0d0a7fb925187f433b4539192ab`; workflow run `42391681732`, job `128460389782` (`test`), conclusion `success`; the `Run npm run verify` step succeeded.
- Immediately before merge, PR #236 was open and mergeable with no submitted reviews and no unresolved inline review threads. Expected-head SHA `c3dc5dc725bfa0d0a7fb925187f433b4539192ab` was supplied to the merge operation. Squash merge commit: `e5e895788e649c86999231d07819ce1822b48064`.
- Local workspace fetched `origin` and created fresh branch `docs/issue78-pr236-merge-handoff-2026-11-08` from that exact `origin/main` merge commit. Worktree was clean at branch creation.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #237 merge — 2026-11-08

- PR #237 (`docs: record Issue #78 PR #236 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `d64f1d1c24171aa5f7158076c387d9a0639519ab`; workflow run `42412168483`, job `128522464735` (`test`), conclusion `success`; the `Run npm run verify` step succeeded.
- Immediately before merge, PR #237 was open and mergeable with no submitted reviews and no unresolved inline review threads. Expected-head SHA `d64f1d1c24171aa5f7158076c387d9a0639519ab` was supplied to the merge operation. Squash merge commit: `003cd385556105fb83f52c0a8e5e4a95c82e30c3`.
- Local workspace fetched `origin` and created fresh branch `docs/issue78-pr237-merge-handoff-2026-11-08` from that exact `origin/main` merge commit. Worktree was clean at branch creation.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #238 merge — 2026-11-08

- PR #238 (`docs: record Issue #78 PR #237 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `a826d00a43ed47b387d04acba33b4f573df9c046`; workflow run `42412249054`, job `128522705649` (`test`), conclusion `success`; the `Run npm run verify` step succeeded.
- Immediately before merge, PR #238 was open and mergeable with no submitted reviews and no unresolved inline review threads. Expected-head SHA `a826d00a43ed47b387d04acba33b4f573df9c046` was supplied to the merge operation. Squash merge commit: `b0d6f283b591cd9327bbc34fddd92803f0d25a19`.
- Local workspace fetched `origin` and confirmed it was clean, then created fresh branch `docs/issue78-pr238-merge-handoff-2026-11-08` from that exact `origin/main` merge commit.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.
## PR #239 merge — 2026-11-08

- PR #239 (`docs: record Issue #78 PR #238 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `aa4024d4b320255b19f16373d1a1247bd7ce8666`; workflow run `42412583199`, job `128523701897` (`test`), conclusion `success`; the `Run npm run verify` step succeeded.
- Immediately before merge, PR #239 was open and mergeable with no submitted reviews and no unresolved inline review threads. Expected-head SHA `aa4024d4b320255b19f16373d1a1247bd7ce8666` was supplied to the merge operation. Squash merge commit: `60fb3e1d1e8b0a7eb43e9d5f617d93e8db31644d`.
- Local workspace fetched `origin` and created fresh branch `docs/issue78-pr239-merge-handoff-2026-11-08` from that exact `origin/main` merge commit after confirming a clean worktree.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed and Worker-internal downstream buffering remains unproven. Continue deterministic local investigation; keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.
## PR #240 merge and local Issue #78 review — 2026-11-08

- PR #240 (`docs: record Issue #78 PR #239 merge`) was squash-merged under the standing merge authorization after exact-head CI succeeded. PR head `6601b9f71e4128404a9de2b12f695d239efae960`; workflow run `42412639643`, job `128523873269` (`test`), conclusion `success`; `Run npm run verify` succeeded. No submitted reviews or unresolved review threads; expected head SHA supplied. Squash merge commit: `d8ac554dc9d021189522c7a5e2695dc50503cbb4`.
- Deterministic local source review traced `closeSession()` through socket closure, pending upload-write completion, and `releaseSessionLease()` in `src/proxy/vless-websocket-handler.js`; separately traced late admission completion/release and D1 `releaseProxySession()` deletion. Existing tests already cover late admission, pending write, late upstream read, stalled stream cleanup, repeated close, socket-close ordering, and delayed release.
- Reviewed the baseline runtime client and orchestrator. The client resolves a successful session only after receiving the complete echo and the WebSocket close event; the orchestrator then fetches diagnostics and polls D1 active-session count for up to 30 × 500 ms before starting slow-reader acceptance.
- Local `cmd.exe /c npm run verify` passed: syntax checks and 260 tests passed, 1 test skipped, 0 failed. No deterministic local handler defect explaining Run #13's baseline lease-drain failure was established. The remaining plausible runtime distinctions (close event delivery, async isolate/task lifetime, and D1 release execution/outcome) cannot be resolved from current local evidence; do not label any as root cause.
- Documentation-only handoff update. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Worker-internal downstream buffering remains unproven; keep 1101/domain/VPN investigation at final priority. `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #241 merge and local lease-drain review handoff — 2026-11-08

- PR #241 (`docs: record Issue #78 local lease-drain review`) was squash-merged under the standing merge authorization after exact-head CI run `42413117653`, job `128525294895` (`test`), completed successfully, including `Run npm run verify`. PR head `6c15bfcfdfcd187530caefa43604b975730f2a10`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA was supplied. Squash merge commit: `1bb450e184bf0764909bbaa2b03999683bcdcfba`.
- Raya MCP availability/config and workspace roots were checked. The workspace `C:\Users\Ali\imoxy-net-review-worktree` was reachable. After PR #241 merged, `origin/main` was fetched and verified at `1bb450e184bf0764909bbaa2b03999683bcdcfba`; a fresh branch `docs/issue78-pr241-merge-handoff-2026-11-08` was created from that exact commit with a clean worktree.
- PR #241 records a deterministic local source review of the close/lease-drain path and baseline smoke orchestration. Local `cmd.exe /c npm run verify` passed: 260 tests passed, 1 skipped, 0 failed. No deterministic local handler defect explaining Run #13's baseline lease-drain failure was established.
- This handoff update is documentation-only. No application code, Cloudflare workflow, Worker/D1 resource, staging, or production resource changed or ran. No Cloudflare runtime probe was dispatched; any such run still requires fresh explicit user authorization.
- Issue #78 remains open. Run #13 baseline lease-drain cause remains unattributed; Worker-internal downstream buffering remains unproven. Do not raise session/resource caps. Keep 1101/domain/VPN investigation at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## Run #13 raw-log reconciliation with PR #221 diagnostics — 2026-11-08

- Retrieved the complete GitHub Actions job log for Run #13 (job `128413674614`). It confirms the checked-out source SHA was `14fd4d2c1a52ec0e3bbf24eaa0c4415d66f2a7a1`; the two-client baseline echo completed (65,542 bytes uploaded and downloaded per client), then the session lease drain remained `activeSessions=1` after 30 polls. The smoke stopped before slow-reader admission and verified disposable Worker/D1 cleanup. No 1101 error occurred.
- The baseline diagnostics response was `scope=current-worker-isolate`, `events=[]`, `droppedEvents=0`. Because the endpoint reads isolate-local module state, this response alone cannot establish that no lifecycle events were emitted in another isolate.
- Reconciled this with merged PR #221: the current `scripts/vless-service-binding-cloudflare-smoke.mjs` implementation of `fetchSmokeDiagnostics()` adds bounded, redacted `previewOutputTail`, preview-process state, and preview-health context to both successful and unavailable diagnostics responses. The Run #13 SHA predates this diagnostics enhancement, which explains why its recorded JSON lacked that context. No additional harness defect is established by this review.
- This was a read-only review of existing GitHub logs and local source; no Cloudflare workflow was dispatched and no Worker/D1 resources were touched. A future disposable runtime run would provide better lifecycle observability but still requires fresh, explicit user authorization. Issue #78 remains open; no runtime root cause or Worker-internal bounded-buffer proof is established.

## PR #242 merge and next diagnostic interpretation — 2026-11-08

- PR #242 (`docs: record Issue #78 PR #241 merge`) was squash-merged under standing merge authorization after exact-head CI run `42413561145`, job `128526650271` (`test`), succeeded including `Run npm run verify`. PR head `fd1d1fe2fe3d1a549aa7a00112e2e56dfefc84a5`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `e0577ffd53ca0d153ece4d0658ffdce35489b1d6`.
- Further read-only review of `src/proxy/vless-websocket-handler.js` confirms the current diagnostic sequence can distinguish several lease-drain stages when the Worker preview output is available: `websocket.close_event` and `session.close.start`; `tcp.socket_close.start/complete` for active/pending sockets; `tcp.write.start/complete` for an in-flight upload write; then `session.lease_release.start/complete/error`. Late admission cleanup emits `session.lease_release_late.start/complete/error`. The successful `released` flag and duration are recorded for normal lease release.
- For Run #13 specifically, both baseline clients had completed full echo, so a pending TCP connect is not the leading local-path candidate. If future logs show close event and close start but no lease-release start, inspect which socket/write cleanup completion is absent; if release starts but never completes, inspect D1 release; if release completes with `released=true` while D1 still reports one session, reconcile session/account identity and the independent D1 count. These are diagnostic branches, not claims about the actual Run #13 cause.
- No new deterministic handler defect was found and no application code was changed. No Cloudflare runtime probe was run. Issue #78 remains open; bounded Worker-internal downstream buffering is unproven and any new disposable runtime execution requires fresh explicit user authorization.
- After PR #242 merged, Raya fetched `origin/main` at `e0577ffd53ca0d153ece4d0658ffdce35489b1d6` and created a clean handoff branch `docs/issue78-pr242-merge-handoff-2026-11-08` from that exact commit. This entry is documentation-only; `HANDOFF.md` remains untouched due the supported 256 KiB limit.

## PR #243 merge and deterministic D1 lease-release review — 2026-11-08

- PR #243 (`docs: record Issue #78 PR #242 merge`) was squash-merged under standing merge authorization after exact-head CI run `42413740833`, job `128527236953` (`test`), completed successfully, including `Run npm run verify`. PR head `cd1004acf9519a4a4162e377e70bf11d585f7037`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `e0d9805ff094564ae23605397926dcd537835eab`.
- Fresh local investigation branch `investigate/issue78-d1-lease-release-2026-11-08` was created from exact `origin/main` at `e0d9805ff094564ae23605397926dcd537835eab`. Reviewed handler admission/late-release races, close sequencing, pending upload writes, downstream reserve/mark/send/settle, D1 `releaseProxySession`, SQLite-backed SQL tests, integration lease tests, and the existing deterministic handler lifecycle tests.
- D1 release is a single parameterized `DELETE FROM proxy_active_sessions WHERE session_id = ? AND account_id = ?`; its return value is true only for exactly one deleted row. Existing SQLite and integration tests cover real SQL behavior, account scoping, idempotent second release, admission after release, and bounded cleanup. Handler tests cover late admission release, close-before-release ordering, pending socket close, pending upload write, delayed/failed D1 release, and repeated close.
- No deterministic local defect explaining Run #13's `activeSessions=1` result was found. No new code/test change was justified: inventing a release retry, changing lease expiry, or weakening the drain gate without evidence could break conservative capacity accounting. Future preview output should be classified by the existing event sequence before changing behavior.
- `cmd.exe /c npm run verify` passed on the investigation branch: 260 tests passed, 1 skipped, 0 failed (261 total); syntax checks passed. `git diff --check` remains required for the handoff change.
- No Cloudflare runtime workflow/probe was dispatched, and no Worker/D1, staging, or production resource was touched. Issue #78 remains open; Worker-internal downstream buffering and the Run #13 lease-drain cause remain unproven. Keep 1101/domain/VPN work at final priority.
- Raya fetched `origin/main` at `e0d9805ff094564ae23605397926dcd537835eab` and created clean branch `investigate/issue78-d1-lease-release-2026-11-08` from that exact commit. This handoff record is documentation-only. `HANDOFF.md` remains untouched due the supported 256 KiB text-tool limit.

## PR #244 merge handoff — 2026-11-08

- PR #244 (`docs: record Issue #78 D1 lease-release review`) was squash-merged under standing merge authorization after exact-head CI run `42459503360`, job `128665535011` (`test`), completed successfully including `Run npm run verify`. PR head `7aa057e8b20887f846c7f8da3d207c15a3770cc5`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `e8afaec1921b30421f20a3ef39082f23b35635a2`.
- The merged PR records the read-only D1/handler lifecycle review and full local verification (260 passed, 1 skipped, 0 failed). No application code changed. Issue #78 remains open; no deterministic root cause for Run #13's baseline lease-drain failure and no proof of Worker-internal downstream buffering.
- After merge, Raya fetched `origin/main` at `e8afaec1921b30421f20a3ef39082f23b35635a2` and created clean branch `docs/issue78-pr244-merge-handoff-2026-11-08` from that exact commit for this merge record. No Cloudflare runtime probe was run; staging/production remain untouched. `HANDOFF.md` remains untouched due its size exceeding the supported 256 KiB text-tool limit.

## PR #245 merge handoff — 2026-11-08

- PR #245 (`docs: record Issue #78 PR #244 merge`) was squash-merged under standing merge authorization after exact-head CI run `42459569169`, job `128665733045` (`test`), completed successfully including `Run npm run verify`. PR head `293d09d15e50d8f5bd4552d78bf603e1985cdf7b`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `383528bca8d8c510447bd388a141c852d5874e54`.
- After merge, Raya fetched `origin/main` at `383528bca8d8c510447bd388a141c852d5874e54` and created clean branch `docs/issue78-pr245-merge-handoff-2026-11-08` from that exact commit for this record. No Cloudflare runtime probe or resource mutation was performed. `HANDOFF.md` remains untouched due its size exceeding the supported 256 KiB text-tool limit.

## PR #246 merge handoff — 2026-11-08

- PR #246 (`docs: record Issue #78 PR #245 merge`) was squash-merged under standing merge authorization after exact-head CI run `42459621370`, job `128665892961` (`test`), completed successfully, including `Run npm run verify`. PR head `99b8e40cbda87008c7ebaed83fca2316ea56c2f2`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `8081676de1f405d19f1e002650a03d46c17a2d87`.
- The merged PR records PR #245's merge in the supplemental handoff. No application code changed.

## Disposable Cloudflare probe Run #14 — 2026-11-08

- User supplied run/job: https://github.com/ijoolaie/imoxy-net/actions/runs/42460056979 and https://github.com/ijoolaie/imoxy-net/actions/runs/42460056979/job/128667224635.
- Workflow checked out exact main commit `383528bca8d8c510447bd388a141c852d5874e54` (PR #245 merge).
- Disposable D1 database migrations 0001–0008 applied; internal-only disposable TCP Echo Worker deployed.
- Baseline VLESS Worker WebSocket → handler → Service Binding TCP echo succeeded with two concurrent clients. Each uploaded/downloaded 65,542 bytes; aggregate 131,084 bytes in each direction.
- Baseline session-lease drain failed: `drained=false`, `activeSessions=1` after 30 polls. The workflow stopped before slow-reader admission; no new evidence about bounded Worker-internal downstream buffering was collected.
- Preview output exposes lifecycle events that were not visible in Run #13's captured output: `websocket.close_event`, `session.close.start`, `tcp.socket_close.complete`, and `session.lease_release.start`. No matching `session.lease_release.complete` or `session.lease_release.error` appears in the captured tail. This narrows the visible sequence to after release-start but does not prove that the D1 delete is blocked or establish a definitive root cause; output-tail truncation or delayed/ambiguous completion remain possible.
- The workflow explicitly reports disposable Worker and D1 cleanup completed and absence verified. No staging/production resources touched. This was not a 1101 failure.
- Issue #78 updated with comment https://github.com/ijoolaie/imoxy-net/issues/78#issuecomment-6718928198. Issue remains open; Worker-internal downstream buffering remains unproven.
- Do not relax the lease-drain gate, add speculative release retries, alter lease/session/resource caps, or claim a definitive D1 root cause. Next work should inspect the exact release promise/logging and D1 operation outcome path locally before proposing a narrowly scoped harness or code change. Any further Cloudflare execution requires fresh explicit user authorization.
- Raya MCP availability/config and workspace roots were checked; the workspace was reachable and the worktree was clean on branch `docs/issue78-pr245-merge-handoff-2026-11-08`. `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.


## PR #248 merge handoff — 2026-11-08

- PR #248 (`docs: record Issue #78 Run #14 and PR #246 merge`) was squash-merged under standing merge authorization after exact-head CI run `42460437041`, job `128668366477` (`test`), completed successfully, including `Run npm run verify`. PR head `b6219493e5a14deebc04bfb6ac91de82f6ada4cd`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `d7c9bb87c1cd8a0b784ae0982ce80a7ed7b52e2a`.
- The merged documentation-only PR records PR #246's merge and disposable Cloudflare Run #14 evidence. No application code changed; Issue #78 remains open.


## PR #249 merge handoff — 2026-11-08

- PR #249 (`docs: record Issue #78 PR #248 merge`) was squash-merged under standing merge authorization after exact-head CI run `42460500331`, job `128668559719` (`test`), completed successfully, including `Run npm run verify`. PR head `b5a9799683ff83908a33ac7a0fb684f1bf64e41c`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `9cf4f9e5be8f11a8678a178956dcabd339d83971`.
- This was a documentation-only handoff update. No application code or Cloudflare resources changed; Issue #78 remains open.
## PR #250 merge handoff — 2026-11-08

- PR #250 (`docs: record Issue #78 PR #249 merge`) was squash-merged under standing merge authorization after exact-head CI run `42460546841`, job `128668696582` (`test`), completed successfully, including `Run npm run verify`.
- Exact PR head: `fe96e344741fd74df1f6e24d953d9b277e5001db`. Immediately before merge, PR was open and mergeable/clean, with no submitted reviews or unresolved inline review threads. Expected-head SHA was supplied. Squash merge commit: `aef6e7d02287a7bb83cdfcd5ae6b2a098e22ff63`.
- Documentation-only; no application code or Cloudflare resources changed. Issue #78 remains open; Run #14's unresolved lease-release stage and Worker-internal downstream buffering remain unproven. No new Cloudflare run was dispatched.
- Raya fetched `origin/main` and created a clean branch `docs/issue78-pr250-merge-handoff-2026-11-08` from exact merge commit `aef6e7d02287a7bb83cdfcd5ae6b2a098e22ff63` for this record.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## PR #251 merge handoff — 2026-11-08

- PR #251 (`docs: record Issue #78 PR #250 merge`) was squash-merged under standing merge authorization after exact-head CI run `42466997932`, job `128688695920` (`test`), completed successfully. PR head `41e413e461f74b052c0f76e1d35e3ba9d9f46909`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable/clean. Expected-head SHA supplied. Squash merge commit: `b01aeff0d7b821b1b04222fc408127c4af6c7053`.
- Documentation-only; no application code or Cloudflare resources changed. Raya fetched `origin/main` at the merge commit and created clean branch `docs/issue78-pr251-merge-handoff-2026-11-08` for this follow-up.

## Issue #78 local lifecycle follow-up — 2026-11-08

- Read-only review of `src/proxy/vless-websocket-handler.js` confirms the accepted WebSocket `close` listener emits `websocket.close_event` and invokes `void closeSession(1000, "client_closed")`; the `error` listener similarly invokes `void closeSession(...)`. `closeSession()` awaits pending connect cleanup, TCP socket closure, and any pending upload write, then awaits `releaseSessionLease()`. The release helper awaits `store.releaseProxySession()` between the existing start and complete/error diagnostics.
- `worker.js` currently defines `fetch(request, env)` without the third `ctx` parameter and calls `vlessProxy.fetch(request, env)`; no execution-context object is passed into the VLESS handler. This is a source fact, not proof that Cloudflare cancels the close-event cleanup.
- Existing deterministic Node handler tests cover delayed release and verify that the release completion event is absent while the storage promise is pending, then appears after it resolves. They do not establish Cloudflare Workers' execution-lifetime behavior for asynchronous work launched from a WebSocket `addEventListener("close")` callback.
- Current Cloudflare WebSocket API documentation describes `addEventListener` and the close event but does not specify whether callback-returned promises are awaited or how detached asynchronous cleanup is kept alive. The Context API documents `ctx.waitUntil()` for extending fetch-handler work after response completion, with a 30-second limit after the HTTP response or client disconnect. That generic guidance alone does not prove this WebSocket close path is canceled, and it does not establish a safe `waitUntil` fix for long-lived connections.
- This makes event/execution-context lifetime a concrete hypothesis to investigate alongside the D1 request outcome; it is not a proven Run #14 root cause. Do not add speculative retries, weaken lease accounting, or change the handler based only on this hypothesis.
- No application code was changed and no Cloudflare workflow, Worker, or D1 resource was run or modified. Any new disposable runtime test requires fresh explicit user authorization. Issue #78 remains open; bounded Worker-internal downstream buffering remains unproven.

## PR #252 merge handoff — 2026-11-08

- PR #252 (`docs: record Issue #78 PR #251 merge and lifecycle follow-up`) was squash-merged under standing merge authorization after exact-head CI run `42467230207`, job `128689443989` (`test`), completed successfully. PR head `58832fd856c353bf4df275d2a26b9ccbdd975bd8`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable/clean. Expected-head SHA supplied. Squash merge commit: `9c92590304f7013b311fea1a5abae1c3e57f0141`.
- Documentation-only; no application code or Cloudflare resources changed.

## Issue #78 workerd source cross-check — 2026-11-08

- Read-only review of Cloudflare `workerd` commit `88b5871e8873a833b278f346473eed69a4443855`, file `src/workerd/api/web-socket.c++`: regular `LegacyWebSocketAdapter` registers the socket read loop with `context.addWaitUntil(...)` at line 940. On receipt of a close frame, the read loop synchronously calls `dispatchReportOnly(...CloseEvent...)` at lines 1594–1595 and then returns from the read loop at lines 1596–1603. `dispatchReportOnly` calls `shell.dispatchEventImpl(...)` synchronously at lines 51–55.
- The application's close listener uses `void closeSession(...)`, so it does not return the cleanup promise to event dispatch or explicitly attach it to the read-loop waitUntil promise. The runtime's read-loop waitUntil visibly covers delivery of the close event, but this source-level observation only motivates a cancellation/lifecycle hypothesis; it does not prove that the detached D1 operation is canceled or that the managed Cloudflare runtime exactly matches this workerd snapshot.
- Updated Issue #78 comment `6719804746` with these links and caveats. No application code was changed, and no Cloudflare workflow, Worker, or D1 resource was run or modified. A new disposable runtime test still requires fresh explicit user authorization.

## Issue #78 Run #15 and WebSocket close-cleanup fix candidate — 2026-11-08

- User supplied Run #15: https://github.com/ijoolaie/imoxy-net/actions/runs/42467892059/job/128691535734. Exact checked-out `main` commit: `3a80d7d684cbfb0c538a9df52e25fa8d5e3402ad`. Baseline lease drain failed (`drained=false`, `activeSessions=1` after 30 polls), before slow-reader admission. Lifecycle counts: `websocket.close_event=6`, `session.close.start=6`, `tcp.socket_close.complete=6`, `session.lease_release.start=6`, `session.lease_release.complete=0`, `session.lease_release.error=0`. Disposable Worker and D1 cleanup completed and absence was verified; no staging/production resources used. Issue #78 comment: https://github.com/ijoolaie/imoxy-net/issues/78#issuecomment-6719908343.
- Read-only source evidence narrows the strongest local candidate: accepted WebSocket `close`/`error` listeners call `void closeSession(...)`; `closeSession()` proceeds through TCP socket close and then awaits `store.releaseProxySession()`. Cloudflare `workerd` source review showed WebSocket read-loop registration with runtime `addWaitUntil`, but EventTarget ignores promises returned from listeners. Thus the application cleanup promise is detached from the runtime's tracked WebSocket read-loop promise. This is strongly consistent with Runs #14/#15 stopping after `session.lease_release.start`, but does not prove managed-runtime cancellation or D1's underlying request outcome.
- Implemented on feature branch `fix/issue78-track-websocket-close-cleanup-2026-11-08` from `origin/main` (`3a80d7d684cbfb0c538a9df52e25fa8d5e3402ad`): pass the Workers execution context through `worker.js` into the VLESS handler; route all asynchronous close paths through `trackCloseSession()`, which registers the cleanup Promise with `ctx.waitUntil()` and retains a rejection handler. This explicitly tracks cleanup rather than relying on a listener's ignored return value. Official Context docs state `waitUntil()` keeps work running after response and provides up to 30 seconds after response/client disconnect; official WebSocket docs describe the accepted socket close event. References: https://developers.cloudflare.com/workers/runtime-apis/context/ and https://developers.cloudflare.com/workers/runtime-apis/websockets/.
- Added deterministic regression test `WebSocket close cleanup is registered with the Workers execution context`: asserts one waitUntil registration, pending state while simulated D1 release is blocked, and settlement only after release resolves.
- `cmd.exe /c npm run verify` passed: 261 passed, 1 skipped, 0 failed (262 total); syntax checks passed. `git diff --check` passed.
- No Cloudflare runtime workflow/probe was dispatched. Runtime verification of this fix still requires fresh explicit user authorization. Issue #78 remains open until the disposable runtime confirms lease drain and subsequently exercises slow-reader/backpressure; bounded Worker-internal downstream buffering is still unproven. Do not claim definitive D1 root cause or relax the lease-drain gate/resource caps. Keep 1101/domain/VPN at final priority.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB file-tool limit; this supplemental addendum is the handoff record.
## PR #255 merge handoff — 2026-11-08

- PR #255 (`fix: track VLESS WebSocket close cleanup with waitUntil`) was squash-merged under standing merge authorization after exact-head CI run `42468666223`, job `128694024470` (`test`), completed successfully. PR head `dcdfe6c6e00124b7922fdbed1107d0f25b3a3707`; no submitted reviews or unresolved inline review threads; GitHub reported mergeable/clean. Expected-head SHA supplied. Squash merge commit: `46c44463993875796a90d7d22479c032c1c90c77`.
- The merged change passes the request ExecutionContext into the VLESS handler and registers asynchronous session-close cleanup with `ctx.waitUntil()`. The deterministic regression test and full verification passed (261 passed, 1 skipped, 0 failed). This addresses the strongest source-level explanation for Runs #14/#15, but does not prove the managed-runtime cancellation hypothesis or D1 root cause.
- Issue #78 remains open. No Cloudflare runtime workflow was dispatched; the next disposable runtime validation requires fresh explicit user authorization and must first verify lease drain before proceeding to slow-reader/backpressure acceptance. Staging/production remain untouched.
- Raya fetched `origin/main` at `46c44463993875796a90d7d22479c032c1c90c77` and created clean branch `docs/issue78-pr255-merge-handoff-2026-11-08` for this merge record. `HANDOFF.md` remains untouched due its 302,410-byte size exceeding the supported 256 KiB text-tool limit; this addendum remains the supplemental handoff.

## Issue #78 Run #16 harness context-forwarding defect — 2026-11-08

- Re-inspected the exact smoke Worker used by `.github/workflows/vless-cloudflare-smoke.yml`: `test/vless-service-binding-tcp-smoke-worker.js` originally declared `fetch(request, env)` and invoked `vlessProxy.fetch(request, env)`, unlike production `worker.js`, which passes the third Fetch `ExecutionContext` argument.
- Therefore, the Run #16 disposable runtime did not exercise PR #255's `ctx.waitUntil(cleanup)` path: the smoke Worker supplied no execution context, so the handler's optional `executionContext?.waitUntil` branch was skipped. This is a confirmed harness wiring defect and explains why Run #16 cannot be treated as a runtime evaluation of the PR #255 fix. It does not prove that forwarding ctx will make the lease drain succeed, nor establish D1 as a root cause.
- On feature branch `fix/issue78-smoke-worker-waituntil-context` from exact `origin/main` `05e4a65dd084994f780528505c32a781e60fdf68`, changed the smoke Worker to accept `fetch(request, env, executionContext)` and forward the same context to the VLESS handler. Added an injectable `createSmokeWorker({ proxyFetch })` adapter seam and deterministic test asserting the request, env, and exact executionContext object are forwarded.
- Targeted test passed: 6/6. Full `cmd.exe /c npm run verify` passed: 262 passed, 1 skipped, 0 failed (263 total); syntax checks passed. No Cloudflare runtime workflow, Worker, or D1 resource was run or modified.
- Next: inspect diff/CI, create PR on this feature branch, and update Issue #78 with the harness finding. Only after merge and fresh explicit user authorization should a new disposable runtime run be considered. The new run must first prove `waitUntil` is passed and baseline lease drain completes; only then may it advance to slow-reader/backpressure. Issue #78 remains open and bounded Worker-internal downstream buffering remains unproven. `HANDOFF.md` remains untouched because it exceeds the 256 KiB tool limit; this addendum is the supplemental handoff.

## Issue #78 — `waitUntil` post-response lifetime risk — 2026-11-08

- Re-read current official Cloudflare Workers Context and WebSockets documentation after PR #257 merged. The Context docs specify that for HTTP-triggered Workers, `ctx.waitUntil()` extends execution for up to 30 seconds after the response is sent or the client disconnects; this budget is shared across all `waitUntil()` calls for the request. WebSocket docs describe accepted WebSocket connections that can remain open until runtime process updates/shutdowns disconnect them.
- The VLESS handler returns a WebSocket upgrade response while the accepted socket can remain open substantially longer. PR #255 registers `closeSession()` with the original Fetch ExecutionContext only when the WebSocket `close`/`error` event fires. If that event occurs after the documented post-response window, the original `waitUntil` budget may already have expired. Thus the current implementation is not yet demonstrated reliable for long-lived sessions. This is a design/runtime risk, not proof PR #255 fails or caused Runs #14–#16.
- Existing deterministic test `WebSocket close cleanup is registered with the Workers execution context` proves the Promise is passed to a mock waitUntil and settles after mocked storage release; it does not model the Cloudflare 30-second post-response boundary or a close event arriving after that boundary.
- Posted this qualification to Issue #78 comment `6721010903`. Official references: https://developers.cloudflare.com/workers/runtime-apis/context/ and https://developers.cloudflare.com/workers/runtime-apis/websockets/ .
- Next source-level task: identify a runtime-supported lifecycle owner for long-lived WebSocket cleanup (evaluate Durable Object ownership or another supported mechanism) before treating the Fetch-context waitUntil approach as runtime-ready. Do not dispatch another Cloudflare smoke run without fresh explicit user authorization; do not change staging/production or relax lease/resource limits. Issue #78 remains open; bounded buffering/backpressure remains unproven.
- Local verification on `origin/main` `efcb42c68dde537c047ba9022c0bb0cf24473956`: `npm test` passed (262 passed, 1 skipped, 0 failed; 263 total). No application code changed and no Cloudflare runtime was executed. `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB tool limit; this addendum is the supplemental handoff.

## Issue #78 — Durable Object lifecycle-owner assessment — 2026-11-08

- PR #258 (`docs: record Issue #78 waitUntil lifetime risk`) merged after exact-head CI success, no unresolved review threads, mergeability confirmed, and expected-head SHA enforced. Head `42ff164fce34cbf99075bef2cb3e77ccf435f918`; squash merge commit `b6487be01c857fd13b42dab719b3d8dcf87d8b47`.
- Read-only source/config review on `main` `b6487be01c857fd13b42dab719b3d8dcf87d8b47`: no Durable Object class, binding, migration, or actual runtime config is present in repository source/config examples. Current VLESS handler accepts a standard Worker WebSocket (`server.accept()` plus event listeners), owns the outbound TCP socket created by `connect()`, and releases the D1 session lease from `closeSession()`.
- Persisted session lease expiry is bounded: `createdAt + initialHandshakeTimeoutMs + maxSessionDurationMs + sessionLeaseGraceMs`. D1 admission counts only rows with `expires_at > now`, and expired rows are opportunistically pruned. Therefore a missed close cleanup can retain a session slot until expiry but cannot permanently leak capacity. Immediate cleanup is still desirable and is what the smoke baseline currently expects.
- Durable Objects offer WebSocket Hibernation API close handlers and durable alarms, but moving the whole proxy into a DO is not a drop-in fix: the proxy requires a live outbound TCP socket; Cloudflare docs say outbound TCP connections prevent DO eviction for at most 15 minutes per connection, after which normal eviction rules resume even if the socket itself remains open. An open outbound connection also prevents hibernation. Alarms have at-least-once delivery and bounded automatic retries; persistent failures require idempotent handling and explicit rescheduling.
- Posted assessment to Issue #78 comment `6721059598`. Official docs: https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/ ; https://developers.cloudflare.com/durable-objects/best-practices/websockets/ ; https://developers.cloudflare.com/durable-objects/api/alarms/ .
- Decision: do not add a DO binding/class yet. Next proof should isolate Worker ExecutionContext semantics for an upgraded WebSocket request and a close event occurring more than 30 seconds after the 101 response, using only the disposable smoke workflow and only after fresh explicit user authorization. Preserve D1 expiry fallback; do not shorten grace or alter session/resource caps. No Cloudflare runtime, Worker, D1, staging, or production resource was touched during this assessment. Issue #78 remains open and bounded-buffer/backpressure acceptance remains unproven. `HANDOFF.md` remains untouched due its 302,410-byte size exceeding the supported 256 KiB tool limit; this addendum is the supplemental handoff.

## PR #259 merge handoff — 2026-11-08

- PR #259 (`docs: assess Issue #78 Durable Object lifecycle`) was squash-merged under standing merge authorization after exact-head CI run `42477062316`, job `128720655964` (`test`), completed successfully, including `npm run verify`. Exact PR head `c3df3ca3931818a8808b01f8c9982046be1c54b5`; no unresolved review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `4722d47bde4a4599c439b12d825515607ed8b5bb`.
- Documentation-only handoff; no application code changed and no Cloudflare runtime, Worker, D1, staging, or production resource was run or modified. Issue #78 remains open; no bounded-buffer/backpressure acceptance evidence exists.
- Raya availability/config and workspace roots were checked. Worktree `C:\\Users\\Ali\\imoxy-net-review-worktree` was clean on branch `research/issue78-websocket-lifecycle-owner-2026-11-08` tracking its origin branch. The local branch is now behind the newly merged `main`; do not amend or push this old PR branch. Start any follow-up from freshly fetched `origin/main`.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB text-tool limit; this addendum is the supplemental handoff.
- Next safe action: design (and review locally) a narrowly scoped disposable runtime test for a WebSocket close event arriving more than 30 seconds after the HTTP 101 response, checking whether the original Fetch ExecutionContext can still register/complete cleanup. Do not dispatch it without fresh explicit user authorization. If the execution-context lifetime is not supported, investigate an architecture with a valid lifecycle owner rather than adding a speculative Durable Object. Preserve D1 expiry fallback, session/resource caps, and final-priority 1101 handling.

## Issue #78 — ExecutionContext lifetime probe design — 2026-11-08

- Fetched `origin/main` at PR #259 merge commit `4722d47bde4a4599c439b12d825515607ed8b5bb`; created clean-base branch `docs/issue78-runtime-context-lifetime-test-2026-11-08`. Restored the pending PR #259 handoff note from a local stash onto this new branch; no prior work was discarded.
- Read-only review of `test/vless-service-binding-tcp-smoke-worker.js`, `scripts/vless-cloudflare-runtime-smoke.mjs`, `scripts/vless-service-binding-cloudflare-smoke.mjs`, `.github/workflows/vless-cloudflare-smoke.yml`, and the VLESS handler's `trackCloseSession()` confirms the existing smoke Worker forwards Fetch `ExecutionContext`, the handler calls `waitUntil()` only when close cleanup begins, and the disposable VLESS session cap remains 30 seconds.
- Designed a separate tokenized test-only WebSocketPair route, avoiding any VLESS session, D1, TCP, quota, or cap change. The proposed probe has a 5-second positive control and a 36-second late-close case, records payload-free nonce-correlated `close_event`, `wait_until_registered` / `wait_until_registration_error`, and `task_completed` markers, and checks Wrangler preview logs rather than isolate-local HTTP diagnostics.
- Full design and interpretation matrix: `docs/issue78-execution-context-lifetime-probe.md`. This is design-only: no probe route, client, orchestrator, or workflow code has been implemented; no Cloudflare runtime/Worker/D1 resource was run or modified. The design explicitly distinguishes a successful late task from D1 lease cleanup and bounded-buffer proof.
- Local design guardrails: do not increase the 30-second VLESS session duration or any other cap; keep the route random-token-gated; fail closed on missing/ambiguous markers; run the probe before the baseline VLESS test; preserve the baseline lease-drain gate; any future Cloudflare run requires fresh explicit user authorization.
- `HANDOFF.md` remains untouched because its 302,410-byte size exceeds the supported 256 KiB tool limit; this addendum remains the supplemental handoff. Issue #78 remains open; bounded Worker-internal downstream buffering is unproven.

## PR #260 merge handoff — 2026-11-08

- PR #260 (`docs: design Issue 78 ExecutionContext lifetime probe`) was squash-merged under standing merge authorization after exact-head CI run `42477669211`, job `128722508299` (`test`), completed successfully, including `npm run verify`. Exact PR head `da86f275e57629586c8d52200fea4ff5501100b2`; no unresolved review threads; GitHub reported mergeable. Expected-head SHA supplied. Squash merge commit: `3107cbede09f3f7b1d7474af4d4665c962eac9e4`.
- PR #260 is documentation-only: adds `docs/issue78-execution-context-lifetime-probe.md` and handoff reconciliation. No probe code or workflow change was included. No Cloudflare workflow, Worker, D1, staging, or production resource was run or modified. The 5-second control / 36-second late-close test remains a design, not a runtime result.
- Worktree was advanced to a new clean-base handoff branch `docs/issue78-pr260-merge-handoff-2026-11-08` from `origin/main` at `3107cbede09f3f7b1d7474af4d4665c962eac9e4`; previous design branch was clean and its PR merged. `HANDOFF.md` remains untouched due the 302,410-byte file exceeding the supported 256 KiB text-tool limit.
- Next step: implement the tokenized WebSocketPair test route, bounded Node client, and preview-log assertions described in the design document, with local deterministic tests and CI. Do not dispatch the disposable Cloudflare workflow or create resources until the user gives fresh explicit authorization. Keep Issue #78 open; no bounded-buffer/backpressure acceptance evidence exists.