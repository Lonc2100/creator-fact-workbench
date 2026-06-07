# PLATFORM-V0 Real Capture 016 Orchestrator Review

## Decision

Accepted for Xiaohongshu and Video Account V0 real capture.

WeChat backend V0 is accepted as login-accessible discovery, but not ready for V1 metric mapping.

## Evidence Reviewed

- `.local/xiaohongshu-personal-v0/field-report.md`
- `.local/video-account-personal-v0/field-report.md`
- `.local/wechat-backend-v0/field-report.md`
- raw capture counts under `.local/`

Raw payload contents were not copied into this handoff.

## Xiaohongshu

Capture summary:

```text
loginState = logged_in_or_accessible
JSON captures = 102
endpoints = 23
```

Target coverage:

- account overview: candidate paths found
- note/work list: candidate paths found
- views/exposure: candidate paths found
- likes: candidate paths found
- comments: candidate paths found
- collects/saves: candidate paths found
- shares: candidate paths found
- follower changes: candidate paths found
- comment content: weak candidate paths found

Useful endpoint candidates:

- `GET /api/galaxy/user/info`
- `GET /api/galaxy/v2/creator/datacenter/account/base`
- `GET /api/galaxy/creator/home/personal_info`
- `GET /api/galaxy/creator/home/latest_note_data`
- `GET /api/galaxy/creator/data/note_detail_new`
- `GET /api/galaxy/creator/datacenter/note/base`

Decision:

- Ready for `XIAOHONGSHU-PERSONAL-V1-METRICS-017`.
- V1 should prioritize note/work identity and stable metrics: views/exposure, likes, comments, collects, shares, follower delta if a stable per-note or account-period mapping is clear.
- Comment content should remain out of scope unless a stronger endpoint is confirmed.

## Video Account

Capture summary:

```text
loginState = logged_in_or_accessible
JSON captures = 80
endpoints = 31
```

Target coverage:

- account overview: candidate paths found
- work/video list: candidate paths found
- views/reads: candidate paths found
- likes: candidate paths found
- comments: candidate paths found
- forwards/shares: candidate paths found
- favorites: candidate paths found
- follower changes: candidate paths found
- official-account referral/click fields: candidate paths found
- comment content: candidate paths found, but needs caution

Useful endpoint candidates:

- `POST /cgi-bin/mmfinderassistant-bin/auth/auth_data`
- `POST /cgi-bin/mmfinderassistant-bin/statistic/new_post_total_data`
- `POST /cgi-bin/mmfinderassistant-bin/statistic/fans_trend`
- `POST /micro/content/cgi-bin/mmfinderassistant-bin/post/post_list`
- `POST /micro/interaction/cgi-bin/mmfinderassistant-bin/post/post_list`
- `POST /micro/interaction/cgi-bin/mmfinderassistant-bin/bullet-chat/feed-list`

Decision:

- Ready for `VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017`.
- V1 should prioritize post list and stable per-post metrics: objectId, createTime, readCount, likeCount, commentCount, forwardCount, favCount, followCount.
- Private messages and personal interaction endpoints must not be mapped.

## WeChat Backend

Capture summary:

```text
loginState = logged_in_or_accessible
JSON captures = 12
endpoints = 7
```

Target coverage:

- account overview: candidate paths found
- article list: candidate paths found
- read count/user: not confirmed
- share count/user: not confirmed
- favorite count/user: not confirmed
- likes/zaikan: not confirmed
- comments: not confirmed
- followers: not confirmed
- read/source splits: not confirmed

Useful endpoint candidates:

- `POST /cgi-bin/sysnotify`
- `GET /cgi-bin/featuredlist`
- `GET /cgi-bin/switchacct`
- `GET /cgi-bin/appmsgpublish`

Decision:

- Not ready for V1 metric mapping.
- Need another targeted backend discovery run after clicking analytics/data pages, article analytics, comments, and user analysis.
- Keep official API as the primary path where permissions allow; backend collector should fill missing fields only.

## Recommended Next Sequence

Run V1 mapping in this order:

1. `XIAOHONGSHU-PERSONAL-V1-METRICS-017`
2. `VIDEO-ACCOUNT-PERSONAL-V1-METRICS-017`

Do not run both V1 mapping Workers simultaneously if they edit shared Types/Service/Runtime/tests. Start with Xiaohongshu.

For WeChat, run a second V0 targeted capture before any V1 mapping.
