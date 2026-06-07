# LOCAL-EVIDENCE-SAFE-CLEANUP-076 Worker Handoff

## Scope

- Task: clean explicitly confirmed obsolete local smoke/e2e SQLite evidence files from `.local`.
- User authorization: user explicitly allowed cleaning useless files.
- Safety boundary followed:
  - no directory deletion;
  - no wildcard deletion;
  - no `git clean`;
  - no `Remove-Item -Recurse`;
  - only exact `Remove-Item -LiteralPath` file deletions;
  - no real operating DB, Chrome profile, raw capture, login state, token/cookie/header material, source, docs, or scripts deleted.

## Reports Read

- `AGENTS.md`
- `docs/handoffs/ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md`
- `.local/entropy-governance-scan/report.md`
- `.local/entropy-governance-scan/report.json`

## Planned Delete List

All planned files came from `classification.deleteRequiresUserConfirmation` in `.local/entropy-governance-scan/report.json` and were inside the user-approved 076 scope.

- `.local/calendar-real-scheduling-workflow-044/self-media-calendar-real-2026-06-05T06-27-12-053Z.sqlite`
- `.local/calendar-real-scheduling-workflow-044/self-media-calendar-real-2026-06-05T06-28-13-442Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T04-24-59-313Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T04-26-51-866Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T06-15-46-060Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T06-19-16-056Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-27-13-055Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-27-45-144Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-28-48-389Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-41-24-264Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-46-09-325Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-51-17-143Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-55-12-021Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-57-11-402Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-12-20-277Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-29-34-079Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-40-10-211Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-40-54-238Z.sqlite`
- `.local/main-session-smoke-self-media-038.sqlite`
- `.local/main-session-smoke-self-media-038b.sqlite`
- `.local/main-session-smoke-self-media-038c.sqlite`
- `.local/main-session-smoke-self-media-038d.sqlite`
- `.local/main-session-smoke-self-media-038e.sqlite`
- `.local/main-session-smoke-self-media-038f.sqlite`
- `.local/main-session-smoke-self-media-038g.sqlite`
- `.local/operating-e2e-action-to-content-038/self-media-action-content-2026-06-04T17-51-23-967Z.sqlite`
- `.local/operating-e2e-action-to-content-038/self-media-action-content-2026-06-04T18-02-37-885Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T16-52-32-262Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T16-52-59-115Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T17-03-18-375Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T17-04-38-323Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-07-52-006Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-09-15-650Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-09-41-746Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-10-28-967Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-11-35-924Z.sqlite`
- `.local/operator-ux-final-polish-044/self-media-2026-06-05T06-26-08-033Z.sqlite`
- `.local/operator-ux-final-polish-044/self-media-2026-06-05T06-28-53-008Z.sqlite`
- `.local/platform-operations-e2e/self-media-smoke.sqlite`
- `.local/platform-personal-save-smoke/self-media-smoke.sqlite`

Initial estimate before deletion:

- Planned files: 40
- Estimated freed space: 3,309,568 bytes, about 3.16 MiB

## Planned Skips

These appeared in `deleteRequiresUserConfirmation` but are directories, so they were not deleted:

- `.local/content-curation-e2e`
- `.local/platform-operations-e2e`
- `.local/draft-review-ui-e2e-039`

## Final Results

- Deleted files: 40
- Deleted bytes estimate: 3,309,568 bytes, about 3.16 MiB
- Missing planned candidates: 0
- Skipped candidates: 3 directory entries from the 073 report, because 076 forbids deleting directories.
- `.local` directory cleanup result after `npm run scan:entropy`:
  - total size changed from the pre-cleanup estimate of about 509.87 MiB to 506.81 MiB;
  - SQLite/db evidence count changed from 56 candidates in the 073 context to 16 current `.local` db files.

## Deleted Files

Each file was checked with `Test-Path -LiteralPath`, removed with one exact `Remove-Item -LiteralPath`, then checked again with `Test-Path -LiteralPath` to confirm it no longer existed.

- `.local/calendar-real-scheduling-workflow-044/self-media-calendar-real-2026-06-05T06-27-12-053Z.sqlite`
- `.local/calendar-real-scheduling-workflow-044/self-media-calendar-real-2026-06-05T06-28-13-442Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T04-24-59-313Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T04-26-51-866Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T06-15-46-060Z.sqlite`
- `.local/dashboard-number-trust-audit-043/self-media-2026-06-05T06-19-16-056Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-27-13-055Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-27-45-144Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-28-48-389Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-41-24-264Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-46-09-325Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-51-17-143Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-55-12-021Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T02-57-11-402Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-12-20-277Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-29-34-079Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-40-10-211Z.sqlite`
- `.local/draft-review-ui-e2e-039/self-media-draft-review-2026-06-05T03-40-54-238Z.sqlite`
- `.local/main-session-smoke-self-media-038.sqlite`
- `.local/main-session-smoke-self-media-038b.sqlite`
- `.local/main-session-smoke-self-media-038c.sqlite`
- `.local/main-session-smoke-self-media-038d.sqlite`
- `.local/main-session-smoke-self-media-038e.sqlite`
- `.local/main-session-smoke-self-media-038f.sqlite`
- `.local/main-session-smoke-self-media-038g.sqlite`
- `.local/operating-e2e-action-to-content-038/self-media-action-content-2026-06-04T17-51-23-967Z.sqlite`
- `.local/operating-e2e-action-to-content-038/self-media-action-content-2026-06-04T18-02-37-885Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T16-52-32-262Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T16-52-59-115Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T17-03-18-375Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-04T17-04-38-323Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-07-52-006Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-09-15-650Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-09-41-746Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-10-28-967Z.sqlite`
- `.local/operating-e2e-dashboard-import-036/self-media-operating-2026-06-05T04-11-35-924Z.sqlite`
- `.local/operator-ux-final-polish-044/self-media-2026-06-05T06-26-08-033Z.sqlite`
- `.local/operator-ux-final-polish-044/self-media-2026-06-05T06-28-53-008Z.sqlite`
- `.local/platform-operations-e2e/self-media-smoke.sqlite`
- `.local/platform-personal-save-smoke/self-media-smoke.sqlite`

## Preserved / Skipped

- Preserved protected DBs:
  - `.local/self-media.sqlite`
  - `.local/self-media-clean.sqlite`
- Preserved protected platform local capture areas:
  - `.local/douyin-personal-v0`
  - `.local/bilibili-personal-v0`
- Preserved directories even when empty or listed in the 073 cleanup report:
  - `.local/content-curation-e2e`
  - `.local/platform-operations-e2e`
  - `.local/draft-review-ui-e2e-039`
- No Chrome profile, raw capture, login state, token/cookie/header/raw payload, source file, script, or docs file was deleted.

## Later Confirmation Still Needed

The post-cleanup entropy scan generated a fresh report and still lists additional possible cleanup candidates. They were not part of this 076 planned deletion list and were not touched. In particular:

- `.local/self-media-clean.sqlite` appears in the new report but is explicitly forbidden by 076 and must stay.
- Newer `.local/operator-ux-final-polish-044/*.sqlite`, `.local/content-curation-e2e/*.sqlite`, and `.local/debug-temp-api.sqlite` candidates require a separate confirmation pass before deletion.
- Directory entries still require manual confirmation and must not be deleted by this cleanup task.

## Validation

- `npm run scan:entropy`: PASS
  - current `.local` total: 506.81 MiB
  - current `.local` db count: 16
- `git status -sb`: PASS for inspection
  - confirms this handoff is the only 076 file to stage;
  - existing unrelated dirty/untracked files remain untouched.
- `git diff --check`: PASS
- Staged changes before commit: handoff only, no `.local` files staged.
