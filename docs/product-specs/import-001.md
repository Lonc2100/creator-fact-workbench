# IMPORT-001: Real Data Import

## Goal

Allow the user to bring real platform backend data into the internal SQLite fact store without live platform APIs.

## Supported Inputs

- CSV pasted into the workbench UI.
- JSON payload pasted into the workbench UI.
- Single manual content record from the UI.
- Downloadable CSV template from `/api/self-media/import/template`.

## CSV Fields

Required:

- `title` or `标题`

Recommended:

- `id`
- `platform` / `平台`
- `status` / `状态`
- `format` / `形式`
- `topic` / `选题`
- `publishedAt` / `发布时间`
- `views` / `播放` / `阅读` / `浏览`
- `likes` / `点赞`
- `comments` / `评论`
- `saves` / `收藏`
- `shares` / `分享` / `转发`
- `followersDelta` / `涨粉`

## Data Flow

```text
UI form -> /api/self-media/import -> Runtime -> Service -> ManualImportProvider -> SQLite Repo -> Dashboard/Review
```

## Acceptance

- Imported content appears in dashboard contents.
- Imported metrics change weekly/monthly review totals.
- Successful and failed imports both produce import runs and logs.
- No UI/API route bypasses Runtime or Providers.
