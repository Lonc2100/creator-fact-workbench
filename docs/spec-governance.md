# Spec Governance

## Purpose

This project must not advance by vague conversation memory. Before meaningful implementation, the Orchestrator aligns a durable spec and task package.

## Two Levels

### Stage Architecture Alignment

Use this for large direction changes, phase gates, module boundaries, or architecture decisions.

Required files:

- `docs/architecture/current-stage.md`
- `docs/exec-plans/active/*.md`
- `docs/task-board.md`
- `docs/QUALITY_SCORE.md`

### Feature Delivery Alignment

Use this for concrete features.

Required shape:

```text
spec -> plan -> tasks -> acceptance -> implementation -> audit -> done
```

Each feature spec must include:

- problem;
- users and workflow;
- internal entities touched;
- Providers or external references used;
- UI/API surface;
- error handling;
- acceptance commands;
- rollback or cleanup notes.

## OpenSpec vs Spec Kit Use

- Use OpenSpec-style change proposals for architecture and governance changes.
- Use Spec Kit-style feature specs for buildable product modules.
- Do not start implementation until the task board points to the active spec and acceptance gate.

## Next Feature Specs

The next product specs should be created in this order:

1. Self-media core entities and local repo.
2. Manual/CSV metrics import.
3. Weekly review generator.
4. Monthly review generator.
5. Publishing queue and platform calendar.
6. Competitor and topic signal collection.
