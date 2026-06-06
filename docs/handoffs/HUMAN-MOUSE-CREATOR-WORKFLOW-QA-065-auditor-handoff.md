# HUMAN-MOUSE-CREATOR-WORKFLOW-QA-065 Auditor Handoff

Date: 2026-06-06

Role: Auditor QA, no code implementation, no commit.

Entry: `http://localhost:3200/dashboard`

## Scope

Goal was to walk the creator workflow like a human user:

`dashboard -> content/new video -> generate four platform versions -> calendar -> publish handoff -> import/post-publish refresh`

Boundaries kept:

- Did not call real publish APIs.
- Did not open external creator-center links.
- Did not save cookies, tokens, passwords, headers, or raw platform payloads.
- Did not restore WeChat/公众号.
- Did not commit.

## Verification

Server health before QA:

```text
npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page
PASS: healthy port/API/safeWeekly/trustedData/page on 3200.
```

No typecheck/build/test suite was run because this was a browser QA audit with no code changes.

## Evidence

Screenshots are local evidence under:

```text
D:/codex work/自媒体创作/Data Collection and Background Analysis/.local/human-mouse-creator-workflow-qa-065/
```

Key screenshots:

- `01-dashboard-entry.png`
- `03-content-entry-after-icon-click.png`
- `04-content-form-filled-top.png`
- `06-content-generate-button-visible.png`
- `09-calendar-entry-click-nav.png`
- `10-calendar-merged-card-selected.png`
- `11-calendar-version-detail-deeplink.png`
- `12-import-post-publish-refresh.png`

Note: `02-content-entry.png` captured the first failed navigation attempt and still shows dashboard.

## Walkthrough Result

### Dashboard

What worked:

- Fixed entry `http://localhost:3200/dashboard` loaded and showed trusted-data status, daily data actions, publish execution count, and a manual refresh link.

Human blocker:

- First viewport has no obvious creator action such as `计划新视频` or `新增排期`.
- The user sees many operational/data rows before the creation workflow. This makes the next step unclear if the mental goal is "I want to plan a new video now".
- The full sidebar `内容` row click did not navigate on the first attempt; the compact icon at the far left did. This suggests hit target/layer ambiguity.

### Content / New Video

What worked:

- Clicking the compact content icon reached `/content`.
- The `创作者工作流` form is on the first screen.
- Filled a safe local QA idea:
  - title: `065真人走查：AI创作者一天怎么排期回收数据`
  - topic: `AI工作流 / 排期 / 发布后数据回收`
  - future publish time: `2026-06-07T10:30`
  - brief: `从总览开始，新建一条视频...回到导入页查看发布后回收提示。`

Human blocker:

- In a 720px-high browser viewport, after filling the main brief, the next-step buttons (`分析并生成讨论稿`, `生成并保存四平台版本`, `去日历排期`) are below the visible viewport.
- Browser CUA scroll and direct offscreen click did not reach the button. This may partly be the Browser wrapper, but the product issue remains: the next action is not visible immediately after writing the main content.
- Attempts to trigger generation via Browser fallback were not considered valid human-path evidence, so the new QA content was not saved/generated.

Recommended fix:

- Keep primary next actions sticky within the creator workflow panel, or place `生成并保存四平台版本` directly beside/under the first brief textarea.
- Add an obvious dashboard CTA to `/content#new-video`.

### Calendar

What worked:

- `/calendar` has a visible primary CTA: `计划新视频 / 新增排期`.
- Default calendar displays content-first merged cards:
  - `发布到指标闭环：059 live 发布闭环验收` shows `4个平台 · 等待发布确认`.
  - `063 creator day workflow` shows `4个平台 · 等待发布确认`.
- `清空未来排期` remains visible and clearly named.

Human blocker:

- Clicking the visible merged `063 creator day workflow` card did not visibly open the right-side editable platform detail.
- Direct browser deep link to `http://localhost:3200/calendar?versionId=version-content-creator-1bcd782cad02-douyin` also left the page looking like the general calendar/pending list, not an obvious platform detail editor.
- The page title says `平台版本详情`, but there is no clear selected-card detail state in the viewport. This breaks the required path: "click merged card -> edit each platform schedule/status/publish confirmation".

Recommended fix:

- Make merged cards real buttons/links with visible selected state.
- On click, right-side detail should jump to the selected content and show all platform rows for that `contentId`, including:
  - platform icon/name,
  - schedule datetime,
  - status,
  - publish confirmation actions,
  - post-publish refresh link.
- If `versionId` is present in the URL, the detail panel should select the parent content group and scroll/focus the detail.

### Publish Handoff

What worked:

- Existing publish ledger is present at the bottom of calendar.
- Ledger text is safe and local: it records manual confirmation only, and says platform metrics remain based on creator-center data.

Human blocker:

- From the selected merged card path, I could not reach publish confirmation controls in the right detail panel.
- The calendar contains a long `真实待排内容` list before the ledger, so publish handoff is discoverable only by heavy scrolling or prior knowledge.

Recommended fix:

- Add `发布交接` or `发布确认` action inside the selected content detail panel.
- Keep the ledger as history, but do not make the user scroll past many pending drafts to confirm one selected card.

### Import / Post-Publish Refresh

What worked:

- `/import#post-publish-refresh` is the clearest part of the flow.
- The area explicitly says refresh is manual, not an automatic platform callback.
- It shows:
  - pending recovery count,
  - suggested next capture time,
  - platform/action instructions,
  - recent import state,
  - matching/attribution state,
  - `预览/保存最新抓取`.
- For `063 creator day workflow`, the page says the Douyin item is already attributed and has candidate/snapshot counts.
- Bilibili account data remained a boundary/diagnostic concept; I did not see it presented as active account-metric automation.

Human blockers:

- The table is very long and repetitive. Each row repeats long manual instructions and two action links, so the user can lose the currently relevant item.
- `打开抖音创作者中心` is repeated many times; as a QA pass I intentionally did not click it because it is an external site.
- Default text still includes historical `V1.5 公众号版本` in the post-publish refresh list. Even if it is old data, this can make users think 公众号 is active again.

Recommended fix:

- Pin or filter to "recently published / needs my action first".
- Collapse repeated instructions into one row detail drawer.
- Hide or explicitly label old WeChat/公众号 historical rows as paused/archived so they do not look active.

## Main Findings

1. Dashboard does not give a creator-first "plan new video" action in the first viewport.
2. Content form accepts input, but the next action button is below the visible viewport and was not reachable through the human Browser click path.
3. Calendar content-first merged cards are visually present, but click/deep-link did not expose the expected editable per-platform detail panel.
4. Publish handoff exists as a ledger, but it is not reachable from the selected merged card workflow.
5. Import post-publish refresh is functionally clear and honest about manual capture, but too repetitive and still surfaces historical `公众号` wording.

## Suggested Priority

P0:

- Fix calendar merged-card click/deep-link selection so right-side detail opens for the content group.
- Make per-platform schedule/status/publish confirmation visible in that detail.

P1:

- Add dashboard `计划新视频 / 新增排期` CTA.
- Make content workflow actions sticky/visible after the main brief field.
- Add selected-content publish handoff action that jumps to the relevant confirmation controls.

P2:

- Reduce import refresh table repetition.
- Suppress or archive historical `公众号` labels in default import recovery lists.

## Worktree Note

The worktree was already heavily dirty before this QA. This handoff intentionally does not stage or commit anything.
