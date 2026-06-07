# CLEAN-PROFILE-SEED-FREE-030 worker handoff

## Task

Design and implement a non-destructive clean local profile / seed-free profile so the operator can inspect a clean data environment without deleting or cleaning the existing local database.

## Safety boundary

- No files were deleted as part of the implementation.
- No database rows were deleted, cleared, migrated, or rewritten.
- No batch delete script was added.
- Existing `.local/self-media.sqlite` remains the dirty/history profile.

## Implemented profile controls

### Environment variables

- `SELF_MEDIA_PROFILE=clean`
  - Uses `.local/self-media-clean.sqlite` by default.
  - Defaults seed mode to `off`.

- `SELF_MEDIA_PROFILE` unset or any non-`clean` value
  - Uses existing `.local/self-media.sqlite`.
  - Defaults seed mode to `demo`, preserving the old behavior.

- `SELF_MEDIA_DB_PATH=<path>`
  - Explicit sqlite override.
  - Takes priority over `SELF_MEDIA_PROFILE`.

- `SELF_MEDIA_SEED_MODE=off`
  - Disables automatic demo seed.

- `SELF_MEDIA_SEED_MODE=demo`
  - Enables legacy demo seed behavior.

### Code changes

- `src/domain/self-media/config/self-media-config.ts`
  - Added `cleanWorkbenchDbPath`.
  - Added `resolveSelfMediaLocalProfile()`.
  - Added `resolveWorkbenchDbPath()`.
  - Added `resolveSelfMediaSeedMode()`.
  - Added `shouldSeedSelfMediaDemoData()`.

- `src/domain/self-media/repo/sqlite-self-media-repo.ts`
  - Default constructor now resolves sqlite path dynamically from env/profile.
  - Existing explicit constructor path remains supported for tests and tools.

- `src/domain/self-media/service/self-media-service.ts`
  - `ensureSeedData()` now returns without writing when seed mode is off.
  - Clean profile dashboard can open without fake/demo content, metrics, imports, accounts, queue, audits, or seed logs.

- `scripts/local-data-quarantine-report.mjs`
  - Now respects `SELF_MEDIA_DB_PATH`.
  - Now scans `.local/self-media-clean.sqlite` when `SELF_MEDIA_PROFILE=clean`.

## New safe command

Added package script:

```bash
npm run check:clean-profile
```

This command defaults to:

- `SELF_MEDIA_PROFILE=clean`
- `SELF_MEDIA_SEED_MODE=off`
- sqlite path `.local/self-media-clean.sqlite`

It writes only safe status reports:

- `.local/clean-profile/report.json`
- `.local/clean-profile/report.md`

It does not delete rows, delete files, or touch the dirty/history sqlite.

## Operator instructions

PowerShell start clean profile:

```powershell
$env:SELF_MEDIA_PROFILE='clean'
$env:SELF_MEDIA_SEED_MODE='off'
npm run dev
```

PowerShell start clean profile with explicit sqlite path:

```powershell
$env:SELF_MEDIA_DB_PATH='.local/self-media-clean.sqlite'
$env:SELF_MEDIA_SEED_MODE='off'
npm run dev
```

PowerShell return to dirty/history profile:

```powershell
Remove-Item Env:SELF_MEDIA_PROFILE -ErrorAction SilentlyContinue
Remove-Item Env:SELF_MEDIA_SEED_MODE -ErrorAction SilentlyContinue
Remove-Item Env:SELF_MEDIA_DB_PATH -ErrorAction SilentlyContinue
npm run dev
```

Read-only/safe inspection:

```powershell
npm run check:clean-profile
npm run check:local-data-quarantine
```

## Tests

Added `clean local profile uses isolated seed-free sqlite without demo smoke rows`.

Coverage:

- Dirty/history sqlite can contain fake/demo data and remains preserved.
- Clean profile uses `SELF_MEDIA_DB_PATH` / clean profile env.
- Clean profile opens dashboard with no auto seed.
- Clean repo has:
  - 0 contents
  - 0 metric snapshots
  - 0 import runs
  - 0 seed logs
- Dashboard/reviews show 0 content metrics and 0 views.
- Dirty/history sqlite still exists and remains readable after clean profile inspection.

## New command run

Ran:

```bash
npm run check:clean-profile
```

Observed summary:

- status: `ok`
- profile: `clean`
- seedMode: `off`
- dbPath: `.local\self-media-clean.sqlite`
- dirtyProfileExists: `true`
- repo contentCount: `0`
- repo metricCount: `0`
- repo metricSnapshotCount: `0`
- repo importRunCount: `0`
- repo seedLogCount: `0`
- dashboard contentCount: `0`
- dashboard trustedContentCount: `0`
- dashboard isDefaultDashboardTrusted: `true`

## Verification

- `npm run test:self-media`: pass, 80/80.
- `npm run typecheck`: pass.
- `git diff --check`: pass.

## Main-session judgment

Yes.

Open decision:

- Whether to make clean profile the default for local UI review sessions, or keep it opt-in through env vars.
- Whether to add a visible UI profile indicator later. This task kept the change mostly config/runtime/script-level.
