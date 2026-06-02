# REVIEW-002: Review From Imported Data

## Goal

Generate weekly and monthly reviews from internal SQLite records, including user-imported platform metrics.

## Contract

- Reviews read from internal `contents` and `metrics`.
- Reviews output structured JSON and Markdown.
- Markdown is copyable from the UI.
- Metrics include content count, total views, likes, engagement, and best platform.
- Insights and actions must reference internal evidence, not chat memory.

## Acceptance

- `npm run test:self-media` proves imported metrics affect review totals.
- Dashboard UI refreshes after import and displays updated review.
- `/api/self-media/dashboard` returns the updated review snapshot.
