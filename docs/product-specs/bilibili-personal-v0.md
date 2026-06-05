# BILIBILI-PERSONAL-V0

## Problem

Bilibili creator-center metric exports and backend response shapes are not verified in this repository. Before any durable metric mapping is built, we need a user-controlled logged-in browser discovery pass that observes the user's own Bilibili creator center JSON responses and records endpoint/field candidates.

## User Workflow

1. The user opens or lets the collector open `https://member.bilibili.com/creator/home`.
2. The user logs in manually if Bilibili asks for login, CAPTCHA, QR scan, or risk verification.
3. The collector listens to Bilibili creator-center related Network JSON responses.
4. The user may refresh the page or click normal creator-center modules such as overview, content, data, fans, comments, or manuscript pages.
5. The collector writes sanitized local captures and reports under `.local/bilibili-personal-v0/`.

## Scope

In scope for V0 discovery:

- account overview;
- work/video/article list;
- play/read metrics;
- likes;
- comment counts;
- saves/favorites;
- shares/forwards;
- follower changes if visible;
- comment content only when already visible in normal creator-center JSON responses.

Out of scope:

- no Repo / Service / Runtime / API persistence;
- no durable `MetricSnapshot` writes;
- no dashboard/reviews/calendar UI changes;
- no login bypass, CAPTCHA bypass, risk-control bypass, credential collection, or password prompts;
- no public-content batch crawling;
- no WeChat Official Account backend work.

## Collector

Command:

```text
npm run discover:bilibili
```

Optional flags:

- `--target=https://member.bilibili.com/creator/home` to override the start page;
- `--cdp=http://127.0.0.1:9222` to connect to a running remote-debugging browser;
- `--duration=60000` to set the discovery window in milliseconds;
- `--no-launch` to avoid launching Chrome and only test CDP connectivity;
- `--max-captures=80` and `--max-array-items=80` to limit local capture volume.

The collector follows the Playwright/CDP logged-in browser pattern already accepted for Douyin, Xiaohongshu, and Video Account personal V0:

- prefer connecting to an already logged-in browser on the CDP endpoint;
- when CDP is not available and `--no-launch` is not set, open local Chrome/Edge with a `.local/bilibili-personal-v0/chrome-profile` profile;
- never ask for account password or write request headers.

## Output

All generated discovery data is local-only:

- `.local/bilibili-personal-v0/raw/` contains sanitized JSON capture files;
- `.local/bilibili-personal-v0/endpoints.json` contains grouped endpoint candidates;
- `.local/bilibili-personal-v0/field-report.md` contains human-readable field path candidates and coverage status;
- `.local/bilibili-personal-v0/capture-summary.json` contains sanitized run metadata, endpoint summaries, and target coverage.

## Redaction

The collector does not save request headers. JSON values under sensitive-looking keys are redacted, including cookie, token, auth, session, secret, password, phone, email, user id, uid, mid, DedeUserID, bili_jct, SESSDATA, buvid, avatar, nickname, signature, login QR data, and similar fields. Long token-like strings and sensitive query values are also redacted.

## External References

- Playwright `browserType.connectOverCDP`: https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp
- Playwright network response events: https://playwright.dev/docs/network
- Existing repository reference: `scripts/video-account-personal-discovery.mjs`
- External thought reference: MediaCrawler Bilibili collector patterns, used only as high-level logged-in browser/response-shape inspiration and not as a public bulk crawling framework.

## Acceptance

- Collector starts without requiring credentials in chat or command arguments.
- If CDP/login is missing, the generated report says so and does not claim capture success.
- If the creator center is accessible, Bilibili creator-center JSON responses are saved to `.local/bilibili-personal-v0/raw/`.
- Endpoint, field path, and capture summary reports are generated.
- `npm run typecheck` passes.
- `git diff --check` passes.
