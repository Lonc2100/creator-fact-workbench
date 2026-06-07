# OPERATING-E2E-ACTION-TO-CONTENT-038 worker handoff

## Scope

- Added a browser-level Playwright E2E for the operating path:
  - dashboard post-import suggestion
  - convert to internal action item
  - generate content/schedule draft
  - verify content page and calendar visibility
  - verify trusted dashboard/review totals remain unchanged
- The E2E uses an isolated sqlite DB and temporary Next dev server port.
- It does not pollute `.local/self-media.sqlite`.
- It does not run daily ops, platform collection, platform login, publish actions, WeChat restore, or Bilibili account metric save.

## Files changed

- `scripts/operating-e2e-action-to-content.mjs`
  - New isolated Playwright smoke.
  - Seeds sanitized creator-center content-level fixtures.
  - Seeds blocking action items for manual/untrusted evidence and user-excluded evidence.
  - Starts a temporary Next dev server from port `3280`.
  - Scans dashboard/content/calendar visible text for forbidden sensitive terms.
- `package.json`
  - Added `npm run smoke:operating-action-to-content`.
- `tests/self-media-contract.test.ts`
  - Added a contract test proving the new smoke defaults to isolated DB, `SELF_MEDIA_SEED_MODE=off`, and temporary port planning.
- `docs/handoffs/OPERATING-E2E-ACTION-TO-CONTENT-038-worker-handoff.md`
  - This handoff.

## E2E behavior covered

- Opens `/dashboard`.
- Confirms post-import suggestions and internal action items exist.
- Clicks `转为任务`.
- Waits for the dashboard API to show a converted suggestion and new action item.
- Clicks `生成排期草稿`.
- Confirms the action item has:
  - `contentDraftId`
  - `platformVersionId`
  - `publishQueueItemId`
  - workflow status
- Repeats the action-to-content POST through the browser context and confirms idempotent response.
- Confirms repeated request does not duplicate content, queue item, or platform version.
- Confirms manual/untrusted evidence cannot create content.
- Confirms user-excluded evidence cannot create content.
- Opens `/content` and confirms the generated draft is visible.
- Opens `/calendar` and confirms the generated platform version card is visible.
- Confirms trusted dashboard/review totals stay unchanged before and after conversion:
  - trusted content count
  - trusted metric snapshot count
  - trusted views/engagement
  - weekly views/engagement
  - monthly views/engagement
- Scans visible UI text for:
  - `raw payload`
  - `cookie`
  - `token`
  - `headers`
  - `comment body`
  - `danmu`
  - `评论正文`
  - `弹幕`

## Evidence

- Smoke report:
  - `.local/operating-e2e-action-to-content-038/report.json`
- Screenshot:
  - `.local/operating-e2e-action-to-content-038.png`
- Isolated DB:
  - `.local/operating-e2e-action-to-content-038/self-media-action-content-*.sqlite`

Report summary:

- `repeatedIdempotent`: `true`
- `untrustedStatus`: `400`
- `excludedStatus`: `400`
- `noExtraContentCreated`: `true`
- Trusted/review totals before and after conversion matched exactly.

## Validation

- `npm run smoke:operating-action-to-content` - pass
- `npm run test:self-media` - pass, 114 tests
- `npm run typecheck` - pass
- `npm run verify:harness` - pass
- `git diff --check` - pass

## Boundaries

- Browser E2E is isolated and temporary-port based.
- No mutation of real operating DB.
- No daily ops parallel run.
- No automatic publish.
- No real platform API call or platform login.
- No raw/private/sensitive payload display.
- Bilibili account metrics remain preview-only.

## Needs main-session judgment

是
