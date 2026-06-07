# XIAOHONGSHU-PERSONAL-V1-METRICS-017 Orchestrator Review

## Decision

Accepted.

The Worker mapped sanitized Xiaohongshu creator-center V0 captures into internal content and metric import payloads, with preview-only behavior by default and explicit `--save` required for persistence.

## Files Reviewed

- `docs/handoffs/XIAOHONGSHU-PERSONAL-V1-METRICS-017-worker-handoff.md`
- `src/domain/self-media/providers/xiaohongshu-personal-provider.ts`
- `scripts/xiaohongshu-personal-import.mjs`
- `src/domain/self-media/providers/index.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `tests/self-media-contract.test.ts`

## Verification Re-run By Orchestrator

- `npm run import:xiaohongshu`: PASS.
- `npm run test:self-media`: PASS, 35 tests.
- `npm run verify:harness`: PASS.
- `git diff --check`: PASS.

Local preview result:

```text
source = xiaohongshu_creator_center
contentCount = 1
metricCount = 1
saved = false
warnings = skipped 1 public topic/detail capture; merged 1 ambiguous detail with latest personal note id
```

## Accepted Behavior

- Uses sanitized `.local/xiaohongshu-personal-v0/raw/` captures.
- Maps personal note identity from `latest_note_data`.
- Maps stable note metrics from `datacenter/note/base`.
- Merges `note_detail_new` only when it can attach to a known personal note id.
- Skips topic/recommendation captures to avoid importing public notes.
- Keeps full raw payloads out of durable records; notes only carry local raw refs and query-stripped URL/cover references.

## Safety Review

- No cookie, token, auth header, or request header is intentionally read or persisted.
- Raw captures remain under `.local/`.
- Quick sensitive-string scan found no obvious token/cookie/auth strings in the V1 mapping preview or provider/script files; the only match was the handoff safety statement.

## Limits

- Current real capture maps one note because the discovery pass focused on latest note/detail pages.
- Comment content remains out of scope.
- Account-level aggregate metrics are not stored because the current import path is content/metric-snapshot oriented.
- URL and cover are stored in `ContentItem.notes` until a future schema task adds first-class fields.

## Current Stage

Xiaohongshu V1 is usable at preview-mapping level:

```text
logged-in discovery
-> sanitized local captures
-> V1 mapping preview
-> optional existing import path save
```

## Next Recommended Task

Start:

- `XIAOHONGSHU-PERSONAL-V1-SAVE-SMOKE-018`

Goal:

- Run `npm run import:xiaohongshu -- --save`.
- Verify imported Xiaohongshu content appears in dashboard/import/review data.
- Confirm metric snapshots and platform versions are created.
- Ensure no raw payload or sensitive auth data enters tracked files.

After that, continue to `VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017`.
