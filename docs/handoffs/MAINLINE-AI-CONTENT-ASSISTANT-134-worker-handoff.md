# MAINLINE-AI-CONTENT-ASSISTANT-134

Started: 2026-06-14T00:13:00+08:00
Finished: 2026-06-14T00:24:00+08:00
Elapsed: about 11 minutes
Workload class: normal
<15min explanation or extra-depth pass>: Scope was narrow and built directly on 133. Extra-depth pass included external reference check, full scoped diff review, recovery of Next build side effects in `next-env.d.ts` / `tsconfig.json`, and rerun of the full self-media contract suite after fixing the mock AI assertion.

## Goal

Connect `/content` to a real AI-assisted topic strategy path while keeping the existing local-rule fallback. The creator should paste a video summary, generate a stronger topic strategy plus four-platform drafts, and still save into today's schedule only after explicit confirmation.

## Completed Work

- Added `CreatorAssistanceMetadata` to the creator discussion result contract.
- Upgraded creator discussion service to try an OpenAI-compatible chat-completions JSON path when both env vars are present:
  - `SELF_MEDIA_AI_ASSISTANT_API_KEY`
  - `SELF_MEDIA_AI_ASSISTANT_MODEL`
  - optional `SELF_MEDIA_AI_ASSISTANT_ENDPOINT`, defaulting to `https://api.openai.com/v1/chat/completions`
- Kept fail-closed fallback:
  - missing config -> local rules
  - model request failure -> local rules
  - invalid/non-JSON model response -> local rules
- Runtime/API path remains `/api/self-media/creator-drafts`; no key is stored, no platform publish API is called, and no real platform metrics are saved.
- `/content` now displays whether the discussion came from AI model assistance or local-rule fallback.
- Saving carries the discussion source into content notes, so AI-assisted drafts are auditable.
- Added contract coverage for:
  - no-config local fallback;
  - configured mock AI assistant path;
  - AI source persistence into saved draft notes.
- Added UI harness assertions for the AI/fallback visible state.

## Changed Files

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ContentPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-AI-CONTENT-ASSISTANT-134-worker-handoff.md`

## Verification

- `git diff --check` PASS
- `npm run typecheck` PASS
- `npm run test:self-media` PASS, 160 tests
- `npm run test:ui-harness` PASS, 20 tests
- `NEXT_DIST_DIR=.next-build-134-main npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS

## Boundaries

- No `.local/**`, `.agents/**`, `.codex/**`, package secrets, env files, WeChat routes, Bilibili account durable totals, or unrelated pages changed.
- No real platform save was performed.
- No deletion was performed by this task.
- No API key was required; model assistance is optional and config-gated.
- Existing unrelated dirty paths were left untouched:
  - `docs/generated/template-doctor-report.md`
  - `scripts/smoke-self-media.mjs`
  - `src/domain/self-media/ui/screens/LeadsPage.tsx`
  - `src/domain/self-media/ui/screens/UiLabPage.tsx`
  - `tests/agent-trajectory.test.mjs`
  - existing untracked handoff/script files listed in NightOps state.

## External Reference

I used the mature structured-output pattern from official AI tooling as the design reference: constrain the model to JSON, then validate/merge server-side instead of parsing free text in the UI. Because this task could not add provider files or dependencies, the implementation uses a narrow service-level OpenAI-compatible request plus local schema-shaped validation and fallback.

## Known Issues

- This does not add a new Provider file because the PRD allowed files did not include `src/domain/self-media/providers/`.
- The AI path is dormant until the local environment provides `SELF_MEDIA_AI_ASSISTANT_API_KEY` and `SELF_MEDIA_AI_ASSISTANT_MODEL`.
- `next build` temporarily rewrote `next-env.d.ts` and `tsconfig.json` toward `.next-build-134-main`; those build side effects were restored before handoff.

## Next Recommendation

Orchestrator can review the scoped diff and accept 134. A later task can promote the service-level AI request into a proper Provider once provider files are explicitly in scope.
