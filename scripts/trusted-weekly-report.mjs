#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo/sqlite-self-media-repo.ts";
import { SelfMediaService } from "../src/domain/self-media/service/self-media-service.ts";

const DEFAULT_OUT_DIR = ".local/trusted-weekly-report";
const CLOSED_LOOP_PLATFORMS = ["douyin", "xiaohongshu", "video_account", "bilibili"];
const PLATFORM_LABELS = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  video_account: "视频号",
  bilibili: "B站"
};
const SENSITIVE_PATTERN = /cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|session|secret|credential|private|raw\s*payload|comment_content|danmu_text|danmu|评论正文|弹幕/i;

function argValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function pct(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function rate(engagement, views) {
  if (!views) return 0;
  return Number(((engagement / views) * 100).toFixed(2));
}

function sanitizeText(value) {
  return String(value ?? "")
    .replace(SENSITIVE_PATTERN, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
}

function contentTitle(contentsById, contentId) {
  return sanitizeText(contentsById.get(contentId)?.title ?? contentId);
}

function snapshotEngagement(snapshot) {
  return asNumber(snapshot.likes) + asNumber(snapshot.comments) + asNumber(snapshot.saves) + asNumber(snapshot.shares);
}

function sortedPlatformGroups(snapshot) {
  const groups = new Map(snapshot.metricPlatformGroups.map((group) => [group.platform, group]));
  return CLOSED_LOOP_PLATFORMS.map((platform) => {
    const group = groups.get(platform) ?? {
      platform,
      contentCount: 0,
      snapshotCount: 0,
      metricSnapshotCount: 0,
      views: 0,
      engagement: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0
    };
    const snapshotCount = asNumber(group.snapshotCount ?? group.metricSnapshotCount);
    return {
      platform,
      label: PLATFORM_LABELS[platform],
      contentCount: asNumber(group.contentCount),
      metricSnapshotCount: snapshotCount,
      views: asNumber(group.views),
      engagement: asNumber(group.engagement),
      engagementRate: rate(asNumber(group.engagement), asNumber(group.views)),
      viewShare: pct(asNumber(group.views), snapshot.weeklyReview.metrics.totalViews),
      includedInReview: group.includedInReview !== false
    };
  });
}

function aggregateContentRows(snapshot) {
  const contentsById = new Map(snapshot.contents.map((content) => [content.id, content]));
  const rows = new Map();
  for (const item of snapshot.metricSnapshots) {
    if (!CLOSED_LOOP_PLATFORMS.includes(item.platform)) continue;
    const current = rows.get(item.contentId) ?? {
      contentId: item.contentId,
      title: contentTitle(contentsById, item.contentId),
      platform: item.platform,
      platformLabel: PLATFORM_LABELS[item.platform] ?? item.platform,
      source: item.source,
      snapshotCount: 0,
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      followersDelta: 0,
      latestSnapshotDate: null
    };
    current.snapshotCount += 1;
    current.views += asNumber(item.views);
    current.likes += asNumber(item.likes);
    current.comments += asNumber(item.comments);
    current.saves += asNumber(item.saves);
    current.shares += asNumber(item.shares);
    current.followersDelta += asNumber(item.followersDelta);
    current.latestSnapshotDate = !current.latestSnapshotDate || String(item.snapshotDate ?? "") > current.latestSnapshotDate ? item.snapshotDate ?? current.latestSnapshotDate : current.latestSnapshotDate;
    rows.set(item.contentId, current);
  }
  return [...rows.values()].map((item) => ({
    ...item,
    engagement: item.likes + item.comments + item.saves + item.shares,
    engagementRate: rate(item.likes + item.comments + item.saves + item.shares, item.views)
  }));
}

function recommendationRows(snapshot) {
  return snapshot.postImportActionSuggestions.slice(0, 6).map((item) => ({
    id: item.id,
    priority: item.priority,
    type: item.type,
    title: sanitizeText(item.title),
    summary: sanitizeText(item.summary),
    nextAction: sanitizeText(item.nextAction),
    evidenceCount: Array.isArray(item.evidence) ? item.evidence.length : 0
  }));
}

function freshnessSummary(snapshot) {
  const gateFreshness = snapshot.dailyPlatformOpsGate.freshness ?? {};
  const healthFreshness = snapshot.platformDataHealth.summary.freshness ?? {};
  return {
    status: snapshot.platformDataHealth.status,
    reportExists: snapshot.platformDataHealth.exists,
    latestRealCaptureAt: gateFreshness.latestRealCaptureAt ?? healthFreshness.latestRealCaptureAt ?? null,
    latestSmokeAt: gateFreshness.latestSmokeAt ?? healthFreshness.latestSmokeAt ?? null,
    latestAuditAt: gateFreshness.latestAuditAt ?? snapshot.dailyPlatformOpsGate.trustedAudit.latestAuditAt ?? snapshot.trustedOperatingStatus.audit.generatedAt ?? null,
    realCaptureAgeHours: gateFreshness.realCaptureAgeHours ?? healthFreshness.realCaptureAgeHours ?? null,
    smokeAgeHours: gateFreshness.smokeAgeHours ?? healthFreshness.smokeAgeHours ?? null,
    realCaptureIsStale: gateFreshness.realCaptureIsStale ?? healthFreshness.realCaptureIsStale ?? null,
    smokeIsStale: gateFreshness.smokeIsStale ?? healthFreshness.smokeIsStale ?? null,
    staleAfterHours: gateFreshness.staleAfterHours ?? healthFreshness.staleAfterHours ?? snapshot.platformDataHealth.staleAfterHours ?? null,
    realCaptureStaleCount: snapshot.platformDataHealth.summary.realCaptureStaleCount,
    sourceMismatchCount: snapshot.platformDataHealth.summary.sourceMismatchCount,
    platformFreshness: snapshot.platformDataHealth.platforms.map((platform) => ({
      platform: platform.platform,
      label: platform.label,
      status: platform.status,
      latestRealCaptureAt: platform.freshness.latestRealCaptureAt ?? null,
      latestSmokeAt: platform.freshness.latestSmokeAt ?? null,
      realCaptureIsStale: platform.freshness.realCaptureIsStale ?? null,
      smokeIsStale: platform.freshness.smokeIsStale ?? null
    }))
  };
}

function buildExcludedSummary(snapshot) {
  return {
    excludedContentCount: snapshot.realDataScope.excludedContentCount,
    excludedMetricCount: snapshot.realDataScope.excludedMetricCount,
    excludedMetricSnapshotCount: snapshot.realDataScope.excludedMetricSnapshotCount,
    excludedImportRunCount: snapshot.realDataScope.excludedImportRunCount,
    userExcludedContentCount: snapshot.realDataScope.userExcludedContentCount,
    userExcludedMetricSnapshotCount: snapshot.realDataScope.userExcludedMetricSnapshotCount,
    trustedCandidateContentCount: snapshot.trustedScopeCuration.trustedCandidateContentCount,
    activeContentCount: snapshot.trustedScopeCuration.activeContentCount,
    sources: snapshot.realDataScope.excludedSources.map((item) => ({
      source: item.source,
      contentCount: item.contentCount,
      metricCount: item.metricCount,
      metricSnapshotCount: item.metricSnapshotCount,
      importRunCount: item.importRunCount
    }))
  };
}

export function buildTrustedWeeklyReport(snapshot, options = {}) {
  const generatedAt = new Date(options.now ?? Date.now()).toISOString();
  const contentRows = aggregateContentRows(snapshot);
  const topContents = [...contentRows].sort((a, b) => b.views - a.views || b.engagement - a.engagement).slice(0, 8);
  const lowInteractionContents = [...contentRows]
    .filter((item) => item.views >= 50)
    .sort((a, b) => a.engagementRate - b.engagementRate || b.views - a.views)
    .slice(0, 8);
  const platformComparison = sortedPlatformGroups(snapshot);
  const report = {
    generatedAt,
    task: "TRUSTED-WEEKLY-REPORT-034",
    scope: {
      defaultScope: snapshot.realDataScope.defaultScope,
      trustedSources: snapshot.realDataScope.trustedSources,
      onlyTrustedDashboardReviewData: true,
      excludesAllDataLocalDebugRows: true,
      excludesAccountMetricSnapshots: true,
      bilibiliBoundary: "archives_content_level_only",
      platformPayloadExcluded: true
    },
    audit: {
      status: snapshot.trustedOperatingStatus.audit.status,
      generatedAt: snapshot.trustedOperatingStatus.audit.generatedAt ?? null,
      mismatchCount: snapshot.trustedOperatingStatus.audit.mismatchCount,
      mismatches: snapshot.trustedOperatingStatus.audit.mismatches
    },
    totals: {
      contentCount: snapshot.weeklyReview.metrics.contentCount,
      trustedContentCount: snapshot.realDataScope.trustedContentCount,
      metricSnapshotCount: snapshot.realDataScope.trustedMetricSnapshotCount,
      views: snapshot.weeklyReview.metrics.totalViews,
      likes: snapshot.weeklyReview.metrics.totalLikes,
      engagement: snapshot.weeklyReview.metrics.totalEngagement,
      bestPlatform: snapshot.weeklyReview.metrics.bestPlatform
    },
    platformOverview: platformComparison,
    topContents,
    lowInteractionContents,
    platformComparison,
    freshness: freshnessSummary(snapshot),
    excluded: buildExcludedSummary(snapshot),
    recommendations: recommendationRows(snapshot),
    consistencyChecks: {
      weeklyViewsEqualTrustedStatus: snapshot.weeklyReview.metrics.totalViews === snapshot.trustedOperatingStatus.views,
      weeklyEngagementEqualTrustedStatus: snapshot.weeklyReview.metrics.totalEngagement === snapshot.trustedOperatingStatus.engagement,
      weeklyContentCountEqualTrustedScope: snapshot.weeklyReview.metrics.contentCount === snapshot.realDataScope.trustedContentCount,
      metricSnapshotCountEqualTrustedScope: snapshot.metricSnapshots.length === snapshot.realDataScope.trustedMetricSnapshotCount,
      platformViewsEqualWeeklyViews: platformComparison.reduce((sum, item) => sum + item.views, 0) === snapshot.weeklyReview.metrics.totalViews,
      accountMetricSnapshotsExcluded: true
    }
  };
  assertReportSafe(report);
  return report;
}

function valueText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function numberText(value) {
  return new Intl.NumberFormat("en-US").format(asNumber(value));
}

function renderTable(headers, rows) {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`
  ];
  for (const row of rows) lines.push(`| ${row.map((item) => String(item).replaceAll("|", "/")).join(" | ")} |`);
  return lines.join("\n");
}

export function renderTrustedWeeklyMarkdown(report) {
  const lines = [
    "# Trusted Weekly Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Scope: ${report.scope.defaultScope}`,
    `Audit: ${report.audit.status} (${report.audit.generatedAt ?? "not audited"})`,
    "",
    "## 口径说明",
    "",
    "- 只使用 trusted real creator-center 默认口径。",
    "- 只统计抖音、小红书、视频号、B站内容级指标快照。",
    "- 不使用 all-data/local-debug 污染行，不使用 B站账号级指标。",
    "- smoke、demo、manual、csv、mediacrawler、n8n、暂停公众号和用户排除内容只保留在库里，不进入本报告总数。",
    "",
    "## 四平台概览",
    "",
    `- 真实内容：${numberText(report.totals.trustedContentCount)}`,
    `- 内容级快照：${numberText(report.totals.metricSnapshotCount)}`,
    `- 总曝光：${numberText(report.totals.views)}`,
    `- 总互动：${numberText(report.totals.engagement)}`,
    `- 当前优势平台：${PLATFORM_LABELS[report.totals.bestPlatform] ?? report.totals.bestPlatform}`,
    "",
    renderTable(
      ["平台", "内容", "快照", "曝光", "曝光占比", "互动", "互动率"],
      report.platformOverview.map((item) => [item.label, numberText(item.contentCount), numberText(item.metricSnapshotCount), numberText(item.views), `${item.viewShare}%`, numberText(item.engagement), `${item.engagementRate}%`])
    ),
    "",
    "## Top 内容",
    "",
    report.topContents.length > 0
      ? renderTable(["平台", "内容", "曝光", "互动", "互动率", "快照日"], report.topContents.map((item) => [item.platformLabel, item.title, numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`, valueText(item.latestSnapshotDate)]))
      : "- 暂无 trusted 内容级快照。",
    "",
    "## 低互动内容",
    "",
    report.lowInteractionContents.length > 0
      ? renderTable(["平台", "内容", "曝光", "互动", "互动率", "建议"], report.lowInteractionContents.map((item) => [item.platformLabel, item.title, numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`, "复核标题、开头钩子和平台适配"]))
      : "- 暂无达到曝光阈值的低互动内容。",
    "",
    "## 平台对比",
    "",
    renderTable(
      ["平台", "曝光", "互动", "互动率", "结论"],
      report.platformComparison.map((item) => [item.label, numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`, item.views === Math.max(...report.platformComparison.map((platform) => platform.views)) ? "曝光主力" : "对照观察"])
    ),
    "",
    "## 数据新鲜度",
    "",
    `- 最近真实采集：${valueText(report.freshness.latestRealCaptureAt)}`,
    `- 最近 smoke：${valueText(report.freshness.latestSmokeAt)}`,
    `- 最近审计：${valueText(report.freshness.latestAuditAt)}`,
    `- 真实采集过期：${valueText(report.freshness.realCaptureIsStale)}；过期平台数：${numberText(report.freshness.realCaptureStaleCount)}`,
    `- smoke 过期：${valueText(report.freshness.smokeIsStale)}`,
    "",
    renderTable(
      ["平台", "状态", "真实采集", "smoke", "真实采集过期"],
      report.freshness.platformFreshness.map((item) => [item.label, item.status, valueText(item.latestRealCaptureAt), valueText(item.latestSmokeAt), valueText(item.realCaptureIsStale)])
    ),
    "",
    "## 被排除内容数量",
    "",
    `- 已排除内容：${numberText(report.excluded.excludedContentCount)}`,
    `- 已排除指标：${numberText(report.excluded.excludedMetricCount)}`,
    `- 已排除快照：${numberText(report.excluded.excludedMetricSnapshotCount)}`,
    `- 用户手动排除内容：${numberText(report.excluded.userExcludedContentCount)}`,
    "",
    report.excluded.sources.length > 0
      ? renderTable(["来源", "内容", "指标", "快照", "run"], report.excluded.sources.slice(0, 10).map((item) => [item.source, numberText(item.contentCount), numberText(item.metricCount), numberText(item.metricSnapshotCount), numberText(item.importRunCount)]))
      : "- 暂无被排除来源。",
    "",
    "## 下一步建议",
    "",
    report.recommendations.length > 0
      ? report.recommendations.map((item, index) => `${index + 1}. [${item.priority}] ${item.title}：${item.nextAction}`).join("\n")
      : "- 暂无建议。先完成四平台真实内容级导入和 daily gate。",
    "",
    "## 一致性检查",
    "",
    ...Object.entries(report.consistencyChecks).map(([key, value]) => `- ${key}: ${value}`),
    ""
  ];
  const markdown = lines.join("\n");
  assertReportSafe(markdown);
  return markdown;
}

export function buildRedactedTrustedWeeklySummary(report) {
  const summary = {
    generatedAt: report.generatedAt,
    task: "TRUSTED-WEEKLY-REPORT-EXPORT-035",
    sourceReportTask: report.task,
    defaultScope: report.scope.defaultScope,
    exportGuidance: "完整周报只作为本地证据；外发、粘贴或跨系统同步请使用本摘要。",
    localEvidencePath: ".local/trusted-weekly-report/report.md",
    redactedSummaryPath: ".local/trusted-weekly-report/redacted-summary.md",
    totals: {
      trustedContentCount: report.totals.trustedContentCount,
      metricSnapshotCount: report.totals.metricSnapshotCount,
      views: report.totals.views,
      engagement: report.totals.engagement,
      bestPlatform: report.totals.bestPlatform
    },
    platformOverview: report.platformOverview.map((item) => ({
      platform: item.platform,
      label: item.label,
      contentCount: item.contentCount,
      metricSnapshotCount: item.metricSnapshotCount,
      views: item.views,
      engagement: item.engagement,
      viewShare: item.viewShare,
      engagementRate: item.engagementRate
    })),
    topContentPerformance: report.topContents.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      platform: item.platform,
      platformLabel: item.platformLabel,
      views: item.views,
      engagement: item.engagement,
      engagementRate: item.engagementRate,
      latestSnapshotDate: item.latestSnapshotDate
    })),
    lowInteractionPerformance: report.lowInteractionContents.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      platform: item.platform,
      platformLabel: item.platformLabel,
      views: item.views,
      engagement: item.engagement,
      engagementRate: item.engagementRate
    })),
    freshness: {
      latestRealCaptureAt: report.freshness.latestRealCaptureAt,
      latestSmokeAt: report.freshness.latestSmokeAt,
      latestAuditAt: report.freshness.latestAuditAt,
      realCaptureIsStale: report.freshness.realCaptureIsStale,
      smokeIsStale: report.freshness.smokeIsStale,
      realCaptureStaleCount: report.freshness.realCaptureStaleCount,
      sourceMismatchCount: report.freshness.sourceMismatchCount
    },
    excluded: {
      excludedContentCount: report.excluded.excludedContentCount,
      excludedMetricSnapshotCount: report.excluded.excludedMetricSnapshotCount,
      userExcludedContentCount: report.excluded.userExcludedContentCount,
      excludedSourceCount: report.excluded.sources.length
    },
    recommendationTypes: report.recommendations.map((item) => ({
      type: item.type,
      priority: item.priority,
      evidenceCount: item.evidenceCount
    })),
    redaction: {
      contentTitlesIncluded: false,
      contentIdsIncluded: false,
      accountMetricsIncluded: false,
      captureDetailsIncluded: false
    },
    consistencyChecks: report.consistencyChecks
  };
  assertReportSafe(summary);
  return summary;
}

export function renderRedactedTrustedWeeklyMarkdown(summary) {
  const lines = [
    "# Trusted Weekly Redacted Summary",
    "",
    `Generated at: ${summary.generatedAt}`,
    `Scope: ${summary.defaultScope}`,
    "",
    "## 外发边界",
    "",
    `- ${summary.exportGuidance}`,
    "- 本摘要不包含真实内容标题、内容 id、账号级指标、采集细节或平台互动文本。",
    "",
    "## 四平台概览",
    "",
    `- 可信内容：${numberText(summary.totals.trustedContentCount)}`,
    `- 内容级快照：${numberText(summary.totals.metricSnapshotCount)}`,
    `- 总曝光：${numberText(summary.totals.views)}`,
    `- 总互动：${numberText(summary.totals.engagement)}`,
    `- 当前优势平台：${PLATFORM_LABELS[summary.totals.bestPlatform] ?? summary.totals.bestPlatform}`,
    "",
    renderTable(
      ["平台", "内容", "快照", "曝光", "曝光占比", "互动", "互动率"],
      summary.platformOverview.map((item) => [item.label, numberText(item.contentCount), numberText(item.metricSnapshotCount), numberText(item.views), `${item.viewShare}%`, numberText(item.engagement), `${item.engagementRate}%`])
    ),
    "",
    "## Top 内容表现",
    "",
    summary.topContentPerformance.length > 0
      ? renderTable(["排名", "平台", "曝光", "互动", "互动率", "快照日"], summary.topContentPerformance.map((item) => [item.rank, item.platformLabel, numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`, valueText(item.latestSnapshotDate)]))
      : "- 暂无可摘要内容表现。",
    "",
    "## 低互动表现",
    "",
    summary.lowInteractionPerformance.length > 0
      ? renderTable(["排名", "平台", "曝光", "互动", "互动率"], summary.lowInteractionPerformance.map((item) => [item.rank, item.platformLabel, numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`]))
      : "- 暂无达到阈值的低互动表现。",
    "",
    "## 数据新鲜度",
    "",
    `- 最近真实采集：${valueText(summary.freshness.latestRealCaptureAt)}`,
    `- 最近 smoke：${valueText(summary.freshness.latestSmokeAt)}`,
    `- 最近审计：${valueText(summary.freshness.latestAuditAt)}`,
    `- 真实采集过期：${valueText(summary.freshness.realCaptureIsStale)}；过期平台数：${numberText(summary.freshness.realCaptureStaleCount)}`,
    "",
    "## 排除口径",
    "",
    `- 已排除内容：${numberText(summary.excluded.excludedContentCount)}`,
    `- 已排除快照：${numberText(summary.excluded.excludedMetricSnapshotCount)}`,
    `- 用户手动排除内容：${numberText(summary.excluded.userExcludedContentCount)}`,
    `- 被排除来源种类：${numberText(summary.excluded.excludedSourceCount)}`,
    "",
    "## 下一步建议",
    "",
    summary.recommendationTypes.length > 0
      ? renderTable(["类型", "优先级", "证据条数"], summary.recommendationTypes.map((item) => [item.type, item.priority, numberText(item.evidenceCount)]))
      : "- 暂无建议类型。",
    "",
    "## 一致性检查",
    "",
    ...Object.entries(summary.consistencyChecks).map(([key, value]) => `- ${key}: ${value}`),
    ""
  ];
  const markdown = lines.join("\n");
  assertReportSafe(markdown);
  return markdown;
}

function assertReportSafe(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (SENSITIVE_PATTERN.test(serialized)) throw new Error("Trusted weekly report contains disallowed sensitive text.");
}

export function writeTrustedWeeklyReport(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options.outDir ?? DEFAULT_OUT_DIR);
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "report.json");
  const markdownPath = path.join(outDir, "report.md");
  const redactedJsonPath = path.join(outDir, "redacted-summary.json");
  const redactedMarkdownPath = path.join(outDir, "redacted-summary.md");
  const redactedSummary = buildRedactedTrustedWeeklySummary(report);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderTrustedWeeklyMarkdown(report), "utf8");
  writeFileSync(redactedJsonPath, `${JSON.stringify(redactedSummary, null, 2)}\n`, "utf8");
  writeFileSync(redactedMarkdownPath, renderRedactedTrustedWeeklyMarkdown(redactedSummary), "utf8");
  return { jsonPath, markdownPath, redactedJsonPath, redactedMarkdownPath };
}

export function writeRedactedTrustedWeeklySummary(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outDir = path.resolve(cwd, options.outDir ?? DEFAULT_OUT_DIR);
  mkdirSync(outDir, { recursive: true });
  const redactedJsonPath = path.join(outDir, "redacted-summary.json");
  const redactedMarkdownPath = path.join(outDir, "redacted-summary.md");
  const redactedSummary = buildRedactedTrustedWeeklySummary(report);
  writeFileSync(redactedJsonPath, `${JSON.stringify(redactedSummary, null, 2)}\n`, "utf8");
  writeFileSync(redactedMarkdownPath, renderRedactedTrustedWeeklyMarkdown(redactedSummary), "utf8");
  return { redactedSummary, outputs: { redactedJsonPath, redactedMarkdownPath } };
}

export async function runTrustedWeeklyReport(options = {}) {
  const repo = new SqliteSelfMediaRepo();
  try {
    const service = new SelfMediaService(repo);
    const snapshot = await service.dashboard();
    const report = buildTrustedWeeklyReport(snapshot, options);
    if (options.redactedOnly) {
      const { redactedSummary, outputs } = writeRedactedTrustedWeeklySummary(report, { cwd: options.cwd ?? process.cwd(), outDir: options.outDir });
      return { report, redactedSummary, outputs };
    }
    const outputs = writeTrustedWeeklyReport(report, { cwd: options.cwd ?? process.cwd(), outDir: options.outDir });
    return { report, redactedSummary: buildRedactedTrustedWeeklySummary(report), outputs };
  } finally {
    repo.close();
  }
}

async function runCli() {
  const argv = process.argv.slice(2);
  const outDir = argValue(argv, "out-dir") ?? DEFAULT_OUT_DIR;
  const redactedOnly = hasFlag(argv, "redacted-only") || hasFlag(argv, "safe-only");
  const { report, outputs } = await runTrustedWeeklyReport({ outDir, redactedOnly });
  console.log(
    JSON.stringify(
      {
        status: "pass",
        reportJson: outputs.jsonPath ? path.relative(process.cwd(), outputs.jsonPath) : null,
        reportMd: outputs.markdownPath ? path.relative(process.cwd(), outputs.markdownPath) : null,
        redactedJson: path.relative(process.cwd(), outputs.redactedJsonPath),
        redactedMd: path.relative(process.cwd(), outputs.redactedMarkdownPath),
        trustedContentCount: report.totals.trustedContentCount,
        trustedMetricSnapshotCount: report.totals.metricSnapshotCount,
        views: report.totals.views,
        engagement: report.totals.engagement
      },
      null,
      2
    )
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
