# 136 Nonintrusive Import Refresh

Goal: make `/import` perform only safe no-intervention checks automatically.

Plain-language review note: if the platform window/session is already usable, show preview status; if login, QR code, platform page switching, or a new window is required, stop and show a clear next action without interrupting the user.

Allowed scope:

- import first-screen status and copy;
- browser-capture auto-refresh route behavior for `autoOpen=false`;
- tests for no auto-open/no save/no sensitive material;
- this task handoff.

Forbidden:

- automatic platform window opening;
- silent save;
- storing login material;
- Video Account startup auto-open;
- Bilibili browser capture promises.

Validation:

- `git diff --check`
- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- strict 3200 `/import` no-auto-open check.
