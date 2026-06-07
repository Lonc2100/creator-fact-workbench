import type { ContentItem, PlatformMetric, ProviderImportPayload } from "../types";

type JsonRecord = Record<string, unknown>;

export interface VideoAccountPersonalCapture {
  file?: string;
  capturedAt?: string;
  urlSanitized?: string;
  body?: unknown;
}

interface VideoAccountMappedPost {
  id: string;
  title: string;
  publishedAt: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
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

function readableText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = readableText(item);
      if (text) return text;
    }
  }
  if (!value || typeof value !== "object") return "";
  const record = asRecord(value);
  for (const key of ["shortTitle", "title", "description", "desc", "content", "text"]) {
    const text = readableText(record[key]);
    if (text) return text;
  }
  return "";
}

function numberOf(item: JsonRecord, ...keys: string[]) {
  const raw = textOf(item, ...keys).replaceAll(",", "");
  const parsed = Number(raw || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasField(item: JsonRecord, ...keys: string[]) {
  return keys.some((key) => {
    const value = item[key];
    return value !== undefined && value !== null && String(value) !== "";
  });
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

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

function safeId(value: string) {
  return `video-account-${stableHash(value)}`;
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

function firstMedia(row: JsonRecord) {
  return asRecord(asArray(asRecord(row.desc).media)[0]);
}

function coverUrl(row: JsonRecord) {
  const media = firstMedia(row);
  return textOf(media, "coverUrl", "thumbUrl", "fullCoverUrl", "shareCoverUrl");
}

function postTitle(row: JsonRecord) {
  const desc = asRecord(row.desc);
  return readableText(desc.shortTitle) || readableText(desc.description);
}

function rawNote(item: VideoAccountMappedPost) {
  const parts = [`video_account_creator_center`, `raw=${item.rawRefs.join("|")}`];
  if (item.coverUrl) parts.push(`cover=${safeRef(item.coverUrl)}`);
  return parts.join("; ");
}

function addRawRef(item: VideoAccountMappedPost, rawRef: string) {
  if (!item.rawRefs.includes(rawRef)) item.rawRefs.push(rawRef);
}

function metricsFromRow(row: JsonRecord) {
  return {
    views: numberOf(row, "readCount"),
    likes: numberOf(row, "likeCount"),
    comments: numberOf(row, "commentCount"),
    saves: numberOf(row, "favCount"),
    shares: numberOf(row, "forwardCount") || numberOf(row, "forwardAggregationCount"),
    followersDelta: numberOf(row, "followCount")
  };
}

function contentLevelReadiness(row: JsonRecord) {
  const missing: string[] = [];
  if (!postTitle(row)) missing.push("title");
  if (!toIsoDate(row.createTime)) missing.push("publish_time");
  if (!hasField(row, "readCount")) missing.push("views");
  if (!hasField(row, "likeCount")) missing.push("likes");
  if (!hasField(row, "commentCount")) missing.push("comments");
  if (!hasField(row, "forwardCount", "forwardAggregationCount")) missing.push("shares");
  return { ready: missing.length === 0, missing };
}

function mergeMetric(target: VideoAccountMappedPost, values: Partial<Pick<VideoAccountMappedPost, "views" | "likes" | "comments" | "saves" | "shares" | "followersDelta">>) {
  target.views = values.views ?? target.views;
  target.likes = values.likes ?? target.likes;
  target.comments = values.comments ?? target.comments;
  target.saves = values.saves ?? target.saves;
  target.shares = values.shares ?? target.shares;
  target.followersDelta = values.followersDelta ?? target.followersDelta;
}

function refForCapture(capture: VideoAccountPersonalCapture, fallback: string) {
  return capture.file ?? fallback;
}

function isUsableObjectId(value: string) {
  return Boolean(value) && value !== "[REDACTED]" && !value.includes("[REDACTED]");
}

export class VideoAccountPersonalProvider {
  fromCaptures(captures: VideoAccountPersonalCapture[]): ProviderImportPayload {
    const byId = new Map<string, VideoAccountMappedPost>();
    const warnings: string[] = [];
    let mergedInteractionRows = 0;
    let mergedBulletRows = 0;
    let skippedPrivateEndpoints = 0;
    let skippedRedactedObjectIds = 0;
    let skippedUnmatchedInteractionRows = 0;
    let skippedIncompleteContentRows = 0;
    const skippedIncompleteRowsByReason = new Map<string, number>();

    captures.forEach((capture, captureIndex) => {
      const url = capture.urlSanitized ?? "";
      const body = asRecord(capture.body);
      const data = asRecord(body.data);
      const list = asArray(data.list);
      const capturedAt = capture.capturedAt ?? new Date().toISOString();
      const rawRef = refForCapture(capture, `capture-${captureIndex + 1}`);

      if (url.includes("/private-msg/")) {
        skippedPrivateEndpoints += 1;
        return;
      }

      if (url.includes("/micro/content/cgi-bin/mmfinderassistant-bin/post/post_list")) {
        for (const row of list) {
          const objectId = textOf(row, "objectId");
          if (!isUsableObjectId(objectId)) {
            skippedRedactedObjectIds += 1;
            continue;
          }
          const readiness = contentLevelReadiness(row);
          if (!readiness.ready) {
            skippedIncompleteContentRows += 1;
            const key = readiness.missing.join("+");
            skippedIncompleteRowsByReason.set(key, (skippedIncompleteRowsByReason.get(key) ?? 0) + 1);
            continue;
          }
          const id = safeId(objectId);
          const existing = byId.get(id);
          const title = postTitle(row);
          const publishedAt = toIsoDate(row.createTime);
          const item: VideoAccountMappedPost = existing ?? {
            id,
            title,
            publishedAt: publishedAt ?? "",
            capturedAt,
            views: 0,
            likes: 0,
            comments: 0,
            saves: 0,
            shares: 0,
            followersDelta: 0,
            coverUrl: coverUrl(row),
            rawRefs: []
          };
          item.title = title;
          item.publishedAt = publishedAt ?? item.publishedAt;
          item.coverUrl = coverUrl(row) || item.coverUrl;
          mergeMetric(item, metricsFromRow(row));
          addRawRef(item, rawRef);
          byId.set(id, item);
        }
      }

      if (url.includes("/micro/interaction/cgi-bin/mmfinderassistant-bin/post/post_list") || url.includes("/micro/interaction/cgi-bin/mmfinderassistant-bin/bullet-chat/feed-list")) {
        const isBullet = url.includes("/bullet-chat/feed-list");
        for (const row of list) {
          const objectId = textOf(row, "objectId");
          if (!isUsableObjectId(objectId)) {
            skippedRedactedObjectIds += 1;
            continue;
          }
          const id = safeId(objectId);
          const item = byId.get(id);
          if (!item) {
            skippedUnmatchedInteractionRows += 1;
            continue;
          }
          item.coverUrl = coverUrl(row) || item.coverUrl;
          mergeMetric(item, metricsFromRow(row));
          addRawRef(item, rawRef);
          if (isBullet) mergedBulletRows += 1;
          else mergedInteractionRows += 1;
        }
      }
    });

    if (skippedPrivateEndpoints > 0) warnings.push(`video_account_creator_center: skipped ${skippedPrivateEndpoints} private message endpoints.`);
    if (skippedRedactedObjectIds > 0) warnings.push(`video_account_creator_center: skipped ${skippedRedactedObjectIds} rows with redacted or missing objectId.`);
    if (skippedIncompleteContentRows > 0) {
      const reasonSummary = [...skippedIncompleteRowsByReason.entries()].map(([reason, count]) => `${reason}=${count}`).join(", ");
      warnings.push(`video_account_creator_center: skipped ${skippedIncompleteContentRows} post_list rows without complete content-level fields (title, publish_time, views, likes, comments, shares); missing ${reasonSummary}.`);
    }
    if (skippedUnmatchedInteractionRows > 0) warnings.push(`video_account_creator_center: skipped ${skippedUnmatchedInteractionRows} interaction rows that did not match content post ids.`);
    if (mergedInteractionRows > 0) warnings.push(`video_account_creator_center: merged ${mergedInteractionRows} interaction post rows with content post ids.`);
    if (mergedBulletRows > 0) warnings.push(`video_account_creator_center: merged ${mergedBulletRows} bullet-chat feed rows with content post ids; comment text remains out of scope.`);
    if (byId.size === 0) warnings.push("video_account_creator_center: no personal post rows were mapped from captures.");

    const items = [...byId.values()];
    const contents: ContentItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      platform: "video_account",
      status: "published",
      format: "short_video",
      topic: item.title,
      publishedAt: item.publishedAt,
      notes: rawNote(item)
    }));
    const metrics: PlatformMetric[] = items.map((item) => ({
      id: `metric-video-account-creator-${item.id}`,
      contentId: item.id,
      platform: "video_account",
      capturedAt: item.capturedAt,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      shares: item.shares,
      followersDelta: item.followersDelta
    }));
    return { source: "video_account_creator_center", contents, metrics, warnings };
  }
}
