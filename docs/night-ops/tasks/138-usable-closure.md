# 138 Usable Nightly Closure

Goal: close the overnight wave with a verified daily-use baseline.

Plain-language review note: prove the user can open dashboard, create content, see clean calendar, check import status, and return to dashboard without fake/test pollution.

Allowed scope:

- status docs;
- task board;
- product spec index;
- final handoff;
- narrow fixes required by acceptance.

Forbidden:

- broad UI redesign;
- real platform save without user confirmation;
- file deletion;
- force push.

Validation:

- `git diff --check`
- `npm run typecheck`
- `npm run test:self-media`
- `npm run test:ui-harness`
- `NEXT_DIST_DIR=.next-build-138-main npm run build`
- strict 3200 health
- daily gate
- live `/dashboard -> /content -> /calendar -> /import -> /dashboard` read-only walkthrough
