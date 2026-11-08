# Issue #78 — disposable WebSocket ExecutionContext lifetime probe

Status: **design only; not yet implemented or executed**  
Scope: one disposable Worker preview, no production/staging resources, no D1 dependency, no TCP connector, no proxy session, and no quota/resource-cap changes.

## Question

Can a Worker Fetch `ExecutionContext` still accept and complete a `waitUntil()` task when the accepted WebSocket is closed more than 30 seconds after the HTTP 101 upgrade response?

The current VLESS handler receives the original Fetch context and calls `executionContext.waitUntil(cleanup)` from its WebSocket close/error callback. Cloudflare's documented HTTP-triggered `waitUntil()` post-response window is up to 30 seconds. The documentation does not, by itself, settle how this behaves for a WebSocket upgrade that remains connected beyond that interval. The probe must measure the runtime behavior rather than infer it.

## Why this must be a separate test endpoint

The disposable VLESS smoke config deliberately sets `PROXY_MAX_SESSION_DURATION_MS=30000`. Increasing that cap to hold a VLESS session open beyond 30 seconds would violate the project's resource-cap guardrail and confound the question with proxy lifecycle/accounting.

Instead, add a narrowly scoped test-only route to `test/vless-service-binding-tcp-smoke-worker.js`. It creates a plain `WebSocketPair`, accepts the server socket, and does no D1, DNS, TCP, quota, or VLESS work. It receives the same third Fetch argument (`executionContext`) as the production handler. The route is reachable only at a per-run random path supplied through the disposable Worker vars; do not expose a fixed public probe path.

## Probe protocol

1. Generate a fresh random run nonce and a separate unguessable route token in the disposable smoke orchestrator. Pass only the route token as a disposable Worker var; never print it in logs.
2. Start the existing remote preview and verify its local health endpoint.
3. Run two sequential WebSocket cases against the tokenized test route:
   - **Control:** keep the WebSocket open for 5 seconds after the client receives `open`, then close it.
   - **Late-close case:** keep the WebSocket open for 36 seconds after `open`, then close it. This deliberately exceeds the documented 30-second interval with a 6-second margin.
4. In the Worker close callback, emit payload-free, nonce-correlated console events in this order:
   - `close_event`
   - `wait_until_registered` only after the synchronous `executionContext.waitUntil(task)` call returns without throwing
   - `wait_until_registration_error` with error name only if the call throws
   - `task_completed` from inside the tracked task after a short 500 ms timer
5. If the context or its `waitUntil` method is absent, emit `execution_context_unavailable`; do not silently classify that as a timeout.
6. The Node probe client must confirm that each socket opened, remained connected for the intended interval (measure elapsed time with a monotonic clock), initiated close, and observed the peer close. It must have a bounded timeout and close any still-open socket in its failure path.
7. After both cases finish, the orchestrator inspects the captured Wrangler preview log tail for the exact nonce and event sequence. Fail closed if the expected late-case events are absent, ambiguous, duplicated unexpectedly, or interleaved with another run's nonce. Do not rely on the isolate-local HTTP diagnostics endpoint.

## Interpretation matrix

| Control (5 s) | Late close (36 s) | Interpretation |
|---|---|---|
| task completes | task completes | The runtime accepted and completed this late `waitUntil` task in this probe. This is evidence about the Fetch context lifetime, not proof of D1 lease cleanup or bounded WebSocket buffering. |
| task completes | registration throws | Late registration is rejected; record the exception name and stop. Do not add retries or silently fall back to detached cleanup. |
| task completes | registration returns but task completion is absent | Registration appeared synchronous, but the task did not produce its completion marker. Treat as inconclusive/runtime-lifetime failure until logs establish why. |
| control fails | any late result | Probe infrastructure or basic tracking is not trustworthy; classify the whole run as inconclusive. |
| either case lacks close event / client close confirmation | any | Transport/probe failure; no conclusion about `waitUntil`. |

A successful late case does **not** prove that the VLESS handler's D1 release completes, that Cloudflare D1 is healthy, or that downstream WebSocket buffering is bounded. It only resolves the narrow question of whether this runtime accepted and ran a task registered from a close callback after the 30-second mark.

## Runtime execution guardrails

- This is a **future** disposable-workflow addition. Do not run it, dispatch the workflow, deploy a Worker, or create resources without fresh explicit user authorization for that Cloudflare execution.
- Keep the workflow restricted to `main` plus `confirm_disposable_run=true`; retain the existing disposable resource naming and cleanup verification.
- Do not change the 30-second VLESS session duration, session lease grace, concurrency limit, download cap, or any production/staging binding.
- Capture only event names, nonce, elapsed durations, and error names. Never log credentials, route tokens, WebSocket payloads, D1 identifiers, or account/session identifiers.
- Run the probe before the existing baseline VLESS smoke so its bounded event sequence is not crowded out of the preview log tail. Preserve the existing baseline lease-drain gate; do not advance to slow-reader testing if that gate fails.
- If the late case succeeds, the next independent check is the existing VLESS lease-drain runtime test, with the known limitation that it does not itself create a >30-second VLESS close. If the late case fails, do not assume Durable Objects are a drop-in replacement: the current proxy owns an outbound TCP socket, which conflicts with DO hibernation/eviction assumptions. Preserve the D1 lease-expiry fallback and investigate a lifecycle owner specifically for cleanup rather than moving the whole TCP proxy speculatively.

## Local acceptance before any Cloudflare run

- Unit tests cover tokenized route isolation, missing ExecutionContext, synchronous `waitUntil` throw, registration success, delayed task completion, nonce correlation, and payload-free logs.
- Node client tests cover the 5-second control and 36-second late-close timing with injected WebSocket/timer dependencies so the test suite does not sleep for 41 seconds.
- Orchestrator tests verify that both cases are required, that the exact run nonce is used, and that missing/ambiguous preview markers fail closed.
- `cmd.exe /c npm run verify` and `git diff --check` pass.
- Review the final diff to ensure only test harness/scripts/docs changed; no production proxy behavior, Worker bindings, staging, or production resources changed.

## Current conclusion

No runtime result exists yet. The 30-second post-response concern remains an unresolved design/runtime risk, not a proven explanation for Runs #14–#16. Issue #78 remains open; bounded Worker-internal downstream buffering is still unproven.
