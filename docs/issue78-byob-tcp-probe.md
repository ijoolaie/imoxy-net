# Issue #78 disposable TCP BYOB compatibility probe

## Purpose

Determine whether the current Cloudflare Workers TCP socket readable stream accepts a BYOB reader, and whether the delivered BYOB views/backing buffers respect a 4 KiB caller-provided view in the tested runtime.

This is a compatibility probe only. It is not a production implementation and does not claim to bound native socket queues, kernel buffers, or every runtime allocation.

## Isolation

- Deploy a uniquely named disposable echo Worker with only a `connect(socket)` handler through the repository's pinned Wrangler version. It has no workers.dev hostname, routes, D1, KV, R2, secrets, or other bindings.
- Start the probe Worker through Wrangler remote preview, bound to localhost only, with one service binding to the echo Worker and a random probe path. Do not enable workers.dev or public routes for either Worker.
- First request a static `/health` response that does not touch the service binding. Then request the random probe path. This separates Worker startup/routing from Service Binding TCP and BYOB behavior.
- The probe Worker opens two service-binding TCP connections to the echo Worker: one default-reader control and one BYOB test. No public TCP destination is contacted.
- The echo sends 32 KiB of deterministic bytes in 8 KiB writes. The probe verifies byte integrity and total bytes for both reader modes. BYOB requests a 4 KiB view and records delivered view length, backing-buffer length, and read count.
- Capture the local remote-preview process output and HTTP status, content type, and Cloudflare Ray ID. Delete the remote-preview Worker and echo Worker in a finally/cleanup path and verify both names are absent.

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

## Runtime attempt — 2026-11-09 (inconclusive; cleaned up)

- User explicitly authorized this disposable BYOB probe. The Cloudflare connector identity and exact account name were checked before provisioning; the account Workers subdomain already existed. No new account-level subdomain was created.
- Provisioned two run-unique Workers: an internal-only TCP echo Worker with a `connect(socket)` handler and a probe Worker with one Service Binding to the echo Worker. Only the probe Worker was temporarily enabled on the existing workers.dev subdomain, and only a random unguessable path was used. No D1 or other Cloudflare resource was created.
- The probe route returned HTTP 500 with an empty response body. A request to the probe Worker root also returned HTTP 500, so the evidence does not establish whether the probe fetch handler ran. Neither default-reader nor BYOB results were returned; BYOB support is therefore **undetermined**, not unsupported.
- Two temporary Workers Tail sessions were created, but the local WebSocket client could not establish a connection to the returned tail URLs; no useful runtime log was captured. The Tail sessions were deleted.
- Cleanup disabled the probe Worker subdomain, deleted the probe Worker and echo Worker, deleted both Tail sessions, and verified both Worker names absent from the account's script inventory. No existing staging or production Worker/binding/route, D1, or other project resource was modified.
- Do not retry or change the probe runtime deployment without fresh explicit user authorization. Next work should first resolve why the disposable API-uploaded Worker returns 500 before attempting the BYOB read again.

## Offline deployment-path diagnosis — 2026-11-09

- Cloudflare's current Connect Handler documentation explicitly supports a Worker receiving TCP from another Worker over a Service Binding; the caller uses `env.BACKEND.connect(address)` and the receiver exports `connect(socket)`. Cloudflare's August 18, 2026 changelog states that the Connect Handler no longer requires an experimental compatibility flag. Therefore the Worker-to-Worker TCP architecture used by this probe is supported in principle. Sources: https://developers.cloudflare.com/workers/runtime-apis/handlers/connect/ and https://developers.cloudflare.com/changelog/post/2026-08-18-connect-handler/.
- The previous API-uploaded probe's root request should have returned the worker's static 404 branch: `createByobTcpProbeWorker().fetch()` checks the path and returns before accessing `env.BACKEND` or opening a TCP connection. A 500 at both the root and probe path therefore does not isolate a BYOB failure; it points earlier in the deployment/startup/routing path, or to an edge/runtime failure. Because the response body and Ray ID were not captured and Tail did not connect, the exact cause remains unknown.
- The previous deployment used the Workers Script Upload multipart API with `main_module`, `compatibility_date`, and bindings. Those fields and the `service` binding shape match Cloudflare's documented metadata format. The legacy upload API remains documented, although Cloudflare now recommends its newer upload/version/deployment workflow. Source: https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/ and https://developers.cloudflare.com/workers/platform/infrastructure-as-code/.
- A fresh local workspace check found no Wrangler dependency in `package.json`, no `node_modules/.bin/wrangler.cmd`, and no global Wrangler executable. The repository's existing disposable VLESS workflow already uses pinned `wrangler@4.156.0`, deploys the internal TCP Echo Worker, starts `wrangler dev --remote` for the bound Worker, exposes only a localhost preview endpoint, captures stdout/stderr, and verifies cleanup. This is a better-known deployment harness than direct API upload for the next attempt.
- The probe worker now exposes a static `/health` endpoint that never accesses the service binding. A new dedicated script and manually dispatched workflow reuse the existing pinned Wrangler remote-preview pattern, avoid workers.dev/public routes, create no D1, capture HTTP response metadata and Wrangler output, and delete/verify the disposable preview and Echo Workers. The script is syntax-checked and the health endpoint has a deterministic unit test.
- This change only prepares the next isolated run. No Cloudflare runtime, Worker, D1, staging, or production resource was created, queried, or modified during this offline follow-up. The workflow is not dispatched. A fresh explicit user authorization is required before any Cloudflare runtime probe; GitHub workflow dispatch must be performed from the GitHub UI because the connected GitHub actions do not expose a workflow-dispatch operation.
