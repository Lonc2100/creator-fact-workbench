# PLATFORM-PRIORITY-019 Orchestrator Decision

## Decision

WeChat Official Account backend work is deferred.

Reason:

- Current account reading and follower volume is too small to justify more targeted backend discovery now.
- WeChat backend V0 already proved login-accessible capture, but it did not confirm the important metric pages.
- Continuing WeChat now would spend coordination time on low-signal data.

## Current Platform Priority

Active first:

1. Douyin personal creator center
2. Xiaohongshu creator center
3. Video Account assistant

Deferred:

1. WeChat Official Account backend

Later optional:

1. Bilibili creator center
2. Other platforms only after the first three personal-platform loops are stable enough.

## What "Finish The Others" Means Now

For Douyin, Xiaohongshu, and Video Account, the next work should improve practical usability instead of reopening discovery from scratch:

- make collector commands easier to run;
- reduce manual handoff friction;
- add clearer import status and last-run visibility;
- keep mappings stable against small endpoint shape changes;
- add smoke tests for repeated saves and idempotent upserts;
- expose imported platform metrics cleanly in dashboard, calendar, and review flows where relevant.

## Guardrails

- Do not start WeChat V1 metric mapping until the user explicitly reopens it.
- Do not start broad public crawling.
- Keep platform capture scoped to the user's own logged-in creator/admin data.
- Do not store passwords, cookies, tokens, or full request headers in docs, tests, or committed files.
- Keep raw payloads local under `.local/`.

## Recommended Next Sequence

1. Consolidate Douyin, Xiaohongshu, and Video Account save-smoke behavior into a shared practical import runner.
2. Add a small UI/API surface for last import status and manual trigger where it fits the existing backend model.
3. Add repeated-save/idempotency checks for the three accepted platforms.
4. Start Bilibili V0 discovery only after the first three platforms feel operationally smooth.

## Communication Note For Future Workers

If a worker sees older WeChat backend handoffs, treat them as historical context only.

Current instruction is:

```text
Do not continue WeChat Official Account backend work unless the user explicitly reopens it.
Focus on Douyin, Xiaohongshu, Video Account, and shared operational polish first.
```
