# AGENT-TRAJECTORY-AUDIT: Durable Agent Execution Evidence

## Goal

Make multi-agent coordination auditable through repository artifacts.

## Required Evidence

- Task board rows for connector, publish, O2 smoke, and trajectory audit tasks.
- Product specs for each task.
- Handoffs for Explorer, Worker, Auditor, and phase closure.
- Verification commands recorded in handoff files.

## Acceptance

- `npm run test:agent-trajectory` checks the required docs and handoffs.
- Auditor report states whether boundaries, tests, UI, and smoke evidence passed.
