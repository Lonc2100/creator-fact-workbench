"use client";

import { useState } from "react";
import type { DashboardSnapshot, PlatformReadinessStage, ReviewActionItem, TrustedWeeklySafeReportResponse } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { formatDateTime, formatNumber } from "../foundations/format";
import { actionStatusLabels, platformLabels } from "../foundations/labels";
import { MetricDashboardGrid } from "../patterns/MetricDashboardGrid";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";
import { StatusBadge } from "../components/StatusBadge";

function readinessTone(stage: PlatformReadinessStage) {
  if (stage === "closed_loop") return "success";
  if (stage === "preview_ready") return "info";
  if (stage === "discovery_only") return "warning";
  return "neutral";
}

function trustedAuditTone(status: DashboardSnapshot["trustedOperatingStatus"]["audit"]["status"]) {
  if (status === "pass") return "success";
  if (status === "fail" || status === "error") return "danger";
  return "warning";
}

function trustedAuditLabel(status: DashboardSnapshot["trustedOperatingStatus"]["audit"]["status"]) {
  if (status === "pass") return "数据一致";
  return "需复核";
}

function dailyGateTone(status: DashboardSnapshot["dailyPlatformOpsGate"]["status"]) {
  if (status === "pass") return "success";
  if (status === "missing") return "info";
  return "danger";
}

function dailyGateLabel(status: DashboardSnapshot["dailyPlatformOpsGate"]["status"]) {
  if (status === "pass") return "运营数据可用";
  if (status === "fail") return "运营数据需复核";
  if (status === "error") return "检查异常";
  return "待检查";
}

type DailyChecklistTone = "neutral" | "info" | "success" | "warning" | "danger";

interface DailyChecklistRow {
  key: string;
  label: string;
  tone: DailyChecklistTone;
  status: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
}

const operatorDashboardUrl = "http://127.0.0.1:3200/dashboard";
const operatorDashboardApiUrl = "http://127.0.0.1:3200/api/self-media/dashboard";
const localServerHealthCommand = "npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page";
const dailySelfMediaOpsCommand = "npm run ops:daily-self-media -- --preflight-health";
const trustedDashboardAuditCommand = `npm run audit:trusted-dashboard -- --dashboard-url=${operatorDashboardApiUrl}`;
const dailyPlatformOpsGateCommand = `npm run gate:daily-platform-ops -- --dashboard-url=${operatorDashboardApiUrl}`;

function platformDataHealthTone(status: DashboardSnapshot["platformDataHealth"]["status"], staleCount: number): DailyChecklistTone {
  if (status === "ok" && staleCount === 0) return "success";
  if (status === "missing") return "info";
  if (status === "error") return "danger";
  return "warning";
}

function dailyOpsTone(status: DashboardSnapshot["dailySelfMediaOps"]["status"]): DailyChecklistTone {
  if (status === "pass") return "success";
  if (status === "warn") return "warning";
  if (status === "missing") return "info";
  return "danger";
}

function captureScheduleTone(status: DashboardSnapshot["dataCaptureScheduleReliability"]["status"]): DailyChecklistTone {
  if (status === "fresh") return "success";
  if (status === "failed") return "danger";
  if (status === "missing") return "info";
  return "warning";
}

function platformDataHealthLabel(status: DashboardSnapshot["platformDataHealth"]["status"], staleCount: number) {
  if (status === "ok" && staleCount === 0) return "新鲜";
  if (status === "missing") return "待采集";
  if (status === "error") return "需修复";
  return "需复核";
}

function dailyOpsLabel(status: DashboardSnapshot["dailySelfMediaOps"]["status"]) {
  if (status === "pass") return "闭环正常";
  if (status === "warn") return "有提醒";
  if (status === "missing") return "待检查";
  return "需复核";
}

function businessIssueSummary(input: string | undefined, fallback: string) {
  if (!input) return fallback;
  if (/(^|[\s:/.-])(preflight|pageReady|apiReady|smoke|fixture|demo|fake|command|exitCode|audit|port)([\s:/.-]|$)|\.local|report\.json|report\.md|http:\/\/127\.0\.0\.1|\/api\/self-media|npm run|runId|rawDir|evidenceFile|ops gate|daily platform ops/i.test(input)) {
    return "运营数据需要复核，内部细节已收起到高级诊断。";
  }
  return input;
}

function versionStatusLabel(status: DashboardSnapshot["platformVersions"][number]["status"]) {
  const labels: Record<DashboardSnapshot["platformVersions"][number]["status"], string> = {
    draft: "草稿",
    needs_review: "待审核",
    scheduled: "待发布",
    published: "已发布",
    failed: "发布失败",
    blocked: "阻塞"
  };
  return labels[status];
}

function publishRecordStatusLabel(status: DashboardSnapshot["publishRecords"][number]["status"]) {
  const labels: Record<DashboardSnapshot["publishRecords"][number]["status"], string> = {
    submitted_review: "已提交审核",
    published: "已发布",
    failed: "失败",
    blocked: "阻塞",
    confirmed: "已确认"
  };
  return labels[status];
}

function isActiveContentPlatform(platform: DashboardSnapshot["publishRecords"][number]["platform"]) {
  return platform === "douyin" || platform === "xiaohongshu" || platform === "video_account" || platform === "bilibili";
}

function isPausedWechatActionItem(item: ReviewActionItem) {
  const text = [
    item.title,
    item.nextAction,
    item.relatedType,
    item.relatedId,
    item.platformVersionId,
    item.publishQueueItemId,
    ...(item.evidence ?? []).map((evidence) => evidence.platform)
  ].filter(Boolean).join(" ");
  return /(公众号|微信后台|wechat|wechat_official)/i.test(text);
}

function buildDailyChecklistRows(snapshot: DashboardSnapshot): DailyChecklistRow[] {
  const preflight = snapshot.dailySelfMediaOps.preflightHealth;
  const pageReady3200 = preflight.pageReadyPorts.includes(3200);
  const apiReady3200 = preflight.apiReadyPorts.includes(3200);
  const trustedDataReady3200 = preflight.trustedDataReadyPorts.includes(3200);
  const healthOk = pageReady3200 && apiReady3200 && trustedDataReady3200;
  const captureSchedule = snapshot.dataCaptureScheduleReliability;
  const latestRealCaptureAt = snapshot.platformDataHealth.summary.freshness.latestRealCaptureAt;
  const realCaptureStaleCount = snapshot.platformDataHealth.summary.realCaptureStaleCount;
  const activeActions = snapshot.actionItems.filter((item) => !isPausedWechatActionItem(item) && !["done", "dropped"].includes(item.status));
  const highActions = activeActions.filter((item) => item.priority === "high").length;
  const reviewDrafts = snapshot.platformVersions.filter((item) => item.status === "draft" || item.status === "needs_review");
  const scheduledVersions = snapshot.platformVersions.filter((item) => item.status === "scheduled");
  const scheduledCalendarItems = snapshot.calendarItems.filter((item) => item.status === "scheduled");
  const latestRecord = [...snapshot.publishRecords]
    .filter((record) => isActiveContentPlatform(record.platform))
    .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())[0];

  return [
    {
      key: "operator-health",
      label: "数据服务",
      tone: healthOk ? "success" : preflight.status === "fail" || preflight.status === "error" ? "danger" : "warning",
      status: healthOk ? "可用" : "需复核",
      detail: healthOk ? "看板访问与可信数据均可用。" : "看板数据连接需要复核；不会采用空库或不可用页面。",
      href: "/import",
      hrefLabel: "查看导入状态"
    },
    {
      key: "real-data-freshness",
      label: "数据新鲜度",
      tone: platformDataHealthTone(snapshot.platformDataHealth.status, realCaptureStaleCount),
      status: platformDataHealthLabel(snapshot.platformDataHealth.status, realCaptureStaleCount),
      detail: `最近真实采集 ${formatDateTime(latestRealCaptureAt ?? undefined)}；过期平台 ${formatNumber(realCaptureStaleCount)} 个`,
      href: "/import",
      hrefLabel: "查看导入状态"
    },
    {
      key: "data-capture-schedule",
      label: "抓取节奏",
      tone: captureScheduleTone(captureSchedule.status),
      status: captureSchedule.statusLabel,
      detail: `建议每 ${formatNumber(captureSchedule.suggestedFrequencyHours)} 小时检查；下次建议 ${formatDateTime(captureSchedule.nextSuggestedAt ?? undefined)}；${captureSchedule.startupCatchUpRequired ? "开机后先补抓" : "开机后无需补抓"}`,
      href: "/import",
      hrefLabel: "查看抓取状态"
    },
    {
      key: "daily-ops",
      label: "运营闭环",
      tone: dailyOpsTone(snapshot.dailySelfMediaOps.status),
      status: dailyOpsLabel(snapshot.dailySelfMediaOps.status),
      detail: businessIssueSummary(snapshot.dailySelfMediaOps.blockingReasons[0] ?? snapshot.dailySelfMediaOps.warnings[0], "每日运营闭环无阻塞项。"),
      href: "/import",
      hrefLabel: "查看导入状态"
    },
    {
      key: "trusted-audit",
      label: "数据一致性",
      tone: trustedAuditTone(snapshot.trustedOperatingStatus.audit.status),
      status: trustedAuditLabel(snapshot.trustedOperatingStatus.audit.status),
      detail: `${formatNumber(snapshot.trustedOperatingStatus.trustedContentCount)} 内容 / ${formatNumber(snapshot.trustedOperatingStatus.trustedMetricSnapshotCount)} 快照 / ${formatNumber(snapshot.trustedOperatingStatus.views)} 曝光 / ${formatNumber(snapshot.trustedOperatingStatus.engagement)} 互动；本地发布台账不改变指标。`,
      href: "/reviews",
      hrefLabel: "查看复盘"
    },
    {
      key: "platform-gate",
      label: "平台运营门禁",
      tone: dailyGateTone(snapshot.dailyPlatformOpsGate.status),
      status: dailyGateLabel(snapshot.dailyPlatformOpsGate.status),
      detail: businessIssueSummary(snapshot.dailyPlatformOpsGate.blockingReasons[0] ?? snapshot.dailyPlatformOpsGate.warnings[0], "平台运营门禁无阻塞。"),
      href: "/import",
      hrefLabel: "查看导入状态"
    },
    {
      key: "action-items",
      label: "待处理行动项",
      tone: highActions > 0 ? "danger" : activeActions.length > 0 ? "warning" : "success",
      status: `${formatNumber(activeActions.length)} 待推进`,
      detail: highActions > 0 ? `${formatNumber(highActions)} 个高优先级；先处理业务行动项。` : "复盘/导入建议转出的业务行动项只在人工确认后推进。",
      href: "/dashboard",
      hrefLabel: "查看任务"
    },
    {
      key: "drafts",
      label: "待审核草稿",
      tone: reviewDrafts.length > 0 ? "warning" : "success",
      status: `${formatNumber(reviewDrafts.length)} 待审核`,
      detail: reviewDrafts[0] ? `${platformLabels[reviewDrafts[0].platform]} / ${versionStatusLabel(reviewDrafts[0].status)} / ${formatDateTime(reviewDrafts[0].updatedAt)}` : "当前没有待审核平台草稿。",
      href: "/content",
      hrefLabel: "打开内容台"
    },
    {
      key: "scheduled",
      label: "待发布排期",
      tone: scheduledVersions.length > 0 || scheduledCalendarItems.length > 0 ? "warning" : "success",
      status: `${formatNumber(Math.max(scheduledVersions.length, scheduledCalendarItems.length))} 待人工发布`,
      detail: scheduledCalendarItems[0] ? `${platformLabels[scheduledCalendarItems[0].platform]} / ${formatDateTime(scheduledCalendarItems[0].scheduledAt)}` : "当前没有待人工确认发布的排期。",
      href: "/calendar",
      hrefLabel: "打开日历"
    },
    {
      key: "publish-ledger",
      label: "最近发布记录",
      tone: latestRecord?.status === "failed" || latestRecord?.status === "blocked" ? "danger" : latestRecord ? "info" : "neutral",
      status: latestRecord ? publishRecordStatusLabel(latestRecord.status) : "暂无记录",
      detail: latestRecord ? `${platformLabels[latestRecord.platform]} / ${formatDateTime(latestRecord.happenedAt)} / ${latestRecord.confirmationSource ?? "manual"}；台账不改变曝光和互动指标。` : "人工确认发布后才会生成本地台账记录。",
      href: "/calendar",
      hrefLabel: "查看台账"
    }
  ];
}

function DailyOperatingChecklistPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const rows = buildDailyChecklistRows(snapshot);
  const blockingRows = rows.filter((row) => row.tone === "danger" || row.tone === "warning").length;
  const recentRecords = [...snapshot.publishRecords]
    .filter((record) => isActiveContentPlatform(record.platform))
    .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
    .slice(0, 3);

  return (
    <Panel
      className="daily-operating-checklist-panel"
      title="今日数据动作"
      eyebrow="运营提醒"
      action={<span className="analytics-panel-action">{formatNumber(blockingRows)} 项需关注</span>}
    >
      <div className="metric-strip" data-testid="daily-operating-checklist">
        <span><b>{formatNumber(snapshot.trustedOperatingStatus.trustedContentCount)}</b> 可信内容</span>
        <span><b>{formatNumber(snapshot.trustedOperatingStatus.trustedMetricSnapshotCount)}</b> 指标快照</span>
        <span><b>{formatNumber(snapshot.actionItems.filter((item) => !["done", "dropped"].includes(item.status)).length)}</b> 待推进任务</span>
        <span><b>{formatNumber(snapshot.platformVersions.filter((item) => item.status === "draft" || item.status === "needs_review").length)}</b> 待审核草稿</span>
        <span><b>{formatNumber(snapshot.platformVersions.filter((item) => item.status === "scheduled").length)}</b> 待发布排期</span>
        <span><b>{formatNumber(snapshot.publishRecords.length)}</b> 发布台账</span>
      </div>
      <div className="table-wrap">
        <table className="sm-table" aria-label="每日运营检查清单">
          <thead>
            <tr>
              <th>状态</th>
              <th>事项</th>
              <th>今天先看什么</th>
              <th>只读动作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td><Badge tone={row.tone}>{row.status}</Badge></td>
                <td><strong>{row.label}</strong></td>
                <td>{row.detail}</td>
                <td>
                  <div className="inline-stack">
                    {row.href && <a className="sm-button sm-button-secondary" href={row.href}>{row.hrefLabel ?? "打开"}</a>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="trusted-weekly-summary-foot">
        <span>看板只展示状态，采集、发布和结果确认仍由人工完成。</span>
        <span>发布台账不改变曝光和互动指标。</span>
      </div>
      {recentRecords.length > 0 && (
        <div className="trusted-weekly-platforms" aria-label="最近发布台账">
          {recentRecords.map((record) => (
            <div className="trusted-weekly-platform" key={record.id}>
              <PlatformBadge platform={record.platform} />
              <span>{publishRecordStatusLabel(record.status)}</span>
              <small>{formatDateTime(record.happenedAt)} / {record.confirmationSource ?? "manual"}</small>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PublishExecutionDashboardPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const workbench = snapshot.publishToMetricsWorkbench;
  const items = workbench.executionItems.slice(0, 5);
  return (
    <Panel
      className="publish-execution-dashboard-panel"
      title="今日/近期待发布"
      eyebrow="发布执行台"
      action={<span className="analytics-panel-action">{formatNumber(items.length)} 条待处理</span>}
    >
      <div className="metric-strip" data-testid="dashboard-publish-execution-workbench">
        <span><b>{formatNumber(workbench.executionItems.filter((item) => item.status === "scheduled").length)}</b> 待人工发布</span>
        <span><b>{formatNumber(workbench.postPublishRefresh.length)}</b> 发布后待抓取</span>
        <span><b>{formatNumber(workbench.matchCandidates.length)}</b> 候选匹配</span>
      </div>
      <div className="trusted-weekly-platforms" aria-label="发布执行台列表">
        {items.map((item) => (
          <div className="trusted-weekly-platform" key={item.platformVersionId}>
            <PlatformBadge platform={item.platform} />
            <span>{item.contentTitle}</span>
            <small>{versionStatusLabel(item.status)} / {formatDateTime(item.scheduledAt ?? item.publishedAt)}</small>
            <a className="sm-button sm-button-secondary" href={item.contentUrl}>打开内容编辑</a>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="muted">暂无到期排期或发布后待回收指标内容。</p>}
      <div className="trusted-weekly-summary-foot">
        <span>{workbench.manualRefreshCopy}</span>
        <a className="sm-button sm-button-primary" href="/import#post-publish-refresh">去手动抓取最新数据</a>
      </div>
    </Panel>
  );
}

function DashboardSecondaryOperationsPanel({
  snapshot,
  busySuggestionId,
  busyActionId,
  statusFilter,
  sourceFilter,
  onCreateActionItem,
  onActionToContent,
  onActionStatus,
  onStatusFilter,
  onSourceFilter
}: {
  snapshot: DashboardSnapshot;
  busySuggestionId?: string;
  busyActionId?: string;
  statusFilter: ReviewActionItem["status"] | "active" | "all";
  sourceFilter: keyof typeof actionSourceFilterLabels;
  onCreateActionItem: (suggestionId: string) => Promise<void>;
  onActionToContent: (item: ReviewActionItem) => Promise<void>;
  onActionStatus: (item: ReviewActionItem, status: ReviewActionItem["status"]) => Promise<void>;
  onStatusFilter: (status: ReviewActionItem["status"] | "active" | "all") => void;
  onSourceFilter: (source: keyof typeof actionSourceFilterLabels) => void;
}) {
  return (
    <details className="dashboard-secondary-operations" data-testid="dashboard-secondary-operations">
      <summary>
        <span>
          <strong>运营动作与发布交接</strong>
          <small>任务、发布台账和行动项默认收起，不占用数据看板。</small>
        </span>
        <i>展开</i>
      </summary>
      <div className="dashboard-secondary-operations-body">
        <StartCreatorDayFlowPanel snapshot={snapshot} />
        <DailyOperatingChecklistPanel snapshot={snapshot} />
        <PublishExecutionDashboardPanel snapshot={snapshot} />
        <div className="dashboard-action-grid">
          <PostImportActionSuggestionsPanel busySuggestionId={busySuggestionId} onCreateActionItem={onCreateActionItem} snapshot={snapshot} />
          <ActionTasksOperatingPanel
            busyActionId={busyActionId}
            onActionToContent={onActionToContent}
            onActionStatus={onActionStatus}
            onSourceFilter={onSourceFilter}
            onStatusFilter={onStatusFilter}
            snapshot={snapshot}
            sourceFilter={sourceFilter}
            statusFilter={statusFilter}
          />
        </div>
      </div>
    </details>
  );
}

function StartCreatorDayFlowPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const workbench = snapshot.publishToMetricsWorkbench;
  const scheduledCount = workbench.executionItems.filter((item) => item.status === "scheduled").length;
  const refreshCount = workbench.postPublishRefresh.length;
  const matchCount = workbench.matchCandidates.length;
  const nextItem = workbench.executionItems[0];
  return (
    <Panel
      className="daily-operating-checklist-panel"
      title="开始今天创作流程"
      eyebrow="当前任务 / 下一步动作"
      action={<span className="analytics-panel-action">{formatNumber(scheduledCount + refreshCount + matchCount)} 项待推进</span>}
    >
      <div className="metric-strip">
        <span><b>1</b> 新视频</span>
        <span><b>{formatNumber(scheduledCount)}</b> 待人工发布</span>
        <span><b>{formatNumber(refreshCount)}</b> 发布后回收</span>
        <span><b>{formatNumber(matchCount)}</b> 指标匹配</span>
      </div>
      <div className="trusted-weekly-summary-foot">
        <span>{nextItem ? `建议先处理：${nextItem.contentTitle} / ${platformLabels[nextItem.platform]} / ${nextItem.nextAction}` : "从新视频开始：写想法、生成四平台版本、放进日历，再按手动发布助手执行。"}</span>
        <div className="inline-stack">
          <a className="sm-button sm-button-primary" href="/content#new-video">开始新视频</a>
          <a className="sm-button sm-button-secondary" href="/calendar">打开日历</a>
          <a className="sm-button sm-button-secondary" href="/import#post-publish-refresh">回收发布数据</a>
        </div>
      </div>
    </Panel>
  );
}

function TrustedOperatingStrip({ snapshot }: { snapshot: DashboardSnapshot }) {
  const status = snapshot.trustedOperatingStatus;
  const dailyGate = snapshot.dailyPlatformOpsGate;
  return (
    <section
      className="trusted-operating-strip"
      aria-label="可信运营状态"
      data-engagement={status.engagement}
      data-testid="dashboard-trusted-status"
      data-trusted-content-count={status.trustedContentCount}
      data-trusted-metric-snapshot-count={status.trustedMetricSnapshotCount}
      data-views={status.views}
    >
      <div className="trusted-operating-main">
        <Badge tone={status.isDefaultDashboardTrusted ? "success" : "warning"}>真实四平台内容级数据</Badge>
        <Badge tone="info">非全库汇总</Badge>
        <strong>默认运营看板只算抖音 / 小红书 / 视频号 / B站创作中心内容快照</strong>
        <Badge tone={trustedAuditTone(status.audit.status)}>{trustedAuditLabel(status.audit.status)}</Badge>
        <Badge tone={dailyGateTone(dailyGate.status)}>{dailyGateLabel(dailyGate.status)}</Badge>
      </div>
      <div className="trusted-operating-kpis">
        <span><b>{formatNumber(status.trustedContentCount)}</b> 真实内容进入看板</span>
        <span><b>{formatNumber(status.trustedMetricSnapshotCount)}</b> 内容级快照</span>
        <span><b>{formatNumber(status.views)}</b> 真实曝光</span>
        <span><b>{formatNumber(status.engagement)}</b> 真实互动</span>
        <span><b>{formatDateTime(status.audit.generatedAt ?? undefined)}</b> 最近一致性检查</span>
        <span><b>{formatDateTime(dailyGate.generatedAt ?? undefined)}</b> 最近运营检查</span>
      </div>
    </section>
  );
}

function PlatformReadinessPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const statuses = snapshot.platformReadinessStatuses;
  const closedLoopCount = statuses.filter((item) => item.stage === "closed_loop").length;
  return (
    <Panel
      className="platform-readiness-panel"
      title="平台成熟度"
      eyebrow="Platform readiness"
      action={<span className="analytics-panel-action">{closedLoopCount} 个平台已闭环</span>}
    >
      <div className="platform-readiness-summary">
        <span><b>{formatNumber(statuses.length)}</b> 平台</span>
        <span><b>{formatNumber(statuses.filter((item) => item.stage === "discovery_only").length)}</b> 仅发现</span>
        <span><b>{formatNumber(statuses.filter((item) => item.stage === "paused").length)}</b> 暂停</span>
      </div>
      <div className="platform-readiness-grid">
        {statuses.map((item) => (
          <article className="platform-readiness-card" key={item.platform}>
            <header>
              <PlatformBadge platform={item.platform} />
              <Badge tone={readinessTone(item.stage)}>{item.stageLabel}</Badge>
            </header>
            <div className="platform-readiness-metrics">
              <span><b>{formatNumber(item.contentCount)}</b> 内容</span>
              <span><b>{formatNumber(item.metricCount)}</b> 指标</span>
              <span>{item.enteredDashboardReview ? "已入看板/复盘" : "未入复盘"}</span>
            </div>
            <dl>
              <div><dt>发现</dt><dd>{item.discoveryStatus}</dd></div>
              <div><dt>保存</dt><dd>{item.mappingStatus} / {item.saveStatus}</dd></div>
              <div><dt>运营</dt><dd>{item.dashboardReviewStatus} / {item.operationsStatus}</dd></div>
            </dl>
            <footer>
              <small>{item.source ?? "paused"} · {formatDateTime(item.latestRunAt)} / {item.latestStatus ?? "never"}</small>
              <code>{item.evidenceFile}</code>
            </footer>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function TrustedWeeklySummaryPanel({
  snapshot,
  safeReportBusy,
  safeReportMarkdown,
  onCopySafeReport,
  onViewSafeReport
}: {
  snapshot: DashboardSnapshot;
  safeReportBusy: boolean;
  safeReportMarkdown: string;
  onCopySafeReport: () => Promise<void>;
  onViewSafeReport: () => Promise<void>;
}) {
  const summary = snapshot.trustedWeeklySummary;
  return (
    <Panel
      className="trusted-weekly-summary-panel"
      data-engagement={summary.engagement}
      data-testid="dashboard-weekly-summary"
      data-trusted-content-count={summary.trustedContentCount}
      data-trusted-metric-snapshot-count={summary.trustedMetricSnapshotCount}
      data-views={summary.views}
      title="周报摘要"
      eyebrow="本周复盘"
      action={<span className="analytics-panel-action">安全摘要</span>}
    >
      <div className="trusted-weekly-summary-head">
        <strong>本周摘要只展示可分享的汇总指标和平台结构；完整内部证据默认不展开。</strong>
        <div className="trusted-weekly-actions">
          <Button disabled={safeReportBusy} onClick={onViewSafeReport} variant="secondary">
            {safeReportBusy ? "读取中" : safeReportMarkdown ? "刷新安全摘要" : "查看安全摘要"}
          </Button>
          <Button disabled={safeReportBusy} onClick={onCopySafeReport} variant="primary">复制安全摘要</Button>
        </div>
      </div>
      <div className="trusted-weekly-summary-kpis">
        <span><b>{formatNumber(summary.trustedContentCount)}</b> 可信内容</span>
        <span><b>{formatNumber(summary.trustedMetricSnapshotCount)}</b> 内容级快照</span>
        <span><b>{formatNumber(summary.views)}</b> 曝光</span>
        <span><b>{formatNumber(summary.engagement)}</b> 互动</span>
        <span><b>{formatDateTime(summary.freshness.latestAuditAt ?? undefined)}</b> 最近检查</span>
        <span><b>{formatNumber(summary.excluded.excludedContentCount)}</b> 不进运营看板内容</span>
      </div>
      <div className="trusted-weekly-platforms" aria-label="安全周报平台概览">
        {summary.platformOverview.map((item) => (
          <div
            className="trusted-weekly-platform"
            data-content-count={item.contentCount}
            data-engagement={item.engagement}
            data-metric-snapshot-count={item.metricSnapshotCount}
            data-platform={item.platform}
            data-testid="dashboard-weekly-platform-row"
            data-views={item.views}
            key={item.platform}
          >
            <PlatformBadge platform={item.platform} />
            <span>{formatNumber(item.views)} 曝光</span>
            <span>{item.viewShare}%</span>
            <small>{formatNumber(item.contentCount)} 内容 / {formatNumber(item.metricSnapshotCount)} 快照</small>
          </div>
        ))}
      </div>
      <div className="trusted-weekly-summary-foot">
        <span>真实采集：{formatDateTime(summary.freshness.latestRealCaptureAt ?? undefined)}</span>
        <span>过期平台：{formatNumber(summary.freshness.realCaptureStaleCount)}</span>
        <span>用户排除：{formatNumber(summary.excluded.userExcludedContentCount)}</span>
        <span>标题已移除：{summary.redaction.contentTitlesIncluded ? "否" : "是"}</span>
      </div>
      {safeReportMarkdown && (
        <pre className="trusted-weekly-safe-preview" data-testid="trusted-weekly-safe-preview">{safeReportMarkdown}</pre>
      )}
    </Panel>
  );
}

function accountMetricSourceLabel(source: DashboardSnapshot["accountMetricGroups"][number]["source"]) {
  const labels: Record<string, string> = {
    bilibili_creator_center: "B站创作中心",
    douyin_creator_center: "抖音创作者中心",
    xiaohongshu_creator_center: "小红书创作者中心",
    video_account_creator_center: "视频号助手",
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

function AccountMetricTrendPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const groups = snapshot.accountMetricGroups.filter((group) => isActiveContentPlatform(group.platform)).slice(0, 6);
  const totals = groups.reduce(
    (current, group) => ({
      views: current.views + group.views,
      engagement: current.engagement + group.engagement,
      followersDelta: current.followersDelta + group.followersDelta
    }),
    { views: 0, engagement: 0, followersDelta: 0 }
  );
  return (
    <Panel
      className="account-metric-trend-panel"
      title="账号趋势"
      eyebrow="账号级数据"
      action={<span className="analytics-panel-action">{formatNumber(snapshot.accountMetricSnapshots.length)} 条账号快照</span>}
    >
      {groups.length === 0 ? (
        <div className="account-metric-empty sm-empty-state">
          <strong>暂无真实账号快照</strong>
          <p>账号级趋势会单独展示平台、来源和日期，不会计入内容级曝光总量。</p>
        </div>
      ) : (
        <>
          <div className="account-metric-summary">
            <span><b>{formatNumber(totals.views)}</b> 账号曝光</span>
            <span><b>{formatNumber(totals.engagement)}</b> 账号互动</span>
            <span><b>{formatNumber(totals.followersDelta)}</b> 粉丝变化</span>
            <span>独立账号级，不计入内容复盘总量</span>
          </div>
          <div className="table-wrap account-metric-table">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>平台</th>
                  <th>来源</th>
                  <th>日期</th>
                  <th>快照</th>
                  <th>曝光</th>
                  <th>点赞</th>
                  <th>评论</th>
                  <th>收藏</th>
                  <th>分享</th>
                  <th>粉丝变化</th>
                  <th>复盘</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={`${group.platform}-${group.source}-${group.date}`}>
                    <td><PlatformBadge platform={group.platform} /></td>
                    <td><strong>{accountMetricSourceLabel(group.source)}</strong></td>
                    <td>{group.date}</td>
                    <td>{formatNumber(group.snapshotCount)}</td>
                    <td>{formatNumber(group.views)}</td>
                    <td>{formatNumber(group.likes)}</td>
                    <td>{formatNumber(group.comments)}</td>
                    <td>{formatNumber(group.saves)}</td>
                    <td>{formatNumber(group.shares)}</td>
                    <td>{formatNumber(group.followersDelta)}</td>
                    <td><span className="source-status-pill is-snapshot-only">账号级独立</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

function DashboardAdvancedDiagnosticsPanel({
  snapshot,
  onCopyCommand
}: {
  snapshot: DashboardSnapshot;
  onCopyCommand: (label: string, command: string) => Promise<void>;
}) {
  const preflight = snapshot.dailySelfMediaOps.preflightHealth;
  const diagnostics = [
    { label: "operator dashboard", value: operatorDashboardUrl },
    { label: "dashboard api", value: operatorDashboardApiUrl },
    { label: "daily ops report.json", value: snapshot.dailySelfMediaOps.reportPath },
    { label: "daily platform gate report.json", value: snapshot.dailyPlatformOpsGate.reportPath },
    { label: "trusted weekly report.md", value: snapshot.trustedWeeklySummary.localEvidencePath },
    { label: "trusted weekly redacted report.md", value: snapshot.trustedWeeklySummary.redactedSummaryPath },
    { label: "preflight pageReady", value: preflight.pageReadyPorts.join(",") || "none" },
    { label: "preflight apiReady", value: preflight.apiReadyPorts.join(",") || "none" },
    { label: "preflight preferred url", value: preflight.preferredDashboardUrl ?? "none" }
  ];
  const commands = [
    { label: "health", command: localServerHealthCommand },
    { label: "daily ops", command: dailySelfMediaOpsCommand },
    { label: "trusted audit", command: trustedDashboardAuditCommand },
    { label: "platform gate", command: dailyPlatformOpsGateCommand }
  ];
  return (
    <details className="dashboard-advanced-diagnostics" data-testid="dashboard-advanced-diagnostics">
      <summary>
        <span>
          <strong>高级诊断</strong>
          <small>展开查看内部运行细节。</small>
        </span>
      </summary>
      <div className="dashboard-advanced-diagnostics-body">
        <Panel title="内部诊断详情" eyebrow="高级诊断">
          <div className="table-wrap">
            <table className="sm-table">
              <thead><tr><th>字段</th><th>值</th></tr></thead>
              <tbody>
                {diagnostics.map((item) => (
                  <tr key={item.label}>
                    <td><strong>{item.label}</strong></td>
                    <td><code>{item.value}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="inline-stack dashboard-diagnostic-command-row">
            {commands.map((item) => (
              <Button key={item.label} onClick={() => onCopyCommand(item.label, item.command)} variant="ghost">
                复制 {item.label}
              </Button>
            ))}
          </div>
        </Panel>
        <PlatformReadinessPanel snapshot={snapshot} />
      </div>
    </details>
  );
}

const suggestionTypeLabels: Record<DashboardSnapshot["postImportActionSuggestions"][number]["type"], string> = {
  reuse_high_performer: "高表现复用",
  review_low_engagement: "低互动复盘",
  platform_priority: "平台优先级",
  bilibili_archives_content: "B站稿件内容",
  data_health_anomaly: "健康异常"
};

const suggestionPriorityLabels: Record<DashboardSnapshot["postImportActionSuggestions"][number]["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低"
};

const actionPriorityLabels: Record<ReviewActionItem["priority"], string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级"
};

const actionStatusFilterLabels: Record<ReviewActionItem["status"] | "active" | "all", string> = {
  active: "待推进",
  all: "全部",
  todo: "待做",
  doing: "进行中",
  done: "已完成",
  dropped: "放弃"
};

const actionSourceFilterLabels = {
  all: "全部来源",
  review: "复盘生成",
  post_import: "导入后建议"
} as const;

function actionSource(item: ReviewActionItem): keyof typeof actionSourceFilterLabels {
  return item.sourceSuggestionId ? "post_import" : "review";
}

function actionSourceLabel(item: ReviewActionItem) {
  return actionSource(item) === "post_import" ? "导入后建议" : "复盘生成";
}

function actionEvidenceCount(item: ReviewActionItem) {
  if (item.evidence?.length) return item.evidence.length;
  return item.relatedType && item.relatedId ? 1 : 0;
}

function evidenceSummary(item: ReviewActionItem) {
  if (item.evidence?.length) {
    const platforms = Array.from(new Set(item.evidence.map((evidence) => platformLabels[evidence.platform])));
    return `${platforms.slice(0, 3).join(" / ")} · ${formatNumber(item.evidence.length)} 条数据证据`;
  }
  if (item.relatedType && item.relatedId) return "已关联复盘证据";
  return "暂无证据引用";
}

function contentWorkflowLabel(item: ReviewActionItem) {
  if (item.contentWorkflowStatus === "scheduled") return "已进入排期";
  if (item.contentWorkflowStatus === "draft_created" || item.contentDraftId) return "已转内容";
  return "未转内容";
}

function filteredActionItems(
  items: ReviewActionItem[],
  statusFilter: ReviewActionItem["status"] | "active" | "all",
  sourceFilter: keyof typeof actionSourceFilterLabels
) {
  return items
    .filter((item) => {
      if (statusFilter === "active") return !["done", "dropped"].includes(item.status);
      if (statusFilter === "all") return true;
      return item.status === statusFilter;
    })
    .filter((item) => sourceFilter === "all" || actionSource(item) === sourceFilter)
    .sort((a, b) => {
      const activeDelta = Number(["done", "dropped"].includes(a.status)) - Number(["done", "dropped"].includes(b.status));
      if (activeDelta !== 0) return activeDelta;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDelta = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

function PostImportActionSuggestionsPanel({
  snapshot,
  busySuggestionId,
  onCreateActionItem
}: {
  snapshot: DashboardSnapshot;
  busySuggestionId?: string;
  onCreateActionItem: (suggestionId: string) => Promise<void>;
}) {
  const suggestions = snapshot.postImportActionSuggestions.slice(0, 5);
  const convertedCount = suggestions.filter((suggestion) => suggestion.convertedToActionItem).length;
  return (
    <Panel
      className="post-import-suggestions-panel"
      title="导入后行动建议"
      eyebrow="导入建议"
      action={<span className="analytics-panel-action">{formatNumber(convertedCount)} / {formatNumber(suggestions.length)} 已转任务</span>}
    >
      {suggestions.length === 0 ? (
        <div className="post-import-suggestions-empty sm-empty-state">
          <strong>暂无可执行建议</strong>
          <p>完成四平台内容级导入后，会基于内容表现、B站稿件内容和数据健康生成下一步动作。</p>
        </div>
      ) : (
        <div className="post-import-suggestion-list">
          {suggestions.map((suggestion) => {
            const firstEvidence = suggestion.evidence[0];
            return (
              <article className={`post-import-suggestion-row priority-${suggestion.priority}`} key={suggestion.id}>
                <div className="post-import-suggestion-main">
                  <div className="post-import-suggestion-title">
                    <Badge tone={suggestion.priority === "high" ? "danger" : suggestion.priority === "medium" ? "warning" : "neutral"}>{suggestionPriorityLabels[suggestion.priority]}</Badge>
                    <strong>{suggestion.title}</strong>
                    <small>{suggestionTypeLabels[suggestion.type]}</small>
                  </div>
                  <p>{suggestion.summary}</p>
                  <span>{suggestion.nextAction}</span>
                </div>
                <div className="post-import-suggestion-evidence">
                  {firstEvidence?.platform && <PlatformBadge platform={firstEvidence.platform} />}
                  <span>{firstEvidence?.platform ? `${platformLabels[firstEvidence.platform]} 数据证据` : "数据证据"}</span>
                  {suggestion.evidence.length > 1 && <small>+{suggestion.evidence.length - 1}</small>}
                  {suggestion.convertedToActionItem ? (
                    <Badge tone="success">已转任务</Badge>
                  ) : (
                    <Button disabled={busySuggestionId === suggestion.id} onClick={() => onCreateActionItem(suggestion.id)} variant="primary">
                      {busySuggestionId === suggestion.id ? "处理中" : "转为任务"}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function ActionTasksOperatingPanel({
  snapshot,
  busyActionId,
  statusFilter,
  sourceFilter,
  onStatusFilter,
  onSourceFilter,
  onActionStatus,
  onActionToContent
}: {
  snapshot: DashboardSnapshot;
  busyActionId?: string;
  statusFilter: ReviewActionItem["status"] | "active" | "all";
  sourceFilter: keyof typeof actionSourceFilterLabels;
  onStatusFilter: (status: ReviewActionItem["status"] | "active" | "all") => void;
  onSourceFilter: (source: keyof typeof actionSourceFilterLabels) => void;
  onActionStatus: (item: ReviewActionItem, status: ReviewActionItem["status"]) => Promise<void>;
  onActionToContent: (item: ReviewActionItem) => Promise<void>;
}) {
  const operatorActionItems = snapshot.actionItems.filter((item) => !isPausedWechatActionItem(item));
  const items = filteredActionItems(operatorActionItems, statusFilter, sourceFilter);
  const activeCount = operatorActionItems.filter((item) => !["done", "dropped"].includes(item.status)).length;
  const postImportCount = operatorActionItems.filter((item) => item.sourceSuggestionId).length;
  return (
    <Panel
      className="action-tasks-operating-panel"
      title="业务行动项"
      eyebrow="行动推进"
      action={<span className="analytics-panel-action">{formatNumber(activeCount)} 待推进 · {formatNumber(postImportCount)} 导入建议</span>}
    >
      <div className="action-task-filter-bar" aria-label="行动项筛选">
        <div className="action-task-filter-group">
          {(["active", "todo", "doing", "done", "dropped", "all"] as const).map((status) => (
            <button className={statusFilter === status ? "is-active" : ""} key={status} onClick={() => onStatusFilter(status)} type="button">
              {actionStatusFilterLabels[status]}
            </button>
          ))}
        </div>
        <div className="action-task-filter-group source">
          {(["all", "review", "post_import"] as const).map((source) => (
            <button className={sourceFilter === source ? "is-active" : ""} key={source} onClick={() => onSourceFilter(source)} type="button">
              {actionSourceFilterLabels[source]}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="action-tasks-empty sm-empty-state">
          <strong>当前筛选下暂无任务</strong>
          <p>保存复盘或手动点击“转为任务”后，任务会出现在这里；不会自动批量创建。</p>
        </div>
      ) : (
        <div className="action-task-list">
          {items.slice(0, 8).map((item) => (
            <article className={`action-task-card priority-${item.priority}`} data-action-item-id={item.id} key={item.id}>
              <header>
                <StatusBadge status={item.status} />
                <Badge tone={item.priority === "high" ? "danger" : item.priority === "medium" ? "warning" : "neutral"}>{actionPriorityLabels[item.priority]}</Badge>
                <span>{actionSourceLabel(item)}</span>
                {item.suggestionType && <small>{suggestionTypeLabels[item.suggestionType]}</small>}
              </header>
              <strong>{item.title}</strong>
              <p>{item.nextAction ?? "等待明确下一步动作。"}</p>
              <div className="action-task-evidence">
                <b>{formatNumber(actionEvidenceCount(item))} 证据引用</b>
                <code>{evidenceSummary(item)}</code>
              </div>
              <div className="action-task-content-link">
                {item.contentDraftId ? (
                  <>
                    <Badge tone={item.contentWorkflowStatus === "scheduled" ? "success" : "neutral"}>{contentWorkflowLabel(item)}</Badge>
                    <a className="action-task-draft-link" href={`/content/?contentId=${encodeURIComponent(item.contentDraftId)}${item.platformVersionId ? `&versionId=${encodeURIComponent(item.platformVersionId)}` : ""}`}>
                      打开内容草稿
                    </a>
                    <a className="action-task-draft-link" href="/calendar">
                      查看排期
                    </a>
                    <span>已关联内容与平台版本</span>
                  </>
                ) : (
                  <>
                    <span>{contentWorkflowLabel(item)}</span>
                    <Button className="action-content-button" disabled={busyActionId === item.id} onClick={() => onActionToContent(item)} variant="secondary">
                      {busyActionId === item.id ? "处理中" : "生成排期草稿"}
                    </Button>
                  </>
                )}
              </div>
              <footer>
                <small>{formatDateTime(item.updatedAt)}</small>
                <div className="action-task-status-buttons">
                  {(["todo", "doing", "done", "dropped"] as const).map((status) => (
                    <Button className="action-status-button" disabled={busyActionId === item.id} key={status} onClick={() => onActionStatus(item, status)} variant={item.status === status ? "secondary" : "ghost"}>
                      {actionStatusLabels[status]}
                    </Button>
                  ))}
                </div>
              </footer>
            </article>
          ))}
          {items.length > 8 && <p className="muted">已按筛选展示前 8 条；可切换状态或来源缩小列表。</p>}
        </div>
      )}
    </Panel>
  );
}

export function DashboardPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [busySuggestionId, setBusySuggestionId] = useState<string | undefined>();
  const [busyActionId, setBusyActionId] = useState<string | undefined>();
  const [actionStatusFilter, setActionStatusFilter] = useState<ReviewActionItem["status"] | "active" | "all">("active");
  const [actionSourceFilter, setActionSourceFilter] = useState<keyof typeof actionSourceFilterLabels>("all");
  const [message, setMessage] = useState("导入建议需人工确认后再进入任务。");
  const [safeReportMarkdown, setSafeReportMarkdown] = useState("");
  const [safeReportBusy, setSafeReportBusy] = useState(false);

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/dashboard");
    setCurrent((await response.json()) as DashboardSnapshot);
  }

  async function fetchSafeWeeklyReport() {
    setSafeReportBusy(true);
    try {
      const response = await fetch("/api/self-media/reports/trusted-weekly-safe");
      const result = (await response.json()) as TrustedWeeklySafeReportResponse & { errorMessage?: string };
      if (!response.ok) throw new Error(result.errorMessage ?? "安全摘要读取失败");
      setSafeReportMarkdown(result.markdown);
      setMessage("已读取安全周报摘要；可直接复制外发，不包含真实标题或内部内容标识。");
      return result.markdown;
    } finally {
      setSafeReportBusy(false);
    }
  }

  async function viewSafeWeeklyReport() {
    try {
      await fetchSafeWeeklyReport();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "安全摘要读取失败");
    }
  }

  async function copySafeWeeklyReport() {
    try {
      const markdown = safeReportMarkdown || await fetchSafeWeeklyReport();
      await navigator.clipboard.writeText(markdown);
      setMessage("已复制安全周报摘要；完整本地周报没有被读取或复制。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "安全摘要复制失败");
    }
  }

  async function copyOperatingCommand(label: string, command: string) {
    try {
      await navigator.clipboard.writeText(command);
      setMessage(`已复制 ${label}：${command}`);
    } catch {
      setMessage(`${label} 命令：${command}`);
    }
  }

  async function createActionItemFromSuggestion(suggestionId: string) {
    setBusySuggestionId(suggestionId);
    setMessage("正在创建任务...");
    try {
      const response = await fetch("/api/self-media/action-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ suggestionId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "建议转任务失败");
      setMessage(result.idempotent ? "该建议已经转为任务。" : "已转为任务，等待人工推进。");
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "建议转任务失败");
    } finally {
      setBusySuggestionId(undefined);
    }
  }

  async function updateActionItemStatus(item: ReviewActionItem, status: ReviewActionItem["status"]) {
    setBusyActionId(item.id);
    setMessage("正在更新业务行动项...");
    try {
      const response = await fetch("/api/self-media/action-items", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status,
          nextAction: status === "done" ? "已完成，等待下次复盘验证效果。" : item.nextAction ?? "继续推进行动项。"
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "行动项更新失败");
      setMessage(`业务行动项已更新：${result.actionItem.title}`);
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "行动项更新失败");
    } finally {
      setBusyActionId(undefined);
    }
  }

  async function createContentFromActionItem(item: ReviewActionItem) {
    setBusyActionId(item.id);
    setMessage("正在从行动项生成内容排期草稿...");
    try {
      const response = await fetch("/api/self-media/action-items/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "行动项转内容失败");
      setMessage(result.idempotent ? "该行动项已关联内容草稿。" : "已生成内容草稿并进入排期；不会自动发布。");
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "行动项转内容失败");
    } finally {
      setBusyActionId(undefined);
    }
  }

  return (
    <AppShell active="/dashboard">
      <PageHeader
        eyebrow="数据分析"
        title="数据看板"
        description="面向日常运营复盘的指标探索、平台对比、内容排行和经营洞察。"
        actions={<Button disabled>分析视图</Button>}
      />
      <div className="dashboard-page-stack">
        <TrustedOperatingStrip snapshot={current} />
        <MetricDashboardGrid snapshot={current} />
        <TrustedWeeklySummaryPanel
          onCopySafeReport={copySafeWeeklyReport}
          onViewSafeReport={viewSafeWeeklyReport}
          safeReportBusy={safeReportBusy}
          safeReportMarkdown={safeReportMarkdown}
          snapshot={current}
        />
        <div className="dashboard-ops-grid">
          <AccountMetricTrendPanel snapshot={current} />
        </div>
        <DashboardSecondaryOperationsPanel
          busyActionId={busyActionId}
          busySuggestionId={busySuggestionId}
          onActionStatus={updateActionItemStatus}
          onActionToContent={createContentFromActionItem}
          onCreateActionItem={createActionItemFromSuggestion}
          onSourceFilter={setActionSourceFilter}
          onStatusFilter={setActionStatusFilter}
          snapshot={current}
          sourceFilter={actionSourceFilter}
          statusFilter={actionStatusFilter}
        />
        <p className="operation-message" data-testid="dashboard-operation-message">{message}</p>
        <DashboardAdvancedDiagnosticsPanel onCopyCommand={copyOperatingCommand} snapshot={current} />
      </div>
    </AppShell>
  );
}
