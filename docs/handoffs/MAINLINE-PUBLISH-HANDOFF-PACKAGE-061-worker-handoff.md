# MAINLINE-PUBLISH-HANDOFF-PACKAGE-061 Worker Handoff

## Runtime

- Started: 2026-06-06
- Finished: 2026-06-06
- Workload class: M

## Inputs Read

- `docs/handoffs/MAINLINE-PUBLISH-TO-METRICS-CLOSED-LOOP-059-worker-handoff.md`
- `docs/handoffs/MAINLINE-CALENDAR-CONTENT-FIRST-SIMPLIFICATION-060-worker-handoff.md`
- `docs/handoffs/PLATFORM-DRAFTBOX-API-FEASIBILITY-060-auditor-handoff.md`

## What Changed

- Added first-class publish handoff packages to `publishToMetricsWorkbench`.
- Each four-platform package now carries:
  - publish copy text
  - tags copy text
  - cover note
  - schedule note
  - official backend URL
  - default manual backend mode
  - capability status
  - allowed manual ledger actions: submitted for review, published, failed
- Added platform capability boundaries:
  - Douyin: future official API candidate only; default remains manual backend.
  - Bilibili: future official API candidate only; default remains manual backend; account metrics stay preview-only.
  - Xiaohongshu: manual backend only by default.
  - Video Account: manual backend only by default.
- Added publish ledger status `submitted_review`.
  - It writes a publish record.
  - It does not mark the platform version as published.
  - The version keeps its existing scheduled state until the operator records published or failed.
- Updated `/content` publish execution panel:
  - shows publish handoff package cards;
  - provides copy publish text and copy tags buttons;
  - opens official backend links;
  - records submitted review, published, or failed.
- Updated `/calendar` content inspector:
  - shows the same handoff package data for each platform version;
  - provides copy/open official backend/record submitted review controls;
  - preserves content-first calendar grouping from 060.
- Updated dashboard/content/calendar publish-record status labels for `submitted_review`.

## Boundary Notes

- No real publish API is called.
- No cookie, token, password, header, login session, or raw request material is saved.
- Official backend links are only browser links; the user still publishes manually in each platform console.
- WeChat Official Account remains paused and outside the default publish package.
- Bilibili account metrics remain preview-only and separate from content durable totals.
- Diagnostics remain hidden by default; `/content` and `/calendar` default scopes still focus on operating rows.

## Files Changed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `src/domain/self-media/ui/screens/CalendarPage.tsx`
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
- `src/domain/self-media/ui/patterns/PublishCalendar.tsx`
- `src/domain/self-media/ui/patterns/ContentManagement.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-PUBLISH-HANDOFF-PACKAGE-061-worker-handoff.md`

## Verification

- PASS: `npm run typecheck`
- PASS: `npm run test:self-media`
  - 128 tests passed.
- PASS: `npm run test:ui-harness`
  - 15 tests passed.
- PASS: `npm run build`
- PASS: `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - healthy port: 3200
  - API ready: 3200
  - trusted data ready: 3200
  - page ready: 3200

## Live Acceptance

Fixed port: `http://127.0.0.1:3200`

- `/content`
  - PASS: returned 200.
  - PASS: publish handoff package panel is part of the content execution flow.
- `/calendar`
  - PASS: returned 200.
  - PASS: calendar inspector uses handoff package data while preserving content-first grouping.
- `/import`
  - PASS: returned 200.
  - PASS: manual import path remains the post-publish metric recovery path.
- `/dashboard`
  - PASS: returned 200.
  - PASS: publish records can display submitted-review status without promoting it to trusted metrics.

## Product Shape Now Recommended

- Official API adapter:
  - Douyin and Bilibili only as future capability candidates after official app/OAuth/permission approval.
  - Not enabled by default.
- Publish package export:
  - Current implemented shape: local package with copyable title/body/script/tags/cover/schedule.
- Open official backend:
  - Current implemented shape: official backend links per platform.
- Manual confirmation回填:
  - Current implemented shape: submitted review, published, failed.
  - Published then continues into `/import` manual metric recovery and matching.

## Follow-Up Notes

- If a future official API adapter is added, it should live behind explicit capability checks and separate permission configuration.
- The default publish experience should remain manual-first until official permissions and platform terms are confirmed current.
