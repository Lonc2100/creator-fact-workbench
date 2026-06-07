# CONTENT-CURATION-E2E-032 Orchestrator Review

## Decision

Accepted after main-session stabilization.

The content curation UI now has an executable E2E proof that excluding and restoring public Bilibili content changes dashboard/review/audit totals without deleting stored data.

## Main Session Fixes

During review, the first rerun exposed E2E instability:

- `/content` returned 404 in the local Next app while `/content/` was valid.
- Dev hot-update 404s could interrupt navigation.
- The long raw command was inconvenient for repeated operator use.

Main session fixed:

- Added package script `npm run e2e:content-curation`.
- Updated the E2E to use `/content/`.
- Added explicit page response checks and retrying app-page navigation.
- Ignored Next webpack hot-update 404 noise in the E2E HTTP-failure list.
- Changed the E2E dev-server launch to call the Next CLI directly and stop the process tree on Windows.

## Accepted Evidence

Reran:

- `npm run e2e:content-curation`: PASS.
- `npm run test:self-media`: PASS, 90/90.
- `npm run typecheck`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

## Boundary

The E2E uses an isolated, seed-free, sanitized Bilibili fixture database. It does not mutate the dirty/history operating database and does not print raw payloads or private titles.
