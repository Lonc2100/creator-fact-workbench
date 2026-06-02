"use client";

import { useMemo, useState } from "react";
import type { DashboardSnapshot, Platform, PlatformVersionPatchRequest, PlatformVersionStatus } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { PublishCalendar, PlatformVersionInspector } from "../patterns/PublishCalendar";
import { Button } from "../primitives/Button";
import { SelectInput } from "../primitives/Form";
import { Tabs } from "../primitives/Tabs";

export function CalendarPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [selectedId, setSelectedId] = useState(snapshot.platformVersions.find((item) => item.status === "blocked")?.id ?? snapshot.platformVersions[0]?.id);
  const [view, setView] = useState("week");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [status, setStatus] = useState<PlatformVersionStatus | "all">("all");
  const [message, setMessage] = useState("拖拽卡片到日期格即可调整排期。");
  const selected = current.platformVersions.find((item) => item.id === selectedId) ?? current.platformVersions[0];
  const visibleItems = useMemo(
    () => current.calendarItems.filter((item) => (platform === "all" || item.platform === platform) && (status === "all" || item.status === status)),
    [current.calendarItems, platform, status]
  );

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/dashboard");
    setCurrent((await response.json()) as DashboardSnapshot);
  }

  async function patchVersion(payload: PlatformVersionPatchRequest) {
    const response = await fetch("/api/self-media/content-versions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errorMessage ?? "平台版本更新失败");
    return result.version as DashboardSnapshot["platformVersions"][number];
  }

  async function scheduleVersion(input: { platformVersionId: string; scheduledAt: string }) {
    const version = current.platformVersions.find((item) => item.id === input.platformVersionId);
    if (!version) return;
    setSelectedId(version.id);
    setMessage("正在保存拖拽排期...");
    try {
      if (version.status === "published" || version.status === "scheduled") {
        await patchVersion({ id: version.id, scheduledAt: input.scheduledAt });
      } else {
        const needsReview = version.status === "needs_review" ? version : await patchVersion({ id: version.id, status: "needs_review", scheduledAt: input.scheduledAt });
        await patchVersion({ id: needsReview.id, status: "scheduled", scheduledAt: input.scheduledAt });
      }
      await refreshDashboard();
      setMessage("排期已保存，状态已按合法链路推进。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "排期保存失败");
    }
  }

  return (
    <AppShell active="/calendar">
      <PageHeader
        eyebrow="Postiz / Mixpost inspired"
        title="发布日历"
        description="只管理排期、平台版本状态、阻塞原因和发布检查，不混入导入或复盘工作流。"
        actions={<Button variant="primary">新建排期</Button>}
      />
      <div className="filter-row">
        <Tabs activeId={view} items={[{ id: "week", label: "本周" }, { id: "month", label: "本月" }]} onSelect={setView} />
        <div className="inline-stack">
          {(["douyin", "xiaohongshu", "wechat", "video_account", "bilibili"] as const).map((platform) => <PlatformBadge platform={platform} key={platform} />)}
        </div>
        <SelectInput aria-label="平台筛选" value={platform} onChange={(event) => setPlatform(event.target.value as Platform | "all")}>
          <option value="all">全部平台</option>
          <option value="douyin">抖音</option>
          <option value="xiaohongshu">小红书</option>
          <option value="wechat">公众号</option>
          <option value="video_account">视频号</option>
          <option value="bilibili">B站</option>
        </SelectInput>
        <SelectInput aria-label="状态筛选" value={status} onChange={(event) => setStatus(event.target.value as PlatformVersionStatus | "all")}>
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="needs_review">待审核</option>
          <option value="scheduled">已排期</option>
          <option value="published">已发布</option>
          <option value="blocked">阻塞</option>
          <option value="failed">失败</option>
        </SelectInput>
      </div>
      <p className="operation-message" data-testid="calendar-operation-message">{message}</p>
      <div className="calendar-layout">
        <PublishCalendar items={visibleItems} onReschedule={scheduleVersion} onSelect={setSelectedId} view={view === "month" ? "month" : "week"} />
        <PlatformVersionInspector version={selected} />
      </div>
    </AppShell>
  );
}
