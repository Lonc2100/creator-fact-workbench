"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { useEffect, useState, type CSSProperties } from "react";
import type { ContentPlatformVersion, PublishCalendarItem } from "../../types";
import { PlatformBadge, PlatformIcon } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { cx } from "../foundations/cx";
import { formatDateTime } from "../foundations/format";
import { platformLabels, platformTone, platformVersionStatusLabels } from "../foundations/labels";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../primitives/Button";

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
type CalendarGridView = "week" | "month";
const weekTimeSlots = [9, 13, 17, 21];
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

function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function isoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
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
  if (/选题/.test(withoutIds)) return "AI选题计划";
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

function timeSlotFor(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 9;
  const hour = date.getHours();
  return weekTimeSlots.reduce((best, slot) => (Math.abs(slot - hour) < Math.abs(best - hour) ? slot : best), weekTimeSlots[0]);
}

function formatSlot(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  const normalized = hour <= 12 ? hour : hour - 12;
  return `${normalized}:00 ${suffix}`;
}

function groupCalendarCards(items: PublishCalendarItem[]) {
  const groups = new Map<string, CalendarCardGroup>();
  for (const item of items) {
    const scheduled = new Date(item.scheduledAt);
    const scheduleKey = Number.isNaN(scheduled.getTime()) ? "unscheduled" : `${dateKey(scheduled)}-${formatShortTime(item.scheduledAt)}`;
    const key = `${item.contentId || item.platformVersionId}:${scheduleKey}`;
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
  return (
    <article
      className={cx("calendar-card", platformTone[item.platform], "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgba(44,39,68,0.38)]")}
      data-calendar-card="true"
      data-platform-version-id={item.platformVersionId}
      onClick={() => onSelect?.(item.platformVersionId)}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="calendar-card-topline">
        <div className="calendar-card-icons" aria-label={platformLabels[item.platform]}>
          {platforms.slice(0, 4).map((platform) => <PlatformIcon key={`${item.id}-${platform}`} platform={platform} size="sm" />)}
        </div>
        <time>{formatShortTime(item.scheduledAt)}</time>
      </div>
      <strong className="calendar-card-title" title={item.title}>{displayTitle(item.title)}</strong>
      <p className="calendar-card-note">{cardNote(item)}</p>
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
  showEmptySlots
}: {
  date: string;
  groups: CalendarCardGroup[];
  isToday: boolean;
  isOutsideMonth: boolean;
  view: CalendarGridView;
  index: number;
  onSelect?: (platformVersionId: string) => void;
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
        {groups.length === 0 && showEmptySlots && <button className="calendar-empty-slot" data-calendar-empty={date} type="button"><span>+</span> 排期</button>}
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
  showEmptySlots
}: {
  date: string;
  hour: number;
  groups: CalendarCardGroup[];
  isToday: boolean;
  onSelect?: (platformVersionId: string) => void;
  showEmptySlots: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}-${hour}`, data: { date, hour } });
  const visible = groups.slice(0, 1);
  return (
    <div
      className={cx("calendar-time-cell", isOver && "is-over", isToday && "is-today")}
      data-calendar-date={date}
      data-calendar-hour={hour}
      ref={setNodeRef}
    >
      {visible.map((group) => (
        <DraggableCalendarCard group={group} key={group.id} onSelect={onSelect} />
      ))}
      {groups.length === 0 && showEmptySlots && <button className="calendar-empty-slot calendar-empty-slot-compact" data-calendar-empty={date} type="button"><span>+</span></button>}
    </div>
  );
}

export function PublishCalendar({
  items,
  view = "week",
  anchorDate,
  onSelect,
  onReschedule,
  showEmptySlots = false,
  pendingItems = []
}: {
  items: PublishCalendarItem[];
  view?: CalendarGridView;
  anchorDate?: Date;
  onSelect?: (platformVersionId: string) => void;
  onReschedule?: (input: { platformVersionId: string; scheduledAt: string }) => void;
  showEmptySlots?: boolean;
  pendingItems?: PendingScheduleDraftItem[];
}) {
  const [mounted, setMounted] = useState(false);
  const firstDate = anchorDate ?? anchorDateForItems(items);
  const displayDates = daysForView(view, firstDate);
  const dates = displayDates.map(dateKey);
  const cardGroups = groupCalendarCards(items);
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
    const date = event.over?.data.current?.date as string | undefined;
    const hour = event.over?.data.current?.hour as number | undefined;
    if (!item || !date) return;
    onSelect?.(item.platformVersionId);
    onReschedule?.({ platformVersionId: item.platformVersionId, scheduledAt: scheduledForDate(item, date, hour) });
  }

  if (items.length === 0 && pendingItems.length === 0) {
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
  onReschedule,
  onConfirmPublish
}: {
  version?: ContentPlatformVersion;
  onReschedule?: (input: { platformVersionId: string; scheduledAt: string }) => Promise<void>;
  onConfirmPublish?: (status: "published" | "failed") => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] = useState(localDateTime(version?.scheduledAt));

  useEffect(() => {
    setScheduledAt(localDateTime(version?.scheduledAt));
  }, [version?.id, version?.scheduledAt]);

  if (!version) {
    return <EmptyState title="选择一个排期" description="从日历中选择平台版本，查看状态、检查项和下一步动作。" />;
  }
  const checklist = Object.entries(version.checklist);
  const done = checklist.filter(([, value]) => value).length;
  const readiness = checklist.length === 0 ? 0 : Math.round((done / checklist.length) * 100);
  const blocker = version.failureReason ?? (version.status === "blocked" ? "该平台版本已标记阻塞，等待人工补充原因。" : undefined);
  return (
    <aside className="inspector-panel">
      <div>
        <p className="sm-eyebrow">平台版本详情</p>
        <h2>{version.title}</h2>
      </div>
      <div className="inspector-row">
        <span>平台</span>
        <PlatformBadge platform={version.platform} />
      </div>
      <div className="inspector-row">
        <span>状态</span>
        <StatusBadge status={version.status} />
      </div>
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
              const next = isoFromLocal(scheduledAt);
              if (next) void onReschedule?.({ platformVersionId: version.id, scheduledAt: next });
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
      <div className="publish-confirmation-strip">
        <strong>人工发布确认</strong>
        <span>只记录人工结果，便于复盘排期。</span>
        <div className="inline-stack">
          <Button
            data-testid="calendar-confirm-publish"
            disabled={!onConfirmPublish || version.status !== "scheduled"}
            onClick={() => onConfirmPublish?.("published")}
            variant="secondary"
          >
            人工确认已发布
          </Button>
          <Button
            data-testid="calendar-confirm-failed"
            disabled={!onConfirmPublish || version.status !== "scheduled"}
            onClick={() => onConfirmPublish?.("failed")}
            variant="danger"
          >
            记录发布失败
          </Button>
        </div>
      </div>
      <div className="rounded-[var(--sm-radius-md)] border border-[var(--sm-border)] bg-[#fffdf8] p-3 text-sm leading-6 text-[var(--sm-text-muted)]">
        <strong className="block text-[var(--sm-text-strong)]">版本内容</strong>
        <span>{version.coverNote ? `封面：${version.coverNote}` : "封面备注未填写"}</span>
        <span className="block">{version.script ? "脚本已准备" : "脚本待补充"}</span>
      </div>
    </aside>
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
