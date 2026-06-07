# SAFE-WEEKLY-REPORT-UI-EXPORT-036 worker handoff

## Scope

- Read:
  - `AGENTS.md`
  - `docs/handoffs/README.md`
  - `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - `docs/handoffs/TRUSTED-WEEKLY-REPORT-EXPORT-035-orchestrator-review.md`
  - project core context required by `AGENTS.md`
- Did not change collectors, WeChat behavior, Bilibili account metric save behavior, or DB retention.
- Did not delete DBs or local outputs.

## Reference

- Used OWASP Logging Cheat Sheet as the external safety reference for avoiding sensitive data in exported/logged artifacts:
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
  - Added `TrustedWeeklySafeReport` and `TrustedWeeklySafeReportResponse`.
- `src/domain/self-media/service/self-media-service.ts`
  - Added `trustedWeeklySafeReport()`.
  - Safe report is recomputed from the already trusted dashboard/review scope.
  - It does not read `.local/trusted-weekly-report/report.md` or return full report content.
- `src/domain/self-media/runtime/self-media-runtime.ts`
  - Added `getSelfMediaTrustedWeeklySafeReport()`.
- `src/app/api/self-media/reports/trusted-weekly-safe/route.ts`
  - Added `GET /api/self-media/reports/trusted-weekly-safe`.
  - Returns only `{ report, markdown }` for the safe summary.
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
  - Added "查看安全摘要" and "复制安全摘要" actions.
  - Both actions call the safe API only.
  - The preview shows safe markdown without full titles or internal content ids.
- `src/app/globals.css`
  - Added compact action/preview styles for the safe weekly summary panel.
- `tests/self-media-contract.test.ts`
  - Extended trusted weekly report test to call the API route and scan the response.

## Safety Contract Proven

- API/UI safe summary uses trusted real creator-center content-level data only.
- Manual, smoke fixture, account metrics, user-excluded content, and other untrusted rows stay out of totals.
- API response scan proves absence of:
  - `raw payload`
  - `cookie`
  - `token`
  - `headers`
  - `private`
  - `secret`
  - `comment_content`
  - `danmu_text`
  - real content titles from the fixture
  - internal content ids / `contentId`

## Outputs

- Screenshot:
  - `.local/safe-weekly-report-ui-export-036.png`

## Verification

- `npm run report:trusted-weekly:safe` - PASS
- `npm run test:self-media` - PASS, 100/100
- `npm run typecheck` - PASS
- `npm run verify:harness` - PASS
- `git diff --check` - PASS
- Browser screenshot check - PASS, Dashboard safe summary preview visible after clicking "查看安全摘要"; page text did not contain `contentId`.

## Known Issues

- Worktree already had unrelated dirty/untracked files before this task. This handoff only covers the files listed above.
- A separate local dev server was started on port `3201` for screenshot capture because `3200` was already occupied by another process.

## Next Recommendation

- Main session should decide whether to add a true browser download endpoint later. Current task intentionally implements view/copy and JSON API only, avoiding full local report reads.

需主会话判断: 是
