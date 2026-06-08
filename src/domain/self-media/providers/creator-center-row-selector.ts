import type { AuthedBrowserNativeIdConfidence, DouyinBrowserVisibleRow, XiaohongshuBrowserVisibleRow } from "../types";

type ExtractedNativeIdConfidence = "stable_platform_id" | "visible_platform_id" | "fallback_text_hash";

export type CreatorCenterDomCandidate = {
  text: string;
  tagName?: string;
  role?: string;
  className?: string;
  idAttr?: string;
  titleAttr?: string;
  hrefs: string[];
  dataValues: string[];
  cells: string[];
  childCandidateCount: number;
};

type Platform = "douyin" | "xiaohongshu";

type MetricSet = {
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};

function clean(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(31, result) + value.charCodeAt(index) | 0;
  return Math.abs(result).toString(36);
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
    const after = text.match(new RegExp(`${label}[^\\d-]{0,8}(-?\\d[\\d,.]*(?:\\.\\d+)?\\s*(?:万|亿|k|K)?)`));
    if (after) return numberFrom(after[1]);
    const before = text.match(new RegExp(`(-?\\d[\\d,.]*(?:\\.\\d+)?\\s*(?:万|亿|k|K)?)\\s*${label}`));
    if (before) return numberFrom(before[1]);
  }
  return 0;
}

function publishedAtOf(text: string) {
  const match = text.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2})?)/);
  if (!match) return undefined;
  const normalized = match[1].replace("年", "-").replace("月", "-").replace("日", "").replace(/\//g, "-");
  const parsed = new Date(normalized.includes(":") ? normalized : `${normalized}T00:00:00`);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

function publishedDateCount(text: string) {
  return (text.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/g) ?? []).length;
}

function actionNoiseCount(text: string) {
  return (text.match(/编辑作品设置权限|作品置顶删除作品|删除作品|设置权限|立即发布/g) ?? []).length;
}

function isGenericNativeId(value: string | undefined, platform: Platform) {
  if (!value) return true;
  const generic = /table|row|card|item|button|container|tab|panel|list|request|response|form|semi/i;
  if (generic.test(value)) return true;
  if (/^__|svg|sprite|node|icon|symbol/i.test(value)) return true;
  if (platform === "xiaohongshu" && /manager|notes-request/i.test(value)) return true;
  return false;
}

function noisyTitle(value: string) {
  return /投稿作品直播场次|投稿分析投稿列表|数据周期内投稿量|编辑作品设置权限|作品置顶删除作品|全部\s*\d+已发布|审核中未通过/.test(value);
}

function isNoisyContainer(candidate: CreatorCenterDomCandidate) {
  const text = clean(candidate.text);
  if (candidate.childCandidateCount > 0) return true;
  if (noisyTitle(text)) return true;
  if (publishedDateCount(text) > 1) return true;
  if (actionNoiseCount(text) > 1) return true;
  return false;
}

function nonEmptyCells(candidate: CreatorCenterDomCandidate) {
  return candidate.cells.map(clean).filter(Boolean);
}

function lineCandidates(candidate: CreatorCenterDomCandidate) {
  return [
    clean(candidate.titleAttr),
    ...nonEmptyCells(candidate),
    ...clean(candidate.text).split(/\n|\r| {2,}/).map(clean)
  ].filter(Boolean);
}

function isMetricText(value: string, platform: Platform) {
  const pattern = platform === "douyin"
    ? /(播放|浏览|点赞|评论|收藏|分享|转发|完播|互动)/
    : /(浏览|阅读|观看|播放|点赞|评论|收藏|分享|曝光|互动)/;
  return pattern.test(value);
}

function isBadTitleLine(value: string, platform: Platform) {
  if (value.length < 4 || value.length > 140) return true;
  if (isMetricText(value, platform)) return true;
  if (noisyTitle(value)) return true;
  if (/编辑|删除|查看|更多|置顶|发布时间|立即发布/.test(value)) return true;
  if (/^20\d{2}[-/.年]/.test(value)) return true;
  if (/^(已发布|审核中|未通过|全部|\d+)$/.test(value)) return true;
  return false;
}

function titleOf(candidate: CreatorCenterDomCandidate, platform: Platform) {
  const title = lineCandidates(candidate).find((line) => !isBadTitleLine(line, platform));
  if (title) return title.slice(0, 140);
  return platform === "douyin" ? "抖音作品" : "小红书笔记";
}

function idOf(candidate: CreatorCenterDomCandidate, platform: Platform): { id: string; nativeId?: string; nativeIdConfidence: ExtractedNativeIdConfidence } {
  const hrefPattern = platform === "douyin"
    ? /(?:video\/|modal_id=|item_id=|aweme_id=)([A-Za-z0-9_-]{6,})/i
    : /(?:note\/|explore\/|discovery\.|note_id=|noteId=)([A-Za-z0-9_-]{6,})/i;
  for (const href of candidate.hrefs) {
    const match = href.match(hrefPattern)?.[1];
    if (match && !isGenericNativeId(match, platform)) return { id: match, nativeId: match, nativeIdConfidence: "stable_platform_id" };
  }
  for (const value of [...candidate.dataValues, candidate.idAttr ?? ""]) {
    const match = clean(value).match(/([A-Za-z0-9_-]{6,})/)?.[1];
    if (match && !isGenericNativeId(match, platform)) return { id: match, nativeId: match, nativeIdConfidence: "stable_platform_id" };
  }
  const visiblePattern = platform === "douyin"
    ? /(?:作品ID|视频ID|item[_\s-]?id|aweme[_\s-]?id)[:：\s]*([A-Za-z0-9_-]{4,})/i
    : /(?:笔记ID|note[_\s-]?id|作品ID)[:：\s]*([A-Za-z0-9_-]{4,})/i;
  const explicit = candidate.text.match(visiblePattern)?.[1];
  if (explicit && !isGenericNativeId(explicit, platform)) return { id: explicit, nativeId: explicit, nativeIdConfidence: "visible_platform_id" };
  const prefix = platform === "douyin" ? "dy-browser" : "xhs-browser";
  return { id: `${prefix}-${hash(candidate.text.slice(0, 260))}`, nativeId: undefined, nativeIdConfidence: "fallback_text_hash" };
}

function metricLabels(platform: Platform) {
  if (platform === "douyin") {
    return {
      views: ["播放量", "播放", "浏览量", "浏览"],
      likes: ["点赞数", "点赞"],
      comments: ["评论数", "评论"],
      saves: ["收藏数", "收藏"],
      shares: ["分享数", "分享", "转发数", "转发"]
    };
  }
  return {
    views: ["浏览量", "浏览", "阅读量", "阅读", "观看量", "观看", "播放量", "播放"],
    likes: ["点赞数", "点赞"],
    comments: ["评论数", "评论"],
    saves: ["收藏数", "收藏"],
    shares: ["分享数", "分享"]
  };
}

function labeledMetrics(text: string, platform: Platform): MetricSet {
  const labels = metricLabels(platform);
  return {
    views: metricValue(text, labels.views),
    likes: metricValue(text, labels.likes),
    comments: metricValue(text, labels.comments),
    saves: metricValue(text, labels.saves),
    shares: metricValue(text, labels.shares)
  };
}

function isDateCell(value: string) {
  return /20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/.test(value);
}

function numericCellValue(value: string) {
  const text = clean(value);
  if (!text || isDateCell(text)) return undefined;
  if (/[A-Za-z\u4e00-\u9fa5]{8,}/.test(text) && !/[万亿kK]/.test(text)) return undefined;
  const numericMatches = text.match(/-?\d[\d,.]*(?:\.\d+)?\s*(?:万|亿|k|K)?/g) ?? [];
  if (numericMatches.length !== 1) return undefined;
  return numberFrom(numericMatches[0]);
}

function positionalMetrics(candidate: CreatorCenterDomCandidate, title: string, platform: Platform): MetricSet {
  const cells = nonEmptyCells(candidate)
    .filter((cell) => cell !== title)
    .filter((cell) => !isBadTitleLine(cell, platform) || isMetricText(cell, platform))
    .filter((cell) => !/已发布|审核中|未通过|编辑|删除|置顶|权限/.test(cell));
  const values = cells.map(numericCellValue).filter((value): value is number => value !== undefined);
  return {
    views: values[0] ?? 0,
    likes: values[1] ?? 0,
    comments: values[2] ?? 0,
    saves: values[3] ?? 0,
    shares: values[4] ?? 0
  };
}

function metricsOf(candidate: CreatorCenterDomCandidate, title: string, platform: Platform): MetricSet {
  const labeled = labeledMetrics(candidate.text, platform);
  if (labeled.views + labeled.likes + labeled.comments + labeled.saves + labeled.shares > 0) return labeled;
  return positionalMetrics(candidate, title, platform);
}

function commonWarnings(row: { title: string; nativeId?: string; nativeIdConfidence: AuthedBrowserNativeIdConfidence; views: number; likes: number; comments: number; saves: number; shares: number }, platform: Platform) {
  const warnings: string[] = [];
  if (row.views + row.likes + row.comments + row.saves + row.shares === 0) warnings.push("no_metric_number_detected");
  if (row.nativeIdConfidence === "fallback_text_hash") warnings.push("fallback_id_from_visible_text");
  if (noisyTitle(row.title)) warnings.push("noisy_visible_dom_title");
  if (isGenericNativeId(row.nativeId, platform)) warnings.push("unstable_native_id");
  return warnings;
}

function candidateHasMetricText(candidate: CreatorCenterDomCandidate, platform: Platform) {
  if (isMetricText(candidate.text, platform)) return true;
  return candidate.cells.some((cell) => numericCellValue(cell) !== undefined);
}

function hasMetricLabel(text: string, labels: string[]) {
  return labels.some((label) => new RegExp(label).test(text));
}

function hasDetailMetricCoverage(candidate: CreatorCenterDomCandidate, platform: Platform, metrics: MetricSet) {
  const text = `${candidate.text} ${candidate.cells.join(" ")}`;
  const labels = metricLabels(platform);
  const hasViews = hasMetricLabel(text, labels.views);
  const hasInteraction = hasMetricLabel(text, [...labels.likes, ...labels.comments, ...labels.saves, ...labels.shares]);
  return hasViews && hasInteraction && metrics.views + metrics.likes + metrics.comments + metrics.saves + metrics.shares > 0;
}

function isGenericDetailTitle(value: string, platform: Platform) {
  if (platform === "douyin" && /^(抖音|创作者中心|内容管理|作品管理|作品数据|数据详情|内容数据|作品分析|数据表现|作品详情)$/.test(value)) return true;
  if (platform === "xiaohongshu" && /^(小红书|创作服务平台|笔记管理|笔记数据|笔记详情|数据详情|数据表现|作品详情)$/.test(value)) return true;
  return false;
}

export function selectDouyinCreatorCenterDetailRow(candidate: CreatorCenterDomCandidate | undefined, capturedAt: string): DouyinBrowserVisibleRow[] {
  if (!candidate) return [];
  const text = clean(candidate.text);
  if (text.length < 12 || text.length > 5000) return [];
  if (!candidateHasMetricText(candidate, "douyin")) return [];
  if (/(粉丝画像|账号总览|账号数据|主页访问|净增粉丝|粉丝总数|私信|评论内容)/.test(text)) return [];
  const idInfo = idOf(candidate, "douyin");
  if (idInfo.nativeIdConfidence !== "stable_platform_id") return [];
  const title = titleOf(candidate, "douyin");
  const metrics = metricsOf(candidate, title, "douyin");
  const row: DouyinBrowserVisibleRow = {
    id: idInfo.id,
    nativeId: idInfo.nativeId,
    title,
    publishedAt: publishedAtOf(text),
    capturedAt,
    ...metrics,
    followersDelta: 0,
    itemUrl: candidate.hrefs[0],
    extractionSource: "visible_dom",
    sourcePageKind: "creator_center_owned_detail",
    confidence: "owned_creator_center_detail",
    nativeIdConfidence: idInfo.nativeIdConfidence,
    warnings: []
  };
  row.warnings = commonWarnings(row, "douyin");
  if (isGenericDetailTitle(row.title, "douyin")) row.warnings.push("generic_detail_page_title");
  if (!hasDetailMetricCoverage(candidate, "douyin", metrics)) row.warnings.push("incomplete_detail_metric_context");
  if (!hasTrustedCreatorCenterRowShape(row, "douyin") || row.warnings.includes("generic_detail_page_title") || row.warnings.includes("incomplete_detail_metric_context")) return [];
  return [row];
}

export function selectDouyinCreatorCenterRows(candidates: CreatorCenterDomCandidate[], capturedAt: string): DouyinBrowserVisibleRow[] {
  const rows: DouyinBrowserVisibleRow[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const text = clean(candidate.text);
    if (text.length < 12 || text.length > 1500) continue;
    if (!candidateHasMetricText(candidate, "douyin")) continue;
    if (/(粉丝画像|账号总览|账号数据|主页访问|净增粉丝|粉丝总数|私信|评论内容)/.test(text) && !/作品|视频|标题/.test(text)) continue;
    if (isNoisyContainer(candidate)) continue;
    const idInfo = idOf(candidate, "douyin");
    const title = titleOf(candidate, "douyin");
    const metrics = metricsOf(candidate, title, "douyin");
    const key = `${idInfo.id}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const row: DouyinBrowserVisibleRow = {
      id: idInfo.id,
      nativeId: idInfo.nativeId,
      title,
      publishedAt: publishedAtOf(text),
      capturedAt,
      ...metrics,
      followersDelta: 0,
      itemUrl: candidate.hrefs[0],
      extractionSource: "visible_dom",
      sourcePageKind: "creator_center_owned_works",
      confidence: "owned_creator_center_row",
      nativeIdConfidence: idInfo.nativeIdConfidence,
      warnings: []
    };
    row.warnings = commonWarnings(row, "douyin");
    if (!hasTrustedCreatorCenterRowShape(row, "douyin")) continue;
    rows.push(row);
    if (rows.length >= 20) break;
  }
  return rows;
}

export function selectXiaohongshuCreatorCenterDetailRow(candidate: CreatorCenterDomCandidate | undefined, capturedAt: string): XiaohongshuBrowserVisibleRow[] {
  if (!candidate) return [];
  const text = clean(candidate.text);
  if (text.length < 12 || text.length > 5000) return [];
  if (!candidateHasMetricText(candidate, "xiaohongshu")) return [];
  if (/(私信|评论正文|用户画像|粉丝画像|账号总览|粉丝总数|粉丝分析|关注用户|手机号|邮箱)/.test(text)) return [];
  if (/(notes-request|semiTab|全部\s*\d+已发布|审核中未通过)/i.test(text)) return [];
  const idInfo = idOf(candidate, "xiaohongshu");
  if (idInfo.nativeIdConfidence !== "stable_platform_id") return [];
  const title = titleOf(candidate, "xiaohongshu");
  const metrics = metricsOf(candidate, title, "xiaohongshu");
  const row: XiaohongshuBrowserVisibleRow = {
    id: idInfo.id,
    nativeId: idInfo.nativeId,
    title,
    publishedAt: publishedAtOf(text),
    capturedAt,
    ...metrics,
    followersDelta: 0,
    noteUrl: candidate.hrefs[0],
    format: /视频|播放/.test(text) ? "short_video" : "image_text",
    extractionSource: "visible_dom",
    sourcePageKind: "creator_center_owned_detail",
    confidence: "owned_creator_center_detail",
    nativeIdConfidence: idInfo.nativeIdConfidence,
    warnings: []
  };
  row.warnings = commonWarnings(row, "xiaohongshu");
  if (isGenericDetailTitle(row.title, "xiaohongshu")) row.warnings.push("generic_detail_page_title");
  if (!hasDetailMetricCoverage(candidate, "xiaohongshu", metrics)) row.warnings.push("incomplete_detail_metric_context");
  if (!hasTrustedCreatorCenterRowShape(row, "xiaohongshu") || row.warnings.includes("generic_detail_page_title") || row.warnings.includes("incomplete_detail_metric_context")) return [];
  return [row];
}

export function selectXiaohongshuCreatorCenterRows(candidates: CreatorCenterDomCandidate[], capturedAt: string): XiaohongshuBrowserVisibleRow[] {
  const rows: XiaohongshuBrowserVisibleRow[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const text = clean(candidate.text);
    if (text.length < 12 || text.length > 1500) continue;
    if (!candidateHasMetricText(candidate, "xiaohongshu")) continue;
    if (/(私信|评论正文|用户画像|粉丝画像|账号总览|粉丝总数|粉丝分析|关注用户|手机号|邮箱)/.test(text)) continue;
    if (/(发现|探索|搜索|推荐|热门|话题|灵感|种草|精选|达人|榜单)/.test(text) && !/(笔记|作品|标题|发布|浏览|点赞|收藏|数据)/.test(text)) continue;
    if (isNoisyContainer(candidate)) continue;
    const idInfo = idOf(candidate, "xiaohongshu");
    const title = titleOf(candidate, "xiaohongshu");
    const metrics = metricsOf(candidate, title, "xiaohongshu");
    const key = `${idInfo.id}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const row: XiaohongshuBrowserVisibleRow = {
      id: idInfo.id,
      nativeId: idInfo.nativeId,
      title,
      publishedAt: publishedAtOf(text),
      capturedAt,
      ...metrics,
      followersDelta: 0,
      noteUrl: candidate.hrefs[0],
      format: /视频|播放/.test(text) ? "short_video" : "image_text",
      extractionSource: "visible_dom",
      sourcePageKind: "creator_center_owned_works",
      confidence: "owned_creator_center_row",
      nativeIdConfidence: idInfo.nativeIdConfidence,
      warnings: []
    };
    row.warnings = commonWarnings(row, "xiaohongshu");
    if (!hasTrustedCreatorCenterRowShape(row, "xiaohongshu")) continue;
    rows.push(row);
    if (rows.length >= 20) break;
  }
  return rows;
}

export function hasTrustedCreatorCenterRowShape(row: { nativeId?: string; nativeIdConfidence: AuthedBrowserNativeIdConfidence; title: string; views: number; likes: number; comments: number; saves: number; shares: number }, platform: Platform) {
  return (row.nativeIdConfidence === "stable_platform_id" || row.nativeIdConfidence === "visible_platform_id")
    && !isGenericNativeId(row.nativeId, platform)
    && !noisyTitle(row.title)
    && row.views + row.likes + row.comments + row.saves + row.shares > 0;
}
