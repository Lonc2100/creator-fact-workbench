import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { formatNumber } from "../foundations/format";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

export function OverviewPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const published = snapshot.platformVersions.filter((item) => item.status === "published").length;
  const blocked = snapshot.platformVersions.filter((item) => item.status === "blocked").length;
  return (
    <AppShell active="/">
      <PageHeader
        eyebrow="Self-media UI Harness"
        title="自媒体经营后台"
        description="把内容、发布、数据、复盘和线索拆成清晰页面，用统一 UI Harness 串起来。"
        actions={<Button variant="primary">新建内容</Button>}
      />
      <div className="summary-grid">
        <Panel title="本周总曝光" eyebrow="Views">
          <strong className="mega-number">{formatNumber(snapshot.weeklyReview.metrics.totalViews)}</strong>
          <p className="muted">数据来自内部内容与指标记录。</p>
        </Panel>
        <Panel title="平台版本" eyebrow="Versions">
          <strong className="mega-number">{snapshot.platformVersions.length}</strong>
          <p className="muted">已发布 {published}，阻塞 {blocked}。</p>
        </Panel>
        <Panel title="行动项" eyebrow="Actions">
          <strong className="mega-number">{snapshot.actionItems.length}</strong>
          <p className="muted">复盘沉淀为可推进动作。</p>
        </Panel>
      </div>
      <div className="two-column">
        <Panel title="今日工作入口" eyebrow="Mainline">
          <div className="route-card-grid">
            {[
              ["/calendar", "发布日历", "管理本周排期和平台版本状态"],
              ["/content", "内容管理", "编辑内容与平台版本"],
              ["/import", "数据导入", "preview diff 后写入内部事实源"],
              ["/dashboard", "数据看板", "按 Metabase 逻辑观察趋势"],
              ["/reviews", "周月复盘", "证据化报告与行动项"],
              ["/leads", "线索跟进", "把内容和变现动作接起来"]
            ].map(([href, title, desc]) => (
              <a className="route-card" href={href} key={href}>
                <strong>{title}</strong>
                <span>{desc}</span>
              </a>
            ))}
          </div>
        </Panel>
        <Panel title="最近平台版本" eyebrow="Status">
          <div className="compact-list">
            {snapshot.platformVersions.slice(0, 6).map((version) => (
              <div className="compact-row" key={version.id}>
                <PlatformBadge platform={version.platform} />
                <strong>{version.title}</strong>
                <StatusBadge status={version.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
