import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const STALE_AFTER_HOURS = 72;

export const PLATFORM_HEALTH_CONFIG = [
  {
    key: "douyin",
    label: "Douyin personal creator center",
    expectedSource: "douyin_creator_center",
    rawDir: ".local/douyin-personal-v0/raw",
    mappingPreview: ".local/douyin-personal-v1/mapping-preview.json",
    saveSmokeReport: ".local/douyin-personal-v1/save-smoke-report.json"
  },
  {
    key: "xiaohongshu",
    label: "Xiaohongshu creator center",
    expectedSource: "xiaohongshu_creator_center",
    rawDir: ".local/xiaohongshu-personal-v0/raw",
    mappingPreview: ".local/xiaohongshu-personal-v1/mapping-preview.json",
    saveSmokeReport: ".local/xiaohongshu-personal-v1/save-smoke-report.json"
  },
  {
    key: "video-account",
    label: "Video Account assistant",
    expectedSource: "video_account_creator_center",
    rawDir: ".local/video-account-personal-v0/raw",
    mappingPreview: ".local/video-account-personal-v1/mapping-preview.json",
    saveSmokeReport: ".local/video-account-personal-v1/save-smoke-report.json"
  },
  {
    key: "bilibili",
    label: "Bilibili creator center",
    expectedSource: "bilibili_creator_center",
    rawDir: ".local/bilibili-personal-v0/raw",
    mappingPreview: ".local/bilibili-personal-v1/mapping-preview.json",
    saveSmokeReport: ".local/bilibili-personal-v1/save-smoke-report.json"
  }
];

export const BILIBILI_ACCOUNT_HEALTH_CONFIG = {
  expectedSource: "bilibili_creator_center",
  accountPreview: ".local/bilibili-account-metrics-v0/account-preview.json",
  stabilityReport: ".local/bilibili-account-metrics-v0/stability-report.md"
};

export const PLATFORM_ASSISTED_REFRESH_COMMANDS = {
  douyin: {
    manualStep: "人工登录抖音创作者中心，完成真实采集；本检查不会自动打开平台。",
    preview: "npm run import:douyin",
    save: "npm run import:douyin -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  },
  xiaohongshu: {
    manualStep: "人工登录小红书创作服务平台，完成真实采集；本检查不会自动打开平台。",
    preview: "npm run import:xiaohongshu",
    save: "npm run import:xiaohongshu -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  },
  "video-account": {
    manualStep: "人工登录视频号助手，完成真实采集；本检查不会自动打开平台。",
    preview: "npm run import:video-account",
    save: "npm run import:video-account -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  },
  bilibili: {
    manualStep: "人工登录 B站创作中心，完成 archives 内容级真实采集；账号级指标仍只预览不保存。",
    preview: "npm run import:bilibili",
    save: "npm run import:bilibili -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  }
};

export function assistedRefreshCommands(platformKey) {
  return PLATFORM_ASSISTED_REFRESH_COMMANDS[platformKey] ?? PLATFORM_ASSISTED_REFRESH_COMMANDS.douyin;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function ageHours(value, now) {
  const iso = toIso(value);
  if (!iso) return null;
  const hours = (now.getTime() - new Date(iso).getTime()) / 36e5;
  return Number(hours.toFixed(2));
}

function relativePath(cwd, target) {
  return path.relative(cwd, target).replaceAll(path.sep, "/");
}

function readJsonSummary(filePath) {
  if (!existsSync(filePath)) return { exists: false, data: null, error: null };
  try {
    return { exists: true, data: JSON.parse(readFileSync(filePath, "utf8")), error: null };
  } catch (error) {
    return { exists: true, data: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function latestIso(values) {
  const timestamps = values
    .map((value) => toIso(value))
    .filter(Boolean)
    .map((value) => new Date(value).getTime());
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function fileModifiedAt(filePath) {
  if (!existsSync(filePath)) return null;
  return statSync(filePath).mtime.toISOString();
}

function dirSummary(cwd, rawDir, now) {
  const fullPath = path.join(cwd, rawDir);
  if (!existsSync(fullPath)) {
    return {
      path: rawDir,
      exists: false,
      captureCount: 0,
      latestModifiedAt: null,
      latestRealCaptureAt: null,
      ageHours: null,
      isStale: null,
      status: "error"
    };
  }

  const captures = readdirSync(fullPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => statSync(path.join(fullPath, entry.name)).mtime);
  const latestModifiedAt = latestIso(captures);
  const rawAge = ageHours(latestModifiedAt, now);

  const isStale = rawAge === null ? null : rawAge > STALE_AFTER_HOURS;
  return {
    path: relativePath(cwd, fullPath),
    exists: true,
    captureCount: captures.length,
    latestModifiedAt,
    latestRealCaptureAt: latestModifiedAt,
    ageHours: rawAge,
    isStale,
    status: captures.length > 0 ? isStale ? "warn" : "ok" : "warn"
  };
}

function summaryStatus({ exists, parsed, isStale, sourceMatches, requiredBooleans = [] }) {
  if (!exists || !parsed || sourceMatches === false) return "error";
  if (isStale || requiredBooleans.some((value) => value === false)) return "warn";
  return "ok";
}

function mappingPreviewSummary(cwd, config, now) {
  const fullPath = path.join(cwd, config.mappingPreview);
  const json = readJsonSummary(fullPath);
  const data = json.data;
  const generatedAt = toIso(data?.generatedAt) ?? fileModifiedAt(fullPath);
  const source = data?.payload?.source ?? data?.source ?? data?.input?.source ?? null;
  const previewAge = ageHours(generatedAt, now);
  const isStale = previewAge === null ? null : previewAge > STALE_AFTER_HOURS;
  const sourceMatches = source === null ? null : source === config.expectedSource;

  return {
    path: config.mappingPreview,
    exists: json.exists,
    parsed: Boolean(data),
    generatedAt,
    ageHours: previewAge,
    isStale,
    saved: typeof data?.saved === "boolean" ? data.saved : null,
    previewOnly: typeof data?.previewOnly === "boolean" ? data.previewOnly : null,
    source,
    expectedSource: config.expectedSource,
    sourceMatches,
    contentCount: typeof data?.payload?.contentCount === "number" ? data.payload.contentCount : null,
    metricCount: typeof data?.payload?.metricCount === "number" ? data.payload.metricCount : null,
    status: summaryStatus({ exists: json.exists, parsed: Boolean(data), isStale, sourceMatches }),
    error: json.error
  };
}

function saveSmokeSummary(cwd, config, now) {
  const fullPath = path.join(cwd, config.saveSmokeReport);
  const json = readJsonSummary(fullPath);
  const data = json.data;
  const generatedAt = toIso(data?.generatedAt) ?? fileModifiedAt(fullPath);
  const reportAge = ageHours(generatedAt, now);
  const isStale = reportAge === null ? null : reportAge > STALE_AFTER_HOURS;
  const source = data?.source ?? null;
  const sourceMatches = source === null ? null : source === config.expectedSource;

  return {
    path: config.saveSmokeReport,
    exists: json.exists,
    parsed: Boolean(data),
    generatedAt,
    ageHours: reportAge,
    isStale,
    passed: typeof data?.passed === "boolean" ? data.passed : null,
    source,
    expectedSource: config.expectedSource,
    sourceMatches,
    contentCount: typeof data?.contentCount === "number" ? data.contentCount : null,
    metricCount: typeof data?.metricCount === "number" ? data.metricCount : null,
    importRunSourceOk: typeof data?.checks?.importRunSource === "boolean" ? data.checks.importRunSource : null,
    status: summaryStatus({
      exists: json.exists,
      parsed: Boolean(data),
      isStale,
      sourceMatches,
      requiredBooleans: [typeof data?.passed === "boolean" ? data.passed : true]
    }),
    error: json.error
  };
}

function buildPlatformWarnings(platform) {
  const warnings = [];
  if (!platform.raw.exists) warnings.push("raw capture directory is missing");
  if (platform.raw.exists && platform.raw.captureCount === 0) warnings.push("raw capture directory has no json captures");
  if (platform.raw.isStale) warnings.push(`real capture is older than ${STALE_AFTER_HOURS} hours`);
  for (const item of [platform.mappingPreview, platform.saveSmokeReport]) {
    if (!item.exists) warnings.push(`${item.path} is missing`);
    if (item.exists && !item.parsed) warnings.push(`${item.path} could not be parsed`);
    if (item.isStale) warnings.push(`${item.path} is older than ${STALE_AFTER_HOURS} hours`);
    if (item.sourceMatches === false) warnings.push(`${item.path} source does not match ${item.expectedSource}`);
  }
  if (platform.saveSmokeReport.passed === false) warnings.push("save smoke report did not pass");
  return warnings;
}

function overallStatus(items) {
  if (items.some((item) => item.status === "error")) return "error";
  if (items.some((item) => item.status === "warn")) return "warn";
  return "ok";
}

function platformSummary(cwd, config, now) {
  const raw = dirSummary(cwd, config.rawDir, now);
  const mappingPreview = mappingPreviewSummary(cwd, config, now);
  const saveSmokeReport = saveSmokeSummary(cwd, config, now);
  const latestGeneratedAt = latestIso([raw.latestModifiedAt, mappingPreview.generatedAt, saveSmokeReport.generatedAt]);
  const realCaptureStatus = !raw.exists || raw.captureCount === 0 ? "missing" : raw.isStale === true ? "stale" : raw.isStale === false ? "fresh" : "unknown";
  const commands = assistedRefreshCommands(config.key);
  const nextAction = realCaptureStatus === "missing" || realCaptureStatus === "stale"
    ? `${commands.manualStep} 然后依次运行 preview、save、health、freshness、audit、gate 命令；不要自动采集，不要读取密码/cookie/token/header。`
    : "真实采集仍在 72 小时内；如刚完成人工采集，可继续 preview/save，再运行 health、freshness、audit、gate。";
  const freshness = {
    latestRealCaptureAt: raw.latestRealCaptureAt,
    realCaptureAgeHours: raw.ageHours,
    realCaptureIsStale: raw.isStale,
    latestSmokeAt: saveSmokeReport.generatedAt,
    smokeAgeHours: saveSmokeReport.ageHours,
    smokeIsStale: saveSmokeReport.isStale,
    latestAuditAt: null,
    staleAfterHours: STALE_AFTER_HOURS
  };
  const platform = {
    platform: config.key,
    label: config.label,
    expectedSource: config.expectedSource,
    latestGeneratedAt,
    freshness,
    raw,
    mappingPreview,
    saveSmokeReport,
    realCaptureStatus,
    nextAction,
    commands,
    status: "ok",
    warnings: []
  };
  platform.warnings = buildPlatformWarnings(platform);
  platform.status = overallStatus([raw, mappingPreview, saveSmokeReport]);
  return platform;
}

function accountPreviewSummary(cwd, now) {
  const fullPath = path.join(cwd, BILIBILI_ACCOUNT_HEALTH_CONFIG.accountPreview);
  const json = readJsonSummary(fullPath);
  const data = json.data;
  const generatedAt = toIso(data?.generatedAt) ?? fileModifiedAt(fullPath);
  const previewAge = ageHours(generatedAt, now);
  const isStale = previewAge === null ? null : previewAge > STALE_AFTER_HOURS;
  const source = data?.source ?? data?.input?.source ?? null;
  const sourceMatches = source === null ? null : source === BILIBILI_ACCOUNT_HEALTH_CONFIG.expectedSource;
  const previewOnly = typeof data?.previewOnly === "boolean" ? data.previewOnly : null;
  const saved = typeof data?.saved === "boolean" ? data.saved : null;
  const previewOnlyOk = previewOnly === true && saved === false;

  return {
    path: BILIBILI_ACCOUNT_HEALTH_CONFIG.accountPreview,
    exists: json.exists,
    parsed: Boolean(data),
    generatedAt,
    ageHours: previewAge,
    isStale,
    source,
    expectedSource: BILIBILI_ACCOUNT_HEALTH_CONFIG.expectedSource,
    sourceMatches,
    candidateCount: typeof data?.candidateCount === "number" ? data.candidateCount : null,
    previewOnly,
    saved,
    previewOnlyOk,
    status: summaryStatus({
      exists: json.exists,
      parsed: Boolean(data),
      isStale,
      sourceMatches,
      requiredBooleans: [previewOnlyOk]
    }),
    error: json.error
  };
}

function stabilityReportSummary(cwd, now) {
  const fullPath = path.join(cwd, BILIBILI_ACCOUNT_HEALTH_CONFIG.stabilityReport);
  const latestModifiedAt = fileModifiedAt(fullPath);
  const reportAge = ageHours(latestModifiedAt, now);
  const isStale = reportAge === null ? null : reportAge > STALE_AFTER_HOURS;

  return {
    path: BILIBILI_ACCOUNT_HEALTH_CONFIG.stabilityReport,
    exists: existsSync(fullPath),
    latestModifiedAt,
    ageHours: reportAge,
    isStale,
    status: !existsSync(fullPath) ? "error" : isStale ? "warn" : "ok"
  };
}

function buildBilibiliAccountWarnings(summary) {
  const warnings = [];
  const preview = summary.accountPreview;
  const stability = summary.stabilityReport;
  if (!preview.exists) warnings.push("Bilibili account preview is missing");
  if (preview.exists && !preview.parsed) warnings.push("Bilibili account preview could not be parsed");
  if (preview.isStale) warnings.push(`Bilibili account preview is older than ${STALE_AFTER_HOURS} hours`);
  if (preview.sourceMatches === false) warnings.push(`Bilibili account preview source does not match ${preview.expectedSource}`);
  if (preview.previewOnlyOk === false) warnings.push("Bilibili account preview is no longer previewOnly=true with saved=false");
  if (!stability.exists) warnings.push("Bilibili stability report is missing");
  if (stability.isStale) warnings.push(`Bilibili stability report is older than ${STALE_AFTER_HOURS} hours`);
  return warnings;
}

function bilibiliAccountSummary(cwd, now) {
  const accountPreview = accountPreviewSummary(cwd, now);
  const stabilityReport = stabilityReportSummary(cwd, now);
  const summary = {
    accountPreview,
    stabilityReport,
    latestGeneratedAt: latestIso([accountPreview.generatedAt, stabilityReport.latestModifiedAt]),
    status: overallStatus([accountPreview, stabilityReport]),
    warnings: []
  };
  summary.warnings = buildBilibiliAccountWarnings(summary);
  return summary;
}

function countByStatus(items, status) {
  return items.filter((item) => item.status === status).length;
}

export function buildPlatformDataHealthReport(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const platformKeys = options.platforms ?? PLATFORM_HEALTH_CONFIG.map((item) => item.key);
  const configs = PLATFORM_HEALTH_CONFIG.filter((item) => platformKeys.includes(item.key));
  const platforms = configs.map((config) => platformSummary(cwd, config, now));
  const bilibiliAccount = platformKeys.includes("bilibili") ? bilibiliAccountSummary(cwd, now) : null;
  const platformChecks = platforms.flatMap((platform) => [platform.raw, platform.mappingPreview, platform.saveSmokeReport]);
  const accountChecks = bilibiliAccount ? [bilibiliAccount.accountPreview, bilibiliAccount.stabilityReport] : [];
  const checks = [...platformChecks, ...accountChecks];
  const latestRealCaptureAt = latestIso(platforms.map((platform) => platform.freshness.latestRealCaptureAt));
  const latestSmokeAt = latestIso(platforms.map((platform) => platform.freshness.latestSmokeAt));
  const realCaptureAge = ageHours(latestRealCaptureAt, now);
  const smokeAge = ageHours(latestSmokeAt, now);

  return {
    generatedAt: now.toISOString(),
    task: "PLATFORM-DATA-HEALTH-026",
    staleAfterHours: STALE_AFTER_HOURS,
    scope: {
      note: "Reads raw directory counts and whitelisted summary JSON fields only; original response bodies are not read or emitted.",
      platforms: configs.map((item) => item.key)
    },
    platforms,
    bilibiliAccount,
    summary: {
      platformCount: platforms.length,
      okCount: countByStatus(checks, "ok"),
      warnCount: countByStatus(checks, "warn"),
      errorCount: countByStatus(checks, "error"),
      missingCount: checks.filter((item) => item.exists === false).length,
      staleCount: checks.filter((item) => item.isStale === true).length,
      realCaptureStaleCount: platforms.filter((platform) => platform.freshness.realCaptureIsStale === true).length,
      sourceMismatchCount: checks.filter((item) => item.sourceMatches === false).length,
      bilibiliPreviewOnlyOk: bilibiliAccount ? bilibiliAccount.accountPreview.previewOnlyOk : null,
      freshness: {
        latestRealCaptureAt,
        latestSmokeAt,
        latestAuditAt: null,
        realCaptureAgeHours: realCaptureAge,
        smokeAgeHours: smokeAge,
        realCaptureIsStale: realCaptureAge === null ? null : realCaptureAge > STALE_AFTER_HOURS,
        smokeIsStale: smokeAge === null ? null : smokeAge > STALE_AFTER_HOURS,
        staleAfterHours: STALE_AFTER_HOURS
      }
    },
    status: overallStatus([
      ...platforms,
      ...(bilibiliAccount ? [bilibiliAccount] : [])
    ])
  };
}

function valueText(value) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function renderPlatformDataHealthMarkdown(report) {
  const freshness = report.summary.freshness ?? {};
  const lines = [
    "# Platform Data Health Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Task: ${report.task}`,
    `Status: ${report.status}`,
    `Stale threshold: ${report.staleAfterHours} hours`,
    "",
    "This report reads raw directory counts plus whitelisted summary fields only. It does not read or emit original response bodies.",
    "",
    "## Platform Summary",
    "",
    "| Platform | Status | Raw captures | Recent real capture | Real stale | Mapping preview | Recent smoke | Smoke stale | Import source |",
    "| --- | --- | ---: | --- | --- | --- | --- | --- | --- |"
  ];

  for (const platform of report.platforms) {
    lines.push(
      [
        platform.platform,
        platform.status,
        platform.raw.captureCount,
        valueText(platform.freshness?.latestRealCaptureAt ?? platform.raw.latestModifiedAt),
        valueText(platform.freshness?.realCaptureIsStale ?? platform.raw.isStale),
        `${platform.mappingPreview.status} (${valueText(platform.mappingPreview.contentCount)}/${valueText(platform.mappingPreview.metricCount)})`,
        valueText(platform.freshness?.latestSmokeAt ?? platform.saveSmokeReport.generatedAt),
        valueText(platform.freshness?.smokeIsStale ?? platform.saveSmokeReport.isStale),
        `${valueText(platform.mappingPreview.source)} / ${valueText(platform.saveSmokeReport.source)}`
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |")
    );
  }

  lines.push(
    "",
    "## Freshness Timeline",
    "",
    `- Recent real capture: ${valueText(freshness.latestRealCaptureAt)}`,
    `- Recent smoke: ${valueText(freshness.latestSmokeAt)}`,
    `- Recent audit: ${valueText(freshness.latestAuditAt)}`,
    `- Real capture stale over ${report.staleAfterHours}h: ${valueText(freshness.realCaptureIsStale)}`,
    `- Smoke stale over ${report.staleAfterHours}h: ${valueText(freshness.smokeIsStale)}`
  );

  if (report.bilibiliAccount) {
    const preview = report.bilibiliAccount.accountPreview;
    const stability = report.bilibiliAccount.stabilityReport;
    lines.push(
      "",
      "## Bilibili Account Diagnostics",
      "",
      "| Check | Status | Value | Latest |",
      "| --- | --- | --- | --- |",
      `| account-preview | ${preview.status} | candidateCount=${valueText(preview.candidateCount)}, previewOnly=${valueText(preview.previewOnly)}, saved=${valueText(preview.saved)} | ${valueText(preview.generatedAt)} |`,
      `| stability-report | ${stability.status} | exists=${valueText(stability.exists)} | ${valueText(stability.latestModifiedAt)} |`
    );
  }

  const warnings = [
    ...report.platforms.flatMap((platform) => platform.warnings.map((warning) => `${platform.platform}: ${warning}`)),
    ...(report.bilibiliAccount?.warnings.map((warning) => `bilibili-account: ${warning}`) ?? [])
  ];
  lines.push("", "## Warnings", "");
  if (warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of warnings) lines.push(`- ${warning}`);
  }

  lines.push(
    "",
    "## Summary",
    "",
    `- okCount: ${report.summary.okCount}`,
    `- warnCount: ${report.summary.warnCount}`,
    `- errorCount: ${report.summary.errorCount}`,
    `- missingCount: ${report.summary.missingCount}`,
    `- staleCount: ${report.summary.staleCount}`,
    `- realCaptureStaleCount: ${report.summary.realCaptureStaleCount}`,
    `- sourceMismatchCount: ${report.summary.sourceMismatchCount}`,
    `- bilibiliPreviewOnlyOk: ${valueText(report.summary.bilibiliPreviewOnlyOk)}`,
    ""
  );

  return lines.join("\n");
}

export function writePlatformDataHealthReport(report, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outputDir = path.join(cwd, ".local", "platform-data-health");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "report.json");
  const markdownPath = path.join(outputDir, "report.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(markdownPath, renderPlatformDataHealthMarkdown(report));
  return { jsonPath, markdownPath };
}

function runCli() {
  const report = buildPlatformDataHealthReport();
  const output = writePlatformDataHealthReport(report);
  console.log(`Platform data health status: ${report.status}`);
  console.log(`JSON report: ${relativePath(process.cwd(), output.jsonPath)}`);
  console.log(`Markdown report: ${relativePath(process.cwd(), output.markdownPath)}`);
  console.log(`Checks: ok=${report.summary.okCount}, warn=${report.summary.warnCount}, error=${report.summary.errorCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
