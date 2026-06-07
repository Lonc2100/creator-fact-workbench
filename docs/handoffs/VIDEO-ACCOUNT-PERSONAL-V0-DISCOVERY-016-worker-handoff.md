# VIDEO-ACCOUNT-PERSONAL-V0-DISCOVERY-016 Worker Handoff

## Task ID

VIDEO-ACCOUNT-PERSONAL-V0-DISCOVERY-016

## Completed Work

- Added a local Video Account assistant / creator backend Network JSON discovery collector.
- Added the npm entry:
  - `npm run discover:video-account`
- Added the V0 product spec for Video Account personal discovery.
- Generated local-only discovery output under `.local/video-account-personal-v0/`.
- Verified that the collector does not ask for credentials and does not treat a login page as discovery success.

## Changed Files

- `scripts/video-account-personal-discovery.mjs`
  - Uses Playwright CDP via `playwright-core`.
  - Prefers an existing browser on `http://127.0.0.1:9222`.
  - Can launch local Chrome/Edge with `.local/video-account-personal-v0/chrome-profile` when not using `--no-launch`.
  - Opens `https://channels.weixin.qq.com/platform`.
  - Listens for Video Account related JSON responses from `channels.weixin.qq.com`, `finder.video.qq.com`, and closely related WeChat hostnames.
  - Saves sanitized captures only to `.local/video-account-personal-v0/raw/`.
  - Writes grouped endpoints to `.local/video-account-personal-v0/endpoints.json`.
  - Writes field candidates and coverage to `.local/video-account-personal-v0/field-report.md`.
- `docs/product-specs/video-account-personal-v0.md`
  - Documents workflow, scope, safety rules, outputs, redaction, references, and acceptance.
- `package.json`
  - Added `discover:video-account`.
  - Note: `package.json` already had unrelated local changes before/alongside this task, including existing browser/Douyin/Xiaohongshu/WeChat scripts and port/dependency edits. I did not revert or normalize those.

## Local Output

- `.local/video-account-personal-v0/raw/`
  - The first attached run captured 9 sanitized login-page/helper JSON responses.
  - The latest verification run after the login-success guard fix captured 0 data JSON responses because the page required login.
  - I did not batch-delete the earlier local raw files because this task explicitly forbids batch deletion. They are local-only and not referenced by the latest `endpoints.json`.
- `.local/video-account-personal-v0/endpoints.json`
  - Latest content: `[]`.
- `.local/video-account-personal-v0/field-report.md`
  - Latest state:
    - loginState: `needs_login`
    - JSON captures: `0`
    - no endpoint candidates confirmed
    - all target fields remain `not confirmed`

## Login / Capture Status

- Browser CDP connected: yes, through the existing `127.0.0.1:9222` endpoint during the verification run.
- Logged in to Video Account backend: no.
- Current collector result: not a fake success; it returns `ok: false` when login is required.
- Captured target modules:
  - 账号总览: not captured
  - 作品 / 视频数据列表: not captured
  - 播放 / 浏览: not captured
  - 点赞: not captured
  - 评论数: not captured
  - 分享 / 转发: not captured
  - 收藏: not captured
  - 粉丝变化: not captured
  - 公众号阅读转化 / 引流点击: not captured
  - 评论内容: not captured

## Field Mapping Status

- Confirmed mappings: none.
- Candidate mappings: none in the latest logged-out run.
- Unconfirmed fields:
  - account overview
  - works/video list
  - views/play/read
  - likes
  - comments count
  - shares/forwards
  - saves/favorites
  - follower delta
  - official-account referral/read conversion/clicks
  - comment content

## Safety Notes

- No account password was requested.
- No cookie, request headers, auth headers, or raw tokens are written to docs/tests/Git.
- The collector does not bypass login, CAPTCHA, QR scan, risk control, or verification.
- Raw captures are written only under `.local/video-account-personal-v0/`.
- The implementation does not write Repo / Service / Runtime / API persistence.
- The implementation does not change dashboard, reviews, calendar, or other UI.
- No files or directories were batch-deleted.

## External / Mature Pattern References

Evaluated from applicability, freshness, authority, and popularity:

- Existing accepted local pattern: `scripts/douyin-personal-discovery.mjs`
  - Applicability: high; same logged-in creator-center Network JSON discovery problem.
  - Freshness: current repository baseline from accepted Douyin V0/V1 work.
  - Authority: high for this repo because Orchestrator accepted it.
  - Popularity: local project pattern, not public popularity.
- Playwright official `connectOverCDP` docs: https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp
  - Applicability: high; exact CDP attach API used by the collector.
  - Freshness: official docs for installed Playwright line.
  - Authority: high; official Playwright documentation.
  - Popularity: high; Playwright is the existing dependency and common browser automation tool.
- Playwright official Network docs: https://playwright.dev/docs/network
  - Applicability: high; covers request/response observation pattern.
  - Freshness: official docs.
  - Authority: high.
  - Popularity: high.

## Verification

- `node --check scripts/video-account-personal-discovery.mjs`: PASS.
- `npm run discover:video-account -- --no-launch --duration=1000`: PASS.
  - Result after guard fix:
    - `ok: false`
    - `loginState: needs_login`
    - `captures: 0`
    - `endpoints: 0`
    - outputDir: `.local/video-account-personal-v0`
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

## Known Issues

- Real Video Account data fields are not confirmed yet because the current browser session was not logged in.
- The first safe run produced local-only login-page/helper captures before the guard was tightened. Latest reports do not count those as success or endpoint candidates.
- The next real discovery pass requires the user to log in manually in the browser, then refresh/click normal Video Account backend modules while the collector is running.

## Next Recommendation

Run:

```text
npm run discover:video-account -- --duration=60000
```

Then manually log in if prompted and click the normal overview, works/data, fans, referral, and comment modules. Only after `.local/video-account-personal-v0/field-report.md` contains real data endpoint and field candidates should a later task map Video Account metrics into durable records.

## Orchestrator Decision Required

No.
