# Operations and release safety

- Never deploy to a real Cloudflare account from CI until bindings, environments, and explicit release approvals are configured.
- Use least-privilege credentials stored as GitHub/Cloudflare secrets; never commit them.
- Run checks and tests on every pull request.
- Separate development, staging and production resources.
- Back up and validate data migrations before applying them.
- Provide rollback steps for worker code and schema changes.
- Review audit-log contents and retention for data minimization before production.
