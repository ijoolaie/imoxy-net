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
