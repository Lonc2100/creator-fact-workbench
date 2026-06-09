# MAINLINE-USABLE-RELEASE-CLOSURE-PUSH-115 Worker Handoff

## Status

- Result: usable release closure completed as docs-only work.
- Commit: planned in this handoff turn with message `docs(self-media): close usable creator release`.
- Commit hash: self-referential metadata cannot be written into the same committed file before the commit exists; record the exact final hash from `git rev-parse HEAD` after commit.
- Push: planned immediately after commit via `git push origin HEAD`; record final push result after push.
- Remote / branch: `origin` / `main` (`git@github.com:Lonc2100/creator-fact-workbench.git`).
- Code changes: none in 115.

## 109-114 Release Summary

| Mainline | Commit | Outcome |
| --- | --- | --- |
| 109 | `439dc33` | `/import` first screen consolidated into creator-facing four-platform update cards; platform details, diagnostics, and advanced imports default to secondary areas. |
| 110 | `47ef5f4` | `/content` split into default creator composer mode and secondary content library mode. |
| 111 | `7bace1c` | `/calendar` now defaults to future scheduling, groups same-content multi-platform plans, and moves history / quarantine / ledger surfaces into secondary sections. |
| 112 | `cb03138` | Main navigation and `/reviews` were simplified; UI Lab and thin/internal surfaces are no longer daily primary navigation. |
| 113 | `aa95330` | Human creator workflow walkthrough found the content-page scheduling gap and kept the UI path clean. |
| 114 | `d5bdcdd` | Content composer future time now persists a durable schedule and calendar grouped card; proof content remains local: `content-creator-ef2633cdc996`. |

## Current Usable Function List

- Dashboard: data-first daily overview with clear 7-day and 30-day content windows, latest snapshot per content, and recent-first lists.
- Import: manual platform data update page; Douyin and Xiaohongshu require explicit manual backend open and preview-before-save.
- Xiaohongshu: creator backend content-analysis table is the main trusted table capture path; note detail remains fallback.
- Douyin: assisted/login detail capture path has been proven with one saved trusted row.
- Video Account: manual update is the default path; login capture remains later exploration.
- Bilibili: content-level import is available; account metrics stay preview-only.
- Content: default composer mode can draft four-platform versions and save content.
- Content scheduling: future time in composer persists to the calendar as a grouped four-platform schedule.
- Calendar: main grid shows future user-work schedules only; same content across platforms is grouped.
- Reviews: recent 7/30 performance, Top content, and a short action list are the first-screen focus.

## Not Finished / Not Promised

- No real publishing API is called.
- Video Account does not default to automatic login capture.
- Bilibili account metrics are not durable dashboard totals.
- WeChat / Official Account remains paused.
- Platform capture still needs user login / QR / verification help when platforms require it.
- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, or trace is saved.
- Daily platform ops gate did not pass in 115 because one older E2E smoke still expects the operation history table to be visible by default, while 109 intentionally folded diagnostics/operation history into secondary UI.

## Live 3200 Acceptance

Fixed entry: `http://localhost:3200/dashboard`

- `/dashboard`: PASS. Data-first view, 7/30 day controls visible, trusted status visible, no default technical-word pollution.
- `/import`: PASS. Four platform update overview visible; no platform backend window opened automatically.
- `/content`: PASS. Default composer mode visible; content library not default; creation controls visible.
- `/calendar`: PASS. Primary schedule grid visible; future grouped cards visible for existing user-work schedules, including the 114 proof content.
- `/reviews`: PASS. Focus surface, Top content, and priority actions visible.
- Default forbidden visible terms: none found across the checked pages for `run id`, `raw`, `evidence`, `API`, `path`, `storageState`, `cookie`, `token`, `header`, `测试`, `验收`, `诊断`.
- External platform windows opened by 115: no.

Current dashboard read during live check:

- Trusted contents: `21`.
- Trusted metric snapshots: `22`.
- Existing 114 proof schedule retained: `AI短片脚本：让普通场景出现反转`, `2026-06-13 10:00 +08`, grouped four-platform calendar card.

## Verification Commands

| Command | Result |
| --- | --- |
| `git diff --check` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:self-media` | PASS |
| `npm run test:ui-harness` | PASS |
| `NEXT_DIST_DIR=.next-build-115-main npm run build` | PASS |
| `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` | PASS |
| `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard` | FAIL |

Daily gate failure detail:

- `health:platform-data`: PASS with warnings only.
- `smoke:platforms-save`: PASS.
- `smoke:platform-operations-e2e`: FAIL.
- Concrete failure: `scripts/platform-operations-e2e-smoke.mjs` waited for `[data-testid="platform-operation-history-table"]` to become visible, but the table is now hidden by default after 109's `/import` first-screen consolidation.
- Report paths: `.local/daily-platform-ops/report.md`, `.local/platform-ops-with-health/report.md`.

## Data / Safety

- New local content created by 115: no.
- New local schedule created by 115: no.
- New trusted metric created by 115: no.
- Local proof content from 114 kept: yes, `content-creator-ef2633cdc996`.
- Local proof schedule from 114 kept: yes, calendar grouped four-platform card.
- Deleted local content / schedules / metrics: no.
- Sensitive file or sensitive content risk found in staged docs: none expected; only release docs and status docs are staged.
- External platform windows opened: no.

## Remaining Unrelated Dirty Files

Expected unrelated dirty/untracked files left untouched:

- `docs/generated/template-doctor-report.md`
- `scripts/smoke-self-media.mjs`
- `src/domain/self-media/ui/screens/LeadsPage.tsx`
- `src/domain/self-media/ui/screens/UiLabPage.tsx`
- `tests/agent-trajectory.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-OPEN-THROTTLE-COMMIT-106-worker-handoff.md`
- `docs/handoffs/MAINLINE-PAGE-RESPONSIBILITY-AUDIT-108-worker-handoff.md`
- `docs/handoffs/MEDIACRAWLER-ADAPTER-AUDIT-094-worker-handoff.md`
- `scripts/check-browser-automation.mjs`

## Timing

- Started: 2026-06-09 18:55:46 +08:00
- Finished: 2026-06-09 19:05 +08:00 pending final commit/push metadata
- Elapsed: about 10 minutes before commit/push metadata
- Workload class: S
- Extra-depth pass: ran an additional read-only 115 browser pass after the production build and server restart, plus inspected nested daily gate reports to avoid misreporting a flaky gate as PASS.

## Main Session Decision

- 需主会话判断: 是
- Reason: release closure can be pushed, but `gate:daily-platform-ops` now fails because an older E2E smoke expects a diagnostic table visible by default after `/import` was intentionally simplified. Next task should update that smoke to open the secondary diagnostics area before asserting the operation history table.
