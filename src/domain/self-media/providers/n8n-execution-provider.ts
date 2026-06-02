import type { ContentItem, Platform, PlatformMetric, ProviderImportPayload } from "../types";

type N8nRecord = Record<string, unknown>;

function asRecord(value: unknown): N8nRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as N8nRecord) : {};
}

function asArray(value: unknown): N8nRecord[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as N8nRecord[];
  return [];
}

function textOf(item: N8nRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function numberOf(item: N8nRecord, ...keys: string[]) {
  const parsed = Number(textOf(item, ...keys).replaceAll(",", "") || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function platformOf(value: string): Platform {
  if (["douyin", "抖音"].includes(value)) return "douyin";
  if (["xiaohongshu", "xhs", "小红书"].includes(value)) return "xiaohongshu";
  if (["wechat", "公众号"].includes(value)) return "wechat";
  if (["video_account", "视频号"].includes(value)) return "video_account";
  if (["bilibili", "bili", "B站", "b站"].includes(value)) return "bilibili";
  return "other";
}

function collectItems(input: N8nRecord) {
  const data = asRecord(input.data);
  return asArray(input.items).concat(asArray(data.items), asArray(data.contents), asArray(input.contents));
}

export class N8nExecutionProvider {
  fromJson(input: unknown): ProviderImportPayload {
    const execution = asRecord(input);
    const items = collectItems(execution);
    if (items.length === 0) throw new Error("n8n execution JSON 必须包含 items 或 data.items。");
    const executionId = textOf(execution, "executionId", "id") || `n8n-${Date.now()}`;
    const workflowName = textOf(execution, "workflowName", "workflow", "name") || "n8n workflow";
    const contents: ContentItem[] = [];
    const metrics: PlatformMetric[] = [];
    for (const item of items) {
      const id = textOf(item, "id", "contentId") || `${executionId}-${contents.length + 1}`;
      const platform = platformOf(textOf(item, "platform", "source"));
      contents.push({
        id,
        title: textOf(item, "title", "name") || "Untitled n8n Item",
        platform,
        status: (textOf(item, "status") as ContentItem["status"]) || "published",
        format: (textOf(item, "format") as ContentItem["format"]) || (platform === "wechat" ? "article" : "short_video"),
        topic: textOf(item, "topic", "keyword") || workflowName,
        publishedAt: textOf(item, "publishedAt", "createdAt") || undefined,
        notes: `n8n:${workflowName}:${executionId}`
      });
      metrics.push({
        id: `metric-n8n-${id}`,
        contentId: id,
        platform,
        capturedAt: new Date().toISOString(),
        views: numberOf(item, "views", "playCount", "readCount"),
        likes: numberOf(item, "likes"),
        comments: numberOf(item, "comments"),
        saves: numberOf(item, "saves"),
        shares: numberOf(item, "shares"),
        followersDelta: numberOf(item, "followersDelta")
      });
    }
    return { source: "n8n", contents, metrics, warnings: [`execution:${executionId}`, `workflow:${workflowName}`] };
  }
}
