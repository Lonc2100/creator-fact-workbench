#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo/sqlite-self-media-repo.ts";
import { SelfMediaService } from "../src/domain/self-media/service/self-media-service.ts";

if (process.env.SELF_MEDIA_PLATFORM_SMOKE_CWD) process.chdir(process.env.SELF_MEDIA_PLATFORM_SMOKE_CWD);

const OUT_DIR = path.join(process.cwd(), ".local", "platform-personal-save-smoke");
const REPORT_PATH = path.join(OUT_DIR, "report.json");
const SMOKE_DB_PATH = path.join(".local", "platform-personal-save-smoke", "self-media-smoke.sqlite");
const ABSOLUTE_SMOKE_DB_PATH = path.resolve(process.cwd(), process.env.SELF_MEDIA_PLATFORM_SMOKE_DB_PATH?.trim() || SMOKE_DB_PATH);
const PLATFORM_ORDER = ["douyin", "xiaohongshu", "video-account", "bilibili"];
const SMOKE_PROVENANCE = {
  isTestFixture: true,
  operationKind: "platform_save_smoke",
  trustedScopeEligible: false
};
const SENSITIVE_TERMS = [
  "cookie",
  "authorization",
  "auth[_-]?header",
  "access[_-]?" + "token",
  "refresh[_-]?" + "token",
  "ms" + "Token",
  "SESS" + "DATA",
  "bili_" + "jct",
  "Dede" + "UserID",
  "a_" + "bogus",
  "x-" + "signature",
  "web[_-]?session",
  "xsec",
  "openid",
  "unionid",
  "wxuin",
  "passport",
  "sessionid",
  "private-msg",
  "commentList",
  "comment_content",
  "danmu_text",
  "raw comment secret",
  "danmu text secret"
];
const SENSITIVE_PATTERN = new RegExp(`(${SENSITIVE_TERMS.join("|")})`, "i");

process.env.SELF_MEDIA_DB_PATH = ABSOLUTE_SMOKE_DB_PATH;
process.env.SELF_MEDIA_SEED_MODE = "off";

const PLATFORM_CONFIG = {
  douyin: {
    label: "Douyin personal creator center",
    source: "douyin_creator_center",
    platform: "douyin",
    rawDir: path.join(process.cwd(), ".local", "douyin-personal-v0", "raw"),
    savePath: "service:importDouyinPersonalCaptures",
    parse: (service, captures) => service.parseDouyinPersonalCaptures(captures),
    save: (service, captures) => service.importDouyinPersonalCaptures(captures, SMOKE_PROVENANCE)
  },
  xiaohongshu: {
    label: "Xiaohongshu creator center",
    source: "xiaohongshu_creator_center",
    platform: "xiaohongshu",
    rawDir: path.join(process.cwd(), ".local", "xiaohongshu-personal-v0", "raw"),
    savePath: "service:importXiaohongshuPersonalCaptures",
    parse: (service, captures) => service.parseXiaohongshuPersonalCaptures(captures),
    save: (service, captures) => service.importXiaohongshuPersonalCaptures(captures, SMOKE_PROVENANCE)
  },
  "video-account": {
    label: "Video Account assistant",
    source: "video_account_creator_center",
    platform: "video_account",
    rawDir: path.join(process.cwd(), ".local", "video-account-personal-v0", "raw"),
    savePath: "service:importVideoAccountPersonalCaptures",
    parse: (service, captures) => service.parseVideoAccountPersonalCaptures(captures),
    save: (service, captures) => service.importVideoAccountPersonalCaptures(captures, SMOKE_PROVENANCE)
  },
  bilibili: {
    key: "bilibili",
    label: "Bilibili creator center archives",
    source: "bilibili_creator_center",
    platform: "bilibili",
    rawDir: path.join(process.cwd(), ".local", "bilibili-personal-v0", "raw"),
    savePath: "service:importBilibiliPersonalCaptures",
    parse: (service, captures) => service.parseBilibiliPersonalCaptures(captures),
    save: (service, captures) => service.importBilibiliPersonalCaptures(captures, SMOKE_PROVENANCE),
    diagnosticsOnly: ["accountMetrics", "dateKeyRows"],
    boundary: "archives_content_level_only"
  }
};

function parseArgs(argv) {
  const options = { platform: "all" };
  for (const arg of argv) {
    if (arg.startsWith("--platform=")) options.platform = arg.slice("--platform=".length);
    else if (arg === "--help" || arg === "-h") options.help = true;
  }
  return options;
}

function usage() {
  return [
    "Usage: tsx scripts/platform-personal-save-smoke.mjs --platform=<platform>",
    "",
    "Platforms:",
    "  douyin",
    "  xiaohongshu",
    "  video-account",
    "  bilibili",
    "  all"
  ].join("\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCaptures(rawDir) {
  assert(existsSync(rawDir), `missing raw capture dir: ${rawDir}`);
  return readdirSync(rawDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const capture = JSON.parse(readFileSync(path.join(rawDir, file), "utf8"));
      return { ...capture, file: capture.file ?? `raw/${file}` };
    });
}

function scanText(name, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return { name, ok: !SENSITIVE_PATTERN.test(text) };
}

function countRepo(repo, config, expectedIds) {
  return {
    imports: repo.listImports().filter((item) => item.source === config.source).length,
    platformContents: repo.listContents().filter((item) => item.platform === config.platform).length,
    platformMetrics: repo.listMetrics().filter((item) => item.platform === config.platform).length,
    platformVersions: repo.listPlatformVersions().filter((item) => item.platform === config.platform).length,
    metricSnapshots: repo.listMetricSnapshots().filter((item) => item.source === config.source).length,
    accountMetricSnapshots: repo.listAccountMetricSnapshots().filter((item) => item.source === config.source).length,
    expectedContents: repo.listContents().filter((item) => expectedIds.includes(item.id)).length,
    expectedMetrics: repo.listMetrics().filter((item) => expectedIds.includes(item.contentId) && item.platform === config.platform).length,
    expectedPlatformVersions: repo.listPlatformVersions().filter((item) => expectedIds.includes(item.contentId) && item.platform === config.platform).length,
    expectedMetricSnapshots: repo.listMetricSnapshots().filter((item) => expectedIds.includes(item.contentId) && item.source === config.source).length
  };
}

function summarizePayload(payload) {
  return {
    source: payload.source,
    contentCount: payload.contents.length,
    metricCount: payload.metrics.length,
    contentIds: payload.contents.map((item) => item.id),
    metricContentIds: payload.metrics.map((item) => item.contentId),
    expectedTotalViews: payload.metrics.reduce((sum, item) => sum + (item.views ?? 0), 0),
    accountMetricDiagnosticCount: Array.isArray(payload.accountMetrics) ? payload.accountMetrics.length : 0,
    dateKeyDiagnosticCount: Array.isArray(payload.dateKeyRows) ? payload.dateKeyRows.length : 0,
    warnings: payload.warnings ?? []
  };
}

function collectSaved(repo, config, expectedIds) {
  return {
    contents: repo.listContents().filter((item) => expectedIds.includes(item.id)),
    metrics: repo.listMetrics().filter((item) => expectedIds.includes(item.contentId) && item.platform === config.platform),
    versions: repo.listPlatformVersions().filter((item) => expectedIds.includes(item.contentId) && item.platform === config.platform),
    snapshots: repo.listMetricSnapshots().filter((item) => expectedIds.includes(item.contentId) && item.source === config.source && item.provenance?.isTestFixture === true && item.id.endsWith("-fixture")),
    imports: repo.listImports().filter((item) => item.source === config.source)
  };
}

function assertPlatformResult(config, payloadSummary, firstRun, secondRun, beforeCounts, afterFirstCounts, afterSecondCounts, saved, dashboardBefore, dashboard) {
  const expectedCount = payloadSummary.contentCount;
  assert(payloadSummary.source === config.source, `payload source should be ${config.source}`);
  assert(expectedCount > 0, `${config.platform} payload should contain content`);
  assert(payloadSummary.metricCount === expectedCount, `${config.platform} metric count should match content count`);
  assert(firstRun.run.source === config.source, `first import run source should be ${config.source}`);
  assert(secondRun.run.source === config.source, `second import run source should be ${config.source}`);
  assert(firstRun.run.status === "success", "first import run should succeed");
  assert(secondRun.run.status === "success", "second import run should succeed");
  assert(firstRun.run.provenance?.isTestFixture === true, "first import run should be marked as smoke fixture");
  assert(secondRun.run.provenance?.isTestFixture === true, "second import run should be marked as smoke fixture");
  assert(secondRun.run.provenance?.operationKind === "platform_save_smoke", "smoke import run should record platform_save_smoke operation kind");
  assert(secondRun.run.provenance?.trustedScopeEligible === false, "smoke import run should be trusted-scope ineligible");
  assert(saved.contents.length === expectedCount, `${config.platform} saved content count should match payload`);
  assert(saved.metrics.length === expectedCount, `${config.platform} saved metric count should match payload`);
  assert(saved.versions.length === expectedCount, `${config.platform} platform version count should match payload`);
  assert(saved.snapshots.length === expectedCount, `${config.platform} metric snapshot count should match payload`);
  assert(saved.snapshots.every((item) => item.provenance?.isTestFixture === true), `${config.platform} smoke metric snapshots should be marked as fixture`);
  assert(saved.snapshots.every((item) => item.provenance?.trustedScopeEligible === false), `${config.platform} smoke metric snapshots should be trusted-scope ineligible`);
  assert(afterFirstCounts.expectedContents === expectedCount, `${config.platform} first save should materialize expected content ids`);
  assert(afterSecondCounts.expectedContents === afterFirstCounts.expectedContents, `${config.platform} second save should not create duplicate content entities`);
  assert(afterSecondCounts.expectedPlatformVersions === afterFirstCounts.expectedPlatformVersions, `${config.platform} second save should keep platform versions idempotent`);
  assert(afterSecondCounts.expectedMetricSnapshots === afterFirstCounts.expectedMetricSnapshots, `${config.platform} second save should keep metric snapshots idempotent`);
  assert(afterSecondCounts.imports >= beforeCounts.imports + 2, `${config.platform} import runs should append audit records`);
  assert(dashboard.defaultScope === "trusted_real_creator_center", `${config.platform} dashboard should use trusted real default scope`);
  assert(dashboard.isDefaultDashboardTrusted === true, `${config.platform} default dashboard scope should be trusted`);
  assert(dashboard.fixtureMetricSnapshots.length === 0, `${config.platform} dashboard should exclude smoke fixture metric snapshots`);
  assert(dashboard.excludedSourceMetricSnapshots >= expectedCount, `${config.platform} real scope should count excluded smoke snapshots`);
  assert(dashboard.weeklyReviewTotalViews === dashboardBefore.weeklyReviewTotalViews, `${config.platform} weekly review should not change after smoke fixture save`);
  assert(dashboard.monthlyReviewTotalViews === dashboardBefore.monthlyReviewTotalViews, `${config.platform} monthly review should not change after smoke fixture save`);
  if (config.key === "bilibili") {
    assert(payloadSummary.accountMetricDiagnosticCount > 0, "Bilibili accountMetrics should remain available as diagnostics");
    assert(payloadSummary.dateKeyDiagnosticCount > 0, "Bilibili dateKeyRows should remain available as diagnostics");
    assert(afterSecondCounts.accountMetricSnapshots === beforeCounts.accountMetricSnapshots, "Bilibili accountMetrics/dateKeyRows must not persist AccountMetricSnapshot rows in unified content smoke");
    assert(dashboard.accountMetricSnapshots === beforeCounts.accountMetricSnapshots, "Bilibili AccountMetricSnapshot rows must not enter content dashboard totals in unified content smoke");
  }
}

async function runPlatform(platformKey) {
  const config = PLATFORM_CONFIG[platformKey];
  const captures = loadCaptures(config.rawDir);
  const repo = new SqliteSelfMediaRepo();
  try {
    const service = new SelfMediaService(repo);
    const payload = config.parse(service, captures);
    const payloadSummary = summarizePayload(payload);
    const expectedIds = payloadSummary.contentIds;
    const beforeCounts = countRepo(repo, config, expectedIds);
    const beforeDashboardSnapshot = await service.dashboard();
    const dashboardBefore = {
      weeklyReviewTotalViews: beforeDashboardSnapshot.weeklyReview.metrics.totalViews,
      monthlyReviewTotalViews: beforeDashboardSnapshot.monthlyReview.metrics.totalViews
    };
    const firstRun = config.save(service, captures);
    const afterFirstCounts = countRepo(repo, config, expectedIds);
    await sleep(5);
    const secondRun = config.save(service, captures);
    const afterSecondCounts = countRepo(repo, config, expectedIds);
    const saved = collectSaved(repo, config, expectedIds);
    const dashboardSnapshot = await service.dashboard();
    const dashboard = {
      contents: dashboardSnapshot.contents.filter((item) => expectedIds.includes(item.id)),
      metrics: dashboardSnapshot.metrics.filter((item) => expectedIds.includes(item.contentId) && item.platform === config.platform),
      metricSnapshots: dashboardSnapshot.metricSnapshots.filter((item) => expectedIds.includes(item.contentId) && item.source === config.source),
      fixtureMetricSnapshots: dashboardSnapshot.metricSnapshots.filter((item) => expectedIds.includes(item.contentId) && item.source === config.source && item.provenance?.isTestFixture === true),
      platformVersions: dashboardSnapshot.platformVersions.filter((item) => expectedIds.includes(item.contentId) && item.platform === config.platform),
      accountMetricSnapshots: dashboardSnapshot.accountMetricSnapshots.filter((item) => item.source === config.source).length,
      defaultScope: dashboardSnapshot.realDataScope.defaultScope,
      isDefaultDashboardTrusted: dashboardSnapshot.realDataScope.isDefaultDashboardTrusted,
      excludedSourceMetricSnapshots: dashboardSnapshot.realDataScope.excludedSources.find((item) => item.source === config.source)?.metricSnapshotCount ?? 0,
      weeklyReviewTotalViews: dashboardSnapshot.weeklyReview.metrics.totalViews,
      monthlyReviewTotalViews: dashboardSnapshot.monthlyReview.metrics.totalViews
    };
    const safetyChecks = [
      scanText("payload-summary", payloadSummary),
      scanText("saved-content-notes", saved.contents.map((item) => item.notes ?? "")),
      scanText("saved-import-runs", saved.imports.map((item) => ({ id: item.id, source: item.source, status: item.status, importedCount: item.importedCount })))
    ];
    assert(safetyChecks.every((item) => item.ok), `sensitive pattern found in ${platformKey} smoke outputs: ${safetyChecks.filter((item) => !item.ok).map((item) => item.name).join(", ")}`);
    assertPlatformResult(config, payloadSummary, firstRun, secondRun, beforeCounts, afterFirstCounts, afterSecondCounts, saved, dashboardBefore, dashboard);

    return {
      platform: platformKey,
      label: config.label,
      passed: true,
      source: payloadSummary.source,
      savePath: config.savePath,
      rawCaptureFiles: captures.length,
      contentCount: payloadSummary.contentCount,
      metricCount: payloadSummary.metricCount,
      contentIds: expectedIds,
      importRunIds: [firstRun.run.id, secondRun.run.id],
      before: beforeCounts,
      afterFirstSave: afterFirstCounts,
      afterSecondSave: afterSecondCounts,
      checks: {
        importRunSource: firstRun.run.source === config.source && secondRun.run.source === config.source,
        contentCount: saved.contents.length,
        metricCount: saved.metrics.length,
        platformVersionCount: saved.versions.length,
        metricSnapshotCount: saved.snapshots.length,
        accountMetricSnapshotCount: afterSecondCounts.accountMetricSnapshots,
        dashboardContents: dashboard.contents.length,
        dashboardMetrics: dashboard.metrics.length,
        dashboardMetricSnapshots: dashboard.metricSnapshots.length,
        dashboardPlatformVersions: dashboard.platformVersions.length,
        dashboardAccountMetricSnapshots: dashboard.accountMetricSnapshots,
        defaultScope: dashboard.defaultScope,
        isDefaultDashboardTrusted: dashboard.isDefaultDashboardTrusted,
        excludedSourceMetricSnapshots: dashboard.excludedSourceMetricSnapshots,
        weeklyReviewTotalViews: dashboard.weeklyReviewTotalViews,
        monthlyReviewTotalViews: dashboard.monthlyReviewTotalViews,
        expectedTotalViews: payloadSummary.expectedTotalViews,
        provenance: {
          isTestFixture: secondRun.run.provenance?.isTestFixture === true,
          operationKind: secondRun.run.provenance?.operationKind,
          trustedScopeEligible: secondRun.run.provenance?.trustedScopeEligible,
          metricSnapshotsMarkedFixture: saved.snapshots.every((item) => item.provenance?.isTestFixture === true)
        },
        diagnostics: config.key === "bilibili" ? {
          boundary: config.boundary,
          accountMetricDiagnosticCount: payloadSummary.accountMetricDiagnosticCount,
          dateKeyDiagnosticCount: payloadSummary.dateKeyDiagnosticCount,
          accountMetricsSaved: afterSecondCounts.accountMetricSnapshots > beforeCounts.accountMetricSnapshots,
          dateKeyRowsSaved: false,
          accountMetricSnapshotsExcludedFromContentTotals: dashboard.accountMetricSnapshots === beforeCounts.accountMetricSnapshots
        } : undefined,
        idempotency: {
          contentEntitiesStable: afterSecondCounts.expectedContents === afterFirstCounts.expectedContents,
          platformVersionsStable: afterSecondCounts.expectedPlatformVersions === afterFirstCounts.expectedPlatformVersions,
          metricSnapshotsStable: afterSecondCounts.expectedMetricSnapshots === afterFirstCounts.expectedMetricSnapshots,
          importRunsAppend: afterSecondCounts.imports >= beforeCounts.imports + 2,
          note: "Content, platform versions, and metric snapshots use stable upsert keys. Import runs are append-style audit records."
        },
        safetyChecks
      },
      warnings: payloadSummary.warnings
    };
  } finally {
    repo.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const selected = options.platform === "all" ? PLATFORM_ORDER : [options.platform];
  for (const platform of selected) {
    assert(PLATFORM_CONFIG[platform], `unsupported platform: ${platform}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const platforms = [];
  for (const platform of selected) {
    platforms.push(await runPlatform(platform));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    task: "PLATFORM-OPS-FOUR-024",
    passed: platforms.every((item) => item.passed),
    platformArg: options.platform,
    database: {
      smokeDbPath: path.relative(process.cwd(), ABSOLUTE_SMOKE_DB_PATH).replaceAll(path.sep, "/"),
      absoluteSmokeDbPath: ABSOLUTE_SMOKE_DB_PATH,
      seedMode: process.env.SELF_MEDIA_SEED_MODE,
      isolation: "forced_smoke_db"
    },
    platforms,
    notes: [
      "Scope is Douyin, Xiaohongshu, Video Account, and Bilibili personal platform imports only.",
      "Bilibili save scope is archives content-level metrics only; accountMetrics and dateKeyRows remain diagnostics only.",
      "WeChat Official Account backend is intentionally out of scope.",
      "Report stores summaries and ids only; raw captures stay local under platform .local raw directories."
    ]
  };
  const reportSafety = scanText("report", report);
  assert(reportSafety.ok, "sensitive pattern found in unified smoke report");
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT_PATH, passed: report.passed, platforms: platforms.map((item) => item.platform) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
