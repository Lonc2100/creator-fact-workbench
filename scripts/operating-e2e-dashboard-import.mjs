#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright-core";

const OUTPUT_DIR = path.join(process.cwd(), ".local", "operating-e2e-dashboard-import-036");
const SCREENSHOT_PATH = path.join(process.cwd(), ".local", "operating-e2e-dashboard-import-036.png");
const DASHBOARD_DATA_ONLY_SCREENSHOT_PATH = path.join(process.cwd(), ".local", "DASHBOARD-DATA-ONLY-042-dashboard.png");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const DB_PATH = path.join(".local", "operating-e2e-dashboard-import-036", `self-media-operating-${RUN_ID}.sqlite`);
const NEXT_DIST_DIR = `.next-operating-e2e-dashboard-import-${RUN_ID}`;
const HEALTH_REPORT_PATH = path.join(process.cwd(), ".local", "platform-data-health", "report.json");
const DASHBOARD_PATH = "/dashboard/";
const IMPORT_PATH = "/import/";

const SENSITIVE_PATTERNS = [
  /\braw\s+payload\b/i,
  /\bcookie\b/i,
  /\btoken\b/i,
  /\bheaders?\b/i,
  /评论正文/i,
  /弹幕/i
];

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
  /\bport\b/i,
  /ops gate/i,
  /daily platform ops/i,
  /health probe/i,
  /\bdemo\b/i,
  /\bfake\b/i
];

const PLATFORM_FIXTURES = [
  {
    source: "douyin_creator_center",
    platform: "douyin",
    id: "operating-e2e-douyin-high",
    title: "运营联调样本 A",
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
    id: "operating-e2e-xhs-low",
    title: "运营联调样本 B",
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
    id: "operating-e2e-video-account",
    title: "运营联调样本 C",
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
    id: "operating-e2e-bilibili-archives",
    title: "运营联调样本 D",
    capturedAt: "2026-06-04T08:15:00.000Z",
    views: 810,
    likes: 50,
    comments: 8,
    saves: 12,
    shares: 7
  }
];

const EXPECTED_COMMANDS = [
  "npm run import:douyin",
  "npm run import:xiaohongshu",
  "npm run import:video-account",
  "npm run import:bilibili",
  "npm run audit:trusted-dashboard",
  "npm run gate:daily-platform-ops"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (!executable) throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH to run this smoke.");
  return executable;
}

async function findPort(start = 3260) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free operating E2E port found.");
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
  throw new Error(`Operating E2E target did not become ready: ${baseUrl}`);
}

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
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
          topic: "脱敏运营联调",
          publishedAt: "2026-06-03T08:00:00.000Z",
          notes: "operating-e2e-dashboard-import-036 sanitized fixture"
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
        }],
        warnings: ["operating-e2e-dashboard-import-036 sanitized fixture only"]
      },
      {
        isTestFixture: false,
        operationKind: "platform_save",
        trustedScopeEligible: true
      }
    );
  }
  repo.close();
}

function hasUsableHealthReport() {
  if (!existsSync(HEALTH_REPORT_PATH)) return false;
  try {
    const report = JSON.parse(readFileSync(HEALTH_REPORT_PATH, "utf8"));
    return Array.isArray(report.platforms) && report.platforms.length >= 4;
  } catch {
    return false;
  }
}

function ensureSafeHealthReport() {
  if (hasUsableHealthReport()) return { reusedExisting: true, path: HEALTH_REPORT_PATH };

  const now = new Date().toISOString();
  const platformCommands = {
    douyin: {
      manualStep: "人工登录抖音创作者中心，完成真实采集；本检查不会自动打开平台。",
      preview: "npm run import:douyin",
      save: "npm run import:douyin -- --save"
    },
    xiaohongshu: {
      manualStep: "人工登录小红书创作服务平台，完成真实采集；本检查不会自动打开平台。",
      preview: "npm run import:xiaohongshu",
      save: "npm run import:xiaohongshu -- --save"
    },
    "video-account": {
      manualStep: "人工登录视频号助手，完成真实采集；本检查不会自动打开平台。",
      preview: "npm run import:video-account",
      save: "npm run import:video-account -- --save"
    },
    bilibili: {
      manualStep: "人工登录 B站创作中心，完成 archives 内容级真实采集；账号级指标仍只预览不保存。",
      preview: "npm run import:bilibili",
      save: "npm run import:bilibili -- --save"
    }
  };
  const platforms = Object.entries(platformCommands).map(([platform, commands]) => ({
    platform,
    label: platform,
    latestGeneratedAt: now,
    freshness: {
      latestRealCaptureAt: null,
      realCaptureAgeHours: null,
      realCaptureIsStale: null,
      latestSmokeAt: now,
      smokeAgeHours: 0,
      smokeIsStale: false,
      latestAuditAt: null,
      staleAfterHours: 72
    },
    raw: {
      path: `.local/${platform}/raw`,
      exists: false,
      captureCount: 0,
      latestModifiedAt: null,
      latestRealCaptureAt: null,
      ageHours: null,
      isStale: null,
      status: "warn"
    },
    mappingPreview: {
      exists: true,
      parsed: true,
      generatedAt: now,
      isStale: false,
      saved: false,
      previewOnly: true,
      sourceMatches: true,
      contentCount: 0,
      metricCount: 0,
      status: "ok",
      error: null
    },
    saveSmokeReport: {
      exists: true,
      parsed: true,
      generatedAt: now,
      isStale: false,
      passed: true,
      sourceMatches: true,
      contentCount: 0,
      metricCount: 0,
      status: "ok",
      error: null
    },
    realCaptureStatus: "missing",
    nextAction: `${commands.manualStep} 然后运行 preview/save/health/freshness/audit/gate。`,
    commands: {
      ...commands,
      health: "npm run health:platform-data",
      freshness: "npm run check:real-capture-freshness",
      audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
      gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
    },
    status: "warn",
    warnings: []
  }));
  const report = {
    generatedAt: now,
    task: "OPERATING-E2E-DASHBOARD-IMPORT-036",
    staleAfterHours: 72,
    platforms,
    summary: {
      status: "warn",
      platformCount: platforms.length,
      okCount: 0,
      warnCount: platforms.length,
      errorCount: 0,
      missingCount: platforms.length,
      staleCount: 0,
      realCaptureStaleCount: 0,
      sourceMismatchCount: 0,
      bilibiliPreviewOnlyOk: true,
      freshness: {
        latestRealCaptureAt: null,
        latestSmokeAt: now,
        latestAuditAt: null,
        realCaptureAgeHours: null,
        smokeAgeHours: 0,
        realCaptureIsStale: null,
        smokeIsStale: false,
        staleAfterHours: 72
      }
    }
  };
  mkdirSync(path.dirname(HEALTH_REPORT_PATH), { recursive: true });
  writeFileSync(HEALTH_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return { reusedExisting: false, path: HEALTH_REPORT_PATH };
}

async function startServer() {
  const port = await findPort();
  const command = process.execPath;
  const args = [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(command, args, {
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

async function gotoAppPage(page, baseUrl, pathname) {
  const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert(response?.ok(), `Page did not load: ${pathname} status=${response?.status() ?? "no-response"}`);
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
}

async function dashboard(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/self-media/dashboard");
    if (!response.ok) throw new Error(`Dashboard fetch failed: ${response.status}`);
    return response.json();
  });
}

async function waitForDashboard(page, predicate, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastSnapshot = null;
  while (Date.now() < deadline) {
    lastSnapshot = await dashboard(page);
    if (predicate(lastSnapshot)) return lastSnapshot;
    await sleep(500);
  }
  throw new Error(`${message}. Last dashboard state: ${JSON.stringify({
    suggestions: lastSnapshot?.postImportActionSuggestions?.length ?? null,
    convertedSuggestions: lastSnapshot?.postImportActionSuggestions?.filter((item) => item.convertedToActionItem).length ?? null,
    actionItems: lastSnapshot?.actionItems?.length ?? null
  })}`);
}

async function assertNoSensitiveText(page, label) {
  const text = await page.locator("body").innerText();
  for (const pattern of SENSITIVE_PATTERNS) {
    assert(!pattern.test(text), `${label} exposes forbidden sensitive text: ${pattern}`);
  }
}

async function assertDashboardDefaultDataOnly(page, label) {
  const text = await page.locator("body").innerText();
  for (const phrase of ["数据服务", "数据新鲜度", "运营闭环", "数据一致性", "周报摘要", "业务行动项"]) {
    assert(text.includes(phrase), `${label} is missing dashboard business text: ${phrase}`);
  }
  for (const pattern of DASHBOARD_DEFAULT_FORBIDDEN_PATTERNS) {
    assert(!pattern.test(text), `${label} exposes default dashboard diagnostics text: ${pattern}`);
  }
  const advancedDiagnostics = page.getByTestId("dashboard-advanced-diagnostics");
  await advancedDiagnostics.waitFor({ timeout: 15000 });
  const isClosed = await advancedDiagnostics.evaluate((element) => element instanceof HTMLDetailsElement && !element.open);
  assert(isClosed, `${label} advanced diagnostics should be collapsed by default.`);
}

async function countOperationHistory(page) {
  const snapshot = await dashboard(page);
  return snapshot.operationHistory?.length ?? 0;
}

async function main() {
  ensureOutputDir();
  await seedDatabase();
  const healthReport = ensureSafeHealthReport();
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const report = {
    task: "OPERATING-E2E-DASHBOARD-IMPORT-036",
    dbPath: DB_PATH,
    baseUrl: server.baseUrl,
    isolatedDb: true,
    nextDistDir: NEXT_DIST_DIR,
    healthReport,
    dashboard: {},
    import: {}
  };

  try {
    await gotoAppPage(page, server.baseUrl, DASHBOARD_PATH);
    await page.getByText("周报摘要").waitFor({ timeout: 15000 });
    await page.getByText("导入后行动建议").waitFor({ timeout: 15000 });
    await page.getByRole("heading", { name: "业务行动项" }).waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "dashboard");
    await assertDashboardDefaultDataOnly(page, "dashboard-default");
    await page.screenshot({ path: DASHBOARD_DATA_ONLY_SCREENSHOT_PATH, fullPage: true });

    let snapshot = await dashboard(page);
    assert(snapshot.postImportActionSuggestions.length > 0, "Dashboard has no post-import action suggestions.");
    const beforeActionCount = snapshot.actionItems.length;

    const convertButton = page.getByRole("button", { name: "转为任务" }).first();
    if (await convertButton.count()) {
      await convertButton.click();
      await waitForDashboard(
        page,
        (item) => item.postImportActionSuggestions.some((suggestion) => suggestion.convertedToActionItem) && item.actionItems.length > beforeActionCount,
        "Suggestion conversion did not persist through the dashboard API"
      );
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await waitForDashboard(
      page,
      (item) => item.postImportActionSuggestions.some((suggestion) => suggestion.convertedToActionItem) && item.actionItems.length > beforeActionCount,
      "Converted suggestion was not visible through the dashboard API after reload"
    );
    const actionCard = page.locator(".action-task-card").first();
    await actionCard.waitFor({ timeout: 15000 });

    await actionCard.getByRole("button", { name: "进行中" }).click();
    await actionCard.getByText("进行中").first().waitFor({ timeout: 15000 });
    await actionCard.getByRole("button", { name: "已完成" }).click();
    await page.getByRole("button", { name: "全部", exact: true }).click();
    await page.locator(".action-task-card").filter({ hasText: "已完成" }).first().waitFor({ timeout: 15000 });

    snapshot = await dashboard(page);
    report.dashboard = {
      suggestions: snapshot.postImportActionSuggestions.length,
      convertedSuggestions: snapshot.postImportActionSuggestions.filter((item) => item.convertedToActionItem).length,
      actionItemsBefore: beforeActionCount,
      actionItemsAfter: snapshot.actionItems.length,
      doneActionItems: snapshot.actionItems.filter((item) => item.status === "done").length,
      dataOnlyDefault: true,
      dataOnlyScreenshotPath: DASHBOARD_DATA_ONLY_SCREENSHOT_PATH
    };
    assert(report.dashboard.convertedSuggestions > 0, "No dashboard suggestion is marked converted after refresh.");
    assert(report.dashboard.actionItemsAfter > beforeActionCount, "Business action item was not created from a suggestion.");
    assert(report.dashboard.doneActionItems > 0, "Action item status did not persist as done.");
    await assertNoSensitiveText(page, "dashboard-after-action");
    await assertDashboardDefaultDataOnly(page, "dashboard-after-action");

    const historyBeforeImport = await countOperationHistory(page);
    await gotoAppPage(page, server.baseUrl, IMPORT_PATH);
    const commandCards = page.getByTestId("real-capture-assisted-actions");
    await commandCards.waitFor({ timeout: 15000 });
    await commandCards.evaluate((element) => {
      if (element instanceof HTMLDetailsElement) element.open = true;
    });
    const cardsText = await commandCards.evaluate((element) => element.textContent ?? "");
    for (const command of EXPECTED_COMMANDS) {
      assert(cardsText.includes(command), `Import assisted command cards are missing command: ${command}`);
    }
    await sleep(1000);
    const historyAfterImport = await countOperationHistory(page);
    assert(historyAfterImport === historyBeforeImport, "Opening /import changed platform operation history; assisted command cards should be read-only.");
    await assertNoSensitiveText(page, "import");
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    report.import = {
      commandCardsVisible: true,
      expectedCommands: EXPECTED_COMMANDS,
      operationHistoryBefore: historyBeforeImport,
      operationHistoryAfter: historyAfterImport,
      screenshotPath: SCREENSHOT_PATH
    };
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, reportPath: REPORT_PATH, screenshotPath: SCREENSHOT_PATH, dashboardScreenshotPath: DASHBOARD_DATA_ONLY_SCREENSHOT_PATH, dbPath: DB_PATH, baseUrl: server.baseUrl }, null, 2));
  } finally {
    await browser.close().catch(() => {});
    server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
