# PLATFORM-OPS-019 Worker Handoff

## Task

Consolidate the accepted Douyin, Xiaohongshu, and Video Account personal save smokes into one shared practical platform import runner.

Current scope follows `PLATFORM-PRIORITY-019`: Douyin personal creator center, Xiaohongshu creator center, and Video Account assistant only. WeChat Official Account backend was not continued.

## Completed Work

- Added `scripts/platform-personal-save-smoke.mjs`.
- Added `npm run smoke:platforms-save`.
- The unified runner supports:
  - `--platform=douyin`
  - `--platform=xiaohongshu`
  - `--platform=video-account`
  - `--platform=all`
- The npm script runs `--platform=all` by default.
- The runner writes its report to `.local/platform-personal-save-smoke/report.json`.
- Each selected platform is saved twice in one run to verify idempotency:
  - content entities remain stable;
  - platform versions remain stable;
  - metric snapshots remain stable;
  - import runs append as audit/history records.
- The runner verifies for each platform:
  - import run source;
  - content count;
  - metric count;
  - metric snapshot count;
  - platform version count;
  - dashboard visibility;
  - weekly review visibility;
  - monthly review visibility;
  - safety scan over report-intended summaries and saved notes.
- Fixed a narrow TypeScript inference issue in `SelfMediaService` by typing the metric source group mapper return. This did not change dashboard behavior.

## Smoke Result

`npm run smoke:platforms-save`: PASS.

Report: `.local/platform-personal-save-smoke/report.json`

Summary from the generated report:

| Platform | Source | Content | Metrics | Platform versions | Metric snapshots | Dashboard | Review | Idempotency |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| douyin | `douyin_creator_center` | 5 | 5 | 5 | 5 | PASS | PASS | PASS |
| xiaohongshu | `xiaohongshu_creator_center` | 1 | 1 | 1 | 1 | PASS | PASS | PASS |
| video-account | `video_account_creator_center` | 3 | 3 | 3 | 3 | PASS | PASS | PASS |

Import run behavior:

- Douyin appended 2 import runs in the unified smoke.
- Xiaohongshu appended 2 import runs in the unified smoke.
- Video Account appended 2 import runs in the unified smoke.
- This matches the existing Repo convention: import runs are audit records, while content/platform version/metric snapshot records are stable upserts.

## Changed Files

- `scripts/platform-personal-save-smoke.mjs`
- `package.json`
- `src/domain/self-media/service/self-media-service.ts`
- `docs/handoffs/PLATFORM-OPS-019-worker-handoff.md`

## Verification

- `node --check scripts/platform-personal-save-smoke.mjs`: PASS
- `npm run smoke:platforms-save`: PASS
- `npm run test:self-media`: PASS, 38 tests
- `npm run typecheck`: PASS
- `npm run verify:harness`: PASS
- `git diff --check`: PASS

## Safety

- No password, cookie, credential, full header, or raw request payload was written into this handoff.
- The unified report stores summaries, ids, counts, and warnings only.
- Raw captures remain local under existing `.local/*-personal-v0/raw` directories.
- WeChat Official Account backend was not touched.

## Known Notes

- Running the unified smoke intentionally appends import runs. This is expected and reported.
- The current local database already had prior accepted save-smoke data for all three platforms, so the unified smoke primarily verified stable upsert behavior plus appended import audit records.
- The workspace had many pre-existing dirty and untracked files. This task only intentionally changed the files listed above.

## Next Recommendation

Orchestrator can review this handoff and accept the shared save smoke as the new operational entrypoint for the first three personal platforms.

## Needs Orchestrator Decision

No.
