import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { PublishCalendar, PlatformVersionInspector } from "../patterns/PublishCalendar";
import { Button } from "../primitives/Button";
import { Tabs } from "../primitives/Tabs";

export function CalendarPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const selected = snapshot.platformVersions.find((item) => item.status === "blocked") ?? snapshot.platformVersions[0];
  return (
    <AppShell active="/calendar">
      <PageHeader
        eyebrow="Postiz / Mixpost inspired"
        title="发布日历"
        description="只管理排期、平台版本状态、阻塞原因和发布检查，不混入导入或复盘工作流。"
        actions={<Button variant="primary">新建排期</Button>}
      />
      <div className="filter-row">
        <Tabs activeId="week" items={[{ id: "week", label: "本周" }, { id: "month", label: "本月" }]} />
        <div className="inline-stack">
          {(["douyin", "xiaohongshu", "wechat", "video_account", "bilibili"] as const).map((platform) => <PlatformBadge platform={platform} key={platform} />)}
        </div>
      </div>
      <div className="calendar-layout">
        <PublishCalendar items={snapshot.calendarItems} />
        <PlatformVersionInspector version={selected} />
      </div>
    </AppShell>
  );
}
