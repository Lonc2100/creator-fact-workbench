# AUTHED-BROWSER-CAPTURE-ARCHITECTURE-085 Architect Handoff

Date: 2026-06-07

Role: Architecture/design only. No code changes, no commit.

## Decision

Change the capture mainline from `local export MVP` to `user-assisted authenticated browser capture`.

Plain version:

```text
用户打开平台后台 -> 用户自己登录/扫码/过验证码 -> 系统只抓用户当前能看到的作品数据 -> 预览 -> 用户确认保存 -> 仪表盘/复盘更新
```

`本地导出 / CSV / XLSX / JSON` remains supported, but it moves to a collapsed fallback path:

```text
无法登录 / 平台风控 / 页面结构失效 / 用户不想让系统打开浏览器 -> 展开“本地导出兜底”
```

This does not reopen WeChat Official Account/backend. Active platform scope remains Douyin, Xiaohongshu, Video Account, and Bilibili content-level data. Bilibili account-level metrics remain preview-only diagnostics.

## References

| Reference | Use | Applicability | Freshness | Authority | Popularity |
| --- | --- | --- | --- | --- | --- |
| Playwright Authentication docs: https://playwright.dev/docs/auth | Auth state and storage safety model. | High: same browser-session reuse problem. | Current official docs. | High. | High. |
| Playwright `launchPersistentContext`: https://playwright.dev/docs/api/class-browsertype#browser-type-launch-persistent-context | Persistent user data dir/profile strategy. | High: best fit for user-assisted logged-in sessions. | Current official docs. | High. | High. |
| Playwright `connectOverCDP`: https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp | Attach to existing Chromium session when needed. | Medium: useful fallback, lower fidelity than direct Playwright launch. | Current official docs. | High. | High. |
| Playwright Network docs: https://playwright.dev/docs/network | Response events and capture hooks. | High: existing V0 collectors already listen to JSON responses. | Current official docs. | High. | High. |
| Chrome remote debugging security update: https://developer.chrome.com/blog/remote-debugging-port | Do not automate/debug default Chrome profile; use separate user data dir. | High: directly impacts CDP/profile design. | 2025-03-17. | High. | High. |
| Existing repo V0 discovery specs and scripts | Prior local collectors for Douyin/XHS/Video Account/Bilibili. | High: reuse patterns, redaction, field reports. | Current repo state. | Local source of truth. | Project-specific. |

Key source implications:

- Playwright warns auth state files can contain sensitive cookies/headers and should not be checked into repos.
- `launchPersistentContext(userDataDir)` is the preferred managed-profile primitive for persistent sessions.
- Chrome now restricts remote debugging against default profiles; separate user data dirs are required.
- Network response events are a supported Playwright mechanism for observing requests/responses during normal user navigation.

## Current Repo Baseline

Current mainline before this decision:

- `/import` presents local/manual preview-save as the explicit four-platform refresh entry.
- `NEXT-PLATFORM-CAPTURE-MVP-082` chose local file import for the next capture MVP.
- Existing V0 browser collectors are platform-specific scripts:
  - `scripts/douyin-personal-discovery.mjs`
  - `scripts/xiaohongshu-personal-discovery.mjs`
  - `scripts/video-account-personal-discovery.mjs`
  - `scripts/bilibili-personal-discovery.mjs`
- Those scripts already use the right safety instincts:
  - user logs in manually;
  - no password/token/header collection;
  - sanitized local-only captures under `.local/**`;
  - endpoint and field reports;
  - no fake success if login/CDP is unavailable.

Problem:

The repo has good fragments, but no unified product architecture for platform login state, "open backend", user confirmation, visible data capture, restart/session behavior, and UI failure messaging.

## Target User Flow

Default `/import` flow should become:

1. User opens `/import`.
2. User sees platform cards: Douyin, Xiaohongshu, Video Account, Bilibili.
3. Card shows login/capture state:
   - `未打开`
   - `等待人工登录`
   - `已登录，可抓取`
   - `会话可能过期`
   - `抓取失败`
   - `最近已抓取`
4. User clicks `打开后台并登录`.
5. App starts a managed browser profile for that platform and opens the official creator/backend URL.
6. User completes login, QR scan, CAPTCHA, risk check, or 2FA in the browser. The app never asks for credentials.
7. User clicks `我已登录，开始抓取当前页面`.
8. Runtime attaches capture listeners and asks the user to refresh/click normal creator-center modules if needed.
9. Provider captures only current visible/loaded creator-center data, sanitizes it, and maps it into a preview.
10. UI shows preview rows and warnings.
11. User clicks `确认保存到本地指标`.
12. Saved rows become normal trusted creator-center content-level snapshots when they pass platform-specific mapping rules.

Fallback path:

```text
展开“本地导出兜底” -> 上传/粘贴 CSV/XLSX/JSON -> 预览 -> 确认保存
```

## Architecture

Keep the fixed layer order:

```text
Types -> Config -> Repo -> Providers -> Service -> Runtime -> UI
```

### Types

Add durable but safe state models:

```ts
type BrowserCapturePlatform = "douyin" | "xiaohongshu" | "video_account" | "bilibili";

type BrowserLoginState =
  | "not_started"
  | "browser_opened"
  | "waiting_user_login"
  | "login_confirmed"
  | "session_reused"
  | "session_stale"
  | "capture_ready"
  | "capture_failed";

type BrowserCaptureStatus =
  | "idle"
  | "opening_browser"
  | "waiting_login"
  | "capturing"
  | "preview_ready"
  | "saved"
  | "failed";

type BrowserSessionProfile = {
  id: string;
  platform: BrowserCapturePlatform;
  displayName: string;
  profileDirRef: string; // local ref only, not shown by default UI
  loginState: BrowserLoginState;
  lastOpenedAt?: string;
  lastUserConfirmedLoginAt?: string;
  lastCaptureAt?: string;
  lastSuccessfulSaveAt?: string;
  staleAfterHours: number;
  failureReason?: string;
};

type BrowserCaptureRun = {
  id: string;
  platform: BrowserCapturePlatform;
  profileId: string;
  targetUrl: string;
  startedAt: string;
  finishedAt?: string;
  status: BrowserCaptureStatus;
  captureMode: "current_visible_page" | "network_json" | "dom_table";
  capturedCount: number;
  previewCount: number;
  savedCount: number;
  redactionSummary: {
    rawHeadersSaved: false;
    cookiesSaved: false;
    tokenLikeValuesRedacted: number;
    rawPayloadTracked: false;
  };
  error?: {
    code: "not_logged_in" | "session_expired" | "platform_changed" | "network_blocked" | "captcha_required" | "no_rows_found" | "mapping_failed" | "unknown";
    message: string;
  };
};
```

Do not persist cookies, tokens, headers, raw requests, passwords, QR payloads, private comments, or danmu text as durable app records.

### Config

Add platform browser config:

```ts
type BrowserCapturePlatformConfig = {
  platform: BrowserCapturePlatform;
  startUrl: string;
  allowedHosts: string[];
  captureStrategies: Array<"network_json" | "dom_table">;
  sessionTtlHours: number;
  visibleUserInstructions: string[];
  sensitiveKeyPattern: RegExp;
};
```

Initial target URLs:

- Douyin: `https://creator.douyin.com/creator-micro/data-center/operation`
- Xiaohongshu: `https://creator.xiaohongshu.com/`
- Video Account: `https://channels.weixin.qq.com/platform`
- Bilibili: `https://member.bilibili.com/creator/home`

### Repo

Persist only safe operational state:

- `browser_session_profiles`
- `browser_capture_runs`
- sanitized capture references under `.local/**`
- preview/save audit summaries

Do not store:

- cookies;
- request headers;
- auth headers;
- raw request bodies;
- platform passwords;
- QR/login payloads;
- unredacted raw JSON in tracked files;
- browser profile contents in Git.

Profile directories remain local-only:

```text
.local/browser-profiles/{platform}/{profileId}/
.local/browser-captures/{platform}/{runId}/
```

### Providers

Introduce one shared provider:

```text
AuthenticatedBrowserProvider
```

Provider responsibilities:

- create/open managed persistent browser context;
- attach to existing CDP session only as an explicit fallback;
- open platform backend URL;
- expose login-state probes;
- collect current page/network evidence;
- sanitize captures immediately;
- return safe preview objects.

Platform-specific adapters remain small:

```text
DouyinAuthedCaptureAdapter
XiaohongshuAuthedCaptureAdapter
VideoAccountAuthedCaptureAdapter
BilibiliAuthedCaptureAdapter
```

Shared provider should prefer:

```ts
chromium.launchPersistentContext(profileDir, {
  headless: false,
  acceptDownloads: false
});
```

CDP fallback remains available only for user-started/known debugging browser:

```ts
chromium.connectOverCDP(endpoint)
```

Do not use the user's default Chrome profile. Use separate platform profile dirs.

Capture strategy:

1. Network JSON:
   - listen to response events;
   - filter allowed hosts;
   - parse JSON only when content type and size are safe;
   - sanitize before writing;
   - map known endpoints into preview rows.
2. DOM table fallback:
   - read visible table/card text only;
   - no hidden inputs;
   - no localStorage/sessionStorage dump;
   - no cookies.

### Service

Service owns business rules:

- decide whether a session is stale;
- decide whether a capture can be trusted as content-level creator-center data;
- merge platform preview rows into existing content/platform versions;
- block account-level Bilibili metrics from durable content totals;
- force explicit user confirmation before save;
- classify errors into user-facing states.

Trusted-save requirements:

- source is an active platform creator center;
- record is content/work-level, not account-only;
- platform identity is stable enough to upsert;
- user clicked confirm-save;
- no paused WeChat rows enter default scope;
- no raw sensitive material is present.

### Runtime / API

Add browser-capture use cases:

```text
GET  /api/self-media/browser-capture/status
POST /api/self-media/browser-capture/open
POST /api/self-media/browser-capture/confirm-login
POST /api/self-media/browser-capture/capture-visible
POST /api/self-media/browser-capture/preview
POST /api/self-media/browser-capture/save
POST /api/self-media/browser-capture/clear-session
```

Semantics:

- `open`: launches managed browser/profile and navigates to platform backend.
- `confirm-login`: user assertion plus light probe; no credentials.
- `capture-visible`: starts a bounded capture window; user may refresh/click backend modules.
- `preview`: maps sanitized captures into business rows.
- `save`: persists only mapped trusted rows after user confirmation.
- `clear-session`: closes browser and deletes or forgets only that one profile after explicit confirmation.

No endpoint should accept raw cookies, tokens, headers, passwords, or arbitrary raw payloads from the browser/UI.

### UI

Primary surface: `/import`.

Default user-facing copy:

- `打开后台并登录`
- `我已登录，开始抓取当前页面`
- `预览抓取结果`
- `确认保存到本地指标`
- `清除本平台登录状态`

Status panels:

- 最近抓取时间;
- 最近保存时间;
- 会话状态;
- 失败原因;
- 下一步建议.

The local export path moves into collapsed fallback:

```text
本地导出兜底
平台风控、无法登录、或你更想手动导出时使用。
```

Do not make the dashboard claim background/automatic capture unless a future scheduler is explicitly implemented.

## Restart / Session Strategy

Use per-platform persistent profile dirs. On restart:

1. App reads `BrowserSessionProfile`.
2. UI shows `会话可能可用` if profile exists and last confirmation is within TTL.
3. User clicks `打开后台`.
4. Browser opens with prior profile.
5. User confirms whether platform is still logged in.
6. If session expired, show `请在打开的浏览器里重新登录`.

Recommended TTL:

- Douyin: 24h default stale warning.
- Xiaohongshu: 24h default stale warning.
- Video Account: 12h default stale warning because QR/login can expire.
- Bilibili: 48h stale warning for content-level capture, but account metrics remain preview-only.

Do not silently run background capture on startup. At most show "建议重新抓取" and let the user click.

## Failure Messages

| Code | User-facing message |
| --- | --- |
| `not_logged_in` | `还没检测到后台登录成功。请在打开的浏览器里完成登录/扫码/验证，然后点“我已登录”。` |
| `session_expired` | `上次登录状态可能过期了。请重新打开后台并确认登录。` |
| `captcha_required` | `平台要求人工验证。请你在浏览器里完成验证，系统不会绕过验证码。` |
| `platform_changed` | `平台页面结构变了，本次无法可靠识别作品数据。可以先用本地导出兜底。` |
| `no_rows_found` | `没抓到作品数据。请打开作品列表/数据表现页，刷新后再试。` |
| `mapping_failed` | `抓到了数据，但字段暂时无法匹配为指标。请保留本次脱敏报告给后续适配。` |
| `network_blocked` | `浏览器请求被平台或网络拦截。请稍后重试，或改用本地导出兜底。` |

## Migration Plan

### 085A: Spec and model alignment

- Add product spec for authenticated browser capture.
- Add types for session profile and capture run.
- Add redaction invariants to tests.

### 085B: Shared provider extraction

- Refactor duplicated V0 discovery script logic into a shared provider/module.
- Keep old scripts as wrappers.
- Use `launchPersistentContext` with platform-specific profile dirs as default.
- Keep CDP fallback explicit.

### 085C: `/import` UI mainline switch

- Move browser capture cards above local export.
- Collapse local export under fallback.
- Add status, open, confirm-login, capture, preview, save actions.

### 085D: Platform adapters

- Start with Douyin because 082 already selected it and it has a local-file MVP.
- Then Xiaohongshu and Video Account.
- Bilibili content-level capture stays active; account-level data remains preview-only.

### 085E: Reliability and acceptance

Acceptance gates:

```text
npm run typecheck
npm run test:self-media
npm run test:ui-harness
npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page
git diff --check
```

Browser live acceptance:

- open `/dashboard`;
- go `/import`;
- open platform backend;
- user confirms login;
- capture current visible works data;
- preview;
- confirm save;
- dashboard reflects saved trusted content-level snapshots.

## Security Rules

- Never ask the user for platform passwords in chat or UI.
- Never store cookies/tokens/headers in tracked files or durable app records.
- Treat profile dirs as sensitive local material.
- Do not upload `.local/browser-profiles/**` or `.local/browser-captures/**`.
- Do not read localStorage/sessionStorage wholesale.
- Do not capture private messages, raw comments, danmu content, or follower personal data by default.
- Do not bypass CAPTCHA, QR checks, 2FA, or platform risk controls.
- Do not run public crawling. Only user-owned creator/backend pages.
- Do not auto-register scheduled capture jobs without explicit user approval.

## Open Decisions

1. Should `clear-session` delete the profile directory or only mark it inactive? Safer default: mark inactive; deletion requires explicit per-profile confirmation.
2. Should sanitized raw captures remain available for local debugging? Safer default: keep local-only for a short retention window, then allow explicit cleanup.
3. Should capture be launched from `/import` only, or also from `/dashboard` quick action? Recommendation: `/import` first; dashboard can link to it.
4. Should a future scheduler open browsers automatically? Recommendation: no for now. Show stale status and suggested refresh, then require user click.

## Final Architecture Summary

The new mainline is:

```text
Managed platform browser profile
-> user manual login
-> capture visible creator-center data
-> sanitize immediately
-> preview mapped content-level rows
-> explicit save
-> trusted dashboard/review metrics
```

The old local export path becomes:

```text
Fallback only, collapsed by default, still available when browser capture fails or the user prefers manual export.
```
