# CONTENT-TRUST-CURATION-031 Orchestrator Review

## Decision

Accepted.

The product now has a non-destructive way to exclude public but non-operational content from default dashboard, reviews, and post-import suggestions.

## Accepted Behavior

- User exclusion is stored on content metadata, not by deleting rows.
- Excluded content remains in the database.
- Excluded content is removed from default trusted scope before provenance and legacy fallback checks.
- Restoring clears the override and lets the content re-enter normal trusted-scope evaluation.
- Trusted dashboard audit compares user-excluded counts against dashboard state.

## Main Session Verification

Reran after review:

- `npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: PASS.
- `npm run test:self-media`: PASS, 85/85.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

## Boundary

Do not use this feature as a delete/cleanup substitute. It is an operating-view curation tool only.
