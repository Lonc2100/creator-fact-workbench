# PAUSED-WECHAT-LOCAL-ROUTE-BOUNDARY-061 Auditor Handoff

## Scope

- Task: audit local untracked `src/app/api/self-media/wechat/` route impact on the paused WeChat boundary.
- Mode: audit and recommendation only.
- No deletion, no move, no active UI changes, no commit.

## Files Audited

- `src/app/api/self-media/wechat/sync/route.ts`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/domain/self-media/service/self-media-service.ts`
- `docs/handoffs/CURRENT-PLATFORM-STATUS.md`
- `docs/handoffs/MAINLINE-PUBLISH-TO-METRICS-CLOSED-LOOP-059-worker-handoff.md`
- `package.json`
- Relevant WeChat references found via `rg`.

## Findings

### 1. The local route is untracked but active in the local route tree

`git status --short -- src/app/api/self-media/wechat` reports:

```text
?? src/app/api/self-media/wechat/
```

`git ls-files --error-unmatch src/app/api/self-media/wechat/sync/route.ts` reports `untracked`.

The file exists as:

```text
src/app/api/self-media/wechat/sync/route.ts
```

Content:

```ts
import { syncWechatOfficialAnalytics } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await syncWechatOfficialAnalytics(body);
  return Response.json(result, { status: result.importResult.run.status === "failed" ? 400 : 200 });
}
```

### 2. The dev server can see the route

Read-only GET probe against the fixed local server:

```text
GET http://localhost:3200/api/self-media/wechat/sync -> 405 Method Not Allowed
```

This is important: a 405 means the route module is visible to the Next app router locally, even though the only implemented method is POST.

### 3. POST would cross the paused boundary

The route calls:

```ts
syncWechatOfficialAnalytics(body)
```

Runtime forwards to:

```ts
service.syncWechatOfficialAnalytics(input)
```

The service path:

- Reads WeChat env (`WECHAT_APP_ID`, `WECHAT_APP_SECRET`, `WECHAT_OFFICIAL_ACCOUNT_ID`).
- Creates `WechatOfficialProvider`.
- Attempts WeChat official account API calls.
- Can record failed `wechat_official` import runs/logs if invoked with valid dates but missing/invalid credentials.
- Can import WeChat content/metrics if credentials and permissions exist.

So the local route is not just historical text; it is a callable active endpoint in local dev.

### 4. Current status says this must not be active release scope

`docs/handoffs/CURRENT-PLATFORM-STATUS.md` states:

```text
WeChat Official Account / WeChat backend remains paused. Do not run or advertise `sync:wechat`, `discover:wechat-backend`, or `src/app/api/self-media/wechat/**` as active release scope.
```

`MAINLINE-PUBLISH-TO-METRICS-CLOSED-LOOP-059` also keeps WeChat/公众号 paused and adds no active backend promise.

## Risk Assessment

Risk level: medium local-boundary risk.

Why not high:

- The route is untracked and not in the committed mainline.
- Default UI does not advertise it.
- GET does not trigger sync.

Why it still matters:

- Next local dev/build can discover route files under `src/app/api`.
- A POST to `/api/self-media/wechat/sync` would activate paused WeChat sync behavior.
- Failed POST can still mutate local import/log state.
- This contradicts the accepted paused boundary for `src/app/api/self-media/wechat/**`.

## Options Considered

### Option A: Keep but fully isolate

Not recommended.

To truly isolate while keeping it under `src/app/api`, the route would need to return a hard disabled response and avoid importing `syncWechatOfficialAnalytics`. But the route would still exist as a visible API surface, which conflicts with the current paused boundary wording.

### Option B: Move to paused archive

Acceptable if the main session wants to preserve the exact local route source.

Suggested destination, if explicitly confirmed:

```text
docs/paused/wechat/local-api-route-sync-route.ts
```

This keeps historical source outside `src/app/api`, so Next will not register it as a route. It does create a new archive file and should be staged only if the main session wants the archive in Git.

### Option C: Single-file delete

Recommended minimal handling.

The file is only six lines, untracked, and the historical intent already exists in WeChat handoffs/product specs. Deleting the single route file removes the local API surface without touching service/provider history or active UI.

Allowed deletion target, after explicit main-session/user confirmation only:

```text
src/app/api/self-media/wechat/sync/route.ts
```

Do not batch delete directories. Leave empty directories alone unless the user separately confirms individual directory cleanup.

## Recommendation

Choose Option C: single-file delete after explicit confirmation.

Rationale:

- Smallest possible change.
- Removes the only locally visible WeChat API route.
- Does not restore WeChat.
- Does not alter active four-platform UI.
- Does not touch service/provider historical code, package scripts, or docs in this audit slice.

If preservation is desired, choose Option B instead and move only the single file out of `src/app/api`.

## Proposed Follow-up Commands

Do not run until explicitly confirmed.

Single-file delete:

```powershell
Remove-Item -LiteralPath "D:\codex work\自媒体创作\Data Collection and Background Analysis\src\app\api\self-media\wechat\sync\route.ts"
```

Then verify route is gone:

```powershell
Invoke-WebRequest -Uri http://localhost:3200/api/self-media/wechat/sync -Method GET -UseBasicParsing
```

Expected after server reload/restart: 404, not 405.

## Verification Performed

- Confirmed route is untracked.
- Confirmed only one file exists under `src/app/api/self-media/wechat`.
- Confirmed GET on local 3200 returns 405, proving route visibility without invoking POST.
- Confirmed route POST would call the paused WeChat sync path.
- No files deleted.
- No active UI changed.
- No commit made.
