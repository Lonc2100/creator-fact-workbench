import type { AccountMetricSnapshot, ContentItem, PlatformMetric, ProviderImportPayload } from "../types";

type JsonRecord = Record<string, unknown>;

export interface BilibiliPersonalCapture {
  file?: string;
  capturedAt?: string;
  urlSanitized?: string;
  body?: unknown;
}

interface BilibiliMappedWork {
  id: string;
  platformVersionId: string;
  nativeId: string;
  bvid?: string;
  title: string;
  publishedAt?: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  rawRefs: string[];
}

export interface BilibiliAccountMetricPreview {
  capturedAt: string;
  endpoint: "index_stat" | "overview_stat_num" | "overview_compare" | "overview_stat_graph";
  snapshotDate?: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
}

export interface BilibiliDateKeyPreview {
  sourceDateKey: string;
  normalizedDate: string;
  rowKind: string;
  rowCount: number;
}

export interface BilibiliPersonalPreviewPayload extends ProviderImportPayload {
  accountMetrics: BilibiliAccountMetricPreview[];
  dateKeyRows: BilibiliDateKeyPreview[];
}

export interface BilibiliAccountMetricCandidate {
  snapshot: AccountMetricSnapshot;
  endpoint: BilibiliAccountMetricPreview["endpoint"];
  capturedAt: string;
  selectedFrom: number;
  dedupeReason: string;
}

export interface BilibiliRejectedAccountMetric {
  endpoint: BilibiliAccountMetricPreview["endpoint"] | "unknown";
  capturedAt?: string;
  snapshotDate?: string;
  reason: string;
}

export interface BilibiliAccountMetricsPreviewResult {
  source: "bilibili_creator_center";
  saved: false;
  previewOnly: true;
  candidates: BilibiliAccountMetricCandidate[];
  rejected: BilibiliRejectedAccountMetric[];
  diagnostics: {
    inputAccountMetricCount: number;
    inputDateKeyRowCount: number;
    dateKeyRows: BilibiliDateKeyPreview[];
    dedupeGroups: Array<{ date: string; inputRows: number; selectedCapturedAt?: string; rejectedRows: number; reason: string }>;
    warnings: string[];
  };
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

function toIsoDate(value: unknown) {
  if (value === undefined || value === null || value === "" || value === 0) return undefined;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }
  const normalized = String(value).trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function normalizeDateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!/^\d{8}$/.test(value)) return undefined;
  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? undefined : `${year}-${month}-${day}`;
}

function safeToken(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function contentIdFor(nativeId: string) {
  return `bilibili-${safeToken(nativeId)}`;
}

function platformVersionIdFor(contentId: string) {
  return `platform-version-${contentId}`;
}

function refForCapture(capture: BilibiliPersonalCapture, fallback: string) {
  return capture.file ?? fallback;
}

function addRawRef(item: BilibiliMappedWork, rawRef: string) {
  if (!item.rawRefs.includes(rawRef)) item.rawRefs.push(rawRef);
}

function rawNote(item: BilibiliMappedWork) {
  const parts = ["bilibili_creator_center", `platformVersionId=${item.platformVersionId}`, `nativeId=${safeToken(item.nativeId)}`, `raw=${item.rawRefs.join("|")}`];
  if (item.bvid) parts.push(`bvid=${safeToken(item.bvid)}`);
  return parts.join("; ");
}

function mergeMetric(target: BilibiliMappedWork, values: Partial<Pick<BilibiliMappedWork, "views" | "likes" | "comments" | "saves" | "shares" | "followersDelta">>) {
  target.views = values.views ?? target.views;
  target.likes = values.likes ?? target.likes;
  target.comments = values.comments ?? target.comments;
  target.saves = values.saves ?? target.saves;
  target.shares = values.shares ?? target.shares;
  target.followersDelta = values.followersDelta ?? target.followersDelta;
}

function statusText(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function isZeroLike(value: unknown) {
  return value === 0 || value === false || value === "0" || value === "false";
}

function isOneLike(value: unknown) {
  return value === 1 || value === true || value === "1" || value === "true";
}

function isApprovedArchiveState(value: unknown) {
  return value === 0 || value === "0";
}

function isApprovedArchiveStateDesc(value: unknown) {
  const text = statusText(value).toLowerCase();
  return ["approved", "published", "public", "normal", "已通过", "通过", "已发布", "公开"].includes(text);
}

function publicArchiveDecision(archive: JsonRecord) {
  const state = archive.state;
  const stateDesc = archive.state_desc;
  const statePanel = archive.state_panel;
  const attrs = asRecord(archive.attrs);
  const privateLike = isOneLike(archive.is_only_self);
  const hiddenLike = isOneLike(archive.is_space_hidden) || isOneLike(archive.no_public) || isOneLike(attrs.no_public);
  const rejectReason = statusText(archive.reject_reason);

  if (privateLike) return { isPublic: false, reason: "private_or_only_self" };
  if (hiddenLike) return { isPublic: false, reason: "hidden_or_no_public" };
  if (state === undefined || state === null || stateDesc === undefined || stateDesc === null || statusText(stateDesc) === "") {
    return { isPublic: false, reason: "unknown_public_state" };
  }
  if (!isApprovedArchiveState(state)) {
    if (rejectReason) return { isPublic: false, reason: "down_or_rejected" };
    return { isPublic: false, reason: "review_down_offline_or_non_public_state" };
  }
  if (!isApprovedArchiveStateDesc(stateDesc)) return { isPublic: false, reason: "unknown_public_state" };
  if (statePanel !== undefined && statePanel !== null && !isZeroLike(statePanel)) return { isPublic: false, reason: "review_down_offline_or_non_public_state" };
  return { isPublic: true };
}

function isStrongOverviewUrl(url: string) {
  return (
    url.includes("/c/data/oversea/web/index/stat") ||
    url.includes("/c/data/oversea/web/overview/stat/num") ||
    url.includes("/c/data/oversea/web/overview/compare") ||
    url.includes("/c/data/oversea/web/overview/stat/graph")
  );
}

function overviewEndpoint(url: string): BilibiliAccountMetricPreview["endpoint"] | undefined {
  if (url.includes("/c/data/oversea/web/index/stat")) return "index_stat";
  if (url.includes("/c/data/oversea/web/overview/stat/num")) return "overview_stat_num";
  if (url.includes("/c/data/oversea/web/overview/compare")) return "overview_compare";
  if (url.includes("/c/data/oversea/web/overview/stat/graph")) return "overview_stat_graph";
  return undefined;
}

function isStrongSurveyUrl(url: string) {
  return url.includes("/c/data/oversea/web/survey");
}

function isStrongArchiveUrl(url: string) {
  return url.includes("/x/vupre/web/oversea/archives");
}

function collectDateKeyRows(data: JsonRecord) {
  const rows: BilibiliDateKeyPreview[] = [];
  for (const [key, value] of Object.entries(data)) {
    const normalizedDate = normalizeDateKey(key);
    if (!normalizedDate) continue;
    const record = asRecord(value);
    for (const rowKind of ["arc_inc", "arc_dec", "arc_play", "arc_like"]) {
      const rowCount = asArray(record[rowKind]).length;
      if (rowCount > 0) rows.push({ sourceDateKey: key, normalizedDate, rowKind, rowCount });
    }
  }
  return rows;
}

function accountMetricFromOverview(url: string, data: JsonRecord, capturedAt: string): BilibiliAccountMetricPreview | undefined {
  const endpoint = overviewEndpoint(url);
  if (!endpoint) return undefined;
  if (endpoint === "index_stat") {
    return {
      capturedAt,
      endpoint,
      views: numberOf(data, "total_click") || numberOf(data, "incr_click"),
      likes: numberOf(data, "total_like") || numberOf(data, "inc_like"),
      comments: numberOf(data, "total_reply") || numberOf(data, "incr_reply"),
      saves: numberOf(data, "total_fav") || numberOf(data, "inc_fav"),
      shares: numberOf(data, "total_share") || numberOf(data, "inc_share"),
      followersDelta: numberOf(data, "incr_fans")
    };
  }
  if (endpoint === "overview_stat_num") {
    return {
      capturedAt,
      endpoint,
      snapshotDate: textOf(data, "log_date"),
      views: numberOf(data, "play"),
      likes: numberOf(data, "like"),
      comments: numberOf(data, "comment"),
      saves: numberOf(data, "fav"),
      shares: numberOf(data, "share"),
      followersDelta: numberOf(data, "fan_last") || numberOf(data, "fan")
    };
  }
  if (endpoint === "overview_compare") {
    return {
      capturedAt,
      endpoint,
      views: numberOf(data, "play"),
      likes: numberOf(data, "like"),
      comments: numberOf(data, "replydm"),
      saves: 0,
      shares: 0,
      followersDelta: numberOf(data, "new_fans")
    };
  }
  return {
    capturedAt,
    endpoint,
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    followersDelta: 0
  };
}

function archivePublishedAt(archive: JsonRecord) {
  return toIsoDate(archive.ptime) ?? toIsoDate(archive.ctime) ?? toIsoDate(archive.dtime) ?? toIsoDate(archive.online_time);
}

function createWork(nativeId: string, capturedAt: string): BilibiliMappedWork {
  const id = contentIdFor(nativeId);
  return {
    id,
    platformVersionId: platformVersionIdFor(id),
    nativeId,
    title: `Bilibili work ${nativeId}`,
    capturedAt,
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    followersDelta: 0,
    rawRefs: []
  };
}

function accountMetricSignal(metric: BilibiliAccountMetricPreview) {
  return metric.views + metric.likes + metric.comments + metric.saves + metric.shares + metric.followersDelta;
}

function accountMetricSnapshotId(date: string) {
  return `account-snapshot-candidate-bilibili-${date}-overview-stat-num`;
}

function accountMetricRawEvidenceRef(date: string) {
  return `bilibili-account-preview:overview_stat_num:${date}`;
}

export function previewBilibiliAccountMetricSnapshots(input: {
  accountMetrics?: BilibiliAccountMetricPreview[];
  dateKeyRows?: BilibiliDateKeyPreview[];
}): BilibiliAccountMetricsPreviewResult {
  const accountMetrics = input.accountMetrics ?? [];
  const dateKeyRows = input.dateKeyRows ?? [];
  const rejected: BilibiliRejectedAccountMetric[] = [];
  const candidates: BilibiliAccountMetricCandidate[] = [];
  const dedupeGroups: BilibiliAccountMetricsPreviewResult["diagnostics"]["dedupeGroups"] = [];
  const byDate = new Map<string, BilibiliAccountMetricPreview[]>();

  for (const metric of accountMetrics) {
    if (metric.endpoint !== "overview_stat_num") {
      const reason =
        metric.endpoint === "index_stat"
          ? "rejected: account aggregate/cumulative overview has no trusted daily snapshot date."
          : metric.endpoint === "overview_compare"
            ? "rejected: comparison/range delta is not a direct daily account metric."
            : metric.endpoint === "overview_stat_graph"
              ? "rejected: graph row lacks mapped series/axis semantics."
              : "rejected: unsupported account metric endpoint.";
      rejected.push({ endpoint: metric.endpoint ?? "unknown", capturedAt: metric.capturedAt, snapshotDate: metric.snapshotDate, reason });
      continue;
    }

    const date = normalizeDateKey(metric.snapshotDate ?? "");
    if (!date) {
      rejected.push({
        endpoint: metric.endpoint,
        capturedAt: metric.capturedAt,
        snapshotDate: metric.snapshotDate,
        reason: "rejected: overview_stat_num row is missing a valid snapshotDate."
      });
      continue;
    }
    byDate.set(date, [...(byDate.get(date) ?? []), metric]);
  }

  for (const [date, rows] of byDate.entries()) {
    const sorted = [...rows].sort((a, b) => accountMetricSignal(b) - accountMetricSignal(a) || b.capturedAt.localeCompare(a.capturedAt));
    const selected = sorted[0];
    const selectedSignal = accountMetricSignal(selected);
    if (selectedSignal <= 0) {
      for (const row of rows) {
        rejected.push({
          endpoint: row.endpoint,
          capturedAt: row.capturedAt,
          snapshotDate: row.snapshotDate,
          reason: "rejected: overview_stat_num date group contains only zero-value rows."
        });
      }
      dedupeGroups.push({
        date,
        inputRows: rows.length,
        rejectedRows: rows.length,
        reason: "no candidate selected because all rows are zero-value diagnostics."
      });
      continue;
    }

    for (const row of rows) {
      if (row !== selected) {
        rejected.push({
          endpoint: row.endpoint,
          capturedAt: row.capturedAt,
          snapshotDate: row.snapshotDate,
          reason: "deduped: lower-signal duplicate overview_stat_num row for the same date."
        });
      }
    }

    candidates.push({
      endpoint: selected.endpoint,
      capturedAt: selected.capturedAt,
      selectedFrom: rows.length,
      dedupeReason: "selected highest non-zero signal row per date; ties use latest capturedAt.",
      snapshot: {
        id: accountMetricSnapshotId(date),
        platform: "bilibili",
        source: "bilibili_creator_center",
        date,
        views: selected.views,
        likes: selected.likes,
        comments: selected.comments,
        saves: selected.saves,
        shares: selected.shares,
        followersDelta: selected.followersDelta,
        rawEvidenceRef: accountMetricRawEvidenceRef(date),
        updatedAt: selected.capturedAt
      }
    });

    dedupeGroups.push({
      date,
      inputRows: rows.length,
      selectedCapturedAt: selected.capturedAt,
      rejectedRows: rows.length - 1,
      reason: "selected highest non-zero signal row per date; ties use latest capturedAt."
    });
  }

  return {
    source: "bilibili_creator_center",
    saved: false,
    previewOnly: true,
    candidates,
    rejected,
    diagnostics: {
      inputAccountMetricCount: accountMetrics.length,
      inputDateKeyRowCount: dateKeyRows.length,
      dateKeyRows,
      dedupeGroups,
      warnings: [
        "index_stat, overview_compare, and overview_stat_graph are rejected from AccountMetricSnapshot candidates.",
        "dateKeyRows are diagnostics only and are not converted into account snapshots.",
        "This preview is local-only and does not write Repo/SQLite."
      ]
    }
  };
}

export class BilibiliPersonalProvider {
  fromCaptures(captures: BilibiliPersonalCapture[]): BilibiliPersonalPreviewPayload {
    const byId = new Map<string, BilibiliMappedWork>();
    const accountMetrics: BilibiliAccountMetricPreview[] = [];
    const dateKeyRows: BilibiliDateKeyPreview[] = [];
    const warnings: string[] = [];
    let skippedWeakEndpoints = 0;
    let accountOverviewCaptures = 0;
    const skippedArchiveRowsByReason = new Map<string, number>();

    captures.forEach((capture, captureIndex) => {
      const url = capture.urlSanitized ?? "";
      const body = asRecord(capture.body);
      const data = asRecord(body.data);
      const capturedAt = capture.capturedAt ?? new Date().toISOString();
      const rawRef = refForCapture(capture, `capture-${captureIndex + 1}`);

      if (isStrongArchiveUrl(url)) {
        for (const row of asArray(data.arc_audits)) {
          const archive = asRecord(row.Archive);
          const stat = asRecord(row.stat);
          const publicDecision = publicArchiveDecision(archive);
          if (!publicDecision.isPublic) {
            const reason = publicDecision.reason ?? "unknown_public_state";
            skippedArchiveRowsByReason.set(reason, (skippedArchiveRowsByReason.get(reason) ?? 0) + 1);
            continue;
          }
          const nativeId = textOf(archive, "bvid") || textOf(row, "bvid") || textOf(archive, "aid") || textOf(stat, "aid");
          if (!nativeId) continue;
          const id = contentIdFor(nativeId);
          const item = byId.get(id) ?? createWork(nativeId, capturedAt);
          item.bvid = textOf(archive, "bvid") || item.bvid;
          item.title = textOf(archive, "title") || item.title;
          item.publishedAt = archivePublishedAt(archive) ?? item.publishedAt;
          mergeMetric(item, {
            views: numberOf(stat, "view") || numberOf(stat, "vv"),
            likes: numberOf(stat, "like") || numberOf(stat, "like_g"),
            comments: numberOf(stat, "reply"),
            saves: numberOf(stat, "favorite") || numberOf(stat, "fav_g"),
            shares: numberOf(stat, "share"),
            followersDelta: 0
          });
          addRawRef(item, rawRef);
          byId.set(id, item);
        }
        return;
      }

      if (isStrongOverviewUrl(url)) {
        accountOverviewCaptures += 1;
        const accountMetric = accountMetricFromOverview(url, data, capturedAt);
        if (accountMetric) accountMetrics.push(accountMetric);
        return;
      }

      if (isStrongSurveyUrl(url)) {
        dateKeyRows.push(...collectDateKeyRows(data));
        return;
      }

      skippedWeakEndpoints += 1;
    });

    if (skippedArchiveRowsByReason.size > 0) {
      const reasonSummary = [...skippedArchiveRowsByReason.entries()].map(([reason, count]) => `${reason}=${count}`).join(", ");
      const skippedCount = [...skippedArchiveRowsByReason.values()].reduce((sum, count) => sum + count, 0);
      warnings.push(`bilibili_creator_center: skipped ${skippedCount} non-public or unknown archive rows (${reasonSummary}); only explicitly public/published archives enter content metrics.`);
    }
    if (accountOverviewCaptures > 0) warnings.push(`bilibili_creator_center: skipped ${accountOverviewCaptures} account-level overview/stat captures for content metrics preview.`);
    if (dateKeyRows.length > 0) {
      const normalizedDates = new Set(dateKeyRows.map((row) => row.normalizedDate));
      const datedRows = dateKeyRows.reduce((sum, row) => sum + row.rowCount, 0);
      warnings.push(`bilibili_creator_center: normalized ${normalizedDates.size} date keys from survey captures; ${datedRows} dated rows were kept out of content metrics until V1 semantics are reviewed.`);
    }
    if (skippedWeakEndpoints > 0) warnings.push(`bilibili_creator_center: skipped ${skippedWeakEndpoints} weak or auxiliary captures such as nav, realname, web-show, white, grey, preupload, and generic config endpoints.`);
    if (byId.size === 0) warnings.push("bilibili_creator_center: no personal archive rows were mapped from captures.");

    const items = [...byId.values()];
    const contents: ContentItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      platform: "bilibili",
      status: "published",
      format: "short_video",
      topic: item.title,
      publishedAt: item.publishedAt,
      notes: rawNote(item)
    }));
    const metrics: PlatformMetric[] = items.map((item) => ({
      id: `metric-bilibili-creator-${item.id}`,
      contentId: item.id,
      platform: "bilibili",
      capturedAt: item.capturedAt,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      shares: item.shares,
      followersDelta: item.followersDelta
    }));
    return { source: "bilibili_creator_center", contents, metrics, accountMetrics, dateKeyRows, warnings };
  }
}
