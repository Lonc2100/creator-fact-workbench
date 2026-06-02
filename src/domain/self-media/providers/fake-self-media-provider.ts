import type { ProviderImportPayload } from "../types";

const capturedAt = "2026-06-01T08:00:00.000Z";

export class FakeSelfMediaProvider {
  async validateConfig() {
    return true;
  }

  async importSample(): Promise<ProviderImportPayload> {
    return {
      source: "fake",
      contents: [
        {
          id: "content-ai-short-001",
          title: "AI 短片创作：15 秒先发精华",
          platform: "douyin",
          status: "published",
          format: "short_video",
          topic: "AI 短片创作",
          publishedAt: "2026-05-26T10:00:00.000Z",
          notes: "参考 Postiz/Mixpost 的内容队列，先追踪平台版本。"
        },
        {
          id: "content-ai-thinking-001",
          title: "为什么自媒体要先建立复盘系统",
          platform: "wechat",
          status: "draft",
          format: "article",
          topic: "AI 时代个人表达",
          scheduledAt: "2026-06-02T09:00:00.000Z"
        },
        {
          id: "content-product-001",
          title: "用自然语言搭建自媒体后台",
          platform: "xiaohongshu",
          status: "scheduled",
          format: "image_text",
          topic: "AI 产品化",
          scheduledAt: "2026-06-03T12:00:00.000Z"
        }
      ],
      metrics: [
        { id: "metric-ai-short-001", contentId: "content-ai-short-001", platform: "douyin", capturedAt, views: 1088, likes: 36, comments: 5, saves: 12, shares: 4, followersDelta: 3 },
        { id: "metric-ai-thinking-001", contentId: "content-ai-thinking-001", platform: "wechat", capturedAt, views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 0 },
        { id: "metric-product-001", contentId: "content-product-001", platform: "xiaohongshu", capturedAt, views: 0, likes: 0, comments: 0, saves: 0, shares: 0, followersDelta: 0 }
      ],
      ideas: [
        { id: "idea-weekly-review", title: "自媒体周复盘模板：心态、方法、工具", source: "manual", platform: "wechat", confidence: 0.86, status: "selected", rationale: "来自月度活动后的真实反思，可沉淀为长期栏目。" },
        { id: "idea-ai-crawler", title: "MediaCrawler 能帮自媒体人采什么数据", source: "mediacrawler", platform: "xiaohongshu", confidence: 0.74, status: "new", rationale: "工具型选题，适合做收藏型内容。" }
      ],
      competitors: [
        { id: "competitor-ai-director", name: "AI 短片导演类账号", platform: "douyin", handle: "benchmark-director", strength: "作品卡片强", observedPattern: "用成片吸引，再拆制作流程。" },
        { id: "competitor-ai-product", name: "AI 产品化分享账号", platform: "xiaohongshu", handle: "benchmark-product", strength: "教程密度高", observedPattern: "标题强调可复制的工作流。" }
      ],
      contacts: [
        { id: "contact-vto-ai", name: "V to AI 活动联系人", channel: "社群", relationship: "warm", note: "线下交流后可跟进 AI 短片或自媒体后台需求。" }
      ],
      leads: [
        { id: "lead-ai-short-order", contactId: "contact-vto-ai", source: "线下社群", status: "follow_up", valueEstimate: 3000, nextAction: "整理案例卡片并发朋友圈。" }
      ]
    };
  }
}
