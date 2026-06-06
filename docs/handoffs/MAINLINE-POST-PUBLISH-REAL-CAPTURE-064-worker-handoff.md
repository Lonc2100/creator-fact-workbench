# MAINLINE-POST-PUBLISH-REAL-CAPTURE-064 Worker Handoff

## Runtime

- Started: 2026-06-06
- Finished: 2026-06-06T12:43:23+08:00
- Workload class: mainline feature slice

## Scope

- Fixed live entry: `http://localhost:3200/dashboard`.
- Upgrade the 063 creator-day metric recovery proof into a visible post-publish data recovery assistant.
- Do not restore WeChat Official Account.
- Keep Bilibili account metrics preview-only.
- Do not call real publish APIs.
- Do not store cookie/token/password/header/raw payload.
- Keep 063 creator day workflow contract passing.

## Reference Check

Per `AGENTS.md`, I checked mature workflow shape before implementation. The applicable pattern is: creator dashboards surface post-publish/content performance in visible status views, while collection/refresh remains explicit. No external code was copied.

## Implemented

- Added `postPublishRecoveryItems` to `PublishToMetricsWorkbench`.
- Each recovery item now exposes:
  - local content title
  - platform
  - published/scheduled time
  - official backend URL and label
  - explicit manual refresh action
  - manual steps for the platform
  - latest import run/status/time
  - whether the latest import is usable for this post-publish recovery
  - match status
  - attribution status
  - candidate count and best score
  - attributed metric snapshot count
- `/import#post-publish-refresh` now renders a table with:
  - 待回收内容
  - 平台 / 发布时间
  - 建议刷新动作
  - 最近导入状态
  - 匹配 / 归因
  - manual action links
- Existing `postPublishRefresh` remains as the narrower "still waiting for metrics" list, so current dashboard counts stay stable.
- Matching remains manual:
  - imported platform content creates candidates
  - metrics are not attributed to the local content until the user confirms the candidate
- Same-day metric snapshots now count as recovered for same-day published content because snapshot storage is date-granular.
- `/dashboard` and `/import` are now `force-dynamic`, matching `/content` and `/calendar`, so production build does not prerender them against a locked local SQLite DB.

## State Model

- `needs_capture`: no usable latest platform import/candidate yet.
- `captured_no_candidate`: latest successful import exists, but no candidate is available.
- `candidate_ready`: imported content matched enough to show a candidate; attribution still requires user confirmation.
- `attributed`: metric snapshots are already copied to the local content/platform version.

## Boundaries Preserved

- Four active platforms only: 抖音 / 小红书 / 视频号 / B站.
- 公众号 remains paused; no route or UI was restored.
- Bilibili account metrics remain preview-only and do not enter content totals.
- No real publish API calls were added.
- No login material, headers, cookies, tokens, passwords, or raw payloads are stored or surfaced.
- Manual steps say exactly what the user must do; no background auto-capture is implied.

## Verification

PASS:

- `npm run typecheck`
- `npm run test:self-media`
  - 129 tests PASS.
  - 063 creator day workflow contract still PASS.
- `npm run test:ui-harness`
  - 15 tests PASS.
- `npm run build`
  - PASS after making `/dashboard` and `/import` dynamic.
  - Route table shows paused WeChat sync route remains absent.
- `npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page`
  - healthy port: 3200
  - API ready: 3200
  - trusted data ready: 3200
  - page ready: 3200
- Live browser:
  - `http://localhost:3200/dashboard` loaded from fixed entry and showed post-publish path signals.
  - `http://localhost:3200/import#post-publish-refresh` showed 发布后回收助手, 待回收内容, 建议刷新动作, 最近导入状态, and 匹配 / 归因.
- `git diff --check`
  - PASS.

## Files Changed

- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/import/page.tsx`
- `tests/self-media-contract.test.ts`
- `tests/ui-harness.test.mjs`
- `docs/handoffs/MAINLINE-POST-PUBLISH-REAL-CAPTURE-064-worker-handoff.md`

## Commit / Push

- Commit: completed as `feat(self-media): guide post-publish capture recovery`.
- Push: completed to `origin/main`.
