import type { DashboardSnapshot, EvidenceInsight, ReviewActionItem, SavedReview } from "../../types";
import { formatDateTime, formatNumber, formatPercent } from "../foundations/format";
import { actionStatusLabels, platformLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

const actionStatusFlow: ReviewActionItem["status"][] = ["doing", "done", "dropped", "todo"];
const priorityOrder: ReviewActionItem["priority"][] = ["high", "medium", "low"];
const priorityLabels: Record<ReviewActionItem["priority"], string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级"
};
const contentPlatformOrder = ["douyin", "xiaohongshu", "video_account", "bilibili"] as const;

function periodLabel(period: "weekly" | "monthly") {
  return period === "weekly" ? "周复盘" : "月复盘";
}

function evidenceLabel(type: string) {
  const labels: Record<string, string> = {
    content: "内容",
    platform_version: "平台版本",
    metric_snapshot: "指标快照",
    review: "复盘",
    action_item: "行动项",
    lead: "线索"
  };
  return labels[type] ?? type;
}

function evidenceSummary(refs: Array<{ type: string; id: string }>) {
  const counts = refs.reduce<Record<string, number>>((acc, ref) => {
    acc[ref.type] = (acc[ref.type] ?? 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).map(([type, count]) => `${evidenceLabel(type)} ${count}`);
  return entries.length ? entries.join(" / ") : "暂无证据";
}

function impactLevel(index: number) {
  return index === 0 ? "高" : index === 1 ? "中" : "观察";
}

function actionFromInsight(title: string) {
  if (title.includes("阻塞")) return "补齐发布检查";
  if (title.includes("线索")) return "推进线索跟进";
  if (title.includes("内容")) return "拆解可复用变量";
  return "进入下轮计划";
}

function sourceLabel(source: DashboardSnapshot["metricSourceGroups"][number]["source"]) {
  const labels: Record<string, string> = {
    douyin_creator_center: "抖音创作者中心",
    xiaohongshu_creator_center: "小红书创作者中心",
    video_account_creator_center: "视频号助手",
    bilibili_creator_center: "B站创作中心",
    manual: "手动录入",
    csv: "CSV 导入",
    json: "JSON 导入",
    fake: "样例数据",
    mediacrawler: "MediaCrawler",
    n8n: "n8n",
    wechat_official: "公众号历史数据"
  };
  return labels[source] ?? source;
}

function uniqueActionItems(items: ReviewActionItem[]) {
  return items.reduce<ReviewActionItem[]>((result, item) => {
    const key = `${item.title}-${item.relatedType ?? "none"}-${item.relatedId ?? "none"}`;
    const exists = result.some((current) => `${current.title}-${current.relatedType ?? "none"}-${current.relatedId ?? "none"}` === key);
    return exists ? result : [...result, item];
  }, []);
}

function isPausedWechatAction(item: ReviewActionItem) {
  const text = [item.title, item.nextAction, item.relatedType, item.relatedId]
    .filter(Boolean)
    .join(" ");
  return /(公众号|微信后台|wechat|wechat_official)/i.test(text);
}

function isPausedWechatEvidenceInsight(insight: EvidenceInsight) {
  const text = [
    insight.id,
    insight.title,
    insight.finding,
    ...insight.evidenceRefs.map((ref) => `${ref.type}:${ref.id}`)
  ].join(" ");
  return /(公众号|微信后台|wechat|wechat_official)/i.test(text);
}

function actionGroups(items: ReviewActionItem[]) {
  const uniqueItems = uniqueActionItems(items).sort((a, b) => {
    const priorityDelta = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (priorityDelta !== 0) return priorityDelta;
    const statusDelta = Number(a.status === "done" || a.status === "dropped") - Number(b.status === "done" || b.status === "dropped");
    if (statusDelta !== 0) return statusDelta;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return priorityOrder
    .map((priority) => {
      const groupItems = uniqueItems.filter((item) => item.priority === priority);
      return {
        priority,
        items: groupItems,
        activeCount: groupItems.filter((item) => !["done", "dropped"].includes(item.status)).length,
        doneCount: groupItems.filter((item) => item.status === "done").length
      };
    })
    .filter((group) => group.items.length > 0);
}

export function EvidenceReviewReport({
  snapshot,
  period,
  onActionStatus
}: {
  snapshot: DashboardSnapshot;
  period: "weekly" | "monthly";
  onActionStatus?: (item: ReviewActionItem, status: ReviewActionItem["status"]) => void;
}) {
  const periodReviews = snapshot.savedReviews.filter((item) => item.period === period);
  const review: SavedReview | undefined = periodReviews[0];
  const liveReview = period === "weekly" ? snapshot.weeklyReview : snapshot.monthlyReview;
  const report = review?.period === period ? review.markdown : liveReview.markdown;
  const reportSource = review?.period === period ? `已保存于 ${formatDateTime(review.createdAt)}` : "实时生成，尚未保存";
  const operatorEvidenceInsights = snapshot.evidenceInsights.filter((insight) => !isPausedWechatEvidenceInsight(insight));
  const evidenceWithRefs = operatorEvidenceInsights.filter((insight) => insight.evidenceRefs.length > 0);
  const evidenceGaps = operatorEvidenceInsights.filter((insight) => insight.evidenceRefs.length === 0);
  const operatorActionItems = snapshot.actionItems.filter((item) => !isPausedWechatAction(item));
  const activeActions = operatorActionItems.filter((item) => !["done", "dropped"].includes(item.status));
  const completedActions = operatorActionItems.filter((item) => item.status === "done").length;
  const engagementRate = liveReview.metrics.totalViews > 0 ? (liveReview.metrics.totalEngagement / liveReview.metrics.totalViews) * 100 : 0;
  const groupedActions = actionGroups(operatorActionItems);
  const uniqueActionCount = uniqueActionItems(operatorActionItems).length;
  const evidenceRows = evidenceWithRefs.slice(0, 5);
  const evidenceRefCount = evidenceWithRefs.reduce((total, insight) => total + insight.evidenceRefs.length, 0);
  const sourceRows = snapshot.metricSourceGroups
    .filter((row) => ["douyin_creator_center", "xiaohongshu_creator_center", "video_account_creator_center", "bilibili_creator_center"].includes(row.source))
    .slice(0, 6);
  const platformRows = contentPlatformOrder.map((platform) => {
    const row = snapshot.metricPlatformGroups.find((item) => item.platform === platform);
    return {
      platform,
      views: row?.views ?? 0,
      sourceCount: row?.sourceCount ?? 0,
      snapshotCount: row?.snapshotCount ?? 0,
      contentCount: row?.contentCount ?? 0,
      includedInReview: row?.includedInReview ?? false,
      latestSnapshotDate: row?.latestSnapshotDate
    };
  });
  const importedViews = platformRows.reduce((total, row) => total + row.views, 0);
  const importedSnapshots = platformRows.reduce((total, row) => total + row.snapshotCount, 0);
  const accountViews = snapshot.accountMetricGroups.reduce((total, row) => total + row.views, 0);
  const accountSnapshots = snapshot.accountMetricSnapshots.length;
  const bestPlatformLabel = platformLabels[liveReview.metrics.bestPlatform] ?? liveReview.metrics.bestPlatform;

  return (
    <div className="review-redesign-layout" data-ui-boundary="review-only">
      <section className="review-main-column">
        <Panel className="review-summary-panel" title={period === "weekly" ? "本周结论" : "本月结论"} eyebrow="结论优先">
          <p className="review-summary-lead">{review?.summary ?? liveReview.summary}</p>
          <div className="review-decision-strip" aria-label="复盘决策摘要">
            <span><b>{periodLabel(period)}</b><small>{liveReview.startDate} - {liveReview.endDate}</small></span>
            <span><b>{bestPlatformLabel}</b><small>当前最佳平台</small></span>
            <span><b>{evidenceRefCount}</b><small>可追溯证据引用</small></span>
            <span><b>{activeActions.length}</b><small>待推进动作</small></span>
          </div>
          <p className="muted">{reportSource}。优先处理结论、证据和行动项。</p>
        </Panel>

        <div className="review-kpi-grid" aria-label="复盘指标摘要">
          <Panel title="总曝光" eyebrow="指标">
            <strong className="review-kpi-number">{formatNumber(liveReview.metrics.totalViews)}</strong>
            <p className="muted">只统计内容级指标快照</p>
          </Panel>
          <Panel title="总互动" eyebrow="指标">
            <strong className="review-kpi-number">{formatNumber(liveReview.metrics.totalEngagement)}</strong>
            <p className="muted">{formatPercent(engagementRate)} 综合互动率</p>
          </Panel>
          <Panel title="行动项" eyebrow="执行">
            <strong className="review-kpi-number">{activeActions.length}/{operatorActionItems.length}</strong>
            <p className="muted">待推进 / 全部行动项</p>
          </Panel>
        </div>

        <Panel title="复盘指标来源" eyebrow="四平台内容级指标">
          <div className="review-source-summary">
            <span><b>{formatNumber(liveReview.metrics.totalViews)}</b><small>{periodLabel(period)}总曝光</small></span>
            <span><b>{formatNumber(importedViews)}</b><small>导入快照曝光</small></span>
            <span><b>{formatNumber(importedSnapshots)}</b><small>可追溯快照</small></span>
            <span><b>{formatNumber(accountViews)}</b><small>账号趋势单列，不计入总量</small></span>
          </div>
          <div className="review-source-layout">
            <div className="review-platform-split">
              {platformRows.map((row) => (
                <div className="review-platform-row" key={row.platform}>
                  <PlatformBadge platform={row.platform} />
                  <i style={{ width: `${Math.min(Math.max(liveReview.metrics.totalViews > 0 ? (row.views / liveReview.metrics.totalViews) * 100 : 0, row.views > 0 ? 8 : 0), 100)}%` }} />
                  <strong>{formatNumber(row.views)}</strong>
                  <small>
                    {row.platform === "bilibili" ? "稿件内容级指标" : "内容级指标"} · {row.contentCount} 内容 · {row.snapshotCount} 快照 · {row.includedInReview ? "已参与" : "待导入"}
                  </small>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table className="sm-table review-source-table">
                <thead><tr><th>来源</th><th>平台</th><th>快照</th><th>曝光</th><th>复盘</th></tr></thead>
                <tbody>
                  {sourceRows.map((row) => (
                    <tr key={row.source}>
                      <td><strong>{sourceLabel(row.source)}</strong><small>{row.latestSnapshotDate?.slice(0, 10) ?? "未标注"}</small></td>
                      <td>{row.platform === "mixed" ? "多平台" : platformLabels[row.platform]}</td>
                      <td>{formatNumber(row.snapshotCount)}</td>
                      <td>{formatNumber(row.views)}</td>
                      <td><span className={`source-status-pill ${row.includedInReview ? "is-included" : "is-snapshot-only"}`}>{row.includedInReview ? "已参与" : "仅快照"}</span></td>
                    </tr>
                  ))}
                  {sourceRows.length === 0 && <tr><td colSpan={5}>暂无导入指标快照来源。</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div className="review-account-boundary" aria-label="账号级指标边界">
            <strong>账号级趋势</strong>
            <span>{formatNumber(accountSnapshots)} 条账号快照 · {formatNumber(accountViews)} 账号曝光趋势</span>
            <small>只用于账号趋势/增长观察，不进入内容总量、四平台内容贡献、周/月复盘总曝光。</small>
          </div>
        </Panel>

        <Panel title="证据表格" eyebrow="指标证据">
          <div className="table-wrap">
            <table className="sm-table review-evidence-table">
              <thead>
                <tr><th>发现</th><th>证据</th><th>影响</th><th>建议动作</th></tr>
              </thead>
              <tbody>
                {evidenceRows.map((insight, index) => (
                  <tr key={insight.id}>
                    <td><strong>{insight.title}</strong><small>{insight.finding}</small></td>
                    <td>{evidenceSummary(insight.evidenceRefs)}</td>
                    <td>{impactLevel(index)}</td>
                    <td>{actionFromInsight(insight.title)}</td>
                  </tr>
                ))}
                {evidenceRows.length === 0 && (
                  <tr><td colSpan={4}>暂无可执行证据，先完成指标回收或保存复盘后再推进建议。</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {evidenceGaps.length > 0 && <p className="muted">待补证据：{evidenceGaps.map((insight) => insight.title).join("、")}。</p>}
        </Panel>

        <details className="analytics-data-section review-advanced-diagnostics" data-testid="reviews-advanced-diagnostics">
          <summary>
            <span>
              <strong>复盘原文</strong>
              <small>展开查看完整文本</small>
            </span>
            <i>高级</i>
          </summary>
          <Panel className="review-report review-report-preview" title="报告正文预览" eyebrow={periodLabel(period)} action={<span className="muted">降权展示</span>}>
            <pre>{report}</pre>
          </Panel>
          <Panel title="复盘历史" eyebrow="历史记录" action={<span className="muted">{snapshot.savedReviews.length} 条</span>}>
            <div className="history-list">
              {snapshot.savedReviews.slice(0, 6).map((item) => (
                <div className="history-row" key={item.id}>
                  <div>
                    <strong>{periodLabel(item.period)}</strong>
                    <small>{item.summary}</small>
                  </div>
                  <span>{item.startDate} - {item.endDate}</span>
                </div>
              ))}
              {snapshot.savedReviews.length === 0 && <p className="muted">尚未保存历史复盘，当前展示实时周复盘。</p>}
            </div>
          </Panel>
          <Panel title="当前周期" eyebrow="复盘窗口">
            <div className="history-list">
              <div className="history-row">
                <strong>{periodLabel(period)}</strong>
                <span>{liveReview.startDate} - {liveReview.endDate}</span>
              </div>
              <div className="history-row">
                <strong>最佳平台</strong>
                <span>{bestPlatformLabel}</span>
              </div>
            </div>
          </Panel>
        </details>
      </section>
      <aside className="review-sidebar">
        <Panel title="下轮行动项" eyebrow="行动安排" action={<span className="muted">已完成 {completedActions}</span>}>
          <div className="action-priority-board">
            {groupedActions.map((group, index) => {
              const shouldOpen = group.priority === "high" || group.items.some((item) => item.status === "doing") || index === 0;
              const visibleGroupItems = group.items.slice(0, 4);
              return (
                <details className={`action-priority-group priority-${group.priority}`} key={group.priority} open={shouldOpen}>
                  <summary>
                    <span>
                      <strong>{priorityLabels[group.priority]}</strong>
                      <small>{group.activeCount} 待推进 · {group.doneCount} 已完成</small>
                    </span>
                    <i>{group.items.length}</i>
                  </summary>
                  <div className="action-list">
                    {visibleGroupItems.map((item) => (
                      <div className="action-row" data-action-item-id={item.id} key={item.id}>
                        <div className="action-row-top">
                          <StatusBadge status={item.status} />
                          <span className={`priority-dot priority-${item.priority}`}>{priorityLabels[item.priority]}</span>
                        </div>
                        <div className="action-row-body">
                          <strong>{item.title}</strong>
                          <small>{item.nextAction ?? "等待推进"}</small>
                          <p className="muted">{actionStatusLabels[item.status]} · {formatDateTime(item.updatedAt)} · {item.relatedType ? `关联${evidenceLabel(item.relatedType)}` : "未绑定具体证据"}</p>
                          <div className="inline-stack action-buttons">
                            {actionStatusFlow.map((status) => (
                              <Button className="action-status-button" key={status} onClick={() => onActionStatus?.(item, status)} variant={item.status === status ? "secondary" : "ghost"}>
                                {actionStatusLabels[status]}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {group.items.length > visibleGroupItems.length && <p className="muted">已折叠 {group.items.length - visibleGroupItems.length} 条同优先级行动，下一轮再做完整看板。</p>}
                  </div>
                </details>
              );
            })}
            {operatorActionItems.length === 0 && <p className="muted">暂无行动项，保存{periodLabel(period)}后会生成可推进动作。</p>}
            {operatorActionItems.length > uniqueActionCount && <p className="muted">已合并重复行动项：{operatorActionItems.length} 条原始记录 到 {uniqueActionCount} 条可管理动作。</p>}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
