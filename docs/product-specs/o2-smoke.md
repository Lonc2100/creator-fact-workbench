# O2-SMOKE: Scripted Browser Acceptance

## Goal

Promote browser smoke from manual proof to repeatable local acceptance.

## Acceptance

- `npm run test:smoke` starts or uses a local app URL.
- It verifies dashboard load, connector imports, review metric updates, queue transition, and zero console errors.
- `npm run verify:o2` runs harness checks, production build, and browser smoke.

## Boundary

This is O2 observability. Chrome DevTools trace dashboards and a full local observability stack remain O3.
