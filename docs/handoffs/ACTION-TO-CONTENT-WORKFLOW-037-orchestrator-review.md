# ACTION-TO-CONTENT-WORKFLOW-037 Orchestrator Review

## Decision

Accepted.

## What Was Accepted

- Dashboard action items can now be manually converted into content and schedule drafts.
- The conversion is user-triggered through `POST /api/self-media/action-items/content`.
- The service recomputes trusted evidence server-side before creating content.
- Manual, untrusted, stale, or user-excluded evidence is blocked.
- Conversion is idempotent: repeated requests return the existing content draft, platform version, and queue item.
- Generated drafts appear in content/calendar operating views, but they do not pollute trusted review/dashboard totals.

## Main Session Verification

- Reviewed service implementation in `src/domain/self-media/service/self-media-service.ts`.
- Reviewed route implementation in `src/app/api/self-media/action-items/content/route.ts`.
- Reviewed dashboard UI integration in `src/domain/self-media/ui/screens/DashboardPage.tsx`.
- `npm run test:self-media`: PASS, 111/111
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS

## Boundaries

- No automatic publishing.
- No real platform API calls.
- No WeChat/Official Account restart.
- No raw platform payload, cookie, token, header, comment body, danmu text, or private response body exposure.
- Bilibili account metrics remain preview-only and are not converted into content totals.

## Follow-Up

- Add a browser E2E that covers: action suggestion -> action item -> content draft -> calendar entry -> trusted totals unchanged.
- Add a draft review/edit surface before any publish confirmation path.
