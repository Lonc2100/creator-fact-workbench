# CreatorFact Workbench

CreatorFact Workbench is a local-first operating system for self-media creators: content planning, publishing calendar, metrics snapshots, weekly/monthly reviews, and monetization follow-up.

中文名：自媒体 AI 工作台。

## Why It Exists

Self-media work is often scattered across platform dashboards, spreadsheets, notes, chats, and memory. CreatorFact turns that workflow into an internal fact system:

```text
content drafts -> platform versions -> publishing calendar -> publish records -> metrics snapshots -> weekly/monthly reviews -> action items -> lead follow-up -> next content plan
```

The core principle is simple: external information must be stored internally before analysis, review, or AI assistance.

## Current Features

- Local-first Next.js workbench for self-media operations.
- SQLite-backed internal facts for content, platform versions, metrics, reviews, actions, leads, and automation runs.
- CSV presets for Douyin, Xiaohongshu, WeChat Official Account, WeChat Channels, and Bilibili.
- MediaCrawler JSON and n8n execution JSON import boundaries.
- Import preview/diff before confirmed save.
- Publishing calendar and platform-version status model.
- Weekly/monthly review generation with evidence-backed insights.
- Self-media UI Harness with tokens, reusable UI layers, page boundaries, and `/ui-lab`.
- Harness checks, contract tests, and browser smoke tests.

## Architecture

Backend layers are intentionally fixed:

```text
Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI
```

Frontend UI Harness layers are:

```text
foundations -> primitives -> components -> patterns -> screens -> app routes
```

The UI style is inspired by Mixpost for a warm creator-friendly app shell, Metabase for dashboard structure, and Evidence for review reports. shadcn/ui is treated as an ecosystem and component standard, not the visual direction.

Key docs:

- `ARCHITECTURE.md`
- `docs/mainline-framework.md`
- `docs/workflow-boundaries.md`
- `docs/ui-harness/ARCHITECTURE.md`
- `docs/spec-governance.md`

## Getting Started

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3001
```

Main routes:

- `/calendar`
- `/content`
- `/import`
- `/dashboard`
- `/reviews`
- `/leads`
- `/ui-lab`

## Verification

```bash
npm run verify:harness
npm run build
npm run test:smoke
npm run verify:o2
```

`verify:o2` runs the full gate: harness checks, build, and browser smoke.

## Status

This project is in early product-building stage. The backend fact chain and first UI Harness are in place, but the UI still needs iterative polish and real-world platform export samples.

Not included yet:

- Real platform publishing APIs.
- Multi-user permissions.
- Production observability stack.
- Full Storybook setup.
- Postgres migration.

## License

MIT License. See `LICENSE`.
