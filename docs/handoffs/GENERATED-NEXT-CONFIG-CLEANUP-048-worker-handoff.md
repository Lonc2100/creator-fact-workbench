# GENERATED-NEXT-CONFIG-CLEANUP-048 Worker Handoff

Date: 2026-06-05

## Task ID

GENERATED-NEXT-CONFIG-CLEANUP-048

## Scope

Clean generated Next/TypeScript config pollution from:

- `next-env.d.ts`
- `tsconfig.json`

Boundaries kept:

- Did not change business logic.
- Did not change `package.json`.
- Did not change `package-lock.json`.
- Did not delete files.
- Did not stage or commit.

## Required Context Read

- `AGENTS.md`
- `docs/handoffs/TOOLING-CONFIG-ATTRIBUTION-048-auditor-handoff.md`

## Changes

Removed timestamped temporary Next dist path pollution:

- `next-env.d.ts`
  - Restored route types reference to stable `./.next/types/routes.d.ts`.
- `tsconfig.json`
  - Removed timestamped `.next-*` / `.next-platform-*` include entries.
  - Restored stable include set:
    - `next-env.d.ts`
    - `src/**/*.ts`
    - `src/**/*.tsx`
    - `src/types/**/*.d.ts`
    - `.next/types/**/*.ts`

After cleanup, both `next-env.d.ts` and `tsconfig.json` are no longer dirty relative to Git.

## Verification

- `npm run typecheck`: PASS
- `git diff --check`: PASS
- trailing-whitespace check on this handoff: PASS

## Changed Files

This worker wrote:

```text
docs/handoffs/GENERATED-NEXT-CONFIG-CLEANUP-048-worker-handoff.md
```

The cleanup also normalized the current worktree contents of:

```text
next-env.d.ts
tsconfig.json
```

These two config files now match the stable Git baseline and do not appear in `git status --short -- next-env.d.ts tsconfig.json`.

## Notes

This task intentionally did not address `.gitignore`, `next.config.mjs`, `package-lock.json`, `scripts/smoke-self-media.mjs`, or `tests/agent-trajectory.test.mjs`. Those remain in their separate tooling/config or dependency/governance lanes from `TOOLING-CONFIG-ATTRIBUTION-048`.

## Orchestrator Decision Required

No for this cleanup itself.

Future staging still needs main-session bundle decisions for the remaining tooling/config dirty files.
