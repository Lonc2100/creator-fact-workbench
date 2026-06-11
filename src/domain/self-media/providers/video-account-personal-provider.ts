import type { ContentItem, PlatformMetric, ProviderImportPayload, VideoAccountBrowserVisibleRow } from "../types";

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

export type VideoAccountDomCandidate = {
  text: string;
  tagName?: string;
  role?: string;
  className?: string;
  idAttr?: string;
  titleAttr?: string;
  hrefs: string[];
  dataValues: string[];
  cells: string[];
  columnNames: string[];
  childCandidateCount: number;
};

type PageScanMetricCoverage = {
  values: Pick<VideoAccountBrowserVisibleRow, "views" | "likes" | "comments" | "saves" | "shares" | "followersDelta">;
  present: Partial<Record<"views" | "likes" | "comments" | "saves" | "shares", boolean>>;
  recommendationSeen: boolean;
};

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
  return Boolean(value) && value !== "[REDACTED]" && !value.includes("[REDACTED]") && !isUnstableVideoAccountNativeId(value);
}

function clean(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function numberFrom(value: string) {
  const source = clean(value).replace(/,/g, "");
  const match = source.match(/(-?\d+(?:\.\d+)?)\s*(万|亿|k|K)?/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  const unit = match[2];
  if (unit === "亿") return Math.round(base * 100000000);
  if (unit === "万") return Math.round(base * 10000);
  if (unit === "k" || unit === "K") return Math.round(base * 1000);
  return Math.round(base);
}

function metricValue(text: string, labels: string[]) {
  for (const label of labels) {
    const after = text.match(new RegExp(`${label}[^\\d-]{0,10}(-?\\d[\\d,.]*(?:\\.\\d+)?\\s*(?:万|亿|k|K)?)`));
    if (after) return numberFrom(after[1]);
    const before = text.match(new RegExp(`(-?\\d[\\d,.]*(?:\\.\\d+)?\\s*(?:万|亿|k|K)?)\\s*${label}`));
    if (before) return numberFrom(before[1]);
  }
  return 0;
}

function publishedAtFromText(text: string) {
  const exact = text.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/);
  if (exact) {
    const normalized = exact[1].replace("年", "-").replace("月", "-").replace("日", "").replace(/\//g, "-");
    const parsed = new Date(normalized.includes(":") ? normalized : `${normalized}T00:00:00`);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
  }
  const relative = text.match(/(\d{1,2})月(\d{1,2})日(?:\s*(\d{1,2}:\d{2}))?/);
  if (relative) {
    const year = new Date().getFullYear();
    const parsed = new Date(`${year}-${relative[1].padStart(2, "0")}-${relative[2].padStart(2, "0")}T${relative[3] ?? "00:00"}`);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
  }
  return undefined;
}

function nonEmptyCells(candidate: VideoAccountDomCandidate) {
  return candidate.cells.map(clean).filter(Boolean);
}

function isMetricLikeText(value: string) {
  return /(播放|曝光|浏览|观看|阅读|点赞|评论|收藏|分享|转发|推荐|涨粉|关注|互动)/.test(value);
}

function isBadTitleLine(value: string) {
  if (value.length < 4 || value.length > 140) return true;
  if (isMetricLikeText(value)) return true;
  if (/^(视频号|视频号助手|内容管理|作品管理|数据中心|数据概览|账号总览|互动数据|作品数据|发表时间|发布时间|已发表|全部|\d+)$/.test(value)) return true;
  if (/编辑|删除|查看|更多|置顶|发布|导出|下载|回复|私信|设置/.test(value)) return true;
  if (/^20\d{2}[-/.年]/.test(value)) return true;
  return false;
}

function titleOf(candidate: VideoAccountDomCandidate) {
  const lines = [
    clean(candidate.titleAttr),
    ...nonEmptyCells(candidate),
    ...clean(candidate.text).split(/\n|\r| {2,}/).map(clean)
  ].filter(Boolean);
  const title = lines.find((line) => !isBadTitleLine(line));
  return title ? title.slice(0, 140) : "视频号作品";
}

function isNoisyContainer(candidate: VideoAccountDomCandidate) {
  const text = clean(candidate.text);
  if (candidate.childCandidateCount > 0) return true;
  if (text.length > 1800) return true;
  if ((text.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/g) ?? []).length > 1) return true;
  if (/(账号总览|数据总览|粉丝画像|用户画像|私信|评论正文|直播数据|带货|收入|收益)/.test(text)) return true;
  return false;
}

function isUnstableVideoAccountNativeId(value: string | undefined) {
  if (!value) return true;
  const normalized = clean(value);
  if (!normalized || normalized === "[REDACTED]" || normalized.includes("[REDACTED]")) return true;
  if (/^(table|row|card|item|button|container|tab|panel|list|form|root|app|main|content|index|undefined|null)$/i.test(normalized)) return true;
  if (/^__|svg|sprite|node|icon|symbol/i.test(normalized)) return true;
  if (normalized.startsWith("export/")) return normalized.length < 28;
  if (/^https?:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]{6,}/.test(normalized)) return false;
  if (/^[A-Za-z0-9_-]{1,10}$/.test(normalized)) return true;
  return normalized.length < 12;
}

function nativeIdOf(candidate: VideoAccountDomCandidate) {
  const values = [...candidate.hrefs, ...candidate.dataValues, candidate.idAttr ?? ""].map(clean).filter(Boolean);
  for (const value of values) {
    const exportMatch = value.match(/(export\/[A-Za-z0-9_-]{20,})/);
    if (exportMatch && !isUnstableVideoAccountNativeId(exportMatch[1])) {
      return { id: safeId(exportMatch[1]), nativeId: exportMatch[1], itemUrl: undefined, nativeIdConfidence: "stable_platform_id" as const };
    }
  }
  for (const value of candidate.hrefs) {
    const sphMatch = value.match(/https?:\/\/weixin\.qq\.com\/sph\/[A-Za-z0-9_-]{6,}/);
    if (sphMatch && !isUnstableVideoAccountNativeId(sphMatch[0])) {
      const itemUrl = safeRef(sphMatch[0]);
      return { id: safeId(itemUrl), nativeId: itemUrl, itemUrl, nativeIdConfidence: "stable_platform_id" as const };
    }
  }
  const visible = candidate.text.match(/(?:作品ID|视频ID|feed[_\s-]?id|export[_\s-]?id)[:：\s]*(export\/[A-Za-z0-9_-]{20,}|[A-Za-z0-9_-]{12,})/i)?.[1];
  if (visible && !isUnstableVideoAccountNativeId(visible)) {
    return { id: safeId(visible), nativeId: visible, itemUrl: undefined, nativeIdConfidence: "visible_platform_id" as const };
  }
  return { id: `video-account-page-${stableHash(candidate.text.slice(0, 260))}`, nativeId: undefined, itemUrl: undefined, nativeIdConfidence: "fallback_text_hash" as const };
}

function metricLabels() {
  return {
    views: ["播放量", "播放", "曝光量", "曝光", "浏览量", "浏览", "观看量", "观看", "阅读量", "阅读"],
    likes: ["点赞数", "点赞"],
    comments: ["评论数", "评论"],
    saves: ["收藏数", "收藏"],
    shares: ["分享数", "分享", "转发数", "转发", "朋友圈转发"],
    followersDelta: ["涨粉", "新增关注", "关注变化"]
  };
}

function metricKeyFromHeader(value: string): keyof PageScanMetricCoverage["values"] | undefined {
  const labels = metricLabels();
  if (labels.views.some((label) => value.includes(label))) return "views";
  if (labels.likes.some((label) => value.includes(label))) return "likes";
  if (labels.comments.some((label) => value.includes(label))) return "comments";
  if (labels.saves.some((label) => value.includes(label))) return "saves";
  if (labels.shares.some((label) => value.includes(label))) return "shares";
  if (labels.followersDelta.some((label) => value.includes(label))) return "followersDelta";
  return undefined;
}

function labeledMetrics(text: string): PageScanMetricCoverage {
  const labels = metricLabels();
  const values = {
    views: metricValue(text, labels.views),
    likes: metricValue(text, labels.likes),
    comments: metricValue(text, labels.comments),
    saves: metricValue(text, labels.saves),
    shares: metricValue(text, labels.shares),
    followersDelta: metricValue(text, labels.followersDelta)
  };
  return {
    values,
    present: {
      views: labels.views.some((label) => text.includes(label)),
      likes: labels.likes.some((label) => text.includes(label)),
      comments: labels.comments.some((label) => text.includes(label)),
      saves: labels.saves.some((label) => text.includes(label)),
      shares: labels.shares.some((label) => text.includes(label))
    },
    recommendationSeen: /推荐/.test(text)
  };
}

function tableMetrics(candidate: VideoAccountDomCandidate): PageScanMetricCoverage {
  const values = { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 0 };
  const present: PageScanMetricCoverage["present"] = {};
  const headers = candidate.columnNames.map(clean);
  const cells = nonEmptyCells(candidate);
  if (headers.length === 0 || cells.length === 0) return { values, present, recommendationSeen: /推荐/.test(candidate.text) };
  headers.forEach((header, index) => {
    const key = metricKeyFromHeader(header);
    if (!key) return;
    if (key !== "followersDelta") present[key] = true;
    values[key] = numberFrom(cells[index] ?? "");
  });
  return { values, present, recommendationSeen: headers.some((header) => header.includes("推荐")) || /推荐/.test(candidate.text) };
}

function metricsOf(candidate: VideoAccountDomCandidate): PageScanMetricCoverage {
  const byTable = tableMetrics(candidate);
  if (Object.values(byTable.present).some(Boolean)) return byTable;
  return labeledMetrics(candidate.text);
}

function pageScanReadiness(row: VideoAccountBrowserVisibleRow, present: PageScanMetricCoverage["present"]) {
  const missingFields: string[] = [];
  if (!row.title || row.title === "视频号作品") missingFields.push("title");
  if (!row.publishedAt) missingFields.push("publishedAt");
  if (!row.nativeId || row.nativeIdConfidence === "fallback_text_hash") missingFields.push("stableIdOrLink");
  if (!present.views) missingFields.push("views");
  if (!present.likes) missingFields.push("likes");
  if (!present.comments) missingFields.push("comments");
  if (!present.shares) missingFields.push("shares");
  const blockReasons = [...missingFields];
  if (row.sourcePageKind !== "creator_center_owned_works") blockReasons.push("notVideoAccountAssistantWorksPage");
  if (isNoisyContainer({ text: row.title, hrefs: [], dataValues: [], cells: [], columnNames: [], childCandidateCount: 0 })) blockReasons.push("noisyTitle");
  return { missingFields, blockReasons };
}

export function selectVideoAccountAssistantPageRows(candidates: VideoAccountDomCandidate[], capturedAt: string): VideoAccountBrowserVisibleRow[] {
  const rows: VideoAccountBrowserVisibleRow[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const text = clean(candidate.text);
    if (text.length < 12 || text.length > 2200) continue;
    if (!isMetricLikeText(text) && !candidate.columnNames.some(isMetricLikeText)) continue;
    if (isNoisyContainer(candidate)) continue;
    const idInfo = nativeIdOf(candidate);
    const title = titleOf(candidate);
    const coverage = metricsOf(candidate);
    const pageLooksRight = /(视频号助手|视频号|作品|内容|发表|发布|播放|曝光|浏览)/.test(text);
    const row: VideoAccountBrowserVisibleRow = {
      id: idInfo.id,
      nativeId: idInfo.nativeId,
      title,
      publishedAt: publishedAtFromText(text),
      capturedAt,
      ...coverage.values,
      itemUrl: idInfo.itemUrl,
      extractionSource: "visible_dom",
      sourcePageKind: pageLooksRight ? "creator_center_owned_works" : "creator_center_unknown",
      confidence: pageLooksRight ? "owned_creator_center_row" : "unknown",
      nativeIdConfidence: idInfo.nativeIdConfidence,
      canSave: false,
      missingFields: [],
      blockReasons: [],
      warnings: []
    };
    const readiness = pageScanReadiness(row, coverage.present);
    row.missingFields = readiness.missingFields;
    row.blockReasons = readiness.blockReasons;
    row.canSave = row.blockReasons.length === 0;
    if (row.nativeIdConfidence === "fallback_text_hash") row.warnings.push("fallback_id_from_visible_text");
    if (coverage.recommendationSeen && !coverage.present.saves) row.warnings.push("video_account_recommendation_not_mapped_to_saves");
    if (row.missingFields.length > 0) row.warnings.push(`missing_fields:${row.missingFields.join(",")}`);
    if (!row.canSave) row.warnings.push("video_account_page_scan_blocked");
    const key = `${row.id}|${row.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
    if (rows.length >= 30) break;
  }
  return rows;
}

function noteForBrowserRow(row: VideoAccountBrowserVisibleRow) {
  return [
    "video_account_assisted_page_scan:manual_confirmed",
    row.nativeId ? `stable=${row.nativeId}` : undefined,
    row.itemUrl ? `link=${safeRef(row.itemUrl)}` : undefined,
    row.warnings.includes("video_account_recommendation_not_mapped_to_saves") ? "recommendation_not_mapped_to_saves" : undefined
  ].filter((item): item is string => Boolean(item)).join("; ");
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

  fromBrowserVisibleRows(rows: VideoAccountBrowserVisibleRow[]): ProviderImportPayload {
    const saveRows = rows.filter((row) => row.canSave);
    const skippedRows = rows.length - saveRows.length;
    const warnings = [
      "video_account_assisted_page_scan: 从用户已打开/确认登录的视频号助手当前页读取可见作品行；先预览，用户确认前不保存。",
      "video_account_assisted_page_scan: 推荐不映射为收藏；只有明确收藏字段才写入 saves。"
    ];
    if (skippedRows > 0) warnings.push(`video_account_assisted_page_scan: skipped ${skippedRows} blocked visible rows.`);
    const contents: ContentItem[] = saveRows.map((row) => ({
      id: row.id,
      title: row.title,
      platform: "video_account",
      status: "published",
      format: "short_video",
      topic: row.title,
      publishedAt: row.publishedAt,
      workOwnership: "user_owned_work",
      userConfirmedForLibrary: true,
      notes: noteForBrowserRow(row)
    }));
    const metrics: PlatformMetric[] = saveRows.map((row) => ({
      id: `metric-video-account-page-${row.id}`,
      contentId: row.id,
      platform: "video_account",
      capturedAt: row.capturedAt,
      views: row.views,
      likes: row.likes,
      comments: row.comments,
      saves: row.saves,
      shares: row.shares,
      followersDelta: row.followersDelta
    }));
    return {
      source: "video_account_creator_center",
      contents,
      metrics,
      warnings,
      provenance: {
        isTestFixture: false,
        operationKind: "platform_save",
        trustedScopeEligible: true,
        dataDomain: "user_work"
      }
    };
  }
}
