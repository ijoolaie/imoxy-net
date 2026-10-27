# Acceptance test plan

## Required comparison record

For each scenario record: reference release/commit, environment, request/action, input, expected output, observed output, state changes, logs/side effects, and pass/fail.

## Initial scenarios\n\n- Domain validation rejects unknown fields and internal-role injection.\n- Username constraints, UTC timestamps, quota safe-integer bounds, nullable limits, and notes length have unit tests.\n- The initial D1 schema defines principals/sessions, proxy accounts, subscription-token hashes, daily usage, installation settings, provider-resource metadata and audit events. Migration execution, concurrent writes, backups and restore are not yet verified.\n- Reference scenarios are enumerated in [reference-scenarios.md](reference-scenarios.md); all remain unrun against the pinned reference.

- Health endpoint returns a stable, uncached JSON response.
- Unknown routes return a structured not-found response.
- Authentication tests cover valid, invalid, expired and revoked sessions.
- Every protected operation rejects unauthenticated and unauthorized callers.
- Account creation/edit/disable/delete persists the expected fields.
- Quota boundaries cover zero, just below, exactly at, and just above limits.
- Subscription outputs are checked byte-for-byte where deterministic and semantically where generated values vary.
- Cloudflare operations are tested with mocked adapters before any live account mutation.
- Bot, web and Android interfaces invoke the same domain rules.
- Failure injection covers unavailable storage, provider errors, timeouts and partial provisioning.

Only health/not-found cases are currently executable. All other scenarios are pending.
