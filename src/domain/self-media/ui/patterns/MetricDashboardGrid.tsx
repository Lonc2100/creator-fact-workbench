"use client";

import { useMemo, useState } from "react";
import type { ContentItem, DashboardSnapshot, Platform } from "../../types";
import { formatNumber, formatPercent } from "../foundations/format";
import { platformLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { Panel } from "../primitives/Panel";

interface MetricDatum {
  contentId: string;
  platformVersionId?: string;
  platform: Platform;
  date: string;
  updatedAt?: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  source: DashboardSnapshot["metricSourceGroups"][number]["source"] | "review_metric";
  importRunId?: string;
  participatesInReview: boolean;
  kind: "metric_snapshot" | "review_metric";
}

function toMetricEntries(snapshot: DashboardSnapshot): MetricDatum[] {
  const snapshotKeys = new Set(snapshot.metricSnapshots.map((metric) => metricEntryKey(metric.contentId, metric.platform, metric.snapshotDate)));
  const reviewMetricKeys = new Set(snapshot.metrics.map((metric) => metricEntryKey(metric.contentId, metric.platform, metric.capturedAt)));
  return [
    ...snapshot.metricSnapshots.map((metric) => ({
      contentId: metric.contentId,
      platformVersionId: metric.platformVersionId,
      platform: metric.platform,
      date: metric.snapshotDate,
      updatedAt: metric.updatedAt,
      views: metric.views,
      likes: metric.likes,
      comments: metric.comments,
      saves: metric.saves,
      shares: metric.shares,
      followersDelta: metric.followersDelta,
      source: metric.source,
      importRunId: metric.importRunId,
      participatesInReview: reviewMetricKeys.has(metricEntryKey(metric.contentId, metric.platform, metric.snapshotDate)),
      kind: "metric_snapshot" as const
    })),
    ...snapshot.metrics.filter((metric) => !snapshotKeys.has(metricEntryKey(metric.contentId, metric.platform, metric.capturedAt))).map((metric) => ({
      contentId: metric.contentId,
      platformVersionId: undefined,
      platform: metric.platform,
      date: metric.capturedAt,
      updatedAt: metric.capturedAt,
      views: metric.views,
      likes: metric.likes,
      comments: metric.comments,
      saves: metric.saves,
      shares: metric.shares,
      followersDelta: metric.followersDelta,
      source: "review_metric" as const,
      participatesInReview: true,
      kind: "review_metric" as const
    }))
  ];
}

function metricEntryKey(contentId: string, platform: Platform, date: string) {
  return `${contentId}|${platform}|${date ? date.slice(0, 10) : "unknown"}`;
}

interface AggregateRow {
  key: string;
  label: string;
  contentCount: number;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  engagement: number;
}

function engagementOf(metric: Pick<MetricDatum, "likes" | "comments" | "saves" | "shares">) {
  return metric.likes + metric.comments + metric.saves + metric.shares;
}

function platformRows(entries: MetricDatum[]) {
  const totals = new Map<Platform, { views: number; engagement: number; followersDelta: number; contents: Set<string> }>();
  for (const metric of entries) {
    const current = totals.get(metric.platform) ?? { views: 0, engagement: 0, followersDelta: 0, contents: new Set<string>() };
    current.views += metric.views;
    current.engagement += engagementOf(metric);
    current.followersDelta += metric.followersDelta;
    current.contents.add(metric.contentId);
    totals.set(metric.platform, current);
  }
  return [...totals.entries()]
    .map(([platform, value]) => ({ platform, ...value, contentCount: value.contents.size }))
    .sort((a, b) => b.views - a.views);
}

function contentRows(snapshot: DashboardSnapshot, entries: MetricDatum[]) {
  const contentById = contentMap(snapshot);
  return entries
    .map((entry) => {
      const content = contentById.get(entry.contentId);
      if (!content) return null;
      const views = entry.views;
      const engagement = engagementOf(entry);
      return {
        content,
        latest: entry,
        views,
        engagement,
        engagementRate: views > 0 ? (engagement / views) * 100 : 0,
        signal: views >= 1200 || engagement / Math.max(views, 1) >= 0.12 ? "放大复用" : "继续观察"
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => compareRecentContent(a.content, b.content) || compareEntryRecency(a.latest, b.latest) || b.views - a.views);
}

function trendBuckets(entries: MetricDatum[], snapshot: DashboardSnapshot) {
  const contentById = contentMap(snapshot);
  const buckets = new Map<string, { key: string; label: string; views: number; engagement: number }>();
  for (const metric of entries) {
    const content = contentById.get(metric.contentId);
    const date = content?.publishedAt ? new Date(content.publishedAt) : metric.date ? new Date(metric.date) : null;
    const key = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "unknown";
    const label = date && !Number.isNaN(date.getTime()) ? `${date.getMonth() + 1}/${date.getDate()}` : "未标注";
    const current = buckets.get(key) ?? { key, label, views: 0, engagement: 0 };
    current.views += metric.views;
    current.engagement += engagementOf(metric);
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-6);
}

function strongestPlatformText(platformData: ReturnType<typeof platformRows>, totalViews: number) {
  const top = platformData[0];
  if (!top || totalViews <= 0) return "暂无足够平台数据，先完成导入后再观察。";
  return `${platformLabels[top.platform]}贡献 ${formatPercent((top.views / totalViews) * 100)} 曝光，是当前主要增长来源。`;
}

function contentTitleMap(snapshot: DashboardSnapshot) {
  return new Map(snapshot.contents.map((content) => [content.id, content.title]));
}

function contentMap(snapshot: DashboardSnapshot) {
  return new Map(snapshot.contents.map((content) => [content.id, content]));
}

function timestampOf(value: string | undefined) {
  if (!value) return Number.NaN;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NaN : time;
}

function validTimestamp(value: number) {
  return Number.isFinite(value);
}

function compareEntryRecency(a: MetricDatum, b: MetricDatum) {
  const dateDelta = (timestampOf(b.date) || 0) - (timestampOf(a.date) || 0);
  if (dateDelta !== 0) return dateDelta;
  return (timestampOf(b.updatedAt) || 0) - (timestampOf(a.updatedAt) || 0);
}

function compareRecentContent(a: ContentItem, b: ContentItem) {
  return (timestampOf(b.publishedAt) || 0) - (timestampOf(a.publishedAt) || 0);
}

function latestEntryByContent(entries: MetricDatum[], snapshot: DashboardSnapshot) {
  const contentById = contentMap(snapshot);
  const latest = new Map<string, MetricDatum>();
  for (const entry of entries) {
    if (!contentById.has(entry.contentId)) continue;
    const current = latest.get(entry.contentId);
    if (!current || compareEntryRecency(entry, current) < 0) latest.set(entry.contentId, entry);
  }
  return [...latest.values()].sort((a, b) => {
    const contentA = contentById.get(a.contentId);
    const contentB = contentById.get(b.contentId);
    if (contentA && contentB) {
      const contentDelta = compareRecentContent(contentA, contentB);
      if (contentDelta !== 0) return contentDelta;
    }
    return compareEntryRecency(a, b);
  });
}

function recencyWindowRange(snapshot: DashboardSnapshot, days: 7 | 30) {
  const end = new Date(snapshot.generatedAt || new Date().toISOString());
  if (Number.isNaN(end.getTime())) return { start: new Date(0), end: new Date() };
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function entriesForPublishedWindow(snapshot: DashboardSnapshot, entries: MetricDatum[], days: 7 | 30) {
  const { start, end } = recencyWindowRange(snapshot, days);
  const contentById = contentMap(snapshot);
  const eligibleContentIds = new Set(
    snapshot.contents
      .filter((content) => {
        const publishedAt = timestampOf(content.publishedAt);
        return validTimestamp(publishedAt) && publishedAt >= start.getTime() && publishedAt <= end.getTime();
      })
      .map((content) => content.id)
  );
  return latestEntryByContent(
    entries.filter((entry) => eligibleContentIds.has(entry.contentId) && contentById.has(entry.contentId)),
    snapshot
  );
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" }).format(date);
}

function aggregateKey(metric: MetricDatum, mode: "day" | "week" | "month") {
  const date = metric.date ? new Date(metric.date) : null;
  if (!date || Number.isNaN(date.getTime())) return { key: "unknown", label: "未标注" };
  if (mode === "day") return { key: date.toISOString().slice(0, 10), label: formatDateLabel(date) };
  if (mode === "month") {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` };
  }
  const monday = startOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    key: monday.toISOString().slice(0, 10),
    label: `${formatDateLabel(monday)} - ${formatDateLabel(sunday)}`
  };
}

function aggregateByPeriod(entries: MetricDatum[], mode: "day" | "week" | "month") {
  const buckets = new Map<string, AggregateRow & { contents: Set<string> }>();
  for (const metric of entries) {
    const { key, label } = aggregateKey(metric, mode);
    const current = buckets.get(key) ?? {
      key,
      label,
      contentCount: 0,
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      followersDelta: 0,
      engagement: 0,
      contents: new Set<string>()
    };
    current.views += metric.views;
    current.likes += metric.likes;
    current.comments += metric.comments;
    current.saves += metric.saves;
    current.shares += metric.shares;
    current.followersDelta += metric.followersDelta;
    current.engagement += engagementOf(metric);
    current.contents.add(metric.contentId);
    current.contentCount = current.contents.size;
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((rowWithContents) => {
      const row: AggregateRow = {
        key: rowWithContents.key,
        label: rowWithContents.label,
        contentCount: rowWithContents.contentCount,
        views: rowWithContents.views,
        likes: rowWithContents.likes,
        comments: rowWithContents.comments,
        saves: rowWithContents.saves,
        shares: rowWithContents.shares,
        followersDelta: rowWithContents.followersDelta,
        engagement: rowWithContents.engagement
      };
      return row;
    });
}

function nativeMetricLabels(platform: Platform) {
  const labels: Record<Platform, { primary: string; save: string; share: string; follower: string }> = {
    douyin: { primary: "播放", save: "收藏", share: "分享", follower: "粉丝变化" },
    xiaohongshu: { primary: "浏览", save: "收藏", share: "分享", follower: "粉丝变化" },
    wechat: { primary: "阅读", save: "微信收藏", share: "分享", follower: "关注变化" },
    video_account: { primary: "播放", save: "收藏", share: "转发", follower: "关注变化" },
    bilibili: { primary: "播放", save: "收藏", share: "分享", follower: "关注变化" },
    other: { primary: "曝光", save: "收藏", share: "分享", follower: "粉丝变化" }
  };
  return labels[platform];
}

function dateRange(entries: MetricDatum[], snapshot: DashboardSnapshot) {
  const contentById = contentMap(snapshot);
  const timestamps = entries
    .map((metric) => timestampOf(contentById.get(metric.contentId)?.publishedAt ?? metric.date))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  if (!timestamps.length) return "当前窗口暂无发布作品";
  const formatter = new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit" });
  return `${formatter.format(timestamps[0])} - ${formatter.format(timestamps[timestamps.length - 1])}`;
}

function sourceLabel(source: DashboardSnapshot["metricSourceGroups"][number]["source"] | "review_metric") {
  const labels: Record<string, string> = {
    douyin_creator_center: "抖音创作者中心",
    xiaohongshu_creator_center: "小红书创作者中心",
    video_account_creator_center: "视频号助手",
    bilibili_creator_center: "B站创作中心",
    review_metric: "复盘口径指标",
    manual: "手动录入",
    csv: "CSV 导入",
    json: "JSON 导入",
    fake: "样例数据",
    mediacrawler: "MediaCrawler",
    n8n: "n8n",
    wechat_official: "公众号历史数据"
  };
  return labels[source] ?? source;
}

function sourcePlatformLabel(platform: DashboardSnapshot["metricSourceGroups"][number]["platform"]) {
  return platform === "mixed" ? "多平台" : platformLabels[platform];
}

export function MetricDashboardGrid({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [recencyWindow, setRecencyWindow] = useState<7 | 30>(30);
  const allEntries = useMemo(() => toMetricEntries(snapshot), [snapshot]);
  const entries = useMemo(() => entriesForPublishedWindow(snapshot, allEntries, recencyWindow), [allEntries, recencyWindow, snapshot]);
  const rawTotalViews = entries.reduce((total, item) => total + item.views, 0);
  const totalViews = rawTotalViews || snapshot.weeklyReview.metrics.totalViews;
  const engagement = entries.reduce((total, item) => total + engagementOf(item), 0) || snapshot.weeklyReview.metrics.totalEngagement;
  const engagementRate = totalViews > 0 ? (engagement / totalViews) * 100 : 0;
  const platformData = platformRows(entries);
  const topPlatform = platformData[0]?.platform ?? snapshot.weeklyReview.metrics.bestPlatform;
  const maxPlatform = Math.max(...platformData.map((item) => item.views), 1);
  const rankedContents = contentRows(snapshot, entries);
  const topContent = rankedContents[0];
  const trend = trendBuckets(entries, snapshot);
  const maxTrendViews = Math.max(...trend.map((item) => item.views), 1);
  const maxTrendEngagement = Math.max(...trend.map((item) => item.engagement), 1);
  const publishedCount = snapshot.platformVersions.filter((item) => item.status === "published").length;
  const goalProgress = Math.min((publishedCount / 12) * 100, 100);
  const totalLeadValue = snapshot.leads.reduce((total, lead) => total + lead.valueEstimate, 0);
  const titleMap = contentTitleMap(snapshot);
  const contentsById = contentMap(snapshot);
  const periodTables = [
    { id: "day", title: "日数据", rows: aggregateByPeriod(entries, "day") },
    { id: "week", title: "周数据", rows: aggregateByPeriod(entries, "week") },
    { id: "month", title: "月数据", rows: aggregateByPeriod(entries, "month") }
  ];
  const nativeRows = [...entries]
    .sort((a, b) => {
      const contentA = contentsById.get(a.contentId);
      const contentB = contentsById.get(b.contentId);
      if (contentA && contentB) {
        const contentDelta = compareRecentContent(contentA, contentB);
        if (contentDelta !== 0) return contentDelta;
      }
      return compareEntryRecency(a, b);
    })
    .slice(0, 10);
  const sourceRows = snapshot.metricSourceGroups.slice(0, 6);
  const latestImportRows = snapshot.imports
    .filter((run) => sourceRows.some((group) => group.source === run.source))
    .slice(0, 4)
    .map((run) => ({
      run,
      group: snapshot.metricSourceGroups.find((group) => group.latestImportRunId === run.id || group.source === run.source)
    }));

  return (
    <div className="analytics-page" data-ui-boundary="analytics-only">
      <section className="analytics-insight-strip" aria-label="经营洞察">
        <strong>{platformLabels[topPlatform]} 是当前曝光主来源</strong>
        <span>
          {topContent ? `《${topContent.content.title}》排在内容榜首，` : ""}
          互动率为 {formatPercent(engagementRate)}，适合优先复盘高互动主题和平台适配。
        </span>
      </section>

      <section className="analytics-filter-bar" aria-label="当前数据看板筛选条件">
        <div className="inline-stack">
          <button
            className={`analytics-chip ${recencyWindow === 7 ? "is-active" : ""}`}
            data-testid="dashboard-recency-7"
            onClick={() => setRecencyWindow(7)}
            type="button"
            aria-pressed={recencyWindow === 7}
          >
            近 7 天
          </button>
          <button
            className={`analytics-chip ${recencyWindow === 30 ? "is-active" : ""}`}
            data-testid="dashboard-recency-30"
            onClick={() => setRecencyWindow(30)}
            type="button"
            aria-pressed={recencyWindow === 30}
          >
            近 30 天
          </button>
          <button className="analytics-chip is-active" type="button" aria-pressed="true">可信真实数据</button>
          <button className="analytics-chip" type="button">四平台对比</button>
          <button className="analytics-chip" type="button">曝光 + 互动</button>
          <button className="analytics-chip" type="button">B站内容级</button>
          <button className="analytics-chip" type="button">最近作品优先</button>
          <button className="analytics-chip" type="button">最新快照</button>
          <button className="analytics-chip" type="button">指标去重</button>
        </div>
        <span>作品发布时间窗口：{dateRange(entries, snapshot)}</span>
      </section>

      <section
        className="real-data-scope-strip"
        aria-label="默认真实数据口径"
        data-testid="dashboard-real-data-scope"
        data-trusted-content-count={snapshot.realDataScope.trustedContentCount}
        data-trusted-metric-snapshot-count={snapshot.realDataScope.trustedMetricSnapshotCount}
      >
        <strong>{snapshot.realDataScope.isDefaultDashboardTrusted ? "默认看板可信" : "默认看板需复核"}</strong>
        <span>{formatNumber(snapshot.realDataScope.trustedContentCount)} 真实内容</span>
        <span>{formatNumber(snapshot.realDataScope.trustedMetricSnapshotCount)} 真实指标快照</span>
        <span>{formatNumber(snapshot.realDataScope.excludedMetricCount)} 条非运营指标未计入</span>
        <small>当前按近 {recencyWindow} 天发布作品统计，每个作品只展示最新快照；其他记录可在更多记录区域或专用筛选中查看。</small>
      </section>

      <div className="dashboard-main-grid">
        <Panel
          className="dashboard-trend-panel"
          title="曝光与互动趋势"
          eyebrow="主趋势"
          action={<span className="analytics-panel-action">{formatNumber(totalViews)} 总曝光</span>}
        >
          <div
            className="combo-chart"
            aria-label="曝光与互动趋势图"
            style={{ gridTemplateColumns: `repeat(${Math.max(trend.length, 1)}, 1fr)` }}
          >
            {(trend.length ? trend : [{ label: "暂无", views: 0, engagement: 0 }]).map((bucket) => {
              const barHeight = Math.max((bucket.views / maxTrendViews) * 100, bucket.views > 0 ? 12 : 4);
              const pointBottom = Math.max((bucket.engagement / maxTrendEngagement) * 88, bucket.engagement > 0 ? 16 : 8);
              return (
                <div className="combo-point" key={bucket.label}>
                  <span className="combo-bar" style={{ height: `${barHeight}%` }} />
                  <i style={{ bottom: `${Math.min(pointBottom, 92)}%` }} />
                  <small>{bucket.label}</small>
                </div>
              );
            })}
          </div>
        </Panel>

      <div className="kpi-stack">
          <Panel
            className="analytics-kpi-card"
            data-engagement={engagement}
            data-testid="dashboard-kpi-total-views"
            data-views={totalViews}
            title="总曝光"
            eyebrow="核心指标"
          >
            <strong className="mega-number">{formatNumber(totalViews)}</strong>
            <p className="delta-positive">{formatPercent(engagementRate)} 综合互动率</p>
            <p className="muted">{formatNumber(snapshot.realDataScope.trustedContentCount)} 条可信真实内容进入看板</p>
          </Panel>

          <Panel className="analytics-kpi-card" title="商业线索池" eyebrow="变现信号">
            <strong className="mega-number">{formatNumber(totalLeadValue)}</strong>
            <p className="muted">{snapshot.leads.length} 条线索，可在复盘页判断下一步</p>
          </Panel>

          <Panel className="analytics-kpi-card" title="发布目标完成度" eyebrow="运营节奏">
            <div className="goal-bar"><span style={{ width: `${goalProgress}%` }} /></div>
            <p className="muted">{publishedCount}/12 个平台版本已发布</p>
          </Panel>
        </div>
      </div>

      <div className="dashboard-secondary-grid">
        <Panel
          data-testid="dashboard-platform-distribution"
          data-views={totalViews}
          title="平台曝光占比"
          eyebrow="平台结构"
        >
          <div className="donut-layout">
            <div className="donut"><strong>{formatNumber(totalViews)}</strong><span>曝光</span></div>
            <div className="legend-list">
              {platformData.slice(0, 5).map((item) => (
                <div
                  className="legend-row inline-stack"
                  data-content-count={item.contentCount}
                  data-platform={item.platform}
                  data-testid="dashboard-platform-distribution-row"
                  data-views={item.views}
                  key={item.platform}
                >
                  <PlatformBadge platform={item.platform} />
                  <strong>{formatPercent(totalViews > 0 ? (item.views / totalViews) * 100 : 0)}</strong>
                  <span className="muted">{formatNumber(item.views)} 曝光</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel data-testid="dashboard-platform-engagement" title="平台互动对比" eyebrow="下钻分析">
          <div className="stacked-bars">
            {platformData.slice(0, 5).map((item) => (
              <div
                className="stack-row"
                data-engagement={item.engagement}
                data-platform={item.platform}
                data-testid="dashboard-platform-engagement-row"
                data-views={item.views}
                key={item.platform}
              >
                <span>{platformLabels[item.platform]}</span>
                <i style={{ width: `${Math.max((item.views / maxPlatform) * 100, 8)}%` }} />
                <strong>{formatNumber(item.engagement)}</strong>
              </div>
            ))}
          </div>
          <p className="muted">右侧数字为点赞、评论、收藏和分享合计。</p>
        </Panel>
      </div>

      <Panel title="导入来源参与统计" eyebrow="来源平台">
        <div className="metric-source-grid">
          <div className="table-wrap">
            <table className="sm-table analytics-source-table">
              <thead><tr><th>来源</th><th>平台</th><th>快照</th><th>内容</th><th>曝光</th><th>最近日期</th><th>复盘口径</th></tr></thead>
              <tbody>
                {sourceRows.map((row) => (
                  <tr key={row.source}>
                    <td><strong>{sourceLabel(row.source)}</strong><small>{row.importRunCount} 次导入</small></td>
                    <td>{row.platform === "mixed" ? sourcePlatformLabel(row.platform) : <PlatformBadge platform={row.platform} />}</td>
                    <td>{formatNumber(row.snapshotCount)}</td>
                    <td>{formatNumber(row.contentCount)}</td>
                    <td>{formatNumber(row.views)}</td>
                    <td>{row.latestSnapshotDate?.slice(0, 10) ?? "未标注"}</td>
                    <td><span className={`source-status-pill ${row.includedInReview ? "is-included" : "is-snapshot-only"}`}>{row.includedInReview ? "已参与" : "仅快照"}</span></td>
                  </tr>
                ))}
                {sourceRows.length === 0 && <tr><td colSpan={7}>暂无导入快照来源，完成平台导入后可查看来源贡献。</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="source-status-list" aria-label="最近导入参与统计状态">
            <strong>最近导入</strong>
            {latestImportRows.map(({ run, group }) => (
              <div className="source-status-row" key={run.id}>
                <span>{sourceLabel(run.source)}</span>
                <b>{formatNumber(run.importedCount)} 条</b>
                <small>{group?.includedInReview ? "已进入复盘口径" : "等待指标快照"}</small>
              </div>
            ))}
            {latestImportRows.length === 0 && <p className="muted">暂无可解释的最近导入记录。</p>}
          </div>
        </div>
      </Panel>

      <Panel className="dashboard-ranking" data-testid="dashboard-content-ranking" title="内容表现排行" eyebrow="内容榜单">
        <div className="table-wrap">
          <table className="sm-table">
            <thead><tr><th>内容</th><th>平台</th><th>发布时间</th><th>最近保存</th><th>曝光/观看</th><th>互动</th><th>互动率</th><th>快照</th></tr></thead>
            <tbody>
              {rankedContents.slice(0, 8).map((row) => {
                return (
                  <tr
                    data-content-id={row.content.id}
                    data-engagement={row.engagement}
                    data-platform={row.content.platform}
                    data-testid="dashboard-content-ranking-row"
                    data-views={row.views}
                    key={row.content.id}
                  >
                    <td><strong>{row.content.title}</strong><small>{row.content.topic}</small></td>
                    <td><PlatformBadge platform={row.content.platform} /></td>
                    <td>{row.content.publishedAt ? row.content.publishedAt.slice(0, 10) : "未标注"}</td>
                    <td>{row.latest.updatedAt ? row.latest.updatedAt.slice(0, 10) : row.latest.date.slice(0, 10)}</td>
                    <td>{formatNumber(row.views)}</td>
                    <td>{formatNumber(row.engagement)}</td>
                    <td>{formatPercent(row.engagementRate)}</td>
                    <td>{row.signal} / 最新快照</td>
                  </tr>
                );
              })}
              {rankedContents.length === 0 && <tr><td colSpan={8}>当前时间窗口暂无可信作品指标。</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="日周月指标表" eyebrow="平台后台粒度">
        <div className="analytics-table-sections">
          {periodTables.map((section, index) => (
            <details className="analytics-data-section" key={section.id} open={index === 0}>
              <summary>
                <span>
                  <strong>{section.title}</strong>
                  <small>曝光、互动、粉丝变化和内容数</small>
                </span>
                <i>{section.rows.length} 行</i>
              </summary>
              <div className="table-wrap">
                <table className="sm-table analytics-period-table">
                  <thead>
                    <tr><th>周期</th><th>内容数</th><th>曝光</th><th>点赞</th><th>评论</th><th>收藏</th><th>分享</th><th>粉丝变化</th><th>互动率</th></tr>
                  </thead>
                  <tbody>
                    {section.rows.slice(0, 8).map((row) => (
                      <tr key={row.key}>
                        <td><strong>{row.label}</strong></td>
                        <td>{row.contentCount}</td>
                        <td>{formatNumber(row.views)}</td>
                        <td>{formatNumber(row.likes)}</td>
                        <td>{formatNumber(row.comments)}</td>
                        <td>{formatNumber(row.saves)}</td>
                        <td>{formatNumber(row.shares)}</td>
                        <td>{formatNumber(row.followersDelta)}</td>
                        <td>{formatPercent(row.views > 0 ? (row.engagement / row.views) * 100 : 0)}</td>
                      </tr>
                    ))}
                    {section.rows.length === 0 && <tr><td colSpan={9}>暂无该粒度指标，先完成平台数据导入。</td></tr>}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </Panel>

      <Panel title="平台原生字段预览" eyebrow="数据回收模板">
        <p className="muted">按抖音、小红书、视频号、B站导入快照优先展示；当前只展示内容级可信指标，不混入账号趋势。</p>
        <div className="table-wrap">
          <table className="sm-table analytics-native-table">
            <thead><tr><th>平台</th><th>发布时间</th><th>最近抓取/保存</th><th>内容</th><th>主指标</th><th>点赞</th><th>评论</th><th>收藏/收藏类</th><th>分享/转发</th><th>粉丝/关注</th></tr></thead>
            <tbody>
              {nativeRows.map((row, index) => {
                const labels = nativeMetricLabels(row.platform);
                const content = contentsById.get(row.contentId);
                return (
                  <tr key={`${row.platform}-${row.contentId}-${row.date}-${index}`}>
                    <td><PlatformBadge platform={row.platform} /></td>
                    <td>{content?.publishedAt ? content.publishedAt.slice(0, 10) : "未标注"}</td>
                    <td>{row.updatedAt ? row.updatedAt.slice(0, 10) : row.date ? row.date.slice(0, 10) : "未标注"}</td>
                    <td><strong>{titleMap.get(row.contentId) ?? row.contentId}</strong><small>{row.kind === "metric_snapshot" ? sourceLabel(row.source) : "复盘口径指标"}</small></td>
                    <td><strong>{formatNumber(row.views)}</strong><small>{labels.primary}</small></td>
                    <td>{formatNumber(row.likes)}</td>
                    <td>{formatNumber(row.comments)}</td>
                    <td><strong>{formatNumber(row.saves)}</strong><small>{labels.save}</small></td>
                    <td><strong>{formatNumber(row.shares)}</strong><small>{labels.share}</small></td>
                    <td><strong>{formatNumber(row.followersDelta)}</strong><small>{labels.follower}</small></td>
                  </tr>
                );
              })}
              {nativeRows.length === 0 && <tr><td colSpan={10}>暂无平台原生字段预览。</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="经营洞察" eyebrow="下一步判断">
        <div className="dashboard-insight-list">
          <article>
            <strong>平台选择</strong>
            <p className="muted">{strongestPlatformText(platformData, totalViews)}下一轮排期应保留该平台适配版本。</p>
          </article>
          <article>
            <strong>内容判断</strong>
            <p className="muted">{topContent ? `《${topContent.content.title}》已形成可复用样本，建议拆出标题、选题和封面变量。` : "暂无足够内容样本，先完成导入后再观察排行。"}</p>
          </article>
          <article>
            <strong>运营风险</strong>
            <p className="muted">{engagementRate < 5 ? "互动率偏低，需要复核选题钩子和平台评论反馈。" : "互动率处于可复盘区间，可以进入复盘页沉淀行动项。"}</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}
