# 135 Calendar Data Governance

Goal: stop non-user-work pollution from entering the default publish calendar.

Plain-language review note: the calendar should only show the creator's real planned works by default. Test drafts, acceptance records, backend logs, imported historical data, and unrelated local records must stay out of the grid.

Allowed scope:

- calendar eligibility logic in service/UI;
- local quarantine/report scripts that do not delete files;
- tests that prove default calendar excludes test/acceptance/log pollution;
- this task handoff.

Forbidden:

- bulk deletion;
- deleting files or directories;
- hiding real user-owned future schedules;
- moving platform metrics into calendar;
- reopening WeChat.

Validation:

- `git diff --check`
- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- strict 3200 `/calendar` check.
