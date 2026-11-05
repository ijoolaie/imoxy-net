# Cloudflare disposable smoke run 4 — deployment authorization diagnosis

Date: 2026-11-03\
Workflow run: [41583822792](https://github.com/ijoolaie/imoxy-net/actions/runs/41583822792)\
Commit: `9e48326280753dbcde96faa6d7e10f5b53074edf`

## Observed result

- D1 database creation and migrations `0001_initial.sql` through `0008_quota_reservation_recovery.sql` completed through the Cloudflare D1 API.
- The first Worker deployment attempted was the run-scoped TCP Echo Worker, `imoxy-vless-smoke-echo-41583822792-1`.
- Wrangler 4.156.0 printed `Uploaded ...`, then failed on Cloudflare API path `/accounts/<account>/workers/workers/<worker-name>` with error code `10007`: “This Worker does not exist on your account.”
- The failure occurred at `scripts/vless-service-binding-cloudflare-smoke.mjs:309`, before remote preview startup and before the external VLESS client. No VLESS handshake, relay, byte-echo, D1 settlement, or lease-lifecycle result was produced.
- The script's finally block deleted the run-owned Worker/D1 resources and verified their absence. This cleanup result is explicitly successful in the job log.
- Production and pre-existing staging were not targeted.

## Likely blocker: Worker resource creation role

The Worker name is unique per workflow run and is intentionally absent before deployment. Cloudflare's current [Workers roles and permissions documentation](https://developers.cloudflare.com/workers/authorization/workers/) states that creating new Workers requires **product-level Admin** access; a per-Worker role cannot authorize creation because the new Worker does not exist yet. The previous handoff records the CI token as having D1 Read/Edit and Workers Scripts Edit. That legacy script permission alone does not establish that the token has the product-level Workers Admin role needed for the new Worker resource lifecycle.

This is the strongest explanation consistent with the endpoint, the run-specific new Worker name, and the successful upload followed by a missing Worker-resource response. It is a diagnosis, not proof of the token's actual assigned role: GitHub/Cloudflare secret contents and token policy are not readable from this integration.

## Safe next action

1. In Cloudflare, inspect the token's assigned Workers product role and scope. Do not paste the token or its value into chat.
2. If the CI token lacks Workers product-level Admin, decide whether to grant the narrowly intended disposable-test identity the required product-level role or redesign provisioning so the workflow does not create/delete Worker resources dynamically. Product-level Admin is broad and includes management/deletion capability; do not grant it casually.
3. Keep D1 permissions limited to the test account as before. Keep the workflow restricted to run-specific names and preserve the cleanup/absence verification.
4. Only after the permission policy is deliberately corrected, manually rerun the disposable workflow. Do not treat this run as relay evidence and do not increase traffic/time/quota limits.

No code change or Cloudflare resource change is made by this diagnosis.
