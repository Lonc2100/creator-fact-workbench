import type { DashboardSnapshot, ReviewActionItem, SavedReview } from "../../types";
import { formatNumber } from "../foundations/format";
import { actionStatusLabels } from "../foundations/labels";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

export function EvidenceReviewReport({
  snapshot,
  period,
  onActionStatus
}: {
  snapshot: DashboardSnapshot;
  period: "weekly" | "monthly";
  onActionStatus?: (item: ReviewActionItem, status: ReviewActionItem["status"]) => void;
}) {
  const review: SavedReview | undefined = snapshot.savedReviews.find((item) => item.period === period) ?? snapshot.savedReviews[0];
  const liveReview = period === "weekly" ? snapshot.weeklyReview : snapshot.monthlyReview;
  const report = review?.period === period ? review.markdown : liveReview.markdown;
  return (
    <div className="review-layout" data-ui-boundary="review-only">
      <Panel className="review-report" title={period === "weekly" ? "周复盘报告" : "月复盘报告"} eyebrow="Evidence Report">
        <div className="review-metrics">
          <span>总曝光 <strong>{formatNumber(liveReview.metrics.totalViews)}</strong></span>
          <span>总互动 <strong>{formatNumber(liveReview.metrics.totalEngagement)}</strong></span>
          <span>内容数 <strong>{liveReview.metrics.contentCount}</strong></span>
        </div>
        <pre>{report}</pre>
        <div className="evidence-list">
          {snapshot.evidenceInsights.slice(0, 4).map((insight) => (
            <article key={insight.id}>
              <strong>{insight.title}</strong>
              <p>{insight.finding}</p>
              <div>
                {insight.evidenceRefs.map((ref) => <span className="evidence-chip" key={`${ref.type}-${ref.id}`}>{ref.type}:{ref.id}</span>)}
              </div>
            </article>
          ))}
        </div>
      </Panel>
      <aside className="review-sidebar">
        <Panel title="自动行动项" eyebrow="Action Items">
          <div className="action-list">
            {snapshot.actionItems.slice(0, 6).map((item) => (
              <div className="action-row" data-action-item-id={item.id} key={item.id}>
                <StatusBadge status={item.status} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{actionStatusLabels[item.status]} · {item.nextAction ?? "等待推进"}</small>
                  <div className="inline-stack action-buttons">
                    <Button onClick={() => onActionStatus?.(item, "doing")} variant="ghost">进行中</Button>
                    <Button onClick={() => onActionStatus?.(item, "done")} variant="ghost">完成</Button>
                    <Button onClick={() => onActionStatus?.(item, "dropped")} variant="ghost">放弃</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="复盘历史" eyebrow="History">
          <div className="history-list">
            {snapshot.savedReviews.slice(0, 5).map((item) => (
              <div className="history-row" key={item.id}>
                <strong>{item.period === "weekly" ? "周复盘" : "月复盘"}</strong>
                <span>{item.startDate} - {item.endDate}</span>
              </div>
            ))}
            {snapshot.savedReviews.length === 0 && <p className="muted">尚未保存历史复盘，当前展示实时周复盘。</p>}
          </div>
        </Panel>
      </aside>
    </div>
  );
}
