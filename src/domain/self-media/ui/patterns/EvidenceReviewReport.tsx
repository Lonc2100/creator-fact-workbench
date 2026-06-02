import type { DashboardSnapshot, SavedReview } from "../../types";
import { formatNumber } from "../foundations/format";
import { actionStatusLabels } from "../foundations/labels";
import { StatusBadge } from "../components/StatusBadge";
import { Panel } from "../primitives/Panel";

export function EvidenceReviewReport({ snapshot }: { snapshot: DashboardSnapshot }) {
  const review: SavedReview | undefined = snapshot.savedReviews[0];
  const report = review?.markdown ?? snapshot.weeklyReview.markdown;
  return (
    <div className="review-layout" data-ui-boundary="review-only">
      <Panel className="review-report" title="周复盘报告" eyebrow="Evidence Report">
        <div className="review-metrics">
          <span>总曝光 <strong>{formatNumber(snapshot.weeklyReview.metrics.totalViews)}</strong></span>
          <span>总互动 <strong>{formatNumber(snapshot.weeklyReview.metrics.totalEngagement)}</strong></span>
          <span>内容数 <strong>{snapshot.weeklyReview.metrics.contentCount}</strong></span>
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
              <div className="action-row" key={item.id}>
                <StatusBadge status={item.status} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{actionStatusLabels[item.status]} · {item.nextAction ?? "等待推进"}</small>
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
