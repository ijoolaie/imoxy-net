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
- Focused `test/vless-websocket-handler.test.js` passed: 71/71. It includes deterministic checks for downstream send count, zero-length inbound message-count overflow, and the existing queued-byte limit. Full `cmd.exe /c npm run verify` passed: 276 tests passed, 1 skipped, 0 failed (277 total).
- This is local deterministic evidence only; no Cloudflare runtime, Worker, D1, staging, or production resource was touched. Issue #78 remains open because Worker-internal downstream buffering remains unproven. Future Cloudflare runtime execution requires fresh explicit authorization.

## Current workspace

- Workspace: `C:\\Users\\Ali\\imoxy-net-review-worktree`
- Feature branch: `feat/issue78-inbound-message-count-bound-2026-11-09`, created from clean `origin/main` at the base SHA above.
- Base: `origin/main` at `fe30ee955d6ed33b0504b00b6b56b8b24d9c02eb`.
- `HANDOFF.md` remains unchanged because its 302,410-byte size exceeds the supported 256 KiB file-tool limit. This dated addendum is the supplemental handoff.
- Preserve Issue #78 as open and Error 1101/domain/VPN as final-priority. Do not run Cloudflare runtime tests without fresh, explicit user authorization.

## PR #305 merge handoff — 2026-11-09

- PR #305 (`fix: bound queued VLESS client message count`) was squash-merged at `ae29c7373b397099b3e5c4cedb39a182bc1aaecf`. Exact PR HEAD `66b4516626b3dabe7cfc9ceb15f31c0176bfca38`; CI run `42608833344`, rerun attempt 2, job `129132073868`, completed successfully with `npm run verify`. A separate PR check run `42608842351`, job `129131651183`, also succeeded. The first CI attempt failed only at the pre-existing slow-reader test's exact `pausedDurationMs >= 1000` timing assertion (observed around the 1-second timer boundary); rerunning the failed job passed. No product-code failure was reported.
- Fresh pre-merge review checks showed no submitted reviews or inline review threads; GitHub reported mergeable true. Merge used the expected head SHA.
- PR #305 changed the VLESS handler, deterministic tests, and this dated supplemental addendum. Local workspace fetched `origin/main` at merge commit `ae29c7373b397099b3e5c4cedb39a182bc1aaecf` and created clean documentation follow-up branch `docs/issue78-pr305-merge-handoff-2026-11-09`.
- Issue #78 received comment `6738890532` summarizing the distinction between app-level send-count bounds and unproven Worker-internal buffering, plus the inbound zero-length message queue fix. Issue #78 remains open.
- No Cloudflare runtime, Worker, D1, staging, or production resource was touched. Any future Cloudflare runtime execution requires fresh explicit user authorization. Preserve final-priority 1101/domain/VPN treatment.

## Issue #78 aggregate memory-envelope audit — 2026-11-09

- Audited per-session application-owned queue state and the installation-wide D1 session lease ceiling in `src/proxy/vless-websocket-handler.js` and `docs/vless-session-admission-design.md`.
- For each admitted session, the inbound message queue enforces at most 1 MiB of accounted message payload and at most 1,024 message/promise-chain entries, including the in-flight message. The unauthenticated VLESS handshake buffer has a separate 64 KiB retained limit. These are per-session application limits, not Cloudflare's pre-dispatch WebSocket receive buffering or exact heap-byte limits.
- The queue's byte accounting counts `ArrayBuffer`, view, and Blob payload lengths. Blob conversion through `arrayBuffer()` may allocate a second copy; initial-handshake `concatBytes()` also temporarily allocates a joined copy before rejecting a buffer above 64 KiB. Object, closure, backing-store, allocator, and runtime overhead are not assigned a defensible byte multiplier.
- For downstream application sends, a finite per-session download budget B permits at most B positive-byte data sends plus one two-byte VLESS response header. With installation-wide admitted-session ceiling C, the application-submitted downstream payload envelope is at most `C * (B + 2)` bytes and the send-call envelope is at most `C * (B + 1)`. This is not a bound on native WebSocket framing/copies, flush, peer receipt, or the managed runtime's internal queue.
- The settings B (`PROXY_MAX_DOWNLOAD_BYTES`) and C (`PROXY_MAX_CONCURRENT_SESSIONS`) are required positive safe integers but the handler does not impose a fixed upper bound on either or on their product. The design doc records that no numeric production C has been selected; the repository contains only disposable smoke examples. Therefore there is no owner-approved absolute aggregate memory budget to enforce, and no new production configuration cap was invented.
- Found an additional boundary in the downstream path: `reader.read()` materializes a TCP chunk before the handler compares its size with the remaining B budget. A single chunk can therefore be larger than B in application-visible memory even though it is rejected before quota reservation or WebSocket forwarding. Added a deterministic test using a 1 MiB read with B=4 bytes; it proves no downstream send beyond the two-byte header and no quota reservation, but does not claim to bound the already-materialized read buffer.
- Focused handler tests passed: 72/72. Full `cmd.exe /c npm run verify` passed: 277 passed, 1 skipped, 0 failed (278 total). `git diff --check` passed.
- Decision: no production memory cap or stream rechunking change is safe to select without an approved C/B resource envelope and evidence about TCP read chunk sizing and runtime buffering. Preserve serial `reader.read()` → reserve → forwarding marker → send → settlement ordering; do not introduce read-ahead/coalescing. Issue #78 remains open.
- No Cloudflare runtime, Worker, D1, staging, or production resource was touched. Any runtime validation still requires fresh explicit user authorization. Error 1101/domain/VPN remains final-priority.

## Current workspace — aggregate memory audit

- Base at start: `origin/main` at `fd7ff7a4338f7ddfff0101cef0cc23d395a624fc` (PR #306 merge).
- Audit branch: `feat/issue78-aggregate-queue-memory-audit-2026-11-09`; merged via PR #307.
- Follow-up branch: `docs/issue78-pr307-merge-handoff-2026-11-09`, created from post-merge `origin/main` at `01b20791eeda308e7f34bac36e3462b1ad26ea1c`.
- Scope: one deterministic handler regression test and handoff documentation; no production code changes.
- `HANDOFF.md` remains unchanged because its 302,410-byte size exceeds the supported 256 KiB file-tool limit. This dated addendum is the supplemental handoff.

## PR #307 merge handoff — 2026-11-09

- PR #307 (`test: document VLESS aggregate memory envelope`) was squash-merged at `01b20791eeda308e7f34bac36e3462b1ad26ea1c`. Exact PR HEAD `b8c66aaa47dc4a25bafd2ece19ac0073acb8e99e`; exact-head PR CI run `42625572922`, job `129188322498`, completed successfully with `npm run verify` (277 passed, 1 skipped, 0 failed). A separate push-triggered run `42625594393` was still in progress when the PR CI run had already succeeded.
- Fresh pre-merge review checks showed no submitted reviews or inline review threads; GitHub reported mergeable true. Merge used the expected head SHA.
- PR #307 added a deterministic oversized-TCP-read regression and the aggregate memory-envelope audit in this addendum. Issue #78 received comment `6741225403` with the findings and remaining evidence boundary.
- The workspace fetched `origin/main` at `01b20791eeda308e7f34bac36e3462b1ad26ea1c` and created clean documentation follow-up branch `docs/issue78-pr307-merge-handoff-2026-11-09`.
- No Cloudflare runtime, Worker, D1, staging, or production resource was touched. Issue #78 remains open; Worker-internal WebSocket buffering and the pre-budget TCP read-chunk allocation remain unresolved. Any future Cloudflare runtime execution requires fresh explicit user authorization. Error 1101/domain/VPN remains final-priority.
