# MAINLINE-PROD-ACCEPTANCE-DATA-ISOLATION-072 Worker Handoff

## Summary

- Added explicit data domains for self-media records: `user_work`, `acceptance_run`, `demo_seed`, `imported_metric`, `publish_ledger`, and `system_log`.
- Default Calendar now only admits `dataDomain === "user_work"` into the main scheduling board.
- Default Content now only admits `dataDomain === "user_work"` or explicitly library-confirmed user work; acceptance/demo data is visible only in a default-closed `本地验收/测试内容` fold.
- Default Dashboard trusted metrics now require the owning content to be `user_work`; acceptance/demo/seed/system/import pollution cannot be counted by trusted stats.
- Existing operating DB rows are migrated non-destructively by service-side backfill: no DB file deletion, no file deletion, only entity JSON data-domain fields are updated.
- New browser/UI-created acceptance content is isolated by `acceptanceRunId`, explicit `dataDomain`, or title fallback markers such as `050-072`, `MAINLINE`, `验收`, `回归`, `测试`, `AI选题计划`, `AI短片复盘`, `小雏菊`, `想拍一条短视频`, `真实作品：六月内容计划`.

## Key Files

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `scripts/trusted-dashboard-audit.mjs`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`

## Browser Acceptance

Fixed entry path was used:

1. Opened `http://localhost:3200/dashboard`.
2. Clicked visible `发布日历` navigation into `/calendar`.
3. Confirmed default calendar board does not show fake/acceptance titles or run markers.
4. Clicked an empty calendar slot and created `072验收测试-不应默认显示`.
5. Returned through `/dashboard` to `/calendar`; confirmed the default calendar board still does not show that title.
6. Clicked an empty calendar slot and created `用户作品：六月内容计划`.
7. Returned through `/dashboard` to `/calendar`; confirmed the default calendar board shows `用户作品：六月内容计划`.

Screenshots:

- `docs/handoffs/artifacts/MAINLINE-PROD-ACCEPTANCE-DATA-ISOLATION-072/calendar-default-before.png`
- `docs/handoffs/artifacts/MAINLINE-PROD-ACCEPTANCE-DATA-ISOLATION-072/calendar-after-acceptance-create.png`
- `docs/handoffs/artifacts/MAINLINE-PROD-ACCEPTANCE-DATA-ISOLATION-072/calendar-after-user-work-create.png`

Conclusion: default calendar board is clean for acceptance/test content; real `user_work` content appears after creation.

## Verification

Note: host `C:` / default Temp was full (`0 GB` free), so npm verification was run with:

`TEMP=D:\codex-temp`, `TMP=D:\codex-temp`, `npm_config_cache=D:\codex-npm-cache`

Results:

- `npm run typecheck` - pass
- `npm run test:self-media` - pass, 131/131
- `npm run test:ui-harness` - pass, 15/15
- `npm run build` - pass. First build attempt hit a transient Next trace `ENOENT` for `_not-found/page.js.nft.json`; immediate rerun passed.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` - pass
- Browser acceptance on Chrome via `playwright-core` with local Chrome channel - pass

## Environment Notes

- The Browser plugin's node-backed in-app browser channel failed before execution with `failed to write kernel assets: 系统找不到指定的路径。`; after reset it still failed. Because the user required real browser/mouse behavior, validation used `playwright-core` plus installed Chrome instead.
- Port `3200` was restarted to use the fresh production build. Only the explicit old `next start` listener process for this project/port was stopped.
- No DB files were deleted.
- No files or directories were batch-deleted.

## Residual Risk

- The operating DB now contains the two browser acceptance-created rows from this validation. The `072验收测试-不应默认显示` row is isolated as acceptance data; `用户作品：六月内容计划` is intentionally visible as `user_work`.
- `C:` remains full in the host environment. Future npm/test runs should either free C: manually or keep `TEMP/TMP/npm_config_cache` on D:.
