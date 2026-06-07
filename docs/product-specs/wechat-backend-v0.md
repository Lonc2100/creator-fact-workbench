# WECHAT-BACKEND-V0 微信公众号后台发现

## Problem

`WECHAT-001` uses official WeChat Official Account APIs first, but the current real account flow is blocked by DataCube permission and some product metrics are not reliably covered by the implemented official sync shape. We need a local, user-controlled discovery pass that observes normal logged-in WeChat Official Account backend pages and records candidate JSON endpoints and field paths before any durable import mapping is built.

## User Workflow

1. The user opens or lets the collector open `https://mp.weixin.qq.com/`.
2. The user logs in manually if WeChat asks for QR login, CAPTCHA, or risk verification.
3. The collector listens to `mp.weixin.qq.com` Network JSON responses for a short discovery window.
4. The user may refresh the page or click normal backend modules such as data overview, article analytics, comments, and followers during the window.
5. The collector writes sanitized local captures and reports under `.local/wechat-backend-v0/`.

## Scope

In scope for V0 discovery:

- account overview endpoint candidates;
- article/list endpoint candidates;
- reading counts and users;
- sharing counts and users;
- favorite counts and users;
- likes and watching/zaikan if visible;
- comment count and comment content only when visible in normal backend responses;
- new/canceled/net followers;
- read/source/channel splits if visible.

Out of scope:

- no Repo / Service / Runtime / API persistence;
- no durable `MetricSnapshot` writes;
- no dashboard/reviews/calendar UI changes;
- no password collection, cookie export, token export, or auth-header storage;
- no CAPTCHA bypass, risk-control bypass, login-challenge bypass, or public-content batch crawling.

## Official API Baseline

Use official APIs where permissions and fields are sufficient. The current `WECHAT-001` shape already targets:

- article summary rows from `datacube/getarticlesummary`, including article identity/title/date, reading users/counts, sharing users/counts, and favorite users/counts;
- user summary rows from `datacube/getusersummary`, including new and canceled users by date/source when permission is available.

Fields that may need backend discovery before mapping:

- likes and watching/zaikan;
- comment count and comment content;
- richer backend article list metadata;
- account overview widgets;
- net follower deltas if the official row shape or permission is insufficient;
- source/channel splits not present in the implemented official sync or not exposed by the current account permission.

## Collector

Command:

```text
npm run discover:wechat-backend
```

Optional flags:

- `--cdp=http://127.0.0.1:9222` to connect to a running remote-debugging browser;
- `--target=https://mp.weixin.qq.com/` to override the starting page;
- `--duration=60000` to set the discovery window in milliseconds;
- `--no-launch` to avoid launching Chrome and only test CDP connectivity;
- `--max-captures=100` and `--max-array-items=100` to limit local capture volume.

The collector follows the same Playwright/CDP logged-in browser pattern already accepted for Douyin personal V0:

- prefer connecting to an already logged-in browser on the CDP endpoint;
- when CDP is not available and `--no-launch` is not set, open local Chrome/Edge with a `.local/wechat-backend-v0/chrome-profile` profile;
- never ask for account password or write request headers.

## Output

All generated discovery data is local-only:

- `.local/wechat-backend-v0/raw/` contains sanitized JSON capture files;
- `.local/wechat-backend-v0/endpoints.json` contains grouped endpoint candidates;
- `.local/wechat-backend-v0/field-report.md` contains human-readable field path candidates and coverage status.

## Redaction

The collector does not save request headers. JSON values under sensitive-looking keys are redacted, including cookie, token, auth, session, secret, password, phone, email, openid, unionid, fakeid, biz, uin, pass_ticket, avatar, nickname, signature, and similar fields. Long token-like strings and sensitive query values are also redacted.

## Acceptance

- Collector starts without requiring credentials in chat or command arguments.
- If CDP/login is missing, the generated report says so and does not claim capture success.
- If the backend is accessible, `mp.weixin.qq.com` JSON responses are saved to `.local/wechat-backend-v0/raw/`.
- Endpoint and field path candidate reports are generated.
- `npm run typecheck` passes.
- `git diff --check` passes.
