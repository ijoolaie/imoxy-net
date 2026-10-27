# Imoxy-specific improvement backlog

**State:** Proposed only; Phase 13 implementation is gated on measured parity and legal approval.  
**Rule:** These are product hypotheses, not committed scope or claims that the reference lacks these capabilities.

## Prioritized candidate improvements

| ID | Candidate | User problem / hypothesis | Acceptance criteria | Risk / dependency |
|---|---|---|---|---|
| IMO-001 | Explainable dry-run change plans | Operators need to understand exactly what a Cloudflare operation would change before approval | Show normalized before/after diff, required permissions, affected resource IDs, risk level, expiry of preview and a deterministic plan hash; no mutation occurs on preview | Requires provider scope validation and safe write design; current API is read-only |
| IMO-002 | Unified activity and audit timeline | Admins need a traceable history across panel, bot and API | Every mutation records principal/interface/action/target/request ID/outcome; secrets and subscription tokens are redacted; users can filter by time/action/target and retention is configurable | Requires retention/privacy review and cross-interface audit contract |
| IMO-003 | Backup and restore preflight | Operators need to know whether recovery is possible before upgrades | Export schema/version metadata and encrypted user data without provider secrets; verify archive integrity; restore into disposable DB; generate a preflight report and never overwrite production implicitly | Requires D1-specific backup/restore design and threat review |
| IMO-004 | Configuration drift report | Operators need to detect divergence between intended and observed Cloudflare resources | Compare a versioned desired-state snapshot with read-only inventory; label missing/extra/changed resources; explain confidence and never auto-apply | Depends on stable resource model and permission tests |
| IMO-005 | Cross-interface task continuity | Users should be able to start in web and safely inspect status from Telegram/Android | A shared operation ID/status model, role-filtered summaries and consistent error codes across interfaces; no secrets in deep links/messages | Depends on durable identity linking and shared operation service |
| IMO-006 | Privacy-aware diagnostics bundle | Support needs useful diagnostics without collecting credentials or user traffic unnecessarily | User-triggered bundle includes versions, health, sanitized config schema and redacted recent errors; excludes tokens, raw subscription URLs, IPs and traffic payloads by default | Requires explicit consent, retention and redaction tests |
| IMO-007 | Safer upgrade advisor | Operators need a clear upgrade/rollback decision before a release | Compare schema/app versions, identify breaking changes, require a backup proof and show rollback compatibility before enabling upgrade | Depends on migrations, versioned configuration and proven restore |

## Selection rubric

Score each candidate 1–5 for user value, evidence of demand, implementation cost, operational risk and regression risk. Select only after collecting user/operator evidence; value and demand should outweigh cost/risk. Keep the feature behind a capability flag until parity regression tests pass.

## Phase 13 gate

No candidate should be implemented as a Phase 13 release feature until:
1. Phase 1 has repeatable black-box evidence for the corresponding reference behavior.
2. Applicable licensing/distribution review is resolved.
3. A separate ADR specifies the behavior, threat/privacy impact and rollback.
4. Acceptance tests prove no regression across panel-only, Cloudflare-only and combined operating modes.
5. The roadmap records explicit approval and the change is tested against the same critical parity suite.
