# WECHAT-BACKEND-V0-DISCOVERY-016 Worker Handoff

## Task ID

WECHAT-BACKEND-V0-DISCOVERY-016

## Completed

- Added a WeChat Official Account backend Network JSON discovery collector.
- Added the package script `npm run discover:wechat-backend`.
- Added the product spec for WeChat backend V0 discovery.
- Ran the collector in safe `--no-launch` mode against the currently reachable local CDP endpoint.
- Generated local-only discovery outputs under `.local/wechat-backend-v0/`.

## Changed Files

- `scripts/wechat-backend-discovery.mjs`
  - Uses Playwright CDP via `playwright-core`.
  - Prefers an existing CDP endpoint at `http://127.0.0.1:9222`.
  - Can launch local Chrome/Edge with a `.local/wechat-backend-v0/chrome-profile` profile when not using `--no-launch`.
  - Listens only to `mp.weixin.qq.com` JSON-like responses.
  - Does not save request headers, cookies, auth headers, tokens, or passwords.
  - Redacts sensitive query keys and sensitive JSON fields before writing captures.
  - Saves sanitized captures only to `.local/wechat-backend-v0/raw/`.
  - Writes grouped endpoint candidates to `.local/wechat-backend-v0/endpoints.json`.
  - Writes field path candidates and target coverage to `.local/wechat-backend-v0/field-report.md`.
- `docs/product-specs/wechat-backend-v0.md`
  - Documents scope, user workflow, safety rules, official API baseline, output paths, and acceptance.
- `package.json`
  - Added `discover:wechat-backend`.

## Local Outputs

- `.local/wechat-backend-v0/raw/`
  - Contains sanitized JSON captures from collector runs.
  - Latest report references three current captures:
    - `raw/001-050dff21a86b.json`
    - `raw/002-eed4d163451e.json`
    - `raw/003-ed284af1a02e.json`
- `.local/wechat-backend-v0/endpoints.json`
  - Latest grouped endpoint candidates:
    - `POST https://mp.weixin.qq.com/cgi-bin/bizlogin`
    - `POST https://mp.weixin.qq.com/cgi-bin/webreport`
- `.local/wechat-backend-v0/field-report.md`
  - Latest login state: `login_prompt_with_json`.
  - Latest JSON captures: `3`.

## Login And Capture Status

- CDP connected: yes.
- Collector started: yes.
- User login confirmed: no.
- Business backend JSON captured: no.
- JSON captured: yes, but only login/prompt utility JSON.
- No fake success was reported. Console output returned `ok: false` because the page appeared to show a login or verification prompt.

Latest collector output:

```text
ok = false
loginState = login_prompt_with_json
captures = 3
endpoints = 2
outputDir = .local/wechat-backend-v0
```

## Modules Captured

Confirmed from latest run:

- Login/prompt utility:
  - `POST /cgi-bin/bizlogin`
- Browser/report utility:
  - `POST /cgi-bin/webreport`

Not confirmed yet:

- account overview;
- article data/list pages;
- reading users/counts;
- share users/counts;
- favorite users/counts;
- likes and watching/zaikan;
- comment count/content;
- new/canceled/net followers;
- read/source/channel splits.

## Field Mapping Status

Confirmed candidate field paths:

- None for business mapping in the latest run.

Unconfirmed first-batch targets:

- `accountOverview`
- `articleList`
- `readCount`
- `readUser`
- `shareCount`
- `shareUser`
- `favoriteCount`
- `favoriteUser`
- `likes`
- `watching`
- `commentCount`
- `commentContent`
- `newFollowers`
- `cancelFollowers`
- `netFollowers`
- `readSource`

## Official API Coverage Versus Backend Collector

Covered by existing `WECHAT-001` official sync shape when DataCube permission is available:

- article identity/title/date from article summary rows;
- reading users and reading counts;
- sharing users and sharing counts;
- favorite users and favorite counts;
- user summary rows for new/canceled users by date/source.

Still needs backend browser collector discovery if visible in normal backend pages:

- likes;
- watching/zaikan;
- comment count and comment content;
- richer backend article list metadata;
- dashboard/account overview widgets;
- net follower delta when official row shape or permission is insufficient;
- read/source/channel splits not exposed by the current official sync permission.

Current external blocker from prior `WECHAT-001` remains relevant:

- Real official API sync previously returned `48001 api unauthorized` for DataCube analytics permission.

## Safety Notes

- No account password was requested.
- No login bypass, CAPTCHA bypass, or risk-control bypass was attempted.
- No public content was batch collected.
- No raw captures were copied into docs, tests, or Git-tracked output.
- `.local/` is ignored by Git.
- No Repo / Service / Runtime / API persistence was added.
- No dashboard, reviews, calendar, or other UI files were changed.
- No files were deleted.

## Verification

- `node --check scripts/wechat-backend-discovery.mjs`: PASS.
- `npm run discover:wechat-backend -- --no-launch --duration=1000`: PASS startup; connected to CDP; returned `ok: false` because only login/prompt JSON was captured.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

## Known Issues

- The latest run did not confirm a logged-in WeChat backend state. The browser/CDP session appears to be at a login or verification prompt.
- The collector can capture JSON, but business modules must be clicked after manual login to discover target fields.
- `.local/wechat-backend-v0/raw/` contains captures from repeated local verification runs; no cleanup was performed because this task forbids batch deletion.

## Next Recommendation

Have the user manually log in to `mp.weixin.qq.com` in the connected browser, then rerun:

```text
npm run discover:wechat-backend -- --duration=60000
```

During the discovery window, click the normal backend modules for data overview, article analytics/list, comments, and followers. Only after `.local/wechat-backend-v0/field-report.md` shows business endpoint and field candidates should a V1 mapping task be started.

## Needs Orchestrator Decision

No.
