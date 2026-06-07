# VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017 Orchestrator Review

## Decision

Accepted.

The Worker mapped sanitized Video Account creator backend V0 captures into internal content and metric import payloads, with preview-only behavior by default and explicit `--save` required for persistence.

## Files Reviewed

- `docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017-worker-handoff.md`
- `.local/video-account-personal-v1/mapping-preview.json`
- `src/domain/self-media/providers/video-account-personal-provider.ts`
- `scripts/video-account-personal-import.mjs`
- `src/domain/self-media/providers/index.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `tests/self-media-contract.test.ts`

## Verification Re-run By Orchestrator

- `npm run import:video-account`: PASS.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

Harness includes:

- `npm run typecheck`: PASS.
- `npm run test:self-media`: PASS, 37 tests.

Local preview result:

```text
source = video_account_creator_center
contentCount = 3
metricCount = 3
saved = false
```

## Accepted Behavior

- Uses sanitized `.local/video-account-personal-v0/raw/` captures.
- Maps content posts from `post/post_list`.
- Merges interaction post rows and bullet-chat feed rows only when they match known content post ids.
- Skips private-message endpoints.
- Skips rows with redacted or missing `objectId`.
- Keeps full raw payloads out of durable records; notes only carry local raw refs and query-stripped cover references.

## Mapped Metrics

- Post `video-account-911534ec`: views `257455`, likes `450`, comments `59`, saves `1749`, shares `594`, followersDelta `180`.
- Post `video-account-8f3d9a9e`: views `1471`, likes `3`, comments `0`, saves `7`, shares `1`, followersDelta `0`.
- Post `video-account-982677fe`: views `780`, likes `4`, comments `0`, saves `9`, shares `0`, followersDelta `0`.

## Safety Review

- No cookie, token, auth header, or request header is intentionally read or persisted.
- Raw captures remain under `.local/`.
- Sensitive-string scan found only safety-policy text and local scanner pattern definitions, not actual credential material.
- Private messages and private session data are intentionally not mapped.

## Limits

- This is mapping-preview accepted only; no save smoke has been run yet.
- Comment content and bullet-chat text remain out of scope.
- Account-level aggregate charts and official-account referral/click metrics remain future work.
- URL/cover references still live in `ContentItem.notes`.

## Next Recommended Task

Start:

- `VIDEO-ACCOUNT-PERSONAL-V1-SAVE-SMOKE-018`

Goal:

- Run `npm run import:video-account -- --save`.
- Verify saved content, platform versions, metric snapshots, dashboard aggregation, and review aggregation.
- Confirm no raw payload or sensitive auth data enters tracked files.
