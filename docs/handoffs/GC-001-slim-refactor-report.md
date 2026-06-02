# Slim Refactor Report: GC-001

## Task ID

GC-001

## Goal

Remove stale scaffold entropy after the self-media workbench became the active product module.

## Removed Complexity

- Removed inactive `src/domain/data-collection` Harness module.
- Removed inactive `/data-collection` page and API demo route.
- Removed obsolete data-collection product spec and bootstrap exec plan.
- Renamed package metadata to `self-media-ai-workbench`.
- Added entropy regression test so legacy scaffold paths cannot silently return.

## Preserved Contract

- Active product module remains `src/domain/self-media`.
- Fixed dependency direction remains `Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI`.
- Reference, SQLite, provider, review, build, and browser-smoke contracts remain unchanged.

## Verification

- `npm run verify:harness` passed on 2026-06-01.
- `npm run build` passed on 2026-06-01.
- Build route output no longer includes `/data-collection` or `/api/data-collection/demo`.
- `tests/entropy-cleanup.test.mjs` proves legacy scaffold paths stay removed.

## Known Risks

- Historical handoff docs still mention `data-collection` as past context. They are retained as audit history, not active instructions.
- Historical handoff docs still mention `data-collection` as past context. They are retained as audit history, not active instructions.
