# Product Specs

This index separates active release scope from paused or diagnostic-only work. Do not treat an item as active merely because a local draft exists.

## Active Release Baseline

- [Self-media AI Workbench](./self-media-workbench.md)
- [V1.5 Publish and Data Recovery Loop](./v1.5-publish-data-loop.md)
- [DOUYIN-PERSONAL-V0](./douyin-personal-v0.md)
- [XIAOHONGSHU-PERSONAL-V0](./xiaohongshu-personal-v0.md)
- [XIAOHONGSHU-PERSONAL-V1](./xiaohongshu-personal-v1.md)
- [VIDEO-ACCOUNT-PERSONAL-V0](./video-account-personal-v0.md)
- [VIDEO-ACCOUNT-PERSONAL-V1](./video-account-personal-v1.md)
- [BILIBILI-PERSONAL-V0](./bilibili-personal-v0.md)
- [Authenticated Browser Capture 085](./authenticated-browser-capture-085.md)
- Daily operator runbook: [self-media-daily-ops](../runbooks/self-media-daily-ops.md)
- Current release/status entrypoint: [CURRENT-PLATFORM-STATUS](../handoffs/CURRENT-PLATFORM-STATUS.md)
- Creator business loop baseline: [055 operating loop](../handoffs/MAINLINE-CREATOR-OPERATING-LOOP-V2-055-worker-handoff.md), [056 live hardening](../handoffs/MAINLINE-CREATOR-LOOP-LIVE-WALKTHROUGH-056-worker-handoff.md), [057 copilot discussion](../handoffs/MAINLINE-CREATOR-COPILOT-DISCUSSION-057-worker-handoff.md), [058 acceptance](../handoffs/MAINLINE-CREATOR-BUSINESS-LOOP-ACCEPTANCE-058-worker-handoff.md)

## Active Supporting Specs

- [CONNECTOR-001](./connector-001.md)
- [PUBLISH-001](./publish-001.md)
- [PREVIEW-001](./preview-001.md)
- [IDEA-001](./idea-001.md)
- [CONTENT-001](./content-001.md)
- [REVIEW-003](./review-003.md)
- [LEAD-001](./lead-001.md)
- [O2-SMOKE](./o2-smoke.md)
- [AGENT-TRAJECTORY-AUDIT](./agent-trajectory-audit.md)

## Release Closure Handoffs

- [Platform core commit 050](../handoffs/MAINLINE-PLATFORM-CORE-COMMIT-050-worker-handoff.md)
- [Package/tooling foundation 050](../handoffs/MAINLINE-PACKAGE-TOOLING-FOUNDATION-050-worker-handoff.md)
- [Operator UI data-only completion 051](../handoffs/MAINLINE-OPERATOR-UI-DATA-ONLY-COMPLETION-051-worker-handoff.md)
- [Daily ops reliability 052](../handoffs/MAINLINE-DAILY-OPS-RELIABILITY-052-worker-handoff.md)
- [Creator operating loop 055](../handoffs/MAINLINE-CREATOR-OPERATING-LOOP-V2-055-worker-handoff.md)
- [Creator loop live hardening 056](../handoffs/MAINLINE-CREATOR-LOOP-LIVE-WALKTHROUGH-056-worker-handoff.md)
- [Creator copilot discussion 057](../handoffs/MAINLINE-CREATOR-COPILOT-DISCUSSION-057-worker-handoff.md)
- [Creator business loop acceptance 058](../handoffs/MAINLINE-CREATOR-BUSINESS-LOOP-ACCEPTANCE-058-worker-handoff.md)
- [Authenticated browser persistent profiles 086](../handoffs/AUTHED-BROWSER-PERSISTENT-PROFILE-086-worker-handoff.md)
- [Import login capture UX 086](../handoffs/IMPORT-LOGIN-CAPTURE-UX-HARDENING-086-worker-handoff.md)
- [Xiaohongshu authenticated browser capture MVP 086](../handoffs/XIAOHONGSHU-AUTHED-BROWSER-CAPTURE-MVP-086-worker-handoff.md)
- [Video Account content-level discovery 086](../handoffs/VIDEO-ACCOUNT-CONTENT-LEVEL-DISCOVERY-086-worker-handoff.md)
- [Authenticated browser capture closure 086](../handoffs/MAINLINE-AUTHED-BROWSER-CAPTURE-CLOSURE-086-orchestrator-review.md)
- [Login capture auto-refresh 087](../handoffs/MAINLINE-LOGIN-CAPTURE-AUTO-REFRESH-087-worker-handoff.md)
- [Platform capture adapter reality 087](../handoffs/PLATFORM-CAPTURE-ADAPTER-REALITY-087-worker-handoff.md)
- [Live creator mouse walkthrough 087](../handoffs/LIVE-CREATOR-MOUSE-WALKTHROUGH-087-worker-handoff.md)
- [Login capture refresh closure 087](../handoffs/MAINLINE-LOGIN-CAPTURE-REFRESH-CLOSURE-087-orchestrator-review.md)
- [Login capture auto-open 088](../handoffs/MAINLINE-LOGIN-CAPTURE-AUTO-OPEN-088-worker-handoff.md)
- [Login capture return-to-preview 089](../handoffs/MAINLINE-LOGIN-CAPTURE-RETURN-PREVIEW-089-worker-handoff.md)
- [Usable creator mainline closure 090](../handoffs/MAINLINE-USABLE-CLOSURE-090-worker-handoff.md)
- [Import first screen consolidation 109](../handoffs/MAINLINE-IMPORT-FIRST-SCREEN-CONSOLIDATION-109-worker-handoff.md)
- [Content composer/library split 110](../handoffs/MAINLINE-CONTENT-COMPOSER-LIBRARY-SPLIT-110-worker-handoff.md)
- [Calendar scheduling/history split 111](../handoffs/MAINLINE-CALENDAR-SCHEDULING-HISTORY-SPLIT-111-worker-handoff.md)
- [Navigation and reviews cleanup 112](../handoffs/MAINLINE-NAVIGATION-REVIEWS-SURFACE-CLEANUP-112-worker-handoff.md)
- [Human creator workflow walkthrough 113](../handoffs/MAINLINE-HUMAN-CREATOR-WORKFLOW-WALKTHROUGH-113-worker-handoff.md)
- [Content schedule persistence fix 114](../handoffs/MAINLINE-CONTENT-SCHEDULE-PERSISTENCE-FIX-114-worker-handoff.md)
- [Usable creator release closure 115](../handoffs/MAINLINE-USABLE-RELEASE-CLOSURE-115-worker-handoff.md)
- Real refresh cycle / usable operations baseline:
  [User-assisted real capture 119](../handoffs/MAINLINE-USER-ASSISTED-REAL-CAPTURE-119-worker-handoff.md),
  [Freshness model alignment 120](../handoffs/MAINLINE-CAPTURE-FRESHNESS-MODEL-ALIGNMENT-120-worker-handoff.md),
  [Video Account and Bilibili import paths 121](../handoffs/MAINLINE-VIDEO-ACCOUNT-AND-BILIBILI-IMPORT-PATH-121-worker-handoff.md),
  [Startup refresh guidance 122](../handoffs/MAINLINE-STARTUP-REFRESH-CHECK-AND-REMINDER-122-worker-handoff.md),
  [Today refresh execution 123](../handoffs/MAINLINE-TODAY-REFRESH-EXECUTION-CYCLE-123-worker-handoff.md),
  [Real refresh cycle closure 124](../handoffs/MAINLINE-REAL-REFRESH-CYCLE-CLOSURE-124-worker-handoff.md).

## Paused / Diagnostic-Only

- WeChat Official Account / WeChat backend remains paused. Do not add `wechat-001.md`, `wechat-backend-v0.md`, `sync:wechat`, `discover:wechat-backend`, or `src/app/api/self-media/wechat/**` to active release scope without explicit reopening.
- Bilibili account metrics remain preview-only diagnostics. Local draft spec `bilibili-account-metrics-022.md` is not an active durable account snapshot save spec.
- Browser-only demos, UI E2E experiments, and local workflow assets require separate archive/diagnostic policy before being indexed as active specs.
