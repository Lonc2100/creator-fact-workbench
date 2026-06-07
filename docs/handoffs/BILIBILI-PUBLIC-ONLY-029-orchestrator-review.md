# BILIBILI-PUBLIC-ONLY-029 Orchestrator Review

## Decision

Accepted.

Bilibili future durable content imports must remain public-only. Only explicitly public/published archives may enter Content, PlatformVersion, MetricSnapshot, dashboard, review, and post-import suggestion scope.

## Accepted Rules

- Allow only `state` zero-like archives with an approved/published/public state description.
- Treat `ptime` as publish-time metadata only, not as proof of visibility.
- Skip private, only-self, hidden, no-public, pending, review, down, rejected, offline, and unknown-public-state rows.
- Surface skipped counts/reasons as warnings without raw payloads, private titles, cookies, headers, comments, or danmu text.
- Keep Bilibili account metrics/date-key diagnostics preview-only.

## Boundary

This task does not remove older local Bilibili rows that were imported before the public-only gate existed.

Those rows should be handled by the trusted default scope and local quarantine path first. Any actual cleanup/rebuild must be non-destructive, backed up, and explicitly approved in the main session.

## Verification

Main session reran:

- `npm run test:self-media`: PASS, 75/75.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.
