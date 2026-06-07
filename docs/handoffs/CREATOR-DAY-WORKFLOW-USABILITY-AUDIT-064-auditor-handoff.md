# CREATOR-DAY-WORKFLOW-USABILITY-AUDIT-064 Auditor Handoff

## Scope

- Task: audit the 063 creator-day workflow from real usage, focusing on whether entries are obvious, states are clear, post-publish next steps are explicit, and metric matching is understandable.
- Fixed start: `http://localhost:3200/dashboard`.
- Route walked: `/dashboard -> /content -> /calendar -> /import -> /dashboard`.
- Boundary: no code changes, no real publish API, no cookie/token/password/header/raw payload, no commit.

## Method

- Confirmed local server health on port `3200`.
- Used a headless browser DOM pass over the required route sequence to inspect visible headings, links, buttons, inputs, and key workflow text.
- Queried local read-only API state only to explain observed UI confusion around the 063 live workflow.
- Did not modify unrelated dirty files.

## Overall Conclusion

The end-to-end workflow is usable, and there is no P0 blocker: a creator can start from the dashboard, reach content drafting and publish handoff controls, confirm schedule in calendar, recover metrics in import, and return to dashboard. The main usability risk is that the current workbench mixes live local publishing work with imported/recovered historical records, so a user can easily act on the wrong card or think completed work still needs action.

## Priority Findings

### P0 Blockers

None found. The required route sequence loads and the creator-day workflow can be completed manually.

### P1 Obvious Friction

1. Publish handoff cards include imported/recovered content as if it were still publishable.
   - Evidence: `/content` showed `063 creator day workflow 1780719836334` at the top with `未排期，请先在日历确认发布时间`, while the API shows this card is generated from imported content `dy-063-creator-day-1780719836334`, status `published`, package id `publish-handoff-version-dy-063-creator-day-1780719836334-douyin`.
   - User impact: after returning from metric recovery, a user may try to publish an already-imported metric snapshot or wonder why a completed item is still `未排期`.
   - Recommendation: exclude imported/recovered content from publish handoff packages by default, or render it as read-only recovery evidence. Keep publish actions only for local planned content/platform versions.

2. Submitted review state is not prominent enough in next-action guidance.
   - Evidence: the local Xiaohongshu package for `content-creator-1bcd782cad02` has `latestRecordStatus: submitted_review`, but execution guidance still reads like a generic due/publish action instead of "已提交审核，等待审核结果，回来确认已发布/失败".
   - User impact: after clicking `记录已提交审核`, the next step is ambiguous; the user may think they still need to publish again.
   - Recommendation: make execution cards derive next-action copy from latest publish record status, especially `submitted_review`, `published`, and `failed`.

3. Import metric recovery is noisy and duplicates current-workflow items.
   - Evidence: `/import` showed `116 条待回收`, `6 可人工确认候选`, and multiple repeated `063 creator day workflow 1780719836334` recovery rows mixed with older smoke/O2 records.
   - User impact: after publishing, the next expected action is "抓取并匹配这条内容", but the user must scan a long, mixed list.
   - Recommendation: default the post-publish refresh list to recent local publish records first; dedupe imported/generated copies; add a "今日/本次发布" filter or section above historical recovery.

4. Metric match candidates remain after a correct match, including weaker old candidates.
   - Evidence: after the 063 imported metric was already matched, the workbench still exposed a candidate for local Douyin version `version-content-creator-1bcd782cad02-douyin` pointing to older content `content-creator-9134d966c73f` with score `0.48`.
   - User impact: the user may perform a second, wrong match or believe the previous match did not work.
   - Recommendation: suppress candidates for a local platform version once it has a trusted matched snapshot, or show them under a collapsed `已匹配后备候选` area with clear warning copy.

5. Dashboard start entry works but is not the strongest creator-day entry.
   - Evidence: `/dashboard` has `打开内容台`, `打开日历`, `查看台账`, and `去手动抓取最新数据`, but no top-level "计划新视频/开始今天发布流程" CTA. `/calendar` has `计划新视频 / 新增排期 -> /content#new-video`, which is clearer than the dashboard entry.
   - User impact: from the required start route, a real creator may not immediately know the first step is to plan a new video in content/calendar.
   - Recommendation: add a dashboard daily action link to `计划新视频 / 新增排期` targeting `/content#new-video`, preferably near `今日数据动作`.

### P2 Later Optimizations

1. Calendar time display could label timezone.
   - Evidence: the 063 local schedule appears as `17:00` on `/calendar`, while the stored schedule is UTC-based and corresponds to Beijing time.
   - User impact: the time is likely correct, but a creator may wonder why it differs from stored/raw values if they compare records.
   - Recommendation: label calendar times as `北京时间` or use consistent local-time copy in detail panels.

2. Publish package controls are repetitive in `/content`.
   - Evidence: the page exposes many repeated `复制发布文案`, `复制标签`, `记录已提交审核`, `记录已发布`, `记录失败`, and repeated official backend links.
   - User impact: the right action exists, but scanning becomes tiring when many packages are present.
   - Recommendation: group packages by content, default to current selected content/due-today items, and keep historical packages collapsed.

3. Import page still shows `公众号` as a manual CSV preset while WeChat publishing is paused.
   - Evidence: `/import` preset options include `抖音 小红书 公众号 视频号 B站`.
   - User impact: this does not restore the official account workflow, but it conflicts with the "公众号暂停" boundary at first glance.
   - Recommendation: mark the option as paused/diagnostic-only or hide it from default manual import presets while the official account path is paused.

4. Match buttons are understandable but could expose candidate rationale closer to the action.
   - Evidence: `/import` uses `匹配到本地内容/平台版本`, which is clear enough, but the high-level list emphasizes counts more than "why this candidate is safe".
   - User impact: cautious users may hesitate before confirming a match.
   - Recommendation: place score/reasons and local target title next to the button in the compact row, not only deeper in the candidate detail.

## Route Notes

### `/dashboard`

- Entry points are present: `打开内容台`, `打开日历`, `查看台账`, `去手动抓取最新数据`.
- State signals are useful: pending manual publish, publish-after-refresh, candidate matching.
- `公众号` was not visible on dashboard.
- B站 account metric preview-only copy remains visible as expected.
- Main issue: the page is operational but not explicitly framed as "start today's creator workflow".

### `/content`

- Drafting and publish handoff controls are available.
- Four-platform package actions exist: copy publish copy, copy tags, open official backend, record submitted review/published/failed.
- Main issue: publishable local packages are mixed with imported/recovered copies, including an already-published imported 063 card showing `未排期`.

### `/calendar`

- The 063 live schedule is visible as a due-today item with `4个平台 · 等待发布确认`.
- The route has a clear `计划新视频 / 新增排期` entry back to `/content#new-video`.
- Main issue: publish-state details require selecting/opening the item; submitted-review state should be reflected more directly in next-action copy.

### `/import`

- Post-publish refresh and manual match controls exist.
- Candidate matching is understandable at a basic level.
- Main issue: too many historical and duplicate pending recovery rows make the current post-publish action hard to locate.

### Final `/dashboard`

- Dashboard remained healthy after completing the route loop.
- Publishing and metric recovery state summaries were still visible.

## Recommended Next Mainline Order

1. Filter or split publish handoff packages so imported/recovered content cannot appear as a normal publishable package.
2. Make next-action copy status-aware for `submitted_review`, `published`, and `failed`.
3. Dedupe and prioritize `/import` recovery rows around recent local publish records.
4. Suppress or clearly downgrade match candidates after a trusted match already exists.
5. Add a clearer dashboard first-step CTA for creator-day workflow.
6. Polish timezone labels, package grouping, paused WeChat import copy, and candidate rationale display.

## Verification

- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` passed on port `3200`.
- Required route sequence completed: `/dashboard -> /content -> /calendar -> /import -> /dashboard`.
- No business code changed.
- No commit performed.
