"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { ContentPlatformVersion, PublishCalendarItem } from "../../types";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { cx } from "../foundations/cx";
import { formatDateTime } from "../foundations/format";
import { platformLabels } from "../foundations/labels";
import { EmptyState } from "../components/EmptyState";

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
type CalendarGridView = "week" | "month";

function mondayOf(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day));
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthGridOf(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = mondayOf(first);
  return Array.from({ length: 35 }, (_, index) => {
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
  if (view === "month") return `${weekday} ${date.getDate()}`;
  return weekday;
}

function scheduledForDate(item: PublishCalendarItem, targetDate: string) {
  const original = new Date(item.scheduledAt);
  const hour = Number.isNaN(original.getTime()) || original.getHours() === 0 ? 9 : original.getHours();
  const minute = Number.isNaN(original.getTime()) ? 0 : original.getMinutes();
  const next = new Date(`${targetDate}T00:00:00.000`);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function DraggableCalendarCard({ item, onSelect }: { item: PublishCalendarItem; onSelect?: (platformVersionId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.platformVersionId, data: { item } });
  const style: CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.62 : 1 } : {};
  return (
    <article
      className="calendar-card"
      data-calendar-card="true"
      data-platform-version-id={item.platformVersionId}
      onClick={() => onSelect?.(item.platformVersionId)}
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div className="calendar-card-meta">
        <PlatformBadge platform={item.platform} compact />
        <time>{formatDateTime(item.scheduledAt)}</time>
      </div>
      <strong>{item.title}</strong>
      <div className="calendar-card-foot">
        <StatusBadge status={item.status} />
        <span>{item.checklistDone}/{item.checklistTotal}</span>
      </div>
      {item.blockers?.[0] && <p className="calendar-blocker">{item.blockers[0]}</p>}
    </article>
  );
}

function DroppableDay({ date, day, items, onSelect }: { date: string; day: string; items: PublishCalendarItem[]; onSelect?: (platformVersionId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: date, data: { date } });
  return (
    <section className={cx("calendar-day", isOver && "is-over")} data-calendar-date={date} ref={setNodeRef}>
      <header>
        <span>{day}</span>
        <small>{items.length} 条 · {date.slice(5)}</small>
      </header>
      <div className="calendar-day-stack">
        {items.slice(0, 5).map((item) => <DraggableCalendarCard item={item} key={item.id} onSelect={onSelect} />)}
        {items.length === 0 && <button className="calendar-empty-slot" data-calendar-empty={date}>+ 排期</button>}
      </div>
    </section>
  );
}

export function PublishCalendar({
  items,
  view = "week",
  onSelect,
  onReschedule
}: {
  items: PublishCalendarItem[];
  view?: CalendarGridView;
  onSelect?: (platformVersionId: string) => void;
  onReschedule?: (input: { platformVersionId: string; scheduledAt: string }) => void;
}) {
  const firstDate = items[0]?.scheduledAt ? new Date(items[0].scheduledAt) : new Date();
  const displayDates = daysForView(view, firstDate);
  const dates = displayDates.map(dateKey);
  const byDate = new Map(dates.map((date) => [date, items.filter((item) => dateKey(new Date(item.scheduledAt)) === date)]));

  function handleDragEnd(event: DragEndEvent) {
    const item = event.active.data.current?.item as PublishCalendarItem | undefined;
    const date = event.over?.data.current?.date as string | undefined;
    if (!item || !date) return;
    onSelect?.(item.platformVersionId);
    onReschedule?.({ platformVersionId: item.platformVersionId, scheduledAt: scheduledForDate(item, date) });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className={cx("calendar-grid", view === "month" && "is-month-view")} data-ui-boundary="publish-calendar-only" data-testid="publish-calendar">
        {displayDates.map((date, index) => {
          const key = dates[index];
          return <DroppableDay date={key} day={dayLabel(date, index, view)} items={byDate.get(key) ?? []} key={key} onSelect={onSelect} />;
        })}
      </div>
    </DndContext>
  );
}

export function PlatformVersionInspector({ version }: { version?: ContentPlatformVersion }) {
  if (!version) {
    return <EmptyState title="选择一个排期" description="从日历中选择平台版本，查看状态、检查项和下一步动作。" />;
  }
  const checklist = Object.entries(version.checklist);
  const done = checklist.filter(([, value]) => value).length;
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
      {version.failureReason && (
        <div className="soft-warning">
          <strong>阻塞原因</strong>
          <p>{version.failureReason}</p>
        </div>
      )}
      <div className="inspector-note">
        <span>下一步</span>
        <p>{version.nextAction ?? `${platformLabels[version.platform]}版本等待人工确认。`}</p>
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
