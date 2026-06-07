# NEXT-PLATFORM-CAPTURE-MVP-082

## Decision

Choose Douyin as the second platform after the Bilibili local export MVP.

The implemented MVP is Douyin local file import:

- user exports or copies a content-level table from the Douyin creator backend;
- the app previews CSV/XLSX fields locally;
- the user confirms before save;
- saved rows enter the trusted dashboard as `douyin_creator_center`;
- login state, request headers, and original requests are not saved.

## Path Evaluation

| Platform | Official API | Manual export | Browser assisted | Local file import | Decision |
| --- | --- | --- | --- | --- | --- |
| Douyin | Real future path, but requires user authorization and opened data permissions. | Realistic if the user can export/copy creator content metrics. | Possible only as a user-driven helper, not automatic refresh. | Already supported by alias mappings and now first-class in `/import`. | Implement now. |
| Video Account | No confirmed stable content-level creator metrics API in this project. Public mini-program channel APIs are not equivalent to creator analytics recovery. | Plausible but still needs real exported files to graduate headers. | Possible discovery path, but less certain than Douyin. | Existing preset is `draft_realistic`; not enough confidence for the next closed loop. | Defer. |

## Non-Claims

- Do not claim that logging into a platform web page makes this app refresh automatically.
- Do not save platform credentials, request headers, original requests, private messages, comments, or danmu text.
- Do not treat account-level overview metrics as content-level trusted dashboard facts.

## Acceptance

- `/import` exposes a Douyin local file MVP beside the Bilibili MVP.
- CSV and XLSX payloads can be previewed through `platform_local_file`.
- Confirm-save stores source `douyin_creator_center` with `trustedScopeEligible=true` and `dataDomain=user_work`.
- Generic `mode=csv` remains untrusted.
- Saved Douyin local file rows appear on `/dashboard`.
