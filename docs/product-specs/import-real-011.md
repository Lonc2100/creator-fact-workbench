# IMPORT-REAL-011: Real Platform Import Preview

## Goal

Upgrade platform import from first-pass CSV templates to a real-file preview contract for Douyin, Xiaohongshu, WeChat Official Account, Bilibili, and Video Account.

This spec converts the accepted `IMPORT-REAL-010` Explorer handoff into an implementation-ready product contract. The next Worker should still implement narrowly: provider-level parsing and preview first, durable storage shape only after the Orchestrator approves any Types/Repo changes.

## Source Of Truth

- Input research and field decisions: `docs/handoffs/IMPORT-REAL-010-worker-handoff.md`.
- Orchestrator acceptance: `docs/handoffs/BACKEND-PRACTICAL-011-orchestrator-plan.md`.
- Existing import baseline: `docs/product-specs/import-001.md`, `docs/product-specs/connector-001.md`, `docs/product-specs/preview-001.md`.
- Runtime data flow remains: UI -> API -> Runtime -> Service -> Providers -> Repo.

Internal normalized metric fields stay stable:

```text
views, likes, comments, saves, shares, followersDelta
```

Platform-native fields must be preserved separately as raw/native preview data and must not be silently forced into normalized metrics.

## Product Problem

Creator-center exports are not uniform. Current CSV presets are useful for first-pass manual import, but real exports may be Excel files, may use native metric names, and may include important platform metrics that do not fit the current normalized model.

The product must let the user preview imported rows, understand which fields were mapped, and confirm-save only rows that can become internal facts.

## Non-Goals

- Do not connect live platform APIs.
- Do not replace the existing import preview flow.
- Do not change dashboard, review, calendar, or UI information architecture in this implementation task.
- Do not collapse exposure, read users, watch duration, danmaku, coin, share users, or cancel followers into normalized fields without a future spec.
- Do not treat Xiaohongshu or Video Account draft headers as confirmed-official until real exported files are provided.

## Supported Inputs

Implementation should support:

- pasted CSV content;
- uploaded CSV file;
- uploaded XLSX file;
- one platform preset at a time;
- header alias detection before confirm-save.

Provider output should remain a provider-owned import preview payload. Raw platform headers must not leak into Service or UI business rules except as explicit preview metadata.

## Platform Preset Confidence

| Platform | Confidence | Source handling |
| --- | --- | --- |
| Douyin | high for official API metric names, medium for creator-center headers | Use official/native API names plus Chinese aliases. |
| WeChat Official Account | high for DataCube fields, medium for manual backend export labels | Keep publish date and statistic date separate. |
| Bilibili | high for mature native stat names, medium for creator-center headers | Preserve danmaku and coin as native metrics. |
| Xiaohongshu | draft-realistic | Accept aliases, but mark as needing real export confirmation. |
| Video Account | draft-realistic | Accept aliases, but mark as needing real export confirmation. |

## Normalized Mapping Rules

Required to save:

- `title` or a native title/description alias.

Strongly recommended:

- native content id;
- publish/create time;
- platform-specific URL when available.

Preview-only dedupe:

- If native id is missing, build a preview dedupe key from `platform + title + publishedAt`.
- Do not save rows with neither title nor identifiable content URL/id.

Date rules:

- `publishedAt` means content publish/create time.
- `capturedAt` means export/statistic date.
- WeChat `ref_date` or statistic date must not overwrite publish time unless the export clearly uses it as publish time.

Native metric rules:

- Douyin `forward_count` and `download_count` stay native; `share_count` maps to normalized `shares`.
- WeChat `share_user`, `add_to_fav_user`, `cancel_user`, and original-page reads stay native.
- Bilibili `danmaku` and `coin` stay native.
- Xiaohongshu exposure, traffic source, search terms, interaction rate, completion rate, and average watch duration stay native.
- Video Account forwarding splits, public-account conversion, region, traffic source, completion rate, and watch duration stay native.

## Provider Contract

Add or extend a provider-level alias registry with confidence flags:

```text
confirmed_official
mature_reference
draft_realistic
confirmed_sampled
```

Preview rows should expose:

```ts
{
  rowNumber: number;
  platform: SelfMediaPlatform;
  normalized: {
    id?: string;
    title?: string;
    publishedAt?: string;
    capturedAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    followersDelta?: number;
  };
  nativeMetrics: Record<string, unknown>;
  rawFields: Record<string, unknown>;
  mappingConfidence: "confirmed_official" | "mature_reference" | "draft_realistic" | "confirmed_sampled";
  warnings: string[];
  previewDedupeKey: string;
}
```

The exact TypeScript shape may be adapted to existing types, but the behavior above is the product contract.

## Allowed Implementation Files

For `IMPORT-REAL-011`, the Orchestrator may allow a narrow provider/preview implementation. Suggested files:

- `src/domain/self-media/providers/csv-preset-provider.ts`
- `src/domain/self-media/providers/*import*`
- `src/domain/self-media/runtime/self-media-runtime.ts`
- `src/app/api/self-media/import/preview/route.ts`
- `tests/self-media-contract.test.ts`
- targeted import fixtures under `tests/` or provider fixture folders

Do not edit UI screens, dashboard/review logic, or unrelated backend modules unless the Orchestrator expands scope. If durable `nativeMetrics/rawFields` storage needs new Types/Repo fields, stop and get Orchestrator approval before implementing that part.

## Acceptance Tests

Implementation acceptance should include:

- Douyin fixture maps play/digg/comment/share into normalized metrics and preserves forward/download as native metrics.
- WeChat fixture separates `publishedAt` and `capturedAt`, maps read/share/favorite counts, and preserves user-count fields.
- Bilibili fixture maps view/like/reply/favorite/share and preserves danmaku/coin.
- Xiaohongshu draft fixture maps core metrics while marking confidence as `draft_realistic`.
- Video Account draft fixture maps core metrics while marking confidence as `draft_realistic`.
- XLSX preview parses at least one platform fixture.
- Missing title or identifiable id/url returns a preview warning and cannot confirm-save.
- Existing CSV import tests still pass.

Recommended commands:

```text
npm run test:self-media
npm run typecheck
npm run verify:harness
git diff --check
```

## Open Decisions

- Which durable entity should own long-term `nativeMetrics` and `rawFields` once preview data is confirmed?
- Should `capturedAt` be added to existing metric snapshots before real export import lands?
- What real exported files can the user provide for Xiaohongshu and Video Account to graduate headers from `draft_realistic` to `confirmed_sampled`?

## Rollback Notes

Provider alias changes can be rolled back by removing the new registry and fixtures. Do not migrate persisted data in this task unless a later approved storage spec is added.
