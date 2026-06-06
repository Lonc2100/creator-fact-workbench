# CALENDAR-REAL-PLANNER-BEHAVIOR-AUDIT-065 Auditor Handoff

## Scope

- Task: audit whether the calendar behaves like a real scheduling planner.
- Fixed start: `http://localhost:3200/dashboard`.
- Route walked with real browser interaction: `/dashboard -> /calendar -> /content#new-video -> /calendar?versionId=...`.
- Boundary: audit only. No business code changed. No real publish API called. No deletes.
- Browser method: in-app browser with real clicks and drag gestures, plus targeted DOM/API reads only after interaction.

## Mature Reference Baseline

- Metricool/Later-style expectation: a visible date/time cell should be a trustworthy scheduling target; clicking a card should open details without changing data; multi-platform content can be grouped only if the user can still see and edit every platform schedule accurately.
- Fresh reference check:
  - Metricool Help says calendar scheduling can happen by clicking a time slot in the calendar: https://help.metricool.com/how-to-schedule-content-from-the-calendar-q8ymv
  - Postiz positions itself around planning/generating/scheduling posts in a visual calendar: https://postiz.com/
  - Mixpost documents itself as a self-hosted social media manager with scheduling/calendar workflows: https://docs.mixpost.app/
- Existing project references used: Postiz/Mixpost-style scheduler references already recorded in `docs/context/external-knowledge.md` and `docs/references/vendor/`.
- No external code copied.

## Overall Conclusion

The calendar is close visually, but it is not yet safe as a real planner. The biggest blocker is date/time trust: drag scheduling can save to a different day than the visible target, and the detail editor shows local display time while the input field shows UTC-style time. Empty cells also do not expose a direct add action in the current browser run, despite the page copy promising blank-cell creation.

## Priority Findings

### P0 Blockers

1. Drag scheduling can save to the wrong calendar date.
   - Evidence: from `/calendar`, I dragged pending item `version-content-creator-1caebb927d45-video_account` into the visible blank `2026-06-03 / 21:00` cell. The UI reported `排期已保存，状态已按合法链路推进。`
   - Actual result from the reopened detail/API: the platform row displayed `发布时间 06/04 21:00`, and API state had `scheduledAt: 2026-06-04T13:00:00.000Z`.
   - User impact: a creator can drop a post on one day and unknowingly schedule it for another day. This is the exact "date should be real" failure.
   - Likely code area: `src/domain/self-media/ui/patterns/PublishCalendar.tsx:117-123` builds target ISO time with local `Date` and `toISOString`; `:397-403` passes dnd-kit drop data into `scheduledForDate`.
   - Recommended fix: treat calendar cell date/hour as local planner intent, convert once at persistence boundary, and add an E2E test that drags to a known visible cell and asserts the saved visible date matches the target.

2. Detail editor display time and editable input time disagree by eight hours.
   - Evidence: clicking card `content-creator-1bcd782cad02` opened a 4-platform detail. The row displayed `发布时间 06/06 17:00`, while the editable datetime input contained `2026-06-06T09:00`.
   - Same issue after drag: `06/02 21:00` displayed while input contained `2026-06-02T13:00`.
   - User impact: clicking save on an apparently unchanged schedule can rewrite the schedule around UTC/local conversion, making editing unsafe.
   - Likely code area: `PublishCalendar.tsx:72-76` formats time with locale, but `:82-90` feeds `datetime-local` with `toISOString().slice(0, 16)`.
   - Recommended fix: make `datetime-local` values local, not UTC slices; keep one explicit timezone policy across card display, input value, drag target, and API patch.

### P1 Obvious Friction

1. Blank calendar cells are not clickable add targets in the current UI.
   - Evidence: after the calendar loaded, `[data-calendar-empty]` count was `0` even though many cells were blank. A real mouse click on a blank Sunday 21:00 cell did not open create UI, did not focus a scheduling form, and did not change card count.
   - The page copy says: `点击空白日期/时间格新增排期，或把右侧真实待排内容拖入日历。`
   - Source mismatch: `PublishCalendar.tsx:336-352` has empty-slot button code gated by `showEmptySlots`, and `CalendarPage.tsx:537-548` passes `showEmptySlots={scope === "operating"}`, but the running UI showed no empty-slot controls.
   - User impact: the advertised direct planner action does not exist; users must discover the pending queue or top-level content flow.
   - Recommended fix: always expose a visible/add affordance for empty time cells in default operating scope, or change copy and design if blank cells are intentionally drop-only.

2. Multi-platform merged cards hide platform-specific dates when platforms are scheduled on different days.
   - Evidence: after two platform versions of `content-creator-1caebb927d45` were scheduled, the calendar showed one merged card on `2026-06-02 / 21:00` with `2个平台 · 等待发布确认`. Detail rows showed Douyin at `06/02 21:00` and Video Account at `06/04 21:00`.
   - User impact: a single merged card suggests both platforms share one slot, while one platform is actually scheduled two days later.
   - Likely code area: `PublishCalendar.tsx:139-154` groups by `contentId` and chooses the earliest `scheduledAt` as the group's anchor item.
   - Recommended fix: if grouped platform versions span multiple dates/times, either render split cards per date bucket, show an explicit multi-date marker, or let the merged card occupy/preview every relevant date.

3. Content-page deep links return to the calendar card but do not open the target detail.
   - Evidence: from `/content#new-video`, clicking `/calendar?versionId=version-content-creator-1caebb927d45-douyin` navigated to the calendar and the relevant merged card existed, but `calendar-content-schedule-inspector` was not open.
   - User impact: "打开日历" from a content item is less actionable than a planner-style "open and edit this schedule."
   - Recommended fix: hydrate `versionId` query into the selected inspector state after calendar data loads.

4. Dashboard calendar counts conflict before entering the planner.
   - Evidence: `/dashboard` showed `6 待发布排期` in the summary strip and `16 待人工发布` in the table row for `待发布排期`.
   - User impact: operators start the calendar with unclear workload numbers.
   - Recommended fix: align summary count and table count to the same source/definition or label the difference.

### P2 Later Optimizations / Coverage Gaps

1. Historical-date regression was not fully provable with current data.
   - API read after the browser run: `calendarItems` date range was only `2026-06-01` to `2026-06-07`; `publishRecords` date range was `2026-06-01` to `2026-06-06`; no out-of-week historical sample existed.
   - Visible past days in the current week stayed on their real dates (`06/03`, `06/04`, `06/05`) rather than moving to `06/06`, so no current-week past-date jump was observed.
   - Remaining risk: this does not prove an older cross-week record will not be normalized into the current week.
   - Recommended fix: add a seeded older schedule/publish-record fixture and assert it either anchors the calendar to its real week when deep-linked or stays out of the current-week default view.

2. Right-side surfaces can obscure planner targets at 1280px.
   - Evidence: the content detail drawer covers the right date columns while open; the pending queue area also begins around the Sunday column in the measured layout.
   - User impact: rightmost dates are harder to inspect and drop onto at common desktop width.
   - Recommended fix: constrain the grid/queue layout so columns remain fully visible, or make the board horizontally scrollable with clear sticky headers.

## Positive Findings

- Starting from `http://localhost:3200/dashboard` works.
- Calendar page loads on port `3200` and shows real scheduled cards plus a real pending queue.
- Clicking a calendar card is stable: it opened the detail inspector, did not navigate away, and did not change card count.
- The selected card detail lists per-platform rows with schedule inputs and manual publish/failure controls.
- Content page references calendar in multiple places:
  - `content#new-video` includes a future publish time input and `去日历排期`.
  - Header/action area includes `引用到日历`.
  - Existing content/package rows include `打开日历` links with `versionId`.
- Multi-platform same-content grouping exists and is editable in the detail panel, but date anchoring needs fixing when platform schedules differ.

## Audit Side Effect

The drag tests changed local data for two platform versions:

- `version-content-creator-1caebb927d45-douyin` is now `scheduled` at `2026-06-02T13:00:00.000Z`.
- `version-content-creator-1caebb927d45-video_account` is now `scheduled` at `2026-06-04T13:00:00.000Z`.

I did not force-restore them because the public PATCH path does not safely clear `scheduledAt` (`input.scheduledAt ?? version.scheduledAt` keeps the old value), and `scheduled -> needs_review` is an illegal direct state transition in `platformVersionTransitions`. Restoring via DB edit would exceed this audit's no-code/no-invasive-change boundary.

## Verification Performed

- PASS: fixed start `http://localhost:3200/dashboard` returned HTTP 200 and loaded in browser.
- PASS: clicked dashboard `打开日历` into `/calendar`.
- PASS: waited for `publish-calendar` to load, then inspected visible cards and blank cells.
- FAIL: blank cell click did not create or open scheduling UI.
- FAIL: real drag scheduling saved, but visible target date did not match persisted/displayed date.
- PASS with caveat: multi-platform content merged into one card and opened editable per-platform detail.
- FAIL: merged card date anchor hides later platform-specific dates.
- PASS: card click opened detail and did not break state.
- PASS with caveat: `/content#new-video` links to calendar and rows deep-link by `versionId`.
- FAIL: `versionId` deep link did not auto-open the target detail inspector.
- INCONCLUSIVE: no out-of-week historical schedule sample existed to prove cross-week historical behavior.

## Suggested Next Mainline Order

1. Fix local datetime conversion for card display, datetime-local inputs, drag target creation, and API patch.
2. Add a real browser regression for dragging a pending item into a specific visible cell and asserting the exact saved visible date/time.
3. Restore visible blank-cell add affordances in default operating scope.
4. Split or explicitly mark merged cards whose platform versions span multiple dates.
5. Hydrate `versionId` query into an open detail inspector from content-page calendar links.
6. Add a cross-week historical fixture to prevent old records from being normalized into the current week.
