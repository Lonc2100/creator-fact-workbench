# REAL-CAPTURE-REFRESH-034 Worker Handoff

## Scope

- Read `docs/handoffs/CURRENT-PLATFORM-STATUS.md` and `docs/runbooks/self-media-daily-ops.md`.
- Designed the safe next real-capture refresh loop after manual platform login/capture.
- Did not add platforms.
- Did not touch WeChat/公众号 workflows.
- Did not open real platform login pages or trigger browser collection.
- Did not read passwords, cookies, tokens, headers, or raw payload bodies.
- Did not delete DB or write operating DB during the new check.

## Changes

- Added `scripts/real-capture-freshness-check.mjs`.
  - Builds a read-only report from platform health evidence.
  - Separates latest real capture time from latest smoke time.
  - Flags real captures older than 72 hours.
  - Writes only `.local/real-capture-freshness/report.json` and `report.md`.
  - Reports four active platforms only: douyin, xiaohongshu, video-account, bilibili.
  - Marks scope as no collection, no browser, no DB writes, no raw payload read, no sensitive field read, WeChat paused.
- Added npm script:
  - `npm run check:real-capture-freshness`
- Updated `docs/runbooks/self-media-daily-ops.md`.
  - Added "真实采集刷新闭环".
  - Documents preview before save for the four platforms.
  - Documents save only after manual review.
  - Documents follow-up health, freshness check, trusted audit, and daily gate sequence.
  - Clarifies real capture time vs smoke time vs audit time.
  - Adds the new command to the command safety table.
- Added contract coverage in `tests/self-media-contract.test.ts`.
  - Proves fresh smoke does not make a stale real capture fresh.
  - Proves the report does not leak raw fixture secret values.
  - Proves the command scope stays read-only and WeChat-paused.

## Manual Refresh Sequence Now Documented

After the operator manually logs in and completes real capture outside these commands:

```powershell
npm run check:real-capture-freshness
npm run import:douyin
npm run import:xiaohongshu
npm run import:video-account
npm run import:bilibili
npm run import:douyin -- --save
npm run import:xiaohongshu -- --save
npm run import:video-account -- --save
npm run import:bilibili -- --save
npm run health:platform-data
npm run check:real-capture-freshness
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

## Verification

- `npm run test:self-media` PASS, 93/93.
- `npm run typecheck` PASS.
- `npm run verify:harness` PASS.
- `git diff --check` PASS.
- Additional smoke of new command:
  - `npm run check:real-capture-freshness` PASS.
  - Current local result: status `pass`, stale platforms `none`, missing platforms `none`.

## Notes For Main Session

- The new freshness check is intentionally report-only. It does not collect or save data.
- The 72-hour freshness judgment is based on raw capture file modification time, not smoke report time.
- Smoke freshness remains useful for save-chain health only.
- Runbook remains explicit that raw payload, cookies, tokens, headers, comments, and similar sensitive material must not be copied into docs or chat.
