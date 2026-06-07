# MAINLINE-REAL-LOGIN-CAPTURE-091 Worker Handoff

## Task

Verify the real assisted login-capture loop with the user helping inside the opened platform windows:

platform backend window -> user login / page switch -> return to `/import` -> `focus_return` or manual refresh preview -> user confirmation -> save -> dashboard trusted totals update.

This was a real acceptance attempt, not a UI cleanup task.

## Result

No platform was saved into trusted metrics in this run.

Both Douyin and Xiaohongshu browser sessions opened with persistent local profiles, and both routes remained preview-only. However, neither platform exposed a visible content-level works/note metrics table during the final checks, so saving would have stored account-overview or empty rows. That was intentionally blocked.

## Evidence

Fixed entrypoint and pages:

- Entry: `http://localhost:3200/dashboard`
- Operation page: `http://localhost:3200/import`

Health:

- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed on port 3200.

Pre-save dashboard baseline:

- `trustedContentCount`: 12
- `trustedMetricSnapshotCount`: 12
- `operationHistoryCount`: 12

Final preview-only checks:

| Platform | Window/session | Login/page state | Preview | Save |
| --- | --- | --- | --- | --- |
| Douyin | Opened with persistent local profile | `logged_in_or_accessible` at `https://creator.douyin.com/creator-micro/data-center/operation` | Failed: `contentCount=0`, `metricCount=0`, warning `no_visible_content_rows` | Not saved |
| Xiaohongshu | Opened with persistent local profile | `logged_in_or_accessible` at `https://creator.xiaohongshu.com/statistics/account/v2` | Failed: `contentCount=0`, `metricCount=0`, warning `no_visible_creator_note_rows` | Not saved |

Dashboard after preview-only attempts:

- `trustedContentCount`: 12
- `trustedMetricSnapshotCount`: 12
- `operationHistoryCount`: 12

This confirms preview-only checks did not pollute dashboard trusted totals.

Live default page cleanliness:

- `/import`: no visible backend logs, local paths, API route strings, run/raw/evidence labels, or acceptance/test wording detected.
- `/dashboard`: no visible backend logs, local paths, API route strings, run/raw/evidence labels, or acceptance/test wording detected.

## Blockers

Douyin blocker:

- The opened page was an operation/data-center overview page, not a works table.
- The route could see that the page was accessible, but extracted zero visible content-level rows.
- Next required user action: in the opened Douyin creator window, switch to a page that visibly lists individual works with title plus play/views, likes, comments, shares, or equivalent per-work metrics.

Xiaohongshu blocker:

- The opened page was an account statistics overview page, not a note/work table.
- The route could see that the creator page was accessible, but extracted zero visible note/work metric rows.
- Next required user action: in the opened Xiaohongshu creator window, switch to note management or note data list where each visible row includes note title plus browsing/views, likes, comments, saves, shares, or equivalent per-note metrics.

## Boundaries Preserved

- No WeChat/公众号 work was resumed.
- Video Account remained discovery-only.
- Bilibili browser capture remained unsupported; Bilibili account metrics remained preview-only.
- No password, cookie, token, header, storage state, raw request, raw response, screenshot, HAR, or trace material was saved.
- No data was saved without user confirmation.
- No local export path was used as the mainline.
- No DB or data files were deleted.

## Verification

- `git diff --check` passed.
- `npm run typecheck` passed.
- `npm run test:self-media` passed: 143 tests.
- `npm run test:ui-harness` passed: 19 tests.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed.
- Live browser checks for `/import` and `/dashboard` passed default-page cleanliness checks.

## Residual Risk / Next Step

This run proves the app correctly refuses to save account-overview pages and zero-row previews. It does not yet prove a full real save loop, because the user-assisted platform windows were not on pages with visible content-level metric rows at the time of final capture.

The next real acceptance attempt should start from the already-opened persistent-profile windows and navigate directly to:

- Douyin: works management or work data list with per-work metrics.
- Xiaohongshu: note management or note data list with per-note metrics.
