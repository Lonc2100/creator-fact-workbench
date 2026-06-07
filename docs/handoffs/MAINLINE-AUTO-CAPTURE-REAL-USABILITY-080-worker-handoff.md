# MAINLINE-AUTO-CAPTURE-REAL-USABILITY-080 worker handoff

## Scope

- Audited the real usability of auto capture, manual capture, and startup catch-up after tasks 074/075.
- Reconfirmed four-platform reality boundaries using official/authority sources first.
- Implemented one real closed-loop MVP: Bilibili local creator-center export CSV/XLSX parsing can be previewed and saved as trusted content-level metrics.
- Did not call any live platform API.
- Did not save account, password, cookie, token, header, raw request, raw response, comment body, danmu text, or browser login material.

## Official / authority source notes

- Douyin Open Platform OAuth/token: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/account-permission/get-access-token
- Douyin Open Platform video data / video management docs: https://developer.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/video-data/
- Douyin Open Platform create video docs: https://partner.open-douyin.com/docs/resource/zh-CN/dop/develop/openapi/video-management/douyin/create-video/video-create
- Bilibili Open Platform docs entry: https://openhome.bilibili.com/doc
- Bilibili Open Platform legacy docs entry: https://open.bilibili.com/doc
- Xiaohongshu Open Platform entry: https://open.xiaohongshu.com/
- Xiaohongshu Ark / business platform entry: https://ark.xiaohongshu.com/
- WeChat official developer docs entry: https://developers.weixin.qq.com/doc/
- WeChat Video Account assistant entry: https://channels.weixin.qq.com/

Public official docs still do not justify saying that a normal web login in Douyin/Video Account/Xiaohongshu/Bilibili can be read by this local app after refresh. OAuth/token/scope or explicit local browser assistance is still required for any automatic claim.

## Four-platform capture reality matrix

| Platform | Official API stable path | App review | OAuth/token/scope | Content-level data | Publish/draft | Scheduled auto capture | Current product state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Douyin | Future adapter candidate via Open Platform, not connected | Required | Required | Official docs indicate video data APIs behind authorization/permission | Official create-video path exists, not default | Only after app approval and authorization | Manual/browser-assisted only in product; automatic remains disabled |
| Bilibili | Future adapter candidate via Open Platform, not connected | Required/permission-bound | Required for account APIs | Open Platform path exists, but this product uses no live API yet | Future API candidate; default manual backend | Only after approved API authorization or explicit local session | MVP implemented: local creator-center export table -> trusted content metrics |
| Xiaohongshu | Cannot confirm stable public personal creator content API from public official docs | Not confirmed for this use case | Not confirmed for this use case | Not confirmed | Manual backend | No default automatic capture | Manual import/browser-assisted only; API label stays "待官方能力确认" |
| WeChat Video Account | Cannot confirm stable creator content data API from public official docs | Not confirmed for this use case | Not confirmed for this use case | Not confirmed | Manual Video Account assistant | No default automatic capture | Manual import/browser-assisted only; web login refresh is not capture |

## Implemented MVP

Selected platform: Bilibili.

Reason:
- It has the clearest content-level fallback path without relying on cookies/tokens: creator manually exports or copies a content table from the official creator center, then pastes/uploads locally.
- It avoids pretending that browser login equals system authorization.
- Account overview metrics remain preview-only and are not written into durable content totals.

Implementation:
- Added `ImportRequest.mode = "platform_local_file"` with `platformLocalFile.platform = "bilibili"` only.
- Added `SelfMediaService.parsePlatformLocalFilePayload()`:
  - Parses Bilibili CSV/XLSX via the existing preset provider.
  - Forces source to `bilibili_creator_center`.
  - Tags provenance as `operationKind: "platform_save"`, `trustedScopeEligible: true`, `dataDomain: "user_work"`.
  - Forces saved content/metrics to platform `bilibili`.
  - Adds compliance warning that this is manual local export import and does not read login state or save sensitive request material.
- Import UI now has a first-flow panel:
  - `B站本地导出回收 MVP`
  - paste Bilibili export CSV
  - preview fields
  - save to trusted content-level metric recovery
- Kept generic CSV behavior conservative: normal CSV imports still remain excluded from default trusted dashboard/reviews.
- Narrowed acceptance/demo quarantine text matching by removing `AI选题计划` from the broad acceptance-run title pattern. The hard `072验收` style markers still isolate acceptance data, while real creator-copilot drafts no longer get misclassified.

## Files changed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/providers/csv-preset-provider.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-AUTO-CAPTURE-REAL-USABILITY-080-worker-handoff.md`

Note: `csv-preset-provider.ts` was already dirty before this turn, but current committed service code already depended on its real preview/XLSX functions. It is included as necessary parsing infrastructure for the Bilibili local export MVP.

## Validation

- `npm run typecheck` PASS
- `npm run test:self-media` PASS
- `npm run test:ui-harness` PASS
- `npm run build` PASS
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page` PASS
- `git diff --check` PASS

Health check result:
- healthy port: 3200
- API ready: 3200
- trusted data ready: 3200
- page ready: 3200

## Recommended next work

1. Add file upload save path for Bilibili local export in the MVP panel, reusing the already supported `fileBase64` parser.
2. Add a "manual export checklist" per platform:
   - Bilibili: creator-center table import, content-level trusted after preview/save.
   - Douyin: API adapter candidate, manual/browser-assisted until OAuth connected.
   - Xiaohongshu: manual/browser-assisted only unless official creator data API is confirmed.
   - Video Account: manual/browser-assisted only unless official creator data API is confirmed.
3. Add browser-assisted session health as explicit session metadata before any scheduled browser capture is enabled.
4. Do not enable hourly/daily automatic capture until `captureConnectionStatus` is authorized/connected for that platform.
