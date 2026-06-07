# PUBLISH-LEDGER-OPERATIONS-040 Worker Handoff

## Task

把“人工发布确认”从单个日历 inspector 能力推进成可运营的 publish ledger。

Required workflow:

- Show publish records in `/calendar` or `/content`.
- Display platformVersion, content, platform, scheduledAt, publishedAt, confirmationSource, status, failureReason/note.
- Support platform/status/date filtering.
- Keep published/failed writes behind explicit `confirm_publish`.
- Keep generic PATCH blocked from writing `published`, `failed`, or `publishedAt`.
- Do not call real platform publish APIs.
- Do not treat publish records as trusted metric evidence.
- E2E/smoke must cover draft -> scheduled -> manual publish -> ledger visible -> repeated confirm idempotent.

## External Reference Check

Lightweight reference scan before implementation:

- Postiz GitHub: https://github.com/gitroomhq/postiz-app
- Mixpost GitHub: https://github.com/inovector/mixpost
- Datadog Audit Trail docs: https://docs.datadoghq.com/account_management/audit_trail/

Assessment:

- Applicability: high for operational published/scheduled post lists and status/date filtering.
- Timeliness: active/open operational products and maintained audit-log docs.
- Authority: Postiz/Mixpost are real publishing tools; Datadog is an authoritative audit-log reference.
- Popularity: Postiz/Mixpost are widely referenced OSS publishing products; Datadog is mature operational tooling.

Decision: borrow the filtered ledger table shape only. No new dependency, provider, or external publish integration was added.

## Completed Work

- Added a publish ledger panel to `/calendar`.
- Ledger reads from existing `DashboardSnapshot.publishRecords` and joins local `platformVersions` and `contents`.
- Ledger columns:
  - platform version id;
  - publish record id;
  - content title/id;
  - platform;
  - scheduledAt;
  - publishedAt;
  - confirmationSource;
  - status;
  - failureReason/note.
- Ledger filters:
  - platform;
  - publish result status;
  - publish record date.
- Ledger copy explicitly says:
  - local manual confirmation only;
  - no real platform publish API;
  - not trusted dashboard/reviews metric evidence.
- Extended `npm run smoke:draft-review-ui-e2e`:
  - still uses isolated sqlite and isolated `NEXT_DIST_DIR`;
  - covers action draft -> `/content` draft review -> scheduled -> `/calendar` manual publish;
  - checks generic PATCH rejects `published`, `failed`, `publishedAt`;
  - verifies publish ledger row is visible;
  - verifies ledger status/date filters;
  - repeats `confirm_publish` and checks idempotent single publish record/single visible ledger row;
  - confirms trusted dashboard/reviews totals stay unchanged.
- Extended UI harness test to pin ledger copy and boundary.

## Changed Files

- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `scripts/draft-review-ui-e2e-039.mjs`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/PUBLISH-LEDGER-OPERATIONS-040-worker-handoff.md`

Note: the worktree had many pre-existing modified/untracked files before this task. This worker did not revert or clean unrelated changes.

## Evidence

- Smoke report: `.local/draft-review-ui-e2e-039/report.json`
- Screenshot: `.local/draft-review-ui-e2e-039/calendar-published.png`
- Server logs:
  - `.local/draft-review-ui-e2e-039/server-2026-06-05T03-12-20-277Z.out.log`
  - `.local/draft-review-ui-e2e-039/server-2026-06-05T03-12-20-277Z.err.log`

Report highlights:

- `isolatedDb: true`
- `noRealPlatformApi: true`
- flow: `draft -> scheduled -> published`
- `ledgerVisible: true`
- `ledgerFilters.status: published`
- `repeatedPublishIdempotent: true`
- generic PATCH blocked with HTTP `400` for:
  - `published`
  - `failed`
  - `publishedAt`
- trusted totals before/after unchanged:
  - trusted content count: `4 -> 4`
  - trusted metric snapshots: `4 -> 4`
  - trusted views: `6750 -> 6750`
  - trusted engagement: `636 -> 636`
  - weekly/monthly views and engagement unchanged.

## Verification

- `npm run smoke:draft-review-ui-e2e`: PASS
- `npm run test:self-media`: PASS, 119/119 standalone
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS, including `test:self-media` 120/120 in full harness
- `git diff --check`: PASS
  - Non-blocking warning observed: `tsconfig.json` CRLF/LF replacement warning. No whitespace errors.
- `npm run test:ui-harness`: PASS, 8/8 standalone

## Boundaries Kept

- No real platform publish API call.
- No new Provider integration.
- No WeChat restart.
- No Bilibili account metric save.
- No publish record used as trusted metric evidence.
- Generic platform-version PATCH still cannot write `published`, `failed`, or `publishedAt`.
- Scheduling/rescheduling still does not create publish records.
- No deletion or cleanup operation was performed.

## Known Issues

- The smoke report task label remains `DRAFT-REVIEW-UI-E2E-039` because this task intentionally extends the existing accepted smoke command instead of adding another browser server command.
- Platform filter in the ledger is implemented visually with the existing compact platform chips; the E2E currently verifies status/date filtering and visible ledger row.

## Next Recommendation

Orchestrator should decide whether this ledger is sufficient on `/calendar`, or whether `/content` should also show a compact per-content publish history in a follow-up polish task.

## Orchestrator Decision Required

Yes.
