# Engineering Principles

## Simple First, Agent Last

Prefer normal code, typed data, Provider adapters, and small Runtime endpoints before adding agent behavior.

## Fixed Route

UI -> Runtime -> Service -> Provider -> external tool

## Governance

- Read Before You Write
- Surface Conflicts
- Match Existing Conventions
- Fail Loud
- Respect Token Budgets

## Complexity Control

- Start with the smallest design that satisfies the acceptance criteria.
- Add abstractions only when they remove proven duplication or isolate a real boundary.
- Keep refactors scoped, behavior-preserving, and validated.
- Prefer deleting stale paths over carrying compatibility that the current product does not need.
- Promote repeated review comments into docs, lint, tests, or task templates.
