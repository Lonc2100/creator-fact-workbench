# IMPORT-PROVENANCE-METADATA-030 Orchestrator Review

## Decision

Accepted.

Structured provenance metadata is now the preferred mechanism for default trusted-scope eligibility. Legacy text-pattern filtering remains only as a compatibility fallback for old polluted local rows.

## Accepted Rules

- `isTestFixture: true` excludes a snapshot/import run from default dashboard and review scope.
- `trustedScopeEligible: false` excludes it from default trusted scope.
- `trustedScopeEligible: true` allows a trusted creator-center source into default scope even if the title or ids contain words such as `test` or `demo`.
- Platform save smoke must write fixture provenance.
- Normal platform save must write real save provenance.
- Preview operations may write operation-history provenance but must not create content/metric rows.

## Why This Matters

This replaces the fragile 029 text matching as the primary long-term data hygiene mechanism while still preserving old database compatibility.

## Main Session Verification

Reran:

- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

Worker verification also reported:

- `npm run test:self-media`: PASS, 80/80.
- `npm run verify:harness`: PASS.

## Follow-up

No historical backfill is approved yet. Keep old polluted rows handled by the fallback/quarantine path unless the main session explicitly opens a read-only backfill design.
