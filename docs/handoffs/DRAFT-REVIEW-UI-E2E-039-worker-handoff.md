# DRAFT-REVIEW-UI-E2E-039 Worker Handoff

## Task

补齐草稿审核台浏览器级 E2E：从 action-generated draft 进入 `/content`，编辑标题、正文、选题、排期、checklist，保存草稿审核，再排期进入 `/calendar`，人工确认发布后生成 publish record。不得调用真实平台 API。

## Completed Work

- Added `npm run smoke:draft-review-ui-e2e`.
- Added `scripts/draft-review-ui-e2e-039.mjs`.
  - Uses isolated sqlite: `.local/draft-review-ui-e2e-039/self-media-draft-review-*.sqlite`.
  - Finds a temporary local port starting at `3320`.
  - Seeds sanitized trusted creator-center fixtures only.
  - Runs a browser flow:
    - `/dashboard` post-import suggestion -> action item -> action-generated draft.
    - `/content` edits title/body/topic/scheduledAt/checklist and saves draft review.
    - Covers `draft -> scheduled`.
    - Verifies schedule enters `/calendar`.
    - Verifies generic PATCH blocks `published`, `failed`, and `publishedAt`.
    - `/calendar` manual confirmation records `confirm_publish` as `published`.
    - Repeats `confirm_publish` and verifies publish record idempotency.
    - Verifies trusted dashboard/review totals remain unchanged.
    - Verifies UI text does not expose raw/cookie/token/headers/comment body/danmu sensitive text.
- Added manual publish confirmation controls to the calendar inspector.
  - The controls call the existing local `action: "confirm_publish"` API path.
  - The UI says this is local manual recording and does not call real platform APIs.
- Added a UI harness regression test for the calendar manual publish confirmation boundary.

## Changed Files

- `package.json`
- `scripts/draft-review-ui-e2e-039.mjs`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `tests/ui-harness.test.mjs`

Note: the worktree already had many pre-existing modified and untracked files before this task. This worker did not revert or clean unrelated changes.

## Evidence

- New smoke report: `.local/draft-review-ui-e2e-039/report.json`
- New smoke screenshot: `.local/draft-review-ui-e2e-039/calendar-published.png`
- Report highlights:
  - `isolatedDb: true`
  - `noRealPlatformApi: true`
  - flow statuses: `draft -> scheduled -> published`
  - generic PATCH blocked with HTTP `400` for `published`, `failed`, `publishedAt`
  - `repeatedPublishIdempotent: true`
  - trusted totals before/after unchanged:
    - trusted content count: `4 -> 4`
    - trusted metric snapshots: `4 -> 4`
    - trusted views: `6750 -> 6750`
    - trusted engagement: `636 -> 636`
    - weekly/monthly review totals unchanged

## Verification

- `npm run smoke:draft-review-ui-e2e`: PASS
- `npm run test:self-media`: PASS, 119/119
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS
- `npm run test:ui-harness`: PASS, 8/8

## External References Checked

- Playwright browser context isolation: https://playwright.dev/docs/browser-contexts
- Next.js CLI `--port` / `--hostname` options: https://nextjs.org/docs/app/api-reference/cli/next

## Boundaries Kept

- No real platform publish API call.
- No WeChat restart.
- No Bilibili account metric save.
- No trusted metric total pollution from action-generated drafts or manual publish confirmations.
- No batch deletion or cleanup scripts were added.

## Known Issues

- The new smoke initially failed twice during development:
  - checklist label ambiguity; fixed by using role-based checkbox locators.
  - scheduled date outside current week view; fixed by scheduling within the current visible week.
- The final run passed after both fixes.

## Next Recommendation

Orchestrator should review whether calendar manual publish confirmation is acceptable as a product surface, since it extends the existing content-page confirmation control into the calendar inspector.

## Orchestrator Decision Required

Yes.
