# TRUSTED-OPERATING-REVIEW-UI-031 worker handoff

## Task

Make trusted operating scope, local profile, and trusted dashboard audit status visible in the product UI instead of hiding them behind scripts.

## Implemented

### Dashboard

- Added a compact top operating strip on `/dashboard`.
- Shows:
  - default scope: `trusted real creator-center`
  - profile: `dirty/history` or `clean`
  - seed mode: `demo` or `off`
  - trusted content count
  - trusted metric snapshot count
  - trusted views
  - trusted engagement
  - latest trusted dashboard audit status
- Missing audit report displays as `未审计`; it is not treated as pass.

### Import

- Added a compact trusted dashboard audit panel on `/import`.
- Shows:
  - suggested audit command
  - profile
  - trusted content/snapshot/views/engagement summary
  - mismatch count
  - latest audit report generated time and dashboard input
- Missing audit report displays clear unaudited copy and recommends:

```bash
npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard
```

### Service / Types

- Added `TrustedDashboardAuditView`.
- Added `TrustedOperatingStatus`.
- Added `trustedOperatingStatus` to `DashboardSnapshot`.
- Added `readTrustedDashboardAuditView()`.
- Added read-only loading of `.local/trusted-dashboard-audit/report.json`.
- Added `buildTrustedOperatingStatus()` using filtered dashboard snapshots only.

No raw payload, cookies, tokens, headers, comments, or danmu are read or displayed.

## Tests

Added/updated coverage:

- Trusted dashboard audit missing report returns `missing` / unaudited.
- Dashboard snapshot exposes trusted operating status.
- Clean profile dashboard reports `profile=clean`, `seedMode=off`, and zero trusted content/snapshots.

## Screenshot

Saved:

```text
.local/trusted-operating-review-ui-031.png
```

Visual check: dashboard top strip is compact and no obvious overlap or large abnormal blank area was observed.

## Verification

- `npm run test:self-media`: pass, 85/85.
- `npm run typecheck`: pass.
- `npm run verify:harness`: pass.
- `git diff --check`: pass.

## Notes

- This task only exposes status and audit summaries in UI. It does not add real collection buttons.
- Audit execution remains a manual/safe command; UI only shows the command and last report.
- Existing dirty/history profile remains default unless env selects clean profile.

## Main-session judgment

Yes.
