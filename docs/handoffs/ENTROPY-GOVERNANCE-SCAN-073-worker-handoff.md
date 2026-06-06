# ENTROPY-GOVERNANCE-SCAN-073 worker handoff

## Task

- Task ID: `ENTROPY-GOVERNANCE-SCAN-073`
- Goal: rigorously assess filesystem entropy and establish a repeatable read-only entropy scan for untracked files, stale handoffs, unindexed specs, duplicate/stale scripts, `.local` evidence growth, real DB pollution, and test-data leakage.
- Started: 2026-06-07T00:50:00+08:00
- Finished: 2026-06-07T01:21:04+08:00
- Elapsed: about 31 minutes
- Workload class: normal
- `<15min explanation or extra-depth pass>`: not applicable; this task included local context reading, external reference check, scan implementation, report generation, governance doc update, and validation.

## Context read

- `AGENTS.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/README.md`
- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- `docs/context/index.md`
- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/task-board.md`
- `docs/quality-execution-system.md`
- `docs/product-specs/index.md`
- `docs/cleanup-manifest.md`

External reference check, per AGENTS "stand on giants" rule:

- OpenAI Harness Engineering: recurring entropy / garbage-collection guidance and golden principles.
- GitHub Spec Kit docs: spec/index/governance as durable workflow artifacts.
- Git `status --porcelain=v1 --untracked-files=all`: stable machine-readable status basis for the scanner.

## Completed work

- Added read-only entropy scanner:
  - `scripts/entropy-governance-scan.mjs`
  - npm command: `npm run scan:entropy`
- Added governance rule source:
  - `docs/entropy-governance.md`
- Linked the scan/isolation rule from existing governance docs:
  - `docs/golden-principles.md`
  - `docs/agent-playbook.md`
  - `docs/handoffs/README.md`
  - `docs/quality-execution-system.md`
  - `docs/context/index.md`
- Generated local scan reports:
  - `.local/entropy-governance-scan/report.json`
  - `.local/entropy-governance-scan/report.md`
- No files were deleted.
- No sqlite rows were inserted, updated, deleted, migrated, or vacuumed.

## Scan result summary

Latest command:

```bash
npm run scan:entropy
```

Result:

- Command status: PASS.
- Report path: `.local/entropy-governance-scan/report.md`
- Git modified count: 19.
- Git untracked count: 389.
- `docs/handoffs` files: 311.
- `docs/handoffs` untracked files: 249.
- `docs/product-specs` files: 44.
- `docs/product-specs` unindexed files: 26.
- `.local` files: 4105.
- `.local` total size: 509.87 MiB.
- `.local` sqlite/db count: 56.
- `.local` is over the scanner limits.
- `scripts` files: 43.
- `scripts` untracked files: 15.
- `scripts` not referenced by package scripts: 0.
- duplicate script candidate groups: 3.
- real operating DB suspect demo/smoke/test/acceptance records: 824.

Top `.local` growth buckets:

- `.local/douyin-personal-v0`: 1598 files, 219.9 MiB.
- `.local/bilibili-personal-v0`: 1164 files, 144.99 MiB.
- `.local/human-mouse-calendar-regression-066`: 24 files, 39.92 MiB.
- `.local/human-mouse-creator-workflow-qa-065`: 12 files, 11.44 MiB.
- `.local/screenshots`: 12 files, 5.98 MiB.

Real DB pollution evidence samples:

- `contents/smoke-real-001`
- `metrics/metric-smoke-real-001`
- `contents/smoke-douyin-1780306376558`
- `metrics/metric-douyin-smoke-douyin-1780306376558`
- `contents/smoke-mc-1780306376759`
- `ideas/idea-mediacrawler-smoke-mc-1780306376759`
- `contents/smoke-n8n-1780306376813`

The scanner treats these as suspect evidence, not as an automatic cleanup instruction.

## Classification

Must keep:

- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/README.md`
- `docs/product-specs/index.md`
- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- `scripts/entropy-governance-scan.mjs`
- `.local/self-media.sqlite`

Can archive:

- untracked or unreferenced historical handoffs sampled in `.local/entropy-governance-scan/report.json`;
- paused/diagnostic specs such as WeChat/backend and Bilibili account metrics drafts unless explicitly reopened;
- diagnostic/browser/discovery/preview scripts that are not current release commitments.

Can delete only after user confirmation:

- isolated smoke/e2e sqlite files under `.local/platform-operations-e2e/`, `.local/platform-personal-save-smoke/`, `.local/draft-review-ui-e2e-039/`, `.local/operating-e2e-*`, and similar task evidence directories;
- repeated old `main-session-smoke-self-media-038*.sqlite` evidence files;
- any deletion must be one explicit `Remove-Item -LiteralPath ...` per file/path after user confirmation.

Must migrate to logs or acceptance area:

- durable summaries from `.local/entropy-governance-scan/report.md`;
- `.local/platform-data-health/report.json`;
- `.local/local-data-quarantine/report.md`;
- selected screenshot/report summaries once accepted by Orchestrator.

Cannot move or delete without separate decision:

- `.local/self-media.sqlite`;
- Chrome profiles under `.local/*/chrome-profile/**`;
- cookies/tokens/credential-like files;
- raw platform capture directories;
- full trusted weekly reports or other private local creator evidence.

## Script duplicate candidates

- `<platform>-personal-discovery.mjs`:
  - `scripts/bilibili-personal-discovery.mjs`
  - `scripts/douyin-personal-discovery.mjs`
  - `scripts/video-account-personal-discovery.mjs`
  - `scripts/xiaohongshu-personal-discovery.mjs`
- `<platform>-personal-import.mjs`:
  - `scripts/bilibili-personal-import.mjs`
  - `scripts/douyin-personal-import.mjs`
  - `scripts/video-account-personal-import.mjs`
  - `scripts/xiaohongshu-personal-import.mjs`
- `<platform>-personal-save-smoke.mjs`:
  - `scripts/bilibili-personal-save-smoke.mjs`
  - `scripts/douyin-personal-save-smoke.mjs`
  - `scripts/video-account-personal-save-smoke.mjs`
  - `scripts/xiaohongshu-personal-save-smoke.mjs`

These are candidates for later review, not deletion instructions. Platform-specific scripts may still be valid when provider behavior diverges.

## Governance rules added

- Child-session smoke/E2E/acceptance must default to isolated DBs.
- Demo, fixture, seed, sample, test, smoke, e2e, and acceptance data must not be written into `.local/self-media.sqlite`.
- Live operating DB checks must be explicitly read-only and recorded as such.
- Handoffs must be indexed by current status only when active/current; historical bulk handoffs should go to a future archive index.
- Product specs must be indexed by `docs/product-specs/index.md` before being treated as active.
- `.local` evidence has a retention workflow: scan, classify, summarize, request user confirmation, then delete one path at a time if approved.

## Changed files

Expected task-owned files:

- `scripts/entropy-governance-scan.mjs`
- `docs/entropy-governance.md`
- `docs/handoffs/ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md`

Expected task-owned partial edits:

- `package.json`
- `docs/golden-principles.md`
- `docs/agent-playbook.md`
- `docs/handoffs/README.md`
- `docs/quality-execution-system.md`
- `docs/context/index.md`

Local generated reports, not for git staging:

- `.local/entropy-governance-scan/report.json`
- `.local/entropy-governance-scan/report.md`

Important note:

- During patching, `scripts/entropy-governance-scan.mjs` was initially created in the parent directory and then moved into the active project root. The parent `D:\codex work\自媒体创作\scripts` directory appears empty. It was not deleted because this task forbids deletion; remove it only after explicit user confirmation if desired.

## Verification

- `npm run scan:entropy`: PASS.
- `node --check scripts/entropy-governance-scan.mjs`: PASS.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"`: PASS.
- `git diff --check`: PASS.
- `git diff --check -- docs\entropy-governance.md docs\handoffs\ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md scripts\entropy-governance-scan.mjs package.json docs\golden-principles.md docs\agent-playbook.md docs\handoffs\README.md docs\quality-execution-system.md docs\context\index.md`: PASS.
- `rg -n "[ \t]+$" docs\entropy-governance.md docs\handoffs\ENTROPY-GOVERNANCE-SCAN-073-worker-handoff.md docs\golden-principles.md docs\agent-playbook.md docs\handoffs\README.md docs\quality-execution-system.md docs\context\index.md`: PASS, no matches.
- `rg -n "[ \t]+$" docs -g "*.md" -g "!docs/references/vendor/**"`: PASS, no matches.

Global note:

- `rg -n "[ \t]+$" docs -g "*.md"` reports trailing spaces only inside `docs/references/vendor/**`, which are third-party reference snapshots. They were not changed or reformatted by this task.

## Known issues

- The scanner currently samples archival candidates and delete-confirmation candidates to keep reports readable. The full lists are in `report.json`.
- Real operating DB pollution count is marker-based. It is strong evidence of test/smoke leakage, but cleanup still needs a separate backup and user-approved migration/delete plan.
- `.local` includes sensitive Chrome profile and raw-capture assets. These must remain local-only until a separate policy says otherwise.
- Existing worktree was already dirty before this task. Stage only the files/hunks owned by this task.

## Next recommendation

1. Orchestrator reviews this handoff and `.local/entropy-governance-scan/report.md`.
2. Create a separate archive-index task for historical handoffs/specs.
3. Create a separate DB quarantine/cleanup task for `.local/self-media.sqlite`, with backup first and no destructive action until user approval.
4. Create a `.local` retention task that lists exact old smoke/e2e artifacts for confirmation, then deletes one explicit path at a time only after approval.

## Orchestrator decision required

Yes, before any deletion, archive movement, DB cleanup, or broad handoff/spec indexing.
