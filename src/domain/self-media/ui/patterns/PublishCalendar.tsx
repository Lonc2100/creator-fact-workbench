"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { ConfirmPlatformVersionPublishRequest, ContentPlatformVersion, PublishCalendarItem, PublishHandoffPackage } from "../../types";
import { PlatformBadge, PlatformIcon } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { cx } from "../foundations/cx";
import { formatDateTime, isoFromLocalDateTime, localDateTimeInputValue } from "../foundations/format";
import { platformLabels, platformTone, platformVersionStatusLabels } from "../foundations/labels";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../primitives/Button";

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
type CalendarGridView = "week" | "month";
const baseWeekTimeSlots = [9, 13, 17, 21];
export type PendingScheduleDraftItem = Pick<PublishCalendarItem, "platformVersionId" | "contentId" | "platform" | "status" | "scheduledAt" | "title" | "blockers" | "checklistDone" | "checklistTotal"> & {
  id: string;
  queueId?: string;
  contentTitle?: string;
  originLabel: string;
  nextAction?: string;
};
type CalendarCardGroup = {
  id: string;
  item: PublishCalendarItem;
  items: PublishCalendarItem[];
  platforms: PublishCalendarItem["platform"][];
};

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

function monthGridOf(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = mondayOf(first);
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(start);
    next.setDate(next.getDate() + index);
    return next;
  });
}

function daysForView(view: CalendarGridView, anchor: Date) {
  if (view === "month") return monthGridOf(anchor);
  const start = mondayOf(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(next.getDate() + index);
    return next;
  });
}

function dayLabel(date: Date, index: number, view: CalendarGridView) {
  const weekday = weekDays[index % 7];
  if (view === "month") return `${weekday}`;
  return weekday;
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function displayTitle(rawTitle: string) {
  const withoutIds = rawTitle
    .replace(/^O2\s*/i, "")
    .replace(/[-_：:\s]*\d{10,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/V1\.5/.test(withoutIds)) return "AI短片复盘";
  if (/MediaCrawler/i.test(withoutIds)) return "竞品信号";
  if (/n8n/i.test(withoutIds)) return "自动化回收";
  if (/CSV/.test(withoutIds) && /导入/.test(withoutIds)) return "数据复盘";
  if (/编辑器保存/.test(withoutIds)) return "内容排期稿";
  if (/^选题$/.test(withoutIds) || /^AI选题计划$/.test(withoutIds)) return "AI选题计划";
  return withoutIds || rawTitle;
}

function cardNote(item: PublishCalendarItem) {
  if (item.blockers?.[0]) return item.blockers[0];
  if (item.status === "published") return "已发布，回收数据";
  if (item.status === "scheduled") return "等待发布确认";
  if (item.status === "needs_review") return "标题封面待审";
  if (item.status === "blocked") return "人工处理";
  return "待排期";
}

function scheduledForDate(item: PublishCalendarItem, targetDate: string, targetHour?: number) {
  const original = new Date(item.scheduledAt);
  const hour = targetHour ?? (Number.isNaN(original.getTime()) || original.getHours() === 0 ? 9 : original.getHours());
  const minute = targetHour === undefined && !Number.isNaN(original.getTime()) ? original.getMinutes() : 0;
  const next = new Date(`${targetDate}T00:00:00.000`);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function dropTargetFromEvent(event: DragEndEvent) {
  const data = event.over?.data.current as { date?: string; hour?: number } | undefined;
  if (data?.date) return { date: data.date, hour: data.hour };
  const overId = typeof event.over?.id === "string" ? event.over.id : "";
  const match = overId.match(/^(\d{4}-\d{2}-\d{2})(?:-(\d{1,2}))?$/);
  if (!match) return undefined;
  return { date: match[1], hour: match[2] ? Number(match[2]) : undefined };
}

function timeSlotFor(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 9;
  return date.getHours();
}

function weekTimeSlotsForItems(items: PublishCalendarItem[]) {
  return Array.from(new Set([...baseWeekTimeSlots, ...items.map((item) => timeSlotFor(item.scheduledAt))]))
    .filter((hour) => Number.isFinite(hour) && hour >= 0 && hour <= 23)
    .sort((a, b) => a - b);
}

function formatSlot(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  const normalized = hour <= 12 ? hour : hour - 12;
  return `${normalized}:00 ${suffix}`;
}

function calendarCardGroupKey(item: PublishCalendarItem, view: CalendarGridView) {
  const date = dateKey(new Date(item.scheduledAt));
  const timeBucket = view === "week" ? `:${timeSlotFor(item.scheduledAt)}` : "";
  return `${item.contentId || item.platformVersionId}:${date}${timeBucket}`;
}

function groupCalendarCards(items: PublishCalendarItem[], view: CalendarGridView) {
  const groups = new Map<string, CalendarCardGroup>();
  for (const item of items) {
    const key = calendarCardGroupKey(item, view);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { id: key, item, items: [item], platforms: [item.platform] });
      continue;
    }
    current.items.push(item);
    current.platforms = Array.from(new Set([...current.platforms, item.platform]));
    if (new Date(item.scheduledAt).getTime() < new Date(current.item.scheduledAt).getTime()) {
      current.item = item;
    }
  }
  return [...groups.values()].sort((a, b) => new Date(a.item.scheduledAt).getTime() - new Date(b.item.scheduledAt).getTime());
}

function groupCardNote(group: CalendarCardGroup) {
  const platformCount = group.platforms.length;
  const dateCount = new Set(group.items.map((item) => dateKey(new Date(item.scheduledAt)))).size;
  const timeCount = new Set(group.items.map((item) => timeSlotFor(item.scheduledAt))).size;
  const prefix = platformCount > 1 ? `${platformCount}个平台` : platformLabels[group.item.platform];
  if (dateCount > 1 || timeCount > 1) return `${prefix} · 多时间排期`;
  if (group.items.some((item) => item.status === "failed")) return `${prefix} · 有发布失败`;
  if (group.items.some((item) => item.status === "blocked")) return `${prefix} · 有阻塞待处理`;
  if (group.items.some((item) => item.status === "scheduled")) return `${prefix} · 等待发布确认`;
  if (group.items.some((item) => item.status === "published")) return `${prefix} · 已发布，回收数据`;
  if (group.items.some((item) => item.status === "needs_review")) return `${prefix} · 标题封面待审`;
  return `${prefix} · 待排期`;
}

function anchorDateForItems(items: PublishCalendarItem[]) {
  if (!items.length) return new Date();
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(dateKey(new Date(item.scheduledAt)), (counts.get(dateKey(new Date(item.scheduledAt))) ?? 0) + 1);
  }
  const bestDate = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0];
  return bestDate ? new Date(`${bestDate}T00:00:00.000`) : new Date(items[0].scheduledAt);
}

function DraggableCalendarCard({
  group,
  onSelect
}: {
  group: CalendarCardGroup;
  onSelect?: (platformVersionId: string) => void;
}) {
  const item = group.item;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.platformVersionId, data: { item } });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.62 : 1 } : {};
  const platforms = group.platforms.length ? group.platforms : [item.platform];
  const platformLabel = platforms.map((platform) => platformLabels[platform]).join("、");
  const openDetail = () => onSelect?.(item.platformVersionId);
  return (
    <article
      className={cx("calendar-card", platformTone[item.platform], "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgba(44,39,68,0.38)]")}
      data-calendar-card="true"
      data-content-id={item.contentId}
      data-platform-version-id={item.platformVersionId}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openDetail();
      }}
      ref={setNodeRef}
      role="button"
      style={style}
      tabIndex={0}
    >
      <div className="calendar-card-topline">
        <div className="calendar-card-icons" aria-label={platformLabel}>
          {platforms.slice(0, 4).map((platform) => <PlatformIcon key={`${item.id}-${platform}`} platform={platform} size="sm" />)}
        </div>
        <div className="calendar-card-topline-actions">
          <time>{formatShortTime(item.scheduledAt)}</time>
          <button
            aria-label={`拖拽排期 ${displayTitle(item.title)}`}
            className="calendar-card-drag-handle"
            type="button"
            {...listeners}
            {...attributes}
          >
            <GripVertical aria-hidden="true" size={13} />
          </button>
        </div>
      </div>
      <strong className="calendar-card-title" title={item.title}>{displayTitle(item.title)}</strong>
      <p className="calendar-card-note">{groupCardNote(group)}</p>
    </article>
  );
}

function DraggablePendingScheduleCard({
  item,
  onSelect
}: {
  item: PendingScheduleDraftItem;
  onSelect?: (platformVersionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `pending-${item.platformVersionId}`, data: { item } });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.66 : 1 } : {};
  return (
    <article
      className={cx("calendar-pending-draft-card", platformTone[item.platform])}
      data-testid="calendar-pending-draft-card"
      data-platform-version-id={item.platformVersionId}
      ref={setNodeRef}
      style={style}
    >
      <button className="calendar-pending-drag-handle" type="button" aria-label={`拖拽排期 ${item.title}`} {...listeners} {...attributes}>
        <PlatformIcon platform={item.platform} size="sm" />
        <span>拖入日历</span>
      </button>
      <div>
        <strong title={item.title}>{displayTitle(item.title)}</strong>
        <small>{item.originLabel} · {platformVersionStatusLabels[item.status]}</small>
      </div>
      <p>{item.nextAction ?? cardNote(item)}</p>
      <Button data-testid="calendar-open-schedule-editor" onClick={() => onSelect?.(item.platformVersionId)} variant="secondary">进入排期编辑</Button>
    </article>
  );
}

function PendingScheduleQueue({
  items,
  onSelect
}: {
  items: PendingScheduleDraftItem[];
  onSelect?: (platformVersionId: string) => void;
}) {
  return (
    <aside className="calendar-pending-queue" data-testid="calendar-pending-schedule-queue" aria-label="待排内容">
      <header>
        <div>
          <span className="sm-eyebrow">真实待排内容</span>
          <strong>{items.length > 0 ? `${items.length} 个稿件待排` : "暂无待排稿件"}</strong>
        </div>
        <small>拖入日历或打开排期编辑；不会生成发布记录。</small>
      </header>
      {items.length > 0 ? (
        <div className="calendar-pending-stack">
          {items.map((item) => <DraggablePendingScheduleCard item={item} key={item.id} onSelect={onSelect} />)}
        </div>
      ) : (
        <p className="muted">默认队列只展示用户草稿、行动生成草稿和待审核稿件。</p>
      )}
    </aside>
  );
}

function DroppableCalendarDay({
  date,
  groups,
  isToday,
  isOutsideMonth,
  view,
  index,
  onSelect,
  onCreateAt,
  showEmptySlots
}: {
  date: string;
  groups: CalendarCardGroup[];
  isToday: boolean;
  isOutsideMonth: boolean;
  view: CalendarGridView;
  index: number;
  onSelect?: (platformVersionId: string) => void;
  onCreateAt?: (scheduledAt: string) => void;
  showEmptySlots: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date, data: { date } });
  const day = new Date(`${date}T00:00:00.000`);
  const maxVisibleItems = view === "month" ? 2 : 2;
  return (
    <section
      className={cx(
        "calendar-day-column",
        isOver && "is-over",
        isToday && "is-today",
        isOutsideMonth && "is-outside-month"
      )}
      data-calendar-date={date}
      ref={setNodeRef}
    >
      <header className="calendar-day-head">
        <span>{dayLabel(day, index, view)}</span>
        <strong>{formatShortDate(day)}</strong>
        {isToday && <em>今天</em>}
      </header>
      <div className="calendar-day-stack">
        {groups.slice(0, maxVisibleItems).map((group) => (
          <DraggableCalendarCard group={group} key={group.id} onSelect={onSelect} />
        ))}
        {groups.length > maxVisibleItems && <p className="calendar-overflow-note">更多排期</p>}
        {groups.length === 0 && showEmptySlots && <button aria-label={`新增排期 ${date} 09:00`} className="calendar-empty-slot" data-calendar-empty={date} data-calendar-empty-hour={9} onClick={() => onCreateAt?.(scheduledForDate({ scheduledAt: `${date}T09:00:00.000`, platformVersionId: "", contentId: "", platform: "douyin", status: "scheduled", title: "" } as PublishCalendarItem, date, 9))} type="button"><span>+</span> 排期</button>}
      </div>
    </section>
  );
}

function DroppableCalendarTimeCell({
  date,
  hour,
  groups,
  isToday,
  onSelect,
  onCreateAt,
  showEmptySlots
}: {
  date: string;
  hour: number;
  groups: CalendarCardGroup[];
  isToday: boolean;
  onSelect?: (platformVersionId: string) => void;
  onCreateAt?: (scheduledAt: string) => void;
  showEmptySlots: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}-${hour}`, data: { date, hour } });
  const visible = groups.slice(0, 1);
  return (
    <div
      className={cx("calendar-time-cell", isOver && "is-over", isToday && "is-today")}
      data-calendar-date={date}
      data-calendar-hour={hour}
      data-calendar-target-at={localDateTimeInputValue(scheduledForDate({ scheduledAt: `${date}T${String(hour).padStart(2, "0")}:00:00.000`, platformVersionId: "", contentId: "", platform: "douyin", status: "scheduled", title: "" } as PublishCalendarItem, date, hour))}
      ref={setNodeRef}
    >
      {visible.map((group) => (
        <DraggableCalendarCard group={group} key={group.id} onSelect={onSelect} />
      ))}
      {groups.length === 0 && showEmptySlots && <button aria-label={`新增排期 ${date} ${String(hour).padStart(2, "0")}:00`} className="calendar-empty-slot calendar-empty-slot-compact" data-calendar-empty={date} data-calendar-empty-hour={hour} onClick={() => onCreateAt?.(scheduledForDate({ scheduledAt: `${date}T${String(hour).padStart(2, "0")}:00:00.000`, platformVersionId: "", contentId: "", platform: "douyin", status: "scheduled", title: "" } as PublishCalendarItem, date, hour))} type="button"><span>+</span></button>}
    </div>
  );
}

export function PublishCalendar({
  items,
  view = "week",
  anchorDate,
  onSelect,
  onCreateAt,
  onReschedule,
  showEmptySlots = false,
  pendingItems = []
}: {
  items: PublishCalendarItem[];
  view?: CalendarGridView;
  anchorDate?: Date;
  onSelect?: (platformVersionId: string) => void;
  onCreateAt?: (scheduledAt: string) => void;
  onReschedule?: (input: { platformVersionId: string; scheduledAt: string }) => void;
  showEmptySlots?: boolean;
  pendingItems?: PendingScheduleDraftItem[];
}) {
  const [mounted, setMounted] = useState(false);
  const firstDate = anchorDate ?? new Date();
  const displayDates = daysForView(view, firstDate);
  const dates = displayDates.map(dateKey);
  const cardGroups = groupCalendarCards(items, view);
  const weekTimeSlots = weekTimeSlotsForItems(items);
  const byDate = new Map<string, CalendarCardGroup[]>();
  const byTimeCell = new Map<string, CalendarCardGroup[]>();
  for (const date of dates) {
    const dateGroups = cardGroups.filter((group) => dateKey(new Date(group.item.scheduledAt)) === date);
    byDate.set(date, dateGroups);
    for (const slot of weekTimeSlots) {
      byTimeCell.set(`${date}-${slot}`, dateGroups.filter((group) => timeSlotFor(group.item.scheduledAt) === slot));
    }
  }
  const todayKey = dateKey(new Date());
  const anchorMonth = firstDate.getMonth();

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const item = event.active.data.current?.item as PublishCalendarItem | undefined;
    const target = dropTargetFromEvent(event);
    if (!item || !target?.date) return;
    onSelect?.(item.platformVersionId);
    onReschedule?.({ platformVersionId: item.platformVersionId, scheduledAt: scheduledForDate(item, target.date, target.hour) });
  }

  if (items.length === 0 && pendingItems.length === 0 && !showEmptySlots) {
    return (
      <div className="grid gap-3" data-ui-boundary="publish-calendar-only" data-testid="publish-calendar">
        <EmptyState title="暂无可行动排期" description="默认日历只展示已排期、发布异常或等待人工确认的运营稿件；全部历史记录可切换范围查看。" />
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="grid gap-3" data-ui-boundary="publish-calendar-only" data-testid="publish-calendar">
        <div className="calendar-board calendar-loading" aria-busy="true">
          正在加载发布日历...
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3" data-ui-boundary="publish-calendar-only" data-testid="publish-calendar">
      <DndContext onDragEnd={handleDragEnd}>
        {items.length === 0 && pendingItems.length > 0 && (
          <p className="calendar-empty-real-queue-note" data-testid="calendar-empty-real-queue-note">当前没有已排期稿件；右侧显示真实待排草稿，不用假排期占位。</p>
        )}
        <div className={cx("calendar-workflow-grid", pendingItems.length > 0 && "has-pending-queue")}>
          {view === "week" ? (
            <div
              className="calendar-board calendar-board-time-grid"
              data-calendar-grid={view}
              style={{ gridTemplateColumns: `64px repeat(${displayDates.length}, minmax(138px, 1fr))` }}
            >
              <div className="calendar-time-corner" />
              {displayDates.map((date, index) => {
                const key = dates[index];
                return (
                  <header className={cx("calendar-day-head calendar-time-day-head", key === todayKey && "is-today")} key={key}>
                    <span>{dayLabel(date, index, view)}</span>
                    <strong>{formatShortDate(date)}</strong>
                  {key === todayKey && <em>今天</em>}
                  </header>
                );
              })}
              {weekTimeSlots.map((hour) => (
                <div className="calendar-time-row" key={hour}>
                  <div className="calendar-time-label">{formatSlot(hour)}</div>
                  {displayDates.map((date) => {
                    const key = dateKey(date);
                    return (
                      <DroppableCalendarTimeCell
                        date={key}
                        groups={byTimeCell.get(`${key}-${hour}`) ?? []}
                        hour={hour}
                        isToday={key === todayKey}
                        key={`${key}-${hour}`}
                        onCreateAt={onCreateAt}
                        onSelect={onSelect}
                        showEmptySlots={showEmptySlots}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="calendar-board calendar-board-date-first is-month-view"
              data-calendar-grid={view}
              style={{ gridTemplateColumns: `repeat(7, minmax(132px, 1fr))` }}
            >
              {displayDates.map((date, index) => {
                const key = dates[index];
                return (
                  <DroppableCalendarDay
                    date={key}
                    index={index}
                    isOutsideMonth={date.getMonth() !== anchorMonth}
                    isToday={key === todayKey}
                    groups={byDate.get(key) ?? []}
                    key={`${key}-${index}`}
                    onCreateAt={onCreateAt}
                    onSelect={onSelect}
                    showEmptySlots={showEmptySlots}
                    view={view}
                  />
                );
              })}
            </div>
          )}
          {(pendingItems.length > 0 || items.length === 0) && <PendingScheduleQueue items={pendingItems} onSelect={onSelect} />}
        </div>
      </DndContext>
    </div>
  );
}

export function PlatformVersionInspector({
  version,
  versions,
  contentTitle,
  handoffPackages = [],
  onReschedule,
  onStatusPatch,
  onConfirmPublish
}: {
  version?: ContentPlatformVersion;
  versions?: ContentPlatformVersion[];
  contentTitle?: string;
  handoffPackages?: PublishHandoffPackage[];
  onReschedule?: (input: { platformVersionId: string; scheduledAt: string }) => Promise<void>;
  onStatusPatch?: (input: { id: string; status: ContentPlatformVersion["status"]; scheduledAt?: string }) => Promise<void>;
  onConfirmPublish?: (input: { platformVersionId: string; status: ConfirmPlatformVersionPublishRequest["status"] }) => Promise<void>;
}) {
  const contentVersions = versions?.length ? versions : version ? [version] : [];

  if (contentVersions.length === 0) {
    return <EmptyState title="选择一个排期" description="从日历中选择内容卡，查看各平台时间、状态和发布确认。" />;
  }
  const primary = version ?? contentVersions[0];
  const sortedVersions = [...contentVersions].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime || platformLabels[a.platform].localeCompare(platformLabels[b.platform]);
  });
  const readyVersions = sortedVersions.filter((item) => item.status === "scheduled" || item.status === "published").length;
  return (
    <aside className="inspector-panel">
      <div>
        <p className="sm-eyebrow">内容排期详情</p>
        <h2>{contentTitle ?? primary.title}</h2>
      </div>
      <div className="inspector-row">
        <span>平台</span>
        <div className="inline-stack">
          {sortedVersions.map((item) => <PlatformBadge key={item.id} platform={item.platform} compact />)}
        </div>
      </div>
      <div className="inspector-row">
        <span>排期进度</span>
        <strong>{readyVersions}/{sortedVersions.length} 平台已排期或发布</strong>
      </div>
      <div className="calendar-platform-schedule-list" data-testid="calendar-content-schedule-inspector">
        {sortedVersions.map((item) => (
          <PlatformScheduleRow
            handoffPackage={handoffPackages.find((pkg) => pkg.platformVersionId === item.id)}
            key={item.id}
            onConfirmPublish={onConfirmPublish}
            onReschedule={onReschedule}
            onStatusPatch={onStatusPatch}
            version={item}
          />
        ))}
      </div>
      <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[#fffdf8] p-3 text-sm leading-6 text-[var(--sm-text-muted)]">
        <strong className="block text-[var(--sm-text-strong)]">内容版本</strong>
        <span>{primary.coverNote ? `封面：${primary.coverNote}` : "封面备注未填写"}</span>
        <span className="block">{primary.script ? "脚本已准备" : "脚本待补充"}</span>
      </div>
    </aside>
  );
}

function PlatformScheduleRow({
  version,
  handoffPackage,
  onReschedule,
  onStatusPatch,
  onConfirmPublish
}: {
  version: ContentPlatformVersion;
  handoffPackage?: PublishHandoffPackage;
  onReschedule?: (input: { platformVersionId: string; scheduledAt: string }) => Promise<void>;
  onStatusPatch?: (input: { id: string; status: ContentPlatformVersion["status"]; scheduledAt?: string }) => Promise<void>;
  onConfirmPublish?: (input: { platformVersionId: string; status: ConfirmPlatformVersionPublishRequest["status"] }) => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] = useState(localDateTimeInputValue(version.scheduledAt));
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    setScheduledAt(localDateTimeInputValue(version.scheduledAt));
  }, [version.id, version.scheduledAt]);

  const checklist = Object.entries(version.checklist);
  const done = checklist.filter(([, value]) => value).length;
  const readiness = checklist.length === 0 ? 0 : Math.round((done / checklist.length) * 100);
  const blocker = version.failureReason ?? (version.status === "blocked" ? "该平台版本已标记阻塞，等待人工补充原因。" : undefined);
  const nextScheduledAt = isoFromLocalDateTime(scheduledAt);
  const canReturnToReview = version.status === "failed" || version.status === "blocked";
  const canConfirmPublish = version.status === "scheduled";
  async function copyCalendarText(label: string, text: string) {
    if (!text.trim()) {
      setCopyMessage(`${label}暂无可复制内容。`);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyMessage(`${label}已准备好；当前浏览器不支持自动写入剪贴板。`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${label}已复制。`);
    } catch {
      setCopyMessage(`${label}复制失败，请在内容编辑页手动复制。`);
    }
  }
  return (
    <section className="calendar-platform-schedule-row" data-platform-version-id={version.id}>
      <header className="calendar-platform-schedule-head">
        <PlatformBadge platform={version.platform} />
        <StatusBadge status={version.status} />
      </header>
      <div className="inspector-row">
        <span>发布时间</span>
        <strong>{formatDateTime(version.scheduledAt ?? version.publishedAt)}</strong>
      </div>
      <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[#fffdf8] p-3">
        <div className="checklist-head">
          <strong>修改排期时间</strong>
          <span>人工排期</span>
        </div>
        <div className="inline-stack mt-2">
          <input
            className="sm-input"
            data-testid="calendar-reschedule-input"
            onChange={(event) => setScheduledAt(event.target.value)}
            type="datetime-local"
            value={scheduledAt}
          />
          <Button
            data-testid="calendar-reschedule-save"
            disabled={!onReschedule || !scheduledAt || version.status === "published"}
            onClick={() => {
              if (nextScheduledAt) void onReschedule?.({ platformVersionId: version.id, scheduledAt: nextScheduledAt });
            }}
            variant="secondary"
          >
            保存排期时间
          </Button>
        </div>
      </div>
      <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[#fffdf8] p-3">
        <div className="checklist-head">
          <strong>就绪度</strong>
          <span>{readiness}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--sm-bg-panel-muted)]">
          <span className="block h-full rounded-full bg-[var(--sm-success)]" style={{ width: `${readiness}%` }} />
        </div>
      </div>
      <div className="checklist">
        <div className="checklist-head">
          <strong>发布检查</strong>
          <span>{done}/{checklist.length}</span>
        </div>
        {checklist.map(([key, checked]) => (
          <div className="checklist-item" key={key}>
            <span className={checked ? "check-dot is-done" : "check-dot"}>{checked ? "✓" : ""}</span>
            <span>{checklistLabel(key)}</span>
          </div>
        ))}
      </div>
      {blocker && (
        <div className="soft-warning">
          <strong>阻塞原因</strong>
          <p>{blocker}</p>
        </div>
      )}
      <div className="inspector-note">
        <span>下一步</span>
        <p>{version.nextAction ?? `${platformLabels[version.platform]}版本等待人工确认。`}</p>
      </div>
      {handoffPackage && (
        <div className="publish-confirmation-strip" data-testid="calendar-publish-handoff">
          <strong>手动发布助手</strong>
          <span>{handoffPackage.capability.label} · 不是自动发布；复制文案/标签、打开平台后台，再由人工确认状态。</span>
          <div className="inline-stack">
            <Button data-testid="calendar-copy-publish-text" onClick={() => void copyCalendarText(`${platformLabels[version.platform]}发布文案`, handoffPackage.copy.publishText)} variant="secondary">复制发布文案</Button>
            <Button data-testid="calendar-copy-tags" onClick={() => void copyCalendarText(`${platformLabels[version.platform]}标签`, handoffPackage.copy.tagsText)} variant="secondary">复制标签</Button>
            <a className="sm-button sm-button-primary" data-testid="calendar-open-official-backend" href={handoffPackage.officialBackendUrl} rel="noreferrer" target="_blank">{handoffPackage.backendActionLabel}</a>
            {canConfirmPublish ? (
              <Button
                data-testid="calendar-submit-review"
                disabled={!onConfirmPublish}
                onClick={() => onConfirmPublish?.({ platformVersionId: version.id, status: "submitted_review" })}
                variant="secondary"
              >
                记录已提交审核
              </Button>
            ) : (
              <span data-testid="calendar-publish-not-ready">先排期并进入待发布状态后，再记录提交审核或已发布。</span>
            )}
          </div>
          {copyMessage && <span>{copyMessage}</span>}
        </div>
      )}
      <div className="publish-confirmation-strip">
        <strong>状态与人工发布确认</strong>
        <span>只记录人工结果，便于复盘排期。</span>
        <div className="inline-stack">
          <Button
            data-testid="calendar-mark-needs-review"
            disabled={!onStatusPatch || (!canReturnToReview && version.status !== "draft")}
            onClick={() => onStatusPatch?.({ id: version.id, status: "needs_review", scheduledAt: nextScheduledAt })}
            variant="secondary"
          >
            设为待审核
          </Button>
          <Button
            data-testid="calendar-mark-scheduled"
            disabled={!onStatusPatch || !nextScheduledAt || version.status !== "needs_review"}
            onClick={() => onStatusPatch?.({ id: version.id, status: "scheduled", scheduledAt: nextScheduledAt })}
            variant="secondary"
          >
            设为已排期
          </Button>
          {canConfirmPublish ? (
            <>
              <Button
                data-testid="calendar-confirm-publish"
                disabled={!onConfirmPublish}
                onClick={() => onConfirmPublish?.({ platformVersionId: version.id, status: "published" })}
                variant="secondary"
              >
                人工确认已发布
              </Button>
              <Button
                data-testid="calendar-confirm-failed"
                disabled={!onConfirmPublish}
                onClick={() => onConfirmPublish?.({ platformVersionId: version.id, status: "failed" })}
                variant="danger"
              >
                记录发布失败
              </Button>
            </>
          ) : (
            <span data-testid="calendar-confirm-not-ready">未排期作品不会显示“记录已发布”主动作；先保存排期时间。</span>
          )}
        </div>
      </div>
    </section>
  );
}

function checklistLabel(key: string) {
  const labels: Record<string, string> = {
    title: "标题确认",
    cover: "封面确认",
    script: "脚本确认",
    platformFit: "平台适配",
    humanConfirmed: "人工确认"
  };
  return labels[key] ?? key;
}
