# BROWSER-COLLECTOR-V0 Orchestrator Plan

## Purpose

This plan corrects the import strategy after `IMPORT-REAL-011` and `IMPORT-PREVIEW-UI-012`.

CSV/XLSX import remains a fallback, but the practical creator workflow should add browser logged-in collection for personal creator centers.

## Accepted Default

`DOUYIN-PERSONAL-V0` is the default first browser collector.

Target URL:

```text
https://creator.douyin.com/creator-micro/data-center/operation
```

Collection style:

- User logs in locally in the browser.
- The system never asks for or stores the user's password.
- Collector attaches to the logged-in browser session.
- Collector listens to Network JSON responses.
- Raw JSON is saved locally for inspection.
- Parsed metrics become internal metric snapshots only after the mapping is verified.

## Why Browser Collector Instead Of File Import Alone

File import cannot prove each platform's current export headers. Creator centers also often expose more useful JSON payloads than their exported files.

Browser collector gives us:

- current real response shapes;
- platform-native metric names;
- account overview and content-level metrics;
- a path that does not depend on official API approval;
- a repeatable local capture process.

## Safety Rules

- Do not store passwords.
- Do not print cookies, tokens, auth headers, or full request headers into docs, tests, or committed files.
- Store raw payloads only under `.local/` by default.
- Redact request headers and sensitive query parameters in reports.
- Do not bypass CAPTCHA, login challenges, or anti-abuse systems.
- The user must log in manually when required.

## DOUYIN-PERSONAL-V0 Scope

First page/module coverage:

- account overview;
- content/work data list;
- plays/views;
- likes;
- comments count;
- shares;
- follower delta if present;
- comment content only if visible in normal creator-center responses.

Snapshot target shape:

```text
contentId
platformVersionId?
snapshotAt
views
likes
comments
shares
followersDelta
source = douyin_creator_center
rawPayload
```

## Recommended First Worker

Start `DOUYIN-PERSONAL-V0-COLLECTOR-013` as a narrow implementation task.

This first Worker should not persist data into Repo yet unless the mapping is proven. It should:

1. create a local collector script;
2. open/connect to a user-logged-in browser;
3. capture Network JSON responses from the Douyin creator data-center page;
4. save sanitized raw captures to `.local/douyin-personal-v0/`;
5. generate a report of candidate endpoints and field paths;
6. write a handoff with what was actually captured.

Only after this succeeds should a second Worker map captures into durable `MetricSnapshot` records.

## Browser Automation Current Status

`npm run check:browser` on 2026-06-03:

- CLI available: yes.
- snapshot/click/eval/screenshot: pass.
- skill command: unavailable in installed `agent-browser 0.21.4`.
- open-local-fixture: timed out, while later page operations still worked.

Decision:

- Use a Playwright/CDP-style collector for platform capture instead of relying only on `agent-browser open`.
- Keep `npm run check:browser` as a diagnostic, but do not treat its current open timeout as a blocker for building a dedicated collector.

## Platform Sequence

Current priority after `PLATFORM-PRIORITY-019`:

1. Douyin personal creator center.
2. Xiaohongshu creator center.
3. Video Account assistant.
4. Bilibili creator center, only after the first three platform loops are operationally smooth.

WeChat Official Account backend pages are deferred until the user explicitly reopens that platform. The current account reading and follower volume is too small to justify more targeted backend discovery now.

Do not build all platforms in one Worker. Each platform should get its own collector task and handoff.
