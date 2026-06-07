# BILIBILI-PERSONAL-V0-REAL-CAPTURE-020 Worker Handoff

## Task ID

BILIBILI-PERSONAL-V0-REAL-CAPTURE-020

## Completed Work

- Ran real Bilibili creator-center discovery without `--no-launch`.
- Used the isolated collector browser profile:
  - `.local/bilibili-personal-v0/chrome-profile`
- Confirmed the collector browser was launched on CDP `http://127.0.0.1:9222`.
- Completed logged-in creator-center capture from the user's own Bilibili Studio pages.
- Clicked normal creator-center modules during capture:
  - Dashboard
  - Contents
  - Analytics
- Generated refreshed local-only discovery outputs:
  - `.local/bilibili-personal-v0/field-report.md`
  - `.local/bilibili-personal-v0/capture-summary.json`
  - `.local/bilibili-personal-v0/endpoints.json`
- Did not paste raw payloads into chat or this handoff.
- Did not build durable save, did not write `MetricSnapshot`, and did not build a Bilibili V1 mapper.
- Did not crawl public Bilibili content in bulk.
- Did not continue WeChat Official Account / WeChat backend work.

## Script Fixes

- Updated `scripts/bilibili-personal-discovery.mjs` so the discovery window uses a standalone timer instead of `page.waitForTimeout`.
  - Reason: the first real browser run opened the isolated profile, but the original page/context was closed or replaced during login/navigation, causing `collector_error`.
  - Result: login redirects or tab replacement no longer fail the run by themselves.
- Updated login-state detection to recognize English `Log in` text.
  - Reason: Bilibili Studio can render English UI.
- Updated `endpoints.json` output to omit candidate sample values.
  - It now keeps endpoint metadata plus field paths/types only.

## Real Capture Result

Latest successful run:

```text
npm run discover:bilibili -- --duration=120000 --max-captures=160
```

Collector output:

```text
ok: true
loginState: logged_in_or_accessible
captures: 27
endpoints: 14
```

Local summary:

- `loginState`: `logged_in_or_accessible`
- `jsonCaptures`: `27`
- `endpointCount`: `14`
- `taskId`: `BILIBILI-PERSONAL-V0-REAL-CAPTURE-020`
- `rawDir`: `.local/bilibili-personal-v0/raw`

## Endpoint Candidates

Sanitized endpoint summary from the latest run:

- `GET https://member.bilibili.com/preupload`
  - count: `2`
  - modules: unclassified
- `GET https://member.bilibili.com/c/data/oversea/web/index/stat`
  - count: `3`
  - modules: comments, followersDelta, saves, likes, shares, views
- `GET https://api.bilibili.com/x/web-show/res/locs`
  - count: `6`
  - modules: comments, views
- `GET https://api.bilibili.com/x/web-interface/nav`
  - count: `2`
  - modules: accountOverview
- `GET https://api.bilibili.com/x/member/realname/apply/status`
  - count: `2`
  - modules: accountOverview
- `GET https://member.bilibili.com/x/vupre/web/oversea/archives`
  - count: `1`
  - modules: worksList, accountOverview, views, comments, saves, shares, likes
- `GET https://member.bilibili.com/c/data/public/pre`
  - count: `1`
  - modules: worksList, views
- `GET https://member.bilibili.com/x/web/data/v2/grey`
  - count: `1`
  - modules: followersDelta, accountOverview, worksList, views
- `GET https://member.bilibili.com/x/web/white`
  - count: `1`
  - modules: comments, followersDelta, accountOverview, views
- `GET https://member.bilibili.com/c/data/oversea/web/overview/stat/num`
  - count: `4`
  - modules: views, followersDelta, likes, saves, comments, shares
- `GET https://member.bilibili.com/x/web/pagetip/list`
  - count: `1`
  - modules: worksList
- `GET https://member.bilibili.com/c/data/oversea/web/overview/compare`
  - count: `1`
  - modules: followersDelta, views, likes, comments
- `GET https://member.bilibili.com/c/data/oversea/web/survey`
  - count: `1`
  - modules: worksList
- `GET https://member.bilibili.com/c/data/oversea/web/overview/stat/graph`
  - count: `1`
  - modules: views, worksList

## Field Candidates

Strongest Bilibili V0 field candidates from the latest run:

- Account overview:
  - `$.data.status`
  - `$.data.scores`
  - `$.data.vipStatus`
  - `$.data.vip.status`
  - `$.data.archive_stat_query`
- Works / video list:
  - `$.data.arc_audits[].Archive`
  - `$.data.arc_audits[].Archive.aid`
  - `$.data.arc_audits[].Archive.bvid`
  - `$.data.arc_audits[].Archive.title`
  - `$.data.arc_audits[].Archive.author`
  - `$.data.arc_audits[].stat.view`
  - `$.data.arc_audits[].stat.vv`
  - `$.data.20260602.arc_inc[].aid`
  - `$.data.20260602.arc_inc[].bvid`
  - `$.data.tendency_rank[].arc_ranks[].bvid`
- Play / read:
  - `$.data.incr_click`
  - `$.data.total_click`
  - `$.data.play`
  - `$.data.play_last`
  - `$.data.arc_audits[].stat.view`
  - `$.data.arc_audits[].stat.vv`
  - `$.data.data_tendency.play[].total_inc`
  - `$.data.data_tendency.play[].sub_total_inc`
- Likes:
  - `$.data.inc_like`
  - `$.data.total_like`
  - `$.data.like`
  - `$.data.like_last`
  - `$.data.arc_audits[].stat.like`
  - `$.data.arc_audits[].stat.like_g`
- Comments:
  - `$.data.incr_reply`
  - `$.data.total_reply`
  - `$.data.comment`
  - `$.data.comment_last`
  - `$.data.arc_audits[].stat.reply`
- Danmu / bullet comments:
  - `$.data.incr_dm`
  - `$.data.total_dm`
  - `$.data.dm`
  - `$.data.dm_last`
- Saves / favorites:
  - `$.data.inc_fav`
  - `$.data.total_fav`
  - `$.data.fav`
  - `$.data.fav_last`
  - `$.data.arc_audits[].stat.favorite`
  - `$.data.arc_audits[].stat.fav_g`
- Shares / forwards:
  - `$.data.inc_share`
  - `$.data.total_share`
  - `$.data.share`
  - `$.data.share_last`
  - `$.data.arc_audits[].stat.share`
- Follower changes:
  - `$.data.fan_recent_thirty`
  - `$.data.fan_recent_thirty.follow`
  - `$.data.fan`
  - `$.data.fan_last`
  - `$.data.fans`
  - `$.data.new_fans`
  - `$.data.fan_snapshot`
  - `$.data.fansv3`

## Coverage

Latest `capture-summary.json` coverage:

- 账号总览: `candidate_paths_found`, candidatePathCount `31`
- 作品 / 视频数据列表: `candidate_paths_found`, candidatePathCount `19`
- 播放 / 阅读: `candidate_paths_found`, candidatePathCount `28`
- 点赞: `candidate_paths_found`, candidatePathCount `10`
- 评论数: `candidate_paths_found`, candidatePathCount `17`
- 收藏: `candidate_paths_found`, candidatePathCount `6`
- 分享 / 转发: `candidate_paths_found`, candidatePathCount `5`
- 粉丝变化: `candidate_paths_found`, candidatePathCount `24`
- 评论内容: `candidate_paths_found`, candidatePathCount `17`

## Safety Notes

- No password was requested or stored.
- No cookie, token, auth header, full request header, or raw platform payload is included in this handoff.
- Raw payloads remain local-only under `.local/bilibili-personal-v0/raw/`.
- `endpoints.json` was adjusted to avoid sample-value output and keep only endpoint plus field path/type summaries.
- This task only observed the user's own logged-in Bilibili Studio pages.
- No public batch crawling was added.
- No Repo / Service / Runtime / API durable persistence was added.
- No `MetricSnapshot` writes were added.

## Verification

- `node --check scripts/bilibili-personal-discovery.mjs`: PASS.
- `npm run discover:bilibili -- --duration=120000 --max-captures=160`: PASS.
  - First useful logged-in pass: `captures=6`, `endpoints=5`.
  - Final module-click pass: `captures=27`, `endpoints=14`.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.
- `npm run verify:harness`: PASS.
  - Includes 42 passing `test:self-media` tests.

## Known Issues

- The current discovery confirms candidate fields only. It does not prove final V1 mapping semantics yet.
- Some generic utility endpoints also matched weak field patterns. The strongest future mapper candidates are the Bilibili Studio endpoints under:
  - `/x/vupre/web/oversea/archives`
  - `/c/data/oversea/web/index/stat`
  - `/c/data/oversea/web/overview/stat/num`
  - `/c/data/oversea/web/overview/compare`
  - `/c/data/oversea/web/overview/stat/graph`
  - `/c/data/oversea/web/survey`
- Field paths with date keys, such as `$.data.20260602.arc_inc[]`, need a date-key normalization step before any V1 mapper.

## Next Recommendation

Open a separate `BILIBILI-PERSONAL-V1-METRICS` task to map only the strongest verified Bilibili Studio endpoints into preview-only internal payloads first. Keep `--save` / durable `MetricSnapshot` work out of scope until the V1 preview is reviewed.

## Orchestrator Decision Required

No.
