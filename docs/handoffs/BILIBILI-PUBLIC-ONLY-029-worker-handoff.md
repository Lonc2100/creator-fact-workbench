# BILIBILI-PUBLIC-ONLY-029 Worker Handoff

## Status

PASS. B 站后续导入已增加 public-only gate：只有明确公开 / 已发布的 archives 内容会进入正式 Content / PlatformVersion / MetricSnapshot / dashboard 口径。

## Raw Field Review

只做字段名与判断逻辑记录，未写入用户标题、隐私内容或 raw payload。

Archives endpoint:

- `/x/vupre/web/oversea/archives`

Observed archive status-related field names:

- `arc_audits[].Archive.state`
- `arc_audits[].Archive.state_desc`
- `arc_audits[].Archive.state_panel`
- `arc_audits[].Archive.no_public`
- `arc_audits[].Archive.attrs.no_public`
- `arc_audits[].Archive.is_only_self`
- `arc_audits[].Archive.is_space_hidden`
- `arc_audits[].Archive.reject_reason`
- `arc_audits[].Archive.ptime`
- `arc_audits[].Archive.dtime`
- `arc_audits[].Archive.online_time`
- `arc_audits[].Archive.had_passed`

Public-only logic:

- Allow only when `state` is `0`.
- Require `state_desc` to be explicitly approved/published/public, including observed `Approved`.
- If `state_panel` is present, require it to be zero-like.
- Skip when `is_only_self`, `is_space_hidden`, `no_public`, or `attrs.no_public` is one-like.
- Skip non-zero state rows, rejected/down rows, review/pending/offline rows.
- Skip missing or unclear public state as `unknown_public_state`.
- `ptime` remains publish-time metadata only; it is not sufficient to prove public visibility.

## Implemented

- Added Bilibili archive public-only filtering in `src/domain/self-media/providers/bilibili-personal-provider.ts`.
- Added skipped archive reason aggregation into provider warnings, without raw values or titles.
- Kept accountMetrics/dateKeyRows diagnostic-only behavior unchanged.
- Did not delete or mutate existing DB data; this task only affects future imports.
- Did not add public crawling, browser collection, raw payload input, cookie/token/header handling, or comment/danmu text import.

## Test Coverage

- Public/published Bilibili archive enters provider payload and service/dashboard.
- Private / only-self archive is skipped.
- Hidden / no-public archive is skipped.
- Unknown public state archive is skipped by default.
- Review/pending archive is skipped.
- Down/rejected archive is skipped.
- Offline/non-public state archive is skipped.
- Skipped reason counts are surfaced in warnings.
- Existing Bilibili durable save and operation tests now use explicit public archive fields.

## Verification

- PASS `npm run test:self-media`
- PASS `npm run typecheck`
- PASS `npm run verify:harness`
- PASS `git diff --check`

## Notes

- Existing database rows were not removed. Main session can decide separately whether to archive, hide, or rebuild older local DB content.
- Provider file is currently untracked in this worktree from prior Bilibili work; this task edits it in place and does not alter unrelated dirty files.

## Needs Main Session Judgment

Yes. Main session should decide whether old local B 站 rows need manual cleanup or a separate non-destructive migration/visibility task.
