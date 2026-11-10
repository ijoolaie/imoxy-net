# Handoff addendum — 2026-11-10

This file records the latest Issue #78 BYOB runtime result and cancellation/error contract review. It supplements `HANDOFF.md` and the dated addenda.

## Issue #78 disposable BYOB lifecycle runtime — Run #42772724549

- User manually dispatched the approved one-shot workflow: https://github.com/ijoolaie/imoxy-net/actions/runs/42772724549 ; job `129684057736`. Conclusion: `failure`. Exact main SHA `f314e20b4e6cf45026c56e031baa866622985ec1`; Node `22.23.4`; Wrangler `4.156.0`.
- Disposable internal TCP Echo Worker deployed successfully; Wrangler remote preview started; `/health` returned HTTP 200; random probe path reached the fetch handler. Probe returned HTTP 500 with structured JSON (CF-Ray `a58334545f04f95f-SJC`), so this was a probe-contract failure rather than the earlier deployment/startup ambiguity.
- Successful cases: default reader, BYOB buffer reuse, and BYOB fresh 4 KiB buffers each transferred 32,768 bytes in 8 reads with integrity true. Max delivered view and backing buffer were 4,096 bytes in these cases. Peer EOF returned `done:true`, zero bytes. These observations do not bound native socket queues or total Worker memory.
- Pending BYOB cancellation: pending read rejected with generic `Error`; the old harness did not separately capture whether `reader.cancel()` fulfilled or rejected. The exact error and cause remain unknown.
- Old peer-error case: echo Worker called `writer.abort(new Error(...))`; probe readable unexpectedly resolved. This does not establish how TCP reset/error propagates because writable abort is not documented as a remote TCP reset.
- Cleanup completed and verified absence of the disposable preview and TCP Echo Worker. No D1, staging, production, or unrelated resource was involved.

## BYOB cancel/error contract review and probe correction

- Reviewed the current WHATWG Streams Standard (https://streams.spec.whatwg.org/) and Cloudflare TCP Sockets / Connect Handler docs (https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/ and https://developers.cloudflare.com/workers/runtime-apis/handlers/connect/; Cloudflare docs last updated Oct 13, 2026).
- WHATWG BYOB contract: canceling an active BYOB reader should fulfill a pending `read()` with `done: true` and `value: undefined`; normal close/EOF fulfills with `done: true` and an empty view; an errored stream rejects the pending read with its stored error. The cancellation promise itself may reject if the underlying source's cancellation algorithm fails. Releasing the reader lock while reads are pending independently rejects those reads with `TypeError`; lock release must wait until both cancellation and pending read settle.
- Cloudflare TCP docs expose `Socket.readable` and `Socket.writable`, describe `Socket.close()` as forcibly closing both stream sides, expose `socket.closed` as rejecting on socket error, and define `allowHalfOpen=false` as auto-closing writable when readable reaches EOF. They do not document `writer.abort()` as generating a TCP RST or guaranteeing a remote readable error.
- The previous `peerError` case called `writer.abort(new Error(...))` on the echo Worker's writable side and incorrectly required the other Worker's readable `read()` to reject. That is not a documented cross-end TCP error contract. The harness now calls documented `socket.close()` and records the remote read outcome without asserting either resolution or rejection. This is a peer socket-close observation, not a TCP reset/error injection. True TCP reset/error propagation remains untested; the documented API does not expose a reset primitive in these docs.
- The pending-cancel harness now records `cancelOutcome` and `readOutcome` separately. A failed read no longer hides whether `reader.cancel()` itself fulfilled or rejected. The test still marks cancellation incompatible if the pending BYOB read rejects rather than completing with `done: true`/zero bytes.
- Updated only disposable probe files: `test/issue78-byob-probe-worker.js`, `test/issue78-byob-probe-echo-worker.js`, and `test/issue78-byob-probe-worker.test.js`. No production adapter or VLESS handler code changed.
- `cmd.exe /c npm run verify` passed: 289 passed, 1 skipped, 0 failed (290 total). `npm_test` also passed with the same counts. `git diff --check` passed; only CRLF normalization warnings were reported.
- Workspace during implementation: `D:\\Work\\project\\imoxy-net-review-worktree`; feature branch: `audit/issue78-byob-cancel-error-contract-2026-11-10`. The implementation itself was offline-only; no Cloudflare runtime, Worker, D1, staging, production resource, or GitHub issue was modified.
- Decision: keep the production adapter on the default reader. BYOB transfer works in the tested runtime but pending-read cancellation remains a failed/unexplained compatibility result. The previous peer-writable-abort failure was an invalid expected cross-end error assertion; its replacement only observes socket-close behavior. Issue #78 remains open because native downstream buffering and total Worker memory bounds remain unproven. Error 1101/domain/VPN remains final-priority.
- Any future Cloudflare runtime execution requires fresh explicit user authorization. The earlier one-shot approval was consumed by Run #42772724549.
- `HANDOFF.md` remains unchanged because its size exceeds the supported 256 KiB file-tool limit. This addendum is the current supplemental handoff.

## PR #322 merge handoff — 2026-11-10

- PR #322 (`test: clarify BYOB cancel and peer close semantics`) was squash-merged into `main` at `98aa0c0de03d02d59e0b23f42707cffd1b0ccd79`. Exact PR HEAD: `785fde330c9a6ed9f24551b35d4ed8f1de54ba6c`.
- Exact-head CI run `42775809486`, job `129693917883`, completed successfully with `npm run verify`: 289 passed, 1 skipped, 0 failed (290 total). `git diff --check` passed locally.
- No submitted reviews or inline review threads; GitHub reported the PR mergeable and clean before merge. Merge used the expected head SHA.
- PR #322 changed only the disposable BYOB probe worker/echo worker/tests and added `HANDOFF-ADDENDUM-2026-11-10.md`. No production VLESS handler or adapter changed.
- The post-merge workspace fetched `origin/main` at `98aa0c0de03d02d59e0b23f42707cffd1b0ccd79` and created follow-up branch `docs/issue78-pr322-merge-handoff-2026-11-10` for this merge record.
- No Cloudflare runtime was executed for PR #322. Any next runtime probe requires fresh explicit user approval; the one-shot approval was consumed by Run #42772724549. Issue #78 remains open; production adapter remains default reader; native bounded buffering and total Worker memory remain unproven.

## Issue #78 socket.closed lifecycle review and true TCP reset test plan — 2026-11-10

- Offline review found the VLESS handler observed `reader.read()` and `writer.write()` failures but did not attach a rejection observer to the documented Cloudflare `Socket.closed` Promise.
- The handler now attaches a non-blocking rejection observer as soon as the candidate is stored as `state.pendingSocket`, before awaiting `socket.opened`, so errors during connection establishment are observed too. A rejection while the session remains active requests the existing idempotent `trackCloseSession(1011, "upstream_error")` path. Normal resolution is deliberately not treated as an error or a replacement for readable EOF; the readable pump remains authoritative for `upstream_closed`. Late rejection after local close is ignored by the existing `state.closed` guard. The rejection value is not inspected or logged.
- Added deterministic handler tests: (1) socket.closed rejects with `undefined` while readable is pending → generic upstream error close, socket closure and exactly one lease release; (2) socket.closed resolves together with readable EOF → normal `upstream_closed`, not `upstream_error`, and one lease release.
- Full `cmd.exe /c npm run verify` passed: 292 passed, 1 skipped, 0 failed (293 total). No Cloudflare runtime was run.
- Created `docs/issue78-socket-closed-and-rst-test-plan.md` describing the Cloudflare API contract, workerd clean-FIN rejection caveat, the exact independent RST injection topology, FIN control, evidence fields, acceptance criteria and cleanup. A Worker-to-Worker Service Binding echo cannot reliably synthesize a TCP RST with `writer.abort()` or `socket.close()`; the independent test requires a disposable externally reachable TCP fault-injection endpoint using kernel `SO_LINGER={on:1, linger:0}`.
- Cross-repository evidence: workerd issue #6479 remains open as of 2026-11-10; PR #6483 is also open and adds a runtime regression test, not proof of a merged fix. Do not classify a `socket.closed` rejection alone as TCP reset; workerd's reported FIN/explicit-close race can reject with `undefined`.
- Changes are on feature branch `audit/issue78-socket-closed-lifecycle-2026-11-10`; production handler behavior change is limited to observing documented socket.closed rejection and routing it through existing cleanup. No D1 schema, quota logic, session admission logic, Worker config, staging, or production resources changed.
- Future Cloudflare runtime execution still requires fresh explicit one-run user approval. The prior one-shot approval was consumed by Run #42772724549. Issue #78 remains open; this work does not prove bounded downstream buffering or total Worker memory. Production adapter remains default reader; Error 1101/domain/VPN remains final-priority.


## PR #324 merge handoff — 2026-11-10

- PR #324 (`fix: observe TCP socket closure errors`) was squash-merged into `main` at `37ffb9c6bbc3eeb58527b75582fd413999779e68`. Exact PR HEAD: `f38ae40f28ba5ac04e4bc5a01c1d4ac12e76bb88`.
- Exact-head CI run `42780067862`, job `129707691815`, completed successfully. The local exact-head `cmd.exe /c npm run verify` result was 292 passed, 1 skipped, 0 failed (293 total); `git diff --check` passed.
- No submitted reviews or inline review threads; PR was mergeable and clean before merge. Merge used the expected head SHA.
- PR #324 changes production handler only to observe `socket.closed` rejection and route active failure through the existing idempotent cleanup. It does not alter quota reservation/settlement, D1 schema, session-admission policy, Worker config or transport reader choice. It adds deterministic tests and the TCP RST plan.
- No Cloudflare runtime or external TCP fault-injection endpoint was executed. Any next runtime run requires fresh explicit one-run user authorization; the earlier authorization was consumed by Run #42772724549.
- Follow-up handoff branch: `docs/issue78-pr324-merge-handoff-2026-11-10`, based on merged `main` commit `37ffb9c6bbc3eeb58527b75582fd413999779e68`.

## Pending upload-write rejection after socket.closed failure — 2026-11-10

- On feature branch `test/issue78-socket-closed-pending-write-rejection-2026-11-10`, added a deterministic handler regression test for the combined lifecycle: an upload crosses the forwarding marker, `writer.write()` remains pending, `socket.closed` rejects, socket cleanup runs, and the pending write then rejects.
- Assertions: the session closes with generic `upstream_error`; TCP socket close and writer abort are requested; the admission lease remains held while the write outcome is unresolved; failed write produces no usage settlement; the forwarding-marked reservation is not released; after the write rejection settles, the admission lease is released exactly once even after repeated WebSocket close notification.
- No production code, D1 schema, quota semantics, Cloudflare resources, staging, or production settings changed.
- Validation: `cmd.exe /c npm run verify` passed on the feature branch: 294 tests total, 293 passed, 0 failed, 1 skipped. `git diff --check` passed; Git reported only the expected LF-to-CRLF working-copy warning.
- This is deterministic Node/fake-socket evidence only. It does not prove Cloudflare TCP error propagation, RST behavior, bounded downstream buffering, or total Worker memory. Issue #78 remains open.
- `HANDOFF.md` was not modified because it exceeds the supported 256 KiB file-tool limit; this addendum records the current work.

## PR #326 merge handoff — 2026-11-10

- PR #326 (`test: cover socket close during pending upload write`) was squash-merged into `main` at `567ca7228ca94c5a890b631fcc03c66184f163bd`. Exact PR HEAD: `ffd9fef052b14218f0c9a628787cb1036c1ef931`; base SHA: `461630b1dbbe1a5973dcfd3f9e943031706db553`.
- Exact-head CI run `42782231494`, job `129714765662`, completed successfully; the `npm run verify` step passed. Local verification on the same test content: 294 total, 293 passed, 0 failed, 1 skipped.
- No submitted reviews or inline review threads. GitHub reported the PR mergeable before merge; squash merge used the expected exact head SHA.
- PR #326 adds only the deterministic pending-write rejection test and this supplemental handoff update. No production code, quota semantics, D1 schema, Worker configuration, or runtime resources changed.
- No post-merge main workflow run was returned at handoff time. No Cloudflare runtime was executed. Issue #78 remains open; this test does not prove TCP RST propagation, bounded downstream buffering, or total Worker memory.
- Follow-up handoff branch: `docs/issue78-pr326-merge-handoff-2026-11-10`, based on merged `main` commit `567ca7228ca94c5a890b631fcc03c66184f163bd`.
- `HANDOFF.md` remains unchanged because it exceeds the supported 256 KiB file-tool limit; this addendum is the current supplemental handoff.

## FIN/RST endpoint protocol hardening — 2026-11-10

- Expanded `docs/issue78-socket-closed-and-rst-test-plan.md` with a narrowly scoped endpoint contract and exact nonce/token wire protocol for FIN control and abortive RST mode.
- Added safety constraints: loopback-only default bind; explicit public-bind/firewall opt-in; one-run high-entropy token loaded as a secret; constant-time token comparison; fixed command set and payload; strict line/byte/connection/deadline caps; no arbitrary destination or relay; sanitized monotonic event logs; hard stop and cleanup verification.
- Specified a dedicated Cloudflare probe importing `connect` from `cloudflare:sockets`, with literal IP/port allowlisting, token in a Worker secret, immediate independent observation of `socket.closed`/read/write outcomes, and no local close before bounded observation completes.
- Strengthened RST acceptance: a server-side zero-linger call/log alone is not proof. Require packet-level outgoing RST evidence correlated to the connection tuple; otherwise report only an abortive-close attempt.
- Corrected the wire protocol to use `MODE FIN|RST <nonce> <token>`; added a distinct runtime execution checklist.
- Documentation/design only. No endpoint was created or started, no public port opened, no Worker deployed, and no Cloudflare runtime executed. Any later Cloudflare probe still requires fresh explicit one-run user authorization and manual GitHub UI dispatch.
- `HANDOFF.md` remains unchanged due to its size exceeding the supported 256 KiB file-tool limit; this addendum records the work.

## PR #328 merge handoff — 2026-11-10

- PR #328 (`docs: harden issue 78 FIN RST probe protocol`) was squash-merged into `main` at `0c1cfced5ab1f2e58428138122cefccfb892f1de`. Exact PR HEAD: `827def4c3b4a9d46c8fe7c5a2d9f58d3018d8e54`; base SHA: `da49f75fb495d981456e64695a90dcb89e8f47c9`.
- Exact-head CI run `42784783029`, job `129723185003`, completed successfully; `npm run verify` passed. Local verification: 294 total, 293 passed, 0 failed, 1 skipped. `git diff --check` passed with only LF-to-CRLF working-copy warnings.
- No submitted reviews or inline review threads. GitHub reported the PR mergeable before merge; squash merge used the expected exact head SHA.
- PR #328 changes only `docs/issue78-socket-closed-and-rst-test-plan.md` and this supplemental addendum. No endpoint, public port, Worker, D1, staging, production resource, or Cloudflare runtime was created or touched.
- Issue #78 remains open. The test protocol is designed but not implemented or executed; no true TCP RST propagation or bounded downstream buffering has been proven.

## FIN/RST standalone probe scope clarification — 2026-11-10

- Clarified the RST/FIN acceptance criteria: the standalone `cloudflare:sockets` probe has no D1 binding or VLESS admission lease, so its acceptance covers socket cleanup only. Lease-release assertions apply only if a later, separately approved VLESS integration phase is added.
- This avoids implying that the isolated raw-TCP test exercises production VLESS admission/accounting. No runtime or resource was created or touched.

## PR #328 FIN/RST scope clarification — 2026-11-10

- The standalone socket probe has no D1 binding or VLESS admission lease. Its acceptance criteria now assert socket cleanup only; lease-release assertions are reserved for a later, separately approved VLESS integration phase.
- This is a documentation-only correction to avoid implying that the isolated raw-TCP test exercises production VLESS admission/accounting. No runtime or resource was created or touched.
- Follow-up handoff branch: `docs/issue78-pr328-merge-handoff-2026-11-10`, based on merged `main` commit `0c1cfced5ab1f2e58428138122cefccfb892f1de`.
- `HANDOFF.md` remains unchanged because it exceeds the supported 256 KiB file-tool limit; this addendum is the current supplemental handoff.

