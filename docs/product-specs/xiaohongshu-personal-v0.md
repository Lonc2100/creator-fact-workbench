# XIAOHONGSHU-PERSONAL-V0

## Problem

Xiaohongshu creator-center CSV/export field names are still draft-realistic in the current import presets. Before building durable metric mapping, we need a user-controlled logged-in browser discovery pass that observes Xiaohongshu creator-center JSON responses and records endpoint/field candidates.

## User Workflow

1. The user opens or lets the collector open `https://creator.xiaohongshu.com/`.
2. The user logs in manually if Xiaohongshu asks for login, CAPTCHA, or risk verification.
3. The collector listens to Xiaohongshu-related Network JSON responses.
4. The user may refresh the page or click normal creator-center modules such as notes, data, fans, or comments.
5. The collector writes sanitized local captures and reports under `.local/xiaohongshu-personal-v0/`.

## Scope

In scope for V0 discovery:

- account overview;
- note/work list;
- views/read/exposure;
- likes;
- comments count;
- saves/collections;
- shares;
- follower changes if visible;
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
npm run discover:xiaohongshu
```

Optional flags:

- `--target=https://creator.xiaohongshu.com/` to override the start page;
- `--cdp=http://127.0.0.1:9222` to connect to a running remote-debugging browser;
- `--duration=60000` to set the discovery window in milliseconds;
- `--no-launch` to avoid launching Chrome and only test CDP connectivity;
- `--max-captures=80` and `--max-array-items=80` to limit local capture volume.

The collector follows the same Playwright/CDP logged-in browser pattern already accepted for Douyin personal V0:

- prefer connecting to an already logged-in browser on the CDP endpoint;
- when CDP is not available and `--no-launch` is not set, open local Chrome/Edge with a `.local/xiaohongshu-personal-v0/chrome-profile` profile;
- never ask for account password or write request headers.

## Output

All generated discovery data is local-only:

- `.local/xiaohongshu-personal-v0/raw/` contains sanitized JSON capture files;
- `.local/xiaohongshu-personal-v0/endpoints.json` contains grouped endpoint candidates;
- `.local/xiaohongshu-personal-v0/field-report.md` contains human-readable field path candidates and coverage status.

## Redaction

The collector does not save request headers. JSON values under sensitive-looking keys are redacted, including cookie, token, auth, session, secret, password, phone, email, passport, uid, avatar, nickname, signature, xsec, web_session, and similar fields. Long token-like strings and sensitive query values are also redacted.

## Acceptance

- Collector starts without requiring credentials in chat or command arguments.
- If CDP/login is missing, the generated report says so and does not claim capture success.
- If the creator center is accessible, Xiaohongshu-related JSON responses are saved to `.local/xiaohongshu-personal-v0/raw/`.
- Endpoint and field path candidate reports are generated.
- `npm run typecheck` passes.
- `git diff --check` passes.
