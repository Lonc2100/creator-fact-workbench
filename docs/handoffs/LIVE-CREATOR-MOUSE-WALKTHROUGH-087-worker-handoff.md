# LIVE-CREATOR-MOUSE-WALKTHROUGH-087

## Scope

Used the live app from `http://localhost:3200/dashboard` with browser mouse/scroll/type interactions to walk a creator day:

1. Dashboard: inspect stats/charts.
2. Import: login-capture status, click login check, inspect platform capture panels.
3. Content: type a new creator idea, generate discussion, save four platform versions.
4. Calendar: verify scheduled item, click calendar card, inspect publish handoff, click empty slot create entry.
5. Import/Dashboard recovery reality: confirmed no automatic platform API or silent post-publish callback happens without user action.

No real platform API was called. No account/password/cookie/token/header/raw request/response was saved.

## Evidence

Evidence is local only and not intended for commit:

- `.local/live-creator-mouse-walkthrough-087/01-dashboard-first-screen.png`
- `.local/live-creator-mouse-walkthrough-087/02-import-first-screen.png`
- `.local/live-creator-mouse-walkthrough-087/03-import-after-login-check-click.png`
- `.local/live-creator-mouse-walkthrough-087/04-content-first-screen.png`
- `.local/live-creator-mouse-walkthrough-087/05-content-after-discussion-draft.png`
- `.local/live-creator-mouse-walkthrough-087/06-content-after-save-platform-versions.png`
- `.local/live-creator-mouse-walkthrough-087/07-calendar-first-screen.png`
- `.local/live-creator-mouse-walkthrough-087/08-calendar-card-detail-click.png`
- `.local/live-creator-mouse-walkthrough-087/09-calendar-empty-slot-click.png`
- DOM evidence JSON files in the same directory.

## Fixed In This Pass

1. Import first viewport now exposes the login-capture check button without requiring scroll.
2. Import first viewport now says the immediately executable route: Douyin/Xiaohongshu login capture, Video Account/Bilibili status/fallback.
3. Content creator draft save now refreshes first, then selects the newly persisted content/version, preventing the old selected item from stealing focus.
4. Calendar cards now have `data-testid="calendar-card"`.
5. Calendar empty slots now have `data-testid="calendar-empty-slot"`.

## Blocking / Friction Top 10

P1. Import first screen previously required scrolling before the main “检查登录抓取状态” action was clickable.
Status: fixed.

P1. Saving a new content draft previously showed success but left the old content selected, so publish handoff stayed empty.
Status: fixed.

P1. The creator draft discussion result only changed text inside the panel; the top operation message stayed stale.
Status: 088 candidate.

P1. Content first screen shows too many counts at once: default visible, dashboard, scheduled, acceptance, publish records. It is accurate but visually noisy.
Status: 088 candidate.

P1. The publish handoff appears only after the right selected content is active; if selection is wrong, the empty-state copy blames the user.
Status: partially fixed by selection repair; empty-state wording should improve in 088.

P1. `datetime-local` entry is fragile during mouse/keyboard automation; one clean submit saved without the intended schedule when the field value was empty.
Status: 088 candidate; add inline validation and visible scheduledAt confirmation before save.

P2. Calendar card was clickable, but lacked a stable selector and was hard to target precisely in human/automation evidence.
Status: fixed with `calendar-card`.

P2. Calendar empty `+` buttons are clear visually, but clicking them opens a side prompt and sends the user back to content rather than allowing title input in-place.
Status: 088 candidate.

P2. Import “检查登录抓取状态” updates a sentence but does not actively scroll or highlight the next platform panel.
Status: 088 candidate.

P2. Browser screenshot capture became flaky after HMR/reload, although live health passed and earlier key screenshots were captured.
Status: tooling note; no product fix.

## Data Mutation Note

The walkthrough created live local content entries as part of the creator-day simulation. Titles containing `087` / `验收` were automatically isolated as acceptance/test content by existing rules. A normal creator title was used afterward to verify the content-selection fix.

## Validation

Passed:

- `npm run test:ui-harness`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
- `git diff --check`

Also passed earlier during the patch loop:

- `npm run typecheck`

Not run:

- Full build was not required for 087 and was not run after the final small UI patches.
- `.local` screenshot/DOM evidence was not staged.

## 088 Recommended Mainline

1. Add a “saved content selected” confirmation strip with platform count, scheduled time, and next action.
2. Add scheduled time validation before saving creator drafts.
3. Make calendar empty-slot creation allow title/topic entry in the side panel.
4. Move publish handoff empty-state copy from “no actions” to “select or create a scheduled content first”.
5. After login check on Import, auto-scroll/highlight the first actionable platform panel.
