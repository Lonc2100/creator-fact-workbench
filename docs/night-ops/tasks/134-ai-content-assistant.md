# 134 AI Content Assistant

Goal: make `/content` genuinely AI-assisted instead of only local-rule generated.

Plain-language review note: after a creator pastes a video summary, the app should call a model when configured, generate strong topic strategy/title/body/tag suggestions for four platforms, and fall back to existing local rules when no model is configured.

Allowed scope:

- `src/domain/self-media/types/`
- `src/domain/self-media/service/`
- `src/app/api/self-media/creator-drafts/route.ts`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- tests touching creator draft/discussion contracts
- this task handoff

Forbidden:

- saving platform metrics;
- real platform publish APIs;
- WeChat/Official Account;
- Bilibili account durable totals;
- storing model secrets in repo;
- changing unrelated UI pages.

Validation:

- `git diff --check`
- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `NEXT_DIST_DIR=.next-build-134-main npm run build`
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
