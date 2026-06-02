# External Knowledge

Use external references to avoid reinventing mature product and engineering patterns.

Current reference categories:

- Harness-first engineering: repository structure, long-running AI coding context, reviewable execution.
- Spec-driven delivery: feature spec -> plan -> tasks -> acceptance before implementation.
- Agent team orchestration: Orchestrator owns state; Worker builds; Explorer researches as a sidecar; Auditor reviews independently.
- Mature self-media/product modules: Postiz/Mixpost for calendar and publishing queues, MediaCrawler for platform data collection, ALwrity for content/brand/competitor strategy, Metabase/Evidence for reporting and dashboards.

Do not import these projects directly by default. Extract capabilities into this project's internal model and connect external tools only through Providers.
