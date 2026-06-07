# DOUYIN-AUTHED-BROWSER-CAPTURE-MVP-085 Worker Handoff

## Summary

Implemented the Douyin logged-in browser-assisted capture MVP for `/import`.

The new path is:

1. Open a temporary controlled browser session for Douyin Creator Center.
2. User manually completes login or platform verification.
3. User confirms the browser is on a content-level works/data page.
4. Local runtime reads visible DOM rows only.
5. User previews extracted content-level metrics.
6. User confirms the preview is their own content-level Douyin data.
7. Save writes `douyin_creator_center` content metrics into trusted dashboard scope.

## Safety Boundary

- Does not save account password.
- Does not save cookies, tokens, headers, browser storage state, or raw requests.
- Does not intercept platform network responses.
- Does not write account overview, follower profile, private messages, comment text, or account-level metrics into content metrics.
- Uses `browser.newContext()` rather than a persistent browser profile.

## Files Changed By This Task

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/providers/douyin-personal-provider.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/app/api/self-media/platform-imports/browser-capture/douyin/route.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/DOUYIN-AUTHED-BROWSER-CAPTURE-MVP-085-worker-handoff.md`

Existing unrelated dirty files were not reverted or staged.

## Verification

- `npm run typecheck`: PASS
- `npm run test:self-media`: PASS, 140 tests
- `npm run test:ui-harness`: PASS, 16 tests
- `npm run build`: PASS; build output includes `/api/self-media/platform-imports/browser-capture/douyin`
- `git diff --check`: PASS

## Live Runtime Check

Current port `3200` is healthy but is an existing `next start` production process from an older build. It did not load the new route:

- `POST http://127.0.0.1:3200/api/self-media/platform-imports/browser-capture/douyin`: 404

Per project guardrails, I did not stop or restart the existing `3200` process without explicit confirmation.

I validated the new build on a temporary isolated runtime:

- Port: `3217`
- DB: `%TEMP%/self-media-douyin-authed-browser-capture-085-live.sqlite`
- `/import`: showed `douyin-authed-browser-capture-mvp`
- Initial state: capture disabled until login confirmation; save disabled until preview confirmation
- Browser capture status API: returns safe `not_opened` result with safety flags
- Sensitive input guard: rejects `cookie` input
- `/dashboard`: reachable and shows trusted/dashboard copy

The temporary `3217` runtime was stopped after validation.

## Remaining Confirmation Needed

To complete the exact `live 3200` validation on the new build, the main session/user must allow restarting the existing `3200` `next start` process. No deletion or DB mutation is required for that restart.
