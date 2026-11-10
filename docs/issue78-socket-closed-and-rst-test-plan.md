# Issue #78 — TCP socket.closed lifecycle and reset-test plan

Date: 2026-11-10

## Scope and evidence boundary

This review is offline. It does not run or deploy a Cloudflare Worker, create a TCP endpoint, or touch staging/production resources.

Official Cloudflare TCP Sockets documentation defines:
- `Socket.closed: Promise<void>`: resolves when the socket closes and rejects if the socket encounters an error.
- `Socket.close()`: forcibly closes both readable and writable stream sides.
- `allowHalfOpen=false` (default): writable auto-closes when readable reaches EOF.
- `allowHalfOpen=true`: writable remains open after readable EOF.

The production adapter currently observes `reader.read()` and `writer.write()` failures, but did not attach a rejection handler to `socket.closed`. It also deliberately sets `state.closed` before calling `socket.close()` during cleanup.

## Implementation in this branch

- Attach a rejection observer to `socket.closed` as soon as the candidate socket is stored as `state.pendingSocket`, before awaiting `socket.opened`. This also observes a socket that errors during connection establishment.
- A rejection while the session is still active requests the existing idempotent `trackCloseSession(1011, "upstream_error")` cleanup path.
- A normal `socket.closed` resolution is not treated as an error or as the source of EOF. The readable pump remains authoritative for clean EOF and uses its existing `upstream_closed` path.
- A rejection after local session closure is ignored by the existing `state.closed` guard. This matters because cleanup itself calls `socket.close()`.
- The rejection reason is intentionally not serialized or inspected. Cloudflare/workerd has a reported clean-FIN/cleanup race where `socket.closed` can reject with `undefined`; a rejection is a lifecycle signal, not proof of a TCP RST.

Deterministic handler tests now cover:
1. `socket.closed` rejects while the readable is pending → WebSocket closes with generic `upstream_error`, socket closes, and the session lease releases exactly once.
2. `socket.closed` resolves with readable EOF → handler classifies the event as `upstream_closed`, not `upstream_error`, and releases the lease once.

These are local fake-socket tests; they do not prove Cloudflare runtime behavior.

## Workerd issue and false-positive guard

- Cloudflare/workerd issue #6479 remains open as of 2026-11-10: https://github.com/cloudflare/workerd/issues/6479
- Its reported reproduction: peer sends clean FIN; readable drains to EOF; application calls `socket.close()`; `socket.closed` may reject with `undefined` due to a race between automatic writable close and explicit close.
- Related workerd PR #6483 is open and adds a runtime regression test; it is not evidence that the fix is merged or deployed in managed Workers: https://github.com/cloudflare/workerd/pull/6483
- Therefore never classify `socket.closed` rejection alone as proof of TCP reset. The production observer uses a generic close reason and the already-closed guard prevents a late cleanup rejection from starting a second cleanup.

## Independent true-TCP-reset test design

The current Worker-to-Worker Service Binding echo peer cannot reliably inject a TCP RST: `writer.abort()` is a Streams writable operation, and `socket.close()` is the documented socket close API. Neither is a documented RST primitive. The previous peer-abort test was therefore not a valid network-error test.

A real reset test requires a separately controlled TCP endpoint outside the Worker runtime, on a disposable public test host/IP and dedicated port. The endpoint is a narrowly scoped fault injector, not a general TCP proxy.

### Endpoint protocol and safety contract

Use a small, single-purpose server on a disposable Linux VM. Keep its listener disabled until the operator explicitly starts the one-run test. The server must:

- Bind to loopback by default. Public binding requires a separate explicit command-line opt-in and a dedicated firewall rule for the test port; never default to `0.0.0.0`.
- Require a high-entropy one-run HMAC key in addition to a fresh random nonce. Load the key from a protected file or Worker secret, never from committed config or a logged command line. The Worker sends only a lowercase-hex HMAC-SHA256 signature over `MODE <mode> <nonce>`; the key itself never crosses the TCP connection. The server compares signatures in constant time and never logs the key or signature.
- Accept only two fixed commands, `MODE FIN <nonce> <signature>` and `MODE RST <nonce> <signature>`, with strict length/character limits. The signature is `hex(HMAC-SHA256(one_run_key, ASCII("MODE <mode> <nonce>")))`. Reject unknown commands, malformed/non-fresh nonces, invalid signatures, extra fields, and all attempts to specify arbitrary destinations or payload sizes.
- Permit at most one active connection per mode and a small fixed total connection count. Enforce short connect, handshake, ACK and idle deadlines; cap every line and total bytes. Exit after the planned FIN and RST pair or a hard overall deadline.
- Send a nonce-correlated `READY <nonce>` line followed by a fixed binary prelude. Never relay arbitrary client bytes to another host. Record only mode, nonce, peer address, connection sequence, state transitions and monotonic timestamps; redact the HMAC key and avoid logging arbitrary stream errors.
- For RST, use a Linux TCP socket with `SO_LINGER={on:1, linger:0}` on the accepted socket immediately before close. Treat failure to set the option as a hard test failure; do not silently fall back to an orderly close.
- For FIN, perform an orderly write-half shutdown and normal close. Record the orderly-close action separately from RST mode.
- Have an operator-controlled hard stop and a cleanup step that stops the listener, removes the temporary token/config, closes the firewall rule and verifies the process and port are absent.

Use this exact one-connection wire sequence for each mode:

1. Worker sends exactly one command: `MODE FIN <nonce> <signature>` or `MODE RST <nonce> <signature>`. Each command is terminated by one LF byte (`0x0A`); the one-run HMAC key is never sent.
2. Server validates the HMAC signature and nonce, logs `accepted`, and sends `READY <nonce>` followed by one LF byte and a fixed binary prelude.
3. Worker validates the READY nonce and prelude, then sends `ACK <nonce>` followed by one LF byte.
4. Server logs `acknowledged`. In FIN mode it performs orderly `shutdown(SHUT_WR)` and closes normally. In RST mode it applies zero-linger and closes abortively.
5. Worker attaches `socket.closed` observers immediately after `connect()`, awaits `socket.opened`, and independently records the read and ACK-write outcomes. It does not call local `socket.close()` until those observations finish or the bounded observation deadline expires.

The Worker must use a dedicated probe implementation importing `connect` from `cloudflare:sockets`, not the existing Service Binding echo worker. It must accept only a configured literal IP and port from a disposable environment, validate the response nonce, send only the fixed protocol messages, and reject any request parameter that could alter the destination. No user-supplied hostname, URL, port, payload, or arbitrary TCP target is allowed. Keep the HMAC key in a Worker secret, not a `vars` value or source file.

A successful server-side `SO_LINGER` call and log are necessary but not sufficient evidence that the remote Worker observed a reset. Capture a packet trace on the disposable Linux endpoint (or equivalent kernel-level evidence) and correlate the outgoing RST with the accepted connection tuple and monotonic event window. If packet-level confirmation is unavailable, label the result as an abortive-close attempt, not a confirmed TCP RST.

### Local Worker probe implementation

The first isolated caller implementation is `test/issue78-tcp-fault-probe-worker.js`. It is a test-only Worker module and is not imported by `worker.js` or the production VLESS handler.

- The disposable entrypoint `scripts/issue78-tcp-fault-probe-cloudflare-worker.js` statically imports `connect` from `cloudflare:sockets` and injects it into the probe factory; deterministic Node tests inject a fake connector. The entrypoint is not wired into a Wrangler config or deployment workflow.
- Required environment: `PROBE_PATH` (unique random path), `FAULT_MODE` (`FIN` or `RST`), `FAULT_IP` (canonical public IPv4 literal), `FAULT_PORT` (canonical port 1024–65535), and `FAULT_TOKEN` (32–128 base64url characters stored as a Worker secret). Optional `ALLOW_HALF_OPEN=true` selects the half-open control.
- The caller has no destination query parameters, accepts only GET on the exact configured path, rejects DNS names/private/special-use IPv4 targets and malformed settings before dialing, and sends only the fixed HMAC-authenticated MODE/ACK protocol.
- It attaches a rejection observer to `socket.closed` immediately after `connect()`, before awaiting `socket.opened`; records command/ACK writes, readable outcome, closed outcome, timestamps and local cleanup separately; and marks observations that happen only after local cleanup.
- Read-ahead is not used. The line reader has a fixed 128-byte line limit and a bounded response buffer. The response never includes the auth token or arbitrary error text. The standalone probe has no D1 binding or VLESS admission lease.
- Deterministic fake-peer tests validate FIN/EOF and RST-shaped stream-error observations, nonce mismatch, fixed-target enforcement, path/method rejection and secret redaction. These tests validate caller logic only; they do not synthesize or prove a real network RST.

### Linux fault-injector implementation

The server-side counterpart is `scripts/issue78-tcp-fault-injector.py`. It is a one-run Linux-only utility; it is not a general proxy and has no forwarding path.

- Default bind is `127.0.0.1`. Public binding to `0.0.0.0` requires both `--public-bind` and `--ack-public-exposure`; the script never opens or manages a firewall rule.
- Requires a protected regular token file owned by the server user, mode `0600` or stricter, opened without following symlinks. `--delete-token-file` is mandatory and the one-run file is deleted in the server's final cleanup.
- The token is not sent on the TCP connection. The Worker sends a 64-character lowercase-hex HMAC-SHA256 signature over `MODE <mode> <nonce>`; the server verifies it with constant-time comparison. Nonces are single-use.
- Only FIN and RST modes are accepted, one successful connection per mode. Total accepts are capped at four; each socket I/O has a five-second timeout and the entire server run has a 60-second deadline. Lines are capped at 256 bytes; payload is fixed.
- FIN uses `shutdown(SHUT_WR)` and waits for the Worker to close. RST requires Linux and sets `SO_LINGER=(1,0)` immediately before the accepted socket is closed. Failure to arm zero-linger is a failed connection, never a fallback to FIN.
- JSON logs contain only event, mode, nonce, peer tuple and monotonic timestamp (or a bounded error type). The HMAC key and signature are not logged.
- The script closes each accepted socket and listener and deletes the one-run token file. The operator still owns firewall closure, packet capture, process/port absence verification, and destruction of the disposable VM.
- Manual local validation: `python test/test_issue78_tcp_fault_injector.py -v` ran 12 tests on Windows: 10 passed and two Linux-only tests were skipped (token-file POSIX permissions/symlink checks and a real loopback TCP RST check). The Linux CI runner will execute all 12, including the loopback test that requires the peer to observe `ConnectionResetError` after zero-linger close. This validates the Linux kernel's local abortive-close behavior, not the remote Cloudflare path or packet-level trace. The public listener script has not been started.

### Runtime execution checklist

1. Run a minimal TCP fault-injection server on a disposable VM/container with an externally reachable address. Do not reuse a production service or account.
2. Provide two modes on the same test listener:
   - FIN control: send a fixed nonce-correlated payload, then orderly shutdown/close.
   - RST case: accept a connection, send a fixed prelude, wait for a nonce-correlated client acknowledgement, then set `SO_LINGER={on:1, linger:0}` and close the accepted TCP descriptor to force a kernel TCP reset. Do not substitute Node `writer.abort()` or an ordinary close for this step.
3. Use a dedicated disposable Worker caller and a strict hostname/IP+port allowlist for that endpoint. No public Worker route is needed beyond the existing locally invoked preview path. Do not attach D1 or staging/production bindings unless a separately approved VLESS integration phase specifically needs them.
4. In the caller, attach handlers to `socket.closed` immediately. Record independent outcomes and monotonic timestamps for:
   - `socket.closed` resolve/reject (including rejection value type, but never log arbitrary error text);
   - pending `reader.read()` resolve/reject and byte count;
   - pending `writer.write()` resolve/reject;
   - explicit cleanup `socket.close()` start/complete.
5. For RST, do not call `socket.close()` until the `socket.closed` and read/write observations have settled or a bounded observation timeout expires. Otherwise cleanup can create the very `closed` rejection being measured. Always close in a finally/timeout cleanup path.
6. For FIN, separately test default `allowHalfOpen=false` and (if needed) `true`. Include both: (a) allow automatic EOF close to settle without explicit close; (b) explicit `socket.close()` after readable EOF to expose the #6479 race. Report any `undefined` rejection as a close-race observation, not as RST.
7. Acceptance for the RST case: packet-level outgoing RST evidence is correlated to the server-side connection tuple and time window; caller `socket.closed` rejects before explicit local cleanup; stream read/write outcomes are captured independently; no bytes are forwarded after the error signal; cleanup closes the socket exactly once. The standalone socket probe has no D1 binding or VLESS admission lease; verify lease release only in a later, separately approved VLESS integration test. Do not require a particular error message or exact error class.
8. Acceptance for FIN control: peer-side orderly shutdown is confirmed; readable reaches EOF; `socket.closed` outcome is captured; no `upstream_error` is inferred solely from a possible #6479 undefined rejection; local socket cleanup remains idempotent. Any VLESS lease assertion belongs only in a separately approved integration phase.
9. Destroy the disposable endpoint and verify its absence after the run. Save sanitized logs, exact Worker SHA, compatibility date/flags, Wrangler version, CF-Ray, and cleanup proof.

## Authorization and release boundary

Any Cloudflare Runtime probe described above requires a fresh, explicit, one-run user authorization. The prior one-shot authorization was consumed by Run #42772724549. Do not dispatch a workflow through API/CLI/shell; the user must dispatch the approved manual workflow through GitHub UI.

Issue #78 remains open. This work does not prove bounded downstream buffering, total Worker memory, or true TCP reset behavior. Keep the production BYOB adapter decision unchanged; default reader remains in use. Error 1101/domain/VPN remains final-priority.
