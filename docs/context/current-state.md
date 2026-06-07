# Current State

The only valid project root for this work is `D:\codex work\自媒体创作\Data Collection and Background Analysis`.

The current product is a self-media AI backend management workbench. It is not a canvas product, and it must not inherit requirements from `D:\codex work\desk work`.

Parent-directory cleanup has been executed before, but the parent directory may contain sibling repositories or temporary outer-root artifacts. As of 2026-06-05, `D:\codex work\自媒体创作\AiToEarn` is a separate external repository and must not be treated as active context for this project.

The active product code now lives in `src/domain/self-media`. The old `data-collection` scaffold was removed by `GC-001` and must not be recreated.

The current implementation has:

- local vendor references downloaded to `docs/references/vendor/`;
- SQLite as the internal fact store;
- fake/manual/CSV/JSON import providers;
- O1 structured logs and error contracts;
- dashboard, publishing queue, topic/brand brain, metrics, review, lead, audit UI sections;
- contract tests for references, providers, SQLite repo, and review generation.
- entropy cleanup test coverage that blocks legacy scaffold paths from returning.

Before adding more features, keep following:

- isolate polluted outer-root context;
- make spec/task/agent alignment explicit;
- define module boundaries for the self-media backend;
- record cleanup candidates without broad deletion;
- keep all new files inside this directory.
