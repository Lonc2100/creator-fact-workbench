# Quality Score

Current score: 98 / 100

## Done

- Generic Harness scaffold generated.
- Project-root correction and self-media direction are being documented.
- Governance correction checks pass through `npm run verify:harness`.
- Task board, spec governance, agent playbook, current-stage architecture, and cleanup manifest now exist.
- Chinese mainline framework, workflow boundaries, and Agent team setup docs now exist.
- Parent directory cleanup is complete; only the active project folder remains.
- Quality execution system and golden principles are now documented.
- AGENTS read order was simplified into core read plus on-demand deep docs.
- `npm run verify:harness` passes after quality governance changes.
- Vendor references are downloaded locally and checked by tests.
- Self-media SQLite model, providers, review generation, and dashboard API are implemented.
- Browser smoke verified current app on port 3021 with no console errors.
- `GC-001` removed inactive `data-collection` code, route, product spec, and bootstrap plan.
- `AUD-001` produced an auditor report.
- `OBS-001` is calibrated to O1 with import runs, structured logs, trace IDs, and failure records.
- `IMPORT-001` supports CSV, JSON, and manual UI import into SQLite.
- `REVIEW-002` verifies imported metrics affect review totals and Markdown output.
- 2026-06-01 browser smoke imported CSV data through the running app; weekly review views rose from 4,288 to 7,488.
- `CONNECTOR-001` supports platform CSV presets, MediaCrawler JSON, and n8n execution JSON.
- `PUBLISH-001` adds publish queue state transitions through Service/API/UI.
- `O2-SMOKE` is scriptable through `npm run test:smoke` and included in `npm run verify:o2`.
- `AGENT-TRAJECTORY-AUDIT` checks task/spec/handoff/auditor evidence.
- `PREVIEW-001` adds import preview without creating ImportRun.
- `IDEA-001` and `CONTENT-001` connect topic ideas to draft content and publish queue items.
- `PUBLISH-002` adds a lightweight calendar strip on top of the publish queue.
- `REVIEW-003` includes queue and monetization context.
- `LEAD-001` lets active monetization leads influence review actions.
- `V1.5` adds platform versions, publish records, metric snapshots, saved reviews, action items, automation runs, and evidence-backed insights.
- `verify:o2` now validates the publish-to-review backend fact chain.
- `Self-media UI Harness` now has architecture docs, page boundaries, Mixpost/Metabase visual tokens, reusable UI layers, `/ui-lab`, separated routes, and UI boundary tests.
- `verify:o2` passed on 2026-06-02 after UI Harness integration.
- `CALENDAR-003`, `EDITOR-001`, and `REVIEW-004` now pass O2: content editor saves platform version fields, calendar drag reschedules through API, reviews are saved, and action items progress from the UI.

## Improve Next

- Add full import diff table before saving real platform exports.
- Add platform-specific draft body/caption/media fields.
- Add media attachment model and weekly/month planning UI.
- Refine CSV header aliases with real backend export files.
- Add O3 local observability stack only after connector presets stabilize.
- Add real sub-agent execution only after trajectory checks remain stable for another phase.
- Continue visual polish from screenshots; current UI is a structured first pass, not final art direction.
- Track Next/PostCSS moderate audit advisory without applying npm's invalid downgrade suggestion.
- Add month navigation, manual action-item creation, review detail route, and media asset records after the current interaction model is reviewed.
