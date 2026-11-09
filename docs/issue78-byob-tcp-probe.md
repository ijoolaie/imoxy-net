# Issue #78 disposable TCP BYOB compatibility probe

## Purpose

Determine whether the current Cloudflare Workers TCP socket readable stream accepts a BYOB reader, and whether the delivered BYOB views/backing buffers respect a 4 KiB caller-provided view in the tested runtime.

This is a compatibility probe only. It is not a production implementation and does not claim to bound native socket queues, kernel buffers, or every runtime allocation.

## Isolation

- Deploy a uniquely named disposable echo Worker with only a `connect(socket)` handler. It has no workers.dev hostname, routes, D1, KV, R2, secrets, or other bindings.
- Deploy a uniquely named disposable probe Worker with one service binding to that echo Worker and a random path binding. Enable workers.dev only for this short-lived probe Worker so one request can invoke the test.
- The probe Worker opens two service-binding TCP connections to the echo Worker: one default-reader control and one BYOB test. No public TCP destination is contacted.
- The echo sends 32 KiB of deterministic bytes in 8 KiB writes. The probe verifies byte integrity and total bytes for both reader modes. BYOB requests a 4 KiB view and records delivered view length, backing-buffer length, and read count.
- Delete the probe Worker and echo Worker in a finally/cleanup path and verify both names are absent. Disable the probe Worker subdomain before deleting it.

## Interpretation

- Default-reader control must receive exactly 32,768 bytes with valid deterministic content.
- If BYOB reader acquisition rejects, record the error and treat BYOB as unsupported for this tested TCP socket/runtime. The control must still pass.
- If BYOB acquisition succeeds, it must receive exactly 32,768 bytes with valid content. Record maximum delivered view and backing-buffer sizes; a maximum at or below 4,096 bytes is positive evidence that the caller-provided view bounds the delivered data representation in this test.
- A BYOB success does not prove that the runtime did not buffer more bytes internally before filling the view, nor that native queues, socket copies, or other allocations are bounded. It does not close Issue #78.
- Do not use the BYOB reader in the VLESS production handler unless the disposable runtime result is positive, the handler's close/cancel/error semantics are covered, and serial read → reserve → forwarding marker → send → settlement remains unchanged.

## Safety

- Runtime execution requires fresh explicit user authorization.
- Use only uniquely named disposable Workers and an internal Worker-to-Worker TCP Service Binding. Never attach existing staging or production bindings or routes.
- Do not create a D1 database for this probe.
- Do not expose the echo Worker on workers.dev.
- Remove both Workers and verify their absence even if the probe fails.
