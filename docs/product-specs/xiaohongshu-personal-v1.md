# XIAOHONGSHU-PERSONAL-V1

## Problem

`XIAOHONGSHU-PERSONAL-V0` confirmed real logged-in creator-center JSON captures under `.local/xiaohongshu-personal-v0/`. V1 needs a conservative mapper that turns only stable personal-note captures into internal import preview records, then optionally saves through the existing import path.

## Scope

In scope:

- read sanitized local V0 captures from `.local/xiaohongshu-personal-v0/raw/`;
- map personal note identity from creator-center note endpoints;
- map stable note metrics: views/exposure, likes, comments, collects/saves, shares, and follower delta when attached to the same note detail;
- generate a preview file under `.local/xiaohongshu-personal-v1/`;
- support explicit save through the existing `importPayload` path.

Out of scope:

- no new raw browser collection;
- no public topic/recommendation note import;
- no comment-content import;
- no dashboard/reviews/calendar UI changes;
- no new API routes;
- no raw payload, cookie, token, or request-header persistence in tracked files.

## Mapping Rules

Primary personal endpoints:

- `GET /api/galaxy/creator/home/latest_note_data`
- `GET /api/galaxy/creator/datacenter/note/base`
- `GET /api/galaxy/creator/data/note_detail_new` only when it can be attached to a known personal note id.

Skipped by default:

- topic/recommendation captures such as `GET /api/galaxy/creator/select/topic/detail`, because they may contain public notes.
- APM, captcha, security, customer-service, and unrelated creator utility endpoints.

## Command

Preview only:

```text
npm run import:xiaohongshu
```

Save through the existing import path:

```text
npm run import:xiaohongshu -- --save
```

Use another sanitized raw directory:

```text
npm run import:xiaohongshu -- --raw-dir=.local/xiaohongshu-personal-v0/raw
```

## Output

- `.local/xiaohongshu-personal-v1/mapping-preview.json`

The preview summarizes mapped content, metrics, warnings, and optional import result. It must not copy cookies, tokens, request headers, or full raw payloads into Git-tracked files.

## Acceptance

- `npm run import:xiaohongshu` generates a local preview from sanitized V0 captures.
- Preview mode does not save by default.
- `npm run test:self-media` passes with provider and import-path coverage.
- `npm run typecheck` passes.
- `git diff --check` passes.
