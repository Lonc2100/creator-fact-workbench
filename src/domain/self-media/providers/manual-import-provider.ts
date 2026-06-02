import type { ContentItem, ImportRequest, Platform, PlatformMetric, ProviderImportPayload } from "../types";

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

function read(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function parseNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlatform(value: string | undefined): Platform {
  return platformAliases[value ?? ""] ?? "other";
}

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

export class ManualImportProvider {
  fromJson(input: unknown): ProviderImportPayload {
    const data = input as Partial<ProviderImportPayload>;
    return {
      source: data.source ?? "json",
      contents: (data.contents ?? []) as ContentItem[],
      metrics: (data.metrics ?? []) as PlatformMetric[],
      ideas: data.ideas ?? [],
      competitors: data.competitors ?? [],
      contacts: data.contacts ?? [],
      leads: data.leads ?? []
    };
  }

  fromCsv(csv: string): ProviderImportPayload {
    const trimmed = csv.trim();
    if (!trimmed) throw new Error("CSV 内容不能为空。");
    const [headerLine, ...lines] = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const headers = parseCsvLine(headerLine).map((item) => item.trim());
    if (!headers.some((header) => ["title", "标题"].includes(header))) throw new Error("CSV 必须包含 title 或 标题 字段。");
    const contents: ContentItem[] = [];
    const metrics: PlatformMetric[] = [];
    for (const line of lines) {
      const values = parseCsvLine(line);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      const id = read(row, "id", "内容ID") || `csv-${Date.now()}-${contents.length + 1}`;
      const platform = normalizePlatform(read(row, "platform", "平台"));
      contents.push({
        id,
        title: read(row, "title", "标题") || "Untitled",
        platform,
        status: (read(row, "status", "状态") as ContentItem["status"]) || "published",
        format: (read(row, "format", "形式") as ContentItem["format"]) || "other",
        topic: read(row, "topic", "选题", "主题") || "uncategorized",
        publishedAt: read(row, "publishedAt", "发布时间") || undefined,
        notes: read(row, "notes", "备注") || undefined
      });
      metrics.push({
        id: `metric-${id}`,
        contentId: id,
        platform,
        capturedAt: read(row, "capturedAt", "采集时间") || new Date().toISOString(),
        views: parseNumber(read(row, "views", "播放", "阅读", "浏览")),
        likes: parseNumber(read(row, "likes", "点赞")),
        comments: parseNumber(read(row, "comments", "评论")),
        saves: parseNumber(read(row, "saves", "收藏")),
        shares: parseNumber(read(row, "shares", "分享", "转发")),
        followersDelta: parseNumber(read(row, "followersDelta", "涨粉"))
      });
    }
    return { source: "csv", contents, metrics };
  }

  fromManual(input: NonNullable<ImportRequest["manual"]>): ProviderImportPayload {
    if (!input.title?.trim()) throw new Error("手动导入必须填写标题。");
    const id = `manual-${Date.now()}`;
    const publishedAt = input.publishedAt || new Date().toISOString();
    return {
      source: "manual",
      contents: [
        {
          id,
          title: input.title.trim(),
          platform: input.platform,
          status: input.status ?? "published",
          format: input.format,
          topic: input.topic || "uncategorized",
          publishedAt
        }
      ],
      metrics: [
        {
          id: `metric-${id}`,
          contentId: id,
          platform: input.platform,
          capturedAt: new Date().toISOString(),
          views: parseNumber(input.views),
          likes: parseNumber(input.likes),
          comments: parseNumber(input.comments),
          saves: parseNumber(input.saves),
          shares: parseNumber(input.shares),
          followersDelta: parseNumber(input.followersDelta)
        }
      ]
    };
  }
}
