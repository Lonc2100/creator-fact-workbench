# LOCAL-DATA-QUARANTINE-PLAN-029 Orchestrator Review

## Decision

Accepted with the recommended path: use `trusted_scope_view` first.

Do not clean, delete, migrate, or rebuild the local database yet.

## Accepted Operator Command

Use this read-only check whenever local dashboard numbers look suspicious or before a database cleanup discussion:

```bash
npm run check:local-data-quarantine
```

The command may write report files under `.local/local-data-quarantine`, but it must keep the database read-only and must not print raw payloads, titles, cookies, tokens, headers, entity IDs, comments, or danmu text.

## Current Local Data Finding

The main session reran the command and confirmed the local database is heavily mixed:

- trusted real creator-center: 177 records
- demo/smoke: 534 records
- manual/csv/mediacrawler/n8n: 427 records
- paused WeChat: 82 records
- unknown/unclassified: 303 records

This explains why the old dashboard looked wrong. The correct immediate fix is the accepted trusted default scope, not deletion.

## Cleanup Boundary

No batch delete. No automatic clear. No destructive cleanup script.

If the user later asks for a clean local profile, the next safe step is a spec for a seed-free clean database/profile switch, not direct deletion from `.local/self-media.sqlite`.

## Verification

Main session reran:

- `npm run check:local-data-quarantine`: PASS.
- `npm run test:self-media`: PASS, 75/75.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.
