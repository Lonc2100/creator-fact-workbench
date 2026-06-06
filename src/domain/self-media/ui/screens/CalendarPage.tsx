"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConfirmPlatformVersionPublishRequest, ContentWorkbenchSnapshot, DashboardSnapshot, Platform, PlatformVersionPatchRequest, PlatformVersionStatus, PublishQueueItem } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { cx } from "../foundations/cx";
import { formatDateTime } from "../foundations/format";
import { platformVersionStatusLabels } from "../foundations/labels";
import { PublishCalendar, PlatformVersionInspector, type PendingScheduleDraftItem } from "../patterns/PublishCalendar";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";
import { Tabs } from "../primitives/Tabs";

type CalendarScope = "operating" | "all_local";

const operatingPlatformFilters: Array<Platform | "all"> = ["all", "douyin", "xiaohongshu", "video_account", "bilibili"];
const diagnosticPlatformFilters: Array<Platform | "all"> = ["all", "douyin", "xiaohongshu", "wechat", "video_account", "bilibili"];
const operatingStatusFilters: Array<PlatformVersionStatus | "all"> = ["all", "needs_review", "scheduled", "published", "blocked", "failed"];
const diagnosticStatusFilters: Array<PlatformVersionStatus | "all"> = ["all", "draft", "needs_review", "scheduled", "published", "blocked", "failed"];
const ledgerStatusFilters: Array<DashboardSnapshot["publishRecords"][number]["status"] | "all"> = ["all", "submitted_review", "published", "failed", "blocked", "confirmed"];
const pendingVersionStatuses = new Set<PlatformVersionStatus>(["draft", "needs_review"]);
const pendingQueueStatuses = new Set<PublishQueueItem["status"]>(["draft", "needs_review", "queued"]);
const defaultSchedulingOriginKinds = new Set<ContentWorkbenchSnapshot["contentRows"][number]["originKind"]>(["trusted_creator_center", "local_draft", "action_item_generated", "idea_converted"]);
const publishRecordStatusLabels: Record<DashboardSnapshot["publishRecords"][number]["status"], string> = {
  submitted_review: "已提交审核",
  published: "已发布",
  failed: "发布失败",
  blocked: "发布阻塞",
  confirmed: "已确认"
};

function confirmationSourceLabel(value?: DashboardSnapshot["publishRecords"][number]["confirmationSource"]) {
  if (value === "provider") return "平台回执";
  if (value === "import") return "导入确认";
  return "人工确认";
}

function mondayOf(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function anchorDateForItems(items: DashboardSnapshot["calendarItems"]) {
  if (!items.length) return new Date();
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = dateKey(new Date(item.scheduledAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const bestDate = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0];
  return bestDate ? new Date(`${bestDate}T00:00:00`) : new Date(items[0].scheduledAt);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function rangeLabel(items: DashboardSnapshot["calendarItems"], view: "week" | "month", preferredAnchor?: Date) {
  const anchor = preferredAnchor ?? anchorDateForItems(items);
  if (view === "month") return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`;
  const start = mondayOf(anchor);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function platformChipClass(active: boolean) {
  return cx(
    "calendar-platform-filter",
    active && "is-active"
  );
}

function dateInputValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function realScheduleTime(version?: DashboardSnapshot["platformVersions"][number], record?: DashboardSnapshot["publishRecords"][number]) {
  return version?.scheduledAt ?? version?.publishedAt ?? record?.happenedAt;
}

function isOperatingPlatform(platform: Platform) {
  return platform === "douyin" || platform === "xiaohongshu" || platform === "video_account" || platform === "bilibili";
}

function isDiagnosticCalendarText(value: string) {
  return /(^|[\s:/._-])(smoke|demo|fixture|debug)([\s:/._-]|$)|烟测|浏览器烟测/i.test(value);
}

function isDefaultSchedulingRow(
  row: ContentWorkbenchSnapshot["contentRows"][number] | undefined,
  content: ContentWorkbenchSnapshot["contents"][number] | undefined,
  version: ContentWorkbenchSnapshot["platformVersions"][number]
) {
  if (!row || !content) return false;
  if (!isOperatingPlatform(version.platform)) return false;
  if (!defaultSchedulingOriginKinds.has(row.originKind)) return false;
  if (row.originKind === "trusted_creator_center" && content.userExcludedFromTrustedScope) return false;
  if (row.originKind !== "trusted_creator_center" && isDiagnosticCalendarText(`${content.id} ${content.title} ${content.notes ?? ""} ${version.id} ${version.title}`)) return false;
  return true;
}

function isOperatingCalendarItem(
  item: DashboardSnapshot["calendarItems"][number],
  version: DashboardSnapshot["platformVersions"][number] | undefined,
  content: DashboardSnapshot["contents"][number] | undefined,
  row?: ContentWorkbenchSnapshot["contentRows"][number]
) {
  if (!content || !version) return false;
  if (!isOperatingPlatform(item.platform)) return false;
  if (!isDefaultSchedulingRow(row, content, version)) return false;
  if (!realScheduleTime(version)) return false;
  if (item.status === "draft") return false;
  if (item.status === "needs_review") return Boolean(version.scheduledAt);
  return item.status === "scheduled" || item.status === "published" || item.status === "failed" || item.status === "blocked";
}

function itemMatchesQuery(title: string | undefined, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (title ?? "").toLowerCase().includes(normalized);
}

function pendingScheduleSortKey(item: PendingScheduleDraftItem) {
  if (item.status === "needs_review") return 0;
  if (item.status === "draft") return 1;
  return 2;
}

function PublishLedgerPanel({
  snapshot,
  platform,
  status,
  date,
  scope,
  onPlatform,
  onStatus,
  onDate,
  onScope
}: {
  snapshot: DashboardSnapshot;
  platform: Platform | "all";
  status: DashboardSnapshot["publishRecords"][number]["status"] | "all";
  date: string;
  scope: CalendarScope;
  onPlatform: (platform: Platform | "all") => void;
  onStatus: (status: DashboardSnapshot["publishRecords"][number]["status"] | "all") => void;
  onDate: (date: string) => void;
  onScope: (scope: CalendarScope) => void;
}) {
  const contentById = new Map(snapshot.contents.map((content) => [content.id, content]));
  const versionById = new Map(snapshot.platformVersions.map((version) => [version.id, version]));
  const allRows = snapshot.publishRecords
    .map((record) => {
      const version = versionById.get(record.platformVersionId);
      const content = contentById.get(record.contentId) ?? (version ? contentById.get(version.contentId) : undefined);
      const publishedAt = version?.publishedAt ?? record.happenedAt;
      return {
        record,
        version,
        content,
        scheduledAt: version?.scheduledAt,
        publishedAt,
        dateKey: dateInputValue(record.happenedAt ?? publishedAt)
      };
    })
    .filter((row) => scope === "all_local" || (Boolean(row.content) && isOperatingPlatform(row.record.platform) && Boolean(realScheduleTime(row.version, row.record))))
    .filter((row) => platform === "all" || row.record.platform === platform)
    .filter((row) => status === "all" || row.record.status === status)
    .filter((row) => !date || row.dateKey === date)
    .sort((a, b) => new Date(b.record.happenedAt).getTime() - new Date(a.record.happenedAt).getTime());
  const rows = allRows;
  const platformFilters = scope === "all_local" ? diagnosticPlatformFilters : operatingPlatformFilters;

  return (
    <Panel
      title="发布记录台账"
      eyebrow="本地人工确认记录"
      action={<span className="sm-badge sm-badge-info">{scope === "all_local" ? `${rows.length}/${snapshot.publishRecords.length}` : rows.length} 条记录</span>}
    >
      <div className="calendar-toolbar publish-ledger-toolbar" data-testid="publish-ledger-filters">
        <label className="calendar-status-filter">
          <span>台账范围</span>
          <select className="sm-input calendar-status-select" data-testid="publish-ledger-scope-filter" value={scope} onChange={(event) => onScope(event.target.value as CalendarScope)}>
            <option value="operating">默认运营台账</option>
            <option value="all_local">全部记录/诊断</option>
          </select>
        </label>
        <div className="calendar-platform-filter-group" aria-label="发布记录平台筛选">
          {platformFilters.map((item) => (
            <button className={platformChipClass(platform === item)} key={item} onClick={() => onPlatform(item)} type="button">
              {item === "all" ? "全部" : <PlatformBadge platform={item} compact />}
            </button>
          ))}
        </div>
        <label className="calendar-status-filter">
          <span>结果</span>
          <select className="sm-input calendar-status-select" data-testid="publish-ledger-status-filter" value={status} onChange={(event) => onStatus(event.target.value as DashboardSnapshot["publishRecords"][number]["status"] | "all")}>
            {ledgerStatusFilters.map((item) => <option key={item} value={item}>{item === "all" ? "全部结果" : publishRecordStatusLabels[item]}</option>)}
          </select>
        </label>
        <label className="calendar-status-filter">
          <span>日期</span>
          <input className="sm-input calendar-status-select" data-testid="publish-ledger-date-filter" type="date" value={date} onChange={(event) => onDate(event.target.value)} />
        </label>
        <Button disabled={!date && platform === "all" && status === "all"} onClick={() => { onPlatform("all"); onStatus("all"); onDate(""); }} variant="secondary">清空</Button>
      </div>
      <div className="table-wrap" data-testid="publish-ledger">
        <table className="sm-table">
          <thead>
            <tr>
              <th>发布记录</th>
              <th>内容</th>
              <th>平台</th>
              <th>排期时间</th>
              <th>发布时间</th>
              <th>确认来源</th>
              <th>结果</th>
              <th>备注/原因</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr data-publish-record-id={row.record.id} key={row.record.id}>
                <td>
                  <strong>{row.version?.title ?? "未找到排期稿件"}</strong>
                  <small>{publishRecordStatusLabels[row.record.status]}</small>
                </td>
                <td>
                  <strong>{row.content?.title ?? "诊断记录"}</strong>
                  <small>{row.content ? "运营内容" : "未进入默认运营视图"}</small>
                </td>
                <td><PlatformBadge compact platform={row.record.platform} /></td>
                <td>{formatDateTime(row.scheduledAt)}</td>
                <td>{formatDateTime(row.publishedAt)}</td>
                <td>{confirmationSourceLabel(row.record.confirmationSource)}</td>
                <td><span className={row.record.status === "published" ? "sm-badge sm-badge-success" : "sm-badge sm-badge-warning"}>{publishRecordStatusLabels[row.record.status]}</span></td>
                <td>{row.version?.failureReason ?? row.record.note ?? "无"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8}>暂无符合筛选条件的发布记录。发布成功/失败只能通过人工确认写入。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">台账只记录人工确认结果；平台指标仍以创作者中心数据为准。</p>
    </Panel>
  );
}

export function CalendarPage({ snapshot, workbench }: { snapshot: DashboardSnapshot; workbench: ContentWorkbenchSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [currentWorkbench, setCurrentWorkbench] = useState(workbench);
  const [selectedId, setSelectedId] = useState(() => {
    const requested = typeof window === "undefined" ? undefined : new URLSearchParams(window.location.search).get("versionId") ?? undefined;
    return workbench.platformVersions.find((item) => item.id === requested)?.id;
  });
  const [view, setView] = useState<"week" | "month">("week");
  const [scope, setScope] = useState<CalendarScope>("operating");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [status, setStatus] = useState<PlatformVersionStatus | "all">("all");
  const [ledgerScope, setLedgerScope] = useState<CalendarScope>("operating");
  const [ledgerPlatform, setLedgerPlatform] = useState<Platform | "all">("all");
  const [ledgerStatus, setLedgerStatus] = useState<DashboardSnapshot["publishRecords"][number]["status"] | "all">("all");
  const [ledgerDate, setLedgerDate] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [message, setMessage] = useState("");
  const versionById = useMemo(() => new Map(currentWorkbench.platformVersions.map((version) => [version.id, version])), [currentWorkbench.platformVersions]);
  const contentById = useMemo(() => new Map(currentWorkbench.contents.map((content) => [content.id, content])), [currentWorkbench.contents]);
  const rowByContentId = useMemo(() => new Map(currentWorkbench.contentRows.map((row) => [row.content.id, row])), [currentWorkbench.contentRows]);
  const visibleItems = useMemo(
    () => current.calendarItems
      .filter((item) => {
        const version = versionById.get(item.platformVersionId);
        const content = contentById.get(item.contentId) ?? (version ? contentById.get(version.contentId) : undefined);
        const row = rowByContentId.get(item.contentId) ?? (version ? rowByContentId.get(version.contentId) : undefined);
        return scope === "all_local" || isOperatingCalendarItem(item, version, content, row);
      })
      .filter((item) => (platform === "all" || item.platform === platform) && (status === "all" || item.status === status))
      .filter((item) => {
        const version = versionById.get(item.platformVersionId);
        const content = contentById.get(item.contentId) ?? (version ? contentById.get(version.contentId) : undefined);
        return itemMatchesQuery(`${item.title} ${content?.title ?? ""}`, query);
      })
      .map((item) => {
        const content = contentById.get(item.contentId);
        return content ? { ...item, title: content.title } : item;
      }),
    [contentById, current.calendarItems, platform, query, rowByContentId, scope, status, versionById]
  );
  const visibleVersionIds = useMemo(() => new Set(visibleItems.map((item) => item.platformVersionId)), [visibleItems]);
  const pendingSchedulingItems = useMemo(() => {
    const queueByContentPlatform = new Map(currentWorkbench.queue.map((item) => [`${item.contentId}:${item.platform}`, item]));
    return currentWorkbench.contentRows
      .flatMap((row) => row.platformVersions.map((version): PendingScheduleDraftItem | null => {
        const content = row.content;
        const queueItem = row.queueItems.find((item) => item.platform === version.platform) ?? queueByContentPlatform.get(`${version.contentId}:${version.platform}`);
        const isPendingVersion = pendingVersionStatuses.has(version.status);
        const isPendingQueue = queueItem ? pendingQueueStatuses.has(queueItem.status) : false;
        if (!isDefaultSchedulingRow(row, content, version)) return null;
        if (visibleVersionIds.has(version.id)) return null;
        if (!isPendingVersion && !isPendingQueue) return null;
        return {
          id: `pending-${version.id}`,
          platformVersionId: version.id,
          contentId: version.contentId,
          platform: version.platform,
          status: version.status,
          scheduledAt: version.scheduledAt ?? queueItem?.scheduledAt ?? new Date().toISOString(),
          title: version.title || content.title,
          contentTitle: content.title,
          originLabel: row.originLabel,
          nextAction: version.nextAction ?? queueItem?.nextAction,
          blockers: version.failureReason ? [version.failureReason] : undefined,
          checklistDone: Object.values(version.checklist).filter(Boolean).length,
          checklistTotal: Object.keys(version.checklist).length,
          queueId: queueItem?.id
        };
      }))
      .filter((item): item is PendingScheduleDraftItem => Boolean(item))
      .filter((item) => (platform === "all" || item.platform === platform) && (status === "all" || item.status === status))
      .filter((item) => itemMatchesQuery(`${item.title} ${item.contentTitle ?? ""}`, query))
      .sort((a, b) => pendingScheduleSortKey(a) - pendingScheduleSortKey(b) || a.title.localeCompare(b.title));
  }, [currentWorkbench.contentRows, currentWorkbench.queue, platform, query, status, visibleVersionIds]);
  const selectableVersionIds = useMemo(() => new Set([...visibleVersionIds, ...pendingSchedulingItems.map((item) => item.platformVersionId)]), [pendingSchedulingItems, visibleVersionIds]);
  const selected = currentWorkbench.platformVersions.find((item) => item.id === selectedId && selectableVersionIds.has(item.id)) ?? currentWorkbench.platformVersions.find((item) => selectableVersionIds.has(item.id));
  const selectedContent = selected ? contentById.get(selected.contentId) : undefined;
  const selectedContentVersions = selected
    ? currentWorkbench.platformVersions
      .filter((item) => item.contentId === selected.contentId)
      .filter((item) => scope === "all_local" || isOperatingPlatform(item.platform))
    : [];
  const selectedAnchorDate = selected?.scheduledAt ? new Date(selected.scheduledAt) : undefined;
  const calendarAnchorDate = selectedAnchorDate && !Number.isNaN(selectedAnchorDate.getTime()) ? selectedAnchorDate : undefined;
  const platformFilters = scope === "all_local" ? diagnosticPlatformFilters : operatingPlatformFilters;
  const statusFilters = scope === "all_local" ? diagnosticStatusFilters : operatingStatusFilters;

  async function refreshDashboard() {
    const [dashboardResponse, workbenchResponse] = await Promise.all([
      fetch("/api/self-media/dashboard"),
      fetch("/api/self-media/content-workbench")
    ]);
    setCurrent((await dashboardResponse.json()) as DashboardSnapshot);
    setCurrentWorkbench((await workbenchResponse.json()) as ContentWorkbenchSnapshot);
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
    const version = versionById.get(input.platformVersionId);
    if (!version) return;
    setSelectedId(version.id);
    setInspectorOpen(true);
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

  async function patchVersionStatus(payload: PlatformVersionPatchRequest) {
    setMessage("正在更新平台状态...");
    try {
      await patchVersion(payload);
      setSelectedId(payload.id);
      await refreshDashboard();
      setMessage("平台状态已更新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "平台状态更新失败");
    }
  }

  async function confirmPublish(input: { platformVersionId: string; status: ConfirmPlatformVersionPublishRequest["status"] }) {
    setMessage("正在记录人工发布结果...");
    try {
      const response = await fetch("/api/self-media/content-versions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm_publish",
          platformVersionId: input.platformVersionId,
          status: input.status,
          note: input.status === "submitted_review" ? "日历发布交接包人工记录：已提交官方后台审核。" : input.status === "published" ? "日历人工确认发布" : "日历人工记录发布未成功，需要回到草稿处理。",
          confirmationSource: "manual"
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "发布结果记录失败");
      setSelectedId(result.version.id);
      await refreshDashboard();
      setMessage(input.status === "submitted_review" ? "已记录提交审核；等待平台审核后再回填已发布或失败。" : result.version.status === "published" ? "已记录人工发布确认。" : "已记录发布异常，回到草稿处理下一步。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布结果记录失败");
    }
  }

  async function clearFutureSchedules() {
    if (typeof window !== "undefined" && !window.confirm("只清空未来排期时间和待发布队列，不会删除内容、发布记录或指标快照。确认继续？")) return;
    setMessage("正在清空未来排期...");
    try {
      const response = await fetch("/api/self-media/calendar", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clear_future_schedules" })
      });
      const result = await response.json() as { clearedPlatformVersionCount?: number; clearedQueueCount?: number; preservedPublishRecordCount?: number; preservedMetricSnapshotCount?: number; errorMessage?: string };
      if (!response.ok) throw new Error(result.errorMessage ?? "清空未来排期失败");
      await refreshDashboard();
      setMessage(`已清空未来排期：${result.clearedPlatformVersionCount ?? 0} 个平台稿件、${result.clearedQueueCount ?? 0} 个队列项；历史发布记录 ${result.preservedPublishRecordCount ?? 0} 条和指标快照 ${result.preservedMetricSnapshotCount ?? 0} 条保留。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "清空未来排期失败");
    }
  }

  return (
    <AppShell active="/calendar">
      <PageHeader
        eyebrow="发布管理"
        title="发布日历"
        description="默认只显示真实可行动的排期稿件和人工发布台账；更多历史记录可在筛选中查看。"
      />
      <span className="sr-only">平台版本详情</span>
      <div className="calendar-toolbar">
        <label className="calendar-search">
          <Search aria-hidden="true" size={17} />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="搜索排期标题" type="search" value={query} />
        </label>
        <Tabs className="calendar-view-tabs" activeId={view} items={[{ id: "week", label: "本周" }, { id: "month", label: "本月" }]} onSelect={(id) => setView(id === "month" ? "month" : "week")} />
        <div className="calendar-range-control" aria-label="当前日期范围">
          <button disabled type="button" aria-label="上一个周期"><ChevronLeft aria-hidden="true" size={16} /></button>
          <span><CalendarDays aria-hidden="true" size={15} />{rangeLabel(visibleItems, view, calendarAnchorDate)}</span>
          <button disabled type="button" aria-label="下一个周期"><ChevronRight aria-hidden="true" size={16} /></button>
        </div>
        <label className="calendar-status-filter">
          <span>显示范围</span>
          <select className="sm-input calendar-status-select" data-testid="calendar-scope-filter" value={scope} onChange={(event) => { setScope(event.target.value as CalendarScope); setPlatform("all"); setStatus("all"); }}>
            <option value="operating">默认运营排期</option>
            <option value="all_local">全部本地/诊断</option>
          </select>
        </label>
        <div className="calendar-platform-filter-group" aria-label="平台筛选">
          {platformFilters.map((item) => (
            <button className={platformChipClass(platform === item)} key={item} onClick={() => setPlatform(item)} type="button">
              {item === "all" ? "全部" : <PlatformBadge platform={item} compact />}
            </button>
          ))}
        </div>
        <label className="calendar-status-filter">
          <span>状态</span>
          <select className="sm-input calendar-status-select" value={status} onChange={(event) => setStatus(event.target.value as PlatformVersionStatus | "all")}>
            {statusFilters.map((item) => <option key={item} value={item}>{item === "all" ? "全部状态" : platformVersionStatusLabels[item]}</option>)}
          </select>
        </label>
        <a className="sm-button sm-button-primary calendar-new-button" href="/content#new-video">
          <Plus aria-hidden="true" size={15} />计划新视频 / 新增排期
        </a>
        <Button data-testid="calendar-clear-future-schedules" onClick={clearFutureSchedules} variant="danger">
          <Trash2 aria-hidden="true" size={15} />清空未来排期
        </Button>
      </div>
      {message && <p className="operation-message calendar-operation-message" data-testid="calendar-operation-message">{message}</p>}
      <div className="calendar-layout">
        <PublishCalendar
          anchorDate={calendarAnchorDate}
          items={visibleItems}
          onReschedule={scheduleVersion}
          onSelect={(id) => {
            setSelectedId(id);
            setInspectorOpen(true);
          }}
          pendingItems={scope === "all_local" ? [] : pendingSchedulingItems}
          showEmptySlots={scope === "all_local"}
          view={view}
        />
      </div>
      <div id="publish-ledger">
        <PublishLedgerPanel
          date={ledgerDate}
          scope={ledgerScope}
          onDate={setLedgerDate}
          onPlatform={setLedgerPlatform}
          onScope={(nextScope) => { setLedgerScope(nextScope); setLedgerPlatform("all"); }}
          onStatus={setLedgerStatus}
          platform={ledgerPlatform}
          snapshot={current}
          status={ledgerStatus}
        />
      </div>
      {inspectorOpen && (
        <div className="calendar-inspector-shell" role="dialog" aria-label="平台版本详情">
          <button className="calendar-inspector-close" onClick={() => setInspectorOpen(false)} type="button" aria-label="关闭平台版本详情">
            <X aria-hidden="true" size={18} />
          </button>
          <PlatformVersionInspector
            contentTitle={selectedContent?.title}
            handoffPackages={current.publishToMetricsWorkbench.publishHandoffPackages}
            onConfirmPublish={confirmPublish}
            onReschedule={scheduleVersion}
            onStatusPatch={patchVersionStatus}
            version={selected}
            versions={selectedContentVersions}
          />
        </div>
      )}
    </AppShell>
  );
}
