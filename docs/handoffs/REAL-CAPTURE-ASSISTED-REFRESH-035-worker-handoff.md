# REAL-CAPTURE-ASSISTED-REFRESH-035 Worker Handoff

## Task

Move real-capture freshness from a command-only report into an operator-assisted, read-only refresh loop.

## Context Read

- `AGENTS.md`
- `docs/handoffs/README.md`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/REAL-CAPTURE-REFRESH-034-orchestrator-review.md`
- `docs/runbooks/self-media-daily-ops.md`
- Core project context required by `AGENTS.md`: context index, architecture, mainline framework, task board, spec governance, workflow boundaries, current stage, and agent playbook.

External reference checked for screenshot evidence only:

- Playwright official screenshots docs: <https://playwright.dev/docs/next/screenshots>

## Completed Work

- Enhanced `.local/real-capture-freshness/report.json` and `report.md` with per-platform assisted next actions.
- Added structured command plan per content-level platform:
  - preview command
  - save command
  - health command
  - freshness command
  - trusted audit command
  - daily gate command
- Added explicit manual-step copy per platform. The report only instructs the operator; it does not collect, log in, open real platforms, read credentials, write DB rows, or touch WeChat.
- Added Bilibili-specific boundary text: archives/content-level refresh only; account-level metrics remain preview-only.
- Extended platform data health report JSON with `realCaptureStatus`, `nextAction`, and `commands`.
- Extended service/UI types and safe report reader so `/import` can show those fields without reading platform response bodies.
- Updated `/import` platform data health panel to show:
  - real capture freshness status: `fresh`, `stale`, `missing`, or `unknown`
  - latest real capture time
  - latest smoke time
  - latest audit time
  - per-platform preview/save/audit/gate commands
  - read-only next-action cards
- Added regression tests for:
  - fresh smoke not standing in for stale real capture
  - assisted freshness report command plan
  - report/view ignoring sensitive raw fields from report fixtures
  - WeChat staying paused in real-capture scope
  - Bilibili account metrics staying preview-only
  - UI view exposing safe assisted commands only

## Changed Files

- `scripts/platform-data-health.mjs`
- `scripts/real-capture-freshness-check.mjs`
- `src/domain/self-media/types/self-media-types.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `src/domain/self-media/ui/screens/ImportPage.tsx`
- `src/app/globals.css`
- `tests/self-media-contract.test.ts`
- `docs/handoffs/REAL-CAPTURE-ASSISTED-REFRESH-035-worker-handoff.md`

Local-only generated evidence:

- `.local/real-capture-freshness/report.json`
- `.local/real-capture-freshness/report.md`
- `.local/platform-data-health/report.json`
- `.local/platform-data-health/report.md`
- `.local/real-capture-assisted-refresh-035.png`

## Verification

- `npm run check:real-capture-freshness`: PASS
  - status: `pass`
  - stale platforms: none
  - missing platforms: none
- `npm run health:platform-data`: PASS
  - status: `ok`
  - checks: ok=14, warn=0, error=0
- `npm run test:self-media`: PASS
  - 98/98 tests passing
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
  - includes typecheck, context check, architecture lint, structure, references, UI harness, self-media, entropy, agent trajectory, and template doctor
- `git diff --check`: PASS
- Screenshot: PASS
  - saved to `.local/real-capture-assisted-refresh-035.png`
  - Playwright checked the assisted action area includes four-platform import/audit/gate commands and does not surface paused WeChat commands or Bilibili account-metrics preview commands.

## Safety Boundary

- No DB deletion, migration, or cleanup was performed.
- No real platform login, browser collection, or automatic platform opening was added.
- No password, cookie, token, header, credential, comments, danmu text, private account details, or original platform response body content was read into the UI or handoff.
- WeChat Official Account remains paused.
- Bilibili account-level metrics remain preview-only and are not promoted into durable account snapshots or content totals.
- `/import` health area remains read-only; it displays commands as operator guidance and does not run them.

## Known Issues

- The repository already had a large dirty/untracked worktree before this task. I only changed the files listed above and did not revert unrelated work.
- The screenshot was taken against the existing local `127.0.0.1:3200` service after confirming `/import` returned HTTP 200.
- The page still shows local operation-history summaries from the current local environment. The screenshot should be treated as local UI evidence, not a redacted public artifact.

## Next Recommendation

Orchestrator should review the diff and decide whether this assisted freshness UI is sufficient for daily operators, or whether a later task should add a compact dashboard variant of the same read-only action cards.

## Orchestrator Decision Required

Yes.
