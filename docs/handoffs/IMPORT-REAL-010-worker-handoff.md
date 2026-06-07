# Worker Handoff: IMPORT-REAL-010

## Task ID

IMPORT-REAL-010

## Role / Scope

Explorer / Spec only.

This round researched real-world import field presets for:

- 抖音
- 小红书
- 微信公众号
- B站
- 视频号

No core backend implementation was changed. In particular, this round did not edit:

- `src/domain/self-media/types`
- `src/domain/self-media/repo`
- `src/domain/self-media/service`
- `src/domain/self-media/runtime`
- `src/app/api`

## Completed Work

- Read local instructions and handoff protocol:
  - `AGENTS.md`
  - `docs/handoffs/README.md`
  - `docs/context/index.md`
  - `ARCHITECTURE.md`
  - `docs/mainline-framework.md`
  - `docs/task-board.md`
  - `docs/spec-governance.md`
  - existing `IMPORT-001` and `CONNECTOR-001` specs/handoffs
- Reviewed the current CSV preset implementation in `src/domain/self-media/providers/csv-preset-provider.ts`.
- Researched public/official sources and mature open-source references for platform metric fields.
- Produced a proposed "real import preset" specification below.

## Current Baseline

The current first-pass CSV presets already accept these normalized internal fields:

```text
id,title,platform,status,format,topic,publishedAt,views,likes,comments,saves,shares,followersDelta
```

Platform templates currently cover:

```text
douyin: 作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,涨粉,选题
xiaohongshu: 笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉,选题
wechat: 文章ID,标题,发布时间,阅读,点赞,评论,收藏,分享,涨粉,选题
video_account: 视频ID,标题,发布时间,播放,点赞,评论,收藏,转发,涨粉,选题
bilibili: 稿件ID,标题,发布时间,播放,点赞,评论,收藏,分享,涨粉,选题
```

CONNECTOR-001 already notes that these are practical first-pass templates and should be refined using real platform exports.

## Source Evaluation

Four-dimension judgment: applicability, recency, authority, popularity.

| Source | Use | Applicability | Recency | Authority | Popularity |
| --- | --- | --- | --- | --- | --- |
| 抖音开放平台 "查询特定视频的视频数据" | Confirms official item/video fields and statistic names | High for Douyin official API, medium for CSV export | Crawled 2026-05 | Official | Official, not GitHub-style popularity |
| 微信公众号 DataCube docs / mirrored official docs | Confirms official article analytics fields | High for Official Account analytics | Older API, still active in current provider | Official/mirrored official | Platform-standard |
| SocialSisterYi/bilibili-API-collect | Confirms Bilibili public API stat field names | High for B站 native stats, medium for creator export | GitHub API: updated 2026-06-03, pushed 2026-01-30 | Community reverse-engineered, not official | 20,298 stars / 2,828 forks on 2026-06-03 |
| NanmiCoder/MediaCrawler | Cross-platform crawler field conventions for douyin/xhs/bili/wechat | High as engineering reference, not official export proof | GitHub API: updated 2026-06-03, pushed 2026-05-29 | Mature OSS, not official | 50,619 stars / 10,656 forks on 2026-06-03 |
| 小红书创作服务平台 public articles | Confirms creator data center and common visible metrics | Medium; public official field list not found | Current third-party articles in 2026 | Low/medium; not official docs | Useful only as field signal |
| 视频号助手 public articles | Confirms export/data-center existence and common visible metrics | Medium; public official field list not found | Current third-party articles in 2026 | Low/medium; not official docs | Useful only as field signal |

Reference links used:

- Douyin Open Platform, video data API: `https://open.douyin.com/platform/resource/docs/openapi/video-management/douyin/search-video/video-data/`
- Douyin developer doc mirror, mini-app video query: `https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/server/basic-abilities/video-id-convert/user-video-data/video-data`
- WeChat DataCube field references via Go package docs: `https://pkg.go.dev/github.com/abotoo/wechat/v3/officialaccount/datacube`
- WeChat article analysis field mirror: `https://www.w3cschool.cn/weixinkaifawendang/art81qes.html`
- Bilibili API stat field reference: `https://gitee.com/Gongzx_0313/bilibili-API-collect/blob/master/video/status_number.md`
- MediaCrawler GitHub repository: `https://github.com/NanmiCoder/MediaCrawler`
- Bilibili API collect GitHub repository: `https://github.com/SocialSisterYi/bilibili-API-collect`
- XHS MediaCrawler-style sample fields: `https://termo.ai/skills/media-cluster`
- XHS creator data center field signal: `https://www.fanruan.com/blog/article/1010719/`
- Video Account export/data-center field signal: `https://xueyuan.yixiaoer.cn/article/42615`
- Video Account Assistant metric signal: `https://www.jkkits.com/article/sph_intro`

Important caveat:

Public official documentation for creator-center CSV/Excel export headers is incomplete or not openly indexed for 小红书 and 视频号. Their presets should therefore be treated as `draft-realistic`, not `confirmed-official`, until the user provides one real exported file per platform.

## Real Import Preset Contract

### Preset Version

Suggested durable version label:

```text
IMPORT-REAL-010-v0.1
```

### Import Principle

Keep the internal normalized metrics stable, and preserve platform-native fields separately.

Normalized fields should still map into existing internal records:

| Internal | Meaning |
| --- | --- |
| `id` | Stable content id. Prefer native exported content id. |
| `title` | Title or description. Required. |
| `platform` | One of current platform ids. |
| `format` | `short_video`, `image_text`, `article`, or `other`. |
| `topic` | Manual or imported topic/category. Optional. |
| `publishedAt` | Publish/create time. Optional but strongly recommended. |
| `capturedAt` | Export/stat date. If missing, use import time. |
| `views` | Platform-native primary reach/view/read/play metric. |
| `likes` | Platform-native like/digg/up metric. |
| `comments` | Comment/reply metric. |
| `saves` | Favorite/collect/add-to-fav metric. |
| `shares` | Share/forward/repost metric. |
| `followersDelta` | New follower delta when export provides it. |

Platform-native fields that should not be forced into the current normalized metric yet:

```text
rawFields / nativeMetrics:
exposure, impressions, read_user, play_user, completion_rate,
avg_watch_duration, danmaku, coin, download_count, forward_count,
share_user, add_to_fav_user, traffic_source, keyword_source,
profile_visits, follower_new, follower_cancel, conversion metrics
```

### Minimum Required Fields

For import preview:

- Required: `title` or native title/description.
- Strongly recommended: native content id and published/create time.
- If native id is missing, build a preview-only dedupe key from `platform + title + publishedAt`.
- Do not save rows with neither title nor identifiable content url/id.

### CSV/XLSX Handling Recommendation

Most creator centers export Excel files, not always CSV. Next implementation should support:

- CSV pasted content as today.
- CSV files.
- XLSX converted through a provider-level parser.
- Header alias detection before confirm-save.

Do not let raw platform headers leak past Providers.

## Platform Presets

### 抖音 Preset

Confidence: high for official API metric names, medium for actual creator-center export headers.

Officially confirmed fields from Douyin Open Platform video data response:

```text
item_id
title
create_time
share_url
cover
statistics.digg_count
statistics.download_count
statistics.play_count
statistics.share_count
statistics.forward_count
statistics.comment_count
```

Recommended accepted headers:

| Native / Alias | Internal Mapping | Notes |
| --- | --- | --- |
| `作品ID`, `视频ID`, `item_id`, `aweme_id` | `id` | Prefer `item_id`/`aweme_id`. |
| `标题`, `描述`, `title`, `desc` | `title` | Douyin exports may use description-like title. |
| `发布时间`, `创建时间`, `create_time`, `publish_time` | `publishedAt` | Convert epoch seconds when needed. |
| `播放量`, `播放`, `play_count`, `total_play`, `video_play_cnt` | `views` | Primary metric. |
| `点赞数`, `点赞`, `digg_count`, `total_like` | `likes` | Douyin native name is digg. |
| `评论数`, `评论`, `comment_count`, `total_comment` | `comments` | Primary interaction. |
| `收藏数`, `收藏`, `collect_count` | `saves` | Not in the cited official mini-app video response; keep optional. |
| `分享数`, `分享`, `share_count`, `total_share` | `shares` | Prefer share over forward for normalized shares. |
| `转发数`, `转发`, `forward_count` | `nativeMetrics.forward_count` or fallback `shares` | Keep raw distinction if both share and forward exist. |
| `下载数`, `download_count` | `nativeMetrics.download_count` | Do not map to normalized field. |
| `涨粉`, `粉丝增量`, `follower_new`, `fans_increment` | `followersDelta` | Export-dependent. |
| `完播率`, `平均播放时长`, `主页访问` | `nativeMetrics` | Useful for review but outside current normalized model. |

Suggested template:

```csv
作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,转发数,下载数,涨粉,完播率,平均播放时长,选题
```

### 小红书 Preset

Confidence: medium-low until real exported files are available. Public sources confirm common metrics but not official export header names.

Recommended accepted headers:

| Native / Alias | Internal Mapping | Notes |
| --- | --- | --- |
| `笔记ID`, `note_id`, `id` | `id` | MediaCrawler-style `note_id` is useful engineering reference. |
| `标题`, `笔记标题`, `title`, `display_title` | `title` | If missing, fallback to first body excerpt only in preview. |
| `发布时间`, `创建时间`, `publish_time`, `time`, `created_at` | `publishedAt` | Convert platform date formats. |
| `浏览量`, `阅读量`, `观看量`, `view_count`, `views` | `views` | Public sources commonly call this 浏览/阅读. |
| `点赞`, `点赞数`, `liked_count`, `likes` | `likes` | Native crawler convention: `liked_count`. |
| `评论`, `评论数`, `comment_count`, `comments` | `comments` | Primary interaction. |
| `收藏`, `收藏数`, `collected_count`, `saves` | `saves` | Very important XHS metric; keep first-class. |
| `分享`, `分享数`, `share_count`, `shares` | `shares` | Export-dependent visibility. |
| `涨粉`, `粉丝增量`, `follower_new`, `fans_increment` | `followersDelta` | Export-dependent. |
| `曝光`, `曝光量`, `impression`, `show_count` | `nativeMetrics.exposure` | Do not map to views without user confirmation. |
| `互动量`, `互动率`, `完播率`, `平均观看时长`, `流量来源`, `搜索词` | `nativeMetrics` | Preserve for future review models. |

Suggested template:

```csv
笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉,曝光量,互动量,互动率,流量来源,搜索词,选题
```

### 微信公众号 Preset

Confidence: high for DataCube field names; medium for manual后台导出 headers, because backend export labels can differ.

Official DataCube-compatible fields:

```text
ref_date
msgid
title
int_page_read_user
int_page_read_count
ori_page_read_user
ori_page_read_count
share_user
share_count
add_to_fav_user
add_to_fav_count
new_user
cancel_user
```

Recommended accepted headers:

| Native / Alias | Internal Mapping | Notes |
| --- | --- | --- |
| `文章ID`, `msgid`, `内容ID` | `id` | `msgid` may include article index. |
| `标题`, `title` | `title` | Required. |
| `发布时间`, `群发时间`, `ref_date`, `stat_date` | `publishedAt` / `capturedAt` | `ref_date` is publish/date basis; `stat_date` is statistic date. |
| `阅读`, `阅读量`, `图文页阅读次数`, `int_page_read_count` | `views` | Prefer `int_page_read_count`; optionally add original-page reads separately. |
| `阅读人数`, `int_page_read_user` | `nativeMetrics.read_user` | Unique-user style metric. |
| `原文页阅读次数`, `ori_page_read_count` | `nativeMetrics.ori_page_read_count` | Do not merge unless spec chooses total reads. |
| `点赞`, `赞`, `like_count` | `likes` | DataCube article summary does not guarantee this field; dashboard export may. |
| `评论`, `comment_count` | `comments` | Export/API dependent. |
| `收藏`, `收藏次数`, `add_to_fav_count` | `saves` | Official DataCube field. |
| `分享`, `分享次数`, `share_count` | `shares` | Official DataCube field. |
| `分享人数`, `share_user` | `nativeMetrics.share_user` | Preserve separately. |
| `新增关注`, `new_user` | positive `followersDelta` | From user summary. |
| `取消关注`, `cancel_user` | `nativeMetrics.cancel_user` | Do not subtract automatically unless spec says so. |

Suggested template:

```csv
文章ID,标题,发布时间,统计日期,图文页阅读次数,图文页阅读人数,原文页阅读次数,分享次数,分享人数,收藏次数,收藏人数,点赞,评论,新增关注,取消关注,选题
```

### B站 Preset

Confidence: high for native stat field names; medium for creator-center export headers.

Mature B站 API references consistently expose:

```text
aid
bvid
title
pubdate / publish_time
view
danmaku
reply
favorite
coin
share
like
```

Recommended accepted headers:

| Native / Alias | Internal Mapping | Notes |
| --- | --- | --- |
| `稿件ID`, `aid`, `avid`, `bvid`, `BV号` | `id` | Prefer `bvid` if available; preserve `aid` raw. |
| `标题`, `title` | `title` | Required. |
| `发布时间`, `pubdate`, `publish_time` | `publishedAt` | Convert epoch seconds when needed. |
| `播放`, `播放量`, `view` | `views` | Primary B站 stat. |
| `点赞`, `点赞数`, `like` | `likes` | Primary interaction. |
| `评论`, `评论数`, `reply` | `comments` | Native name often `reply`. |
| `收藏`, `收藏数`, `favorite` | `saves` | Primary B站 stat. |
| `分享`, `分享数`, `share` | `shares` | Primary B站 stat. |
| `弹幕`, `弹幕数`, `danmaku` | `nativeMetrics.danmaku` | Important for B站 review, not normalized yet. |
| `投币`, `硬币`, `coin` | `nativeMetrics.coin` | Important but not normalized yet. |
| `涨粉`, `粉丝增量` | `followersDelta` | Export-dependent. |
| `完播率`, `平均播放时长`, `充电`, `互动率` | `nativeMetrics` | Future review features. |

Suggested template:

```csv
稿件ID,BV号,标题,发布时间,播放量,点赞数,评论数,弹幕数,收藏数,分享数,投币数,涨粉,完播率,平均播放时长,选题
```

### 视频号 Preset

Confidence: medium-low until real exported files are available. Public sources confirm Video Account Assistant can show/export core metrics, but official header names are not publicly confirmed.

Recommended accepted headers:

| Native / Alias | Internal Mapping | Notes |
| --- | --- | --- |
| `视频ID`, `作品ID`, `feed_id`, `export_id` | `id` | Header names need real export confirmation. |
| `标题`, `描述`, `title`, `desc` | `title` | Video posts may be description-first. |
| `发布时间`, `创建时间`, `publish_time`, `created_at` | `publishedAt` | Convert platform date formats. |
| `播放量`, `播放`, `浏览量`, `view_count`, `play_count` | `views` | Public sources use 播放/浏览. |
| `点赞`, `点赞数`, `喜欢`, `like_count` | `likes` | Some tools distinguish 点赞/喜欢; preserve raw if both. |
| `评论`, `评论数`, `comment_count` | `comments` | Primary interaction. |
| `收藏`, `收藏数`, `favorite_count` | `saves` | Public sources mention 收藏 in some contexts. |
| `分享`, `分享数`, `转发`, `转发量`, `朋友圈转发`, `share_count`, `forward_count` | `shares` | Preserve friend-circle/group split if exported. |
| `涨粉`, `新增关注`, `follower_new` | `followersDelta` | Export-dependent. |
| `完播率`, `平均播放时长`, `播放时长`, `公众号阅读转化`, `引流点击`, `地域`, `流量来源` | `nativeMetrics` | Strongly useful for future reviews. |

Suggested template:

```csv
视频ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,朋友圈转发,涨粉,完播率,平均播放时长,公众号阅读转化,流量来源,选题
```

## Header Alias Matrix For Next Implementation

Recommended next task should add a provider-level alias registry with confidence flags:

```text
confirmed_official:
  douyin item_id/title/create_time/statistics.play_count/statistics.digg_count/statistics.comment_count/statistics.share_count/statistics.forward_count/statistics.download_count
  wechat ref_date/msgid/title/int_page_read_count/int_page_read_user/ori_page_read_count/share_count/share_user/add_to_fav_count/add_to_fav_user

mature_reference:
  bilibili aid/bvid/view/danmaku/reply/favorite/coin/share/like
  mediacrawler note_id/aweme_id/video_id/liked_count/digg_count/comment_count/collected_count/share_count/play_count/view_count

draft_realistic:
  xiaohongshu creator-center Excel headers
  video_account assistant Excel headers
```

## Risks / Unknowns

- 小红书 and 视频号 export headers are not confirmed from official public docs. Implementation should remain alias-tolerant and sample-driven.
- Export files may be `.xlsx`, not CSV. A real preset spec that only supports CSV will feel brittle.
- Some platforms distinguish exposure/read users/page views/play count. Do not collapse these metrics silently.
- `capturedAt` and `publishedAt` must be separated. WeChat especially has both publish/date and statistic-date concepts.
- B站 `reply` means comments; `danmaku` is a separate native metric and should not be mixed into comments.
- Douyin `share_count` and `forward_count` can both appear; preserve both if possible.
- 微信公众号 `new_user` and `cancel_user` are account/date-level metrics, not article-level metrics. Avoid attaching them to one article unless the export is row-scoped.

## Next Recommendation

Start `IMPORT-REAL-011` as a narrow spec/worker task:

1. Create a provider-level field alias registry and raw native metrics capture.
2. Add CSV + XLSX preview parsing, still before confirm-save.
3. Add one sample fixture per platform using the templates above.
4. Keep implementation inside Providers/UI import preview first; only touch Types/Service/Runtime/API after Orchestrator approves the native-metric storage shape.
5. Ask the user for one real exported file per platform to graduate `draft_realistic` headers into `confirmed_sampled`.

## Changed Files

- `docs/handoffs/IMPORT-REAL-010-worker-handoff.md`

## Verification Commands

```text
npm run typecheck
PASS

git diff --check -- docs/handoffs/IMPORT-REAL-010-worker-handoff.md
PASS

git diff --check --no-index -- /dev/null docs/handoffs/IMPORT-REAL-010-worker-handoff.md
PASS for whitespace; Git returned 1 because the file is new/different from /dev/null, with no whitespace-error output.

npm run verify:harness
PASS
```

## Orchestrator Decision Required

No for this Explorer/Spec handoff.

Yes before implementation if the next task wants to store `nativeMetrics/rawFields` durably, because that may require Types/Repo/Service/API changes that were explicitly out of scope in this round.
