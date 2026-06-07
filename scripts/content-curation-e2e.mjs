#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright-core";

const OUTPUT_DIR = path.join(process.cwd(), ".local", "content-curation-e2e");
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const DB_PATH = path.join(".local", "content-curation-e2e", `self-media-curation-${RUN_ID}.sqlite`);
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const CONTENT_PATH = "/content/";
const TARGET_CONTENT_ID = "bilibili-curation-e2e-target";
const KEEP_CONTENT_ID = "bilibili-curation-e2e-keep";
const TARGET_VIEWS = 720;
const TARGET_ENGAGEMENT = 72;

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
  if (!executable) throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH to run this E2E.");
  return executable;
}

async function findPort(start = 3240) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free content curation E2E port found.");
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/self-media/dashboard`);
      if (response.ok) return;
    } catch {
      // Keep polling until the dev server is ready.
    }
    await sleep(800);
  }
  throw new Error(`Content curation E2E target did not become ready: ${baseUrl}`);
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
  service.importPayload(
    {
      source: "bilibili_creator_center",
      contents: [
        {
          id: KEEP_CONTENT_ID,
          title: "B站旧内容样本 保留",
          platform: "bilibili",
          status: "published",
          format: "short_video",
          topic: "脱敏运营样本",
          publishedAt: "2026-05-01T08:00:00.000Z",
          notes: "content-curation-e2e:sanitized"
        },
        {
          id: TARGET_CONTENT_ID,
          title: "B站旧内容样本 可排除",
          platform: "bilibili",
          status: "published",
          format: "short_video",
          topic: "脱敏运营样本",
          publishedAt: "2026-05-02T08:00:00.000Z",
          notes: "content-curation-e2e:sanitized"
        }
      ],
      metrics: [
        {
          id: `metric-${KEEP_CONTENT_ID}`,
          contentId: KEEP_CONTENT_ID,
          platform: "bilibili",
          capturedAt: "2026-06-01T08:00:00.000Z",
          views: 1280,
          likes: 90,
          comments: 8,
          saves: 12,
          shares: 10,
          followersDelta: 2
        },
        {
          id: `metric-${TARGET_CONTENT_ID}`,
          contentId: TARGET_CONTENT_ID,
          platform: "bilibili",
          capturedAt: "2026-06-01T08:00:00.000Z",
          views: TARGET_VIEWS,
          likes: 50,
          comments: 6,
          saves: 8,
          shares: 8,
          followersDelta: 1
        }
      ],
      warnings: ["content-curation-e2e: sanitized Bilibili content-level archives only."]
    },
    {
      isTestFixture: false,
      operationKind: "platform_save",
      trustedScopeEligible: true
    }
  );
  repo.close();
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
      SELF_MEDIA_SEED_MODE: "off"
    },
    stdio: "ignore",
    windowsHide: true
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl);
  return {
    baseUrl,
    stop: () => {
      if (child.killed || !child.pid) return;
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  };
}

async function dashboard(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/self-media/dashboard");
    if (!response.ok) throw new Error(`Dashboard fetch failed: ${response.status}`);
    return response.json();
  });
}

async function gotoAppPage(page, baseUrl, pathname) {
  const url = `${baseUrl}${pathname}`;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      assert(response?.ok(), `Page did not load: ${url} status=${response?.status() ?? "no-response"}`);
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      return;
    } catch (error) {
      lastError = error;
      await sleep(800);
    }
  }
  throw lastError;
}

function trustedSummary(snapshot) {
  return {
    trustedContentCount: snapshot.realDataScope.trustedContentCount,
    trustedMetricSnapshotCount: snapshot.realDataScope.trustedMetricSnapshotCount,
    userExcludedContentCount: snapshot.realDataScope.userExcludedContentCount,
    userExcludedMetricSnapshotCount: snapshot.realDataScope.userExcludedMetricSnapshotCount,
    weeklyViews: snapshot.weeklyReview.metrics.totalViews,
    weeklyEngagement: snapshot.weeklyReview.metrics.totalEngagement,
    monthlyViews: snapshot.monthlyReview.metrics.totalViews,
    monthlyEngagement: snapshot.monthlyReview.metrics.totalEngagement,
    bilibiliSnapshots: snapshot.metricSnapshots.filter((item) => item.source === "bilibili_creator_center").length,
    storedTargetInTrustedDashboard: snapshot.contents.some((item) => item.id === TARGET_CONTENT_ID),
    storedTargetSnapshotInTrustedDashboard: snapshot.metricSnapshots.some((item) => item.contentId === TARGET_CONTENT_ID)
  };
}

function assertNumbersDropped(before, afterExclude) {
  assert(afterExclude.trustedContentCount === before.trustedContentCount - 1, "Dashboard trusted content count did not decrease by 1.");
  assert(afterExclude.trustedMetricSnapshotCount === before.trustedMetricSnapshotCount - 1, "Dashboard trusted snapshot count did not decrease by 1.");
  assert(afterExclude.userExcludedContentCount === before.userExcludedContentCount + 1, "User-excluded content count did not increase.");
  assert(afterExclude.userExcludedMetricSnapshotCount === before.userExcludedMetricSnapshotCount + 1, "User-excluded snapshot count did not increase.");
  assert(afterExclude.weeklyViews === before.weeklyViews - TARGET_VIEWS, "Weekly review views did not decrease by target views.");
  assert(afterExclude.monthlyViews === before.monthlyViews - TARGET_VIEWS, "Monthly review views did not decrease by target views.");
  assert(afterExclude.weeklyEngagement === before.weeklyEngagement - TARGET_ENGAGEMENT, "Weekly review engagement did not decrease by target engagement.");
  assert(afterExclude.monthlyEngagement === before.monthlyEngagement - TARGET_ENGAGEMENT, "Monthly review engagement did not decrease by target engagement.");
}

function assertNumbersRestored(before, afterRestore) {
  assert(afterRestore.trustedContentCount === before.trustedContentCount, "Dashboard trusted content count did not restore.");
  assert(afterRestore.trustedMetricSnapshotCount === before.trustedMetricSnapshotCount, "Dashboard trusted snapshot count did not restore.");
  assert(afterRestore.userExcludedContentCount === before.userExcludedContentCount, "User-excluded content count did not restore.");
  assert(afterRestore.userExcludedMetricSnapshotCount === before.userExcludedMetricSnapshotCount, "User-excluded snapshot count did not restore.");
  assert(afterRestore.weeklyViews === before.weeklyViews, "Weekly review views did not restore.");
  assert(afterRestore.monthlyViews === before.monthlyViews, "Monthly review views did not restore.");
  assert(afterRestore.weeklyEngagement === before.weeklyEngagement, "Weekly review engagement did not restore.");
  assert(afterRestore.monthlyEngagement === before.monthlyEngagement, "Monthly review engagement did not restore.");
}

function runAudit(baseUrl, phase) {
  const outDir = path.join(OUTPUT_DIR, `audit-${phase}`);
  const outDirArg = path.join(".local", "content-curation-e2e", `audit-${phase}`);
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `npm run audit:trusted-dashboard -- --dashboard-url=${baseUrl}/api/self-media/dashboard --out-dir=${outDirArg}`]
    : ["run", "audit:trusted-dashboard", "--", `--dashboard-url=${baseUrl}/api/self-media/dashboard`, `--out-dir=${outDirArg}`];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SELF_MEDIA_DB_PATH: DB_PATH,
      SELF_MEDIA_SEED_MODE: "off"
    },
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`Trusted dashboard audit failed for ${phase}: ${result.stdout}\n${result.stderr}`);
  }
  const reportPath = path.join(outDir, "report.json");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  assert(report.status === "pass", `Trusted dashboard audit did not pass for ${phase}.`);
  return {
    status: report.status,
    trustedContentCount: report.expected.contentCount,
    trustedMetricSnapshotCount: report.expected.metricSnapshotCount,
    userExcludedContentCount: report.expected.excluded.userExcludedContentCount,
    userExcludedMetricSnapshotCount: report.expected.excluded.userExcludedMetricSnapshotCount,
    views: report.expected.views,
    engagement: report.expected.engagement,
    bilibiliTrustedSnapshots: report.expected.bilibili.metricSnapshotCount,
    bilibiliExcludedSnapshots: report.expected.bilibili.excludedMetricSnapshotCount,
    reportJson: path.relative(process.cwd(), reportPath)
  };
}

async function clickCurationButton(page, name) {
  const row = page.locator("tr", { hasText: TARGET_CONTENT_ID }).first();
  await row.waitFor({ timeout: 15000 });
  await row.getByRole("button", { name }).click();
}

async function visibleReviewHasNumber(page, value) {
  const text = await page.locator("body").innerText();
  return text.includes(new Intl.NumberFormat("zh-CN").format(value)) || text.includes(String(value));
}

async function runE2E() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await seedDatabase();
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const consoleErrors = [];
  const httpFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.includes("/favicon.ico") && !url.includes(".webpack.hot-update.")) httpFailures.push(`${response.status()} ${url}`);
  });

  try {
    await gotoAppPage(page, server.baseUrl, CONTENT_PATH);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-content-before-exclude.png"), fullPage: true });
    const before = trustedSummary(await dashboard(page));
    const auditBefore = runAudit(server.baseUrl, "before");

    await clickCurationButton(page, "排除出运营看板");
    await page.waitForFunction(() => document.querySelector('[data-testid="content-operation-message"]')?.textContent?.includes("已排除"), null, { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-content-after-exclude.png"), fullPage: true });
    const afterExcludeSnapshot = await dashboard(page);
    const afterExclude = trustedSummary(afterExcludeSnapshot);
    assertNumbersDropped(before, afterExclude);
    assert(afterExcludeSnapshot.trustedScopeCuration.items.some((item) => item.contentId === TARGET_CONTENT_ID && item.userExcludedFromTrustedScope === true), "Excluded target did not remain visible in curation state.");

    await gotoAppPage(page, server.baseUrl, "/dashboard");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-dashboard-after-exclude.png"), fullPage: true });
    await gotoAppPage(page, server.baseUrl, "/reviews");
    assert(await visibleReviewHasNumber(page, afterExclude.weeklyViews), "Reviews page did not show decreased weekly views.");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-reviews-after-exclude.png"), fullPage: true });
    const auditAfterExclude = runAudit(server.baseUrl, "after-exclude");
    assert(auditAfterExclude.trustedContentCount === afterExclude.trustedContentCount, "Audit trusted content count did not match dashboard after exclusion.");
    assert(auditAfterExclude.userExcludedContentCount === 1, "Audit did not observe one user-excluded content after exclusion.");

    await gotoAppPage(page, server.baseUrl, CONTENT_PATH);
    await clickCurationButton(page, "恢复");
    await page.waitForFunction(() => document.querySelector('[data-testid="content-operation-message"]')?.textContent?.includes("已恢复"), null, { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-content-after-restore.png"), fullPage: true });
    const afterRestoreSnapshot = await dashboard(page);
    const afterRestore = trustedSummary(afterRestoreSnapshot);
    assertNumbersRestored(before, afterRestore);
    assert(afterRestoreSnapshot.trustedScopeCuration.items.some((item) => item.contentId === TARGET_CONTENT_ID && item.includedInTrustedScope === true), "Restored target did not re-enter trusted curation state.");

    await gotoAppPage(page, server.baseUrl, "/dashboard");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-dashboard-after-restore.png"), fullPage: true });
    await gotoAppPage(page, server.baseUrl, "/reviews");
    assert(await visibleReviewHasNumber(page, afterRestore.weeklyViews), "Reviews page did not show restored weekly views.");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-reviews-after-restore.png"), fullPage: true });
    const auditAfterRestore = runAudit(server.baseUrl, "after-restore");
    assert(auditAfterRestore.trustedContentCount === before.trustedContentCount, "Audit trusted content count did not restore.");
    assert(auditAfterRestore.userExcludedContentCount === 0, "Audit still observed user-excluded content after restore.");

    assert(consoleErrors.length === 0, `Console errors found: ${consoleErrors.join("; ")}`);
    assert(httpFailures.length === 0, `HTTP failures found: ${httpFailures.join("; ")}`);

    const report = {
      generatedAt: new Date().toISOString(),
      task: "CONTENT-CURATION-E2E-032",
      passed: true,
      baseUrl: server.baseUrl,
      dbPath: DB_PATH,
      route: "/content",
      target: {
        contentId: TARGET_CONTENT_ID,
        platform: "bilibili",
        source: "bilibili_creator_center",
        titleStoredInReport: false,
        rawPayloadStoredInReport: false
      },
      summaries: {
        before,
        afterExclude,
        afterRestore
      },
      audits: {
        before: auditBefore,
        afterExclude: auditAfterExclude,
        afterRestore: auditAfterRestore
      },
      safety: {
        isolatedDatabase: true,
        seedMode: "off",
        noDeleteOperation: true,
        targetDataStillStoredAfterExclude: afterExcludeSnapshot.trustedScopeCuration.items.some((item) => item.contentId === TARGET_CONTENT_ID),
        targetRemovedFromDefaultDashboardAfterExclude: afterExclude.storedTargetInTrustedDashboard === false,
        targetSnapshotRemovedFromDefaultDashboardAfterExclude: afterExclude.storedTargetSnapshotInTrustedDashboard === false,
        targetRestoredToDefaultDashboard: afterRestore.storedTargetInTrustedDashboard === true,
        targetSnapshotRestoredToDefaultDashboard: afterRestore.storedTargetSnapshotInTrustedDashboard === true
      },
      screenshots: [
        ".local/content-curation-e2e/screenshots/01-content-before-exclude.png",
        ".local/content-curation-e2e/screenshots/02-content-after-exclude.png",
        ".local/content-curation-e2e/screenshots/03-dashboard-after-exclude.png",
        ".local/content-curation-e2e/screenshots/04-reviews-after-exclude.png",
        ".local/content-curation-e2e/screenshots/05-content-after-restore.png",
        ".local/content-curation-e2e/screenshots/06-dashboard-after-restore.png",
        ".local/content-curation-e2e/screenshots/07-reviews-after-restore.png"
      ],
      consoleErrors,
      httpFailures
    };
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ passed: true, reportPath: path.relative(process.cwd(), REPORT_PATH), screenshots: report.screenshots.length }, null, 2));
  } catch (error) {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "failure.png"), fullPage: true }).catch(() => {});
    const report = {
      generatedAt: new Date().toISOString(),
      task: "CONTENT-CURATION-E2E-032",
      passed: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      dbPath: DB_PATH,
      consoleErrors,
      httpFailures
    };
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    throw error;
  } finally {
    await browser.close().catch(() => {});
    server.stop();
  }
}

runE2E().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
