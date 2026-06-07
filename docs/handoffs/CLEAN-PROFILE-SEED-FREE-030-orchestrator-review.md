# CLEAN-PROFILE-SEED-FREE-030 Orchestrator Review

## Decision

Accepted as an opt-in clean local profile.

Do not make the clean profile the default yet. Keep the existing dirty/history profile available for evidence continuity, and use the clean profile when the operator wants a seed-free review surface.

## Accepted Controls

- `SELF_MEDIA_PROFILE=clean` uses `.local/self-media-clean.sqlite` by default.
- `SELF_MEDIA_SEED_MODE=off` disables demo seed.
- `SELF_MEDIA_DB_PATH=<path>` remains the explicit override and takes priority.
- Dirty/history profile remains `.local/self-media.sqlite`.

## Accepted Command

Use:

```bash
npm run check:clean-profile
```

to confirm the clean profile is empty, seed-free, and non-destructive.

## Main Session Verification

Reran:

- `npm run check:clean-profile`: PASS.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.

Observed clean profile summary:

- profile: `clean`
- seed mode: `off`
- content count: `0`
- metric snapshot count: `0`
- import run count: `0`
- seed log count: `0`
- default dashboard trusted: `true`

## Boundary

No files or database rows were deleted. No cleanup, migration, clear, or batch delete flow is approved by this review.

Future UI work may add a visible profile indicator so the operator knows whether they are viewing dirty/history or clean profile.
