"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthedBrowserAutoRefreshResult, AuthedBrowserPlatform, AuthedBrowserProfileStatus, AuthedBrowserProfileStatusView, CsvImportPreset, DashboardSnapshot, DouyinAuthedBrowserCaptureResult, DouyinBrowserVisibleRow, ImportPreviewResult, PlatformImportOperationAction, PlatformImportOperationCapability, PlatformImportOperationPlatform, PlatformImportOperationResult, PlatformImportStatus, RealImportPreviewRow, XiaohongshuAuthedBrowserCaptureResult, XiaohongshuBrowserVisibleRow } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatNumber } from "../foundations/format";
import { platformLabels } from "../foundations/labels";
import { ImportDiffTable } from "../patterns/ImportDiffTable";
import { ImportPlatformOverview, type ImportPlatformFlowState, type ImportUpdatePanelKey } from "../patterns/ImportPlatformOverview";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Field, SelectInput, TextArea } from "../primitives/Form";
import { Panel } from "../primitives/Panel";

const sampleCsv = [
  "item_id,title,create_time,play_count,digg_count,comment_count,share_count,forward_count,download_count",
  "dy-real-1,抖音真实字段预览,2026-06-01T09:00:00.000Z,1000,100,10,8,3,2",
  ",只有标题没有ID,2026-06-01T09:00:00.000Z,200,20,2,1,0,0"
].join("\n");

const sampleDouyinLocalExportCsv = [
  "作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,转发数,下载数,涨粉,完播率,平均播放时长,选题",
  "dy-local-001,AI短片三秒钩子复盘,2026-06-01T09:00:00.000Z,1800,120,18,44,15,6,3,11,42%,19s,AI短片"
].join("\n");

const sampleXiaohongshuLocalExportCsv = [
  "笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉,曝光量,互动量,互动率,流量来源,搜索词,选题",
  "xhs-local-001,AI工具复盘清单,2026-06-01T09:00:00.000Z,900,66,11,80,12,5,2000,169,18%,搜索,AI工具,AI工具"
].join("\n");

const videoAccountLocalExportPlaceholder = [
  "视频ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,朋友圈转发,涨粉,完播率,平均播放时长,公众号阅读转化,流量来源,选题",
  "请粘贴今天从视频号助手确认过的本人内容级数据，每行一条作品"
].join("\n");

const bilibiliLocalExportPlaceholder = [
  "稿件ID,BV号,标题,发布时间,播放量,点赞数,评论数,弹幕数,收藏数,分享数,投币数,涨粉,完播率,平均播放时长,选题",
  "请粘贴今天从 B站创作中心确认过的本人稿件数据，每行一条稿件"
].join("\n");

const confidenceLabels: Record<RealImportPreviewRow["mappingConfidence"], string> = {
  confirmed_official: "官方字段",
  mature_reference: "成熟参考",
  draft_realistic: "待样本确认",
  confirmed_sampled: "样本确认"
};

const warningLabels: Record<string, string> = {
  missing_title: "缺少标题",
  missing_native_id_or_url: "缺少原生 ID 或链接",
  fallback_id_from_visible_text: "ID 仅由页面文字生成，不能当作稳定平台 ID",
  not_creator_center_owned_works_page: "当前页未证明是本人作品管理页",
  no_metric_number_detected: "未识别到指标数字"
};

const normalizedMetricLabels: Record<string, string> = {
  publishedAt: "发布时间",
  capturedAt: "抓取时间",
  views: "播放/观看",
  likes: "点赞",
  comments: "评论",
  saves: "收藏",
  shares: "分享",
  followersDelta: "涨粉"
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

const captureModeLabels: Record<DashboardSnapshot["trustedAutoCaptureScheduler"]["statuses"][number]["captureMode"], string> = {
  manual: "手动",
  browser_assisted: "浏览器辅助",
  official_api: "官方授权能力"
};

const captureConnectionStatusLabels: Record<DashboardSnapshot["trustedAutoCaptureScheduler"]["statuses"][number]["captureConnectionStatus"], string> = {
  not_authorized: "未授权",
  authorized: "已授权",
  browser_session_active: "会话有效",
  browser_session_missing: "会话不可用"
};

type CaptureRealityPlatformKey = "douyin" | "xiaohongshu" | "video-account" | "bilibili";

interface CaptureRealityCapability {
  key: CaptureRealityPlatformKey;
  platform: PlatformImportStatus["platform"] | "video_account";
  label: string;
  officialApi: string;
  appReview: string;
  oauth: string;
  contentData: string;
  publishDraft: string;
  scheduledAutoCapture: string;
  implemented: string;
  browserAssisted: string;
  manualImport: string;
  futureConnection: string;
}

const captureRealityCapabilities: CaptureRealityCapability[] = [
  {
    key: "douyin",
    platform: "douyin",
    label: "抖音",
    officialApi: "未来可接官方能力",
    appReview: "需要应用审核",
    oauth: "需要 OAuth、访问令牌和 scope",
    contentData: "官方文档有视频数据能力，接入前不能抓",
    publishDraft: "有上传/发布能力文档，默认不自动发布",
    scheduledAutoCapture: "未授权时不支持定时自动抓",
    implemented: "当前仅本地手动导入/浏览器辅助映射",
    browserAssisted: "可浏览器辅助",
    manualImport: "可手动导入",
    futureConnection: "连接平台：待接入 OAuth"
  },
  {
    key: "xiaohongshu",
    platform: "xiaohongshu",
    label: "小红书",
    officialApi: "未确认公开稳定个人创作者数据 API",
    appReview: "开放平台/Ark 能力需按官方资质申请",
    oauth: "本产品未接入授权流程",
    contentData: "内容级数据当前靠导出或浏览器辅助",
    publishDraft: "不写成官方草稿箱/API 发布",
    scheduledAutoCapture: "当前不支持定时自动抓",
    implemented: "当前仅本地手动导入/浏览器辅助映射",
    browserAssisted: "可浏览器辅助",
    manualImport: "可手动导入",
    futureConnection: "连接平台：待官方能力确认"
  },
  {
    key: "video-account",
    platform: "video_account",
    label: "视频号",
    officialApi: "官方能力待确认，个人创作者不默认假设可用",
    appReview: "微信开放能力需按具体场景申请",
    oauth: "本产品未接入视频号授权",
    contentData: "手动更新为主：粘贴/导入本人内容级数据",
    publishDraft: "不写成官方草稿箱/API 发布",
    scheduledAutoCapture: "登录抓取需扫码，暂不作为每日自动流程",
    implemented: "当前最小可用为手动录入/粘贴后预览保存",
    browserAssisted: "后续探索：尝试登录抓取",
    manualImport: "可手动导入",
    futureConnection: "连接平台：待官方能力确认"
  },
  {
    key: "bilibili",
    platform: "bilibili",
    label: "B站",
    officialApi: "未来可接开放平台能力",
    appReview: "需要开发者入驻/能力审核",
    oauth: "需要授权和访问令牌",
    contentData: "稿件内容级数据可做未来 API/导入适配",
    publishDraft: "内容分发未来可接，默认不自动发布",
    scheduledAutoCapture: "未授权时不支持定时自动抓",
    implemented: "当前内容级导入可保存；账号指标 preview-only",
    browserAssisted: "可浏览器辅助",
    manualImport: "可手动导入",
    futureConnection: "连接平台：待接入授权"
  }
];

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
  if (value.includes("draft_realistic_headers_need_real_export_confirmation")) return "字段格式需要按真实导出表人工确认";
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
  if (/creator_center|source=|provider|provider source id|runId/i.test(normalized)) return "真实平台来源已识别，细节已收进更多信息。";
  if (normalized.length > 72) return "导入提示已收起，详情见更多信息。";
  return normalized;
}

function operatorWarnings(values: string[]) {
  return [...new Set(values.map(operatorWarningLabel))].slice(0, 3);
}

function isPausedWechatRecoveryText(value: string) {
  return /(公众号|微信后台|wechat|wechat_official)/i.test(value);
}

function metricEntries(row: RealImportPreviewRow) {
  return Object.entries(row.normalized)
    .filter(([key, value]) => key !== "id" && key !== "title" && value !== undefined && value !== "")
    .map(([key, value]) => [normalizedMetricLabels[key] ?? key, value] as const);
}

function objectEntries(value: Record<string, unknown>, limit = 4) {
  return Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== "").slice(0, limit);
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",").pop() ?? "" : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function summaryWarnings(summary: PlatformImportOperationResult["summaries"][number]) {
  return summary.errorMessage ? [summary.errorMessage, ...summary.warnings] : summary.warnings;
}

function sourcePageKindLabel(value?: DouyinBrowserVisibleRow["sourcePageKind"] | XiaohongshuBrowserVisibleRow["sourcePageKind"]) {
  if (value === "creator_center_owned_works") return "本人后台作品页";
  if (value === "creator_center_owned_detail") return "本人后台详情页";
  if (value === "creator_center_data_analysis_table") return "内容分析表格";
  if (value === "public_creator_home") return "公开主页";
  if (value === "public_or_wrong_page") return "非后台页";
  return "后台页待确认";
}

function nativeIdConfidenceLabel(value?: DouyinBrowserVisibleRow["nativeIdConfidence"] | XiaohongshuBrowserVisibleRow["nativeIdConfidence"]) {
  if (value === "stable_platform_id") return "平台 ID 可靠";
  if (value === "visible_platform_id") return "页面 ID 可见";
  if (value === "fallback_text_hash") return "文字 fallback ID";
  return "ID 缺失";
}

function canSaveAuthedBrowserRow(row: DouyinBrowserVisibleRow | XiaohongshuBrowserVisibleRow) {
  const isXiaohongshuRow = "format" in row || "noteUrl" in row;
  const trustedContext = isXiaohongshuRow
    ? row.sourcePageKind === "creator_center_data_analysis_table" && row.confidence === "owned_creator_center_data_analysis_table"
    : (row.sourcePageKind === "creator_center_owned_works" && row.confidence === "owned_creator_center_row")
      || (row.sourcePageKind === "creator_center_owned_detail" && row.confidence === "owned_creator_center_detail");
  return trustedContext
    && (row.nativeIdConfidence === "stable_platform_id" || row.nativeIdConfidence === "visible_platform_id")
    && Boolean(row.nativeId)
    && row.views + row.likes + row.comments + row.saves + row.shares > 0;
}

function DouyinAuthedBrowserRows({ rows }: { rows: DouyinBrowserVisibleRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="real-preview-empty">
        <strong>暂无抖音页面抓取预览</strong>
        <span>打开抖音后台并登录后，进入作品管理列表，或点开单个作品的数据/详情页，再点击预览。</span>
      </div>
    );
  }
  return (
    <div className="table-wrap douyin-authed-browser-preview">
      <table className="sm-table" data-testid="douyin-authed-browser-preview">
        <thead>
          <tr>
            <th>作品</th>
            <th>播放</th>
            <th>点赞</th>
            <th>评论</th>
            <th>收藏</th>
            <th>分享</th>
            <th>确认状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const canSave = canSaveAuthedBrowserRow(row);
            return (
              <tr key={row.id}>
                <td>
                  <strong>{row.title}</strong>
                  <small>{row.publishedAt ? formatDateTime(row.publishedAt) : "发布时间未识别"} · {row.nativeId ?? row.id}</small>
                </td>
                <td>{formatNumber(row.views)}</td>
                <td>{formatNumber(row.likes)}</td>
                <td>{formatNumber(row.comments)}</td>
                <td>{formatNumber(row.saves)}</td>
                <td>{formatNumber(row.shares)}</td>
                <td>
                  <Badge tone={canSave ? "success" : "warning"}>{canSave ? "可保存候选" : "需人工核对"}</Badge>
                  <small>{sourcePageKindLabel(row.sourcePageKind)} · {nativeIdConfidenceLabel(row.nativeIdConfidence)}</small>
                  {row.warnings.length > 0 && <small>{operatorWarnings(row.warnings).join(" / ")}</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function XiaohongshuAuthedBrowserRows({ rows }: { rows: XiaohongshuBrowserVisibleRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="real-preview-empty" data-testid="xiaohongshu-authed-browser-preview">
        <strong>暂无小红书页面抓取预览</strong>
        <span>打开小红书创作服务平台并登录后，读取数据看板 / 内容分析 / 笔记数据表格；详情页只作为兜底预览。</span>
      </div>
    );
  }
  return (
    <div className="table-wrap xiaohongshu-authed-browser-preview">
      <table className="sm-table" data-testid="xiaohongshu-authed-browser-preview">
        <thead>
          <tr>
            <th>笔记/作品</th>
            <th>曝光</th>
            <th>浏览</th>
            <th>封面点击率</th>
            <th>点赞</th>
            <th>评论</th>
            <th>收藏</th>
            <th>涨粉</th>
            <th>分享</th>
            <th>确认状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const canSave = canSaveAuthedBrowserRow(row);
            return (
              <tr key={row.id}>
                <td>
                  <strong>{row.title}</strong>
                  <small>{row.publishedAt ? formatDateTime(row.publishedAt) : "发布时间未识别"} · {row.nativeId ?? row.id}</small>
                </td>
                <td>{row.exposures === undefined ? "缺失" : formatNumber(row.exposures)}</td>
                <td>{formatNumber(row.views)}</td>
                <td>{row.coverClickRate === undefined ? "缺失" : `${formatNumber(row.coverClickRate)}%`}</td>
                <td>{formatNumber(row.likes)}</td>
                <td>{formatNumber(row.comments)}</td>
                <td>{formatNumber(row.saves)}</td>
                <td>{formatNumber(row.followersDelta)}</td>
                <td>{formatNumber(row.shares)}</td>
                <td>
                  <Badge tone={canSave ? "success" : "warning"}>{canSave ? "可保存候选" : "需人工核对"}</Badge>
                  <small>{sourcePageKindLabel(row.sourcePageKind)} · {nativeIdConfidenceLabel(row.nativeIdConfidence)}</small>
                  {row.warnings.length > 0 && <small>{operatorWarnings(row.warnings).join(" / ")}</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function authedBrowserStateTone(state: AuthedBrowserProfileStatus["state"]) {
  if (state === "session_maybe_available") return "success";
  if (state === "waiting_login") return "info";
  if (state === "capture_failed") return "danger";
  if (state === "session_expired") return "warning";
  return "warning";
}

function AuthedBrowserProfileManager({
  loadingKey,
  message,
  statusView,
  onConfirmLogin,
  onOpen
}: {
  loadingKey: string;
  message: string;
  statusView: AuthedBrowserProfileStatusView | null;
  onConfirmLogin: (platform: AuthedBrowserPlatform) => void;
  onOpen: (platform: AuthedBrowserPlatform, target?: "default" | "works_page") => void;
}) {
  const profiles = statusView?.profiles ?? [];
  return (
    <Panel
      className="authed-browser-profile-manager"
      data-testid="authed-browser-profile-manager"
      title="本机登录会话"
      eyebrow="四平台登录会话"
      action={<Badge tone={profiles.some((item) => item.state === "session_maybe_available") ? "success" : "warning"}>{profiles.filter((item) => item.state === "session_maybe_available").length} 个可能可用</Badge>}
    >
      <div className="capture-reality-box" data-testid="authed-browser-profile-boundary">
        <strong>本地登录边界</strong>
        <p>每个平台使用独立本机会话；登录材料不写入业务数据、文档或仓库。本地导出仍是折叠兜底，不恢复公众号；B站账号指标仍 preview-only。</p>
      </div>
      <div className="capture-mode-status-grid" data-testid="authed-browser-profile-state-labels">
        <span>未打开</span>
        <span>等待登录</span>
        <span>已登录可能可用</span>
        <span>会话过期</span>
        <span>抓取失败</span>
      </div>
      <div className="platform-operation-grid" data-testid="authed-browser-profile-grid">
        {profiles.map((profile) => {
          const isRunning = loadingKey === `${profile.platform}:open` || loadingKey === `${profile.platform}:confirm_login`;
          return (
            <article key={profile.platform} className="platform-operation-card">
              <div className="platform-operation-card-head">
                <PlatformBadge platform={profile.platform} />
                <Badge tone={authedBrowserStateTone(profile.state)}>{profile.stateLabel}</Badge>
              </div>
              <p>{profile.nextAction}</p>
              <small>本机会话：{profile.profileExists ? "已准备" : "未创建"}</small>
              <small>最近打开：{profile.lastOpenedAt ? formatDateTime(profile.lastOpenedAt) : "暂无"} / 确认登录：{profile.lastUserConfirmedLoginAt ? formatDateTime(profile.lastUserConfirmedLoginAt) : "暂无"}</small>
              {profile.failureMessage && <small>失败提示：{profile.failureMessage}</small>}
              <div className="import-preview-actions">
                <Button data-testid={`authed-browser-open-${profile.key}`} onClick={() => onOpen(profile.platform, "works_page")} variant="secondary" disabled={isRunning}>{loadingKey === `${profile.platform}:open` ? "打开中" : profile.platform === "xiaohongshu" ? "打开笔记管理页" : profile.platform === "douyin" ? "打开作品管理页" : "打开后台"}</Button>
                <Button data-testid={`authed-browser-confirm-${profile.key}`} onClick={() => onConfirmLogin(profile.platform)} variant="ghost" disabled={isRunning || profile.state === "not_opened"}>{loadingKey === `${profile.platform}:confirm_login` ? "确认中" : "确认已登录"}</Button>
                {profile.captureMvpEnabled ? <a className="sm-button sm-button-primary" href={profile.platform === "xiaohongshu" ? "#xiaohongshu-authed-browser-capture-mvp" : "#douyin-authed-browser-capture-mvp"}>进入平台读取</a> : <span>当前先复用登录状态；读取适配待接入。</span>}
              </div>
            </article>
          );
        })}
        {profiles.length === 0 && <article className="platform-operation-card"><strong>正在读取本机浏览器会话状态</strong><p>如果长时间没有状态，请刷新页面或检查本地服务。</p></article>}
      </div>
      <div className="trusted-weekly-summary-foot">
        <span>{message}</span>
      </div>
    </Panel>
  );
}

function LoginCaptureAutoRefreshPanel({
  isRunning,
  onRefresh,
  result,
  startupSummary
}: {
  isRunning: boolean;
  onRefresh: () => void;
  result: AuthedBrowserAutoRefreshResult | null;
  startupSummary: string;
}) {
  const primaryAction = result ? loginCapturePrimaryAction(result) : null;
  return (
    <div className="login-auto-refresh-panel" data-testid="login-capture-auto-refresh">
      <div>
        <strong>登录抓取状态检查</strong>
        <p>进入本页只刷新本机登录 profile 状态，不会自动打开抖音/小红书/视频号窗口；需要抓取时请手动点击按钮打开平台后台。系统只做预览，不会静默保存。</p>
        <small data-testid="login-capture-startup-check">{startupSummary}</small>
      </div>
      <div className="import-preview-actions">
        <Button data-testid="login-capture-auto-refresh-button" onClick={onRefresh} variant="primary" disabled={isRunning}>{isRunning ? "正在刷新" : "手动打开后台并刷新"}</Button>
      </div>
      {result && (
        <div className="platform-operation-grid" data-testid="login-capture-auto-refresh-results">
          <article className="platform-operation-card">
            <div className="platform-operation-card-head">
              <strong>{loginCaptureTriggerLabel(result.trigger)}</strong>
              <Badge tone={result.openedWindowCount > 0 ? "info" : "success"}>{result.openedWindowCount} 个窗口</Badge>
            </div>
            <p>{result.summary}</p>
            <small>后台开窗：{result.autoOpenEnabled ? "由本次手动点击启用" : "未启用"} / 保存：仍需你确认。</small>
          </article>
          {primaryAction && (
            <article className="platform-operation-card" data-testid="login-capture-next-step">
              <div className="platform-operation-card-head">
                <strong>下一步</strong>
                <Badge tone={primaryAction.tone}>{primaryAction.badge}</Badge>
              </div>
              <p>{primaryAction.title}</p>
              <small>{primaryAction.detail}</small>
              <div className="import-preview-actions">
                {primaryAction.href ? <a className="sm-button sm-button-primary" href={primaryAction.href}>{primaryAction.actionLabel}</a> : <Button onClick={onRefresh} variant="primary" disabled={isRunning}>{primaryAction.actionLabel}</Button>}
              </div>
            </article>
          )}
          {result.results.map((item) => (
            <article key={`auto-refresh-${item.platform}`} className="platform-operation-card">
              <div className="platform-operation-card-head">
                <PlatformBadge platform={item.platform} />
                <Badge tone={item.status === "preview_ready" ? "success" : item.status === "failed" ? "danger" : item.status === "needs_content_page" ? "warning" : "info"}>{item.statusLabel}</Badge>
              </div>
              <p>{item.message}</p>
              <small>{item.nextAction}</small>
              {item.openedWindow && <small>已按你的点击打开作品/笔记管理入口；如果平台跳回首页，请按下一步提示进入对应管理页。</small>}
              <small>{formatNumber(item.contentCount)} 条内容 / {formatNumber(item.metricCount)} 条指标</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function loginCaptureTriggerLabel(trigger: AuthedBrowserAutoRefreshResult["trigger"]) {
  if (trigger === "startup") return "启动自动检查";
  if (trigger === "focus_return") return "登录返回提示";
  return "手动打开刷新";
}

function loginCapturePrimaryAction(result: AuthedBrowserAutoRefreshResult) {
  const capturePlatforms = new Set<AuthedBrowserPlatform>(["douyin", "xiaohongshu"]);
  const active = result.results.filter((item) => capturePlatforms.has(item.platform));
  const preview = active.find((item) => item.status === "preview_ready");
  if (preview) {
    return {
      title: `${preview.label} 已抓到预览`,
      detail: "请跳到对应平台预览区，确认是本人后台作品级数据后再保存。",
      badge: "去确认",
      tone: "success" as const,
      href: preview.platform === "xiaohongshu" ? "#xiaohongshu-authed-browser-capture-mvp" : "#douyin-authed-browser-capture-mvp",
      actionLabel: "查看预览并确认保存"
    };
  }
  const needsContentPage = active.find((item) => item.status === "needs_content_page");
  if (needsContentPage) {
    const isXiaohongshu = needsContentPage.platform === "xiaohongshu";
    return {
      title: `${needsContentPage.label} 需要切到${isXiaohongshu ? "笔记管理页" : "作品管理页"}`,
      detail: needsContentPage.nextAction,
      badge: isXiaohongshu ? "笔记页" : "作品页",
      tone: "warning" as const,
      href: "",
      actionLabel: isXiaohongshu ? "我已切到笔记管理页，重新预览" : "我已切到作品管理页，重新预览"
    };
  }
  const needsLogin = active.find((item) => item.status === "needs_login" || item.status === "failed");
  if (needsLogin) {
    return {
      title: `${needsLogin.label} 需要你完成登录`,
      detail: "请在自动打开的平台窗口完成登录或验证码；回到本页后系统会自动复查。",
      badge: "需登录",
      tone: "info" as const,
      href: "",
      actionLabel: "我已登录，重新预览"
    };
  }
  return {
    title: "当前没有可自动抓取的平台",
    detail: "抖音和小红书支持登录后预览；视频号手动更新为主，登录抓取需扫码且暂不作为每日自动流程；B站浏览器抓取暂未接入。",
    badge: "边界",
    tone: "info" as const,
    href: "",
    actionLabel: "重新检查"
  };
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
                <span>平台原生字段</span>
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
                    <small>上传表字段仅供排查映射</small>
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

function CaptureRealityMatrix({ snapshot }: { snapshot: DashboardSnapshot }) {
  const statusesByPlatform = new Map(snapshot.platformImportStatuses.map((status) => [status.platform, status]));
  const healthByPlatform = new Map(snapshot.platformDataHealth.platforms.map((platform) => [platform.platform, platform]));
  const schedulerByPlatform = new Map(snapshot.trustedAutoCaptureScheduler.statuses.map((status) => [status.key, status]));
  return (
    <div className="capture-reality-matrix" data-testid="platform-capture-reality-matrix">
      {captureRealityCapabilities.map((capability) => {
        const status = statusesByPlatform.get(capability.platform);
        const health = healthByPlatform.get(capability.key);
        const scheduler = schedulerByPlatform.get(capability.key);
        const latestImportAt = status?.latestRunAt ?? health?.freshness.latestRealCaptureAt ?? health?.rawLatestModifiedAt;
        const latestImportLabel = scheduler?.lastSuccessfulCaptureAt ? formatDateTime(scheduler.lastSuccessfulCaptureAt) : latestImportAt ? formatDateTime(latestImportAt) : "暂无";
        const nextScheduledLabel = scheduler?.nextScheduledCaptureAt ? formatDateTime(scheduler.nextScheduledCaptureAt) : "未计划";
        const automaticEnabled = scheduler?.captureSchedule.enabled === true;
        return (
          <article className="capture-reality-card" data-platform-capture-status={capability.key} key={capability.key}>
            <header>
              <PlatformBadge platform={capability.platform} />
              <Badge tone={scheduler?.isAuthorized || scheduler?.browserSessionAvailable ? "success" : "warning"}>{scheduler ? captureConnectionStatusLabels[scheduler.captureConnectionStatus] : "未授权"}</Badge>
              <Badge tone="info">API 未接入</Badge>
            </header>
            <dl>
              <div><dt>当前模式</dt><dd>{scheduler ? captureModeLabels[scheduler.captureMode] : "手动"}</dd></div>
              <div><dt>抓取状态</dt><dd>{scheduler?.statusLabel ?? "手动导入"}</dd></div>
              <div><dt>最近抓取</dt><dd>{latestImportLabel}</dd></div>
              <div><dt>下一次抓取</dt><dd>{nextScheduledLabel}</dd></div>
              <div><dt>人工操作</dt><dd>{scheduler?.needsManualAction ? "需要人工操作" : "无需人工介入"}</dd></div>
              <div><dt>官方能力</dt><dd>{capability.officialApi}</dd></div>
              <div><dt>应用审核</dt><dd>{capability.appReview}</dd></div>
              <div><dt>授权要求</dt><dd>{capability.oauth}</dd></div>
              <div><dt>内容级数据</dt><dd>{capability.contentData}</dd></div>
              <div><dt>发布/草稿箱</dt><dd>{capability.publishDraft}</dd></div>
              <div><dt>定时自动抓</dt><dd>{capability.scheduledAutoCapture}</dd></div>
              <div><dt>当前实现</dt><dd>{capability.implemented}</dd></div>
            </dl>
            <div className="capture-reality-status-row">
              <span>{capability.browserAssisted}</span>
              <span>{capability.manualImport}</span>
              <span>最近抓取：{latestImportLabel}</span>
              <span>下一次抓取：{nextScheduledLabel}</span>
              <span>自动抓取：{automaticEnabled ? "已启用" : "未启用"}</span>
              <span>{scheduler?.missedCaptureReason ?? scheduler?.captureSchedule.reason ?? "等待人工导入"}</span>
            </div>
            <div className="capture-reality-footer">
              <button className="sm-button sm-button-secondary" disabled type="button">{capability.futureConnection}</button>
              <a className="sm-button sm-button-primary" href="#manual-refresh">手动导入</a>
            </div>
          </article>
        );
      })}
    </div>
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
  const currentRecoveryItems = recoveryItems
    .filter((item) => item.matchStatus !== "attributed")
    .filter((item) => !isPausedWechatRecoveryText(`${item.contentTitle} ${item.versionTitle}`))
    .slice(0, 8);
  const currentVersionIds = new Set(currentRecoveryItems.map((item) => item.platformVersionId));
  const currentCandidates = workbench.matchCandidates.filter((candidate) => currentVersionIds.has(candidate.localPlatformVersionId));
  return (
    <Panel
      id="post-publish-refresh"
      title="发布后回收当前任务"
      eyebrow="发布后数据回收"
      action={<span className="sm-badge sm-badge-info">{currentRecoveryItems.length} 条当前待处理</span>}
    >
      <p className="muted" data-testid="post-publish-refresh-boundary">发布后刷新是本地手动抓取/同步，不是平台自动回调；系统只给候选，用户确认前不会把新平台内容指标归入本地内容。</p>
      <div className="platform-import-status-summary">
        <span><b>{formatNumber(workbench.postPublishRefresh.length)}</b> 发布后待刷新</span>
        <span><b>{formatNumber(currentRecoveryItems.length)}</b> 当前回收任务</span>
        <span><b>{formatNumber(currentCandidates.length)}</b> 可人工确认候选</span>
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
            {currentRecoveryItems.map((item) => (
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
            {currentRecoveryItems.length === 0 && (
              <tr>
                <td colSpan={6}>暂无当前待回收项；人工确认发布后，这里会显示平台、发布时间、刷新动作、导入状态和匹配归因状态。</td>
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
            {currentCandidates.map((candidate) => {
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
            {currentCandidates.length === 0 && (
              <tr>
                <td colSpan={4}>暂无可确认候选；先预览/保存最新本地抓取后再人工匹配。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">{workbench.scheduledRefresh.boundary}</p>
      {recoveryItems.length > currentRecoveryItems.length && <p className="muted">已归因或历史回收项已下移，不占用当前任务区。</p>}
    </Panel>
  );
}

function ScheduledRefreshSettingPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const reliability = snapshot.dataCaptureScheduleReliability;
  const catchUpLabel = reliability.startupCatchUpRequired ? "需要补抓" : "无需补抓";
  return (
    <Panel
      title="手动检查节奏"
      eyebrow="非自动抓取"
      action={<span className="sm-badge sm-badge-info">{reliability.statusLabel}</span>}
    >
      <div className="platform-import-status-summary" data-testid="scheduled-refresh-setting" data-capture-schedule-reliability="true">
        <span><b>{reliability.modeLabel}</b> 当前模式</span>
        <span><b>{formatDateTime(reliability.latestRealCaptureAt ?? undefined)}</b> 最近真实采集</span>
        <span><b>{formatDateTime(reliability.nextSuggestedAt ?? undefined)}</b> 下次建议检查</span>
        <span><b>每 {formatNumber(reliability.suggestedFrequencyHours)} 小时</b> 建议频率</span>
        <span><b>{catchUpLabel}</b> 开机补抓</span>
        <span><b>{reliability.statusLabel}</b> stale / 失败状态</span>
      </div>
      <p className="muted">{reliability.failureSummary} {reliability.startupCatchUpCopy}</p>
      <p className="muted">当前没有后台守护、小时级任务或开机自动抓取；开机后这里提示是否需要补抓。Windows 计划任务只提供草案，未确认不会注册；不保存敏感登录材料。</p>
    </Panel>
  );
}

function previewStatsFor(preview: ImportPreviewResult | null) {
  const realRows = preview?.realPreviewRows ?? [];
  const confirmable = realRows.filter((row) => row.canConfirmSave).length;
  return {
    rows: realRows,
    total: realRows.length,
    confirmable,
    blocked: realRows.length - confirmable,
    nativeMetrics: realRows.reduce((sum, row) => sum + Object.keys(row.nativeMetrics).length, 0)
  };
}

type LocalFilePlatform = "douyin" | "xiaohongshu" | "video_account" | "bilibili";

function douyinBrowserLoginStateLabel(state?: DouyinAuthedBrowserCaptureResult["loginState"]) {
  const labels: Record<DouyinAuthedBrowserCaptureResult["loginState"], string> = {
    not_opened: "未打开",
    needs_login: "待登录",
    user_confirmed: "已确认登录",
    logged_in_or_accessible: "已登录",
    unknown: "待确认",
    closed: "已关闭",
    error: "异常"
  };
  return state ? labels[state] : "未打开";
}

function humanDouyinBrowserMessage(message: string | undefined, action: DouyinAuthedBrowserCaptureResult["action"]) {
  const normalized = `${message ?? ""} ${action}`;
  if (/cookie|token|password|header|headers|raw|request|storage|credential|sensitive/i.test(normalized)) {
    return "这次输入包含登录材料，系统不会接收或保存；请只在平台网页里完成登录。";
  }
  if (/not_opened|needs_login|login|登录|未打开|未登录|browser/i.test(normalized) && action !== "capture_preview" && action !== "capture_current_detail_preview") {
    return "请先打开抖音后台并完成登录。";
  }
  if (/no rows|未识别|empty|作品管理|数据表现|详情页|current page|content|row|table|列表/i.test(normalized) || action === "capture_preview" || action === "capture_current_detail_preview") {
    if (message && /已从当前抖音页面识别|已识别|保存前请确认/.test(message)) return message;
    return "请切到作品管理页再抓。";
  }
  if (message && !/cookie|token|password|header|headers|raw|request|storage|credential|not_opened|needs_login/i.test(message)) {
    return message;
  }
  return "这次没有读到作品数据。请确认抖音后台已打开，并切到作品管理页再抓。";
}

function xiaohongshuBrowserLoginStateLabel(state?: XiaohongshuAuthedBrowserCaptureResult["loginState"]) {
  const labels: Record<XiaohongshuAuthedBrowserCaptureResult["loginState"], string> = {
    not_opened: "未打开",
    needs_login: "待登录",
    user_confirmed: "已确认登录",
    logged_in_or_accessible: "已登录",
    wrong_page: "页面不对",
    unknown: "待确认",
    closed: "已关闭",
    error: "异常"
  };
  return state ? labels[state] : "未打开";
}

function humanXiaohongshuBrowserMessage(message: string | undefined, action: XiaohongshuAuthedBrowserCaptureResult["action"]) {
  const normalized = `${message ?? ""} ${action}`;
  if (/cookie|token|password|header|headers|raw|request|storage|credential|sensitive/i.test(normalized)) {
    return "这次输入包含登录材料，系统不会接收或保存；请只在平台网页里完成登录。";
  }
  if (/wrong_page|creator\.xiaohongshu\.com|公开推荐|非本人|不是小红书创作服务平台/i.test(normalized)) {
    return "请回到小红书创作服务平台后台；公开推荐页、搜索页和非本人内容不会保存。";
  }
  if (/not_opened|needs_login|login|登录|未打开|未登录|browser/i.test(normalized) && action !== "capture_preview" && action !== "capture_current_detail_preview") {
    return "请先打开小红书创作服务平台并完成登录。";
  }
  if (/no rows|未识别|empty|笔记管理|数据表现|详情页|current page|content|row|table|列表/i.test(normalized) || action === "capture_preview" || action === "capture_current_detail_preview") {
    if (message && /已从当前小红书后台页面识别|已识别|保存前请确认/.test(message)) return message;
    return "请切到笔记管理或数据表现页再抓。";
  }
  if (message && !/cookie|token|password|header|headers|raw|request|storage|credential|not_opened|needs_login/i.test(message)) {
    return message;
  }
  return "这次没有读到笔记数据。请确认小红书后台已打开，并切到笔记管理或数据表现页再抓。";
}

export function ImportPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const [preset, setPreset] = useState<CsvImportPreset>("douyin");
  const [csv, setCsv] = useState(sampleCsv);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [douyinCsv, setDouyinCsv] = useState(sampleDouyinLocalExportCsv);
  const [douyinFile, setDouyinFile] = useState<File | null>(null);
  const [douyinPreview, setDouyinPreview] = useState<ImportPreviewResult | null>(null);
  const [douyinConfirmed, setDouyinConfirmed] = useState(false);
  const [douyinMessage, setDouyinMessage] = useState("等待抖音导出表");
  const [douyinBrowserResult, setDouyinBrowserResult] = useState<DouyinAuthedBrowserCaptureResult | null>(null);
  const [douyinBrowserLoginConfirmed, setDouyinBrowserLoginConfirmed] = useState(false);
  const [douyinBrowserMetricsConfirmed, setDouyinBrowserMetricsConfirmed] = useState(false);
  const [douyinBrowserMessage, setDouyinBrowserMessage] = useState("等待打开抖音后台");
  const [browserProfileStatus, setBrowserProfileStatus] = useState<AuthedBrowserProfileStatusView | null>(null);
  const [browserProfileLoadingKey, setBrowserProfileLoadingKey] = useState("");
  const [browserProfileMessage, setBrowserProfileMessage] = useState("正在读取本机登录会话状态");
  const [autoRefreshResult, setAutoRefreshResult] = useState<AuthedBrowserAutoRefreshResult | null>(null);
  const [autoRefreshMessage, setAutoRefreshMessage] = useState("启动检查中：仅确认本机登录状态，不会自动打开平台后台。");
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [xiaohongshuCsv, setXiaohongshuCsv] = useState(sampleXiaohongshuLocalExportCsv);
  const [xiaohongshuFile, setXiaohongshuFile] = useState<File | null>(null);
  const [xiaohongshuPreview, setXiaohongshuPreview] = useState<ImportPreviewResult | null>(null);
  const [xiaohongshuConfirmed, setXiaohongshuConfirmed] = useState(false);
  const [xiaohongshuMessage, setXiaohongshuMessage] = useState("等待小红书导出表");
  const [xiaohongshuBrowserResult, setXiaohongshuBrowserResult] = useState<XiaohongshuAuthedBrowserCaptureResult | null>(null);
  const [xiaohongshuBrowserLoginConfirmed, setXiaohongshuBrowserLoginConfirmed] = useState(false);
  const [xiaohongshuBrowserMetricsConfirmed, setXiaohongshuBrowserMetricsConfirmed] = useState(false);
  const [xiaohongshuBrowserMessage, setXiaohongshuBrowserMessage] = useState("等待打开小红书后台");
  const [videoAccountCsv, setVideoAccountCsv] = useState("");
  const [videoAccountFile, setVideoAccountFile] = useState<File | null>(null);
  const [videoAccountPreview, setVideoAccountPreview] = useState<ImportPreviewResult | null>(null);
  const [videoAccountConfirmed, setVideoAccountConfirmed] = useState(false);
  const [videoAccountMessage, setVideoAccountMessage] = useState("等待视频号手动更新表");
  const [bilibiliCsv, setBilibiliCsv] = useState("");
  const [bilibiliFile, setBilibiliFile] = useState<File | null>(null);
  const [bilibiliPreview, setBilibiliPreview] = useState<ImportPreviewResult | null>(null);
  const [bilibiliConfirmed, setBilibiliConfirmed] = useState(false);
  const [bilibiliMessage, setBilibiliMessage] = useState("等待 B站导出表");
  const [message, setMessage] = useState("等待预览");
  const [authCheckMessage, setAuthCheckMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDouyinLoading, setIsDouyinLoading] = useState(false);
  const [isDouyinBrowserLoading, setIsDouyinBrowserLoading] = useState(false);
  const [isXiaohongshuLoading, setIsXiaohongshuLoading] = useState(false);
  const [isXiaohongshuBrowserLoading, setIsXiaohongshuBrowserLoading] = useState(false);
  const [isVideoAccountLoading, setIsVideoAccountLoading] = useState(false);
  const [isBilibiliLoading, setIsBilibiliLoading] = useState(false);
  const [expandedImportPanel, setExpandedImportPanel] = useState<ImportUpdatePanelKey | null>(null);
  const startupAutoRefreshStarted = useRef(false);
  const returnRefreshPromptLastShownAt = useRef(0);

  const previewStats = useMemo(() => previewStatsFor(preview), [preview]);
  const douyinStats = useMemo(() => previewStatsFor(douyinPreview), [douyinPreview]);
  const xiaohongshuStats = useMemo(() => previewStatsFor(xiaohongshuPreview), [xiaohongshuPreview]);
  const videoAccountStats = useMemo(() => previewStatsFor(videoAccountPreview), [videoAccountPreview]);
  const bilibiliStats = useMemo(() => previewStatsFor(bilibiliPreview), [bilibiliPreview]);
  const canSaveDouyinLocalFile = douyinStats.confirmable > 0 && douyinConfirmed;
  const canSaveXiaohongshuLocalFile = xiaohongshuStats.confirmable > 0 && xiaohongshuConfirmed;
  const canSaveVideoAccountLocalFile = videoAccountStats.confirmable > 0 && videoAccountConfirmed;
  const canSaveBilibiliLocalFile = bilibiliStats.confirmable > 0 && bilibiliConfirmed;
  const douyinBrowserRows = douyinBrowserResult?.rows ?? [];
  const douyinBrowserSaveCandidateCount = douyinBrowserRows.filter(canSaveAuthedBrowserRow).length;
  const canSaveDouyinBrowserCapture = douyinBrowserSaveCandidateCount > 0 && douyinBrowserLoginConfirmed && douyinBrowserMetricsConfirmed;
  const xiaohongshuBrowserRows = xiaohongshuBrowserResult?.rows ?? [];
  const xiaohongshuBrowserSaveCandidateCount = xiaohongshuBrowserRows.filter(canSaveAuthedBrowserRow).length;
  const canSaveXiaohongshuBrowserCapture = xiaohongshuBrowserSaveCandidateCount > 0 && xiaohongshuBrowserLoginConfirmed && xiaohongshuBrowserMetricsConfirmed;
  const importCaptureStates = useMemo<Partial<Record<ImportUpdatePanelKey, ImportPlatformFlowState>>>(() => {
    const douyinState: ImportPlatformFlowState = douyinBrowserSaveCandidateCount > 0
      ? {
          label: "已抓到预览，等待确认保存",
          tone: "success",
          nextAction: `已识别 ${formatNumber(douyinBrowserSaveCandidateCount)} 条可保存作品；展开抖音更新，确认来源和指标后保存。`,
          detail: "保存仍需你勾选确认，不会自动写入看板。"
        }
      : douyinBrowserResult?.loginState === "needs_login" || douyinBrowserResult?.loginState === "not_opened"
        ? {
            label: "需要登录",
            tone: "warning",
            nextAction: "请先在打开的抖音创作者中心登录，然后回到这里点确认已登录或重新读取。",
            detail: "如果已经登录，请确认当前窗口仍在创作者后台。"
          }
        : douyinBrowserResult && douyinBrowserRows.length === 0
          ? {
              label: "需要切到作品/数据页面",
              tone: "warning",
              nextAction: "已看到抖音后台，但没有读到作品行；请切到作品管理页，或点开具体作品的数据详情后重试。",
              detail: douyinBrowserMessage
            }
          : {
              label: douyinBrowserLoginConfirmed || douyinBrowserResult?.browserOpened ? "可刷新" : "需要登录",
              tone: douyinBrowserLoginConfirmed || douyinBrowserResult?.browserOpened ? "success" : "warning",
              nextAction: douyinBrowserLoginConfirmed || douyinBrowserResult?.browserOpened
                ? "展开抖音更新，读取当前作品管理页；抓到后先预览再确认保存。"
                : "打开抖音创作者中心并完成登录，再读取作品管理页或详情页。",
              detail: "页面不会自动打开平台窗口。"
            };

    const xiaohongshuState: ImportPlatformFlowState = xiaohongshuBrowserSaveCandidateCount > 0
      ? {
          label: "已抓到预览，等待确认保存",
          tone: "success",
          nextAction: `已识别 ${formatNumber(xiaohongshuBrowserSaveCandidateCount)} 条可保存笔记；展开小红书更新，确认表格行后保存。`,
          detail: "保存仍需你勾选确认，不会自动写入看板。"
        }
      : xiaohongshuBrowserResult?.loginState === "needs_login" || xiaohongshuBrowserResult?.loginState === "not_opened"
        ? {
            label: "需要登录",
            tone: "warning",
            nextAction: "请先在小红书创作服务平台完成登录，然后回到这里点确认已登录或重新读取。",
            detail: "如果点到公开笔记页，请回到创作者后台。"
          }
        : xiaohongshuBrowserResult?.loginState === "wrong_page" || (xiaohongshuBrowserResult && xiaohongshuBrowserRows.length === 0)
          ? {
              label: "需要切到作品/数据页面",
              tone: "warning",
              nextAction: "请切到数据看板 / 内容分析 / 笔记数据表格；公开 explore 页面不会作为可信抓取源。",
              detail: xiaohongshuBrowserMessage
            }
          : {
              label: xiaohongshuBrowserLoginConfirmed || xiaohongshuBrowserResult?.browserOpened ? "可刷新" : "需要登录",
              tone: xiaohongshuBrowserLoginConfirmed || xiaohongshuBrowserResult?.browserOpened ? "success" : "warning",
              nextAction: xiaohongshuBrowserLoginConfirmed || xiaohongshuBrowserResult?.browserOpened
                ? "展开小红书更新，读取内容分析表格；每行一条笔记，先预览再确认保存。"
                : "打开小红书创作服务平台并完成登录，再读取内容分析表格。",
              detail: "页面不会自动打开平台窗口。"
            };

    const videoAccountState: ImportPlatformFlowState = videoAccountStats.confirmable > 0
      ? {
          label: "已抓到预览，等待确认保存",
          tone: "success",
          nextAction: `已识别 ${formatNumber(videoAccountStats.confirmable)} 条视频号可保存数据；展开后确认来源再保存。`,
          detail: "视频号仍以手动更新为主。"
        }
      : {
          label: "当前平台暂不支持自动抓取",
          tone: "info",
          nextAction: "视频号主路径是手动录入或粘贴内容级数据；登录抓取需扫码，暂不作为每日自动流程。",
          detail: "保存前仍会先预览字段。"
        };

    const bilibiliState: ImportPlatformFlowState = bilibiliStats.confirmable > 0
      ? {
          label: "已抓到预览，等待确认保存",
          tone: "success",
          nextAction: `已识别 ${formatNumber(bilibiliStats.confirmable)} 条 B站稿件可保存数据；展开后确认来源再保存。`,
          detail: "账号总览指标仍只预览。"
        }
      : {
          label: "可刷新",
          tone: "info",
          nextAction: "B站可导入稿件内容级表格；账号指标只做预览，不进入可信总量。",
          detail: "上传或粘贴后先预览字段。"
        };

    return {
      douyin: douyinState,
      xiaohongshu: xiaohongshuState,
      video_account: videoAccountState,
      bilibili: bilibiliState
    };
  }, [
    bilibiliStats.confirmable,
    douyinBrowserLoginConfirmed,
    douyinBrowserMessage,
    douyinBrowserResult,
    douyinBrowserRows.length,
    douyinBrowserSaveCandidateCount,
    videoAccountStats.confirmable,
    xiaohongshuBrowserLoginConfirmed,
    xiaohongshuBrowserMessage,
    xiaohongshuBrowserResult,
    xiaohongshuBrowserRows.length,
    xiaohongshuBrowserSaveCandidateCount
  ]);
  const browserProfileStartupSummary = useMemo(() => {
    const profiles = browserProfileStatus?.profiles ?? [];
    if (profiles.length === 0) return autoRefreshMessage;
    const reusable = profiles.filter((item) => item.state === "session_maybe_available").length;
    const needsLogin = profiles.filter((item) => item.state === "not_opened" || item.state === "waiting_login" || item.state === "session_expired").length;
    const failed = profiles.filter((item) => item.state === "capture_failed").length;
    if (reusable > 0) return `启动检查：${reusable} 个平台可能可直接刷新，${needsLogin} 个平台需要先登录${failed > 0 ? `，${failed} 个平台上次抓取失败` : ""}。`;
    return `启动检查：暂未发现可直接刷新的登录会话，${needsLogin} 个平台需要先打开后台登录。`;
  }, [autoRefreshMessage, browserProfileStatus]);
  const shouldPromptLoginCaptureRefreshOnReturn = useMemo(() => {
    const results = autoRefreshResult?.results ?? [];
    return results.some((item) => {
      if (item.platform !== "douyin" && item.platform !== "xiaohongshu") return false;
      if (!item.attemptedPreview && !item.openedWindow) return false;
      return item.status === "needs_login" || item.status === "needs_content_page" || item.status === "failed";
    });
  }, [autoRefreshResult]);
  const handleCaptureAuthCheck = () => setAuthCheckMessage("还没有连接好。请打开平台后台，登录后切到作品管理页，再点下一步。");

  function openImportPanel(panel: ImportUpdatePanelKey) {
    setExpandedImportPanel(panel);
    window.setTimeout(() => {
      document.getElementById(`${panel}-import-update-detail`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function syncImportPanel(panel: ImportUpdatePanelKey, open: boolean) {
    setExpandedImportPanel(open ? panel : (current) => current === panel ? null : current);
  }

  async function refreshAuthedBrowserProfiles() {
    const response = await fetch("/api/self-media/browser-capture");
    const body = await response.json() as AuthedBrowserProfileStatusView & { errorMessage?: string };
    if (!response.ok) throw new Error(body.errorMessage ?? "读取本机登录会话失败");
    setBrowserProfileStatus(body);
    setBrowserProfileMessage("本机登录会话状态已刷新；会话只保存在本机。");
  }

  async function runAuthedBrowserProfileAction(platform: AuthedBrowserPlatform, action: "open" | "confirm_login", target: "default" | "works_page" = "works_page") {
    setBrowserProfileLoadingKey(`${platform}:${action}`);
    setBrowserProfileMessage(action === "open" ? "正在打开平台作品/笔记管理页" : "正在确认本机登录状态");
    try {
      const response = await fetch("/api/self-media/browser-capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, platform, target: action === "open" ? target : undefined })
      });
      const body = await response.json() as { message?: string; errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? body.message ?? "浏览器会话操作失败");
      setBrowserProfileMessage(body.message ?? "浏览器会话状态已更新");
      await refreshAuthedBrowserProfiles();
      if (platform === "douyin" && action === "confirm_login") setDouyinBrowserLoginConfirmed(true);
      if (platform === "xiaohongshu" && action === "confirm_login") setXiaohongshuBrowserLoginConfirmed(true);
    } catch (error) {
      setBrowserProfileMessage(error instanceof Error ? error.message : "浏览器会话操作失败");
    } finally {
      setBrowserProfileLoadingKey("");
    }
  }

  async function runLoginCaptureAutoRefresh(trigger: AuthedBrowserAutoRefreshResult["trigger"] = "manual", autoOpen = false) {
    setIsAutoRefreshing(true);
    setAutoRefreshMessage(autoOpen ? "正在按你的点击打开平台后台并尝试预览。" : "正在按平台登录状态尝试预览，不会自动打开后台窗口。");
    try {
      const response = await fetch("/api/self-media/browser-capture/auto-refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platforms: "all", autoOpen, trigger })
      });
      const body = await response.json() as AuthedBrowserAutoRefreshResult & { errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "登录抓取刷新失败");
      setAutoRefreshResult(body);
      setAutoRefreshMessage(body.summary);
      for (const item of body.results) {
        if (item.platform === "douyin") {
          if (item.preview) {
            const preview = item.preview as DouyinAuthedBrowserCaptureResult;
            setDouyinBrowserResult(preview);
            setDouyinBrowserLoginConfirmed(preview.loginState !== "needs_login");
            setDouyinBrowserMetricsConfirmed(false);
          }
          setDouyinBrowserMessage(item.status === "preview_ready" ? item.message : item.nextAction);
        }
        if (item.platform === "xiaohongshu") {
          if (item.preview) {
            const preview = item.preview as XiaohongshuAuthedBrowserCaptureResult;
            setXiaohongshuBrowserResult(preview);
            setXiaohongshuBrowserLoginConfirmed(preview.loginState !== "needs_login" && preview.loginState !== "wrong_page");
            setXiaohongshuBrowserMetricsConfirmed(false);
          }
          setXiaohongshuBrowserMessage(item.status === "preview_ready" ? item.message : item.nextAction);
        }
      }
      await refreshAuthedBrowserProfiles();
    } catch (error) {
      setAutoRefreshMessage(error instanceof Error ? error.message : "登录抓取刷新失败");
    } finally {
      setIsAutoRefreshing(false);
    }
  }

  function resetDouyinPreview(nextMessage?: string) {
    setDouyinPreview(null);
    setDouyinConfirmed(false);
    if (nextMessage) setDouyinMessage(nextMessage);
  }

  function resetXiaohongshuPreview(nextMessage?: string) {
    setXiaohongshuPreview(null);
    setXiaohongshuConfirmed(false);
    if (nextMessage) setXiaohongshuMessage(nextMessage);
  }

  function resetVideoAccountPreview(nextMessage?: string) {
    setVideoAccountPreview(null);
    setVideoAccountConfirmed(false);
    if (nextMessage) setVideoAccountMessage(nextMessage);
  }

  function resetBilibiliPreview(nextMessage?: string) {
    setBilibiliPreview(null);
    setBilibiliConfirmed(false);
    if (nextMessage) setBilibiliMessage(nextMessage);
  }

  async function buildPlatformLocalFileRequest(platform: LocalFilePlatform, file: File | null, csvText: string) {
    if (!file) {
      return {
        mode: "platform_local_file",
        platformLocalFile: {
          platform,
          csv: csvText
        }
      };
    }
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx") || file.type.includes("spreadsheetml");
    if (isXlsx) {
      return {
        mode: "platform_local_file",
        platformLocalFile: {
          platform,
          fileName: file.name,
          contentType: file.type,
          fileBase64: await fileToBase64(file)
        }
      };
    }
    return {
      mode: "platform_local_file",
      platformLocalFile: {
        platform,
        csv: await file.text(),
        fileName: file.name,
        contentType: file.type
      }
    };
  }

  async function runDouyinLocalFile(action: "preview" | "save") {
    setIsDouyinLoading(true);
    setDouyinMessage(action === "preview" ? "抖音导出表预览中" : "正在保存抖音内容级指标");
    try {
      const request = await buildPlatformLocalFileRequest("douyin", douyinFile, douyinCsv);
      const response = await fetch(action === "preview" ? "/api/self-media/import/preview" : "/api/self-media/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request)
      });
      const body = await response.json() as (ImportPreviewResult & { errorMessage?: string }) | { run?: { importedCount?: number; status?: string }; errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "抖音本地导出处理失败");
      if (action === "preview") {
        const result = body as ImportPreviewResult;
        setDouyinPreview(result);
        setDouyinConfirmed(false);
        setDouyinMessage(`已识别 ${result.realPreviewRows?.length ?? 0} 行；确认后将按抖音内容级导入保存。`);
      } else {
        const dashboardResponse = await fetch("/api/self-media/dashboard");
        setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
        setDouyinMessage(`已保存抖音本地导出指标；${(body as { run?: { importedCount?: number } }).run?.importedCount ?? 0} 条记录进入可信内容级回收。`);
        setDouyinConfirmed(false);
      }
    } catch (error) {
      setDouyinMessage(error instanceof Error ? error.message : "抖音本地导出处理失败");
    } finally {
      setIsDouyinLoading(false);
    }
  }

  async function runDouyinAuthedBrowserCapture(action: DouyinAuthedBrowserCaptureResult["action"], target: "default" | "works_page" = "works_page") {
    setIsDouyinBrowserLoading(true);
    const labels: Record<DouyinAuthedBrowserCaptureResult["action"], string> = {
      open: "正在打开抖音后台",
      status: "正在检查登录状态",
      capture_preview: "正在抓取当前页作品",
      open_first_visible_detail: "正在点开抖音首条作品详情",
      capture_current_detail_preview: "正在抓取当前作品详情页",
      save: "正在保存抖音内容级指标",
      close: "正在关闭浏览器窗口"
    };
    setDouyinBrowserMessage(labels[action]);
    try {
      const response = await fetch("/api/self-media/platform-imports/browser-capture/douyin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          target: action === "open" ? target : undefined,
          userConfirmedLogin: douyinBrowserLoginConfirmed,
          userConfirmedContentMetrics: douyinBrowserMetricsConfirmed
        })
      });
      const body = await response.json() as DouyinAuthedBrowserCaptureResult;
      setDouyinBrowserResult(body);
      setDouyinBrowserMessage(humanDouyinBrowserMessage(body.message, action));
      refreshAuthedBrowserProfiles().catch(() => undefined);
      if (!response.ok) return;
      if (action === "capture_preview" || action === "capture_current_detail_preview") setDouyinBrowserMetricsConfirmed(false);
      if (action === "save") {
        const dashboardResponse = await fetch("/api/self-media/dashboard");
        setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
        setDouyinBrowserMetricsConfirmed(false);
      }
      if (action === "close") {
        setDouyinBrowserLoginConfirmed(false);
        setDouyinBrowserMetricsConfirmed(false);
      }
    } catch (error) {
      setDouyinBrowserMessage(humanDouyinBrowserMessage(error instanceof Error ? error.message : undefined, action));
    } finally {
      setIsDouyinBrowserLoading(false);
    }
  }

  async function runXiaohongshuAuthedBrowserCapture(action: XiaohongshuAuthedBrowserCaptureResult["action"], target: "default" | "works_page" = "works_page") {
    setIsXiaohongshuBrowserLoading(true);
    const labels: Record<XiaohongshuAuthedBrowserCaptureResult["action"], string> = {
      open: "正在打开小红书后台",
      status: "正在检查登录状态",
      capture_preview: "正在读取内容分析表格",
      open_first_visible_detail: "正在点开小红书首条笔记详情",
      capture_current_detail_preview: "正在抓取当前笔记详情页",
      diagnose_data_analysis_table: "正在检查内容分析表格结构",
      save: "正在保存小红书内容级指标",
      close: "正在关闭浏览器窗口"
    };
    setXiaohongshuBrowserMessage(labels[action]);
    try {
      const response = await fetch("/api/self-media/platform-imports/browser-capture/xiaohongshu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          target: action === "open" ? target : undefined,
          userConfirmedLogin: xiaohongshuBrowserLoginConfirmed,
          userConfirmedContentMetrics: xiaohongshuBrowserMetricsConfirmed
        })
      });
      const body = await response.json() as XiaohongshuAuthedBrowserCaptureResult;
      setXiaohongshuBrowserResult(body);
      setXiaohongshuBrowserMessage(humanXiaohongshuBrowserMessage(body.message, action));
      refreshAuthedBrowserProfiles().catch(() => undefined);
      if (!response.ok) return;
      if (action === "capture_preview" || action === "capture_current_detail_preview") setXiaohongshuBrowserMetricsConfirmed(false);
      if (action === "save") {
        const dashboardResponse = await fetch("/api/self-media/dashboard");
        setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
        setXiaohongshuBrowserMetricsConfirmed(false);
      }
      if (action === "close") {
        setXiaohongshuBrowserLoginConfirmed(false);
        setXiaohongshuBrowserMetricsConfirmed(false);
      }
    } catch (error) {
      setXiaohongshuBrowserMessage(humanXiaohongshuBrowserMessage(error instanceof Error ? error.message : undefined, action));
    } finally {
      setIsXiaohongshuBrowserLoading(false);
    }
  }

  useEffect(() => {
    if (startupAutoRefreshStarted.current) return;
    startupAutoRefreshStarted.current = true;
    refreshAuthedBrowserProfiles()
      .then(() => {
        setAutoRefreshMessage("启动检查完成：只刷新本机登录状态；需要抓取时请点击“手动打开后台并刷新”。");
      })
      .catch((error) => {
        setBrowserProfileMessage(error instanceof Error ? error.message : "读取本机登录会话失败");
      });
  }, []);

  useEffect(() => {
    if (!shouldPromptLoginCaptureRefreshOnReturn || isAutoRefreshing) return;
    const promptRefreshOnReturn = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - returnRefreshPromptLastShownAt.current < 15000) return;
      returnRefreshPromptLastShownAt.current = now;
      setAutoRefreshMessage("检测到你回到本页，可点击“手动打开后台并刷新”重新读取数据；系统不会自动打开平台窗口。");
      void refreshAuthedBrowserProfiles().catch((error) => {
        setBrowserProfileMessage(error instanceof Error ? error.message : "读取本机登录会话失败");
      });
    };
    window.addEventListener("focus", promptRefreshOnReturn);
    document.addEventListener("visibilitychange", promptRefreshOnReturn);
    return () => {
      window.removeEventListener("focus", promptRefreshOnReturn);
      document.removeEventListener("visibilitychange", promptRefreshOnReturn);
    };
  }, [isAutoRefreshing, shouldPromptLoginCaptureRefreshOnReturn]);

  async function runXiaohongshuLocalFile(action: "preview" | "save") {
    setIsXiaohongshuLoading(true);
    setXiaohongshuMessage(action === "preview" ? "小红书导出表预览中" : "正在保存小红书内容级指标");
    try {
      const request = await buildPlatformLocalFileRequest("xiaohongshu", xiaohongshuFile, xiaohongshuCsv);
      const response = await fetch(action === "preview" ? "/api/self-media/import/preview" : "/api/self-media/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request)
      });
      const body = await response.json() as (ImportPreviewResult & { errorMessage?: string }) | { run?: { importedCount?: number; status?: string }; errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "小红书本地导出处理失败");
      if (action === "preview") {
        const result = body as ImportPreviewResult;
        setXiaohongshuPreview(result);
        setXiaohongshuConfirmed(false);
        setXiaohongshuMessage(`已识别 ${result.realPreviewRows?.length ?? 0} 行；确认后将按小红书内容级导入保存。`);
      } else {
        const dashboardResponse = await fetch("/api/self-media/dashboard");
        setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
        setXiaohongshuMessage(`已保存小红书本地导出指标；${(body as { run?: { importedCount?: number } }).run?.importedCount ?? 0} 条记录进入可信内容级回收。`);
        setXiaohongshuConfirmed(false);
      }
    } catch (error) {
      setXiaohongshuMessage(error instanceof Error ? error.message : "小红书本地导出处理失败");
    } finally {
      setIsXiaohongshuLoading(false);
    }
  }

  async function runVideoAccountLocalFile(action: "preview" | "save") {
    setIsVideoAccountLoading(true);
    setVideoAccountMessage(action === "preview" ? "视频号手动更新表预览中" : "正在保存视频号内容级指标");
    try {
      const request = await buildPlatformLocalFileRequest("video_account", videoAccountFile, videoAccountCsv);
      const response = await fetch(action === "preview" ? "/api/self-media/import/preview" : "/api/self-media/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request)
      });
      const body = await response.json() as (ImportPreviewResult & { errorMessage?: string }) | { run?: { importedCount?: number; status?: string }; errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "视频号手动更新处理失败");
      if (action === "preview") {
        const result = body as ImportPreviewResult;
        setVideoAccountPreview(result);
        setVideoAccountConfirmed(false);
        setVideoAccountMessage(`已识别 ${result.realPreviewRows?.length ?? 0} 行；确认后将按视频号手动更新保存。`);
      } else {
        const dashboardResponse = await fetch("/api/self-media/dashboard");
        setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
        setVideoAccountMessage(`已保存视频号手动更新指标；${(body as { run?: { importedCount?: number } }).run?.importedCount ?? 0} 条记录进入数据看板，视频号新鲜度已按手动更新证据刷新。`);
        setVideoAccountConfirmed(false);
      }
    } catch (error) {
      setVideoAccountMessage(error instanceof Error ? error.message : "视频号手动更新处理失败");
    } finally {
      setIsVideoAccountLoading(false);
    }
  }

  async function runBilibiliLocalFile(action: "preview" | "save") {
    setIsBilibiliLoading(true);
    setBilibiliMessage(action === "preview" ? "B站导出表预览中" : "正在保存 B站内容级指标");
    try {
      const request = await buildPlatformLocalFileRequest("bilibili", bilibiliFile, bilibiliCsv);
      const response = await fetch(action === "preview" ? "/api/self-media/import/preview" : "/api/self-media/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request)
      });
      const body = await response.json() as (ImportPreviewResult & { errorMessage?: string }) | { run?: { importedCount?: number; status?: string }; errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "B站本地导出处理失败");
      if (action === "preview") {
        const result = body as ImportPreviewResult;
        setBilibiliPreview(result);
        setBilibiliConfirmed(false);
        setBilibiliMessage(`已识别 ${result.realPreviewRows?.length ?? 0} 行；确认后将按 B站内容级导入保存。`);
      } else {
        const dashboardResponse = await fetch("/api/self-media/dashboard");
        setCurrentSnapshot((await dashboardResponse.json()) as DashboardSnapshot);
        setBilibiliMessage(`已保存 B站内容级导入指标；${(body as { run?: { importedCount?: number } }).run?.importedCount ?? 0} 条记录进入数据看板，B站新鲜度已按内容级导入证据刷新。`);
        setBilibiliConfirmed(false);
      }
    } catch (error) {
      setBilibiliMessage(error instanceof Error ? error.message : "B站本地导出处理失败");
    } finally {
      setIsBilibiliLoading(false);
    }
  }

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
        title="数据更新"
        description="手动更新平台数据，预览后确认保存。"
        actions={<Button onClick={() => window.location.reload()} variant="secondary">刷新</Button>}
      />
      <div className="import-page-stack">
        <ImportPlatformOverview
          activePanel={expandedImportPanel}
          captureStates={importCaptureStates}
          isChecking={isAutoRefreshing}
          onCheckStatus={() => runLoginCaptureAutoRefresh("manual", false)}
          onOpenPanel={openImportPanel}
          snapshot={currentSnapshot}
        />
        <details
          className="analytics-data-section import-update-detail"
          data-testid="login-capture-detail-panel"
          id="login-capture-overview-detail"
          open={expandedImportPanel === "douyin" || expandedImportPanel === "xiaohongshu"}
        >
          <summary>
            <span>
              <strong>登录抓取状态与手动刷新</strong>
              <small>只在你展开后显示后台打开、登录确认和预览刷新入口</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="login-flow-primary"
          data-testid="login-flow-primary"
          id="login-flow-primary"
          title="登录抓取"
          eyebrow="推荐主入口"
          action={<Badge tone={currentSnapshot.trustedAutoCaptureScheduler.schedulerEnabledCount > 0 ? "success" : "warning"}>{currentSnapshot.trustedAutoCaptureScheduler.schedulerEnabledCount > 0 ? "有可信定时" : "待连接"}</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 打开平台后台并登录</strong>
              <p>先进入抖音、小红书、视频号或 B站官方后台，确认页面里能看到本人作品数据。</p>
            </article>
            <article>
              <strong>2. 切到作品管理页</strong>
              <p>如果页面还停在首页、账号总览或登录页，系统会提示你先切过去。</p>
            </article>
            <article>
              <strong>3. 预览后保存</strong>
              <p>读到的数据仍需先预览；不会保存账号密码或登录材料。</p>
            </article>
          </div>
          <div className="login-platform-status-grid" data-testid="login-flow-status">
            {currentSnapshot.trustedAutoCaptureScheduler.statuses.map((status) => (
              <article key={`login-flow-${status.platform}`}>
                <b>{platformLabels[status.platform]}</b> {captureModeLabels[status.captureMode]} / {captureConnectionStatusLabels[status.captureConnectionStatus]} / {status.needsManualAction ? "需人工操作" : "可继续"}
              </article>
            ))}
          </div>
          <LoginCaptureAutoRefreshPanel
            isRunning={isAutoRefreshing}
            onRefresh={() => runLoginCaptureAutoRefresh("manual", true)}
            result={autoRefreshResult}
            startupSummary={browserProfileStartupSummary}
          />
          <div className="trusted-weekly-summary-foot">
            <span>{authCheckMessage || "默认路线是登录抓取；本地导出只是兜底，不代表系统会读取网页登录态。"}</span>
            <div className="inline-stack">
              <Button data-testid="check-login-status-secondary" onClick={handleCaptureAuthCheck} variant="primary">检查登录抓取状态</Button>
              <a className="sm-button sm-button-secondary" href="#post-publish-refresh">发布后回收</a>
              <a className="sm-button sm-button-secondary" href="#local-export-fallback">展开本地导出兜底</a>
            </div>
          </div>
        </Panel>
        </details>
        <details
          className="analytics-data-section import-update-detail"
          data-testid="douyin-import-update-detail"
          id="douyin-import-update-detail"
          onToggle={(event) => syncImportPanel("douyin", event.currentTarget.open)}
          open={expandedImportPanel === "douyin"}
        >
          <summary>
            <span>
              <strong>抖音更新详情</strong>
              <small>登录抓取、详情页预览、人工确认保存</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="douyin-login-browser-flow"
          data-testid="douyin-login-browser-flow"
          id="douyin-authed-browser-capture-mvp"
          title="抖音登录后读取作品"
          eyebrow="抖音"
          action={<Badge tone={douyinBrowserRows.length > 0 ? "success" : douyinBrowserResult?.browserOpened ? "info" : "warning"}>{douyinBrowserRows.length > 0 ? `${douyinBrowserRows.length} 条可预览` : douyinBrowserResult?.browserOpened ? "会话已开" : "待登录"}</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 打开抖音后台</strong>
              <p>系统会打开本机登录抓取窗口；你自己完成登录、验证码或风控确认。</p>
            </article>
            <article>
              <strong>2. 预览列表或详情页</strong>
              <p>列表抓不到时，系统可先点开首条安全的作品数据/详情入口，再从当前作品详情页预览。</p>
            </article>
            <article>
              <strong>3. 预览后保存</strong>
              <p>只保存你手动确认的可保存候选；保存后进入数据看板，系统不会自动保存。</p>
            </article>
          </div>
          <div className="login-safety-box" data-testid="douyin-login-browser-safety">
            <strong>安全边界</strong>
            <p>本流程不接收、不保存账号密码或登录材料；关闭窗口不会把登录材料写进系统，下次打开会尽量沿用你本机的登录状态。读取结果只保存内容级可信指标。</p>
          </div>
          <div className="form-grid">
            <label className="import-confirm-check">
              <input
                checked={douyinBrowserLoginConfirmed}
                data-testid="douyin-login-browser-login-confirm"
                onChange={(event) => setDouyinBrowserLoginConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我已在弹出的抖音后台完成登录，并切到作品管理/数据表现列表，或已点开单个作品的数据/详情页。</span>
            </label>
            <label className="import-confirm-check">
              <input
                checked={douyinBrowserMetricsConfirmed}
                data-testid="douyin-login-browser-save-confirm"
                disabled={douyinBrowserSaveCandidateCount === 0 || isDouyinBrowserLoading}
                onChange={(event) => setDouyinBrowserMetricsConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我确认下方可保存候选是本人抖音后台当前页的作品级指标；ID 可靠，保存后进入数据看板，不会自动保存账号总览或敏感互动内容。</span>
            </label>
            <div className="import-preview-actions">
              <Button data-testid="douyin-login-browser-open" onClick={() => runDouyinAuthedBrowserCapture("open", "works_page")} variant="secondary" disabled={isDouyinBrowserLoading}>{isDouyinBrowserLoading ? "处理中" : "打开抖音作品管理页"}</Button>
              <Button data-testid="douyin-login-browser-status" onClick={() => runDouyinAuthedBrowserCapture("status")} variant="ghost" disabled={isDouyinBrowserLoading}>确认已登录</Button>
              <Button data-testid="douyin-login-browser-read" onClick={() => runDouyinAuthedBrowserCapture("capture_preview")} variant="secondary" disabled={isDouyinBrowserLoading || !douyinBrowserLoginConfirmed}>读取当前页作品</Button>
              <Button data-testid="douyin-login-browser-open-detail" onClick={() => runDouyinAuthedBrowserCapture("open_first_visible_detail")} variant="secondary" disabled={isDouyinBrowserLoading || !douyinBrowserLoginConfirmed}>AI 点开首条作品详情</Button>
              <Button data-testid="douyin-login-browser-detail-read" onClick={() => runDouyinAuthedBrowserCapture("capture_current_detail_preview")} variant="secondary" disabled={isDouyinBrowserLoading || !douyinBrowserLoginConfirmed}>从当前作品详情页预览</Button>
              <Button data-testid="douyin-login-browser-save" onClick={() => runDouyinAuthedBrowserCapture("save")} variant="primary" disabled={isDouyinBrowserLoading || !canSaveDouyinBrowserCapture}>保存到可信看板</Button>
              <Button data-testid="douyin-login-browser-close" onClick={() => runDouyinAuthedBrowserCapture("close")} variant="ghost" disabled={isDouyinBrowserLoading}>关闭浏览器窗口</Button>
              <a className="sm-button sm-button-secondary" data-testid="douyin-login-browser-dashboard-link" href="/dashboard">查看数据看板</a>
              <span>{douyinBrowserMessage}</span>
            </div>
          </div>
          <div className="real-preview-summary">
            <span><b>{douyinBrowserLoginStateLabel(douyinBrowserResult?.loginState)}</b> 登录状态</span>
            <span><b>{formatNumber(douyinBrowserRows.length)}</b> 可见作品</span>
            <span><b>{formatNumber(douyinBrowserSaveCandidateCount)}</b> 可保存候选</span>
            <span><b>{formatNumber(douyinBrowserResult?.metricCount ?? 0)}</b> 内容指标</span>
            <span><b>{douyinBrowserResult?.ok && douyinBrowserResult.action === "save" ? "已保存" : "未保存"}</b> 保存状态</span>
          </div>
          <DouyinAuthedBrowserRows rows={douyinBrowserRows} />
        </Panel>
        </details>
        <details
          className="analytics-data-section import-update-detail"
          data-testid="xiaohongshu-import-update-detail"
          id="xiaohongshu-import-update-detail"
          onToggle={(event) => syncImportPanel("xiaohongshu", event.currentTarget.open)}
          open={expandedImportPanel === "xiaohongshu"}
        >
          <summary>
            <span>
              <strong>小红书更新详情</strong>
              <small>内容分析表格、详情页兜底、人工确认保存</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="xiaohongshu-login-browser-flow xiaohongshu-authed-browser-capture-mvp"
          data-testid="xiaohongshu-login-browser-flow"
          id="xiaohongshu-authed-browser-capture-mvp"
          title="小红书登录后读取笔记"
          eyebrow="小红书"
          action={<Badge tone={xiaohongshuBrowserRows.length > 0 ? "success" : xiaohongshuBrowserResult?.browserOpened ? "info" : "warning"}>{xiaohongshuBrowserRows.length > 0 ? `${xiaohongshuBrowserRows.length} 条可预览` : xiaohongshuBrowserResult?.browserOpened ? "会话已开" : "待登录"}</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 打开小红书后台</strong>
              <p>系统会打开小红书专用的本机受控浏览器会话；你自己完成登录、验证码或风控确认。</p>
            </article>
            <article>
              <strong>2. 读取内容分析表格</strong>
              <p>系统进入数据看板 / 内容分析 / 笔记数据，从表格中按每行一条笔记读取标题、发布时间和指标。</p>
            </article>
            <article>
              <strong>3. 预览后保存</strong>
              <p>只保存你手动确认的可保存候选；保存后进入数据看板，系统不会自动保存。</p>
            </article>
          </div>
          <div className="login-safety-box" data-testid="xiaohongshu-login-browser-safety">
            <strong>安全边界</strong>
            <p>本流程不接收、不保存账号密码或登录材料；浏览器会话只留在小红书专用本机会话，不进业务数据、文档或仓库。抓取结果只保存内容级可信指标。</p>
          </div>
          <div className="form-grid">
            <label className="import-confirm-check">
              <input
                checked={xiaohongshuBrowserLoginConfirmed}
                data-testid="xiaohongshu-login-browser-login-confirm"
                onChange={(event) => setXiaohongshuBrowserLoginConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我已在弹出的小红书创作服务平台完成登录；系统将进入数据看板 / 内容分析 / 笔记数据表格读取。</span>
            </label>
            <label className="import-confirm-check">
              <input
                checked={xiaohongshuBrowserMetricsConfirmed}
                data-testid="xiaohongshu-login-browser-save-confirm"
                disabled={xiaohongshuBrowserSaveCandidateCount === 0 || isXiaohongshuBrowserLoading}
                onChange={(event) => setXiaohongshuBrowserMetricsConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我确认下方可保存候选来自小红书创作者后台内容分析表格；每行一条笔记，ID 可靠，保存后进入数据看板，不会自动保存公开推荐页、非本人内容或私密互动。</span>
            </label>
            <div className="import-preview-actions">
              <Button data-testid="xiaohongshu-login-browser-open" onClick={() => runXiaohongshuAuthedBrowserCapture("open", "works_page")} variant="secondary" disabled={isXiaohongshuBrowserLoading}>{isXiaohongshuBrowserLoading ? "处理中" : "打开小红书笔记管理页"}</Button>
              <Button data-testid="xiaohongshu-login-browser-status" onClick={() => runXiaohongshuAuthedBrowserCapture("status")} variant="ghost" disabled={isXiaohongshuBrowserLoading}>确认已登录</Button>
              <Button data-testid="xiaohongshu-login-browser-read" onClick={() => runXiaohongshuAuthedBrowserCapture("capture_preview")} variant="secondary" disabled={isXiaohongshuBrowserLoading || !xiaohongshuBrowserLoginConfirmed}>读取内容分析表格</Button>
              <Button data-testid="xiaohongshu-login-browser-open-detail" onClick={() => runXiaohongshuAuthedBrowserCapture("open_first_visible_detail")} variant="secondary" disabled={isXiaohongshuBrowserLoading || !xiaohongshuBrowserLoginConfirmed}>AI 点开首条笔记详情</Button>
              <Button data-testid="xiaohongshu-login-browser-detail-read" onClick={() => runXiaohongshuAuthedBrowserCapture("capture_current_detail_preview")} variant="secondary" disabled={isXiaohongshuBrowserLoading || !xiaohongshuBrowserLoginConfirmed}>从当前笔记详情页预览</Button>
              <Button data-testid="xiaohongshu-login-browser-save" onClick={() => runXiaohongshuAuthedBrowserCapture("save")} variant="primary" disabled={isXiaohongshuBrowserLoading || !canSaveXiaohongshuBrowserCapture}>保存到可信看板</Button>
              <Button data-testid="xiaohongshu-login-browser-close" onClick={() => runXiaohongshuAuthedBrowserCapture("close")} variant="ghost" disabled={isXiaohongshuBrowserLoading}>关闭浏览器窗口</Button>
              <a className="sm-button sm-button-secondary" data-testid="xiaohongshu-login-browser-dashboard-link" href="/dashboard">查看数据看板</a>
              <span>{xiaohongshuBrowserMessage}</span>
            </div>
          </div>
          <div className="real-preview-summary">
            <span><b>来自小红书创作者后台内容分析表格</b> 数据来源</span>
            <span><b>每行一条笔记</b> 表格粒度</span>
            <span><b>保存前人工确认</b> 保存规则</span>
            <span><b>{xiaohongshuBrowserLoginStateLabel(xiaohongshuBrowserResult?.loginState)}</b> 登录状态</span>
            <span><b>{formatNumber(xiaohongshuBrowserRows.length)}</b> 可见笔记</span>
            <span><b>{formatNumber(xiaohongshuBrowserSaveCandidateCount)}</b> 可保存候选</span>
            <span><b>{formatNumber(xiaohongshuBrowserResult?.metricCount ?? 0)}</b> 内容指标</span>
            <span><b>{xiaohongshuBrowserResult?.ok && xiaohongshuBrowserResult.action === "save" ? "已保存" : "未保存"}</b> 保存状态</span>
          </div>
          <XiaohongshuAuthedBrowserRows rows={xiaohongshuBrowserRows} />
        </Panel>
        </details>
        <details className="analytics-data-section" data-testid="post-publish-refresh-detail" id="post-publish-refresh-detail">
          <summary>
            <span>
              <strong>发布后数据回收</strong>
              <small>发布后需要匹配本地内容时再展开</small>
            </span>
            <i>展开</i>
          </summary>
          <PostPublishRefreshPanel onConfirmMatch={confirmPlatformContentMatch} snapshot={currentSnapshot} />
        </details>
        <details
          className="analytics-data-section local-export-fallback"
          data-testid="local-export-fallback"
          id="local-export-fallback"
          onToggle={(event) => {
            if (event.currentTarget !== event.target) return;
            if (!event.currentTarget.open && (expandedImportPanel === "video_account" || expandedImportPanel === "bilibili")) setExpandedImportPanel(null);
          }}
          open={expandedImportPanel === "video_account" || expandedImportPanel === "bilibili"}
        >
          <summary>
            <span>
              <strong>本地导出兜底</strong>
              <small>CSV / XLSX 仍可用，但不是推荐路线</small>
            </span>
            <i>展开</i>
          </summary>
          <div className="import-preview-stack">
        <details className="import-platform-subdetail" data-testid="douyin-local-file-detail">
          <summary>
            <span>
              <strong>抖音本地导出兜底</strong>
              <small>只有需要 CSV / XLSX 时再展开</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="douyin-local-file-mvp"
          data-testid="douyin-local-file-mvp"
          title="抖音本地导出回收 MVP"
          eyebrow="真实闭环"
          action={<Badge tone={douyinStats.blocked > 0 ? "warning" : douyinStats.total > 0 ? "success" : "info"}>{douyinStats.confirmable} 行可保存</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 从抖音后台导出或复制</strong>
              <p>当前最现实路径是用户主动拿到内容级表格；官方能力需要授权和权限开通。</p>
            </article>
            <article>
              <strong>2. 本地预览字段</strong>
              <p>确认作品 ID、标题、发布时间、播放、点赞、评论、收藏、分享等字段后再保存。</p>
            </article>
            <article>
              <strong>3. 保存到可信指标</strong>
              <p>保存来源固定为 douyin_creator_center；网页登录刷新不会自动抓取系统数据。</p>
            </article>
          </div>
          <div className="form-grid">
            <Field label="上传抖音 CSV / XLSX">
              <input
                className="sm-input"
                data-testid="douyin-local-file-upload"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setDouyinFile(nextFile);
                  resetDouyinPreview(nextFile ? `已选择 ${nextFile.name}，请先预览字段。` : "等待抖音导出表");
                }}
              />
            </Field>
            <Field label="或粘贴抖音导出 CSV">
              <TextArea
                data-testid="douyin-local-file-csv"
                value={douyinCsv}
                onChange={(event) => {
                  setDouyinCsv(event.target.value);
                  resetDouyinPreview("CSV 已更新，请重新预览字段。");
                }}
              />
            </Field>
            <label className="import-confirm-check">
              <input
                checked={douyinConfirmed}
                data-testid="douyin-local-file-confirm"
                disabled={douyinStats.confirmable === 0 || isDouyinLoading}
                onChange={(event) => setDouyinConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我确认这是本人从抖音创作者后台导出的内容级表格；保存后进入数据看板，且不保存登录凭证、请求头或原始请求。</span>
            </label>
            <div className="import-preview-actions">
              <Button data-testid="douyin-local-file-preview" onClick={() => runDouyinLocalFile("preview")} variant="secondary" disabled={isDouyinLoading}>{isDouyinLoading ? "处理中" : "预览抖音导出"}</Button>
              <Button data-testid="douyin-local-file-save" onClick={() => runDouyinLocalFile("save")} variant="primary" disabled={isDouyinLoading || !canSaveDouyinLocalFile}>{isDouyinLoading ? "保存中" : "确认保存到看板"}</Button>
              <a className="sm-button sm-button-secondary" data-testid="douyin-local-file-dashboard-link" href="/dashboard">查看数据看板</a>
              <span>{douyinMessage}</span>
            </div>
          </div>
          <div className="real-preview-summary">
            <span><b>{douyinStats.total}</b> 行</span>
            <span><b>{douyinStats.confirmable}</b> 可保存</span>
            <span><b>{douyinStats.nativeMetrics}</b> 抖音原生字段</span>
          </div>
          <RealPreviewRows rows={douyinStats.rows} />
        </Panel>
        </details>
        <details className="import-platform-subdetail" data-testid="xiaohongshu-local-file-detail">
          <summary>
            <span>
              <strong>小红书本地导出兜底</strong>
              <small>内容分析表格不可用时再展开</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="xiaohongshu-local-file-mvp"
          data-testid="xiaohongshu-local-file-mvp"
          title="小红书本地导出回收 MVP"
          eyebrow="真实闭环"
          action={<Badge tone={xiaohongshuStats.blocked > 0 ? "warning" : xiaohongshuStats.total > 0 ? "success" : "info"}>{xiaohongshuStats.confirmable} 行可保存</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 从小红书后台导出或复制</strong>
              <p>当前未确认公开稳定个人创作者数据 API；只接收你主动拿到的内容级表格。</p>
            </article>
            <article>
              <strong>2. 本地预览字段</strong>
              <p>确认笔记 ID、标题、发布时间、浏览、点赞、评论、收藏、分享等字段后再保存。</p>
            </article>
            <article>
              <strong>3. 保存到可信指标</strong>
              <p>保存来源固定为 xiaohongshu_creator_center；网页登录刷新不会自动抓取系统数据。</p>
            </article>
          </div>
          <div className="form-grid">
            <Field label="上传小红书 CSV / XLSX">
              <input
                className="sm-input"
                data-testid="xiaohongshu-local-file-upload"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setXiaohongshuFile(nextFile);
                  resetXiaohongshuPreview(nextFile ? `已选择 ${nextFile.name}，请先预览字段。` : "等待小红书导出表");
                }}
              />
            </Field>
            <Field label="或粘贴小红书导出 CSV">
              <TextArea
                data-testid="xiaohongshu-local-file-csv"
                value={xiaohongshuCsv}
                onChange={(event) => {
                  setXiaohongshuCsv(event.target.value);
                  resetXiaohongshuPreview("CSV 已更新，请重新预览字段。");
                }}
              />
            </Field>
            <label className="import-confirm-check">
              <input
                checked={xiaohongshuConfirmed}
                data-testid="xiaohongshu-local-file-confirm"
                disabled={xiaohongshuStats.confirmable === 0 || isXiaohongshuLoading}
                onChange={(event) => setXiaohongshuConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我确认这是本人从小红书创作服务平台导出的内容级表格；保存后进入数据看板，且不保存登录凭证、请求头或原始请求。</span>
            </label>
            <div className="import-preview-actions">
              <Button data-testid="xiaohongshu-local-file-preview" onClick={() => runXiaohongshuLocalFile("preview")} variant="secondary" disabled={isXiaohongshuLoading}>{isXiaohongshuLoading ? "处理中" : "预览小红书导出"}</Button>
              <Button data-testid="xiaohongshu-local-file-save" onClick={() => runXiaohongshuLocalFile("save")} variant="primary" disabled={isXiaohongshuLoading || !canSaveXiaohongshuLocalFile}>{isXiaohongshuLoading ? "保存中" : "确认保存到看板"}</Button>
              <a className="sm-button sm-button-secondary" data-testid="xiaohongshu-local-file-dashboard-link" href="/dashboard">查看数据看板</a>
              <span>{xiaohongshuMessage}</span>
            </div>
          </div>
          <div className="real-preview-summary">
            <span><b>{xiaohongshuStats.total}</b> 行</span>
            <span><b>{xiaohongshuStats.confirmable}</b> 可保存</span>
            <span><b>{xiaohongshuStats.nativeMetrics}</b> 小红书原生字段</span>
          </div>
          <RealPreviewRows rows={xiaohongshuStats.rows} />
        </Panel>
        </details>
        <details
          className="import-platform-subdetail"
          data-testid="video_account-import-update-detail"
          id="video_account-import-update-detail"
          onToggle={(event) => {
            if (event.currentTarget !== event.target) return;
            syncImportPanel("video_account", event.currentTarget.open);
          }}
          open={expandedImportPanel === "video_account"}
        >
          <summary>
            <span>
              <strong>视频号手动更新</strong>
              <small>粘贴或上传本人内容级数据</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="video-account-local-file-mvp"
          data-testid="video-account-local-file-mvp"
          title="视频号手动更新"
          eyebrow="手动更新为主"
          action={<Badge tone={videoAccountStats.blocked > 0 ? "warning" : videoAccountStats.total > 0 ? "success" : "info"}>{videoAccountStats.confirmable} 行可保存</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 手动更新为主</strong>
              <p>从视频号助手复制或导出今天确认过的本人内容级数据；默认页面加载、切回页面和自动刷新都不会打开视频号窗口。</p>
            </article>
            <article>
              <strong>2. 先预览再确认</strong>
              <p>至少确认作品标题、发布时间、播放/曝光、点赞、评论、收藏、分享等字段，缺稳定视频 ID 的行不会进入可信保存。</p>
            </article>
            <article>
              <strong>3. 后续探索：尝试登录抓取</strong>
              <p>登录抓取需扫码，暂不作为每日自动流程；官方能力待确认，个人创作者不默认假设可用。</p>
            </article>
            <article>
              <strong>4. 保存后刷新状态</strong>
              <p>确认保存后会作为视频号手动更新证据刷新数据状态；不会保存登录凭证、网页请求内容或截图。</p>
            </article>
          </div>
          <div className="form-grid">
            <Field label="上传视频号 CSV / XLSX">
              <input
                className="sm-input"
                data-testid="video-account-local-file-upload"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setVideoAccountFile(nextFile);
                  resetVideoAccountPreview(nextFile ? `已选择 ${nextFile.name}，请先预览字段。` : "等待视频号手动更新表");
                }}
              />
            </Field>
            <Field label="或粘贴视频号数据 CSV">
              <TextArea
                data-testid="video-account-local-file-csv"
                placeholder={videoAccountLocalExportPlaceholder}
                value={videoAccountCsv}
                onChange={(event) => {
                  setVideoAccountCsv(event.target.value);
                  resetVideoAccountPreview("CSV 已更新，请重新预览字段。");
                }}
              />
            </Field>
            <label className="import-confirm-check">
              <input
                checked={videoAccountConfirmed}
                data-testid="video-account-local-file-confirm"
                disabled={videoAccountStats.confirmable === 0 || isVideoAccountLoading}
                onChange={(event) => setVideoAccountConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我确认这是本人从视频号助手手动更新的内容级表格；保存后进入数据看板，且不保存登录凭证、网页请求内容或截图。</span>
            </label>
            <div className="capture-reality-box" data-testid="video-account-manual-field-guide">
              <strong>建议粘贴字段</strong>
              <p>作品标题、发布时间、播放/曝光、点赞、评论、收藏、分享；有视频 ID 或作品链接时优先带上。没有今天确认过的数据时先不要保存，保存后会刷新视频号数据状态。</p>
            </div>
            <div className="import-preview-actions">
              <Button data-testid="video-account-local-file-preview" onClick={() => runVideoAccountLocalFile("preview")} variant="secondary" disabled={isVideoAccountLoading}>{isVideoAccountLoading ? "处理中" : "预览视频号手动更新"}</Button>
              <Button data-testid="video-account-local-file-save" onClick={() => runVideoAccountLocalFile("save")} variant="primary" disabled={isVideoAccountLoading || !canSaveVideoAccountLocalFile}>{isVideoAccountLoading ? "保存中" : "确认保存到看板"}</Button>
              <a className="sm-button sm-button-secondary" data-testid="video-account-local-file-dashboard-link" href="/dashboard">查看数据看板</a>
              <span>{videoAccountMessage}</span>
            </div>
          </div>
          <div className="real-preview-summary">
            <span><b>{videoAccountStats.total}</b> 行</span>
            <span><b>{videoAccountStats.confirmable}</b> 可保存</span>
            <span><b>{videoAccountStats.nativeMetrics}</b> 视频号原生字段</span>
          </div>
          <RealPreviewRows rows={videoAccountStats.rows} />
        </Panel>
        </details>
        <details
          className="import-platform-subdetail"
          data-testid="bilibili-import-update-detail"
          id="bilibili-import-update-detail"
          onToggle={(event) => {
            if (event.currentTarget !== event.target) return;
            syncImportPanel("bilibili", event.currentTarget.open);
          }}
          open={expandedImportPanel === "bilibili"}
        >
          <summary>
            <span>
              <strong>B站数据导入</strong>
              <small>内容级导入可用，账号指标 preview-only</small>
            </span>
            <i>展开</i>
          </summary>
        <Panel
          className="bilibili-local-file-mvp"
          data-testid="bilibili-local-file-mvp"
          title="B站内容级导入"
          eyebrow="预览后确认"
          action={<Badge tone={bilibiliStats.blocked > 0 ? "warning" : bilibiliStats.total > 0 ? "success" : "info"}>{bilibiliStats.confirmable} 行可保存</Badge>}
        >
          <div className="import-guide-steps">
            <article>
              <strong>1. 从 B站后台导出或复制</strong>
              <p>只接收你今天从 B站后台主动确认过的稿件内容级表格；系统不会读取 B站网页登录状态。</p>
            </article>
            <article>
              <strong>2. 本地预览字段</strong>
              <p>确认稿件 ID/BV 号、标题、发布时间、播放、点赞、评论、收藏、分享等字段后再保存。</p>
            </article>
            <article>
              <strong>3. 保存到可信指标</strong>
              <p>保存来源固定为 B站内容级导入，并刷新 B站数据状态；账号总览仍然 preview-only，不进入 durable totals。</p>
            </article>
          </div>
          <div className="form-grid">
            <Field label="上传 B站 CSV / XLSX">
              <input
                className="sm-input"
                data-testid="bilibili-local-file-upload"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setBilibiliFile(nextFile);
                  resetBilibiliPreview(nextFile ? `已选择 ${nextFile.name}，请先预览字段。` : "等待 B站导出表");
                }}
              />
            </Field>
            <Field label="或粘贴 B站导出 CSV">
              <TextArea
                data-testid="bilibili-local-file-csv"
                placeholder={bilibiliLocalExportPlaceholder}
                value={bilibiliCsv}
                onChange={(event) => {
                  setBilibiliCsv(event.target.value);
                  resetBilibiliPreview("CSV 已更新，请重新预览字段。");
                }}
              />
            </Field>
            <label className="import-confirm-check">
              <input
                checked={bilibiliConfirmed}
                data-testid="bilibili-local-file-confirm"
                disabled={bilibiliStats.confirmable === 0 || isBilibiliLoading}
                onChange={(event) => setBilibiliConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>我确认这是本人从 B站创作中心导出的内容级表格；保存后进入数据看板，且不保存登录凭证或网页请求内容。</span>
            </label>
            <div className="capture-reality-box" data-testid="bilibili-content-import-field-guide">
              <strong>建议导入字段</strong>
              <p>稿件 ID/BV 号、标题、发布时间、播放、点赞、评论、弹幕、收藏、分享、投币；没有当前确认过的稿件数据时先不要保存，账号总览数据只预览，不写入内容级可信总量。</p>
            </div>
            <div className="import-preview-actions">
              <Button data-testid="bilibili-local-file-preview" onClick={() => runBilibiliLocalFile("preview")} variant="secondary" disabled={isBilibiliLoading}>{isBilibiliLoading ? "处理中" : "预览 B站导出"}</Button>
              <Button data-testid="bilibili-local-file-save" onClick={() => runBilibiliLocalFile("save")} variant="primary" disabled={isBilibiliLoading || !canSaveBilibiliLocalFile}>{isBilibiliLoading ? "保存中" : "确认保存到看板"}</Button>
              <a className="sm-button sm-button-secondary" data-testid="bilibili-local-file-dashboard-link" href="/dashboard">查看数据看板</a>
              <span>{bilibiliMessage}</span>
            </div>
          </div>
          <div className="real-preview-summary">
            <span><b>{bilibiliStats.total}</b> 行</span>
            <span><b>{bilibiliStats.confirmable}</b> 可保存</span>
            <span><b>{bilibiliStats.nativeMetrics}</b> B站原生字段</span>
          </div>
          <RealPreviewRows rows={bilibiliStats.rows} />
        </Panel>
        </details>
          </div>
        </details>
        <details className="analytics-data-section" data-testid="platform-sync-freshness-detail">
          <summary>
            <span>
              <strong>四平台同步与数据新鲜度</strong>
              <small>需要抓取/保存最新数据时再展开</small>
            </span>
            <i>展开</i>
          </summary>
          <div className="import-preview-stack">
            <PlatformDataHealthPanel health={currentSnapshot.platformDataHealth} />
            <PlatformImportStatusPanel capabilities={currentSnapshot.platformImportOperationCapabilities} history={currentSnapshot.operationHistory} statuses={currentSnapshot.platformImportStatuses} onDashboardRefresh={setCurrentSnapshot} />
            <ScheduledRefreshSettingPanel snapshot={currentSnapshot} />
          </div>
        </details>
        <details className="analytics-data-section import-advanced-diagnostics" data-testid="import-advanced-diagnostics">
          <summary>
            <span>
              <strong>更多设置与手动导入</strong>
              <small>本地检查和字段细节默认收起</small>
            </span>
            <i>展开</i>
          </summary>
          <div className="import-layout">
            <div className="import-preview-stack">
              <AuthedBrowserProfileManager
                loadingKey={browserProfileLoadingKey}
                message={browserProfileMessage}
                statusView={browserProfileStatus}
                onConfirmLogin={(platform) => runAuthedBrowserProfileAction(platform, "confirm_login")}
                onOpen={(platform, target) => runAuthedBrowserProfileAction(platform, "open", target)}
              />
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
                <RealPreviewRows rows={previewStats.rows} />
              </Panel>
              <ImportDiffTable imports={currentSnapshot.imports} />
            </div>
          </div>
        </details>
      </div>
    </AppShell>
  );
}
