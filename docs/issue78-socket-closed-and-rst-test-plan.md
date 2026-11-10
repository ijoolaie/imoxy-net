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

A real reset test requires a separately controlled TCP endpoint outside the Worker runtime, on a disposable public test host/IP and dedicated port:

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
7. Acceptance for the RST case: the independently generated RST is confirmed by the server-side nonce/connection log; caller `socket.closed` rejects before explicit local cleanup; stream read/write outcomes are captured independently; no bytes are forwarded after the error signal; cleanup closes the socket and releases any VLESS admission lease exactly once. Do not require a particular error message or exact error class.
8. Acceptance for FIN control: peer-side orderly shutdown is confirmed; readable reaches EOF; `socket.closed` outcome is captured; no `upstream_error` is inferred solely from a possible #6479 undefined rejection; lease cleanup remains idempotent.
9. Destroy the disposable endpoint and verify its absence after the run. Save sanitized logs, exact Worker SHA, compatibility date/flags, Wrangler version, CF-Ray, and cleanup proof.

## Authorization and release boundary

Any Cloudflare Runtime probe described above requires a fresh, explicit, one-run user authorization. The prior one-shot authorization was consumed by Run #42772724549. Do not dispatch a workflow through API/CLI/shell; the user must dispatch the approved manual workflow through GitHub UI.

Issue #78 remains open. This work does not prove bounded downstream buffering, total Worker memory, or true TCP reset behavior. Keep the production BYOB adapter decision unchanged; default reader remains in use. Error 1101/domain/VPN remains final-priority.
