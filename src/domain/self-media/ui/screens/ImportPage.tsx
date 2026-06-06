"use client";

import { useMemo, useState } from "react";
import type { CsvImportPreset, DashboardSnapshot, ImportPreviewResult, PlatformImportOperationAction, PlatformImportOperationCapability, PlatformImportOperationPlatform, PlatformImportOperationResult, PlatformImportStatus, RealImportPreviewRow } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatNumber } from "../foundations/format";
import { ImportDiffTable } from "../patterns/ImportDiffTable";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Field, SelectInput, TextArea } from "../primitives/Form";
import { Panel } from "../primitives/Panel";

const sampleCsv = [
  "item_id,title,create_time,play_count,digg_count,comment_count,share_count,forward_count,download_count",
  "dy-real-1,抖音真实字段预览,2026-06-01T09:00:00.000Z,1000,100,10,8,3,2",
  ",只有标题没有ID,2026-06-01T09:00:00.000Z,200,20,2,1,0,0"
].join("\n");

const confidenceLabels: Record<RealImportPreviewRow["mappingConfidence"], string> = {
  confirmed_official: "官方字段",
  mature_reference: "成熟参考",
  draft_realistic: "待样本确认",
  confirmed_sampled: "样本确认"
};

const warningLabels: Record<string, string> = {
  missing_title: "缺少标题",
  missing_native_id_or_url: "缺少原生 ID 或链接"
};

const importStatusLabels: Record<PlatformImportStatus["latestStatus"], string> = {
  never: "未导入",
  pending: "导入中",
  success: "成功",
  failed: "失败"
};

const operationHistoryStatusLabels: Record<DashboardSnapshot["operationHistory"][number]["status"], string> = {
  success: "成功",
  failed: "失败",
  disabled: "禁用"
};

const operationHistoryActionLabels: Record<PlatformImportOperationAction, string> = {
  preview: "预览",
  save: "保存",
  save_smoke: "四平台保存验证"
};

const dataHealthStatusLabels: Record<DashboardSnapshot["platformDataHealth"]["status"], string> = {
  ok: "健康",
  warn: "需关注",
  error: "异常",
  missing: "未生成"
};

const dailyGateStatusLabels: Record<DashboardSnapshot["dailyPlatformOpsGate"]["status"], string> = {
  pass: "通过",
  fail: "未通过",
  missing: "未运行",
  error: "报告异常"
};

const dailySelfMediaOpsStatusLabels: Record<DashboardSnapshot["dailySelfMediaOps"]["status"], string> = {
  pass: "通过",
  warn: "需关注",
  fail: "未通过",
  missing: "未运行",
  error: "报告异常"
};

const dailySelfMediaOpsPreflightLabels: Record<DashboardSnapshot["dailySelfMediaOps"]["preflightHealth"]["status"], string> = {
  disabled: "未启用",
  pass: "通过",
  fail: "未通过",
  missing: "未运行",
  error: "异常"
};

const dataHealthPlatformLabels: Record<DashboardSnapshot["platformDataHealth"]["platforms"][number]["platform"], string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  "video-account": "视频号",
  bilibili: "B站"
};

const realCaptureStatusLabels: Record<DashboardSnapshot["platformDataHealth"]["platforms"][number]["realCaptureStatus"], string> = {
  fresh: "新鲜",
  stale: "过期",
  missing: "缺失",
  unknown: "未知"
};

function importStatusTone(status: PlatformImportStatus["latestStatus"]) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "info";
  return "warning";
}

function recoveryStatusTone(status: DashboardSnapshot["publishToMetricsWorkbench"]["postPublishRecoveryItems"][number]["matchStatus"]) {
  if (status === "attributed") return "success";
  if (status === "candidate_ready") return "info";
  if (status === "captured_no_candidate") return "warning";
  return "danger";
}

function operationHistoryTone(status: DashboardSnapshot["operationHistory"][number]["status"]) {
  if (status === "success") return "success";
  if (status === "disabled") return "warning";
  return "danger";
}

function operationTone(passed?: boolean) {
  if (passed === true) return "success";
  if (passed === false) return "danger";
  return "info";
}

function dataHealthTone(status: DashboardSnapshot["platformDataHealth"]["status"]) {
  if (status === "ok") return "success";
  if (status === "warn") return "warning";
  if (status === "missing") return "info";
  return "danger";
}

function realCaptureStatusTone(status: DashboardSnapshot["platformDataHealth"]["platforms"][number]["realCaptureStatus"]) {
  if (status === "fresh") return "success";
  if (status === "stale") return "warning";
  if (status === "missing") return "danger";
  return "info";
}

function trustedAuditTone(status: DashboardSnapshot["trustedOperatingStatus"]["audit"]["status"]) {
  if (status === "pass") return "success";
  if (status === "fail" || status === "error") return "danger";
  return "warning";
}

function trustedAuditLabel(status: DashboardSnapshot["trustedOperatingStatus"]["audit"]["status"]) {
  if (status === "pass") return "审计通过";
  if (status === "fail") return "审计失败";
  if (status === "error") return "报告异常";
  return "未审计";
}

function dailyGateTone(status: DashboardSnapshot["dailyPlatformOpsGate"]["status"]) {
  if (status === "pass") return "success";
  if (status === "missing") return "info";
  return "danger";
}

function dailySelfMediaOpsTone(status: DashboardSnapshot["dailySelfMediaOps"]["status"]) {
  if (status === "pass") return "success";
  if (status === "warn") return "warning";
  if (status === "missing") return "info";
  return "danger";
}

function dailyGateStepTone(status: DashboardSnapshot["dailyPlatformOpsGate"]["healthGate"]["status"]) {
  if (status === "pass") return "success";
  if (status === "missing") return "info";
  if (status === "fail") return "danger";
  return "warning";
}

function dailySelfMediaOpsStepTone(status: DashboardSnapshot["dailySelfMediaOps"]["steps"][number]["status"]) {
  if (status === "pass") return "success";
  if (status === "missing") return "info";
  if (status === "fail") return "danger";
  return "warning";
}

function dailySelfMediaOpsPreflightTone(status: DashboardSnapshot["dailySelfMediaOps"]["preflightHealth"]["status"]) {
  if (status === "pass") return "success";
  if (status === "disabled" || status === "missing") return "info";
  return "danger";
}

function dataHealthCheckLabel(check: { exists: boolean; status: "ok" | "warn" | "error"; isStale?: boolean | null; sourceMatches?: boolean | null }) {
  if (!check.exists) return "未生成";
  if (check.sourceMatches === false) return "来源不一致";
  if (check.isStale) return "数据过期";
  if (check.status === "ok") return "可用";
  if (check.status === "warn") return "需关注";
  return "异常";
}

function freshnessStaleLabel(value?: boolean | null) {
  if (value === true) return "超过 72h";
  if (value === false) return "72h 内";
  return "n/a";
}

function normalizeWarning(value: string) {
  return warningLabels[value] ?? value.replace(/^preset:/, "");
}

function operatorWarningLabel(value: string) {
  const normalized = normalizeWarning(value);
  if (/raw capture|目录不存在|目录为空|missing-raw|rawDir/i.test(normalized)) return "需要补充本地采集文件后再导入。";
  if (/private|message endpoints?|私信|隐私/i.test(normalized)) return "已跳过私密互动。";
  if (/redacted|missing objectId|objectId|cookie|token|headers?|authorization|secret|credential|raw\s*payload|comment_content|danmu_text|danmu|评论正文|弹幕/i.test(normalized)) return "已跳过缺少作品标识或敏感明细的记录。";
  if (/non-public|unknown archive|private_or_only_self|hidden|rejected|review|offline|非公开|不可用/i.test(normalized)) return "已跳过非公开/不可用内容。";
  if (/hot_video|hot_topic|topic\/detail recommendation|public notes?|public-or-unmatched|非本人|public/i.test(normalized) && /skipped|跳过|avoid importing|did not match/i.test(normalized)) return "已跳过非本人作品。";
  if (/account-level|overview\/stat|账号级/i.test(normalized)) return "已跳过账号级概览，未计入内容指标。";
  if (/weak or auxiliary|nav|realname|web-show|white|grey|preupload|generic config/i.test(normalized)) return "已跳过辅助页面记录。";
  if (/date keys|survey captures|dated rows/i.test(normalized)) return "已保留多日期账号诊断，未计入内容指标。";
  if (/interaction rows.*did not match|unmatched interaction/i.test(normalized)) return "已跳过无法匹配到作品的互动记录。";
  if (/merged.*(hot_video|hot_topic|note_detail_new|interaction post|bullet-chat|feed)/i.test(normalized)) return "已合并同一作品的补充互动数据。";
  if (/no personal .* mapped|未识别/i.test(normalized)) return "未识别到本人作品记录。";
  if (/smoke|demo|test|fixture|platform_save_smoke/i.test(normalized)) return "保存验证使用隔离数据，不影响运营库。";
  if (/creator_center|source=|provider|provider source id|runId/i.test(normalized)) return "真实平台来源已识别，细节已收进诊断。";
  if (normalized.length > 72) return "导入提示已收起，详情见高级诊断。";
  return normalized;
}

function operatorWarnings(values: string[]) {
  return [...new Set(values.map(operatorWarningLabel))].slice(0, 3);
}

function metricEntries(row: RealImportPreviewRow) {
  return Object.entries(row.normalized).filter(([key, value]) => key !== "id" && key !== "title" && value !== undefined && value !== "");
}

function objectEntries(value: Record<string, unknown>, limit = 4) {
  return Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== "").slice(0, limit);
}

function summaryWarnings(summary: PlatformImportOperationResult["summaries"][number]) {
  return summary.errorMessage ? [summary.errorMessage, ...summary.warnings] : summary.warnings;
}

function OperationSummaryList({ summaries, capabilities }: { summaries: PlatformImportOperationResult["summaries"]; capabilities: PlatformImportOperationCapability[] }) {
  if (summaries.length === 0) return null;
  const operationPlatformLabels = Object.fromEntries(capabilities.map((item) => [item.key, item.label])) as Record<PlatformImportOperationPlatform, string>;
  return (
    <div className="platform-import-operation-summaries">
      {summaries.map((summary) => {
        const warnings = summaryWarnings(summary).slice(0, 3);
        const visibleWarnings = operatorWarnings(warnings);
        return (
          <article className={summary.passed ? "is-passed" : "is-failed"} key={`${summary.platform}-${summary.runId}`}>
            <div className="operation-summary-head">
              <strong>{summary.label ?? operationPlatformLabels[summary.platform]}</strong>
              <Badge tone={summary.passed ? "success" : "danger"}>{summary.passed ? "通过" : "未通过"}</Badge>
            </div>
            <p>{formatNumber(summary.contentCount)} 内容 / {formatNumber(summary.metricCount)} 指标</p>
            {summary.rawDir && (
              <details className="analytics-data-section">
                <summary>
                  <span>
                    <strong>采集目录待补</strong>
                    <small>展开查看本地诊断信息</small>
                  </span>
                  <i>诊断</i>
                </summary>
                <div className="operation-missing-raw">
                  <span>缺少目录</span>
                  <code>{summary.rawDir}</code>
                  <span>先运行</span>
                  <code>{summary.discoverCommand}</code>
                </div>
              </details>
            )}
            {visibleWarnings.length > 0 && (
              <ul>
                {visibleWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
            {warnings.length > 0 && (
              <details className="analytics-data-section operation-warning-diagnostics">
                <summary>
                  <span>
                    <strong>提示诊断</strong>
                    <small>展开查看本地原始提示</small>
                  </span>
                  <i>诊断</i>
                </summary>
                <ul>
                  {warnings.map((warning) => <li key={warning}>{normalizeWarning(warning)}</li>)}
                </ul>
              </details>
            )}
          </article>
        );
      })}
    </div>
  );
}

function PlatformImportOperationStrip({ capabilities, onDashboardRefresh }: { capabilities: PlatformImportOperationCapability[]; onDashboardRefresh: (snapshot: DashboardSnapshot) => void }) {
  const [runningKeys, setRunningKeys] = useState<string[]>([]);
  const [result, setResult] = useState<PlatformImportOperationResult | null>(null);
  const [message, setMessage] = useState("等待操作");
  const isSmokeRunning = runningKeys.includes("all:save_smoke");

  function isPlatformRunning(platform: PlatformImportOperationPlatform) {
    return runningKeys.some((key) => key.startsWith(`${platform}:`));
  }

  function setKeyRunning(key: string, running: boolean) {
    setRunningKeys((keys) => running ? [...keys, key] : keys.filter((item) => item !== key));
  }

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/dashboard");
    if (!response.ok) throw new Error("操作已完成，但刷新状态失败。");
    onDashboardRefresh((await response.json()) as DashboardSnapshot);
  }

  async function runOperation(action: PlatformImportOperationAction, platform?: PlatformImportOperationPlatform) {
    const key = `${platform ?? "all"}:${action}`;
    if (action === "save_smoke" ? runningKeys.length > 0 : isSmokeRunning || (platform ? isPlatformRunning(platform) : false)) return;
    setKeyRunning(key, true);
    setMessage(action === "preview" ? "预览中" : action === "save" ? "保存中" : "四平台保存验证中");
    try {
      const response = await fetch("/api/self-media/platform-imports/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action === "save_smoke" ? { action, platform: "all" } : { action, platform })
      });
      const body = await response.json() as PlatformImportOperationResult & { errorMessage?: string };
      if (!response.ok && body.summaries) {
        setResult(body);
        setMessage(operatorWarningLabel(body.errorMessage ?? body.warnings?.[0] ?? "平台导入操作未通过"));
        await refreshDashboard();
        return;
      }
      if (!response.ok) throw new Error(operatorWarningLabel(body.errorMessage ?? body.warnings?.[0] ?? "平台导入操作失败"));
      setResult(body);
      await refreshDashboard();
      setMessage(body.passed ? "操作完成" : "操作未通过");
    } catch (error) {
      setResult(null);
      setMessage(operatorWarningLabel(error instanceof Error ? error.message : "平台导入操作失败"));
    } finally {
      setKeyRunning(key, false);
    }
  }

  const summaries = result?.summaries ?? [];
  const hasRunningKeys = runningKeys.length > 0;

  return (
    <div className="platform-import-operations">
      <div className="platform-import-operation-grid">
        {capabilities.map((item) => {
          const platformRunning = isPlatformRunning(item.key);
          const saveDisabled = isSmokeRunning || platformRunning || !item.saveEnabled;
          return (
          <div className="platform-import-operation-row" key={item.key} aria-busy={platformRunning}>
            <div className="platform-import-operation-label">
              <PlatformBadge platform={item.platform} />
              {platformRunning && <span>处理中</span>}
              {!item.saveEnabled && <span>{item.disabledReason ?? "暂未开放保存"}</span>}
            </div>
            <div className="platform-import-operation-actions">
              <Button onClick={() => runOperation("preview", item.key)} disabled={isSmokeRunning || platformRunning || !item.previewEnabled} variant="ghost">{runningKeys.includes(`${item.key}:preview`) ? "预览中" : "预览最新本地抓取"}</Button>
              <Button onClick={() => runOperation("save", item.key)} disabled={saveDisabled} variant="secondary">{runningKeys.includes(`${item.key}:save`) ? "同步中" : item.saveEnabled ? "保存本地同步" : "待开放"}</Button>
            </div>
          </div>
          );
        })}
        <div className="platform-import-operation-row platform-import-operation-smoke">
          <strong>四平台保存验证</strong>
          <Button onClick={() => runOperation("save_smoke")} disabled={hasRunningKeys} variant="primary">{isSmokeRunning ? "验证中" : "运行保存验证"}</Button>
        </div>
      </div>
      <div className="platform-import-operation-result">
        <Badge tone={operationTone(result?.passed)}>{result ? (result.passed ? "成功" : "失败") : hasRunningKeys ? "运行中" : "就绪"}</Badge>
        <span>{message}</span>
      </div>
      <OperationSummaryList summaries={summaries} capabilities={capabilities} />
    </div>
  );
}

function OperationHistoryTable({ history, showDiagnostics = false, testId = "platform-operation-history-table" }: { history: DashboardSnapshot["operationHistory"]; showDiagnostics?: boolean; testId?: string }) {
  return (
    <div className="table-wrap platform-operation-history-table">
      <table className="sm-table" data-testid={testId}>
        <thead>
          <tr>
            <th>时间</th>
            <th>平台</th>
            <th>动作</th>
            {showDiagnostics && <th>来源</th>}
            <th>状态</th>
            <th>内容/指标</th>
            <th>提示</th>
            {showDiagnostics && <th>Run ID</th>}
          </tr>
        </thead>
        <tbody>
          {history.length > 0 ? history.map((item) => (
            <tr key={item.id}>
              <td>{formatDateTime(item.createdAt)}</td>
              <td><PlatformBadge platform={item.platform === "video-account" ? "video_account" : item.platform} /></td>
              <td>{operationHistoryActionLabels[item.action]}</td>
              {showDiagnostics && <td>{item.source}</td>}
              <td><Badge tone={operationHistoryTone(item.status)}>{operationHistoryStatusLabels[item.status]}</Badge></td>
              <td><strong>{formatNumber(item.contentCount)} / {formatNumber(item.metricCount)}</strong></td>
              <td>
                <strong>{formatNumber(item.warningCount)}</strong>
                <small>{item.warningSummary ? (showDiagnostics ? item.warningSummary : operatorWarningLabel(item.warningSummary)) : "无"}</small>
              </td>
              {showDiagnostics && <td><code>{item.runId}</code></td>}
            </tr>
          )) : (
            <tr>
              <td colSpan={showDiagnostics ? 8 : 6} className="muted">暂无平台操作历史</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RealPreviewRows({ rows }: { rows: RealImportPreviewRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="real-preview-empty">
        <strong>暂无真实字段预览</strong>
        <span>运行预览后显示字段映射和原生指标。</span>
      </div>
    );
  }
  return (
    <div className="real-preview-list">
      {rows.map((row) => {
        const nativeEntries = objectEntries(row.nativeMetrics);
        const rawEntries = objectEntries(row.rawFields, 3);
        return (
          <article className={row.canConfirmSave ? "real-preview-row" : "real-preview-row is-not-confirmable"} key={`${row.rowNumber}-${row.previewDedupeKey}`}>
            <div className="real-preview-row-head">
              <div>
                <span className="real-preview-row-index">第 {row.rowNumber} 行</span>
                <strong>{row.normalized.title ?? "未识别标题"}</strong>
                <small>{row.normalized.id ?? row.previewDedupeKey}</small>
              </div>
              <div className="real-preview-badges">
                <PlatformBadge platform={row.platform} />
                <span className={`confidence-pill confidence-${row.mappingConfidence}`}>{confidenceLabels[row.mappingConfidence]}</span>
                <span className={row.canConfirmSave ? "confirm-pill is-confirmable" : "confirm-pill is-blocked"}>{row.canConfirmSave ? "可确认保存" : "暂不可保存"}</span>
              </div>
            </div>
            <div className="real-preview-map">
              <section>
                <span>字段映射</span>
                <div className="preview-chip-grid">
                  {metricEntries(row).map(([key, value]) => (
                    <span className="preview-chip" key={key}>
                      <b>{key}</b>
                      {String(value)}
                    </span>
                  ))}
                </div>
              </section>
              <section>
                <span>Native metrics</span>
                <div className="preview-chip-grid">
                  {nativeEntries.length > 0 ? nativeEntries.map(([key, value]) => (
                    <span className="preview-chip native-chip" key={key}>
                      <b>{key}</b>
                      {String(value)}
                    </span>
                  )) : <small>无额外原生指标</small>}
                </div>
              </section>
            </div>
            {rawEntries.length > 0 && (
              <details className="analytics-data-section">
                <summary>
                  <span>
                    <strong>字段诊断</strong>
                    <small>本地原始字段仅供排查映射</small>
                  </span>
                  <i>展开</i>
                </summary>
                <div className="preview-chip-grid">
                  {rawEntries.map(([key, value]) => (
                    <span className="preview-chip raw-chip" key={key}>
                      <b>{key}</b>
                      {String(value)}
                    </span>
                  ))}
                </div>
              </details>
            )}
            {row.warnings.length > 0 && (
              <div className="real-preview-warnings">
                {row.warnings.map((warning) => (
                  <span key={warning}>{normalizeWarning(warning)}</span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function PlatformDataHealthPanel({ health }: { health: DashboardSnapshot["platformDataHealth"] }) {
  const freshness = health.summary.freshness;
  const latestRealCapture = freshness.latestRealCaptureAt ? formatDateTime(freshness.latestRealCaptureAt) : "暂无";
  const problemCount = health.summary.missingCount + health.summary.staleCount + health.summary.sourceMismatchCount;
  return (
    <Panel
      title="数据新鲜度"
      eyebrow="四平台真实采集"
      action={<Badge tone={dataHealthTone(health.status)}>{dataHealthStatusLabels[health.status]}</Badge>}
    >
      {!health.exists ? (
        <div className="platform-data-health-empty">
          <strong>暂无新鲜度结果</strong>
          <span>完成真实导入后，这里会显示四平台数据是否足够新。</span>
        </div>
      ) : (
        <div className="platform-data-health">
          <div className="platform-data-health-summary">
            <span><b>{dataHealthStatusLabels[health.status]}</b> 当前状态</span>
            <span><b>{formatNumber(health.summary.okCount)}</b> 项可用</span>
            <span><b>{formatNumber(health.summary.warnCount)}</b> 项需关注</span>
            <span><b>{formatNumber(health.summary.errorCount)}</b> 项异常</span>
            <span><b>{formatNumber(problemCount)}</b> 项缺失/过期/来源不一致</span>
            <span><b>{latestRealCapture}</b> 最近真实采集</span>
            <span><b>{freshnessStaleLabel(freshness.realCaptureIsStale)}</b> 数据 72h</span>
          </div>
          <div className="platform-data-health-grid" data-testid="real-capture-freshness-grid">
            {health.platforms.map((platform) => (
              <div className={`platform-data-health-row status-${platform.status}`} key={platform.platform}>
                <div>
                  <strong>{dataHealthPlatformLabels[platform.platform]}</strong>
                  <small>真实采集 {platform.freshness.latestRealCaptureAt ? formatDateTime(platform.freshness.latestRealCaptureAt) : "未生成"}</small>
                </div>
                <Badge tone={realCaptureStatusTone(platform.realCaptureStatus)}>{realCaptureStatusLabels[platform.realCaptureStatus]}</Badge>
                <span>{dataHealthCheckLabel(platform.mappingPreview)}</span>
                <span>{dataHealthCheckLabel(platform.saveSmoke)}</span>
                <Badge tone={dataHealthTone(platform.status)}>{dataHealthStatusLabels[platform.status]}</Badge>
              </div>
            ))}
          </div>
          <details className="analytics-data-section" data-testid="real-capture-assisted-actions">
            <summary>
              <span>
                <strong>采集动作诊断</strong>
                <small>展开查看本地操作建议与命令</small>
              </span>
              <i>高级</i>
            </summary>
            <div className="real-capture-action-plan">
              {health.platforms.map((platform) => (
                <article className={`real-capture-action-card status-${platform.realCaptureStatus}`} key={`${platform.platform}-action`}>
                  <header>
                    <strong>{dataHealthPlatformLabels[platform.platform]}</strong>
                    <Badge tone={realCaptureStatusTone(platform.realCaptureStatus)}>{realCaptureStatusLabels[platform.realCaptureStatus]}</Badge>
                  </header>
                  <p>{platform.nextAction}</p>
                  <div className="real-capture-command-grid">
                    <span><b>preview</b><code>{platform.commands.preview}</code></span>
                    <span><b>save</b><code>{platform.commands.save}</code></span>
                    <span><b>audit</b><code>{platform.commands.audit}</code></span>
                    <span><b>gate</b><code>{platform.commands.gate}</code></span>
                  </div>
                </article>
              ))}
            </div>
          </details>
          <div className="platform-data-health-footer">
            <span>缺失 {formatNumber(health.summary.missingCount)}</span>
            <span>过期 {formatNumber(health.summary.staleCount)}</span>
            <span>真实采集过期 {formatNumber(health.summary.realCaptureStaleCount)}</span>
            <span>来源不一致 {formatNumber(health.summary.sourceMismatchCount)}</span>
          </div>
          {health.bilibiliAccount && (
            <details className="analytics-data-section">
              <summary>
                <span>
                  <strong>B站账号级边界</strong>
                  <small>账号级数据只作诊断</small>
                </span>
                <i>高级</i>
              </summary>
              <div className="platform-data-health-account">
                <strong>B站账号指标</strong>
                <span>{health.bilibiliAccount.accountPreview.previewOnly ? "仅预览" : "不是仅预览"} · 已保存={String(health.bilibiliAccount.accountPreview.saved)} · 候选={formatNumber(health.bilibiliAccount.accountPreview.candidateCount ?? 0)}</span>
                <small>账号级诊断只读展示，不进入内容级保存。</small>
              </div>
            </details>
          )}
        </div>
      )}
    </Panel>
  );
}

function DailySelfMediaOpsPanel({ ops }: { ops: DashboardSnapshot["dailySelfMediaOps"] }) {
  const visibleBlockingReasons = ops.blockingReasons.slice(0, 5);
  const visibleWarnings = ops.warnings.slice(0, 5);
  const visibleNextActions = ops.nextActions.slice(0, 5);
  return (
    <Panel
      className="daily-self-media-ops-panel"
      title="每日运营闭环"
      eyebrow="daily-self-media-ops"
      action={<Badge tone={dailySelfMediaOpsTone(ops.status)}>{dailySelfMediaOpsStatusLabels[ops.status]}</Badge>}
    >
      <div data-testid="daily-self-media-ops-panel">
      <div className="daily-self-media-ops-summary">
        <span><b>{dailySelfMediaOpsStatusLabels[ops.status]}</b> 当前状态</span>
        <span><b>{dailySelfMediaOpsPreflightLabels[ops.preflightHealth.status]}</b> strict preflight</span>
        <span><b>{formatDateTime(ops.generatedAt ?? undefined)}</b> 最近报告</span>
        <span><b>{formatNumber(ops.stepCount)}</b> / {formatNumber(ops.plannedStepCount)} 步骤</span>
        <span><b>{ops.completedAllSteps === true ? "完成" : ops.completedAllSteps === false ? "未完成" : "未知"}</b> 串行闭环</span>
        <span><b>{ops.safeWeeklyRedactedPaths.markdown}</b> redacted 周报</span>
      </div>
      <div className="daily-self-media-ops-preflight" data-testid="daily-self-media-ops-preflight">
        <Badge tone={dailySelfMediaOpsPreflightTone(ops.preflightHealth.status)}>preflight {dailySelfMediaOpsPreflightLabels[ops.preflightHealth.status]}</Badge>
        <span>{ops.preflightHealth.enabled ? "显式启用 --preflight-health；通过后自动采用 API、safe weekly、trusted data、page 都 ready 的 preferredDashboardUrl。" : "默认不启用；需要时运行 npm run ops:daily-self-media -- --preflight-health。"}</span>
        <code>{ops.preflightHealth.preferredDashboardUrl ?? "preferredDashboardUrl: none"}</code>
        <small>healthy={ops.preflightHealth.healthyPorts.join(",") || "none"} · apiReady={ops.preflightHealth.apiReadyPorts.join(",") || "none"} · safeWeekly={ops.preflightHealth.safeWeeklyReadyPorts.join(",") || "none"} · trustedData={ops.preflightHealth.trustedDataReadyPorts.join(",") || "none"} · pageReady={ops.preflightHealth.pageReadyPorts.join(",") || "none"} · stale/old={ops.preflightHealth.staleOrOldRoutePorts.join(",") || "none"}</small>
      </div>
      {!ops.exists ? (
        <div className="daily-self-media-ops-empty sm-empty-state">
          <strong>尚未生成每日运营闭环报告</strong>
          <p>运行 <code>{ops.command}</code> 后，这里会显示 health、freshness、safe weekly、audit、gate 五步结果。</p>
        </div>
      ) : (
        <div className="daily-self-media-ops-steps" aria-label="每日运营闭环步骤">
          {ops.steps.map((step) => (
            <article className={`daily-self-media-ops-step status-${step.status}`} key={step.key}>
              <header>
                <strong>{step.label}</strong>
                <Badge tone={dailySelfMediaOpsStepTone(step.status)}>{dailySelfMediaOpsStatusLabels[step.status]}</Badge>
              </header>
              <span>{step.reportPath ?? "未生成 report"}</span>
              {step.command && <code>{step.command}</code>}
            </article>
          ))}
        </div>
      )}
      <div className="daily-self-media-ops-guidance">
        <span>默认 dashboard-url：<code>{ops.defaultDashboardUrl}</code></span>
        <span>{ops.fallbackDashboardUrlHint}</span>
        <span>UI 只读展示，不会运行命令、打开平台、保存数据库或改变平台边界。</span>
      </div>
      {(visibleBlockingReasons.length > 0 || visibleWarnings.length > 0 || visibleNextActions.length > 0) && (
        <div className="daily-self-media-ops-lists">
          <div>
            <strong>blockingReasons</strong>
            {visibleBlockingReasons.length === 0 ? <span>None</span> : visibleBlockingReasons.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div>
            <strong>warnings</strong>
            {visibleWarnings.length === 0 ? <span>None</span> : visibleWarnings.map((item) => <span key={item}>{item}</span>)}
          </div>
          <div>
            <strong>nextActions</strong>
            {visibleNextActions.length === 0 ? <span>None</span> : visibleNextActions.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      )}
      <div className="daily-self-media-ops-safe-paths">
        <span>safe weekly JSON <code>{ops.safeWeeklyRedactedPaths.json}</code></span>
        <span>safe weekly MD <code>{ops.safeWeeklyRedactedPaths.markdown}</code></span>
      </div>
      </div>
    </Panel>
  );
}

function DailyGateStatusPanel({ gate }: { gate: DashboardSnapshot["dailyPlatformOpsGate"] }) {
  const freshness = gate.freshness;
  return (
    <Panel
      className="daily-gate-status-panel"
      title="每日运营检查"
      eyebrow="看板可用性"
      action={<Badge tone={dailyGateTone(gate.status)}>{dailyGateStatusLabels[gate.status]}</Badge>}
    >
      {!gate.exists ? (
        <div className="daily-gate-empty">
          <strong>还没有检查记录</strong>
          <span>完成每日运营检查后，这里会显示数据健康、看板审计和阻塞项；未运行不会被当作通过。</span>
        </div>
      ) : (
        <div className="daily-gate-status">
          <div className="daily-gate-summary">
            <span><b>{dailyGateStatusLabels[gate.status]}</b> 检查结果</span>
            <span><b>{formatDateTime(gate.generatedAt ?? undefined)}</b> 最近检查</span>
            <span><b>{gate.completedAllSteps === true ? "全部完成" : gate.completedAllSteps === false ? "未完成" : "未知"}</b> 检查步骤</span>
            <span><b>{formatNumber(gate.blockingReasons.length)}</b> 待处理阻塞</span>
            <span><b>{freshness.latestRealCaptureAt ? formatDateTime(freshness.latestRealCaptureAt) : "暂无"}</b> 真实采集</span>
            <span><b>{freshness.latestSmokeAt ? formatDateTime(freshness.latestSmokeAt) : "暂无"}</b> smoke</span>
            <span><b>{freshness.latestAuditAt ? formatDateTime(freshness.latestAuditAt) : "暂无"}</b> audit</span>
            <span><b>{freshnessStaleLabel(freshness.realCaptureIsStale)}</b> 数据 72h</span>
          </div>
          <div className="daily-gate-steps">
            <article>
              <header>
                <strong>数据健康</strong>
                <Badge tone={dailyGateStepTone(gate.healthGate.status)}>{dailyGateStatusLabels[gate.healthGate.status]}</Badge>
              </header>
              <span>{gate.healthGate.summaryStatus ?? "暂无摘要"} · {gate.healthGate.durationMs ? `${formatNumber(gate.healthGate.durationMs)} ms` : "未记录耗时"}</span>
              <small>{gate.healthGate.blockingReasons.slice(0, 2).join(" / ") || gate.healthGate.warnings.slice(0, 2).join(" / ") || "没有健康阻塞项"}</small>
            </article>
            <article>
              <header>
                <strong>看板审计</strong>
                <Badge tone={dailyGateStepTone(gate.trustedAudit.status)}>{dailyGateStatusLabels[gate.trustedAudit.status]}</Badge>
              </header>
              <span>{formatNumber(gate.trustedAudit.trustedContentCount)} 真实内容 / {formatNumber(gate.trustedAudit.trustedMetricSnapshotCount)} 内容级快照 / {formatNumber(gate.trustedAudit.mismatchCount)} 处不一致</span>
              <small>{gate.trustedAudit.mismatches.slice(0, 2).join(" / ") || "审计一致，未发现口径不一致"}</small>
            </article>
          </div>
          <div className="daily-gate-blocking">
            {(gate.blockingReasons.length > 0 ? gate.blockingReasons : ["当前没有阻塞项，可以按默认真实运营口径查看看板。"]).slice(0, 4).map((reason) => <span key={reason}>{reason}</span>)}
          </div>
        </div>
      )}
    </Panel>
  );
}

function sourceScopeLabel(source: DashboardSnapshot["realDataScope"]["excludedSources"][number]["source"]) {
  const labels: Record<string, string> = {
    manual: "manual",
    csv: "csv",
    json: "json",
    fake: "demo/fake",
    mediacrawler: "mediacrawler",
    n8n: "n8n",
    wechat_official: "wechat historical",
    review_metric: "legacy metrics",
    douyin_creator_center: "douyin_creator_center",
    xiaohongshu_creator_center: "xiaohongshu_creator_center",
    video_account_creator_center: "video_account_creator_center",
    bilibili_creator_center: "bilibili_creator_center"
  };
  return labels[source] ?? source;
}

function RealDataScopePanel({ scope }: { scope: DashboardSnapshot["realDataScope"] }) {
  return (
    <Panel
      className="real-data-scope-panel"
      title="默认看板口径"
      eyebrow="真实运营数据"
      action={<Badge tone={scope.isDefaultDashboardTrusted ? "success" : "warning"}>{scope.isDefaultDashboardTrusted ? "可信" : "需复核"}</Badge>}
    >
      <div className="real-data-scope-summary">
        <span><b>{formatNumber(scope.trustedContentCount)}</b> 真实四平台内容进入看板</span>
        <span><b>{formatNumber(scope.trustedMetricSnapshotCount)}</b> 内容级指标快照</span>
        <span><b>{formatNumber(scope.trustedImportRunCount)}</b> 真实保存记录</span>
        <span><b>{formatNumber(scope.excludedMetricCount)}</b> 非运营指标被排除</span>
        <span><b>{formatNumber(scope.excludedImportRunCount)}</b> 非运营 run 被排除</span>
      </div>
      <div className="real-data-scope-excluded">
        <strong>不进入默认看板</strong>
        {scope.excludedSources.slice(0, 5).map((item) => (
          <span key={item.source}>{sourceScopeLabel(item.source)} · {formatNumber(item.metricCount || item.metricSnapshotCount)} 指标 · {formatNumber(item.importRunCount)} 次记录</span>
        ))}
        {scope.excludedSources.length === 0 && <span>暂无测试、演示、历史或手动来源被排除。</span>}
      </div>
      <p className="muted">默认看板和复盘只使用抖音、小红书、视频号、B站创作者中心内容级真实数据；其他行仍在库里，只是不参与运营总数。</p>
    </Panel>
  );
}

function TrustedAuditPanel({ status }: { status: DashboardSnapshot["trustedOperatingStatus"] }) {
  return (
    <Panel
      className="trusted-audit-panel"
      title="看板口径审计"
      eyebrow="真实数一致性"
      action={<Badge tone={trustedAuditTone(status.audit.status)}>{trustedAuditLabel(status.audit.status)}</Badge>}
    >
      <div className="trusted-audit-summary">
        <span><b>{status.profileLabel}</b> 当前运营库</span>
        <span><b>{formatNumber(status.trustedContentCount)}</b> 真实内容</span>
        <span><b>{formatNumber(status.trustedMetricSnapshotCount)}</b> 内容级快照</span>
        <span><b>{formatNumber(status.views)}</b> 审计曝光</span>
        <span><b>{formatNumber(status.engagement)}</b> 审计互动</span>
        <span><b>{formatNumber(status.audit.mismatchCount)}</b> 不一致</span>
      </div>
      <div className="trusted-audit-command">
        <strong>手动复核命令</strong>
        <code>{status.auditCommand}</code>
      </div>
      <p className="muted">
        {status.audit.exists
          ? `${status.audit.message ?? "最近审计已读取"} 审计时间：${formatDateTime(typeof status.audit.generatedAt === "string" ? status.audit.generatedAt : undefined)}，对照来源：${status.audit.dashboardInput ?? "unknown"}。`
          : "还没有审计记录：这里不会把未运行显示成通过。运行复核命令后会显示真实内容、快照和不一致项。"}
      </p>
      {status.audit.mismatches.length > 0 && (
        <div className="trusted-audit-mismatches">
          {status.audit.mismatches.slice(0, 4).map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
    </Panel>
  );
}

function PlatformImportStatusPanel({ capabilities, history, statuses, onDashboardRefresh }: { capabilities: PlatformImportOperationCapability[]; history: DashboardSnapshot["operationHistory"]; statuses: PlatformImportStatus[]; onDashboardRefresh: (snapshot: DashboardSnapshot) => void }) {
  return (
    <Panel
      id="manual-refresh"
      title="手动抓取最新数据"
      eyebrow="四平台本地同步"
      action={<Button onClick={() => window.location.reload()} variant="ghost">刷新当前页面数据</Button>}
    >
      <p className="muted" data-testid="manual-refresh-boundary">这是本地手动抓取/同步入口，不是平台自动回调；公众号/WeChat 后端仍暂停，B站账号指标保持 preview-only，不写入 durable totals。</p>
      <div className="platform-import-status-summary">
        <span><b>{statuses.filter((item) => item.latestStatus === "success").length}</b> 平台已成功</span>
        <span><b>{formatNumber(statuses.reduce((sum, item) => sum + item.contentCount, 0))}</b> 内容入库</span>
        <span><b>{formatNumber(statuses.reduce((sum, item) => sum + item.metricCount, 0))}</b> 指标快照</span>
      </div>
      <PlatformImportOperationStrip capabilities={capabilities} onDashboardRefresh={onDashboardRefresh} />
      <OperationHistoryTable history={history} />
      <div className="table-wrap platform-import-status-table">
        <table className="sm-table">
          <thead>
            <tr>
              <th>平台</th>
              <th>最近导入</th>
              <th>内容/指标</th>
              <th>看板/复盘</th>
              <th>最近提示</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((item) => (
              <tr key={item.source}>
                <td>
                  <div className="platform-import-source-cell">
                    <PlatformBadge platform={item.platform} />
                    <div>
                      <strong>{item.label}</strong>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{formatDateTime(item.latestRunAt)}</strong>
                  <small>{importStatusLabels[item.latestStatus]}</small>
                </td>
                <td>
                  <strong>{formatNumber(item.contentCount)} / {formatNumber(item.metricCount)}</strong>
                  <small>内容 / 指标，导入批次合计 {formatNumber(item.importedCount)}</small>
                </td>
                <td>
                  <div className="platform-import-review-cell">
                    <Badge tone={importStatusTone(item.latestStatus)}>{importStatusLabels[item.latestStatus]}</Badge>
                    <span>{item.enteredDashboardReview ? "已进入指标快照，可被看板/复盘读取" : "暂无指标快照证据"}</span>
                  </div>
                </td>
                <td>
                  <span className={item.lastMessage ? "platform-import-message" : "muted"}>{item.lastMessage ? operatorWarningLabel(item.lastMessage) : "无"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PostPublishRefreshPanel({
  snapshot,
  onConfirmMatch
}: {
  snapshot: DashboardSnapshot;
  onConfirmMatch: (candidate: DashboardSnapshot["publishToMetricsWorkbench"]["matchCandidates"][number]) => Promise<void>;
}) {
  const workbench = snapshot.publishToMetricsWorkbench;
  const recoveryItems = workbench.postPublishRecoveryItems;
  return (
    <Panel
      id="post-publish-refresh"
      title="发布后刷新"
      eyebrow="手动回收指标"
      action={<span className="sm-badge sm-badge-info">{workbench.postPublishRefresh.length} 条待回收</span>}
    >
      <p className="muted" data-testid="post-publish-refresh-boundary">发布后刷新是本地手动抓取/同步，不是平台自动回调；系统只给候选，用户确认前不会把新平台内容指标归入本地内容。</p>
      <div className="platform-import-status-summary">
        <span><b>{formatNumber(workbench.postPublishRefresh.length)}</b> 发布后待刷新</span>
        <span><b>{formatNumber(recoveryItems.length)}</b> 发布后回收助手</span>
        <span><b>{formatNumber(workbench.matchCandidates.length)}</b> 可人工确认候选</span>
        <span><b>{formatDateTime(workbench.scheduledRefresh.nextSuggestedAt)}</b> 建议下次抓取</span>
      </div>
      <div className="table-wrap" data-testid="post-publish-refresh">
        <table className="sm-table" data-testid="post-publish-recovery-assistant">
          <thead>
            <tr>
              <th>待回收内容</th>
              <th>平台 / 发布时间</th>
              <th>建议刷新动作</th>
              <th>最近导入状态</th>
              <th>匹配 / 归因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {recoveryItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.contentTitle}</strong>
                  <small>{item.versionTitle}</small>
                </td>
                <td>
                  <PlatformBadge compact platform={item.platform} />
                  <small>{formatDateTime(item.publishedAt ?? item.scheduledAt)}</small>
                </td>
                <td>
                  <span>{item.recommendedRefreshAction}</span>
                  <small>{item.manualRefreshSteps.join(" / ")}</small>
                </td>
                <td>
                  <Badge tone={importStatusTone(item.latestImportStatus)}>{importStatusLabels[item.latestImportStatus]}</Badge>
                  <small>{item.latestImportAt ? formatDateTime(item.latestImportAt) : "暂无导入记录"}{item.recentlyCaptured ? " / 已覆盖本次发布" : " / 待刷新"}</small>
                </td>
                <td>
                  <Badge tone={recoveryStatusTone(item.matchStatus)}>{item.matchStatusLabel}</Badge>
                  <small>{item.attributionStatusLabel}；候选 {formatNumber(item.matchCandidateCount)}；已归因快照 {formatNumber(item.metricSnapshotCount)}</small>
                </td>
                <td>
                  <div className="inline-stack">
                    <a className="sm-button sm-button-secondary" href={item.officialBackendUrl} target="_blank" rel="noreferrer">{item.backendActionLabel}</a>
                    <a className="sm-button sm-button-primary" href="#manual-refresh">预览/保存最新抓取</a>
                  </div>
                </td>
              </tr>
            ))}
            {recoveryItems.length === 0 && (
              <tr>
                <td colSpan={6}>暂无发布后回收项；人工确认发布后，这里会显示平台、发布时间、刷新动作、导入状态和匹配归因状态。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table className="sm-table" data-testid="platform-content-match-candidates">
          <thead>
            <tr>
              <th>本地内容</th>
              <th>平台候选</th>
              <th>依据</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {workbench.matchCandidates.map((candidate) => {
              const local = workbench.postPublishRefresh.find((item) => item.platformVersionId === candidate.localPlatformVersionId);
              return (
                <tr key={candidate.id}>
                  <td>
                    <strong>{local?.contentTitle ?? candidate.localContentId}</strong>
                    <small>{formatNumber(Math.round(candidate.score * 100))}% 匹配度</small>
                  </td>
                  <td>
                    <PlatformBadge compact platform={candidate.platform} />
                    <span>{candidate.importedTitle}</span>
                  </td>
                  <td>{candidate.reasons.join(" / ")}</td>
                  <td><Button onClick={() => onConfirmMatch(candidate)} variant="primary">匹配到本地内容/平台版本</Button></td>
                </tr>
              );
            })}
            {workbench.matchCandidates.length === 0 && (
              <tr>
                <td colSpan={4}>暂无可确认候选；先预览/保存最新本地抓取后再人工匹配。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">{workbench.scheduledRefresh.boundary}</p>
    </Panel>
  );
}

function ScheduledRefreshSettingPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const reliability = snapshot.dataCaptureScheduleReliability;
  const catchUpLabel = reliability.startupCatchUpRequired ? "需要补抓" : "无需补抓";
  return (
    <Panel
      title="定时抓取设定"
      eyebrow="抓取可靠性"
      action={<span className="sm-badge sm-badge-info">{reliability.statusLabel}</span>}
    >
      <div className="platform-import-status-summary" data-testid="scheduled-refresh-setting" data-capture-schedule-reliability="true">
        <span><b>{reliability.modeLabel}</b> 当前模式</span>
        <span><b>{formatDateTime(reliability.latestRealCaptureAt ?? undefined)}</b> 最近真实采集</span>
        <span><b>{formatDateTime(reliability.nextSuggestedAt ?? undefined)}</b> 下次建议抓取</span>
        <span><b>每 {formatNumber(reliability.suggestedFrequencyHours)} 小时</b> 建议频率</span>
        <span><b>{catchUpLabel}</b> 开机补抓</span>
        <span><b>{reliability.statusLabel}</b> stale / 失败状态</span>
      </div>
      <p className="muted">{reliability.failureSummary} {reliability.startupCatchUpCopy}</p>
      <p className="muted">当前没有后台守护、小时级任务或开机自动抓取；开机后这里提示是否需要补抓。Windows 计划任务只提供草案，未确认不会注册；不保存敏感登录材料。</p>
    </Panel>
  );
}

export function ImportPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const [preset, setPreset] = useState<CsvImportPreset>("douyin");
  const [csv, setCsv] = useState(sampleCsv);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [message, setMessage] = useState("等待预览");
  const [isLoading, setIsLoading] = useState(false);

  const realRows = preview?.realPreviewRows ?? [];
  const previewStats = useMemo(() => {
    const confirmable = realRows.filter((row) => row.canConfirmSave).length;
    return {
      total: realRows.length,
      confirmable,
      blocked: realRows.length - confirmable,
      nativeMetrics: realRows.reduce((sum, row) => sum + Object.keys(row.nativeMetrics).length, 0)
    };
  }, [realRows]);

  async function runPreview() {
    setIsLoading(true);
    setMessage("预览中");
    try {
      let response: Response;
      if (file) {
        const form = new FormData();
        form.append("preset", preset);
        form.append("file", file);
        response = await fetch("/api/self-media/import/preview", { method: "POST", body: form });
      } else {
        response = await fetch("/api/self-media/import/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "csv", preset, csv })
        });
      }
      const body = await response.json() as ImportPreviewResult & { errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "导入预览失败");
      setPreview(body);
      setMessage(`已识别 ${body.realPreviewRows?.length ?? 0} 行`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入预览失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmPlatformContentMatch(candidate: DashboardSnapshot["publishToMetricsWorkbench"]["matchCandidates"][number]) {
    setIsLoading(true);
    setMessage("正在确认平台内容匹配...");
    try {
      const response = await fetch("/api/self-media/content-versions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "match_imported_content",
          localContentId: candidate.localContentId,
          localPlatformVersionId: candidate.localPlatformVersionId,
          importedContentId: candidate.importedContentId,
          metricSnapshotIds: candidate.metricSnapshotIds,
          confirmedBy: "local_user"
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "平台内容匹配失败");
      const dashboardResponse = await fetch("/api/self-media/dashboard");
      setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
      setMessage("已人工确认匹配；指标快照已归入本地内容，导入候选已从默认看板口径排除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "平台内容匹配失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell active="/import">
      <PageHeader
        eyebrow="数据接入"
        title="数据导入"
        description="默认只看四平台真实导入动作、最近导入结果和数据新鲜度。"
        actions={<Button onClick={() => window.location.reload()} variant="secondary">刷新</Button>}
      />
      <div className="import-page-stack">
        <PlatformDataHealthPanel health={currentSnapshot.platformDataHealth} />
        <PostPublishRefreshPanel onConfirmMatch={confirmPlatformContentMatch} snapshot={currentSnapshot} />
        <PlatformImportStatusPanel capabilities={currentSnapshot.platformImportOperationCapabilities} history={currentSnapshot.operationHistory} statuses={currentSnapshot.platformImportStatuses} onDashboardRefresh={setCurrentSnapshot} />
        <ScheduledRefreshSettingPanel snapshot={currentSnapshot} />
        <details className="analytics-data-section import-advanced-diagnostics" data-testid="import-advanced-diagnostics">
          <summary>
            <span>
              <strong>高级诊断与手动导入</strong>
              <small>内部检查和原始字段默认收起</small>
            </span>
            <i>展开</i>
          </summary>
          <div className="import-layout">
            <div className="import-preview-stack">
              <RealDataScopePanel scope={currentSnapshot.realDataScope} />
              <DailySelfMediaOpsPanel ops={currentSnapshot.dailySelfMediaOps} />
              <DailyGateStatusPanel gate={currentSnapshot.dailyPlatformOpsGate} />
              <TrustedAuditPanel status={currentSnapshot.trustedOperatingStatus} />
              <Panel title="操作历史诊断" eyebrow="运行记录">
                <OperationHistoryTable history={currentSnapshot.operationHistory} showDiagnostics testId="platform-operation-history-diagnostics-table" />
              </Panel>
            </div>
            <div className="import-preview-stack">
              <Panel title="手动 CSV / XLSX 导入" eyebrow="手动导入">
                <div className="form-grid">
                  <Field label="来源类型">
                    <SelectInput defaultValue="csv">
                      <option value="csv">平台 CSV / XLSX</option>
                    </SelectInput>
                  </Field>
                  <Field label="平台预设">
                    <SelectInput value={preset} onChange={(event) => setPreset(event.target.value as CsvImportPreset)}>
                      <option value="douyin">抖音</option>
                      <option value="xiaohongshu">小红书</option>
                      <option value="wechat">公众号</option>
                      <option value="video_account">视频号</option>
                      <option value="bilibili">B站</option>
                    </SelectInput>
                  </Field>
                  <Field label="CSV 内容">
                    <TextArea value={csv} onChange={(event) => setCsv(event.target.value)} />
                  </Field>
                  <Field label="XLSX 文件">
                    <input className="sm-input" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                  </Field>
                  <div className="import-preview-actions">
                    <Button onClick={runPreview} variant="primary" disabled={isLoading}>{isLoading ? "预览中" : "运行预览"}</Button>
                    <span>{message}</span>
                  </div>
                </div>
              </Panel>
              <Panel title="真实字段识别" eyebrow="字段预览" action={<StatusBadge status={previewStats.blocked > 0 ? "failed" : previewStats.total > 0 ? "published" : "draft"} />}>
                <div className="real-preview-summary">
                  <span><b>{previewStats.total}</b> 行</span>
                  <span><b>{previewStats.confirmable}</b> 可保存</span>
                  <span><b>{previewStats.nativeMetrics}</b> 原生字段</span>
                </div>
                <RealPreviewRows rows={realRows} />
              </Panel>
              <ImportDiffTable imports={currentSnapshot.imports} />
            </div>
          </div>
        </details>
      </div>
    </AppShell>
  );
}
