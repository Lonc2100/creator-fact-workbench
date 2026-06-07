# OPERATOR-RUNBOOK-033 Orchestrator Review

## Decision

Accepted.

`docs/runbooks/self-media-daily-ops.md` is now the daily operator runbook.

## Accepted Daily Command

```bash
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

## Accepted Daily Surfaces

- `/dashboard`
- `/import`
- `/content/`
- `/reviews`

Use `/content/` with the trailing slash if `/content` returns 404.

## Accepted Boundaries

- Do not run WeChat/Official Account commands in daily ops.
- Do not save Bilibili account-level metrics.
- Do not delete, clear, migrate, or manually edit local sqlite DBs.
- Use content curation for operating-scope exclusion instead of deletion.

## Main Session Change

Linked the runbook from `docs/handoffs/CURRENT-PLATFORM-STATUS.md` so future sessions can find it from the compact status entrypoint.

## Main Session Verification

Reran:

- `git diff --check`: PASS.
- `npm run test:self-media`: PASS, 92/92.
