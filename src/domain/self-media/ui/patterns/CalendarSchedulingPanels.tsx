"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { Platform, PlatformVersionStatus, PublishCalendarItem } from "../../types";
import { PlatformBadge } from "../components/PlatformBadge";
import { platformVersionStatusLabels } from "../foundations/labels";
import { PublishCalendar } from "./PublishCalendar";
import { Tabs } from "../primitives/Tabs";

export type CalendarScheduleView = "week" | "month";

export function CalendarScheduleGrid({
  anchorDate,
  items,
  platform,
  platformFilters,
  query,
  rangeText,
  status,
  statusFilters,
  view,
  onCreateAt,
  onPlatform,
  onQuery,
  onReschedule,
  onSelect,
  onStatus,
  onView
}: {
  anchorDate?: Date;
  items: PublishCalendarItem[];
  platform: Platform | "all";
  platformFilters: Array<Platform | "all">;
  query: string;
  rangeText: string;
  status: PlatformVersionStatus | "all";
  statusFilters: Array<PlatformVersionStatus | "all">;
  view: CalendarScheduleView;
  onCreateAt: (scheduledAt: string) => void;
  onPlatform: (platform: Platform | "all") => void;
  onQuery: (query: string) => void;
  onReschedule: (input: { platformVersionId: string; scheduledAt: string }) => void;
  onSelect: (platformVersionId: string) => void;
  onStatus: (status: PlatformVersionStatus | "all") => void;
  onView: (view: CalendarScheduleView) => void;
}) {
  return (
    <section className="calendar-primary-schedule" data-testid="calendar-primary-schedule">
      <div className="calendar-toolbar">
        <label className="calendar-search">
          <Search aria-hidden="true" size={17} />
          <input onChange={(event) => onQuery(event.target.value)} placeholder="搜索未来排期标题" type="search" value={query} />
        </label>
        <Tabs className="calendar-view-tabs" activeId={view} items={[{ id: "week", label: "本周" }, { id: "month", label: "本月" }]} onSelect={(id) => onView(id === "month" ? "month" : "week")} />
        <div className="calendar-range-control" aria-label="当前日期范围">
          <button disabled type="button" aria-label="上一个周期"><ChevronLeft aria-hidden="true" size={16} /></button>
          <span><CalendarDays aria-hidden="true" size={15} />{rangeText}</span>
          <button disabled type="button" aria-label="下一个周期"><ChevronRight aria-hidden="true" size={16} /></button>
        </div>
        <div className="calendar-platform-filter-group" aria-label="平台筛选">
          {platformFilters.map((item) => (
            <button className={platformChipClass(platform === item)} key={item} onClick={() => onPlatform(item)} type="button">
              {item === "all" ? "全部" : <PlatformBadge platform={item} compact />}
            </button>
          ))}
        </div>
        <label className="calendar-status-filter">
          <span>状态</span>
          <select className="sm-input calendar-status-select" value={status} onChange={(event) => onStatus(event.target.value as PlatformVersionStatus | "all")}>
            {statusFilters.map((item) => <option key={item} value={item}>{item === "all" ? "全部状态" : platformVersionStatusLabels[item]}</option>)}
          </select>
        </label>
        <a className="sm-button sm-button-primary calendar-new-button" href="/content#new-video">
          <Plus aria-hidden="true" size={15} />计划新视频 / 新增排期
        </a>
      </div>
      <div className="calendar-layout">
        <PublishCalendar
          anchorDate={anchorDate}
          items={items}
          onCreateAt={onCreateAt}
          onReschedule={onReschedule}
          onSelect={onSelect}
          pendingItems={[]}
          showEmptySlots
          view={view}
        />
      </div>
    </section>
  );
}

export function CalendarSecondarySections({ children }: { children: ReactNode }) {
  return (
    <section className="calendar-secondary-sections" data-testid="calendar-secondary-sections">
      <header className="section-heading">
        <span className="sm-eyebrow">辅助信息</span>
        <h2>素材池、发布记录和已隔离内容</h2>
        <p>这些内容默认不进入主日历；需要核对时再展开。</p>
      </header>
      <div className="grid gap-3">
        {children}
      </div>
    </section>
  );
}

function platformChipClass(active: boolean) {
  return [
    "calendar-platform-filter",
    active ? "is-active" : undefined
  ].filter(Boolean).join(" ");
}
