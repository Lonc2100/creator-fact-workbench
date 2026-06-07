# CONTENT-PUBLISH-HISTORY-041 Orchestrator Review

## Decision

Accepted as a read-only content workbench capability.

The implementation adds useful per-content publish history without changing trusted dashboard/review metrics. Publish records remain local manual confirmation records and do not become trusted evidence.

## Reviewed Evidence

- Worker handoff: `docs/handoffs/CONTENT-PUBLISH-HISTORY-041-worker-handoff.md`
- Screenshot: `.local/draft-review-ui-e2e-039/content-publish-history.png`
- Smoke evidence: `smoke:draft-review-ui-e2e` passed and confirmed publish history visibility, calendar ledger link, idempotent publish confirmation, and trusted totals unchanged.

## Boundaries Confirmed

- No real platform publish API was added.
- No publish history edit path was added.
- Publish records are not trusted metric evidence.
- Trusted dashboard/reviews totals are unchanged by manual publish confirmation.
- `/content` continues to use the dedicated content workbench API.

## Follow-Up Required

This is accepted as capability, but not as the final cleaned default UI.

The screenshot still exposes internal-looking labels and ids such as local workflow source labels, long generated version/action identifiers, and trusted/local implementation wording. These should be made user-facing under the Operator View Data Only rule:

- default `/content` should prioritize real operating rows and user-created drafts;
- long ids should be hidden behind row details or diagnostics;
- implementation labels should become business labels;
- all-local/archive/debug rows should remain behind filters.

## Next Task

Fold this cleanup into `CONTENT-CALENDAR-DATA-ONLY-042`.
