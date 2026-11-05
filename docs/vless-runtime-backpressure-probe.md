# VLESS downstream WebSocket runtime probe

**Status:** Plan only — not run. No Worker, route, D1 database, or Cloudflare resource was created or changed for this document.

## Purpose

Determine the behavior of the actual Cloudflare Workers WebSocket runtime when a server sends to a connected client that deliberately does not read. This is evidence-gathering for issue [#78](https://github.com/ijoolaie/imoxy-net/issues/78), not a claim that WebSocket.send() provides backpressure.

The documented API exposes synchronous send() but does not document bufferedAmount, a drain event, or an awaitable write. A successful probe cannot prove a universal memory bound unless the runtime exposes an authoritative bound or the application architecture enforces one independently.

## Authorization and isolation gate

Do not execute until the owner explicitly authorizes a disposable staging Worker and confirms:
- the Cloudflare account, Worker name, hostname/route, and credentials are staging-only;
- a fixed test duration and maximum bytes/messages have been approved;
- logs/metrics are available and secrets will not be recorded;
- the rollback/cleanup operator and procedure are known.

Do not bind D1 or production routes for this isolated WebSocket API probe. Do not use third-party TCP destinations. Keep the existing VLESS/D1 smoke gate separate.

## Probe implementation contract

Create a temporary, isolated Worker endpoint using the same Workers runtime and compatibility date intended for the VLESS deployment. The endpoint should:
1. accept only a WebSocket upgrade at a dedicated test path;
2. accept a small, fixed test configuration (or use constants), with hard maximums for duration, total bytes, and frame size;
3. send deterministic binary frames of a fixed size at a fixed rate, recording per-call elapsed time, send exceptions, close/error events, number of attempted sends, and total attempted bytes;
4. include a monotonically increasing sequence number in each frame so the client can detect gaps and ordering;
5. never accept an arbitrary target hostname/port, never access D1, and never log credentials or client payloads.

Keep the test sender bounded by its own hard total-byte and wall-clock limits. A browser client should connect, complete a baseline run while reading normally, then a separate run in which it intentionally does not consume incoming messages. Run a control client concurrently only if the approved concurrency limit allows it.

## Procedure

1. Record the Worker version/commit, compatibility date, runtime timestamp, client/runtime versions, approved limits, and the endpoint path (redact account identifiers).
2. Run a small baseline with a reading client. Verify sequence continuity, exact received bytes, send-call timing, and clean closure.
3. Run the non-reading client with the same bounded workload. Do not increase limits to force a failure.
4. Stop immediately if the approved byte/time ceiling is reached, send latency grows sharply, errors/close events occur, or platform resource warnings appear.
5. Repeat only enough times to rule out a transient setup error; do not run an unbounded soak or throughput test.
6. Remove the temporary endpoint and Worker only through the approved staging cleanup procedure.

## Evidence table

Capture observed values, not inferred buffer sizes:

| Measure | Reading client | Non-reading client |
| --- | --- | --- |
| Attempted messages / bytes | | |
| Received messages / bytes | | |
| Send-call latency (min / median / max) | | |
| Send exceptions and close codes | | |
| Sequence gaps / last sequence received | | |
| Worker errors or resource warnings | | |
| Stop reason | | |

The client-side receive backlog is not a direct measurement of the Worker's internal WebSocket send buffer. If the platform does not expose an authoritative queue size or drain signal, mark internal buffer boundedness **unproven**, regardless of whether this limited run appears stable.

## Decision rules

- **Any unhandled send error, resource warning, or uncontrolled send latency:** stop and treat the current design as unsafe pending further investigation.
- **The test reaches its byte/time ceiling without an error:** this is only a bounded observation; it does not prove a general buffer limit.
- **No authoritative send-buffer signal/drain API is available:** do not reintroduce undocumented properties. Select an architecture/application policy that bounds application-managed work and defines a conservative session termination policy, then test that policy. Be explicit that this alone does not bound runtime-internal buffering.
- **Do not mark issue #78 solved** until the slow-client case, cleanup, quota behavior, Node tests/CI, and required staging evidence are reviewed together.

## Safety and cleanup checklist

- [ ] Explicit owner authorization recorded.
- [ ] Disposable staging account/Worker and hard limits confirmed.
- [ ] Baseline and slow-reader results recorded with secrets removed.
- [ ] Runtime-internal buffering status described without extrapolating beyond evidence.
- [ ] Temporary endpoint removed and cleanup verified.
- [ ] Issue #78 and handoff updated with observed evidence and residual risk.


## Authorization checkpoint — 2026-10-30

The owner has explicitly authorized proceeding with a disposable staging runtime probe. The authorization is recorded, but the target and operational limits are not yet established. Before execution, still obtain/verify a staging-only Cloudflare account context, dedicated Worker name and hostname/path, approved byte/time/frame/concurrency ceilings, log/metrics access, and a cleanup operator/procedure. The authorization does not by itself approve creating Cloudflare resources, binding routes, changing DNS, or touching D1. Previously discussed candidate limits (10 seconds, 8 MiB, 16 KiB frames, two clients) are **not approved**. No probe has been executed as of this checkpoint.

## Application policy implementation checkpoint — 2026-10-30

Branch `fix/vless-session-download-budget` implements a fail-closed per-session policy in the VLESS handler:
- `PROXY_MAX_DOWNLOAD_BYTES`: required positive safe integer; cumulative successfully forwarded download bytes may not exceed this value.
- `PROXY_MAX_SESSION_DURATION_MS`: required positive safe integer and no greater than the maximum supported timer delay; starts after authentication and closes the session at expiry.
- A TCP chunk that would exceed the remaining download budget is rejected as a whole before quota reservation and WebSocket send. Session termination cancels/closes upstream resources.
- Missing or invalid settings return HTTP 503 before WebSocket pair allocation.

No values have been selected for or applied to any Cloudflare environment. These are per-session application limits only; they do not measure the Worker's internal send buffer and do not bound aggregate resource use across an unlimited number of concurrent sessions. The real Worker slow-reader probe remains **not run** and must still use a disposable, isolated target with separately approved limits and cleanup.


## Post-merge status correction — 2026-10-30

The per-session download-byte and maximum-lifetime policy described above is now merged into main as b5c44b16132c9f540de16ab9d4ce54ab5fa01fa4 (PR #104). Post-merge main CI run 41037834214 passed on that exact commit. This does not change the parity status: the policy is imoxy-specific, Worker-internal WebSocket buffering remains unproven, aggregate concurrent-session bounds remain open, and no live Worker/D1 or Nova runtime test has been run.


## Application-submitted downstream bound — 2026-10-30

Code-path inspection establishes a finite application-submitted byte bound when both required positive settings are configured: the handler checks each entire TCP chunk against the remaining per-session download budget before calling synchronous `server.send()`; the upstream pump awaits quota settlement before its next `reader.read()`; and send/settlement failure closes the session. Thus the maximum payload submitted to `send()` per session is bounded by `PROXY_MAX_DOWNLOAD_BYTES` plus the two-byte VLESS response header. The mandatory global lease ceiling further bounds the aggregate submitted payload by `PROXY_MAX_CONCURRENT_SESSIONS * (PROXY_MAX_DOWNLOAD_BYTES + 2)`.

This is a code-derived application-level bound, not a measurement of Cloudflare's internal WebSocket queue, memory copies, framing overhead, or total Worker memory. A deterministic test holds quota settlement while the fake downstream peer never reads, and asserts that the relay does not issue a second TCP read/send until settlement resolves; a following over-budget chunk is rejected before send. The disposable Worker runtime probe remains unrun because invocation of the previous temporary Worker was blocked by HTTP 403. No claim is made about internal buffer capacity.


## Bounded generic WebSocket observation — 2026-10-31 (not a VLESS probe pass)

A disposable Worker was created on the existing account workers.dev subdomain solely for an isolated generic WebSocket send experiment. No D1 binding, custom hostname/route, third-party TCP destination, or existing staging Worker was used.

| Measure | Reading client | Client paused for 5 seconds |
| --- | ---: | ---: |
| Binary frames received | 256 | 256 |
| Binary bytes received | 4,194,304 | 4,194,304 |
| Frame size | 16 KiB | 16 KiB |
| Worker-reported send duration | 2,570 ms | 2,570 ms |
| Send exceptions | 0 | 0 |
| Worker-side `bufferedAmount` observation | 0 | 0 |
| Close | Normal closure | Normal closure |

The client that paused reads resumed and received all bytes. The two connections were sequential and together sent 8 MiB. Each run had a 4 MiB / 256-frame cap and a 9-second Worker-side time ceiling.

**Limitations:** the endpoint was not `/proxy/vless`; it did not exercise VLESS parsing/authentication, DNS, outbound TCP, D1, quota reservation/settlement, session leases, or the proxy's actual close/error handling. The frames had no sequence numbers and per-send latency distributions were not captured. The zero `bufferedAmount` observation is not evidence of a bounded internal queue. This result is only a bounded observation of generic WebSocket delivery and does not pass this document's full probe acceptance criteria or the VLESS/D1 smoke gate.

Cleanup was completed: the temporary Worker was deleted and its absence verified in the Worker inventory; the temporary local client script was removed. Existing staging resources were not changed. Issue #78 remains open and runtime-internal buffer boundedness remains **unproven**.

### Required next experiment

Run a separate, fully isolated actual VLESS path test using a disposable Worker, disposable D1, test-only credential, and controlled TCP destination. Capture handshake/authentication, exact bidirectional payloads, DNS pinning, quota reserve/settle/release, session admission/release, close/error behavior, and resource cleanup. Obtain explicit approval for the dedicated D1/Worker/destination and hard limits before provisioning; do not repurpose existing staging resources.


## Actual VLESS handler remote-preview observation — 2026-10-31

This is a separate partial runtime observation, not completion of every probe requirement above. Wrangler 4.156.0 `wrangler dev --remote` successfully ran the actual repository VLESS handler module graph on Cloudflare's remote runtime. Evidence is recorded in Issue #78 comment `6546090435`.

- The actual handler returned 426 for a non-upgrade request and completed three of three WebSocket handshakes at `/proxy/vless`.
- Synthetic VLESS requests exercised the actual parser, credential-hash adapter, account lookup, destination allowlist, resolver adapter, admission adapter and TCP connector adapter.
- Synthetic in-memory TCP plus fake store/quota adapters completed three of three sessions with the expected VLESS response and exact four-byte initial payload.
- A raw TCP WebSocket client paused reads for approximately 6.2 seconds and, after resuming, received all 4,194,304 download bytes in 256 binary frames. This is a bounded delivery observation, not a measured buffer limit.

No D1 binding/database was attached, no real outbound TCP destination was contacted, and no Cloudflare internal send-buffer size/drain signal was measured. This does not prove bounded internal buffering, behavior under longer pauses, or aggregate concurrency. The generic dedicated slow-reader probe described above is not thereby fully accepted; Issue #78 remains open.

A separate disposable D1 attempt was cleaned up after the safety layer blocked remote migration execution before any SQL was applied or queried. The real-D1 VLESS gate remains blocked. Do not bypass the safety layer.

## Current Workers WebSocket API review � 2026-11-06

The official Cloudflare Workers WebSockets API reference (last updated 2026-10-12) documents `send(string | ArrayBuffer | ArrayBufferView)` as a synchronous method and lists `readyState` and `binaryType` as WebSocket properties. It does not document `bufferedAmount`, a drain event, or an awaitable send/write result. This is a statement about the documented API surface, not proof that no undocumented runtime telemetry exists; the implementation must not depend on undocumented properties.

The reference also documents `accept({ allowHalfOpen: true })` for proxying when the application needs to coordinate close behavior. The smoke configuration's compatibility date is `2026-11-02` (the general example is `2026-10-01`), both later than `2026-04-07`, when `web_socket_auto_reply_to_close` became enabled by default. The current handler calls `server.accept()` without `allowHalfOpen`, so the runtime auto-replies to peer Close frames and transitions to CLOSED before dispatching the close event. The handler then starts `closeSession()` from that event and independently closes the TCP socket and releases the D1 lease. Therefore WebSocket close-handshake completion is not evidence that upstream socket cleanup or lease release has completed.

Do not switch to half-open mode as an isolated change: the current close path deliberately waits for a pending TCP connection promise before it can close a late-created socket. If that promise never settles, delaying the WebSocket close handshake until cleanup completes could leave the peer in CLOSING. A safe half-open design requires a cancellable/bounded dial contract plus deterministic tests for peer-close, TCP-close, lease-release ordering. This observation is not a confirmed cause of smoke run #5's `activeSessions=1` result.

The current application-level output policy remains the safer independently enforced bound: one upstream read at a time, await quota settlement before the next read, reject a whole chunk beyond the per-session byte budget, and require a global D1 lease cap. This bounds bytes submitted by the application, not Cloudflare's internal framing, copies, send queue, or total Worker memory. The dedicated disposable runtime probe remains not run; issue #78 stays open. No Cloudflare workflow, deployment, or resource mutation was performed.

Source: https://developers.cloudflare.com/workers/runtime-apis/websockets/ (API reference last updated 2026-10-12).
