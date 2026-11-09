# Handoff addendum — 2026-11-09

This file supplements `HANDOFF.md` and the existing `HANDOFF-ADDENDUM-2026-11-07.md`. It records the current work and does not replace either file.

## PR #304 merge handoff

- PR #304 (`docs: record PR 303 merge handoff`) was squash-merged at `fe30ee955d6ed33b0504b00b6b56b8b24d9c02eb`. Exact PR HEAD `56f3bc92237b3f93bfa9720db755be4e65c32b1b`; CI run `42570148330`, job `129005411550`, completed successfully with `npm run verify`. Fresh pre-merge checks showed no submitted reviews or inline review threads, and GitHub reported mergeable true. Merge used the expected head SHA.
- This work branch was created from fetched `origin/main` at `fe30ee955d6ed33b0504b00b6b56b8b24d9c02eb`.

## Issue #78 local message-count audit and fix

- Audited `src/proxy/vless-websocket-handler.js` and deterministic handler tests. Downstream Worker `server.send()` has two call sites: the two-byte VLESS response header and forwarded upstream data. Empty upstream chunks are ignored by `pumpUpstream()`, and `reserveAndSettle()` also rejects zero-byte payloads. Every downstream data send therefore carries at least one byte. With a finite per-session download byte budget B, downstream data-send count is mathematically at most B, plus one VLESS response-header send: at most B+1 sends per session. The installation-wide active-session ceiling C yields an app-level aggregate ceiling at most C(B+1).
- This only bounds application-issued send calls. It does not bound Cloudflare's internal WebSocket queue, framing, native copies, flush completion, or peer receipt. A very large configured B can still imply a very large send count; no separate downstream-send-count setting was added.
- Found a distinct inbound queue gap: `MAX_QUEUED_CLIENT_BYTES` did not bound queued message/promise count because zero-length binary WebSocket messages added zero bytes but still appended a promise-chain node to `state.writeQueue`. A stalled upload settlement could therefore allow unbounded zero-byte message nodes despite the byte cap.
- Fixed by adding an independent fixed `MAX_QUEUED_CLIENT_MESSAGES = 1024` per-session cap, counting the in-flight message as well as pending messages. The existing byte cap remains independent. Both counters decrement in the queued task's `finally`; overflow closes with existing code 1009 / `client_write_queue_full`. No quota, forwarding-marker, settlement, read ordering, or close-race semantics were changed.
- Added a deterministic test that holds the first upload in settlement, queues zero-length binary frames, and verifies the 1,024-message cap closes the session before the next frame can append another queue node. Corrected the existing byte-queue test title to describe the byte cap.
- Targeted queue tests passed (2/2). Full `cmd.exe /c npm run verify` passed: 276 tests passed, 1 skipped, 0 failed (277 total).
- This is local deterministic evidence only; no Cloudflare runtime, Worker, D1, staging, or production resource was touched. Issue #78 remains open because Worker-internal downstream buffering remains unproven. Future Cloudflare runtime execution requires fresh explicit authorization.

## Current workspace

- Workspace: `C:\\Users\\Ali\\imoxy-net-review-worktree`
- Feature branch: `feat/issue78-inbound-message-count-bound-2026-11-09`, created from clean `origin/main` at the base SHA above.
- Base: `origin/main` at `fe30ee955d6ed33b0504b00b6b56b8b24d9c02eb`.
- `HANDOFF.md` remains unchanged because its 302,410-byte size exceeds the supported 256 KiB file-tool limit. This dated addendum is the supplemental handoff.
- Preserve Issue #78 as open and Error 1101/domain/VPN as final-priority. Do not run Cloudflare runtime tests without fresh, explicit user authorization.
