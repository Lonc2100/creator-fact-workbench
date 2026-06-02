# UI-HARNESS-001 Self-media UI Harness Foundation

## Problem

当前 UI 是单页拼装，导入、发布、复盘和看板混在一起，视觉也偏冷灰老 SaaS。需要建立可复用前端底座，让 UI 能按页面任务边界、组件层级和视觉 tokens 持续迭代。

## Workflow

采用 `foundations -> primitives -> components -> patterns -> screens -> app routes`。页面边界由 `docs/ui-harness/PAGE_BOUNDARIES.md` 固定，组件状态由 `/ui-lab` 展示。

## References

- Atomic Design: component hierarchy.
- Storybook: component-driven state review.
- shadcn/ui Registry: future reusable component shelf.
- Material Design Tokens: CSS variables.
- NN/g Heuristics: visibility, error prevention, recognition.
- Mixpost: warm shell and publish scheduling mood.
- Metabase: dashboard chart hierarchy.
- Evidence: evidence-based review report.

## Acceptance

- `npm run verify:harness`
- `npm run build`
- `npm run test:smoke`

## Boundary

UI Harness cannot define Repo, Service, Provider, external integrations, or backend schemas. `primitives`、`components`、`patterns` 不允许直接 `fetch`。
