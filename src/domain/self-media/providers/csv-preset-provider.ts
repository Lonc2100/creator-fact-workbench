import type { ContentItem, CsvImportPreset, Platform, PlatformMetric, ProviderImportPayload } from "../types";

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
  xiaohongshu: "xiaohongshu",
  小红书: "xiaohongshu",
  wechat: "wechat",
  公众号: "wechat",
  video_account: "video_account",
  视频号: "video_account",
  bilibili: "bilibili",
  "B站": "bilibili",
  b站: "bilibili",
  other: "other",
  其他: "other"
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
  const normalized = value.replaceAll(",", "");
  const parsed = normalized.endsWith("万") ? Number(normalized.slice(0, -1)) * 10000 : Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlatform(value: string, fallback: Platform) {
  return platformAliases[value] ?? fallback;
}

export class CsvPresetProvider {
  template(preset: CsvImportPreset) {
    const templates: Record<CsvImportPreset, string[]> = {
      generic: [
        "id,title,platform,status,format,topic,publishedAt,views,likes,comments,saves,shares,followersDelta",
        "generic-001,AI短片15秒精华,douyin,published,short_video,AI短片,2026-06-01T09:00:00.000Z,1200,45,8,21,6,3"
      ],
      douyin: ["作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,涨粉,选题", "douyin-001,AI短片15秒精华,2026-06-01T09:00:00.000Z,1200,45,8,21,6,3,AI短片"],
      xiaohongshu: ["笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉,选题", "xhs-001,AI工具复盘清单,2026-06-01T09:00:00.000Z,900,66,11,80,12,5,AI工具"],
      wechat: ["文章ID,标题,发布时间,阅读,点赞,评论,收藏,分享,涨粉,选题", "wechat-001,自媒体周复盘,2026-06-01T09:00:00.000Z,500,18,3,12,4,2,复盘"],
      video_account: ["视频ID,标题,发布时间,播放,点赞,评论,收藏,转发,涨粉,选题", "video-001,AI时代真人表达,2026-06-01T09:00:00.000Z,700,24,5,10,8,4,真人表达"],
      bilibili: ["稿件ID,标题,发布时间,播放,点赞,评论,收藏,分享,涨粉,选题", "bili-001,AI短片工作流拆解,2026-06-01T09:00:00.000Z,1600,88,22,61,19,9,AI短片"]
    };
    return templates[preset].join("\n");
  }

  fromCsv(csv: string, preset: CsvImportPreset = "generic"): ProviderImportPayload {
    const trimmed = csv.trim();
    if (!trimmed) throw new Error("CSV 内容不能为空。");
    const [headerLine, ...lines] = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseCsvLine(headerLine);
    const contents: ContentItem[] = [];
    const metrics: PlatformMetric[] = [];
    const warnings: string[] = [];
    for (const line of lines) {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const title = read(row, "title", "标题");
      if (!title) {
        warnings.push(`跳过缺少标题的行：${line.slice(0, 32)}`);
        continue;
      }
      const id = read(row, "id", "内容ID", "作品ID", "笔记ID", "文章ID", "视频ID", "稿件ID") || `${preset}-${Date.now()}-${contents.length + 1}`;
      const platform = normalizePlatform(read(row, "platform", "平台"), presetPlatform[preset]);
      const status = (read(row, "status", "状态") as ContentItem["status"]) || "published";
      const format = (read(row, "format", "形式") as ContentItem["format"]) || presetFormat[preset];
      const publishedAt = read(row, "publishedAt", "发布时间") || undefined;
      contents.push({
        id,
        title,
        platform,
        status,
        format,
        topic: read(row, "topic", "选题", "主题") || "uncategorized",
        publishedAt,
        notes: `csv-preset:${preset}`
      });
      metrics.push({
        id: `metric-${preset}-${id}`,
        contentId: id,
        platform,
        capturedAt: read(row, "capturedAt", "采集时间") || publishedAt || new Date().toISOString(),
        views: numberOf(read(row, "views", "播放", "播放量", "阅读", "浏览", "浏览量")),
        likes: numberOf(read(row, "likes", "点赞", "点赞数")),
        comments: numberOf(read(row, "comments", "评论", "评论数")),
        saves: numberOf(read(row, "saves", "收藏", "收藏数")),
        shares: numberOf(read(row, "shares", "分享", "转发", "分享数")),
        followersDelta: numberOf(read(row, "followersDelta", "涨粉"))
      });
    }
    if (contents.length === 0) throw new Error("CSV 没有可导入的内容行。");
    return { source: "csv", contents, metrics, warnings };
  }
}
