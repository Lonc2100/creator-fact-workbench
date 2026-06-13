# 137 Entropy Governance

Goal: reduce project entropy without destructive cleanup.

Plain-language review note: identify duplicate code, stale docs, obsolete handoffs, and local workflow debris; codify rules and fold/archive references where safe, but do not delete files automatically.

Allowed scope:

- docs explaining entropy findings;
- non-destructive scan scripts;
- indexes/status docs;
- tests for scan/report behavior;
- this task handoff.

Forbidden:

- batch delete;
- `Remove-Item` without explicit user approval;
- modifying real operating DB rows;
- staging `.local`, `.agents`, `.codex`, `.trellis`.

Validation:

- `git diff --check`
- `npm run typecheck`
- targeted script/test checks for entropy report.
