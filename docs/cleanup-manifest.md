# Cleanup Manifest

## Rule

Do not batch delete files or directories. Parent-directory files are treated as cleanup candidates only. Deletion requires explicit confirmation and must use one explicit `Remove-Item -LiteralPath ...` command per file.

## Active Project Root

`D:\codex work\自媒体创作\Data Collection and Background Analysis`

## Parent Directory Candidates

The following paths are outside the active project root and may contain context-polluted or misplaced files from earlier work:

- `D:\codex work\自媒体创作\.github`
- `D:\codex work\自媒体创作\.local`
- `D:\codex work\自媒体创作\.next`
- `D:\codex work\自媒体创作\docs`
- `D:\codex work\自媒体创作\node_modules`
- `D:\codex work\自媒体创作\scripts`
- `D:\codex work\自媒体创作\src`
- `D:\codex work\自媒体创作\tests`
- `D:\codex work\自媒体创作\.gitignore`
- `D:\codex work\自媒体创作\AGENT_CONTEXT_BRIEF.md`
- `D:\codex work\自媒体创作\AGENTS.md`
- `D:\codex work\自媒体创作\next-env.d.ts`
- `D:\codex work\自媒体创作\next.config.mjs`
- `D:\codex work\自媒体创作\package-lock.json`
- `D:\codex work\自媒体创作\package.json`
- `D:\codex work\自媒体创作\README.md`
- `D:\codex work\自媒体创作\TRANSFER_TO_NEW_CHAT.md`
- `D:\codex work\自媒体创作\tsconfig.json`

## Cleanup Execution

Executed on 2026-06-01 after user confirmation. The parent directory now contains only:

- `D:\codex work\自媒体创作\Data Collection and Background Analysis`

Note: the parent `.git` directory was also removed because the user requested deleting everything except the active subfolder.

## Protected Until Decision

- `D:\codex work\自媒体创作\.git`
- `D:\codex work\自媒体创作\Data Collection and Background Analysis`

## Cleanup Gate

Do not delete anything from this manifest until:

- the user explicitly confirms cleanup scope;
- active target verification passes;
- any useful self-media work is intentionally migrated or intentionally discarded.
