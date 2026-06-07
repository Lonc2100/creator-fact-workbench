# TRUSTED-WEEKLY-REPORT-EXPORT-035 worker handoff

## Scope

- Read:
  - `AGENTS.md`
  - `docs/handoffs/README.md`
  - `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
  - `docs/handoffs/TRUSTED-WEEKLY-REPORT-034-orchestrator-review.md`
  - `docs/handoffs/DASHBOARD-REALITY-COPY-033-orchestrator-review.md`
- Also followed project core context from `AGENTS.md`.
- Did not change collectors, WeChat, Bilibili account metric save behavior, or DB retention.
- Did not delete any DB or local output.

## External Reference

- Lightly referenced OWASP Logging Cheat Sheet guidance around excluding sensitive data from logs/exports: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

## Changes

- `scripts/trusted-weekly-report.mjs`
  - Keeps local full report output:
    - `.local/trusted-weekly-report/report.md`
    - `.local/trusted-weekly-report/report.json`
  - Adds redacted safe summary output:
    - `.local/trusted-weekly-report/redacted-summary.md`
    - `.local/trusted-weekly-report/redacted-summary.json`
  - Redacted summary keeps trusted totals, platform overview, performance ranks without titles, freshness, excluded counts, recommendation types, and consistency checks.
  - Redacted summary omits real content titles, content ids, account metrics, capture details, sensitive fields, platform interaction text, cookies, tokens, headers, and payload bodies.
  - Adds `--redacted-only` / `--safe-only` CLI mode.
- `package.json`
  - Adds `npm run report:trusted-weekly:safe`.
- `src/domain/self-media/types/self-media-types.ts`
  - Adds `TrustedWeeklyReportSummary`.
  - Adds `trustedWeeklySummary` to `DashboardSnapshot`.
- `src/domain/self-media/service/self-media-service.ts`
  - Builds a trusted weekly dashboard summary from already-filtered trusted dashboard/review data.
  - Summary does not read content titles or account metric snapshots.
- `src/domain/self-media/ui/screens/DashboardPage.tsx`
  - Adds a read-only "安全周报摘要" entry on Dashboard.
  - Copy says full weekly report is local evidence and external sharing must use redacted summary.
- `src/app/globals.css`
  - Adds compact responsive styles for the Dashboard summary entry.
- `tests/self-media-contract.test.ts`
  - Extends weekly report contract test to prove manual, smoke fixture, account metrics, and user-excluded content do not enter totals.
  - Proves redacted output contains trusted totals but not real titles, content ids, pollution values, account metric values, or sensitive field names.

## Outputs

- Full local evidence:
  - `.local/trusted-weekly-report/report.md`
  - `.local/trusted-weekly-report/report.json`
- Safe export summary:
  - `.local/trusted-weekly-report/redacted-summary.md`
  - `.local/trusted-weekly-report/redacted-summary.json`
- Screenshot:
  - `.local/trusted-weekly-report-export-035.png`

## Verification

- `npm run report:trusted-weekly` - PASS
- `npm run report:trusted-weekly:safe` - PASS
- `npm run test:self-media` - PASS, 98/98
- `npm run typecheck` - PASS
- `npm run verify:harness` - PASS
- `git diff --check` - PASS
- Browser screenshot check - PASS, Dashboard contains "安全周报摘要", "外发用 redacted 摘要", and "完整周报是本地证据".

## Known Issues

- Worktree had many existing unrelated dirty/untracked files before this task. This handoff only covers the files listed above.
- Full `.local/trusted-weekly-report/report.*` can still include real content titles and remains local evidence only.
- Redacted summary includes platform names and aggregate operating metrics by design.

## Next Recommendation

- Main session should decide whether redacted summaries should later get a dedicated API/download button. Current implementation keeps it as a CLI-generated safe export and read-only Dashboard summary.

需主会话判断: 是
