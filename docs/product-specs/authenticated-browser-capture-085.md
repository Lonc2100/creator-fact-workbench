# AUTHENTICATED-BROWSER-CAPTURE-085

## Mainline Decision

The data recovery mainline is user-assisted authenticated browser capture:

1. the app opens a controlled local browser session for the platform backend;
2. the user manually logs in, scans QR codes, or completes risk checks;
3. the app reads only the user's currently visible creator/backend content-level data;
4. the app shows a preview;
5. the user explicitly confirms save;
6. trusted content-level metrics enter dashboard and reviews.

Local CSV/XLSX export remains available only as a fallback when browser capture is blocked, unstable, or not preferred by the user.

## Safety Boundary

- Do not ask for or save platform passwords.
- Do not persist cookies, tokens, auth headers, request headers, browser storage state, raw requests, or raw responses as app records.
- Browser profiles and capture evidence, if used, stay local-only under `.local/**`.
- Do not bypass CAPTCHA, QR checks, MFA, platform risk controls, or platform permissions.
- Do not run public crawling. Capture only the user's own creator/backend pages.
- Do not save account-level overview metrics into content-level trusted totals.
- Bilibili account metrics remain preview-only.
- WeChat Official Account and WeChat backend remain paused.

## Current MVP State

Douyin has the first browser-assisted MVP:

- `/import` exposes the recommended login capture entry.
- The user opens Douyin Creator Center in a controlled browser.
- The user confirms login and navigates to a content-level works/data page.
- The app reads visible DOM rows only.
- The app previews and saves sanitized content-level rows as `douyin_creator_center`.

This MVP is intentionally not the final scheduler or persistent-session implementation. It proves the primary product direction: user-assisted login capture before local export fallback.

## Fallback State

Existing local export import paths for Douyin, Xiaohongshu, and Bilibili remain available but should be collapsed behind fallback UI:

```text
本地导出兜底
平台风控、无法登录、页面结构失效、或用户更想手动导出时使用。
```

Future work should extend browser-assisted capture to Xiaohongshu, Video Account, and Bilibili content-level data before treating local export as the daily default.
