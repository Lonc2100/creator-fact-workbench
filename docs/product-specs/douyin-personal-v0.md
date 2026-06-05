# DOUYIN-PERSONAL-V0

## Problem

CSV/XLSX import is not enough to confirm the current Douyin creator-center metric shape. We need a local, user-controlled discovery pass that observes the logged-in creator center page and records candidate JSON endpoints and field paths before any durable import mapping is built.

## User Workflow

1. The user opens or lets the collector open `https://creator.douyin.com/creator-micro/data-center/operation`.
2. The user logs in manually if Douyin asks for login, CAPTCHA, or risk verification.
3. The collector listens to `creator.douyin.com` Network JSON responses for a short discovery window.
4. The user may refresh the page or click normal creator-center data modules during the window.
5. The collector writes sanitized local captures and a field report under `.local/douyin-personal-v0/`.

## Scope

In scope for V0 discovery:

- account overview endpoint candidates;
- works/content data list endpoint candidates;
- play/view metrics;
- likes;
- comment counts;
- shares;
- follower changes;
- comment content only when already visible in normal creator-center JSON responses.

Out of scope:

- no Repo / Service / Runtime / API persistence;
- no durable `MetricSnapshot` writes;
- no dashboard/reviews/calendar UI changes;
- no login bypass, CAPTCHA bypass, risk-control bypass, or credential collection;
- no public-content batch crawling.

## Collector

Command:

```text
npm run discover:douyin
```

Optional flags:

- `--cdp=http://127.0.0.1:9222` to connect to a running remote-debugging browser;
- `--duration=60000` to set the discovery window in milliseconds;
- `--no-launch` to avoid launching Chrome and only test CDP connectivity;
- `--max-captures=80` and `--max-array-items=80` to limit local capture volume.

The collector uses Playwright CDP, following the same login-state reuse idea as the local MediaCrawler reference:

- prefer connecting to an already logged-in browser on the CDP endpoint;
- when CDP is not available and `--no-launch` is not set, open local Chrome/Edge with a `.local/douyin-personal-v0/chrome-profile` profile;
- never ask for account password or write request headers.

## Output

All generated discovery data is local-only:

- `.local/douyin-personal-v0/raw/` contains sanitized JSON capture files;
- `.local/douyin-personal-v0/endpoints.json` contains grouped endpoint candidates;
- `.local/douyin-personal-v0/field-report.md` contains human-readable field path candidates and coverage status.

## Redaction

The collector does not save request headers. JSON values under sensitive-looking keys are redacted, including cookie, token, auth, session, secret, password, phone, email, passport, uid, sec_uid, avatar, nickname, signature, and similar fields. Long token-like strings and sensitive query values are also redacted.

## Acceptance

- Collector starts without requiring credentials in chat or command arguments.
- If CDP/login is missing, the generated report says so and does not claim capture success.
- If the creator center is accessible, `creator.douyin.com` JSON responses are saved to `.local/douyin-personal-v0/raw/`.
- Endpoint and field path candidate reports are generated.
- `npm run typecheck` passes.
- `git diff --check` passes.
