import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { MetricDashboardGrid } from "../patterns/MetricDashboardGrid";
import { Button } from "../primitives/Button";

export function DashboardPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <AppShell active="/dashboard">
      <PageHeader
        eyebrow="Metabase inspired"
        title="数据看板"
        description="只做指标探索：洞察句、主趋势图、KPI、目标进度、平台占比、内容排行。"
        actions={<Button>导出</Button>}
      />
      <MetricDashboardGrid snapshot={snapshot} />
    </AppShell>
  );
}
