# VIDEO-ACCOUNT-CONTENT-LEVEL-DISCOVERY-086 worker handoff

## Task

- Task ID: `VIDEO-ACCOUNT-CONTENT-LEVEL-DISCOVERY-086`
- Goal: focus Video Account logged-in discovery on the content-level works table only.
- Required fields: work title, publish time, views/play count, likes, comments, and shares.

## Decision

Video Account cannot enter the content-level logged-in browser-capture MVP from this evidence.

This pass did not prove a stable works table, single-video table, or data-performance surface that exposes title + publish time + views + likes + comments + shares together. The prior 085 discovery remains useful for aggregate/daily metrics only, not for a content-level MVP.

## Discovery Runner Added

- Script: `scripts/video-account-content-level-discovery-086.mjs`
- Command used:

```bash
node scripts/video-account-content-level-discovery-086.mjs --duration=120000
```

The runner opens a visible, non-persistent browser context and asks the user to manually log in and navigate to works/content/single-video/data pages. It writes only sanitized structure reports under `.local/video-account-content-level-discovery-086/`.

## Safety Boundary

- No operating DB was opened or written.
- No cookies, tokens, passwords, request headers, browser storage, HAR, trace, screenshots, or raw response bodies were saved.
- DOM candidate rows are persisted only as hashes and label coverage, not raw text.
- Network evidence is persisted only as sanitized endpoint/path coverage, not payload values.
- The browser context is non-persistent and is closed after the run.

## Evidence Summary

Local report files:

- `.local/video-account-content-level-discovery-086/report.json`
- `.local/video-account-content-level-discovery-086/report.md`

Sanitized report result:

- Login state: `maybe_login_prompt_visible`
- MVP readiness: `not_ready`
- Frames inspected: `2`
- DOM candidate rows: `1`
- Network summaries: `80`
- Network core-content endpoints: `0`
- Raw responses saved: `false`
- Headers saved: `false`
- Cookies saved: `false`
- Operating DB written: `false`

Report conclusion:

> Cannot enter content-level logged-in capture MVP: this run did not prove a stable works table containing title, publish time, views, likes, comments, and shares.

## Interpretation

085 showed that after login, the `micro/statistic/post` frame can expose readable aggregate/daily metric text. That is not enough for 086.

For a content-level MVP, the project needs one stable surface that contains a per-work row or equivalent row model with:

- work title;
- publish time;
- views or play count;
- likes;
- comments;
- shares.

This run found no DOM row or network endpoint structure with complete core content-level coverage. Therefore, implementing a Video Account "logged-in capture" MVP now would risk pretending account/daily aggregate metrics are content-level trusted metrics.

## Recommended Next Step

Do not build a Video Account content-level browser-capture save path yet.

Only reopen MVP implementation if a future manual run reaches a known works list, single-video, or content-performance table and the sanitized report shows either:

- `ready_for_dom_mvp`, with at least one complete DOM row covering the required fields; or
- `ready_for_network_mvp_with_extra_guardrails`, with a stable sanitized network structure covering the required fields and no saved login material/raw payload.

If Video Account only exposes content-level rows through an export/download action, route it through a local export/import MVP instead of browser DOM capture.

## Verification

- `node scripts/video-account-content-level-discovery-086.mjs --duration=120000` ran successfully and wrote sanitized local reports.
- No `.local` evidence was staged or intended for commit.
- Remaining validation to run after handoff creation:
  - `node --check scripts/video-account-content-level-discovery-086.mjs`
  - `git diff --check`
  - trailing whitespace check for the new script and this handoff.
