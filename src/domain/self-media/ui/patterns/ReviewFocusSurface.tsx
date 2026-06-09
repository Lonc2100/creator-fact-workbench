import type { DashboardSnapshot, ReviewActionItem } from "../../types";
import { BarChart3, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatNumber, formatPercent } from "../foundations/format";
import { actionStatusLabels, platformLabels } from "../foundations/labels";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

const actionStatusFlow: ReviewActionItem["status"][] = ["doing", "done", "dropped", "todo"];
const priorityOrder: ReviewActionItem["priority"][] = ["high", "medium", "low"];
const priorityLabels: Record<ReviewActionItem["priority"], string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级"
};

function isPausedWechatAction(item: ReviewActionItem) {
  const text = [item.title, item.nextAction, item.relatedType, item.relatedId]
    .filter(Boolean)
    .join(" ");
  return /(公众号|微信后台|wechat|wechat_official)/i.test(text);
}

function uniqueActionItems(items: ReviewActionItem[]) {
  return items.reduce<ReviewActionItem[]>((result, item) => {
    const key = `${item.title}-${item.relatedType ?? "none"}-${item.relatedId ?? "none"}`;
    const exists = result.some((current) => `${current.title}-${current.relatedType ?? "none"}-${current.relatedId ?? "none"}` === key);
    return exists ? result : [...result, item];
  }, []);
}

function priorityActions(items: ReviewActionItem[]) {
  return uniqueActionItems(items)
    .filter((item) => !isPausedWechatAction(item))
    .filter((item) => !["done", "dropped"].includes(item.status))
    .sort((a, b) => {
      const priorityDelta = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 5);
}

function metricTime(value: DashboardSnapshot["metricSnapshots"][number]) {
  return new Date(value.updatedAt || value.snapshotDate).getTime();
}

function metricEngagement(value: Pick<DashboardSnapshot["metricSnapshots"][number], "likes" | "comments" | "saves" | "shares">) {
  return value.likes + value.comments + value.saves + value.shares;
}

function topContentRows(snapshot: DashboardSnapshot) {
  const contentById = new Map(snapshot.contents.map((item) => [item.id, item]));
  const latestByContent = new Map<string, DashboardSnapshot["metricSnapshots"][number]>();

  for (const metric of snapshot.metricSnapshots) {
    const content = contentById.get(metric.contentId);
    if (!content) continue;
    if (content.userExcludedFromTrustedScope) continue;
    if (content.dataDomain && content.dataDomain !== "user_work") continue;
    if (metric.dataDomain && metric.dataDomain !== "user_work") continue;
    const previous = latestByContent.get(metric.contentId);
    if (!previous || metricTime(metric) > metricTime(previous)) latestByContent.set(metric.contentId, metric);
  }

  return [...latestByContent.values()]
    .map((metric) => {
      const content = contentById.get(metric.contentId);
      const engagement = metricEngagement(metric);
      return content
        ? {
            content,
            metric,
            engagement,
            score: metric.views + engagement * 5
          }
        : undefined;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score || metricTime(b.metric) - metricTime(a.metric))
    .slice(0, 3);
}

function performanceRows(snapshot: DashboardSnapshot) {
  return [
    {
      label: "近 7 天",
      views: snapshot.weeklyReview.metrics.totalViews,
      engagement: snapshot.weeklyReview.metrics.totalEngagement,
      contentCount: snapshot.weeklyReview.metrics.contentCount,
      bestPlatform: snapshot.weeklyReview.metrics.bestPlatform
    },
    {
      label: "近 30 天",
      views: snapshot.monthlyReview.metrics.totalViews,
      engagement: snapshot.monthlyReview.metrics.totalEngagement,
      contentCount: snapshot.monthlyReview.metrics.contentCount,
      bestPlatform: snapshot.monthlyReview.metrics.bestPlatform
    }
  ];
}

export function ReviewFocusSurface({
  snapshot,
  period,
  onActionStatus
}: {
  snapshot: DashboardSnapshot;
  period: "weekly" | "monthly";
  onActionStatus?: (item: ReviewActionItem, status: ReviewActionItem["status"]) => void;
}) {
  const topRows = topContentRows(snapshot);
  const actionRows = priorityActions(snapshot.actionItems);
  const activeLeads = snapshot.leads.filter((lead) => !["won", "lost"].includes(lead.status));
  const leadValue = activeLeads.reduce((total, lead) => total + lead.valueEstimate, 0);
  const selectedLabel = period === "weekly" ? "本周" : "本月";

  return (
    <section className="review-focus-surface" data-testid="reviews-focus-surface">
      <div className="metric-strip" aria-label="最近表现">
        {performanceRows(snapshot).map((row) => (
          <div className="metric-card" key={row.label}>
            <span>{row.label}</span>
            <strong>{formatNumber(row.views)}</strong>
            <small>{formatNumber(row.engagement)} 次互动 · {row.contentCount} 条内容</small>
            <small>优势平台：{platformLabels[row.bestPlatform]}</small>
          </div>
        ))}
      </div>

      <div className="dashboard-section-grid">
        <Panel data-testid="review-top-content" title="最值得复盘的内容" eyebrow="Top 内容">
          <div className="compact-list">
            {topRows.map((row) => {
              const engagementRate = row.metric.views > 0 ? (row.engagement / row.metric.views) * 100 : 0;
              return (
                <div className="compact-row" key={row.metric.id}>
                  <PlatformBadge platform={row.metric.platform} />
                  <div>
                    <strong>{row.content.title}</strong>
                    <span>
                      {formatNumber(row.metric.views)} 观看 · {formatNumber(row.engagement)} 互动 · {formatPercent(engagementRate)}
                    </span>
                    <span>最新保存：{formatDateTime(row.metric.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
            {topRows.length === 0 && <p className="muted">暂无可复盘内容，先去数据更新页回收平台数据。</p>}
          </div>
        </Panel>

        <Panel data-testid="review-priority-actions" title={`${selectedLabel}先处理这些动作`} eyebrow="行动重点">
          <div className="creator-focus-list">
            {actionRows.map((item) => (
              <div className="creator-focus-row" key={item.id}>
                <CheckCircle2 size={17} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.nextAction ?? "继续推进"} · {priorityLabels[item.priority]}</span>
                  <StatusBadge status={item.status} />
                  {onActionStatus && (
                    <div className="inline-action-row">
                      {actionStatusFlow.filter((status) => status !== item.status).slice(0, 3).map((status) => (
                        <Button key={status} onClick={() => onActionStatus(item, status)} type="button" variant={status === "done" ? "primary" : "ghost"}>
                          {actionStatusLabels[status]}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {actionRows.length === 0 && <p className="muted">暂无待推进动作，保存复盘后会生成下一步。</p>}
          </div>
          <p className="muted">默认只显示前 5 条，完整明细在下方展开。</p>
        </Panel>

        <Panel data-testid="review-lead-followups" id="review-lead-followups" title="线索轻量跟进" eyebrow="二级入口" action={<Users size={18} aria-hidden="true" />}>
          <div className="creator-focus-list">
            <div className="creator-focus-row">
              <TrendingUp size={17} aria-hidden="true" />
              <div>
                <strong>{activeLeads.length} 条活跃线索</strong>
                <span>估算机会 {formatNumber(leadValue)}，先作为复盘动作的一部分跟进。</span>
              </div>
            </div>
            <a className="creator-card-link" href="/leads">查看线索待办</a>
          </div>
        </Panel>

        <Panel title="复盘口径" eyebrow="看板范围" action={<BarChart3 size={18} aria-hidden="true" />}>
          <p className="muted">首屏只看可信内容级数据，最近作品优先；更多来源、完整列表和历史正文默认收起。</p>
        </Panel>
      </div>
    </section>
  );
}
