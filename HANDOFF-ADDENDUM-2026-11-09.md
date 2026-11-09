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

## Issue #78 TCP readable chunk-boundary audit — 2026-11-09

- Workspace: `C:\\Users\\Ali\\imoxy-net-review-worktree`; fetched `origin/main` at `3ad1fe9f01a5bf2db2795a6a210d38600530c2bb` (PR #308 merge) and created branch `audit/issue78-tcp-readable-chunk-boundary-2026-11-09`. Working tree was clean at branch creation.
- Source review of `src/proxy/vless-websocket-handler.js` confirms `pumpUpstream()` awaits exactly one `state.reader.read()`, then checks `value.byteLength` against the remaining download budget, and awaits `reserveAndSettle(value, "download")` before the next read. This preserves the serial read → reserve → forwarding marker → send → settlement invariant.
- The checked-in adapter calls Cloudflare `connect({ hostname, port })` without optional socket configuration. No local dependency tree or checked-in Cloudflare socket type definitions were available in this workspace; no source-level maximum TCP read chunk size or supported read-size option was found in repository code/docs.
- Current official Cloudflare TCP Sockets documentation describes `Socket.readable` as a `ReadableStream` and documents `SocketOptions.secureTransport` and `allowHalfOpen`; it does not document a TCP read chunk-size, `highWaterMark`, or backpressure/read-buffer sizing option. The documented API therefore supplies no supported way to cap the bytes materialized by a single TCP `reader.read()` result. Source: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/ (reviewed 2026-11-09).
- Cloudflare's generic ReadableStream documentation describes `getReader({ mode: "byob" })`, but the TCP Socket page only types `socket.readable` as `ReadableStream` and does not state that this particular socket stream is a byte stream that accepts BYOB. BYOB cannot be assumed safe or supported for this socket without a runtime/type contract or isolated compatibility test. Source: https://developers.cloudflare.com/workers/runtime-apis/streams/readablestream/ (reviewed 2026-11-09).
- A downstream TransformStream with a chosen strategy/highWaterMark would only add a userland queue after the socket stream; it would not establish an upper bound on the socket source's already-materialized chunk or native buffering. Splitting a returned chunk into views likewise retains the original backing buffer while the remaining slices are processed. Copying slices does not establish a hard peak-memory cap because the original chunk remains live until all bytes are consumed.
- Decision: no production code change is justified by current documented API evidence. Do not add a speculative BYOB reader, arbitrary `highWaterMark`, TCP chunk cap, rechunking, or read-ahead. Preserve the existing one-read/one-settlement sequencing and Issue #78's open status. A future BYOB experiment requires a disposable local/runtime compatibility test and must first verify that the actual Cloudflare TCP readable accepts BYOB; any Cloudflare runtime execution requires fresh explicit user authorization. A hard bound on the source read allocation requires a documented/runtime-supported source-side contract or platform confirmation.
- No tests were run because no code changed. No Cloudflare runtime, Worker, D1, staging, production resource, or GitHub issue state was touched. `HANDOFF.md` remains unchanged because its 302,410-byte size exceeds the supported 256 KiB file-tool limit; this addendum is the supplemental handoff.
- Error 1101/domain/VPN remains final-priority.
## PR #309 merge handoff — 2026-11-09

- PR #309 (`docs: record TCP readable chunk boundary audit`) was squash-merged at `b2017cb6464bf1e8d3361303f0ef57b84abbdef4`. Exact PR HEAD `ed27a27befef6552183a25c83e37cd27a7b39509`; exact-head CI run `42627462071`, job `129194826322`, completed successfully (`npm run verify`).
- Fresh pre-merge checks showed no submitted reviews or inline review threads; GitHub reported mergeable true. Merge used the expected head SHA.
- PR #309 changed only `HANDOFF-ADDENDUM-2026-11-09.md` and documented the TCP readable chunk-boundary audit. No application code or runtime configuration changed.
- After merge, workspace fetched `origin/main` at `b2017cb6464bf1e8d3361303f0ef57b84abbdef4`; clean documentation follow-up branch `docs/issue78-pr309-merge-handoff-2026-11-09` was created from that exact base.
- Issue #78 remains open. No Cloudflare runtime, Worker, D1, staging, or production resource was touched. `HANDOFF.md` remains unchanged because its 302,410-byte size exceeds the supported 256 KiB file-tool limit; this addendum is the supplemental handoff.
- Error 1101/domain/VPN remains final-priority.
## Issue #78 BYOB/TCP type-contract follow-up — 2026-11-09

- Follow-up official Cloudflare documentation review found positive evidence that Workers implements BYOB readers generally: the compatibility-flags page documents `streams_byob_reader_detaches_buffer` (default since 2021-11-10), explains that BYOB `read()` detaches the supplied ArrayBuffer, and gives a 4 KiB BYOB read/reuse example. It also documents `internal_stream_byob_return_view` for final reads. Source: https://developers.cloudflare.com/workers/configuration/compatibility-flags/ (reviewed 2026-11-09).
- The generic Workers ReadableStream page documents `getReader({ mode: "byob" })` as a supported reader option. Source: https://developers.cloudflare.com/workers/runtime-apis/streams/readablestream/ (reviewed 2026-11-09).
- Crucial remaining contract gap: the TCP Sockets page explicitly types `Socket.readable` only as `ReadableStream` (not `ReadableStream<Uint8Array>` and not a `ReadableByteStream`/byte stream), and its SocketOptions list still contains only `secureTransport` and `allowHalfOpen`. No TCP-specific BYOB guarantee or source chunk-size control is documented. Source: https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/ (reviewed 2026-11-09).
- Therefore BYOB is now a credible compatibility-test candidate, not an established TCP optimization. Under the Streams standard, acquiring a BYOB reader requires a byte stream; attempting `getReader({ mode: "byob" })` on a non-byte stream rejects. Documentation that Workers supports BYOB globally does not prove that `cloudflare:sockets` returns a byte stream. Do not modify the production adapter on this basis alone.
- Recommended minimal disposable probe, if separately authorized: create only an isolated disposable Worker and internal disposable TCP echo peer; call `socket.readable.getReader({ mode: "byob" })` with a small fixed `Uint8Array` (e.g. 4 KiB), record whether reader acquisition succeeds, read result byte lengths and buffer identity/byteLength, repeat across multiple reads, then close both ends and verify cleanup. Include a default-reader control. Do not use production/staging bindings or real customer destinations. This is a proposed test plan only; no runtime probe was run or authorized in this turn.
- Even if BYOB acquisition succeeds and returned views are <= requested size, that only proves the API's delivered view bound for the tested runtime; it does not automatically prove a strict bound on native socket buffering or all internal allocations. Preserve serial read → reserve → forwarding marker → send → settlement and test close/cancel/error paths before considering code adoption.
- No application code changed and no tests were run. No Cloudflare account, Worker, D1, staging, production resource, or issue state was accessed/changed. Issue #78 remains open. `HANDOFF.md` remains unchanged due its 302,410-byte size exceeding the supported 256 KiB file-tool limit; this addendum is the supplemental handoff.
- Error 1101/domain/VPN remains final-priority.
