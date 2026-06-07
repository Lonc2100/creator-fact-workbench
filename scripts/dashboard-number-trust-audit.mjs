#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright-core";

const TASK_ID = "DASHBOARD-NUMBER-TRUST-AUDIT-043";
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const OUTPUT_DIR = path.join(process.cwd(), ".local", "dashboard-number-trust-audit-043");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const REPORT_MD_PATH = path.join(OUTPUT_DIR, "report.md");
const SCREENSHOT_PATH = path.join(OUTPUT_DIR, "dashboard.png");
const TRUSTED_AUDIT_DIR = path.join(OUTPUT_DIR, "trusted-dashboard-audit");
const DB_PATH = path.join(".local", "dashboard-number-trust-audit-043", `self-media-${RUN_ID}.sqlite`);
const NEXT_DIST_DIR = `.next-dashboard-number-trust-audit-${RUN_ID}`;
const DEFAULT_LIVE_BASE_URL = "http://127.0.0.1:3200";

const PLATFORM_LABELS = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  video_account: "视频号",
  bilibili: "B站"
};

const DASHBOARD_DEFAULT_FORBIDDEN_PATTERNS = [
  /\.local/i,
  /report\.json/i,
  /report\.md/i,
  /D:\\/i,
  /npm run/i,
  /http:\/\/127\.0\.0\.1/i,
  /\/api\/self-media/i,
  /\bpreflight\b/i,
  /\bpageReady\b/i,
  /\bapiReady\b/i,
  /\brunId\b/i,
  /\brawDir\b/i,
  /\bevidenceFile\b/i,
  /\bsmoke\b/i,
  /\bfixture\b/i,
  /\bcommand\b/i,
  /\bexitCode\b/i,
  /\baudit\b/i,
  /\bdashboard-json\b/i,
  /\bdashboard-url\b/i,
  /\bdemo\b/i,
  /\bfake\b/i
];

const PLATFORM_FIXTURES = [
  {
    source: "douyin_creator_center",
    platform: "douyin",
    id: "dashboard-number-douyin",
    title: "数字校验样本 A",
    capturedAt: "2026-06-04T08:00:00.000Z",
    views: 2400,
    likes: 260,
    comments: 32,
    saves: 42,
    shares: 28
  },
  {
    source: "xiaohongshu_creator_center",
    platform: "xiaohongshu",
    id: "dashboard-number-xhs",
    title: "数字校验样本 B",
    capturedAt: "2026-06-04T08:05:00.000Z",
    views: 920,
    likes: 2,
    comments: 0,
    saves: 0,
    shares: 0
  },
  {
    source: "video_account_creator_center",
    platform: "video_account",
    id: "dashboard-number-video-account",
    title: "数字校验样本 C",
    capturedAt: "2026-06-04T08:10:00.000Z",
    views: 640,
    likes: 45,
    comments: 5,
    saves: 6,
    shares: 5
  },
  {
    source: "bilibili_creator_center",
    platform: "bilibili",
    id: "dashboard-number-bilibili",
    title: "数字校验样本 D",
    capturedAt: "2026-06-04T08:15:00.000Z",
    views: 810,
    likes: 50,
    comments: 8,
    saves: 12,
    shares: 7
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function argValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(argv, name) {
  return argv.includes(`--${name}`);
}

function parseArgs(argv) {
  const live = hasFlag(argv, "live");
  return {
    mode: live ? "live" : "fixture",
    live,
    baseUrl: (argValue(argv, "base-url") ?? DEFAULT_LIVE_BASE_URL).replace(/\/$/, "")
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

function chromeExecutablePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].filter(Boolean);
  const executable = candidates.find((candidate) => existsSync(candidate));
  if (!executable) throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH to run this audit.");
  return executable;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberText(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function metricKey(metric, dateField) {
  return `${metric.contentId}|${metric.platform}|${String(metric[dateField] ?? "").slice(0, 10)}`;
}

function engagementOf(metric) {
  return numberValue(metric.likes) + numberValue(metric.comments) + numberValue(metric.saves) + numberValue(metric.shares);
}

function pushCheck(checks, name, actual, expected) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  checks.push({ name, passed, actual, expected });
  return passed;
}

function platformMapFromDistribution(distribution) {
  return Object.fromEntries(
    Object.entries(distribution ?? {}).map(([platform, value]) => [
      platform,
      {
        contentCount: numberValue(value.contentCount),
        metricSnapshotCount: numberValue(value.metricSnapshotCount),
        views: numberValue(value.views),
        engagement: numberValue(value.engagement)
      }
    ])
  );
}

function buildContentRanking(snapshot) {
  const contentsById = new Map((snapshot.contents ?? []).map((content) => [content.id, content]));
  const snapshotKeys = new Set((snapshot.metricSnapshots ?? []).map((metric) => metricKey(metric, "snapshotDate")));
  const entries = [
    ...(snapshot.metricSnapshots ?? []),
    ...(snapshot.metrics ?? []).filter((metric) => !snapshotKeys.has(metricKey(metric, "capturedAt")))
  ];
  const groups = new Map();
  for (const metric of entries) {
    const current = groups.get(metric.contentId) ?? {
      contentId: metric.contentId,
      title: contentsById.get(metric.contentId)?.title ?? metric.contentId,
      platform: metric.platform,
      views: 0,
      engagement: 0
    };
    current.views += numberValue(metric.views);
    current.engagement += engagementOf(metric);
    groups.set(metric.contentId, current);
  }
  return [...groups.values()].sort((a, b) => b.views - a.views || b.engagement - a.engagement || a.contentId.localeCompare(b.contentId));
}

async function findPort(start = 3275) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free dashboard number audit port found.");
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/self-media/dashboard`);
      if (response.ok) return;
    } catch {
      // Poll until the isolated dev server is ready.
    }
    await sleep(800);
  }
  throw new Error(`Dashboard number audit target did not become ready: ${baseUrl}`);
}

async function seedDatabase() {
  process.env.SELF_MEDIA_DB_PATH = DB_PATH;
  process.env.SELF_MEDIA_SEED_MODE = "off";
  const [{ SqliteSelfMediaRepo }, { SelfMediaService }] = await Promise.all([
    import("../src/domain/self-media/repo/sqlite-self-media-repo.ts"),
    import("../src/domain/self-media/service/self-media-service.ts")
  ]);
  const repo = new SqliteSelfMediaRepo(DB_PATH);
  const service = new SelfMediaService(repo);
  try {
    for (const fixture of PLATFORM_FIXTURES) {
      service.importPayload(
        {
          source: fixture.source,
          contents: [{
            id: fixture.id,
            title: fixture.title,
            platform: fixture.platform,
            status: "published",
            format: "short_video",
            topic: "数字一致性校验",
            publishedAt: "2026-06-03T08:00:00.000Z",
            notes: "dashboard number trust audit 043"
          }],
          metrics: [{
            id: `metric-${fixture.id}`,
            contentId: fixture.id,
            platform: fixture.platform,
            capturedAt: fixture.capturedAt,
            views: fixture.views,
            likes: fixture.likes,
            comments: fixture.comments,
            saves: fixture.saves,
            shares: fixture.shares,
            followersDelta: 0
          }]
        },
        {
          isTestFixture: false,
          operationKind: "platform_save",
          trustedScopeEligible: true
        }
      );
    }
  } finally {
    repo.close();
  }
}

async function startServer() {
  const port = await findPort();
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SELF_MEDIA_DB_PATH: DB_PATH,
      SELF_MEDIA_SEED_MODE: "off",
      NEXT_DIST_DIR
    },
    stdio: "ignore",
    windowsHide: true
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl);
  return {
    baseUrl,
    port,
    stop: () => {
      if (child.killed || !child.pid) return;
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  };
}

async function gotoDashboard(page, baseUrl) {
  const response = await page.goto(`${baseUrl}/dashboard/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert(response?.ok(), `Dashboard page did not load: status=${response?.status() ?? "no-response"}`);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.getByTestId("dashboard-trusted-status").waitFor({ timeout: 15000 });
  await page.getByTestId("dashboard-content-ranking").waitFor({ timeout: 15000 });
}

async function fetchDashboardSnapshot(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/self-media/dashboard");
    if (!response.ok) throw new Error(`Dashboard fetch failed: ${response.status}`);
    return response.json();
  });
}

function runTrustedAudit(baseUrl, options = {}) {
  mkdirSync(TRUSTED_AUDIT_DIR, { recursive: true });
  const env = options.live ? process.env : { ...process.env, SELF_MEDIA_DB_PATH: DB_PATH, SELF_MEDIA_SEED_MODE: "off" };
  const result = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "trusted-dashboard-audit.mjs"), `--dashboard-url=${baseUrl}/api/self-media/dashboard`, `--out-dir=${TRUSTED_AUDIT_DIR}`], {
    cwd: process.cwd(),
    env,
    encoding: "utf8"
  });
  const reportPath = path.join(TRUSTED_AUDIT_DIR, "report.json");
  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
  return { result, report, reportPath };
}

async function dataset(page, testId) {
  return page.getByTestId(testId).evaluate((element) => ({ ...element.dataset, text: element.textContent ?? "" }));
}

async function rowDatasets(page, testId) {
  return page.getByTestId(testId).evaluateAll((elements) => elements.map((element) => ({ ...element.dataset, text: element.textContent ?? "" })));
}

function compareTotals(checks, prefix, actual, expected) {
  pushCheck(checks, `${prefix}.trustedContentCount`, numberValue(actual.trustedContentCount), expected.trustedContentCount);
  pushCheck(checks, `${prefix}.trustedMetricSnapshotCount`, numberValue(actual.trustedMetricSnapshotCount), expected.trustedMetricSnapshotCount);
  pushCheck(checks, `${prefix}.views`, numberValue(actual.views), expected.views);
  pushCheck(checks, `${prefix}.engagement`, numberValue(actual.engagement), expected.engagement);
}

function comparePlatformRows(checks, prefix, rows, expectedPlatforms, metric) {
  const actualMap = Object.fromEntries(rows.map((row) => [row.platform, numberValue(row[metric])]));
  for (const [platform, expected] of Object.entries(expectedPlatforms)) {
    pushCheck(checks, `${prefix}.${platform}.${metric}`, actualMap[platform] ?? null, expected[metric]);
  }
}

function compareApiSnapshot(checks, snapshot, auditReport, expected, expectedPlatforms) {
  const trustedStatus = snapshot.trustedOperatingStatus ?? {};
  const weeklySummary = snapshot.trustedWeeklySummary ?? {};
  const realDataScope = snapshot.realDataScope ?? {};
  compareTotals(checks, "api.trustedStatus", trustedStatus, expected);
  compareTotals(checks, "api.weeklySummary", weeklySummary, expected);
  pushCheck(checks, "api.realDataScope.trustedContentCount", numberValue(realDataScope.trustedContentCount), expected.trustedContentCount);
  pushCheck(checks, "api.realDataScope.trustedMetricSnapshotCount", numberValue(realDataScope.trustedMetricSnapshotCount), expected.trustedMetricSnapshotCount);
  pushCheck(checks, "api.trustedAudit.status", trustedStatus.audit?.status ?? "missing", auditReport?.status ?? "missing");
  pushCheck(checks, "api.trustedAudit.mismatches", auditReport?.mismatches ?? ["missing"], []);
  const apiPlatformDistribution = platformMapFromDistribution(
    Object.fromEntries((snapshot.metricPlatformGroups ?? []).map((item) => [
      item.platform,
      {
        contentCount: item.contentCount,
        metricSnapshotCount: item.snapshotCount,
        views: item.views,
        engagement: numberValue(item.likes) + numberValue(item.comments) + numberValue(item.saves) + numberValue(item.shares)
      }
    ]))
  );
  for (const [platform, expectedPlatform] of Object.entries(expectedPlatforms)) {
    pushCheck(checks, `api.platformDistribution.${platform}.views`, apiPlatformDistribution[platform]?.views ?? null, expectedPlatform.views);
    pushCheck(checks, `api.platformDistribution.${platform}.engagement`, apiPlatformDistribution[platform]?.engagement ?? null, expectedPlatform.engagement);
  }
}

function renderMarkdown(report) {
  const lines = [
    `# ${TASK_ID}`,
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Dashboard URL: ${report.baseUrl}/dashboard/`,
    `- Screenshot: ${report.screenshotPath}`,
    `- Trusted audit report: ${report.trustedAuditReportPath}`,
    "",
    "## Trusted Totals",
    "",
    "| Metric | Expected |",
    "| --- | ---: |",
    `| Trusted content | ${report.expected.trustedContentCount} |`,
    `| Trusted snapshots | ${report.expected.trustedMetricSnapshotCount} |`,
    `| Views | ${report.expected.views} |`,
    `| Engagement | ${report.expected.engagement} |`,
    "",
    "## Checks",
    "",
    "| Check | Status | Expected | Actual |",
    "| --- | --- | ---: | ---: |"
  ];
  for (const check of report.checks) {
    lines.push(`| ${check.name} | ${check.passed ? "PASS" : "FAIL"} | ${JSON.stringify(check.expected)} | ${JSON.stringify(check.actual)} |`);
  }
  return `${lines.join("\n")}\n`;
}

async function runAudit(options) {
  ensureOutputDir();
  let server = null;
  let baseUrl = options.baseUrl;
  if (options.live) {
    await waitForReady(baseUrl);
  } else {
    await seedDatabase();
    server = await startServer();
    baseUrl = server.baseUrl;
  }
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const checks = [];
  let auditReport = null;
  let snapshot = null;

  try {
    const audit = runTrustedAudit(baseUrl, { live: options.live });
    auditReport = audit.report;
    pushCheck(checks, "trustedDashboardAudit.exitCode", audit.result.status, 0);
    pushCheck(checks, "trustedDashboardAudit.status", auditReport?.status ?? "missing", "pass");
    pushCheck(checks, "trustedDashboardAudit.mismatches", auditReport?.mismatches ?? ["missing"], []);

    await gotoDashboard(page, baseUrl);
    snapshot = await fetchDashboardSnapshot(page);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    const expected = {
      trustedContentCount: numberValue(auditReport?.expected?.contentCount),
      trustedMetricSnapshotCount: numberValue(auditReport?.expected?.metricSnapshotCount),
      views: numberValue(auditReport?.expected?.views),
      engagement: numberValue(auditReport?.expected?.engagement)
    };
    const expectedPlatforms = platformMapFromDistribution(auditReport?.expected?.platformDistribution);
    compareApiSnapshot(checks, snapshot, auditReport, expected, expectedPlatforms);
    const visibleText = await page.locator("body").innerText();
    pushCheck(checks, "defaultUi.dataStatusVisible", visibleText.includes("数据一致") || visibleText.includes("需复核"), true);
    for (const pattern of DASHBOARD_DEFAULT_FORBIDDEN_PATTERNS) {
      pushCheck(checks, `defaultUi.hiddenDiagnostics.${pattern.source}`, pattern.test(visibleText), false);
    }

    compareTotals(checks, "ui.trustedStatus", await dataset(page, "dashboard-trusted-status"), expected);
    compareTotals(checks, "ui.weeklySummary", await dataset(page, "dashboard-weekly-summary"), expected);
    pushCheck(checks, "ui.realDataScope.trustedContentCount", numberValue((await dataset(page, "dashboard-real-data-scope")).trustedContentCount), expected.trustedContentCount);
    pushCheck(checks, "ui.realDataScope.trustedMetricSnapshotCount", numberValue((await dataset(page, "dashboard-real-data-scope")).trustedMetricSnapshotCount), expected.trustedMetricSnapshotCount);
    pushCheck(checks, "ui.kpi.totalViews", numberValue((await dataset(page, "dashboard-kpi-total-views")).views), expected.views);
    pushCheck(checks, "ui.kpi.engagement", numberValue((await dataset(page, "dashboard-kpi-total-views")).engagement), expected.engagement);

    comparePlatformRows(checks, "ui.platformDistribution", await rowDatasets(page, "dashboard-platform-distribution-row"), expectedPlatforms, "views");
    comparePlatformRows(checks, "ui.platformEngagement", await rowDatasets(page, "dashboard-platform-engagement-row"), expectedPlatforms, "engagement");
    comparePlatformRows(checks, "ui.weeklyPlatformViews", await rowDatasets(page, "dashboard-weekly-platform-row"), expectedPlatforms, "views");
    comparePlatformRows(checks, "ui.weeklyPlatformEngagement", await rowDatasets(page, "dashboard-weekly-platform-row"), expectedPlatforms, "engagement");

    const expectedRanking = buildContentRanking(snapshot);
    const rankingRows = await rowDatasets(page, "dashboard-content-ranking-row");
    const expectedVisibleRanking = expectedRanking.slice(0, rankingRows.length);
    pushCheck(checks, "ui.contentRanking.visibleRowCount", rankingRows.length, Math.min(expectedRanking.length, 8));
    pushCheck(checks, "ui.contentRanking.visibleViews", rankingRows.reduce((sum, row) => sum + numberValue(row.views), 0), expectedVisibleRanking.reduce((sum, row) => sum + row.views, 0));
    pushCheck(checks, "ui.contentRanking.visibleEngagement", rankingRows.reduce((sum, row) => sum + numberValue(row.engagement), 0), expectedVisibleRanking.reduce((sum, row) => sum + row.engagement, 0));
    expectedVisibleRanking.forEach((expectedRow, index) => {
      const actual = rankingRows[index] ?? {};
      pushCheck(checks, `ui.contentRanking.${index}.contentId`, actual.contentId ?? null, expectedRow.contentId);
      pushCheck(checks, `ui.contentRanking.${index}.views`, numberValue(actual.views), expectedRow.views);
      pushCheck(checks, `ui.contentRanking.${index}.engagement`, numberValue(actual.engagement), expectedRow.engagement);
    });

    const report = {
      task: TASK_ID,
      generatedAt: new Date().toISOString(),
      mode: options.mode,
      liveReadOnly: options.live === true,
      status: checks.every((check) => check.passed) ? "pass" : "fail",
      baseUrl,
      dbPath: options.live ? null : DB_PATH,
      nextDistDir: options.live ? null : NEXT_DIST_DIR,
      scope: {
        readOnly: options.live === true,
        fixtureDatabaseCreated: options.live ? false : true,
        realDatabaseWrites: false,
        serverStarted: options.live ? false : true,
        databaseDeletion: false
      },
      screenshotPath: SCREENSHOT_PATH,
      trustedAuditReportPath: path.join(TRUSTED_AUDIT_DIR, "report.json"),
      expected,
      expectedPlatforms,
      expectedContentRanking: expectedRanking.map((row) => ({
        contentId: row.contentId,
        platform: row.platform,
        views: row.views,
        engagement: row.engagement
      })),
      expectedVisibleContentRanking: expectedVisibleRanking.map((row) => ({
        contentId: row.contentId,
        platform: row.platform,
        views: row.views,
        engagement: row.engagement
      })),
      checks,
      mismatches: checks.filter((check) => !check.passed).map((check) => check.name)
    };
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(REPORT_MD_PATH, renderMarkdown(report), "utf8");
    console.log(JSON.stringify({ ok: report.status === "pass", mode: report.mode, status: report.status, reportPath: REPORT_PATH, screenshotPath: SCREENSHOT_PATH, mismatches: report.mismatches }, null, 2));
    if (report.status !== "pass") process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    server?.stop();
  }
}

async function main() {
  await runAudit(parseArgs(process.argv.slice(2)));
}

main().catch((error) => {
  const report = {
    task: TASK_ID,
    generatedAt: new Date().toISOString(),
    status: "error",
    errorMessage: error instanceof Error ? error.message : String(error),
    screenshotPath: existsSync(SCREENSHOT_PATH) ? SCREENSHOT_PATH : null
  };
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(REPORT_MD_PATH, renderMarkdown({ ...report, expected: {}, checks: [] }), "utf8");
  console.error(report.errorMessage);
  process.exitCode = 1;
});
