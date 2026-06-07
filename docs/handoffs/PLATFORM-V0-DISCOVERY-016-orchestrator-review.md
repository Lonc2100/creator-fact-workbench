# PLATFORM-V0-DISCOVERY-016 Orchestrator Review

## Decision

Accepted as collector foundation only.

The Xiaohongshu, Video Account, and WeChat backend V0 discovery Workers added the local collector scripts and safety-bounded output contracts, but none of the three has confirmed real business field mappings yet.

## Handoffs Reviewed

- `docs/handoffs/XIAOHONGSHU-PERSONAL-V0-DISCOVERY-016-worker-handoff.md`
- `docs/handoffs/VIDEO-ACCOUNT-PERSONAL-V0-DISCOVERY-016-worker-handoff.md`
- `docs/handoffs/WECHAT-BACKEND-V0-DISCOVERY-016-worker-handoff.md`

## Local Reports Reviewed

- `.local/xiaohongshu-personal-v0/field-report.md`
- `.local/video-account-personal-v0/field-report.md`
- `.local/wechat-backend-v0/field-report.md`

Raw payload contents were not copied into this handoff.

## Platform Status

### Xiaohongshu

Current report:

```text
loginState = not_connected
JSON captures = 0
```

Status:

- Collector foundation exists.
- No real endpoint or field candidate is confirmed.
- Need a real logged-in run.

### Video Account

Current report:

```text
loginState = needs_login
JSON captures = 0
```

Status:

- Collector foundation exists.
- CDP was reachable during the Worker run, but the page required login.
- Earlier local login/helper captures exist under `.local/`, but the latest report correctly does not count them as business discovery.
- Need manual login and business-module clicks.

### WeChat Backend

Current report:

```text
loginState = login_prompt_with_json
JSON captures = 3
```

Status:

- Collector foundation exists.
- Captured JSON is limited to login/prompt utility endpoints such as `bizlogin` and `webreport`.
- No business fields are confirmed.
- Need manual login and clicks through backend analytics, article, comments, and follower pages.

## Safety Review

- No password, cookies, auth headers, or tokens were requested.
- No Repo / Service / Runtime / API persistence was added.
- Raw captures remain under `.local/`.
- The Workers did not report bypassing CAPTCHA, risk control, or login challenges.

## Gate For V1 Mapping

Do not start V1 mapping for any of these platforms yet.

The gate is:

- `loginState` shows logged in or accessible;
- JSON captures include real business endpoints;
- `field-report.md` confirms candidate paths for content list and at least views/likes/comments/shares or platform equivalents.

## Next Human Steps

Run real discovery one platform at a time while logged in:

```text
npm run discover:xiaohongshu -- --duration=60000
npm run discover:video-account -- --duration=60000
npm run discover:wechat-backend -- --duration=60000
```

During each run, manually complete login or verification if prompted, then click the normal data modules to trigger business JSON responses.

## Recommended Order

1. Xiaohongshu real capture.
2. Video Account real capture.
3. WeChat backend real capture.

Reason:

- Xiaohongshu is most likely to produce creator-content metrics valuable for the next V1 mapper.
- Video Account and WeChat backend may require more login or verification handling.
