# Phase Closure Handoff: V1.5 Backend Mainline

## Task ID

PHASE-V1.5-BACKEND

## What Was Done

- Added platform-specific content versions with body, script, cover note, checklist, schedule, status, failure reason, and next action.
- Added publish calendar items and publish records derived from platform versions.
- Added dated metric snapshots linked to platform versions.
- Extended import confirm-save to create platform versions and metric snapshots.
- Extended preview diff to classify new, update, duplicate, conflict, and invalid rows.
- Added saved reviews, action items, lead status progression, automation runs, and evidence-backed insights.
- Added Runtime/API routes for V1.5 backend operations.

## Verification Commands

- `npm run verify:harness`
- `npm run build`
- `npm run test:smoke`
- `npm run verify:o2`

## Final Smoke Evidence

- Base URL: `http://127.0.0.1:3027`
- Imported sources: `csv`, `mediacrawler`, `n8n`
- Preview did not create import run: `true`
- Weekly review total views: `22,138 -> 25,068`
- Platform versions: douyin and wechat versions created for one content.
- Metric snapshot: saved by platform version and date.
- Saved review and action item: created and returned by dashboard.
- Automation run: recorded and returned by dashboard.

## Known Issues

- Full import diff table UI remains future frontend work.
- Calendar is backend-ready but frontend drag/drop and richer filters are not designed.
- Platform media attachments are not modeled yet.
- Real platform CSV headers still need refinement with exported files.

## Next Recommendation

Start `EDITOR-001`: platform-specific draft editor, media attachment model, and weekly/month planning UI.
