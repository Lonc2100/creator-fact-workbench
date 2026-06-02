# Explorer Notes: CONNECTOR-001

## Task ID

CONNECTOR-001

## What Was Read

- MediaCrawler README: confirms Chinese-platform collection is best treated as a local export/import boundary for now.
- n8n selected files: reinforces execution/run artifacts as connector input, not business model shape.
- Postiz/Mixpost selected files: publishing systems separate post records, platform versions, schedules, and metrics.

## Recommendation

Implement local import adapters first:

- platform CSV presets;
- MediaCrawler JSON;
- n8n execution JSON.

Do not start live crawlers, live workflows, or platform publishing APIs in this phase.

## Verification

- `npm run test:self-media`
