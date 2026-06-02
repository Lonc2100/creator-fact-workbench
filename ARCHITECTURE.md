# Self-media AI Workbench Architecture

This project is a local-first self-media backend management workbench. The product direction is:

```text
collect -> store -> analyze -> plan topics -> produce content -> schedule/publish -> collect metrics -> weekly/monthly review -> monetization follow-up
```

The repository was bootstrapped from a generic Harness Template, but it is no longer treated as a generic tool scaffold. All future work must serve the self-media backend management and review workflow.

## Fixed Layers

```text
Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI
```

- UI triggers Runtime or renders read-only state.
- Runtime calls Service.
- Service owns business rules and may call Repo, Providers, Config, and Types.
- Repo only reads and writes state.
- Providers isolate external tools, local commands, and third-party APIs.
- Config imports Types only.
- Types import no business layers.
- App wiring imports only UI or Runtime.

## Module Boundaries

- `Types`: durable internal entities such as content items, platform metrics, ideas, competitors, experiments, contacts, weekly reviews, monthly reviews, and monetization leads.
- `Config`: platform definitions, scoring thresholds, review cadence, and feature flags.
- `Repo`: local persistence boundary. External information must be stored internally before analysis.
- `Providers`: adapters for MediaCrawler exports, n8n jobs, platform CSV/manual imports, AI generation, and future publishing APIs.
- `Service`: domain rules, review generation, scoring, state transitions, and error classification.
- `Runtime`: callable use cases and API-facing orchestration.
- `UI`: self-media management screens only; no canvas-workbench assumptions.

## UI Harness

Frontend work follows `docs/ui-harness/ARCHITECTURE.md`. The UI Harness is part of this repository, but it is designed as a future-extractable frontend package. It owns design tokens, reusable UI layers, page boundaries, `/ui-lab`, and visual QA only. It must not define backend entities, Repo, Service, Provider, or external tool behavior.

## State Management

State is owned by internal records, not by chat history. Every feature must declare:

- durable entity state in `Types`;
- mutation rules in `Service`;
- persistence behavior in `Repo`;
- external sync status in `Providers`;
- user-facing workflow state in `Runtime` and `UI`.

## Extension Entrypoints

New integrations enter through Providers first, then become internal records through Repo and Service. No UI or API route may call external tools directly.

## Error Handling

Errors must be classified as `validation`, `provider`, `persistence`, `analysis`, or `unknown`. Services return actionable failure states; Providers expose raw failure context without leaking it into UI decisions.
