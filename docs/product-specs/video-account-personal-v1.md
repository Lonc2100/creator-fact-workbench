# VIDEO-ACCOUNT-PERSONAL-V1

## Problem

`VIDEO-ACCOUNT-PERSONAL-V0` confirmed real logged-in Video Account assistant / creator backend JSON captures under `.local/video-account-personal-v0/`. V1 needs a conservative mapper that turns only stable personal post-list captures into internal import preview records, then optionally saves through the existing import path.

## Scope

In scope:

- read sanitized local V0 captures from `.local/video-account-personal-v0/raw/`;
- map personal post identity from Video Account backend post-list endpoints;
- map stable per-post metrics: read/play count, likes, comments, forwards/shares, favorites/saves, and follow count;
- generate a preview file under `.local/video-account-personal-v1/`;
- support explicit save through the existing `importPayload` path.

Out of scope:

- no new raw browser collection;
- no private-message import;
- no comment-content import;
- no account-level aggregate storage beyond content-level metric snapshots;
- no dashboard/reviews/calendar UI changes;
- no new API routes;
- no raw payload, cookie, token, or request-header persistence in tracked files.

## Mapping Rules

Primary personal endpoint:

- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_list`

Merge-only personal endpoints:

- `POST /micro/interaction/cgi-bin/mmfinderassistant-bin/post/post_list`
- `POST /micro/interaction/cgi-bin/mmfinderassistant-bin/bullet-chat/feed-list`

The merge-only endpoints are used only when their `objectId` matches a post already seen in the content post list. Comment text is not imported.

Skipped by default:

- private-message endpoints such as `/private-msg/get-history-msg` and `/private-msg/get-session-info`;
- rows with missing or redacted `objectId`;
- utility, helper, report, auth, notification, manifest, component, shop, and unrelated endpoints.

## Command

Preview only:

```text
npm run import:video-account
```

Save through the existing import path:

```text
npm run import:video-account -- --save
```

Run save smoke:

```text
npm run smoke:video-account-save
```

Use another sanitized raw directory:

```text
npm run import:video-account -- --raw-dir=.local/video-account-personal-v0/raw
```

## Output

- `.local/video-account-personal-v1/mapping-preview.json`
- `.local/video-account-personal-v1/save-smoke-report.json`

The preview summarizes mapped content, metrics, warnings, and optional import result. It must not copy cookies, tokens, request headers, private messages, comment text, or full raw payloads into Git-tracked files.

## Acceptance

- `npm run import:video-account` generates a local preview from sanitized V0 captures.
- Preview mode does not save by default.
- `npm run import:video-account -- --save` saves mapped content/metrics through the existing import path.
- `npm run smoke:video-account-save` verifies saved content, metrics, platform versions, metric snapshots, dashboard aggregation, review aggregation, and local output safety.
- `npm run test:self-media` passes with provider and import-path coverage.
- `npm run typecheck` passes.
- `git diff --check` passes.
