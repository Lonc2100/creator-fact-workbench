# PUBLISH-LEDGER-OPERATIONS-040 Orchestrator Review

## Decision

Accepted.

## Review

The publish ledger is acceptable on `/calendar` as an operating table for local manual publish confirmations. It reads existing publish records, joins content/platform-version context for inspection, and keeps the copy explicit that these rows are local records only.

The implementation keeps the right boundary:

- No real platform publish API calls.
- Generic platform-version PATCH still cannot write `published`, `failed`, or `publishedAt`.
- Scheduling/rescheduling still does not create publish records.
- Publish records do not become trusted metric evidence and do not affect dashboard/review totals.

## Verification

- `npm run smoke:draft-review-ui-e2e`: PASS
  - `ledgerVisible: true`
  - `ledgerFilters.status: published`
  - repeated confirm publish remains idempotent
  - trusted totals unchanged
- `npm run verify:harness`: PASS
  - `test:self-media`: PASS, 120/120
  - `test:ui-harness`: PASS, 9/9
- `git diff --check`: PASS

## Follow-Up

Later, `/content` can show a compact per-content publish history, but it should reuse the same ledger semantics and must remain local/manual-only.
