# Task Board

The Orchestrator owns task state. Workers, Explorers, and Auditors report through handoffs.

| ID | Phase | Task | Owner | State | Spec | Acceptance | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GOV-001 | Governance | Correct project root, exclude canvas context, define durable process | Orchestrator | Done | `docs/exec-plans/active/engineering-governance-correction.md` | `npm run verify:harness` | Passed 2026-06-01 |
| GOV-002 | Governance | Review parent-directory cleanup candidates without batch deletion | Orchestrator | Done | `docs/cleanup-manifest.md` | Parent contains only active folder | Passed 2026-06-01 |
| CORE-001 | Core Model | Define self-media entities and local persistence boundary | Worker | Done | `src/domain/self-media/types`, `src/domain/self-media/repo` | Typecheck + model contract tests | Passed 2026-06-01 |
| REVIEW-001 | Review Cockpit | Generate weekly/monthly review from internal records | Worker | Done | `src/domain/self-media/service/review-service.ts` | Fake/manual data review tests | Passed 2026-06-01 |
| AUD-001 | Audit | Check architecture boundaries and context pollution after GOV-001 | Auditor | Done | `docs/handoffs/AUD-001-auditor-report.md` | Auditor report + `npm run verify:harness` | Passed 2026-06-01 |
| QUAL-001 | Quality | Establish quality execution, observability stages, and golden principles | Orchestrator | Done | `docs/quality-execution-system.md`, `docs/golden-principles.md` | `npm run verify:harness` | Passed 2026-06-01 |
| OBS-001 | Observability | Add O1 structured error/log convention before Phase 1 code | Worker | Done | `docs/product-specs/observability-o1.md` | Typecheck + logging contract tests | Passed 2026-06-01 |
| GC-001 | Cleanup | Run recurring entropy cleanup after each phase | Auditor | Done | `docs/golden-principles.md` | Slim refactor report + `npm run verify:harness` | Passed 2026-06-01 |
| REF-001 | References | Download selected vendor references and enforce manifest test | Explorer | Done | `docs/references/vendor/REFERENCE_MANIFEST.md` | `npm run test:references` | Passed 2026-06-01 |
| UI-001 | UI | Build shadcn-style self-media backend shell from vendor references | Worker | Done | `src/domain/self-media/ui` | Build + browser smoke | Passed 2026-06-01 |
| IMPORT-001 | Import | Real CSV/JSON/manual data import into SQLite | Worker | Done | `docs/product-specs/import-001.md` | Import API + contract tests | Passed 2026-06-01 |
| REVIEW-002 | Review | Generate weekly/monthly review from imported data | Worker | Done | `docs/product-specs/review-002.md` | Imported-data review test + UI refresh | Passed 2026-06-01 |
| CONNECTOR-001 | Import | Platform CSV presets, MediaCrawler JSON, and n8n execution JSON | Worker | Done | `docs/product-specs/connector-001.md` | Connector contract tests | Passed 2026-06-01 |
| PUBLISH-001 | Publish | Publish queue state machine and API/UI transitions | Worker | Done | `docs/product-specs/publish-001.md` | Queue state tests + smoke | Passed 2026-06-01 |
| O2-SMOKE | Quality | Scripted browser smoke for imports, review, queue, and console errors | Auditor | Done | `docs/product-specs/o2-smoke.md` | `npm run test:smoke` | Passed 2026-06-01 |
| AGENT-TRAJECTORY-AUDIT | Quality | Check task/spec/handoff/auditor evidence for this phase | Auditor | Done | `docs/product-specs/agent-trajectory-audit.md` | `npm run test:agent-trajectory` | Passed 2026-06-01 |
| PREVIEW-001 | Import | Import preview and confirm-save flow | Worker | Done | `docs/product-specs/preview-001.md` | Preview contract + smoke | Passed 2026-06-01 |
| IDEA-001 | Planning | Topic pool with manual idea creation and status updates | Worker | Done | `docs/product-specs/idea-001.md` | Idea contract + UI | Passed 2026-06-01 |
| CONTENT-001 | Content | Convert selected ideas into draft content and queue items | Worker | Done | `docs/product-specs/content-001.md` | Idea-to-content contract + smoke | Passed 2026-06-01 |
| PUBLISH-002 | Publish | Lightweight calendar strip for weekly publish planning | Worker | Done | `docs/product-specs/publish-001.md` | UI smoke + queue transition | Passed 2026-06-01 |
| REVIEW-003 | Review | Review includes queue and monetization context | Worker | Done | `docs/product-specs/review-003.md` | Review contract tests | Passed 2026-06-01 |
| LEAD-001 | Monetization | Create leads and use them in review actions | Worker | Done | `docs/product-specs/lead-001.md` | Lead contract + smoke | Passed 2026-06-01 |
| V15-MODEL-001 | V1.5 | Platform versions, publish records, metric snapshots, saved reviews, actions, automation runs | Worker | Done | `docs/product-specs/v1.5-publish-data-loop.md` | `npm run test:self-media` | Passed 2026-06-01 |
| V15-API-001 | V1.5 | Runtime/API routes for calendar, platform versions, snapshots, reviews, actions, leads, automation | Worker | Done | `docs/product-specs/v1.5-publish-data-loop.md` | `npm run verify:harness` | Passed 2026-06-01 |
| V15-O2-001 | V1.5 | O2 smoke covers publish-to-review fact chain | Auditor | Done | `docs/handoffs/AUD-004-v1.5-backend-report.md` | `npm run verify:o2` | Passed 2026-06-01 |
| UI-H0 | UI Harness | Add Self-media UI Harness architecture, page boundaries, visual rules, QA, and references | Orchestrator | Done | `docs/ui-harness/ARCHITECTURE.md` | `npm run lint:arch` | Passed 2026-06-02 |
| UI-H1 | UI Harness | Add Tailwind + CSS variable visual foundation with Mixpost/Metabase direction | Worker | Done | `docs/product-specs/ui-harness-001.md` | `npm run build` | Passed 2026-06-02 |
| UI-H2 | UI Harness | Add primitives, components, patterns, and `/ui-lab` component state page | Worker | Done | `docs/product-specs/ui-harness-001.md` | `npm run test:ui-harness` | Passed 2026-06-02 |
| UI-H3 | UI Harness | Split one mixed workbench into page-boundary routes | Worker | Done | `docs/ui-harness/PAGE_BOUNDARIES.md` | `npm run test:smoke` | Passed 2026-06-02 |
| CALENDAR-003 | Publish | Drag-and-drop publish calendar with week/month views and filters | Calendar Worker | Done | `docs/product-specs/calendar-editor-001.md` | `npm run test:smoke` | Passed 2026-06-02 |
| EDITOR-001 | Content | Platform version editor for title/body/script/cover/schedule/checklist | Editor Worker | Done | `docs/product-specs/calendar-editor-001.md` | `npm run test:smoke` | Passed 2026-06-02 |
| REVIEW-004 | Review | Save weekly/monthly reviews and advance action item status | Review Worker | Done | `docs/product-specs/review-actions-001.md` | `npm run test:smoke` | Passed 2026-06-02 |
| AUD-006 | Quality | Audit editor/calendar/review boundaries and O2 evidence | Auditor | Done | `docs/handoffs/AUD-006-editor-calendar-review-report.md` | `npm run verify:o2` | Passed 2026-06-02 |
| MAINLINE-PLATFORM-CORE-COMMIT-050 | Release | Commit four-platform platform-core bundle | Worker | Done | `docs/handoffs/PLATFORM-CORE-STAGED-INDEX-REVIEW-049-auditor-handoff.md` | `git diff --cached --check`, staged include/exclude review | Commit `fdedf03`; handoff `docs/handoffs/MAINLINE-PLATFORM-CORE-COMMIT-050-worker-handoff.md` |
| MAINLINE-PACKAGE-TOOLING-FOUNDATION-050 | Release | Add package/tooling foundation for standard npm operation | Worker | Done | `docs/handoffs/PACKAGE-SCRIPT-HUNK-PLAN-049-auditor-handoff.md` | `npm run typecheck`, `npm run test:self-media`, platform smoke gates | Commit `bce1848`; handoff `docs/handoffs/MAINLINE-PACKAGE-TOOLING-FOUNDATION-050-worker-handoff.md` |
| MAINLINE-OPERATOR-UI-DATA-ONLY-COMPLETION-051 | Release | Complete operator data-only UI on fixed 3200 surfaces | Worker | Done | `docs/handoffs/CURRENT-PLATFORM-STATUS.md` | `npm run typecheck`, `npm run test:self-media`, `npm run test:ui-harness`, strict 3200 health | Commit `29a8734`; handoff `docs/handoffs/MAINLINE-OPERATOR-UI-DATA-ONLY-COMPLETION-051-worker-handoff.md` |
| MAINLINE-DAILY-OPS-RELIABILITY-052 | Release | Add daily operations reliability commands, health, audit, and runbook | Worker | Done | `docs/handoffs/CURRENT-PLATFORM-STATUS.md` | `npm run typecheck`, `npm run test:self-media`, platform ops smoke, strict 3200 health, daily gate | Commit `a22cbe3`; handoff `docs/handoffs/MAINLINE-DAILY-OPS-RELIABILITY-052-worker-handoff.md` |
| MAINLINE-RELEASE-STATUS-CLOSURE-053 | Release | Close release/status docs for the platform mainline baseline | Worker | Done | `docs/handoffs/CURRENT-PLATFORM-STATUS.md` | `git diff --check`, `npm run typecheck`, `npm run test:self-media` | Handoff `docs/handoffs/MAINLINE-RELEASE-STATUS-CLOSURE-053-worker-handoff.md` |

## State Rules

- Inbox: known but not aligned.
- Spec Aligned: scope and acceptance are durable.
- Assigned: Orchestrator has selected the agent role.
- In Progress: work has started.
- Review: awaiting Auditor or Orchestrator check.
- Done: acceptance evidence is recorded.
- Blocked: next action requires user decision or external state.
