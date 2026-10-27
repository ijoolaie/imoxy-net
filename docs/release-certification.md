# Release certification and controlled rollout

**State:** Blocked — this is a release gate checklist, not evidence of a certified release.  
**Last reviewed:** 2026-10-27  
**Release candidate:** None  
**Production deployment:** Not performed

## Release decision

A release may be authorized only when every P0 gate below is evidenced on the exact release-candidate SHA. A green unit-test workflow alone is insufficient.

| Gate | Required evidence | Current status |
|---|---|---|
| License/distribution | Qualified review of pinned reference license and written approval for intended distribution/commercial model | **Blocked** — observed PolyForm Noncommercial 1.0.0 terms need review |
| Reference parity | Sanitized black-box records for critical scenarios against the pinned runtime, with mismatch resolution | **Blocked** — reference runtime has not been exercised |
| Security | Threat model, dependency review, abuse/rate tests, session and secret-handling review, no unresolved critical/high findings | **Not certified** |
| Data durability | Real D1 migration, backup/export, restore, interrupted write, concurrency and rollback evidence | **Not certified** |
| API and clients | Critical web/bot/Android journeys, permission equivalence, session expiry/revocation and error handling | **Partial** — only initial slices and mocked contract tests |
| Cloudflare | Read-only least-privilege validation; if writes are introduced, non-production approval, idempotency and tested rollback | **Blocked for writes** — no apply/write route is enabled |
| Operations | Runbook, secrets inventory, alerts, privacy-conscious logs, support diagnostics, incident/rollback owner | **Not certified** |
| Android provenance | Reproducible build, device install/E2E test, signing, version linkage and artifact checksum/attestation | **Partial** — unsigned debug APK artifact only |
| Telegram | Secret header, allowlist/linking, replay/idempotency and provider failure tests; no production bot token in CI | **Partial** — mocked read-only webhook; durable user linking/replay defense incomplete |
| Staging | Isolated staging deployment, migrations, smoke tests, monitoring and rollback rehearsal | **Not performed** |
| Final CI | Required workflows pass on exact release-candidate SHA; test artifacts retained and reviewed | **Not applicable** — no release candidate |

## Minimum controlled rollout sequence

1. Freeze a candidate commit and record the exact SHA, Node/Gradle versions, dependency lock state and artifact hashes.
2. Complete license and distribution approval before publishing or monetizing.
3. Deploy to an isolated staging environment with test-only credentials and least-privilege bindings.
4. Apply schema migrations; verify backups and perform a restore drill against a disposable database.
5. Run critical API, web, Telegram and Android smoke tests. Do not use real user credentials.
6. Verify Cloudflare inventory/preview only. Keep write operations disabled unless separately approved and reversible.
7. Observe structured, redacted logs and alerts during the staging window; confirm no secrets appear in responses, artifacts or logs.
8. Exercise rollback and document recovery time and data-loss boundaries.
9. Obtain explicit release approval and publish version-linked artifacts, checksums, release notes and rollback instructions.
10. Stop rollout on any unresolved critical/high security finding, unexplained data mutation, parity regression or failed recovery test.

## Required evidence record

For each gate, record: gate ID, reviewer, commit SHA, environment, test command/scenario, timestamp, result, artifact/log location, exceptions, and approval. Do not change a blocked/not-certified row to complete based only on a plan or documentation.

## Current decision

**Do not deploy to production or claim Nova parity.** Continue with reference characterization, legal review, D1 integration/recovery tests, browser/device E2E and cross-interface security tests.
