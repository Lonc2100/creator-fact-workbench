# MAINLINE-PRD-RECONCILIATION-045 Worker Handoff

Date: 2026-06-05

## Task ID

MAINLINE-PRD-RECONCILIATION-045

## Scope

- Produce a PRD gap matrix only.
- Read the requested entry files first:
  - `AGENTS.md`
  - `docs/handoffs/README.md`
  - `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - `docs/handoffs/MAIN-SESSION-HANDOFF-044-next-main-chat.md`
  - `docs/product-specs/index.md`
  - `docs/task-board.md`
- Keep work inside `D:\codex work\自媒体创作\Data Collection and Background Analysis`.
- Do not modify business code.
- Do not resume WeChat Official Account/backend work.

## Additional Context Read

- `docs/context/index.md`
- `docs/context/current-state.md`
- `docs/context/engineering-principles.md`
- `docs/context/decisions.md`
- `docs/context/llms.txt`
- `ARCHITECTURE.md`
- `docs/architecture/current-stage.md`
- `docs/mainline-framework.md`
- `docs/spec-governance.md`
- `docs/quality-execution-system.md`
- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- Accepted 041-044 decisions/reviews:
  - `docs/handoffs/OPERATOR-VIEW-DATA-ONLY-041-orchestrator-decision.md`
  - `docs/handoffs/CONTENT-PUBLISH-HISTORY-041-orchestrator-review.md`
  - `docs/handoffs/DAILY-OPS-REPORT-CONSOLIDATION-041-orchestrator-review.md`
  - `docs/handoffs/OPERATOR-HOME-041-orchestrator-review.md`
  - `docs/handoffs/DASHBOARD-DATA-ONLY-042-orchestrator-review.md`
  - `docs/handoffs/CONTENT-CALENDAR-DATA-ONLY-042-orchestrator-review.md`
  - `docs/handoffs/IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042-orchestrator-review.md`
  - `docs/handoffs/IMPORT-WARNING-COPY-DATA-ONLY-043-orchestrator-review.md`
  - `docs/handoffs/DAILY-OPERATING-CLOSURE-043-orchestrator-review.md`
  - `docs/handoffs/DASHBOARD-NUMBER-TRUST-AUDIT-043-orchestrator-review.md`
  - `docs/handoffs/DASHBOARD-LIVE-NUMBER-AUDIT-044-orchestrator-review.md`
  - `docs/handoffs/CALENDAR-REAL-SCHEDULING-WORKFLOW-044-orchestrator-review.md`
  - `docs/handoffs/OPERATOR-UX-FINAL-POLISH-044-orchestrator-review.md`
- Product specs from `docs/product-specs/index.md`, plus adjacent task-board specs where needed:
  - `self-media-workbench.md`
  - `import-001.md`
  - `connector-001.md`
  - `preview-001.md`
  - `review-002.md`
  - `publish-001.md`
  - `o2-smoke.md`
  - `agent-trajectory-audit.md`
  - `idea-001.md`
  - `content-001.md`
  - `review-003.md`
  - `lead-001.md`
  - `v1.5-publish-data-loop.md`
  - `import-real-011.md`
  - `xiaohongshu-personal-v0.md`
  - `xiaohongshu-personal-v1.md`
  - `video-account-personal-v0.md`
  - `video-account-personal-v1.md`
  - `bilibili-personal-v0.md`
  - `bilibili-account-metrics-022.md`
  - `content-workflow-011.md`
  - `review-action-backend-011.md`
  - `wechat-001.md`
  - `wechat-backend-v0.md`

Note: no new external-solution research was performed because this task is a no-code internal reconciliation, not a design or implementation task. Existing PRDs already contain the relevant external reference checks where model-shape inspiration mattered, especially `bilibili-account-metrics-022.md`.

## Method

- Treat `docs/task-board.md` as implementation/evidence history.
- Treat `docs/handoffs/CURRENT-PLATFORM-STATUS.md` and accepted 041-044 reviews as the current product acceptance layer.
- If an older task is `Done` but a later accepted decision says it is internal, preview-only, not accepted, or paused, the later accepted decision wins.
- This matrix is a product-surface reconciliation, not a fresh code audit or live browser walkthrough.

## PRD Gap Matrix

### Already usable now

| Capability / PRD area | Current product classification | Evidence basis | Boundaries |
| --- | --- | --- | --- |
| Local-first self-media fact store and workbench baseline | Usable as the current product foundation | `self-media-workbench.md`; task-board CORE/IMPORT/REVIEW/UI entries; current status | Local-first SQLite remains the accepted operating profile. |
| Manual/CSV/JSON import, connector imports, preview, and confirm-save | Usable now | `import-001.md`, `connector-001.md`, `preview-001.md`; task-board Done entries | Default dashboard/review scope should not use untrusted/demo/smoke/local-debug rows. |
| Four active content-level platform loops: Douyin, Xiaohongshu, Video Account, Bilibili archives | Usable now for trusted content-level operations | Current status: four content-level loops closed; `/import` preview/save/smoke accepted | WeChat is excluded; Bilibili account-level metrics are excluded from durable saves and content totals. |
| `/dashboard` trusted operating dashboard | Usable now | `DASHBOARD-DATA-ONLY-042`; `DASHBOARD-LIVE-NUMBER-AUDIT-044`; live totals accepted: 18 trusted contents, 18 snapshots, 344377 views, 4258 engagement | Internal diagnostics stay collapsed/hidden. Long action lists can still use polish. |
| `/import` four-platform operator surface | Usable now | `IMPORT-REVIEWS-DATA-ONLY-AND-GATE-042`; `IMPORT-WARNING-COPY-DATA-ONLY-043`; platform ops gate restored PASS | Provider ids, raw dirs, run ids, fixture/smoke wording stay in advanced diagnostics only. |
| `/reviews` weekly/monthly content-level review | Usable now | `review-002.md`, `review-003.md`; current status; 042 import/reviews cleanup | Account-level metrics remain separate and must not affect total views, total engagement, best platform, or saved content snapshot ids. |
| `/content` workbench, draft review, read-only publish history | Usable now | `CONTENT-PUBLISH-HISTORY-041`; `CONTENT-CALENDAR-DATA-ONLY-042`; current status | Publish records are local manual confirmations, not platform API proof or trusted metric evidence. |
| `/calendar` real scheduling workflow | Usable now | `CALENDAR-REAL-SCHEDULING-WORKFLOW-044` | Scheduling updates content/platform-version/queue state only; it does not publish or create publish ledger records. |
| Post-import suggestions -> internal action items -> content drafts | Usable now as a user-triggered workflow | Current status: suggestions convert to action items; action items convert to content/schedule drafts after trusted evidence validation | No auto-conversion; action-generated drafts are workflow data, not trusted metric evidence. |
| Safe weekly redacted export/API summary | Usable now for shareable summary | Current status: `report:trusted-weekly:safe` and `/api/self-media/reports/trusted-weekly-safe` accepted | Full local weekly report remains local/internal because it can include real content titles. |

### Usable but needs product polish

| Capability / PRD area | Current product classification | Product gap | Recommended next action |
| --- | --- | --- | --- |
| Dashboard action/task operating panel | Usable, accepted, but can get dense | 044 says long action lists are acceptable for now but should become paginated, grouped, or collapsed as real data grows | `ACTION-QUEUE-ERGONOMICS-045` after live walkthrough confirms density pain. |
| Calendar real scheduling | Usable, accepted, but ergonomics can improve | 044 recommends denser pending queue controls, clearer date focus, and better drag target affordances | Continue calendar product polish without changing metric trust boundaries. |
| Content workbench exclusion/status controls | Usable, accepted, but interaction weight can improve | 042 notes the "不计入看板" action is visually heavy | Move to quieter status/menu treatment in a future UI polish task. |
| Topic ideas and monetization leads | Implemented historically, but not revalidated as 041-044 main operator surfaces | `IDEA-001` and `LEAD-001` are Done, but current accepted surface baseline focuses on `/dashboard`, `/import`, `/content`, `/calendar`, `/reviews` | Live walkthrough should confirm whether idea/lead surfaces are exposed and whether their copy/layout follows Operator View Data Only. |
| Secondary or legacy top-level pages, including overview/leads if exposed | Potentially usable, but not current accepted operator-first baseline | 044 handoff recommends remaining surface polish for secondary pages; `/ui-lab` is explicitly internal | `REMAINING-SURFACE-POLISH-045` should hide or polish these surfaces. |

### Internal-only and should stay hidden

| Capability / PRD area | Current classification | Why it should stay hidden by default |
| --- | --- | --- |
| `/ui-lab` | Internal component-lab surface | 044 explicitly says it is not part of the accepted operator-first product surface unless a future task polishes or hides it. |
| Advanced diagnostics on dashboard/import/reviews/content/calendar | Internal-only | 041 rule requires paths, commands, API URLs, run ids, raw dirs, evidence files, preflight/pageReady/apiReady, smoke/demo/fixture wording, and implementation diagnostics to stay collapsed or in debug views. |
| Daily ops safe report command and full local daily reports | Internal/operator artifact | 041 accepted `report:daily-ops:safe` as internal; local paths, URLs, port readiness, and smoke terminology are not default UI material. |
| Local server health, trusted dashboard audit, dashboard number audit, platform health, freshness, smoke/E2E reports | Internal verification harness | These are valuable gates but should summarize as business readiness/freshness only in user-facing views. |
| Bilibili account metrics preview diagnostics: `accountMetrics`, `dateKeyRows`, graph/compare rows | Internal preview-only | Current status and `bilibili-account-metrics-022.md` forbid saving them into durable content metrics or durable account snapshots yet. |
| All-local/debug data rows: demo, smoke, manual, csv, MediaCrawler, n8n, paused WeChat, unknown local rows | Hidden from default operating views | Current status says they remain stored but excluded from dashboard/review/action-suggestion totals unless the user explicitly selects all-local/debug scope. |
| Raw provider warning details and provenance internals | Internal diagnostics | 043 accepted business-facing warning copy and moved provider/source/run/raw details to advanced diagnostics. |
| Full trusted weekly local report | Local/internal artifact | Safe/redacted summary is shareable; full local report can contain real titles and private operating details. |

### Not implemented

| Capability / PRD area | Current status | Reason / note |
| --- | --- | --- |
| Live platform publishing APIs | Not implemented and still a non-goal | `publish-001.md`, `v1.5-publish-data-loop.md`, and 044 boundaries keep publishing manual/confirmed; no real platform publish API is authorized. |
| Durable Bilibili account snapshot save | Not implemented / not approved | `AccountMetricSnapshot` exists as a model concept, but Bilibili account snapshot save is not approved; account preview needs canonical daily-row proof and dedupe first. |
| Bilibili account metric dedupe and normalized account trend pipeline | Not implemented | `bilibili-account-metrics-022.md` requires endpoint-level dedupe, metric semantics, and dashboard/review separation before durable use. |
| Durable `nativeMetrics` / `rawFields` storage expansion for real import preview | Not implemented as a confirmed durable storage decision | `import-real-011.md` leaves durable owner of native/raw preview data and `capturedAt` expansion as open decisions. |
| O3 local observability stack | Not implemented | `o2-smoke.md` keeps browser smoke at O2; Chrome trace dashboards/full local observability stack remain O3. |
| Postgres, user accounts, permissions, multi-user/cloud deployment | Not implemented / deferred | `v1.5-publish-data-loop.md` defers these beyond the local-first internal fact system. |
| Notifications/reminders or third-party task manager for review actions | Not implemented and non-goal | `review-action-backend-011.md` explicitly excludes reminders, notifications, and third-party task manager integration. |
| Competitor and experiment modules from stage architecture | Not implemented as accepted PRD/task-board capabilities | Architecture lists them as possible backend modules, but current task board does not show accepted delivery comparable to import/content/review/publish. |
| Public-content crawling, topic/recommendation imports, private-message import, comment/danmu body import | Not implemented and generally out of scope | Platform V0/V1 specs repeatedly exclude public crawling, private messages, and comment body imports from durable tracked files. |
| Operator-first productization of `/ui-lab` | Not implemented | 044 keeps `/ui-lab` internal; future task should either hide it from operator navigation or productize it explicitly. |

### Explicitly paused

| Capability / PRD area | Pause status | Do not do next |
| --- | --- | --- |
| WeChat Official Account / backend work | Explicitly paused in current platform status | Do not resume WeChat backend discovery, mapping, sync, public-account backend work, or trusted operating inclusion unless the user explicitly reopens scope. |
| WeChat DataCube official real sync | Blocked/paused | `WECHAT-PERM-001` is blocked by `48001 api unauthorized`; historical `WECHAT-001` implementation/test status must not be treated as current usable real sync. |
| Paused WeChat rows in default operating views | Explicitly excluded | Do not include paused WeChat data in default dashboard/review/action-suggestion totals. |

Note on Bilibili account metrics: this is not the same pause state as WeChat. The preview is allowed as internal diagnostics, but durable save and account-dashboard integration remain not implemented/not approved.

## Completed Work

- Reconciled PRD/task-board status against current platform status and accepted 041-044 decisions.
- Classified product surface into the five requested buckets:
  - Already usable now
  - Usable but needs product polish
  - Internal-only and should stay hidden
  - Not implemented
  - Explicitly paused
- Wrote this durable handoff.
- No business code changes.

## Changed Files

- `docs/handoffs/MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md`

## Verification Commands And Results

- `git diff --check`: PASS for tracked working-tree diffs, with existing warning that `tsconfig.json` CRLF will be replaced by LF the next time Git touches it.
- `git status --short -- docs/handoffs/MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md`: PASS, shows only the new untracked handoff file.
- `Select-String -Path docs/handoffs/MAINLINE-PRD-RECONCILIATION-045-worker-handoff.md -Pattern '[ \t]+$'`: PASS, no trailing whitespace matches.
- No typecheck, harness, browser, server, E2E, or live 3200 walkthrough was run because this task is docs-only PRD reconciliation.

## Known Issues / Residual Risk

- This is a document reconciliation, not a fresh browser walkthrough. Current UI could still drift after the accepted handoffs if unreviewed code changes exist.
- The matrix intentionally treats accepted durable docs as source of truth. A live product audit should follow under `LIVE-OPERATOR-WALKTHROUGH-045`.
- Some historically Done PRDs may still exist in code/UI but are not part of the accepted 041-044 operator-first surface until revalidated.

## Next Recommendation

1. Run `LIVE-OPERATOR-WALKTHROUGH-045` read-only on fixed 3200 for `/dashboard`, `/import`, `/content`, `/calendar`, `/reviews`, and exposed top-level entries.
2. If walkthrough confirms dashboard task density pain, run `ACTION-QUEUE-ERGONOMICS-045`.
3. Run `REMAINING-SURFACE-POLISH-045` for `/ui-lab`, overview/leads if exposed, and any page that still shows internal/debug copy by default.
4. Keep WeChat paused unless the user explicitly reopens it.
5. Keep Bilibili account metrics preview-only until a separate approval and durable account-snapshot acceptance path exists.

## Orchestrator Decision Required

No for accepting this reconciliation handoff.

Future Orchestrator/user decisions are required only if scope expands into paused WeChat work, durable Bilibili account metrics, live publishing APIs, or secondary-surface productization.
