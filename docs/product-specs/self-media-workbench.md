# Self-media AI Workbench

## Purpose

Build a local-first backend management and review workbench for self-media operations.

## Current Capabilities

- SQLite internal fact store.
- Fake/manual/CSV/JSON import providers.
- O1 structured logs, import runs, and audit records.
- Weekly/monthly review generation with structured data and Markdown.
- Dashboard UI for collection, queue, topics, metrics, reports, leads, and audit.

## Boundaries

- External tools enter through Providers.
- Internal records are the source of truth.
- UI and API routes do not call external tools directly.
- Legacy `data-collection` scaffold has been removed by `GC-001`.
