#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_OUT_DIR = ".local/daily-self-media-ops";
const DEFAULT_OUTPUT_JSON = `${DEFAULT_OUT_DIR}/redacted-summary.json`;
const DEFAULT_OUTPUT_MD = `${DEFAULT_OUT_DIR}/redacted-summary.md`;

const REPORT_PATHS = {
  dailyOps: ".local/daily-self-media-ops/report.json",
  localServerHealth: [
    ".local/daily-self-media-ops/local-server-health/report.json",
    ".local/local-server-health/report.json"
  ],
  platformDataHealth: ".local/platform-data-health/report.json",
  realCaptureFreshness: ".local/real-capture-freshness/report.json",
  trustedWeeklySafe: ".local/trusted-weekly-report/redacted-summary.json",
  trustedDashboardAudit: [
    ".local/daily-self-media-ops/trusted-dashboard-audit/report.json",
    ".local/trusted-dashboard-audit/report.json"
  ]
};

const SENSITIVE_TEXT = /raw\s*payload|cookie|authorization|headers?|access[_-]?token|refresh[_-]?token|\btoken\b|session|secret|credential|private|comment_content|danmu_text|danmu|评论正文|弹幕|contentId|私密标题|私人标题|敏感标题|《[^》]{1,120}》/i;
const SAFE_PLATFORM = /^(douyin|xiaohongshu|video-account|video_account|bilibili|wechat|other|unknown)$/;
const DEFAULT_NEXT_ACTION = "Review the redacted daily summary, then rerun the specific failed check shown in nextActions.";

function argValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function booleanValue(value, fallback = null) {
  return typeof value === "boolean" ? value : fallback;
}

function safeString(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  if (SENSITIVE_TEXT.test(text)) return "redacted-sensitive-operating-text";
  return text.length > 320 ? `${text.slice(0, 320)}...` : text;
}

function safeStringArray(value, limit = 12) {
  return asArray(value)
    .map((item) => safeString(item, null))
    .filter(Boolean)
    .slice(0, limit);
}

function safePlatformArray(value, limit = 12) {
  return asArray(value)
    .map((item) => String(item ?? "").trim())
    .filter((item) => SAFE_PLATFORM.test(item))
    .slice(0, limit);
}

function safePortArray(value, limit = 24) {
  return asArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0 && item <= 65535)
    .slice(0, limit);
}

function readJson(cwd, candidates) {
  const paths = Array.isArray(candidates) ? candidates : [candidates];
  for (const relativePath of paths) {
    const filePath = path.join(cwd, relativePath);
    if (!existsSync(filePath)) continue;
    try {
      return {
        exists: true,
        path: relativePath,
        data: JSON.parse(readFileSync(filePath, "utf8")),
        error: null
      };
    } catch (error) {
      return {
        exists: true,
        path: relativePath,
        data: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    exists: false,
    path: paths[0],
    data: null,
    error: null
  };
}

function freshnessSummary(value) {
  const item = asRecord(value);
  return {
    latestRealCaptureAt: safeString(item.latestRealCaptureAt),
    latestSmokeAt: safeString(item.latestSmokeAt),
    latestAuditAt: safeString(item.latestAuditAt),
    realCaptureAgeHours: item.realCaptureAgeHours === null || item.realCaptureAgeHours === undefined ? null : numberValue(item.realCaptureAgeHours, null),
    smokeAgeHours: item.smokeAgeHours === null || item.smokeAgeHours === undefined ? null : numberValue(item.smokeAgeHours, null),
    realCaptureIsStale: booleanValue(item.realCaptureIsStale),
    smokeIsStale: booleanValue(item.smokeIsStale),
    staleAfterHours: item.staleAfterHours === null || item.staleAfterHours === undefined ? null : numberValue(item.staleAfterHours, null)
  };
}

function reportBase(readResult, fallbackStatus = "missing") {
  const report = asRecord(readResult.data);
  return {
    exists: readResult.exists && !readResult.error && Boolean(readResult.data),
    reportPath: readResult.path,
    status: readResult.error ? "error" : safeString(report.status, fallbackStatus),
    generatedAt: safeString(report.generatedAt),
    parseError: readResult.error ? "report-json-parse-error" : null
  };
}

function summarizeDailyOps(readResult) {
  const report = asRecord(readResult.data);
  const summary = asRecord(report.summary);
  const sections = asRecord(report.sections);
  const preflight = asRecord(sections.preflightHealth);
  const steps = asArray(report.steps).map((step) => {
    const item = asRecord(step);
    const stepSummary = asRecord(item.summary);
    return {
      key: safeString(item.key, "unknown"),
      label: safeString(item.label, "unknown"),
      status: item.passed === true ? "pass" : item.passed === false ? "fail" : safeString(stepSummary.status, "unknown"),
      passed: booleanValue(item.passed),
      reportPath: safeString(item.reportPath)
    };
  }).slice(0, 8);
  return {
    ...reportBase(readResult),
    passed: booleanValue(report.passed),
    dashboardUrl: safeString(asRecord(report.config).dashboardUrl),
    preflight: {
      enabled: booleanValue(preflight.enabled, false),
      status: safeString(preflight.status, "disabled"),
      preferredDashboardUrl: safeString(preflight.preferredDashboardUrl),
      healthyPorts: safePortArray(preflight.healthyPorts),
      trustedDataReadyPorts: safePortArray(preflight.trustedDataReadyPorts),
      pageReadyPorts: safePortArray(preflight.pageReadyPorts)
    },
    completedAllSteps: booleanValue(summary.completedAllSteps),
    blockingReasons: safeStringArray(summary.blockingReasons, 20),
    warnings: safeStringArray(summary.warnings, 20),
    nextActions: safeStringArray(summary.nextActions, 16),
    steps
  };
}

function summarizeLocalServer(readResult) {
  const report = asRecord(readResult.data);
  const summary = asRecord(report.summary);
  const ports = asArray(report.ports).map((value) => {
    const item = asRecord(value);
    const dashboard = asRecord(item.dashboard);
    const safeWeekly = asRecord(item.safeWeekly);
    const dashboardPage = asRecord(item.dashboardPage);
    return {
      port: numberValue(item.port),
      healthy: booleanValue(item.healthy, false),
      issue: safeString(item.issue, "unknown"),
      dashboardStatus: safeString(dashboard.status, "unknown"),
      dashboardDurationMs: dashboard.durationMs === null || dashboard.durationMs === undefined ? null : numberValue(dashboard.durationMs, null),
      safeWeeklyStatus: safeString(safeWeekly.status, "unknown"),
      safeWeeklyDurationMs: safeWeekly.durationMs === null || safeWeekly.durationMs === undefined ? null : numberValue(safeWeekly.durationMs, null),
      pageStatus: safeString(dashboardPage.status, "not_checked"),
      pageDurationMs: dashboardPage.durationMs === null || dashboardPage.durationMs === undefined ? null : numberValue(dashboardPage.durationMs, null)
    };
  }).filter((item) => item.port > 0).slice(0, 24);
  return {
    ...reportBase(readResult),
    passed: booleanValue(report.passed),
    preferredDashboardUrl: safeString(summary.preferredDashboardUrl),
    healthyPorts: safePortArray(summary.healthyPorts),
    apiReadyPorts: safePortArray(summary.apiReadyPorts),
    safeWeeklyReadyPorts: safePortArray(summary.safeWeeklyReadyPorts),
    trustedDataReadyPorts: safePortArray(summary.trustedDataReadyPorts),
    pageReadyPorts: safePortArray(summary.pageReadyPorts),
    timeoutPorts: safePortArray(summary.timeoutPorts),
    oldRoutePorts: safePortArray(summary.oldRoutePorts),
    staleOrOldRoutePorts: safePortArray(summary.staleOrOldRoutePorts),
    notListeningPorts: safePortArray(summary.notListeningPorts),
    nextActions: safeStringArray(summary.nextActions, 16),
    ports
  };
}

function summarizePlatformHealth(readResult) {
  const report = asRecord(readResult.data);
  const summary = asRecord(report.summary);
  const platforms = asArray(report.platforms).map((value) => {
    const item = asRecord(value);
    const raw = asRecord(item.raw);
    const mapping = asRecord(item.mappingPreview);
    const saveSmoke = asRecord(item.saveSmokeReport);
    return {
      platform: safeString(item.platform, "unknown"),
      status: safeString(item.status, "unknown"),
      realCaptureStatus: safeString(item.realCaptureStatus, "unknown"),
      rawCaptureCount: numberValue(raw.captureCount),
      mappingPreviewStatus: safeString(mapping.status, "unknown"),
      saveSmokeStatus: safeString(saveSmoke.status, "unknown"),
      warningCount: asArray(item.warnings).length
    };
  }).filter((item) => SAFE_PLATFORM.test(item.platform)).slice(0, 8);
  return {
    ...reportBase(readResult),
    summary: {
      platformCount: numberValue(summary.platformCount),
      okCount: numberValue(summary.okCount),
      warnCount: numberValue(summary.warnCount),
      errorCount: numberValue(summary.errorCount),
      missingCount: numberValue(summary.missingCount),
      staleCount: numberValue(summary.staleCount),
      realCaptureStaleCount: numberValue(summary.realCaptureStaleCount),
      sourceMismatchCount: numberValue(summary.sourceMismatchCount),
      bilibiliPreviewOnlyOk: booleanValue(summary.bilibiliPreviewOnlyOk)
    },
    freshness: freshnessSummary(summary.freshness),
    platforms
  };
}

function summarizeRealCapture(readResult) {
  const report = asRecord(readResult.data);
  const summary = asRecord(report.summary);
  return {
    ...reportBase(readResult),
    passed: booleanValue(report.passed),
    staleAfterHours: numberValue(report.staleAfterHours, null),
    summary: {
      freshPlatforms: safePlatformArray(summary.freshPlatforms),
      stalePlatforms: safePlatformArray(summary.stalePlatforms),
      missingPlatforms: safePlatformArray(summary.missingPlatforms),
      staleCount: numberValue(summary.staleCount),
      missingCount: numberValue(summary.missingCount)
    },
    latestRealCaptureAt: latestIso(asArray(report.platforms).map((item) => asRecord(item).latestRealCaptureAt)),
    latestSmokeAt: latestIso(asArray(report.platforms).map((item) => asRecord(item).latestSmokeAt))
  };
}

function summarizeWeeklySafe(readResult) {
  const report = asRecord(readResult.data);
  const totals = asRecord(report.totals);
  const redaction = asRecord(report.redaction);
  return {
    ...reportBase(readResult),
    status: readResult.exists && !readResult.error && readResult.data ? "pass" : reportBase(readResult).status,
    exportGuidance: "Share this daily summary or the trusted weekly redacted summary only; keep full local evidence files local.",
    totals: {
      trustedContentCount: numberValue(totals.trustedContentCount),
      metricSnapshotCount: numberValue(totals.metricSnapshotCount ?? totals.trustedMetricSnapshotCount),
      views: numberValue(totals.views),
      engagement: numberValue(totals.engagement)
    },
    platformOverview: asArray(report.platformOverview).map((value) => {
      const item = asRecord(value);
      return {
        platform: safeString(item.platform, "unknown"),
        contentCount: numberValue(item.contentCount),
        metricSnapshotCount: numberValue(item.metricSnapshotCount),
        views: numberValue(item.views),
        engagement: numberValue(item.engagement)
      };
    }).filter((item) => SAFE_PLATFORM.test(item.platform)).slice(0, 8),
    redaction: {
      titlesIncluded: redaction.contentTitlesIncluded === true,
      idsIncluded: redaction.contentIdsIncluded === true,
      accountMetricsIncluded: redaction.accountMetricsIncluded === true,
      captureDetailsIncluded: redaction.captureDetailsIncluded === true
    },
    consistencyChecks: Object.fromEntries(Object.entries(asRecord(report.consistencyChecks)).map(([key, value]) => [safeString(key, "unknown"), Boolean(value)]))
  };
}

function summarizeTrustedAudit(readResult) {
  const report = asRecord(readResult.data);
  const expected = asRecord(report.expected);
  return {
    ...reportBase(readResult),
    dashboardInput: safeString(report.dashboardInput, "unknown"),
    mismatchCount: asArray(report.mismatches).length,
    totals: {
      trustedContentCount: numberValue(expected.contentCount),
      metricSnapshotCount: numberValue(expected.metricSnapshotCount),
      views: numberValue(expected.views),
      engagement: numberValue(expected.engagement)
    },
    platformDistribution: Object.fromEntries(Object.entries(asRecord(expected.platformDistribution)).map(([platform, value]) => {
      const item = asRecord(value);
      return [safeString(platform, "unknown"), {
        contentCount: numberValue(item.contentCount),
        metricSnapshotCount: numberValue(item.metricSnapshotCount),
        views: numberValue(item.views),
        engagement: numberValue(item.engagement)
      }];
    }).filter(([platform]) => SAFE_PLATFORM.test(platform))),
    freshness: freshnessSummary(report.freshness)
  };
}

function latestIso(values) {
  const timestamps = values
    .map((value) => typeof value === "string" ? new Date(value).getTime() : NaN)
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function unique(values, limit = 24) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function buildBlockingReasons(sections) {
  const reasons = [];
  reasons.push(...sections.dailyOps.blockingReasons);
  if (!sections.dailyOps.exists) reasons.push("daily self-media ops report is missing");
  if (sections.dailyOps.status === "fail") reasons.push("daily self-media ops failed");
  if (sections.localServerHealth.exists && sections.localServerHealth.status === "fail") reasons.push("local server health has no usable healthy port");
  if (sections.platformDataHealth.status === "error") reasons.push("platform data health is error");
  if (sections.realCaptureFreshness.status === "error") reasons.push("real capture freshness has missing platform evidence");
  if (!sections.trustedWeeklySafe.exists) reasons.push("trusted weekly safe summary is missing");
  if (sections.trustedWeeklySafe.exists && (sections.trustedWeeklySafe.redaction.titlesIncluded || sections.trustedWeeklySafe.redaction.idsIncluded || sections.trustedWeeklySafe.redaction.accountMetricsIncluded || sections.trustedWeeklySafe.redaction.captureDetailsIncluded)) reasons.push("trusted weekly safe summary redaction is not safe");
  if (sections.trustedDashboardAudit.status === "fail") reasons.push("trusted dashboard audit has mismatches");
  return unique(reasons.map((item) => safeString(item, null)), 20);
}

function buildWarnings(sections) {
  const warnings = [];
  warnings.push(...sections.dailyOps.warnings);
  if (!sections.localServerHealth.exists) warnings.push("local server health report is missing");
  if (!sections.platformDataHealth.exists) warnings.push("platform data health report is missing");
  if (sections.platformDataHealth.status === "warn") warnings.push("platform data health has warnings");
  if (!sections.realCaptureFreshness.exists) warnings.push("real capture freshness report is missing");
  if (sections.realCaptureFreshness.summary.staleCount > 0) warnings.push(`real capture stale platforms: ${sections.realCaptureFreshness.summary.stalePlatforms.join(", ") || "unknown"}`);
  if (!sections.trustedDashboardAudit.exists) warnings.push("trusted dashboard audit report is missing");
  return unique(warnings.map((item) => safeString(item, null)), 20);
}

function buildNextActions(sections, blockingReasons, warnings) {
  const actions = [];
  actions.push(...sections.dailyOps.nextActions);
  if (sections.localServerHealth.status === "fail") actions.push(...sections.localServerHealth.nextActions);
  if (!sections.dailyOps.exists) actions.push("Run npm run ops:daily-self-media -- --preflight-health, then rerun npm run report:daily-ops:safe.");
  if (!sections.localServerHealth.exists) actions.push("Run npm run check:local-server-health -- --ports=3200,3201 --strict --require-trusted-data --check-page.");
  if (sections.platformDataHealth.status === "error" || !sections.platformDataHealth.exists) actions.push("Run npm run health:platform-data.");
  if (sections.realCaptureFreshness.status === "error" || sections.realCaptureFreshness.summary.missingCount > 0) actions.push("Refresh missing platform captures manually, then rerun health and freshness checks.");
  if (sections.realCaptureFreshness.summary.staleCount > 0) actions.push("Refresh stale platform captures manually before trusting the next operating cycle.");
  if (!sections.trustedWeeklySafe.exists) actions.push("Run npm run report:trusted-weekly:safe.");
  if (sections.trustedDashboardAudit.status === "fail" || !sections.trustedDashboardAudit.exists) actions.push("Run npm run audit:trusted-dashboard with the healthy dashboard URL.");
  if (actions.length === 0 && blockingReasons.length === 0 && warnings.length === 0) actions.push("No blocking action. Continue daily dashboard review and task follow-through.");
  if (actions.length === 0) actions.push(DEFAULT_NEXT_ACTION);
  return unique(actions.map((item) => safeString(item, null)), 16);
}

function statusFrom(blockingReasons, warnings) {
  if (blockingReasons.length > 0) return "fail";
  if (warnings.length > 0) return "warn";
  return "pass";
}

export function buildDailyOpsRedactedSummary(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const generatedAt = new Date(options.now ?? Date.now()).toISOString();
  const reads = {
    dailyOps: readJson(cwd, options.dailyOpsReport ?? REPORT_PATHS.dailyOps),
    localServerHealth: readJson(cwd, options.localServerHealthReport ?? REPORT_PATHS.localServerHealth),
    platformDataHealth: readJson(cwd, options.platformDataHealthReport ?? REPORT_PATHS.platformDataHealth),
    realCaptureFreshness: readJson(cwd, options.realCaptureFreshnessReport ?? REPORT_PATHS.realCaptureFreshness),
    trustedWeeklySafe: readJson(cwd, options.trustedWeeklySafeReport ?? REPORT_PATHS.trustedWeeklySafe),
    trustedDashboardAudit: readJson(cwd, options.trustedDashboardAuditReport ?? REPORT_PATHS.trustedDashboardAudit)
  };
  const sections = {
    dailyOps: summarizeDailyOps(reads.dailyOps),
    localServerHealth: summarizeLocalServer(reads.localServerHealth),
    platformDataHealth: summarizePlatformHealth(reads.platformDataHealth),
    realCaptureFreshness: summarizeRealCapture(reads.realCaptureFreshness),
    trustedWeeklySafe: summarizeWeeklySafe(reads.trustedWeeklySafe),
    trustedDashboardAudit: summarizeTrustedAudit(reads.trustedDashboardAudit)
  };
  const blockingReasons = buildBlockingReasons(sections);
  const warnings = buildWarnings(sections);
  const nextActions = buildNextActions(sections, blockingReasons, warnings);
  const summary = {
    generatedAt,
    task: "DAILY-OPS-REPORT-CONSOLIDATION-041",
    status: statusFrom(blockingReasons, warnings),
    passed: blockingReasons.length === 0,
    shareable: true,
    scope: {
      readOnly: true,
      serverStarted: false,
      processKilled: false,
      platformCollection: false,
      platformPublishing: false,
      databaseDeletion: false,
      databaseMigration: false,
      trustedRealCreatorCenterContentLevelOnly: true,
      fullLocalReportsIncluded: false,
      platformResponseBodiesIncluded: false,
      platformInteractionTextIncluded: false,
      contentTitlesIncluded: false
    },
    outputs: {
      json: options.outputJson ?? DEFAULT_OUTPUT_JSON,
      markdown: options.outputMarkdown ?? DEFAULT_OUTPUT_MD
    },
    sourceReports: Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, { exists: value.exists, reportPath: value.reportPath, status: value.status, generatedAt: value.generatedAt }])),
    blockingReasons,
    warnings,
    nextActions,
    sections
  };
  assertSafeSummary(summary);
  return summary;
}

function renderStatus(value) {
  return value ?? "-";
}

function renderArray(value) {
  return Array.isArray(value) && value.length > 0 ? value.join(", ") : "none";
}

export function renderDailyOpsRedactedMarkdown(summary) {
  const lines = [
    "# Daily Ops Redacted Summary",
    "",
    `Generated at: ${summary.generatedAt}`,
    `Status: ${summary.status}`,
    `Passed: ${summary.passed ? "true" : "false"}`,
    "",
    "## Share Boundary",
    "",
    "- This is the safe daily operating summary. Keep full local evidence reports local.",
    "- It stores status, counts, ports, freshness timestamps, and next actions only.",
    "- It does not start services, stop processes, collect platform data, publish content, delete DB rows, or migrate DB rows.",
    "- It omits platform response bodies, platform interaction text, and content titles.",
    "",
    "## Blocking",
    "",
    summary.blockingReasons.length > 0 ? summary.blockingReasons.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Warnings",
    "",
    summary.warnings.length > 0 ? summary.warnings.map((item) => `- ${item}`).join("\n") : "- None",
    "",
    "## Next Actions",
    "",
    summary.nextActions.map((item) => `- ${item}`).join("\n"),
    "",
    "## Source Reports",
    "",
    "| Report | Status | Exists | Path | Generated |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const [key, value] of Object.entries(summary.sourceReports)) {
    lines.push(`| ${key} | ${value.status} | ${value.exists ? "yes" : "no"} | \`${value.reportPath}\` | ${renderStatus(value.generatedAt)} |`);
  }
  lines.push(
    "",
    "## Trusted Totals",
    "",
    `- weekly trusted content: ${summary.sections.trustedWeeklySafe.totals.trustedContentCount}`,
    `- weekly snapshots: ${summary.sections.trustedWeeklySafe.totals.metricSnapshotCount}`,
    `- weekly views: ${summary.sections.trustedWeeklySafe.totals.views}`,
    `- weekly engagement: ${summary.sections.trustedWeeklySafe.totals.engagement}`,
    `- audit trusted content: ${summary.sections.trustedDashboardAudit.totals.trustedContentCount}`,
    `- audit snapshots: ${summary.sections.trustedDashboardAudit.totals.metricSnapshotCount}`,
    `- audit mismatch count: ${summary.sections.trustedDashboardAudit.mismatchCount}`,
    "",
    "## Local Server",
    "",
    `- preferred dashboard URL: ${renderStatus(summary.sections.localServerHealth.preferredDashboardUrl)}`,
    `- healthy ports: ${renderArray(summary.sections.localServerHealth.healthyPorts)}`,
    `- API ready: ${renderArray(summary.sections.localServerHealth.apiReadyPorts)}`,
    `- safe weekly ready: ${renderArray(summary.sections.localServerHealth.safeWeeklyReadyPorts)}`,
    `- trusted data ready: ${renderArray(summary.sections.localServerHealth.trustedDataReadyPorts)}`,
    `- page ready: ${renderArray(summary.sections.localServerHealth.pageReadyPorts)}`,
    "",
    "## Data Freshness",
    "",
    `- latest real capture: ${renderStatus(summary.sections.realCaptureFreshness.latestRealCaptureAt ?? summary.sections.platformDataHealth.freshness.latestRealCaptureAt)}`,
    `- latest smoke: ${renderStatus(summary.sections.realCaptureFreshness.latestSmokeAt ?? summary.sections.platformDataHealth.freshness.latestSmokeAt)}`,
    `- latest audit: ${renderStatus(summary.sections.trustedDashboardAudit.freshness.latestAuditAt)}`,
    `- stale platforms: ${renderArray(summary.sections.realCaptureFreshness.summary.stalePlatforms)}`,
    `- missing platforms: ${renderArray(summary.sections.realCaptureFreshness.summary.missingPlatforms)}`,
    "",
    "## Platform Health",
    "",
    "| Platform | Status | Real capture | Raw captures | Mapping | Save smoke | Warnings |",
    "| --- | --- | --- | ---: | --- | --- | ---: |"
  );
  for (const platform of summary.sections.platformDataHealth.platforms) {
    lines.push(`| ${platform.platform} | ${platform.status} | ${platform.realCaptureStatus} | ${platform.rawCaptureCount} | ${platform.mappingPreviewStatus} | ${platform.saveSmokeStatus} | ${platform.warningCount} |`);
  }
  lines.push("");
  const markdown = lines.join("\n");
  assertSafeSummary(markdown);
  return markdown;
}

export function writeDailyOpsRedactedSummary(summary, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const jsonRelative = options.outputJson ?? summary.outputs?.json ?? DEFAULT_OUTPUT_JSON;
  const markdownRelative = options.outputMarkdown ?? summary.outputs?.markdown ?? DEFAULT_OUTPUT_MD;
  const jsonPath = path.join(cwd, jsonRelative);
  const markdownPath = path.join(cwd, markdownRelative);
  mkdirSync(path.dirname(jsonPath), { recursive: true });
  mkdirSync(path.dirname(markdownPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderDailyOpsRedactedMarkdown(summary), "utf8");
  return { jsonPath, markdownPath };
}

export function runDailyOpsRedactedSummary(options = {}) {
  const summary = buildDailyOpsRedactedSummary(options);
  const outputs = writeDailyOpsRedactedSummary(summary, options);
  return { summary, outputs };
}

function assertSafeSummary(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (SENSITIVE_TEXT.test(text)) throw new Error("Daily ops redacted summary contains disallowed sensitive text.");
}

function parseCli(argv) {
  const outDir = argValue(argv, "out-dir") ?? DEFAULT_OUT_DIR;
  return {
    outputJson: argValue(argv, "json") ?? `${outDir}/redacted-summary.json`,
    outputMarkdown: argValue(argv, "markdown") ?? `${outDir}/redacted-summary.md`
  };
}

function rel(cwd, target) {
  return path.relative(cwd, target).replaceAll(path.sep, "/");
}

function main() {
  const { summary, outputs } = runDailyOpsRedactedSummary(parseCli(process.argv.slice(2)));
  console.log(`Daily ops redacted summary status: ${summary.status}`);
  console.log(`JSON summary: ${rel(process.cwd(), outputs.jsonPath)}`);
  console.log(`Markdown summary: ${rel(process.cwd(), outputs.markdownPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  }
}
