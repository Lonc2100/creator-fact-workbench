# VIDEO-ACCOUNT-PERSONAL-V0

## Problem

The WeChat Video Account assistant / creator backend can expose current account and content metrics through logged-in browser JSON responses. Before building durable mapping or persistence, we need a safe discovery pass that records endpoint and field-path candidates from the user's own logged-in pages.

## User Workflow

1. The user opens or lets the collector open `https://channels.weixin.qq.com/platform`.
2. The user logs in manually if WeChat asks for login, QR scan, CAPTCHA, or risk verification.
3. The collector listens to Video Account related Network JSON responses.
4. The user may refresh the page or click normal backend modules such as overview, works, data, fans, referrals, or comments.
5. The collector writes sanitized local captures and reports under `.local/video-account-personal-v0/`.

## Scope

In scope for V0 discovery:

- account overview;
- works / video data list;
- play / view metrics;
- likes;
- comment counts;
- shares / forwards;
- saves / favorites;
- follower changes if visible;
- official-account read conversion / referral clicks if normally visible;
- comment content only when it appears in normal logged-in backend JSON responses.

Out of scope:

- no Repo / Service / Runtime / API persistence;
- no durable `MetricSnapshot` writes;
- no dashboard/reviews/calendar UI changes;
- no login bypass, CAPTCHA bypass, risk-control bypass, credential collection, or password prompts;
- no public-content batch crawling.

## Collector

Command:

```text
npm run discover:video-account
```

Optional flags:

- `--target=https://channels.weixin.qq.com/platform` to override the start page;
- `--cdp=http://127.0.0.1:9222` to connect to a running remote-debugging browser;
- `--duration=60000` to set the discovery window in milliseconds;
- `--no-launch` to avoid launching Chrome and only test CDP connectivity;
- `--max-captures=80` and `--max-array-items=80` to limit local capture volume.

The collector follows the Playwright/CDP logged-in browser pattern already accepted for Douyin personal V0 and reused for Xiaohongshu personal V0:

- prefer connecting to an already logged-in browser on the CDP endpoint;
- when CDP is not available and `--no-launch` is not set, open local Chrome/Edge with a `.local/video-account-personal-v0/chrome-profile` profile;
- never ask for account password or write request headers.

## Output

All generated discovery data is local-only:

- `.local/video-account-personal-v0/raw/` contains sanitized JSON capture files;
- `.local/video-account-personal-v0/endpoints.json` contains grouped endpoint candidates;
- `.local/video-account-personal-v0/field-report.md` contains human-readable field path candidates and coverage status.

## Redaction

The collector does not save request headers. JSON values under sensitive-looking keys are redacted, including cookie, token, auth, session, secret, password, phone, email, openid, unionid, uin, wxid, finder username, avatar, nickname, signature, login QR data, and similar fields. Long token-like strings and sensitive query values are also redacted.

## External References

- Playwright `browserType.connectOverCDP`: https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp
- Playwright network response events: https://playwright.dev/docs/network
- Existing repository reference: `scripts/douyin-personal-discovery.mjs`

## Acceptance

- Collector starts without requiring credentials in chat or command arguments.
- If CDP/login is missing, the generated report says so and does not claim capture success.
- If the creator backend is accessible, Video Account related JSON responses are saved to `.local/video-account-personal-v0/raw/`.
- Endpoint and field path candidate reports are generated.
- `npm run typecheck` passes.
- `git diff --check` passes.
