import { reviewThresholds } from "../config";
import type { ContentItem, MonetizationLead, Platform, PlatformMetric, PublishQueueItem, ReviewAction, ReviewInsight, ReviewReport, TopicIdea } from "../types";

function sum(metrics: PlatformMetric[], key: keyof Pick<PlatformMetric, "views" | "likes" | "comments" | "saves" | "shares" | "followersDelta">) {
  return metrics.reduce((total, item) => total + item[key], 0);
}

function bestPlatform(metrics: PlatformMetric[]): Platform {
  const totals = new Map<Platform, number>();
  for (const metric of metrics) totals.set(metric.platform, (totals.get(metric.platform) ?? 0) + metric.views + metric.likes + metric.saves + metric.shares);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
}

const reviewPlatformOrder: Platform[] = ["douyin", "xiaohongshu", "video_account", "bilibili"];
const reviewPlatformLabels: Record<Platform, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  wechat: "公众号",
  video_account: "视频号",
  bilibili: "B站",
  other: "其它"
};

function platformContributionRows(metrics: PlatformMetric[]) {
  const totalViews = sum(metrics, "views");
  return reviewPlatformOrder.map((platform) => {
    const related = metrics.filter((metric) => metric.platform === platform);
    const views = sum(related, "views");
    const engagement = sum(related, "likes") + sum(related, "comments") + sum(related, "saves") + sum(related, "shares");
    const contentCount = new Set(related.map((metric) => metric.contentId)).size;
    const note = platform === "bilibili" ? "archives 内容级指标" : "内容级指标";
    return {
      platform,
      label: reviewPlatformLabels[platform],
      views,
      engagement,
      contentCount,
      share: totalViews > 0 ? Math.round((views / totalViews) * 1000) / 10 : 0,
      note
    };
  });
}

interface ReviewContext {
  ideas?: TopicIdea[];
  queue?: PublishQueueItem[];
  leads?: MonetizationLead[];
}

function buildInsights(contents: ContentItem[], metrics: PlatformMetric[], context: ReviewContext = {}): ReviewInsight[] {
  const totalViews = sum(metrics, "views");
  const totalEngagement = sum(metrics, "likes") + sum(metrics, "comments") + sum(metrics, "saves") + sum(metrics, "shares");
  const cadenceInsight =
    contents.length < reviewThresholds.lowCadenceWarning
      ? "发布频率低于最低复盘线，需要把 15 秒精华、图文片段、半成品过程也纳入内容队列。"
      : "发布频率达到最低复盘线，可以继续优化选题命中率。";
  const selectedIdeas = (context.ideas ?? []).filter((idea) => idea.status === "selected").length;
  const activeLeads = (context.leads ?? []).filter((lead) => !["won", "lost"].includes(lead.status)).length;
  return [
    {
      id: "insight-cadence",
      title: "发布频率",
      evidence: `本周期记录 ${contents.length} 条内容。`,
      recommendation: cadenceInsight
    },
    {
      id: "insight-engagement",
      title: "互动效率",
      evidence: `累计曝光 ${totalViews}，互动 ${totalEngagement}。`,
      recommendation: totalViews > 0 ? "把高互动内容拆成选题、脚本、幕后过程三种二次内容。" : "先补齐平台后台指标，避免复盘只靠主观感受。"
    },
    {
      id: "insight-pipeline",
      title: "选题与变现",
      evidence: `选中选题 ${selectedIdeas} 个，活跃线索 ${activeLeads} 个。`,
      recommendation: activeLeads > 0 ? "把活跃线索写入下周内容和私域跟进动作，避免只做曝光不做转化。" : "本周需要至少沉淀 1 个明确需求和下一步跟进。"
    }
  ];
}

function buildActions(context: ReviewContext = {}): ReviewAction[] {
  const leadAction = (context.leads ?? []).find((lead) => lead.status === "follow_up" || lead.status === "new");
  return [
    { id: "action-post-cadence", title: "下周至少发布 4 条轻量内容", owner: "creator", priority: "high" },
    { id: "action-import-metrics", title: "导入抖音、小红书、视频号、B站内容级后台数据", owner: "creator", priority: "high" },
    { id: "action-follow-leads", title: leadAction ? `跟进线索：${leadAction.nextAction}` : "跟进线下社群潜在线索并沉淀联系人记录", owner: "agent", priority: "medium" }
  ];
}

export function generateReview(period: "weekly" | "monthly", contents: ContentItem[], metrics: PlatformMetric[], context: ReviewContext = {}): ReviewReport {
  const startDate = period === "weekly" ? "2026-05-25" : "2026-05-01";
  const endDate = "2026-06-01";
  const totalViews = sum(metrics, "views");
  const totalLikes = sum(metrics, "likes");
  const totalEngagement = totalLikes + sum(metrics, "comments") + sum(metrics, "saves") + sum(metrics, "shares");
  const platform = bestPlatform(metrics);
  const platformRows = platformContributionRows(metrics);
  const insights = buildInsights(contents, metrics, context);
  const actions = buildActions(context);
  const queued = (context.queue ?? []).filter((item) => ["queued", "scheduled"].includes(item.status)).length;
  const activeLeads = (context.leads ?? []).filter((lead) => !["won", "lost"].includes(lead.status)).length;
  const summary = `${period === "weekly" ? "周" : "月"}复盘：当前重点是提高发布频率、把外部数据回收到内部模型、用复盘驱动下阶段选题。`;
  const markdown = [
    `# ${period === "weekly" ? "周复盘" : "月复盘"} ${startDate} - ${endDate}`,
    "",
    `## 摘要`,
    summary,
    "",
    "## 关键指标",
    `- 内容数：${contents.length}`,
    `- 总曝光：${totalViews}`,
    `- 总点赞：${totalLikes}`,
    `- 总互动：${totalEngagement}`,
    `- 当前优势平台：${platform}`,
    `- 已排期内容：${queued}`,
    `- 活跃变现线索：${activeLeads}`,
    "",
    "## 四平台内容级贡献",
    ...platformRows.map((row) => `- ${row.label}：曝光 ${row.views}，互动 ${row.engagement}，内容 ${row.contentCount}，占比 ${row.share}%（${row.note}）。`),
    "",
    "## 账号级趋势边界",
    "- AccountMetricSnapshot 单独作为账号趋势展示，不计入内容数、总曝光、总互动或当前优势平台。",
    "",
    "## 洞察",
    ...insights.map((item) => `- ${item.title}：${item.recommendation}`),
    "",
    "## 下一步",
    ...actions.map((item) => `- [${item.priority}] ${item.title}`)
  ].join("\n");
  return {
    id: `${period}-review-${endDate}`,
    period,
    startDate,
    endDate,
    summary,
    markdown,
    metrics: { contentCount: contents.length, totalViews, totalLikes, totalEngagement, bestPlatform: platform },
    insights,
    actions
  };
}
