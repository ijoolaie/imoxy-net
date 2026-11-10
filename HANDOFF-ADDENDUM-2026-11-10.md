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
