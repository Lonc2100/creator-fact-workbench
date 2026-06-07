# DOUYIN-PERSONAL-V0 Real Capture Orchestrator Review

## Decision

Accepted for V0 discovery.

The user ran the collector with a logged-in Douyin creator-center browser profile. The discovery report now contains real sanitized Network JSON captures and candidate endpoint/field mappings.

## Evidence Reviewed

- `.local/douyin-personal-v0/field-report.md`
- `.local/douyin-personal-v0/endpoints.json`
- `.local/douyin-personal-v0/raw/` file count and timestamps

Raw payload contents were not copied into this handoff.

## Capture Summary

- Login state: `logged_in_or_accessible`
- JSON captures: `38`
- Endpoint candidates: confirmed
- Raw capture directory: populated under `.local/douyin-personal-v0/raw/`

## Useful Candidate Endpoints

### Account / Profile

- `GET /aweme/v1/creator/user/info/`
- `GET /web/api/media/user/info/`

Useful candidate fields include follower count, following count, dashboard open date, account profile, and work count.

### Work List

- `GET /web/api/creator/item/list`

Useful candidate fields include:

- `$.items[].id`
- `$.items[].description`
- `$.items[].create_time`
- `$.items[].cover`
- `$.items[].user_id`

### Content Metrics / Hot Video

- `POST /dp/douyin/v1/creator/item/hot_video`
- `POST /dp/douyin/v1/creator/item/hot_topic`

Useful candidate fields include:

- `$.data[].ItemId`
- `$.data[].ItemTitle`
- `$.data[].ItemUrl`
- `$.data[].ItemCoverUrl`
- `$.data[].PlayCount`
- `$.data[].LikeCount`
- `$.data[].CommentCount`
- `$.data[].ShareCount`

### Item Analysis

- `POST /janus/douyin/creator/data/item_analysis/overview`
- `POST /janus/douyin/creator/data/item_analysis/item_performance`

Useful candidate fields include:

- `$.average_comment_count_per_video.metric_value`
- `$.average_like_count_per_video.metric_value`
- `$.average_share_count_per_video.metric_value`
- `$.median_play_count.metric_value`
- `$.items[].play_count`
- `$.items[].play_count_per_client.douyin_value`
- `$.items[].average_play_duration`
- `$.items[].completion_rate_5s`

## Target Coverage

- Account overview: candidate paths found.
- Work list: candidate paths found.
- Plays/views: candidate paths found.
- Likes: candidate paths found.
- Comment count: candidate paths found.
- Shares: candidate paths found.
- Follower count/change: candidate paths found for current counts; delta still needs mapping logic.
- Comment content: only weak candidates found; not enough for V1 metric mapping.

## V1 Gate

Proceed to V1 mapping with these constraints:

- Map content records and metric snapshots from confirmed candidate endpoints only.
- Treat comment content as out of scope until a stronger endpoint is captured.
- Compute `followersDelta` only if a delta endpoint is confirmed; otherwise store current follower count as native/raw metric or leave delta empty.
- Keep raw captures local under `.local/`; do not commit them.
- Do not store auth headers, cookies, tokens, or signed URL credentials.

## Next Task

Start `DOUYIN-PERSONAL-V1-METRICS-014`.

Goal:

- Build a mapper from sanitized V0 captures into internal preview/import records and, only where stable, `MetricSnapshot` records.
- Preserve `source = douyin_creator_center`.
- Keep raw payload references local and sanitized.
