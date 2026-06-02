import type { ContentItem, Platform, PlatformMetric, ProviderImportPayload, TopicIdea } from "../types";

type MediaCrawlerItem = Record<string, unknown>;

const platformAliases: Record<string, Platform> = {
  xhs: "xiaohongshu",
  xiaohongshu: "xiaohongshu",
  小红书: "xiaohongshu",
  douyin: "douyin",
  抖音: "douyin",
  bili: "bilibili",
  bilibili: "bilibili",
  "B站": "bilibili",
  wechat: "wechat",
  公众号: "wechat",
  video_account: "video_account",
  视频号: "video_account"
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): MediaCrawlerItem[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as MediaCrawlerItem[];
  return [];
}

function textOf(item: MediaCrawlerItem, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function numberOf(item: MediaCrawlerItem, ...keys: string[]) {
  const value = textOf(item, ...keys).replaceAll(",", "");
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlatform(value: string): Platform {
  return platformAliases[value] ?? "other";
}

export class MediaCrawlerImportProvider {
  fromJson(input: unknown): ProviderImportPayload {
    const data = asRecord(input);
    const items = asArray(data.items ?? data.notes ?? data.awemes ?? data.videos ?? data.contents ?? input);
    if (items.length === 0) throw new Error("MediaCrawler JSON 必须包含 items/notes/awemes/videos 数组。");
    const defaultPlatform = normalizePlatform(String(data.platform ?? ""));
    const contents: ContentItem[] = [];
    const metrics: PlatformMetric[] = [];
    const ideas: TopicIdea[] = [];
    for (const item of items) {
      const platform = normalizePlatform(textOf(item, "platform", "source_platform") || defaultPlatform);
      const id = textOf(item, "id", "note_id", "aweme_id", "video_id", "bvid", "item_id") || `mediacrawler-${Date.now()}-${contents.length + 1}`;
      const title = textOf(item, "title", "desc", "content", "display_title") || "Untitled MediaCrawler Item";
      const topic = textOf(item, "keyword", "tag", "category") || "采集信号";
      contents.push({
        id,
        title,
        platform,
        status: "published",
        format: platform === "xiaohongshu" ? "image_text" : "short_video",
        topic,
        publishedAt: textOf(item, "publishedAt", "publish_time", "time", "created_at") || undefined,
        notes: textOf(item, "url", "note_url", "share_url")
      });
      metrics.push({
        id: `metric-mediacrawler-${id}`,
        contentId: id,
        platform,
        capturedAt: new Date().toISOString(),
        views: numberOf(item, "views", "view_count", "play_count", "播放量"),
        likes: numberOf(item, "likes", "liked_count", "digg_count", "点赞数"),
        comments: numberOf(item, "comments", "comment_count", "评论数"),
        saves: numberOf(item, "saves", "collected_count", "收藏数"),
        shares: numberOf(item, "shares", "share_count", "分享数"),
        followersDelta: 0
      });
      ideas.push({
        id: `idea-mediacrawler-${id}`,
        title: `拆解：${title}`,
        source: "mediacrawler",
        platform,
        confidence: 0.68,
        status: "new",
        rationale: "来自 MediaCrawler 导入的公开内容信号，可用于竞品拆解和选题池。"
      });
    }
    return { source: "mediacrawler", contents, metrics, ideas };
  }
}
