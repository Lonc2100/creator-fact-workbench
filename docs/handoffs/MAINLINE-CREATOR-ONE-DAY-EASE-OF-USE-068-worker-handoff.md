# MAINLINE-CREATOR-ONE-DAY-EASE-OF-USE-068 worker handoff

## Run metadata

- Started: 2026-06-06 21:58:00 +08:00
- Finished: 2026-06-06 22:31:54 +08:00
- Elapsed: 34m
- Workload class: L
- Extra-depth pass: not required; elapsed was above 15 minutes.

## Scope

Audited and repaired the creator one-day flow from `http://localhost:3200/dashboard`:

1. dashboard first viewport orientation and entry points.
2. content idea -> discussion draft -> four platform versions.
3. content schedule save and calendar visibility.
4. calendar click, detail, edit, and multi-platform split behavior.
5. publish handoff package generation and manual status recording.
6. post-publish import/recovery guidance and dashboard data return.

Reference behavior was checked against current public scheduling patterns in Metricool, Buffer, Hootsuite, Postiz, and Mixpost:

- Metricool: calendar-first scheduling and manual-publication notification model.
- Buffer: calendar/composer scheduling and multi-channel post flow.
- Hootsuite: planner/composer scheduling and card-level edit workflows.
- Postiz/Mixpost: visual calendar plus persisted scheduled posts/API schedule state.

Sources used:

- https://help.metricool.com/how-to-schedule-content-from-the-calendar-q8ymv
- https://support.buffer.com/hc/en-us/articles/360035587394-Scheduling-posts/
- https://support.buffer.com/article/651-how-to-use-the-new-calendar-feature-on-buffer
- https://help.hootsuite.com/hc/en-us
- https://postiz.com/blog/schedule-a-post
- https://docs.mixpost.app/api/posts/schedule

## Changes made

### Content scheduling input persistence

File: `src/domain/self-media/ui/screens/ContentPage.tsx`

- Hardened creator draft payload construction so the `datetime-local` schedule value is read from the live input ref before saving.
- This protects the real creator path where the selected slot/date is visually present in the input but React state can lag during browser automation or fast operator entry.

### Content deep link and publish handoff focus

File: `src/domain/self-media/ui/screens/ContentPage.tsx`

- Added hydration-time URL handling for `contentId` and `versionId`.
- Prioritized publish handoff packages for the selected content before showing older packages.
- Added `data-content-id` and `data-platform-version-id` attributes to publish package cards for stable browser smoke targeting.

### Calendar exact local hour rendering

File: `src/domain/self-media/ui/patterns/PublishCalendar.tsx`

- Replaced nearest-bucket calendar hour placement with exact local scheduled hour placement.
- Kept the default operating empty slots `[9, 13, 17, 21]`.
- Added scheduled item hours dynamically so a `10:00` post renders in a clickable `10:00` row instead of being misleadingly placed in the `09:00` row.

### Harness coverage

File: `tests/ui-harness.test.mjs`

- Added contract checks for:
  - live schedule input ref usage.
  - exact dynamic calendar hour rows.
  - removal of nearest-slot hour bucketing.
  - selected-content publish handoff prioritization.
  - content/version URL hydration.
  - stable publish package selectors.

## Real browser evidence

Evidence screenshots were saved under `.local/creator-one-day-ease-068/` and intentionally not staged.

Important screenshots:

- `01-dashboard-first-viewport.png`: dashboard first viewport shows clear next actions: start new video, open calendar, recover publish data.
- `02-content-new-video-first-viewport.png`: new content creation controls are visible in first viewport.
- `03-content-discussion-ready.png`: rough idea generated a discussion draft.
- `04-content-saved-four-platform.png`: four platform versions saved.
- `06-content-real-mouse-scheduled-save.png`: real mouse/keyboard schedule save path.
- `08-calendar-exact-10-slot-after-fix.png`: `2026-06-08 10:00` card rendered in the exact `10:00` row.
- `09-calendar-edit-split-times.png`: detail/edit opened without corrupting state.
- `10-calendar-one-platform-11-split.png`: one platform moved to `11:00`, other three remained grouped at `10:00`.
- `15-content-handoff-prioritized-after-url-fix.png` and `16-fresh-tab-handoff-priority.png`: content deep link focused the correct publish handoff packages first.
- `17-content-record-published.png`: manual published status recorded.
- `18-import-post-publish-refresh.png`: post-publish recovery/import guidance surfaced the published item.
- `19-dashboard-final-after-flow.png`: dashboard returned to trusted overview with post-publish recovery count and recent manual publish record.

Browser-created test content:

- Primary content title: `068创作者一天流程-真实鼠标-1780755380625`
- Content ID: `content-creator-91324480f444`
- Version IDs:
  - `version-content-creator-91324480f444-douyin`
  - `version-content-creator-91324480f444-video_account`
  - `version-content-creator-91324480f444-xiaohongshu`
  - `version-content-creator-91324480f444-bilibili`
- Initial schedule: local `2026-06-08T10:00`, persisted as UTC `2026-06-08T02:00:00.000Z`.
- Edit/split check: Douyin moved to local `2026-06-08T11:00`, persisted as UTC `2026-06-08T03:00:00.000Z`; the other three stayed at `10:00`.
- Publish handoff check: video account was recorded as `submitted_review` and then `published` by manual ledger actions.

## Findings and outcomes

### Fixed P1: calendar displayed exact times in misleading rows

Before the fix, a `10:00` schedule could render inside the `09:00` calendar row because week view only had coarse slots and mapped to nearest hour. This made the visual target untrustworthy for real planning.

After the fix, default empty rows still exist, but scheduled items add their exact hour rows. The browser verified the `10:00` card is in `data-calendar-hour="10"` with `data-calendar-target-at="2026-06-08T10:00"`.

### Fixed P1: content deep link did not focus current publish handoff

Opening `/content?contentId=...&versionId=...#publish-handoff` could show old package cards first, creating a real click-risk for manual publish recording.

After the fix, selected content packages are sorted to the front and a fresh browser tab verified the first four packages all belonged to `content-creator-91324480f444`.

### Hardened P1/P2: schedule input value is read from the live field at save time

The real mouse flow worked, but Playwright `.fill()` exposed a risk where the visible datetime field and React state could diverge. Saving now reads the input ref first, so the payload matches the value the operator sees.

## Verification

Passed:

- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- `git diff --check`

The validation chain exited with code 0. `test:self-media` passed 129 tests and `test:ui-harness` passed 15 tests.

## Boundaries kept

- Did not call any real publishing API.
- Did not save sensitive login material or platform raw request details.
- Did not restore WeChat Official Account / 公众号.
- Bilibili account metrics remain preview-only and were not added to durable totals.
- Did not run global "clear future schedule" in the live browser flow because it is intentionally broad/destructive. The flow confirmed calendar detail/edit/publish paths without wiping existing future schedules.
- Did not stage `.local`, `.agents`, `.codex`, `.trellis`, or unrelated dirty worktree files.

## Residual risks

- The dashboard default visible UI did not expose 公众号, but hidden serialized/script data and an invisible historical span still contain the text. This is outside the visible operator path but should be cleaned in a future platform-paused evidence cleanup if the product requires zero string presence.
- Old already-open browser tabs can retain pre-fix React state. Fresh tab navigation verified the corrected deep-link behavior.
- The browser run intentionally mutated local test data by creating 068 content, splitting one platform schedule, and recording manual publish ledger actions.
