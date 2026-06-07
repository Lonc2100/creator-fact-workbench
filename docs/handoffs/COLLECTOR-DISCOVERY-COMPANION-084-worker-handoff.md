# COLLECTOR-DISCOVERY-COMPANION-084 worker handoff

## Task

- Task ID: `COLLECTOR-DISCOVERY-COMPANION-084`
- Goal: audit and submit four local, user-driven discovery helper scripts for Douyin, Xiaohongshu, Video Account, and Bilibili.

## Scope

Submitted helper scripts:

- `scripts/douyin-personal-discovery.mjs`
- `scripts/xiaohongshu-personal-discovery.mjs`
- `scripts/video-account-personal-discovery.mjs`
- `scripts/bilibili-personal-discovery.mjs`

These scripts are collector companion tools only. They are not active package commands and do not create an automatic refresh promise.

## Explicit Exclusions

Not changed and not staged:

- `package.json`
- `scripts/sync-wechat-official.ts`
- `scripts/wechat-backend-discovery.mjs`
- diagnostic E2E scripts
- `scripts/smoke-self-media.mjs`
- `tests/agent-trajectory.test.mjs`
- `.local/`

WeChat remains paused. This task does not add `sync:wechat`, `discover:wechat-backend`, WeChat routes, or WeChat package exposure.

## Safety Review

The helper scripts are user-driven browser/CDP discovery tools:

- They write only under `.local/<platform>-personal-v0/`.
- Raw captures are under `.local/<platform>-personal-v0/raw/`.
- Browser profiles are under `.local/<platform>-personal-v0/chrome-profile/`.
- They include sensitive-key filters for cookies, tokens, auth headers, user IDs, phone/email/name/avatar-style fields, signatures, and long secret-like values.
- They record content type and sanitized response bodies, but do not persist request headers, cookies, tokens, or auth values.
- `.local/` is ignored and remains local-only.

Sensitive scan notes:

- Matches for `cookie`, `token`, `authorization`, `headers`, `password`, `secret`, and `session` are policy/filter code or explicit "not saved" report text.
- Matches for `chrome-profile` and `raw` are local output paths under `.local`.
- No WeChat Official Account/backend scripts are included in this commit.

## Package Exposure

`package.json` currently has no active `discover:douyin`, `discover:xiaohongshu`, `discover:video-account`, `discover:bilibili`, `sync:wechat`, or `discover:wechat-backend` commands. This task intentionally keeps that boundary.

Future package exposure, if any, should use clear collector/tooling names and should not describe these helpers as automatic refresh or default production collection.

## Verification

- `node --check scripts/douyin-personal-discovery.mjs`: PASS
- `node --check scripts/xiaohongshu-personal-discovery.mjs`: PASS
- `node --check scripts/video-account-personal-discovery.mjs`: PASS
- `node --check scripts/bilibili-personal-discovery.mjs`: PASS
- Sensitive-term scan over the four scripts: REVIEWED, matches are sanitizer/report/local-output paths.
- Package command scan: PASS, no active discovery or WeChat sync/discover command added.
- `git diff --check`: PASS
- Staged scope check: only four helper scripts and this handoff.

## Residual Risks

- These scripts can create `.local/**/chrome-profile/**` and `.local/**/raw/**` when run. Those outputs may contain local browsing/session-derived evidence and must stay ignored/local.
- They are discovery helpers, not stable API connectors. Outputs require human/operator review before any future provider or import mapping work.
- Bilibili account-level metrics remain preview/diagnostic only; this helper should not be used to promote account metrics into durable content totals.
