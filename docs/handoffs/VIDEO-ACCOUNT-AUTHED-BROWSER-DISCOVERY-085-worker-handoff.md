# VIDEO-ACCOUNT-AUTHED-BROWSER-DISCOVERY-085 worker handoff

## Task

- Task ID: `VIDEO-ACCOUNT-AUTHED-BROWSER-DISCOVERY-085`
- Goal: test whether Video Account Assistant / creator backend can support a user-login, browser-assisted discovery path for content-level data.

## Safety

- Used a visible, non-persistent Playwright browser context.
- User performed manual login.
- Did not run `scripts/video-account-personal-discovery.mjs` because that helper writes `.local/video-account-personal-v0/raw` and `.local/video-account-personal-v0/chrome-profile`.
- Did not save screenshots.
- Did not save cookies, localStorage, sessionStorage, request headers, auth values, raw responses, HAR, trace, or video.
- Did not write `.local` evidence.
- Did not write real operating DB.
- Did not call app APIs.
- Cleared context cookies before closing the browser context.

## What Was Opened

- Start URL: `https://channels.weixin.qq.com/platform`
- Login route observed: `https://channels.weixin.qq.com/login.html`
- Logged-in routes observed:
  - `https://channels.weixin.qq.com/platform/private_msg`
  - `https://channels.weixin.qq.com/platform/statistic/post`
  - `https://channels.weixin.qq.com/platform/statistic/live?mode=total`

## DOM Discovery Result

### First pass

The login page contains marketing/help text with words like data center, video data, browse, and interaction. That produced a false positive if only simple body text matching is used. The login route must be explicitly excluded from future probes.

### Second pass

After manual login, route navigation reached `platform/statistic/post` and `platform/statistic/live?mode=total`.

Plain `document.body.innerText` on the top page was often empty or too sparse, but deeper frame inspection found readable DOM text inside the `https://channels.weixin.qq.com/micro/statistic/post` frame.

Readable, stable categories found in logged-in DOM:

- video data navigation;
- aggregate key indicators;
- date range selector;
- data trend section;
- data source selector;
- data detail section;
- table-like daily rows with columns equivalent to date/time, playback, comments, shares, and follows.

Not confirmed in this pass:

- individual work title;
- individual publish time;
- a stable per-work row containing title + publish time + playback/interaction in one row;
- whether the "single video" mode exposes content-level rows without requiring download/API capture.

## MVP Conclusion

Do not mark Video Account as ready for a content-level browser-assisted MVP yet.

The logged-in DOM path is promising for aggregate or daily detail metrics because the `micro/statistic/post` frame exposes readable text and table-like daily rows. However, the task goal is content-level data: work title, publish time, playback, and interaction. This pass did not prove that those content-level fields are visible and stable in DOM.

Recommended status:

- `aggregate/daily metrics DOM discovery`: feasible;
- `content-level work table DOM discovery`: not proven;
- `MVP readiness`: defer until a focused "single video / work list" follow-up proves title + publish time + metrics in one stable surface.

## Recommended Follow-Up

Run a narrow follow-up discovery after login:

1. Open `platform/statistic/post`.
2. Click the "single video" / "单篇视频" mode if available.
3. Inspect all frames again.
4. Confirm whether visible DOM contains a table/list with:
   - work title;
   - publish time;
   - playback/view count;
   - likes/comments/shares/favorites or equivalent interaction fields.
5. If only a "download table" path exposes content-level rows, treat the MVP as a local export/import flow rather than DOM scraping.

## Verification Performed

- Existing `video-account-personal-discovery.mjs` reviewed and intentionally not run.
- Browser run used no persistent profile argument and no auth vault.
- Frame-level DOM inspection performed after manual login.
- `git status -sb` checked before handoff; no `.local` files were staged or written by this task.

## Residual Risk

- Some logged-in text and account metrics were visible in terminal output during the probe, but they were not persisted to files by this task and are intentionally not copied into this handoff.
- The browser page structure uses nested `/micro/...` frames; future automation must inspect frames and must not rely only on top-level `body.innerText`.
- If future capture uses network responses, it must keep the same no-header/no-cookie/no-token/no-raw-secret policy and write only sanitized local evidence.
