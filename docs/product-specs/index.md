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

## Paused / Diagnostic-Only

- WeChat Official Account / WeChat backend remains paused. Do not add `wechat-001.md`, `wechat-backend-v0.md`, `sync:wechat`, `discover:wechat-backend`, or `src/app/api/self-media/wechat/**` to active release scope without explicit reopening.
- Bilibili account metrics remain preview-only diagnostics. Local draft spec `bilibili-account-metrics-022.md` is not an active durable account snapshot save spec.
- Browser-only demos, UI E2E experiments, and local workflow assets require separate archive/diagnostic policy before being indexed as active specs.
