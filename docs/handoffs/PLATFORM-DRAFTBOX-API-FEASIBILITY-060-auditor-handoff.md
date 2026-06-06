# PLATFORM-DRAFTBOX-API-FEASIBILITY-060 Auditor Handoff

## Task

- Task ID: `PLATFORM-DRAFTBOX-API-FEASIBILITY-060`
- Role: Auditor / Explorer
- Scope: Research only. No business code, no staging, no commit.
- Question: Can Douyin, Xiaohongshu, Video Account, and Bilibili be pushed into a draft box or publishing entry through official / authoritative paths?
- Safety boundary: Did not use or request cookies, passwords, tokens, headers, raw request details, or platform-private payloads.

## Executive Conclusion

| Platform | Conclusion | Draft box? | Publish entry? | Recommended product shape |
| --- | --- | --- | --- | --- |
| Douyin | Official API is available, but requires app permission and user OAuth/authorization. Treat as qualified official publishing adapter, not draft-box adapter. | Not confirmed by official docs reviewed. | Yes, official API can create/publish video after upload flow and review rules. Share SDK can also wake a share/publish flow, but is not backend automation. | `official-api-adapter` only after permission approval; always keep `export-package`, `open-official-backend`, and `manual-confirmation`. |
| Xiaohongshu | No confirmed public official note-publish API for ordinary creator notes. Official share SDK and creator web exist. | Not confirmed. | Only share wake-up / creator web manual path confirmed. | Do not build API adapter now. Use `export-package`, `open-official-backend`, `manual-confirmation`. Optional mobile share handoff only if app-side flow is in scope. |
| Video Account | Public official docs reviewed do not confirm short-video content publish/draft API. Official Video Account Assistant web is the reliable path. | Not confirmed. | Web assistant manual upload/management confirmed. Public APIs found are mainly shop/local-life/live/commerce data categories, not content publishing. | Do not build API adapter now. Use `export-package`, `open-official-backend`, `manual-confirmation`. |
| Bilibili | Official open platform indicates content/developer capabilities and identity/audit flow including draft/content distribution capability wording. Creator Center manual upload exists. Actual draft-box write is not confirmed. | Not confirmed. | Official API capability appears possible after identity/app/scope approval; manual creator center upload is confirmed. | Build only a gated `official-api-adapter` after Bilibili scope approval and endpoint-level doc review; keep manual web fallback and confirmation ledger. |

Plain-language product rule: do not promise "one-click push to draft box" across all four platforms. The honest v1 is "generate publish package, open official backend, and let the creator confirm publish result"; API automation can be a per-platform optional adapter where official permissions are proven.

## Evidence Records

### Douyin

1. Official Open Douyin create-video doc: https://partner.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/video-create
   - Authority: Official Douyin Open Platform / Partner Open Douyin documentation.
   - Applicability: Directly relevant to video creation/publishing.
   - Observed facts: Page exposes a create-video API, permission/scope wording, authorization/access flow, review/publish related wording, and SDK examples. The API path is for creating published platform content, not a clearly documented draft-box write.
   - Risk: Requires app qualification, permissions, user authorization, and platform review. Do not infer universal availability.

2. Official Douyin SDK / open platform docs: https://open.douyin.com/platform/resource/docs/develop/summarize/sdk/
   - Authority: Official Douyin Open Platform.
   - Applicability: Confirms supported official SDK integration path.
   - Observed facts: Official SDK route exists for integrating Douyin open capabilities.
   - Risk: SDK presence does not itself prove that an app has publish permission.

3. Official Douyin Creator Center: https://creator.douyin.com/
   - Authority: Official Douyin creator web.
   - Applicability: Manual publishing/backend fallback.
   - Observed facts: The page identifies itself as Douyin Creator Center / creator service platform with content management and related creator operations.
   - Risk: Web automation should not rely on private endpoints or credentials. Use as "open official backend" only.

### Xiaohongshu

1. Official Xiaohongshu Share Open Platform docs: https://agora.xiaohongshu.com/doc/android
   - Authority: Official Xiaohongshu share platform domain.
   - Applicability: Share/wake-up only, not backend note publishing.
   - Observed facts: The page metadata identifies "小红书分享开放平台" and share SDK / third-party integration. This supports a share handoff path, not silent server-side publishing.
   - Risk: Share SDK may still require user-side confirmation and app integration. It should not be modeled as draft-box API.

2. Official Xiaohongshu Open Platform API entry: https://open.xiaohongshu.com/document/api
   - Authority: Official Xiaohongshu open platform.
   - Applicability: API catalogue check.
   - Observed facts: The publicly surfaced open API area is not enough to confirm a creator-note publish or draft-box write API in this review.
   - Risk: Some partner capabilities may be gated or login-only. Mark "cannot confirm", not "does not exist".

3. Official Xiaohongshu Creator Service Platform: https://creator.xiaohongshu.com/
   - Authority: Official Xiaohongshu creator web.
   - Applicability: Manual creator publishing/backend fallback.
   - Observed facts: Page metadata says it supports publishing notes/videos, data analysis, fan management, and creator operations.
   - Risk: Web page existence does not authorize automated browser publishing.

### Video Account

1. Official Video Account Assistant: https://channels.weixin.qq.com/
   - Authority: Official WeChat / Tencent Video Account Assistant.
   - Applicability: Manual upload/management path.
   - Observed facts: Page metadata says Video Account Assistant provides creator content upload management and data query.
   - Risk: Treat as web/manual entry. Do not turn into private-endpoint automation.

2. WeChat official docs home: https://developers.weixin.qq.com/doc/
   - Authority: Official WeChat developer documentation.
   - Applicability: API catalogue check.
   - Observed facts: The docs home lists "视频号" as an official documentation category alongside mini program, official account, open platform, WeChat Pay, and store.
   - Risk: Category presence does not imply content publishing API.

3. Official Video Account docs: https://developers.weixin.qq.com/doc/channels/
   - Authority: Official WeChat developer documentation.
   - Applicability: API content check.
   - Observed facts: Reviewed navigation exposes basic credentials/quota, shop/local-life APIs, live dashboard data, compass/commerce data, and operating specifications. The reviewed public navigation did not surface a short-video content publish or draft-box endpoint.
   - Risk: This is a negative finding from public docs reviewed; mark as "cannot confirm" because partner-only capabilities may exist outside public docs.

### Bilibili

1. Official Bilibili Open Platform docs: https://open.bilibili.com/doc
   - Authority: Official Bilibili Open Platform.
   - Applicability: API and developer capability catalogue.
   - Observed facts: Page metadata describes developer open APIs, authorization/login, content, data, services, and solutions. Official app script text also indicates identity verification is needed before creating applications and having developer capabilities including manuscript/content distribution wording.
   - Risk: This supports "possible official API path after qualification", but does not by itself confirm unrestricted publish API availability or draft-box write.

2. Official Bilibili Creator Center upload page: https://member.bilibili.com/platform/upload/video/frame
   - Authority: Official Bilibili Creator Center.
   - Applicability: Manual web upload fallback.
   - Observed facts: Page title and metadata identify Bilibili Creator Center.
   - Risk: Use only as manual official backend entry unless Bilibili documents a sanctioned automation flow.

3. Official Bilibili Open Platform management flow evidence: https://open.bilibili.com/doc
   - Authority: Official Bilibili Open Platform frontend.
   - Applicability: Permission/qualification risk.
   - Observed facts: The official page includes identity authentication and permission-group management flows. This means API integration cannot be promised before approval.
   - Risk: Endpoint-level docs should be re-reviewed after login/approval without extracting private request details.

## GitHub / Mature Ecosystem Reference

| Reference | Applicability | Freshness / popularity signal | Authority | Risk use only |
| --- | --- | --- | --- | --- |
| GitHub xhs topic: https://github.com/topics/xhs | Shows unofficial Xiaohongshu crawler/automation ecosystem. | Topic ecosystem exists, but projects vary by age and maintenance. | Not official. | Treat as risk evidence only; do not copy cookie/session/private-request automation. |
| Postiz: https://github.com/gitroomhq/postiz-app | Mature open-source social scheduling architecture reference. | Large public project, active category. | Third-party. | Useful for queue/calendar/product patterns, not proof of China-platform publish permission. |
| Mixpost: https://github.com/inovector/mixpost | Mature self-hosted social media scheduling reference. | Established public project. | Third-party. | Useful for adapter design, not proof that Douyin/XHS/Video Account/Bilibili APIs are available. |

Assessment across applicability, timeliness, authority, popularity:

- Official docs outrank GitHub for platform permission conclusions.
- GitHub automation around `xhs` and similar Chinese-platform scraping is not product-safe for this repo because it often depends on browser/session/private endpoint behavior.
- Mature schedulers are useful for architecture: queue item, per-platform version, publish package, provider adapter, status ledger, and manual confirmation. They should not be used to justify bypassing platform rules.

## Platform-by-Platform Decision

### Douyin

- Classification: `official API available` plus `requires qualification/permission/OAuth`.
- Draft-box write: cannot confirm.
- Publish-entry / publish: confirmed as official create-video path, subject to permission and review.
- Human confirmation: still needed for product trust; platform review status and actual publish result should be confirmed or imported later.
- Web assist: open Creator Center as fallback.
- Recommendation:
  - Add only a gated official API adapter in future, behind capability flags such as `officialApiApproved`, `userAuthorized`, and `manualConfirmationRequired`.
  - Do not label this as "push to draft box".

### Xiaohongshu

- Classification: `only share wake-up` and `only web/manual confirmed`; official public note-publish API cannot be confirmed.
- Draft-box write: cannot confirm.
- Publish-entry / publish: creator web supports publishing notes/videos manually; share SDK may hand off to app-side share.
- Human confirmation: required.
- Web assist: open Creator Service Platform.
- Recommendation:
  - Do not build API adapter for note publishing now.
  - Export platform-ready package: title, body, tags, cover note, video/image assets, checklist.
  - Provide "open Xiaohongshu Creator Platform" and "mark manually published" actions.

### Video Account

- Classification: `only web/manual confirmed`; public official content publish API cannot be confirmed.
- Draft-box write: cannot confirm.
- Publish-entry / publish: Video Account Assistant supports content upload management manually.
- Human confirmation: required.
- Web assist: open Video Account Assistant.
- Recommendation:
  - Do not build API adapter now.
  - Use publish package export, open official backend, and manual confirmation.
  - Keep WeChat Official Account/backend paused; this task is about Video Account, not Official Account draft APIs.

### Bilibili

- Classification: `official API path likely available after qualification`, `requires identity/app/scope approval`, and `web/manual confirmed`.
- Draft-box write: cannot confirm.
- Publish-entry / publish: official open platform indicates content/developer capability and distribution wording; creator center manual upload confirmed.
- Human confirmation: required until endpoint-level approval and result mapping are verified.
- Web assist: open Bilibili Creator Center.
- Recommendation:
  - Future adapter must be gated by Bilibili identity verification, app approval, and permission group/scope approval.
  - Treat "official API adapter" as a later qualified provider, not a default v1 promise.

## Recommended Product Shape

1. `publish-package-export`
   - Always available for all four platforms.
   - Contains platform version fields, media files, cover note, tags, schedule suggestion, and a checklist.

2. `open-official-backend`
   - Douyin: open Creator Center.
   - Xiaohongshu: open Creator Service Platform.
   - Video Account: open Video Account Assistant.
   - Bilibili: open Creator Center upload page.

3. `manual-confirmation-ledger`
   - User records status: prepared, opened backend, submitted for review, published, failed, needs edit.
   - This matches existing project boundaries: publish ledger/manual records are not trusted metric evidence.

4. `official-api-adapter`
   - Only enable for Douyin and Bilibili after permissions are explicitly approved and endpoint-level docs are re-reviewed.
   - Never collect raw credentials in the UI or docs.
   - Store only safe capability status, operation ids, and sanitized result summaries.

5. `share-wakeup-adapter`
   - Only consider for Xiaohongshu/Douyin mobile app flows if future product scope includes mobile-side integration.
   - Must be labeled as user-confirmed share handoff, not backend auto-publish.

## Things Not Confirmed

- No platform was confirmed to support "write this prepared content into the creator's draft box" through a public official API.
- Xiaohongshu creator-note publish API was not confirmed from public official docs reviewed.
- Video Account short-video publish API was not confirmed from public official docs reviewed.
- Bilibili endpoint-level publish behavior, review state mapping, and draft behavior remain unconfirmed until approved docs/scope can be reviewed.
- Douyin "create video" is official, but whether it can create a non-public draft-box item is not confirmed.

## Changed Files

- Added: `docs/handoffs/PLATFORM-DRAFTBOX-API-FEASIBILITY-060-auditor-handoff.md`

## Verification

- PASS: `git diff --check`
  - Note: Git printed an existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it. No whitespace error was reported for this handoff.

## Known Issues / Risks

- Some official docs are frontend-rendered or login-gated. I used official page metadata, official navigation, and public official doc content where available, and marked ambiguous areas as "cannot confirm".
- Partner-only capabilities may exist but should not be treated as available until the project has official access and can review docs without capturing private request details.
- Browser/page automation that depends on logged-in creator sessions is not recommended as product behavior unless the platform explicitly allows it.

## Next Recommendation

- Orchestrator decision recommended: accept "publish package + open official backend + manual confirmation" as v1 product promise.
- Start separate future tasks only for:
  - Douyin official API adapter qualification review.
  - Bilibili official API adapter qualification review.
  - Xiaohongshu share handoff feasibility, if mobile app integration becomes in scope.
  - Video Account official API re-check, only if Tencent publishes or grants content publishing docs.

## Orchestrator Decision Required

Yes. The product label should change from "one-click push to draft box" to "official publishing handoff with manual confirmation, plus optional qualified API adapters".
