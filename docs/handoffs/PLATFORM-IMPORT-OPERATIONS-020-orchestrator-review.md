# PLATFORM-IMPORT-OPERATIONS-020 Orchestrator Review

## Decision

Accepted.

The local operation surface for the three already-closed personal platforms is accepted:

- Douyin
- Xiaohongshu
- Video Account

This task did not add browser collection, auto-login, raw payload upload, Bilibili, or WeChat Official Account backend work.

## Reviewed Inputs

- Worker handoff: `docs/handoffs/PLATFORM-IMPORT-OPERATIONS-020-worker-handoff.md`
- API route: `src/app/api/self-media/platform-imports/operations/route.ts`
- Runtime operation: `src/domain/self-media/runtime/self-media-runtime.ts`
- UI screenshot: `.local/platform-import-operations-020.png`

## Accepted Behavior

The new operation path supports:

- single-platform preview;
- single-platform save;
- three-platform save smoke;
- fixed platform whitelist only;
- local raw capture directories only;
- structured summaries only.

The API rejects obvious sensitive/raw input keys such as cookie, token, password, headers, raw payload, and captures. It returns counts, source, warnings, run id, and pass/fail summaries, not raw payloads.

The `/import` page now has a compact operation strip near the platform import status panel.

## Naming Decision

Keep the route name for now:

```text
/api/self-media/platform-imports/operations
```

It is explicit enough for the current local operations layer and does not imply browser collection.

## Screenshot Check

The orchestrator viewed `.local/platform-import-operations-020.png`.

The operation strip is visible and follows the intended boundary. The screenshot itself has a large empty lower area, likely from the capture viewport/scroll state. This is not blocking for the functional acceptance, but later UI polish can retake and tighten screenshots.

## Orchestrator Verification

The orchestrator reran:

- `npm run test:self-media`: PASS, 42 tests
- `npm run typecheck`: PASS
- `git diff --check`: PASS
- `npm run verify:harness`: PASS

## Follow-Up

Future polish can:

- refresh the status panel after a successful operation;
- extract shared logic if the runtime save smoke needs the exact same double-save/idempotency report as `scripts/platform-personal-save-smoke.mjs`;
- improve screenshot capture framing for the import page.

## Current Stage

Accepted as the first local UI/API operations entrypoint for already-captured platform data.
