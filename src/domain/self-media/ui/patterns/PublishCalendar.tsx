import type { ContentPlatformVersion, PublishCalendarItem } from "../../types";
import { formatDateTime } from "../foundations/format";
import { platformLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";

const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function dayIndex(value?: string) {
  if (!value) return 0;
  const day = new Date(value).getDay();
  return day === 0 ? 6 : day - 1;
}

export function PublishCalendar({ items }: { items: PublishCalendarItem[] }) {
  const byDay = weekDays.map((_, index) => items.filter((item) => dayIndex(item.scheduledAt) === index));
  return (
    <div className="calendar-grid" data-ui-boundary="publish-calendar-only">
      {weekDays.map((day, index) => (
        <section className="calendar-day" key={day}>
          <header>
            <span>{day}</span>
            <small>{byDay[index].length} 条</small>
          </header>
          <div className="calendar-day-stack">
            {byDay[index].slice(0, 4).map((item) => (
              <article className="calendar-card" key={item.id}>
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
            ))}
            {byDay[index].length === 0 && <button className="calendar-empty-slot">+ 排期</button>}
          </div>
        </section>
      ))}
    </div>
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
