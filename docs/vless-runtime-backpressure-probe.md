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
