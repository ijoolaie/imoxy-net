# Acceptance test plan

## Required comparison record

For each scenario record: reference release/commit, environment, request/action, input, expected output, observed output, state changes, logs/side effects, and pass/fail.

## Initial scenarios

- D1 adapter reads use bound parameters and map persisted account fields consistently.
- Account listing bounds page size and returns a stable ID cursor.
- Account create/update/delete operations are coupled to an audit insert through D1 batch statements; mocked adapter tests cover the query contract. A real D1 integration test is still required.
- Adapter rejects unsupported update fields, empty changes, missing audit metadata and invalid page sizes.


- Password hashes use salted PBKDF2-SHA-256; correct passwords verify, incorrect passwords and malformed hashes fail closed.
- Session credentials use cryptographically random tokens; persistence stores a token hash rather than the raw bearer token.
- Weak password input, invalid iteration settings, and malformed/short session tokens are rejected.


- Domain validation rejects unknown fields and internal-role injection.
- Username constraints, UTC timestamps, quota safe-integer bounds, nullable limits, and notes length have unit tests.
- The initial D1 schema defines principals/sessions, proxy accounts, subscription-token hashes, daily usage, installation settings, provider-resource metadata and audit events. Migration execution, concurrent writes, backups and restore are not yet verified.
- Reference scenarios are enumerated in [reference-scenarios.md](reference-scenarios.md); all remain unrun against the pinned reference.

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
