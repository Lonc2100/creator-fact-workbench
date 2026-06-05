import type { ContentItem, PlatformMetric, ProviderImportPayload } from "../types";

type JsonRecord = Record<string, unknown>;

export interface XiaohongshuPersonalCapture {
  file?: string;
  capturedAt?: string;
  urlSanitized?: string;
  body?: unknown;
}

interface XiaohongshuMappedNote {
  id: string;
  title: string;
  publishedAt?: string;
  capturedAt: string;
  format: ContentItem["format"];
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  noteUrl?: string;
  coverUrl?: string;
  rawRefs: string[];
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
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

function noteIdFromUrl(value: string) {
  try {
    const url = new URL(value);
    return url.searchParams.get("note_id") ?? "";
  } catch {
    return "";
  }
}

function formatOf(value: unknown): ContentItem["format"] {
  return /video/i.test(String(value ?? "")) ? "short_video" : "image_text";
}

function mergeMetric(target: XiaohongshuMappedNote, values: Partial<Pick<XiaohongshuMappedNote, "views" | "likes" | "comments" | "saves" | "shares" | "followersDelta">>) {
  target.views = values.views ?? target.views;
  target.likes = values.likes ?? target.likes;
  target.comments = values.comments ?? target.comments;
  target.saves = values.saves ?? target.saves;
  target.shares = values.shares ?? target.shares;
  target.followersDelta = values.followersDelta ?? target.followersDelta;
}

function refForCapture(capture: XiaohongshuPersonalCapture, fallback: string) {
  return capture.file ?? fallback;
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

function addRawRef(item: XiaohongshuMappedNote, rawRef: string) {
  if (!item.rawRefs.includes(rawRef)) item.rawRefs.push(rawRef);
}

function rawNote(item: XiaohongshuMappedNote) {
  const parts = [`xiaohongshu_creator_center`, `raw=${item.rawRefs.join("|")}`];
  if (item.noteUrl) parts.push(`url=${safeRef(item.noteUrl)}`);
  if (item.coverUrl) parts.push(`cover=${safeRef(item.coverUrl)}`);
  return parts.join("; ");
}

function createNote(id: string, capturedAt: string): XiaohongshuMappedNote {
  return {
    id,
    title: `小红书笔记 ${id}`,
    capturedAt,
    format: "image_text",
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    followersDelta: 0,
    rawRefs: []
  };
}

function mergeNoteInfo(item: XiaohongshuMappedNote, noteInfo: JsonRecord) {
  item.title = textOf(noteInfo, "title", "desc") || item.title;
  item.publishedAt = toIsoDate(noteInfo.postTime ?? noteInfo.post_time ?? noteInfo.user_update_time ?? noteInfo.update_time) ?? item.publishedAt;
  item.format = formatOf(noteInfo.type || item.format);
  item.noteUrl = textOf(noteInfo, "link") || item.noteUrl;
  item.coverUrl = textOf(noteInfo, "coverUrl", "cover_url") || item.coverUrl;
}

function metricsFromDetail(data: JsonRecord) {
  const seven = asRecord(data.seven);
  const metricSource = Object.keys(seven).length > 0 ? seven : data;
  const noteInfo = asRecord(data.note_info);
  return {
    views: numberOf(data, "view_count") || numberOf(seven, "view_count") || numberOf(noteInfo, "view_count"),
    likes: numberOf(data, "like_count") || numberOf(seven, "like_count") || numberOf(noteInfo, "like_count"),
    comments: numberOf(data, "comment_count") || numberOf(seven, "comment_count") || numberOf(noteInfo, "comment_count"),
    saves: numberOf(data, "collect_count") || numberOf(seven, "collect_count"),
    shares: numberOf(data, "share_count") || numberOf(seven, "share_count"),
    followersDelta: numberOf(data, "rise_fans_count", "net_rise_fans_count") || numberOf(metricSource, "rise_fans_count", "net_rise_fans_count")
  };
}

export class XiaohongshuPersonalProvider {
  fromCaptures(captures: XiaohongshuPersonalCapture[]): ProviderImportPayload {
    const byId = new Map<string, XiaohongshuMappedNote>();
    const warnings: string[] = [];
    let latestNoteId = "";
    let skippedTopicNotes = 0;
    let mergedAmbiguousDetail = 0;

    captures.forEach((capture, captureIndex) => {
      const url = capture.urlSanitized ?? "";
      const body = asRecord(capture.body);
      const data = asRecord(body.data);
      const capturedAt = capture.capturedAt ?? new Date().toISOString();
      const rawRef = refForCapture(capture, `capture-${captureIndex + 1}`);

      if (url.includes("/api/galaxy/creator/home/latest_note_data")) {
        const noteInfo = asRecord(data.noteInfo);
        const id = textOf(noteInfo, "id");
        if (!id) return;
        latestNoteId = id;
        const item = byId.get(id) ?? createNote(id, capturedAt);
        mergeNoteInfo(item, noteInfo);
        addRawRef(item, rawRef);
        byId.set(id, item);
      }

      if (url.includes("/api/galaxy/creator/datacenter/note/base")) {
        const noteInfo = asRecord(data.note_info);
        const id = noteIdFromUrl(url) || textOf(noteInfo, "id");
        if (!id) return;
        const item = byId.get(id) ?? createNote(id, capturedAt);
        mergeNoteInfo(item, noteInfo);
        mergeMetric(item, metricsFromDetail(data));
        addRawRef(item, rawRef);
        byId.set(id, item);
      }

      if (url.includes("/api/galaxy/creator/data/note_detail_new")) {
        const noteInfo = asRecord(data.note_info);
        const id = textOf(noteInfo, "id") || latestNoteId;
        if (!id) return;
        if (!textOf(noteInfo, "id") && latestNoteId) mergedAmbiguousDetail += 1;
        const item = byId.get(id) ?? createNote(id, capturedAt);
        mergeNoteInfo(item, noteInfo);
        mergeMetric(item, metricsFromDetail(data));
        addRawRef(item, rawRef);
        byId.set(id, item);
      }

      if (url.includes("/api/galaxy/creator/select/topic/detail")) {
        skippedTopicNotes += 1;
      }
    });

    if (skippedTopicNotes > 0) warnings.push(`xiaohongshu_creator_center: skipped ${skippedTopicNotes} topic/detail recommendation captures to avoid importing public notes.`);
    if (mergedAmbiguousDetail > 0) warnings.push(`xiaohongshu_creator_center: merged ${mergedAmbiguousDetail} note_detail_new captures with the latest known personal note id.`);
    if (byId.size === 0) warnings.push("xiaohongshu_creator_center: no personal note rows were mapped from captures.");

    const items = [...byId.values()];
    const contents: ContentItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      platform: "xiaohongshu",
      status: "published",
      format: item.format,
      topic: item.title,
      publishedAt: item.publishedAt,
      notes: rawNote(item)
    }));
    const metrics: PlatformMetric[] = items.map((item) => ({
      id: `metric-xiaohongshu-creator-${item.id}`,
      contentId: item.id,
      platform: "xiaohongshu",
      capturedAt: item.capturedAt,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      shares: item.shares,
      followersDelta: item.followersDelta
    }));
    return { source: "xiaohongshu_creator_center", contents, metrics, warnings };
  }
}
