import type { ContentItem, DouyinBrowserVisibleRow, PlatformMetric, ProviderImportPayload } from "../types";
import { hasTrustedCreatorCenterRowShape } from "./creator-center-row-selector";

type JsonRecord = Record<string, unknown>;

export interface DouyinPersonalCapture {
  file?: string;
  capturedAt?: string;
  urlSanitized?: string;
  body?: unknown;
}

interface DouyinPersonalMappedItem {
  id: string;
  title: string;
  publishedAt?: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  itemUrl?: string;
  coverUrl?: string;
  rawRefs: string[];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === "object") as JsonRecord[]) : [];
}

function textOf(item: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function numberOf(item: JsonRecord, ...keys: string[]) {
  const raw = textOf(item, ...keys).replaceAll(",", "");
  const parsed = Number(raw || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstUrl(value: unknown) {
  const record = asRecord(value);
  const direct = textOf(record, "url", "uri");
  if (direct.startsWith("http")) return direct;
  const list = asArray(record.url_list);
  const url = list.map((item) => textOf(item, "url")).find(Boolean);
  if (url) return url;
  if (Array.isArray(record.url_list)) {
    const first = record.url_list.find((item) => typeof item === "string");
    if (typeof first === "string") return first;
  }
  return "";
}

function toIsoDate(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }
  const normalized = String(value).trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function mergeMetric(target: DouyinPersonalMappedItem, values: Partial<Pick<DouyinPersonalMappedItem, "views" | "likes" | "comments" | "saves" | "shares">>) {
  target.views = values.views ?? target.views;
  target.likes = values.likes ?? target.likes;
  target.comments = values.comments ?? target.comments;
  target.saves = values.saves ?? target.saves;
  target.shares = values.shares ?? target.shares;
}

function refForCapture(capture: DouyinPersonalCapture, fallback: string) {
  return capture.file ?? fallback;
}

function rawNote(item: DouyinPersonalMappedItem) {
  const parts = [`douyin_creator_center`, `raw=${item.rawRefs.join("|")}`];
  if (item.itemUrl) parts.push(`url=${safeRef(item.itemUrl)}`);
  if (item.coverUrl) parts.push(`cover=${safeRef(item.coverUrl)}`);
  return parts.join("; ");
}

function safeRef(value: string) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.slice(0, 160);
  }
}

function isTrustedBrowserVisibleRow(row: DouyinBrowserVisibleRow) {
  const trustedContext = (row.sourcePageKind === "creator_center_owned_works" && row.confidence === "owned_creator_center_row")
    || (row.sourcePageKind === "creator_center_owned_detail" && row.confidence === "owned_creator_center_detail");
  return trustedContext
    && hasTrustedCreatorCenterRowShape(row, "douyin");
}

export class DouyinPersonalProvider {
  fromBrowserVisibleRows(rows: DouyinBrowserVisibleRow[]): ProviderImportPayload {
    const warnings = [
      "douyin_authed_browser_capture: 用户在临时受控浏览器中手动登录后，本地只读取当前页面可见作品行；不保存密码、cookie、token、header 或 raw request。",
      "douyin_authed_browser_capture: 账号总览、粉丝画像、私信、评论正文等账号级或敏感内容不会写入内容指标。"
    ];
    const blockedRows = rows.filter((row) => row.id && row.title && !isTrustedBrowserVisibleRow(row));
    const validRows = rows.filter((row) => row.id && row.title && isTrustedBrowserVisibleRow(row));
    if (blockedRows.length > 0) warnings.push(`douyin_authed_browser_capture: skipped ${blockedRows.length} preview rows without creator-center ownership or stable native id.`);
    if (validRows.length === 0) warnings.push("douyin_authed_browser_capture: 当前页面未识别到可保存的作品级数据行。");
    const contents: ContentItem[] = validRows.map((row) => ({
      id: row.id,
      title: row.title,
      platform: "douyin",
      status: "published",
      format: "short_video",
      topic: row.title,
      publishedAt: row.publishedAt,
      workOwnership: "user_owned_work",
      userConfirmedForLibrary: true,
      dataDomain: "user_work",
      notes: [
        "douyin_authed_browser_capture:visible_dom",
        `sourcePageKind=${row.sourcePageKind}`,
        `nativeIdConfidence=${row.nativeIdConfidence}`,
        row.itemUrl ? `url=${safeRef(row.itemUrl)}` : undefined,
        row.warnings.length > 0 ? `warnings=${row.warnings.join("|").slice(0, 160)}` : undefined
      ].filter(Boolean).join("; ")
    }));
    const metrics: PlatformMetric[] = validRows.map((row) => ({
      id: `metric-douyin-authed-browser-${row.id}`,
      contentId: row.id,
      platform: "douyin",
      capturedAt: row.capturedAt,
      views: row.views,
      likes: row.likes,
      comments: row.comments,
      saves: row.saves,
      shares: row.shares,
      followersDelta: row.followersDelta
    }));
    const rowWarnings = validRows.flatMap((row) => row.warnings.map((warning) => `douyin_authed_browser_capture:${row.id}:${warning}`));
    return {
      source: "douyin_creator_center",
      contents,
      metrics,
      warnings: [...warnings, ...rowWarnings],
      provenance: {
        isTestFixture: false,
        operationKind: "platform_save",
        trustedScopeEligible: true,
        dataDomain: "user_work"
      }
    };
  }

  fromCaptures(captures: DouyinPersonalCapture[]): ProviderImportPayload {
    const byId = new Map<string, DouyinPersonalMappedItem>();
    const warnings: string[] = [];
    let joinedHotItems = 0;
    let skippedHotItems = 0;

    captures.forEach((capture, captureIndex) => {
      const url = capture.urlSanitized ?? "";
      const body = asRecord(capture.body);
      const capturedAt = capture.capturedAt ?? new Date().toISOString();
      const rawRef = refForCapture(capture, `capture-${captureIndex + 1}`);
      if (url.includes("/web/api/creator/item/list")) {
        for (const row of asArray(body.items)) {
          const id = textOf(row, "id");
          if (!id) continue;
          const metrics = asRecord(row.metrics);
          const existing = byId.get(id);
          const item: DouyinPersonalMappedItem = existing ?? {
            id,
            title: textOf(row, "description") || `抖音作品 ${id}`,
            publishedAt: toIsoDate(row.create_time),
            capturedAt,
            views: 0,
            likes: 0,
            comments: 0,
            saves: 0,
            shares: 0,
            coverUrl: firstUrl(row.cover),
            rawRefs: []
          };
          item.title = textOf(row, "description") || item.title;
          item.publishedAt = toIsoDate(row.create_time) ?? item.publishedAt;
          item.coverUrl = firstUrl(row.cover) || item.coverUrl;
          mergeMetric(item, {
            views: numberOf(metrics, "view_count", "play_count"),
            likes: numberOf(metrics, "like_count"),
            comments: numberOf(metrics, "comment_count"),
            saves: numberOf(metrics, "favorite_count", "collect_count"),
            shares: numberOf(metrics, "share_count")
          });
          item.rawRefs.push(rawRef);
          byId.set(id, item);
        }
      }
      if (url.includes("/janus/douyin/creator/data/item_analysis/item_performance")) {
        for (const row of asArray(body.items)) {
          const id = textOf(row, "item_id", "id");
          if (!id) continue;
          const existing = byId.get(id);
          const item: DouyinPersonalMappedItem = existing ?? {
            id,
            title: textOf(row, "title") || `抖音作品 ${id}`,
            publishedAt: toIsoDate(row.publish_time),
            capturedAt,
            views: 0,
            likes: 0,
            comments: 0,
            saves: 0,
            shares: 0,
            coverUrl: firstUrl(row.cover),
            rawRefs: []
          };
          item.title = textOf(row, "title") || item.title;
          item.publishedAt = toIsoDate(row.publish_time) ?? item.publishedAt;
          item.coverUrl = firstUrl(row.cover) || item.coverUrl;
          mergeMetric(item, { views: numberOf(row, "play_count") || item.views });
          item.rawRefs.push(rawRef);
          byId.set(id, item);
        }
      }
      if (url.includes("/dp/douyin/v1/creator/item/hot_video") || url.includes("/dp/douyin/v1/creator/item/hot_topic")) {
        for (const row of asArray(body.data)) {
          const id = textOf(row, "ItemId");
          if (!id) continue;
          const existing = byId.get(id);
          if (!existing) {
            skippedHotItems += 1;
            continue;
          }
          existing.title = textOf(row, "ItemTitle") || existing.title;
          existing.itemUrl = textOf(row, "ItemUrl", "Url") || existing.itemUrl;
          existing.coverUrl = textOf(row, "ItemCoverUrl") || existing.coverUrl;
          mergeMetric(existing, {
            views: numberOf(row, "PlayCount"),
            likes: numberOf(row, "LikeCount"),
            comments: numberOf(row, "CommentCount"),
            shares: numberOf(row, "ShareCount")
          });
          existing.rawRefs.push(rawRef);
          joinedHotItems += 1;
        }
      }
    });

    if (skippedHotItems > 0) warnings.push(`douyin_creator_center: skipped ${skippedHotItems} hot_video/hot_topic rows that did not match personal item list ids.`);
    if (joinedHotItems > 0) warnings.push(`douyin_creator_center: merged ${joinedHotItems} hot_video/hot_topic rows with personal item list ids.`);
    if (byId.size === 0) warnings.push("douyin_creator_center: no personal item list rows were mapped from captures.");

    const items = [...byId.values()];
    const contents: ContentItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      platform: "douyin",
      status: "published",
      format: "short_video",
      topic: item.title,
      publishedAt: item.publishedAt,
      notes: rawNote(item)
    }));
    const metrics: PlatformMetric[] = items.map((item) => ({
      id: `metric-douyin-creator-${item.id}`,
      contentId: item.id,
      platform: "douyin",
      capturedAt: item.capturedAt,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      shares: item.shares,
      followersDelta: 0
    }));
    return { source: "douyin_creator_center", contents, metrics, warnings };
  }
}
