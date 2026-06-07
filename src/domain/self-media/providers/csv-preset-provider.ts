import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import type { ContentItem, CsvImportPreset, Platform, PlatformMetric, ProviderImportPayload } from "../types";

export type ImportMappingConfidence = "confirmed_official" | "mature_reference" | "draft_realistic" | "confirmed_sampled";

export interface RealImportPreviewRow {
  rowNumber: number;
  platform: Platform;
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
  mappingConfidence: ImportMappingConfidence;
  warnings: string[];
  previewDedupeKey: string;
  canConfirmSave: boolean;
}

interface ParseOptions {
  allowInvalidPreviewRows?: boolean;
}

interface AliasPreset {
  confidence: ImportMappingConfidence;
  id: string[];
  url: string[];
  title: string[];
  publishedAt: string[];
  capturedAt: string[];
  views: string[];
  likes: string[];
  comments: string[];
  saves: string[];
  shares: string[];
  followersDelta: string[];
  nativeMetrics: string[];
}

const previewRowsByPayload = new WeakMap<ProviderImportPayload, RealImportPreviewRow[]>();

const presetPlatform: Record<CsvImportPreset, Platform> = {
  generic: "other",
  douyin: "douyin",
  xiaohongshu: "xiaohongshu",
  wechat: "wechat",
  video_account: "video_account",
  bilibili: "bilibili"
};

const presetFormat: Record<CsvImportPreset, ContentItem["format"]> = {
  generic: "other",
  douyin: "short_video",
  xiaohongshu: "image_text",
  wechat: "article",
  video_account: "short_video",
  bilibili: "short_video"
};

const platformAliases: Record<string, Platform> = {
  douyin: "douyin",
  抖音: "douyin",
  aweme: "douyin",
  xhs: "xiaohongshu",
  xiaohongshu: "xiaohongshu",
  小红书: "xiaohongshu",
  rednote: "xiaohongshu",
  wechat: "wechat",
  公众号: "wechat",
  微信公众号: "wechat",
  video_account: "video_account",
  视频号: "video_account",
  bilibili: "bilibili",
  "B站": "bilibili",
  b站: "bilibili",
  bili: "bilibili",
  other: "other",
  其他: "other"
};

const commonAliases = {
  id: ["id", "内容ID", "作品ID", "视频ID", "文章ID", "稿件ID", "笔记ID", "item_id", "aweme_id", "note_id", "msgid", "aid", "avid", "bvid", "BV号", "feed_id", "export_id"],
  url: ["url", "链接", "内容链接", "作品链接", "分享链接", "share_url", "permalink"],
  title: ["title", "标题", "内容标题", "作品标题", "视频标题", "笔记标题", "文章标题", "描述", "desc", "description", "display_title"],
  publishedAt: ["publishedAt", "发布时间", "创建时间", "群发时间", "create_time", "publish_time", "pubdate", "time", "created_at"],
  capturedAt: ["capturedAt", "采集时间", "统计日期", "数据日期", "stat_date"],
  followersDelta: ["followersDelta", "涨粉", "粉丝增量", "新增关注", "follower_new", "fans_increment"]
};

const aliasPresets: Record<CsvImportPreset, AliasPreset> = {
  generic: {
    confidence: "confirmed_sampled",
    id: commonAliases.id,
    url: commonAliases.url,
    title: commonAliases.title,
    publishedAt: commonAliases.publishedAt,
    capturedAt: [...commonAliases.capturedAt, "ref_date"],
    views: ["views", "播放", "播放量", "阅读", "阅读量", "浏览", "浏览量"],
    likes: ["likes", "点赞", "点赞数"],
    comments: ["comments", "评论", "评论数"],
    saves: ["saves", "收藏", "收藏数"],
    shares: ["shares", "分享", "分享数", "转发", "转发量"],
    followersDelta: commonAliases.followersDelta,
    nativeMetrics: []
  },
  douyin: {
    confidence: "confirmed_official",
    id: ["作品ID", "视频ID", "item_id", "aweme_id", ...commonAliases.id],
    url: ["share_url", "作品链接", "分享链接", ...commonAliases.url],
    title: ["标题", "描述", "title", "desc", "description"],
    publishedAt: ["发布时间", "创建时间", "create_time", "publish_time"],
    capturedAt: commonAliases.capturedAt,
    views: ["播放量", "播放", "play_count", "total_play", "video_play_cnt", "views"],
    likes: ["点赞数", "点赞", "digg_count", "total_like", "likes"],
    comments: ["评论数", "评论", "comment_count", "total_comment", "comments"],
    saves: ["收藏数", "收藏", "collect_count", "saves"],
    shares: ["分享数", "分享", "share_count", "total_share", "shares"],
    followersDelta: commonAliases.followersDelta,
    nativeMetrics: ["forward_count", "转发数", "转发", "download_count", "下载数", "完播率", "平均播放时长", "主页访问"]
  },
  xiaohongshu: {
    confidence: "draft_realistic",
    id: ["笔记ID", "note_id", "id"],
    url: ["笔记链接", "分享链接", ...commonAliases.url],
    title: ["标题", "笔记标题", "title", "display_title"],
    publishedAt: ["发布时间", "创建时间", "publish_time", "time", "created_at"],
    capturedAt: commonAliases.capturedAt,
    views: ["浏览量", "阅读量", "观看量", "view_count", "views"],
    likes: ["点赞", "点赞数", "liked_count", "likes"],
    comments: ["评论", "评论数", "comment_count", "comments"],
    saves: ["收藏", "收藏数", "collected_count", "saves"],
    shares: ["分享", "分享数", "share_count", "shares"],
    followersDelta: commonAliases.followersDelta,
    nativeMetrics: ["曝光", "曝光量", "impression", "show_count", "互动量", "互动率", "完播率", "平均观看时长", "流量来源", "搜索词"]
  },
  wechat: {
    confidence: "confirmed_official",
    id: ["文章ID", "msgid", "内容ID", "id"],
    url: ["文章链接", "原文链接", ...commonAliases.url],
    title: ["标题", "title"],
    publishedAt: ["发布时间", "群发时间", "publish_time", "created_at"],
    capturedAt: ["统计日期", "ref_date", "stat_date", ...commonAliases.capturedAt],
    views: ["阅读", "阅读量", "图文页阅读次数", "int_page_read_count", "views"],
    likes: ["点赞", "赞", "like_count", "likes"],
    comments: ["评论", "comment_count", "comments"],
    saves: ["收藏", "收藏次数", "add_to_fav_count", "saves"],
    shares: ["分享", "分享次数", "share_count", "shares"],
    followersDelta: ["新增关注", "new_user", ...commonAliases.followersDelta],
    nativeMetrics: ["阅读人数", "int_page_read_user", "原文页阅读次数", "ori_page_read_count", "分享人数", "share_user", "收藏人数", "add_to_fav_user", "取消关注", "cancel_user"]
  },
  video_account: {
    confidence: "draft_realistic",
    id: ["视频ID", "作品ID", "feed_id", "export_id", "id"],
    url: ["视频链接", "作品链接", ...commonAliases.url],
    title: ["标题", "描述", "title", "desc", "description"],
    publishedAt: ["发布时间", "创建时间", "publish_time", "created_at"],
    capturedAt: commonAliases.capturedAt,
    views: ["播放量", "播放", "浏览量", "view_count", "play_count", "views"],
    likes: ["点赞", "点赞数", "喜欢", "like_count", "likes"],
    comments: ["评论", "评论数", "comment_count", "comments"],
    saves: ["收藏", "收藏数", "favorite_count", "saves"],
    shares: ["分享", "分享数", "转发", "转发量", "share_count", "forward_count", "shares"],
    followersDelta: ["涨粉", "新增关注", "follower_new", ...commonAliases.followersDelta],
    nativeMetrics: ["朋友圈转发", "完播率", "平均播放时长", "播放时长", "公众号阅读转化", "引流点击", "地域", "流量来源"]
  },
  bilibili: {
    confidence: "mature_reference",
    id: ["稿件ID", "aid", "avid", "bvid", "BV号", "id"],
    url: ["稿件链接", "视频链接", ...commonAliases.url],
    title: ["标题", "title"],
    publishedAt: ["发布时间", "pubdate", "publish_time", "created_at"],
    capturedAt: commonAliases.capturedAt,
    views: ["播放", "播放量", "view", "views"],
    likes: ["点赞", "点赞数", "like", "likes"],
    comments: ["评论", "评论数", "reply", "comments"],
    saves: ["收藏", "收藏数", "favorite", "saves"],
    shares: ["分享", "分享数", "share", "shares"],
    followersDelta: commonAliases.followersDelta,
    nativeMetrics: ["弹幕", "弹幕数", "danmaku", "投币", "硬币", "coin", "完播率", "平均播放时长", "充电", "互动率"]
  }
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function read(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function numberOf(value: string) {
  const normalized = value.replaceAll(",", "").replace(/\s+/g, "");
  const multiplier = normalized.endsWith("亿") ? 100000000 : normalized.endsWith("万") ? 10000 : 1;
  const numeric = multiplier === 1 ? normalized.replace("%", "") : normalized.slice(0, -1);
  const parsed = Number(numeric || 0) * multiplier;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlatform(value: string, fallback: Platform) {
  return platformAliases[value] ?? fallback;
}

function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function normalizeDateValue(value: string) {
  if (!value) return undefined;
  const parsedNumber = Number(value);
  if (Number.isFinite(parsedNumber) && parsedNumber > 20000 && parsedNumber < 80000) {
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + parsedNumber * 24 * 60 * 60 * 1000).toISOString();
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return value;
}

function xmlDecode(value: string) {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&amp;", "&");
}

function unzipEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("XLSX 文件结构无效。");
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) throw new Error("XLSX central directory 无效。");
    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const fileName = buffer.toString("utf8", centralOffset + 46, centralOffset + 46 + fileNameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : undefined;
    if (!data) throw new Error(`XLSX 不支持的压缩方式：${method}`);
    entries.set(fileName, data);
    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function parseSharedStrings(xml: string) {
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const text = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((item) => xmlDecode(item[1])).join("");
    strings.push(text);
  }
  return strings;
}

function columnIndex(cellRef: string) {
  const letters = (cellRef.match(/[A-Z]+/)?.[0] ?? "A").split("");
  return letters.reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] ?? `A${rows.length + 1}`;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      row[columnIndex(ref)] = type === "s" ? sharedStrings[Number(value)] ?? "" : xmlDecode(value);
    }
    if (row.some((value) => value !== undefined && value !== "")) rows.push(row.map((value) => value ?? ""));
  }
  return rows;
}

function rowsFromXlsx(buffer: Buffer) {
  const entries = unzipEntries(buffer);
  const workbook = entries.get("xl/workbook.xml")?.toString("utf8") ?? "";
  const rels = entries.get("xl/_rels/workbook.xml.rels")?.toString("utf8") ?? "";
  const firstSheetRelId = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1];
  const firstSheetTarget = firstSheetRelId ? rels.match(new RegExp(`<Relationship[^>]*Id="${firstSheetRelId}"[^>]*Target="([^"]+)"`))?.[1] : undefined;
  const worksheetPath = firstSheetTarget ? `xl/${firstSheetTarget.replace(/^\/?xl\//, "")}` : "xl/worksheets/sheet1.xml";
  const worksheet = entries.get(worksheetPath)?.toString("utf8") ?? entries.get("xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!worksheet) throw new Error("XLSX 没有可读取的首个工作表。");
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "");
  return parseWorksheetRows(worksheet, sharedStrings);
}

function rowsFromCsv(csv: string) {
  const trimmed = csv.trim();
  if (!trimmed) throw new Error("CSV 内容不能为空。");
  return trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0).map((line) => parseCsvLine(line));
}

function createRowObject(headers: string[], values: string[]) {
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
}

function readMetric(row: Record<string, string>, aliases: string[]) {
  return numberOf(read(row, ...aliases));
}

function nativeMetricsFor(row: Record<string, string>, aliases: string[]) {
  return Object.fromEntries(aliases.filter((key) => row[key] !== undefined && row[key] !== "").map((key) => [key, row[key]]));
}

export function getCsvPresetPreviewRows(payload: ProviderImportPayload) {
  return previewRowsByPayload.get(payload) ?? [];
}

export class CsvPresetProvider {
  template(preset: CsvImportPreset) {
    const templates: Record<CsvImportPreset, string[]> = {
      generic: [
        "id,title,platform,status,format,topic,publishedAt,capturedAt,views,likes,comments,saves,shares,followersDelta",
        "generic-001,AI短片15秒精华,douyin,published,short_video,AI短片,2026-06-01T09:00:00.000Z,2026-06-02T00:00:00.000Z,1200,45,8,21,6,3"
      ],
      douyin: ["作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,转发数,下载数,涨粉,完播率,平均播放时长,选题", "douyin-001,AI短片15秒精华,2026-06-01T09:00:00.000Z,1200,45,8,21,6,2,1,3,41%,18s,AI短片"],
      xiaohongshu: ["笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉,曝光量,互动量,互动率,流量来源,搜索词,选题", "xhs-001,AI工具复盘清单,2026-06-01T09:00:00.000Z,900,66,11,80,12,5,2000,169,18%,搜索,AI工具,AI工具"],
      wechat: ["文章ID,标题,发布时间,统计日期,图文页阅读次数,图文页阅读人数,原文页阅读次数,分享次数,分享人数,收藏次数,收藏人数,点赞,评论,新增关注,取消关注,选题", "wechat-001,自媒体周复盘,2026-06-01T09:00:00.000Z,2026-06-02,500,420,80,4,3,12,10,18,3,2,1,复盘"],
      video_account: ["视频ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,朋友圈转发,涨粉,完播率,平均播放时长,公众号阅读转化,流量来源,选题", "video-001,AI时代真人表达,2026-06-01T09:00:00.000Z,700,24,5,10,8,2,4,36%,16s,12,推荐,真人表达"],
      bilibili: ["稿件ID,BV号,标题,发布时间,播放量,点赞数,评论数,弹幕数,收藏数,分享数,投币数,涨粉,完播率,平均播放时长,选题", "bili-001,BV1test,AI短片工作流拆解,2026-06-01T09:00:00.000Z,1600,88,22,12,61,19,30,9,45%,32s,AI短片"]
    };
    return templates[preset].join("\n");
  }

  fromXlsx(buffer: Buffer, preset: CsvImportPreset = "generic", options: ParseOptions = {}) {
    return this.fromRows(rowsFromXlsx(buffer), preset, options);
  }

  fromXlsxBase64(base64: string, preset: CsvImportPreset = "generic", options: ParseOptions = {}) {
    return this.fromXlsx(Buffer.from(base64, "base64"), preset, options);
  }

  fromCsv(csv: string, preset: CsvImportPreset = "generic", options: ParseOptions = {}): ProviderImportPayload {
    return this.fromRows(rowsFromCsv(csv), preset, options);
  }

  private fromRows(rows: string[][], preset: CsvImportPreset, options: ParseOptions): ProviderImportPayload {
    if (rows.length === 0) throw new Error("导入文件内容不能为空。");
    const headers = rows[0].map((header) => header.trim());
    const alias = aliasPresets[preset];
    const contents: ContentItem[] = [];
    const metrics: PlatformMetric[] = [];
    const warnings: string[] = [];
    const previewRows: RealImportPreviewRow[] = [];
    for (const [index, values] of rows.slice(1).entries()) {
      const row = createRowObject(headers, values);
      const platform = normalizePlatform(read(row, "platform", "平台"), presetPlatform[preset]);
      const title = read(row, ...alias.title);
      const nativeId = read(row, ...alias.id);
      const url = read(row, ...alias.url);
      const id = nativeId || (url ? `${platform}-${stableHash(url)}` : "");
      const publishedAt = normalizeDateValue(read(row, ...alias.publishedAt));
      const capturedAt = normalizeDateValue(read(row, ...alias.capturedAt)) || publishedAt;
      const nativeMetrics = nativeMetricsFor(row, alias.nativeMetrics);
      const normalized = {
        id: id || undefined,
        title: title || undefined,
        publishedAt,
        capturedAt,
        views: readMetric(row, alias.views),
        likes: readMetric(row, alias.likes),
        comments: readMetric(row, alias.comments),
        saves: readMetric(row, alias.saves),
        shares: readMetric(row, alias.shares),
        followersDelta: readMetric(row, alias.followersDelta)
      };
      const rowWarnings: string[] = [];
      if (!title) rowWarnings.push("missing_title");
      if (!id) rowWarnings.push("missing_native_id_or_url");
      if (alias.confidence === "draft_realistic") rowWarnings.push(`preset:${preset}:draft_realistic_headers_need_real_export_confirmation`);
      const previewDedupeKey = `${platform}|${title || "untitled"}|${publishedAt ?? capturedAt ?? "no-date"}`;
      const canConfirmSave = Boolean(title && id);
      previewRows.push({
        rowNumber: index + 2,
        platform,
        normalized,
        nativeMetrics,
        rawFields: row,
        mappingConfidence: alias.confidence,
        warnings: rowWarnings,
        previewDedupeKey,
        canConfirmSave
      });
      if (!canConfirmSave) {
        warnings.push(`第 ${index + 2} 行不可确认保存：${rowWarnings.join(", ")}`);
        continue;
      }
      contents.push({
        id,
        title,
        platform,
        status: (read(row, "status", "状态") as ContentItem["status"]) || "published",
        format: (read(row, "format", "形式") as ContentItem["format"]) || presetFormat[preset],
        topic: read(row, "topic", "选题", "主题") || "uncategorized",
        publishedAt,
        notes: `csv-preset:${preset}`
      });
      metrics.push({
        id: `metric-${preset}-${id}`,
        contentId: id,
        platform,
        capturedAt: capturedAt || publishedAt || new Date().toISOString(),
        views: normalized.views ?? 0,
        likes: normalized.likes ?? 0,
        comments: normalized.comments ?? 0,
        saves: normalized.saves ?? 0,
        shares: normalized.shares ?? 0,
        followersDelta: normalized.followersDelta ?? 0
      });
    }
    if (contents.length === 0 && !options.allowInvalidPreviewRows) throw new Error("CSV 没有可导入的内容行。");
    const payload = { source: "csv" as const, contents, metrics, warnings };
    previewRowsByPayload.set(payload, previewRows);
    return payload;
  }
}
