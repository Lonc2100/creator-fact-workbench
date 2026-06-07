# CONTENT-TRUST-CURATION-031 Worker Handoff

## Scope

- Added non-destructive trusted-scope curation so public creator-center content can be excluded from operating views without deleting DB rows.
- No content, metric, metric snapshot, import run, or DB row was deleted.
- No raw payload, cookie, token, header, comment body, or danmu text was exposed.

## Changes

- Added content-level trusted-scope metadata:
  - `ContentItem.userExcludedFromTrustedScope`
  - `ContentItem.trustedScopeOverride`
  - `ContentItem.trustedScopeUpdatedAt`
  - `ContentItem.trustedScopeUpdatedBy`
- Default trusted scope now respects user exclusion before provenance/default filtering:
  - `/dashboard`
  - `/reviews`
  - post-import suggestions
  - saved reviews
- Added service/runtime/API path:
  - `SelfMediaService.updateContentTrustedScope`
  - `updateSelfMediaContentTrustedScope`
  - `PATCH /api/self-media/contents/trust-scope`
- Added `trustedScopeCuration` to dashboard snapshot for safe UI operation:
  - candidate trusted content count
  - active trusted content count
  - user-excluded content count
  - user-excluded metric snapshot count
  - per-content safe summary rows
- Added Content page UI:
  - Panel: `运营看板可信内容`
  - Actions: `排除出运营看板` / `恢复`
  - Shows only safe content metadata and aggregate counts.
- Updated trusted dashboard audit:
  - User-excluded content/snapshot counts are computed from DB read-only scan.
  - Dashboard `realDataScope` and `trustedScopeCuration` user-excluded counts are compared.

## Behavior

- User-excluded real creator-center content remains stored in `contents`, `metrics`, and `metricSnapshots`.
- Excluded content does not enter default dashboard contents/metrics/snapshots.
- Excluded content does not enter weekly/monthly review totals.
- Excluded content does not appear in post-import suggestion evidence.
- Restoring clears the exclusion override and the content re-enters normal trusted-scope evaluation.
- Bilibili old public-but-not-operational content can now be hidden from operating views without deletion.

## Tests Added

- `user trusted-scope curation excludes and restores real creator-center content without deleting rows`
  - verifies exclusion from dashboard/reviews/suggestions
  - verifies DB rows remain present
  - verifies restore returns the content to trusted scope
- Existing trusted dashboard audit contract now covers user-excluded counts.

## Verification

```bash
npm run test:self-media
npm run typecheck
npm run verify:harness
git diff --check
```

All passed.
