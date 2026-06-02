import type { DashboardSnapshot, Platform } from "../../types";
import { formatNumber, formatPercent } from "../foundations/format";
import { platformLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { Panel } from "../primitives/Panel";

function platformViews(snapshot: DashboardSnapshot) {
  const totals = new Map<Platform, number>();
  for (const metric of snapshot.metrics) totals.set(metric.platform, (totals.get(metric.platform) ?? 0) + metric.views);
  for (const metric of snapshot.metricSnapshots) totals.set(metric.platform, (totals.get(metric.platform) ?? 0) + metric.views);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function MetricDashboardGrid({ snapshot }: { snapshot: DashboardSnapshot }) {
  const totalViews = snapshot.weeklyReview.metrics.totalViews + snapshot.metricSnapshots.reduce((total, item) => total + item.views, 0);
  const engagement = snapshot.weeklyReview.metrics.totalEngagement;
  const engagementRate = totalViews > 0 ? (engagement / totalViews) * 100 : 0;
  const platformRows = platformViews(snapshot);
  const maxPlatform = Math.max(...platformRows.map(([, value]) => value), 1);
  const publishedCount = snapshot.platformVersions.filter((item) => item.status === "published").length;
  return (
    <div className="metabase-grid" data-ui-boundary="analytics-only">
      <p className="dashboard-insight">本月内容表现稳定，曝光增长主要来自短视频平台，线索转化集中在 AI 短片主题。</p>
      <Panel className="chart-card chart-wide" title="曝光与互动趋势" eyebrow="Trend">
        <div className="combo-chart" aria-label="曝光与互动趋势图">
          {[42, 68, 56, 83, 72, 96].map((height, index) => (
            <div className="combo-point" key={index}>
              <span className="combo-bar" style={{ height: `${height}%` }} />
              <i style={{ bottom: `${Math.min(height + 10, 92)}%` }} />
              <small>W{index + 1}</small>
            </div>
          ))}
        </div>
      </Panel>
      <div className="kpi-stack">
        <Panel title="本月总曝光" eyebrow="KPI">
          <strong className="mega-number">{formatNumber(totalViews)}</strong>
          <p className="delta-positive">↑ 2.39% vs. previous period</p>
        </Panel>
        <Panel title="发布目标完成度" eyebrow="Goal">
          <div className="goal-bar"><span style={{ width: `${Math.min((publishedCount / 12) * 100, 100)}%` }} /></div>
          <p className="muted">{publishedCount}/12 个平台版本已发布</p>
        </Panel>
      </div>
      <Panel title="平台曝光占比" eyebrow="Share">
        <div className="donut-layout">
          <div className="donut"><strong>{formatNumber(totalViews)}</strong><span>Total</span></div>
          <div className="legend-list">
            {platformRows.slice(0, 5).map(([platform, value]) => (
              <div className="legend-row" key={platform}>
                <PlatformBadge platform={platform} />
                <span>{formatPercent(totalViews > 0 ? (value / totalViews) * 100 : 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="平台互动对比" eyebrow="Deeper Dive">
        <div className="stacked-bars">
          {platformRows.slice(0, 5).map(([platform, value]) => (
            <div className="stack-row" key={platform}>
              <span>{platformLabels[platform]}</span>
              <i style={{ width: `${Math.max((value / maxPlatform) * 100, 8)}%` }} />
              <strong>{formatNumber(value)}</strong>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="chart-table" title="内容表现排行" eyebrow="Ranking">
        <div className="table-wrap">
          <table className="sm-table">
            <thead><tr><th>内容</th><th>平台</th><th>曝光</th><th>互动率</th><th>判断</th></tr></thead>
            <tbody>
              {snapshot.contents.slice(0, 8).map((content) => {
                const metric = snapshot.metrics.find((item) => item.contentId === content.id);
                return (
                  <tr key={content.id}>
                    <td><strong>{content.title}</strong><small>{content.topic}</small></td>
                    <td><PlatformBadge platform={content.platform} /></td>
                    <td>{formatNumber(metric?.views ?? 0)}</td>
                    <td>{formatPercent(metric && metric.views ? ((metric.likes + metric.comments + metric.saves + metric.shares) / metric.views) * 100 : 0)}</td>
                    <td>{metric && metric.views > 1000 ? "可拆二创" : "继续观察"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
