# POST-IMPORT-ACTION-SUGGESTIONS-028 Orchestrator Review

## Decision

Accepted as a read-only dashboard guidance panel, with a data-scope caveat.

The panel is useful because it turns import results into operator-facing next actions. It should remain deterministic and non-persistent until the action-item workflow is explicitly reopened.

## Accepted Behavior

- Shows compact post-import suggestions on `/dashboard`.
- Keeps Bilibili account diagnostics out of content totals.
- Uses evidence references rather than raw payloads.
- Does not add platform collection, login, browser automation, or save buttons.
- Does not persist suggestions as action items.

## Caveat

The current suggestion builder uses existing content-level `MetricSnapshot` rows and platform groups.

Until `REAL-DATA-SCOPE-029` is completed, these suggestions may inherit polluted local data scope, including older demo, smoke, manual, csv, mediacrawler, n8n, or paused WeChat-derived rows when those rows are present in the local database.

Therefore:

- Accept the UI and deterministic rule structure.
- Do not treat the generated suggestions as trusted real four-platform operating advice yet.
- Rebase suggestion inputs onto the trusted real creator-center scope once that scope exists.

## Follow-up Required

`REAL-DATA-SCOPE-029` should update post-import suggestions so default suggestions only use trusted real creator-center sources:

- `douyin_creator_center`
- `xiaohongshu_creator_center`
- `video_account_creator_center`
- `bilibili_creator_center`

It should also ensure Bilibili public-only filtering is respected before Bilibili suggestions appear as real operating guidance.
