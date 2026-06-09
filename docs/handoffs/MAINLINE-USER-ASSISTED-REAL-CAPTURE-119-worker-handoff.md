# MAINLINE-USER-ASSISTED-REAL-CAPTURE-119 Worker Handoff

## Scope
- Goal: run a real user-assisted platform capture from `http://localhost:3200/dashboard` -> `/import`, prioritize Xiaohongshu then Douyin, generate preview, and only save after explicit user confirmation.
- Code changes: none.
- Commit: no; this was live capture/data save plus handoff evidence. No empty commit was created.
- Push: no.

## Starting Baseline
- Dashboard trusted contents before preview/save: 21.
- Dashboard trusted metric snapshots before preview/save: 22.
- Calendar items before preview/save: 12.
- Freshness before preview/save:
  - latest real capture: `2026-06-04T07:58:51.091Z`.
  - real capture age: about 126 hours.
  - real capture stale count: 4.

## User Login Assistance
- Xiaohongshu: user assistance was needed to complete/login-check the platform session. After login, the local persistent profile was accessible.
- Douyin: no additional QR/captcha assistance was needed in this run. The persistent profile opened the creator center and was logged in/accessibly usable.
- Computer Use stopped when it could not confidently determine the external Chrome URL for Windows policy enforcement. The task continued through the local browser-capture routes and the already-open persistent platform sessions.

## Xiaohongshu Result
- Target path: `https://creator.xiaohongshu.com/statistics/data-analysis`.
- Result: clean preview generated.
- Preview count: 7 rows.
- Save candidates: 7 rows.
- Source context: `creator_center_data_analysis_table`.
- Confidence: `owned_creator_center_data_analysis_table`.
- All rows had stable native IDs, publish times, and same-row metrics.
- Saved after explicit user confirmation.
- Import run: `import-xiaohongshu_creator_center-1781015697290`.

### Xiaohongshu Preview Rows
| Native ID | Title | Published At | Views | Exposures | Likes | Comments | Saves | Shares |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `6a2682db0000000016027e09` | 我用AI做了一支诸葛亮重生短片 | 2026-06-08T08:52:00.000Z | 311 | 848 | 12 | 0 | 1 | 0 |
| `6a22b92d000000001503ebb5` | AI机甲大片感，终于有一点出来了 | 2026-06-05T11:55:00.000Z | 613 | 2299 | 30 | 0 | 14 | 0 |
| `6a1d7004000000003601d378` | 末日来临的那一刻，是先社死还是先心动 | 2026-06-01T11:41:00.000Z | 23529 | 27316 | 169 | 5 | 78 | 12 |
| `6a19a58f000000003601edaf` | 当我不小心在学校切到武侠号 | 2026-05-29T14:41:00.000Z | 96 | 579 | 1 | 0 | 0 | 0 |
| `6a186c03000000003601aa0a` | 拳拳到肉的压迫感｜视觉分享 | 2026-05-29T01:00:00.000Z | 88 | 1220 | 4 | 0 | 5 | 0 |
| `6a0e6e060000000036031273` | 《玻璃》｜我藏起来的喜欢，雨都知道 | 2026-05-21T02:29:00.000Z | 230 | 1071 | 14 | 0 | 5 | 1 |
| `6a097ad70000000036030bff` | 看完，想给爸妈打个电话 | 2026-05-17T08:22:00.000Z | 32 | 176 | 0 | 0 | 0 | 0 |

## Douyin Result
- Target path: creator center works/detail flow.
- The list page did not expose a clean works table row:
  - `capture_preview`: failed closed with `no_visible_content_rows`.
- The route safely clicked into the first visible work detail:
  - detail URL: `https://creator.douyin.com/creator-micro/work-management/work-detail/7648942281747189034?enter_from=content`.
- Result: clean detail preview generated after the detail page became readable.
- Preview count: 1 row.
- Save candidates: 1 row.
- Source context: `creator_center_owned_detail`.
- Confidence: `owned_creator_center_detail`.
- Saved after explicit user confirmation.
- Import run: `import-douyin_creator_center-1781016155185`.

### Douyin Preview Row
| Native ID | Title | Views | Likes | Comments | Saves | Shares |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `7648942281747189034` | 当诸葛亮被传送到未来？ 原创AI短片《星落之后》#原创AI短片 #AIGC #ai创作者浪潮 #诸葛亮 #电影感 | 1042 | 28 | 6 | 3 | 1 |

## Video Account / Bilibili Boundary
- Video Account was not auto-captured. The page remains manual-update-first.
- Bilibili account metrics remain preview-only. No durable Bilibili account totals were written.

## Preview / Save Result
- Preview generated:
  - Xiaohongshu: yes, 7 clean table rows.
  - Douyin: yes, 1 clean detail row.
- Saved:
  - Xiaohongshu: yes, 7 rows.
  - Douyin: yes, 1 row.
- User confirmation received:
  - `确认保存小红书 7 条和抖音 1 条`

## Dashboard / Freshness / Calendar After Save
- Dashboard trusted contents: `21 -> 22`.
- Dashboard trusted metric snapshots: `22 -> 30`.
- Calendar items: stayed `12`.
- Calendar pollution check: none of the saved Xiaohongshu/Douyin content IDs appeared in the default calendar grid.
- Freshness after save:
  - latest real capture remained `2026-06-04T07:58:51.091Z`.
  - stale count remained 4.
  - Explanation: current freshness gate tracks raw real-capture evidence timestamps, while this run saved trusted browser-visible rows; it did not manufacture new raw evidence just to clear freshness warnings.

## Live 3200 Acceptance
- Fixed entry used: `http://localhost:3200/dashboard`.
- Navigated to `/import`.
- Default `/import` did not auto-open external platform windows.
- External platform windows opened only after explicit platform update actions:
  - Xiaohongshu backend window opened.
  - Douyin backend window opened.
- Default visible UI had no raw/API/path/run id/cookie/token/header pollution during the checked flow.

## Validation
- `git diff --check`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 150 tests.
- `npm run test:ui-harness`: PASS, 19 tests.
- `NEXT_DIST_DIR=.next-build-119-main npm run build`: PASS.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`: PASS on port 3200.
- `npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard`: exit 0, `passed:true`, status `warn`.
- Trusted dashboard audit inside daily gate saw saved totals: 22 contents / 30 metric snapshots.

## Daily Gate Status
- Daily gate status is `warn` because raw real-capture evidence freshness remains stale even after trusted preview rows were saved:
  - `realCaptureAgeHours`: about 126.76.
  - `realCaptureStaleCount`: 4.
- This is expected under the current freshness model and should not be hidden by fake data.

## Sensitive Material Boundary
- No password, cookie, token, header, storageState, raw request, raw response, screenshot, HAR, or trace was saved.
- No real publish API was called.
- No WeChat / Official Account scope was restored.
- Business data added/updated:
  - 7 Xiaohongshu trusted content-level metric snapshots saved from content-analysis table rows.
  - 1 Douyin trusted content row/metric snapshot saved from a creator-center detail page.
- No rows were deleted.

## Remaining / Next Step
- Freshness still warns because the current freshness logic is tied to raw real-capture evidence, not trusted browser-visible-row saves.
- Follow-up should decide whether freshness should also recognize these explicit trusted browser-capture saves, without storing raw platform payloads.

## Timing
- Started: 2026-06-09 22:15 +08:00.
- Finished: 2026-06-09 22:46 +08:00.
- Elapsed: about 31 minutes.
- Workload class: M.
- Need main-session judgment: Yes, only for the freshness model follow-up.
