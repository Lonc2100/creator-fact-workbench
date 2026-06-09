#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const OUTPUT_DIR = path.join(process.cwd(), ".local", "platform-operations-e2e");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const SCREENSHOT_PATH = path.join(OUTPUT_DIR, "screenshot.png");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const IMPORT_PATH = "/import/";
const DEFAULT_REUSE_URL = "http://127.0.0.1:3200";
const SMOKE_DB_PATH = ".local/platform-operations-e2e/self-media-smoke.sqlite";
const PLATFORM_ORDER = ["douyin", "xiaohongshu", "video-account", "bilibili"];
const PLATFORM_LABELS = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  "video-account": "视频号",
  bilibili: "B站"
};
const EXPECTED_SOURCES = {
  douyin: "douyin_creator_center",
  xiaohongshu: "xiaohongshu_creator_center",
  "video-account": "video_account_creator_center",
  bilibili: "bilibili_creator_center"
};
const SENSITIVE_PATTERNS = [
  /\braw\s+payload\b/i,
  /\bcookie\b/i,
  /\btoken\b/i,
  /\bheaders?\b/i
];
const DEFAULT_IMPORT_COPY_PATTERNS = [
  /douyin_creator_center/i,
  /xiaohongshu_creator_center/i,
  /video_account_creator_center/i,
  /bilibili_creator_center/i,
  /smoke\/demo\/test fixture/i,
  /private message endpoints/i,
  /\bredacted\b/i,
  /\brunId\b/i,
  /\brun\s*id\b/i,
  /\brawDir\b/i,
  /provider source id/i,
  /\bobjectId\b/i
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/self-media/dashboard`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await isReady(baseUrl)) return;
    await sleep(800);
  }
  throw new Error(`Next dev server did not become ready: ${baseUrl}`);
}

async function findPort(start = 3227) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free platform operations E2E smoke port found.");
}

export function resolvePlatformOperationsE2ESmokePlan(env = process.env) {
  const explicitBaseUrl = env.SMOKE_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return {
      mode: "reuse",
      baseUrl: explicitBaseUrl,
      defaultReuseUrl: DEFAULT_REUSE_URL,
      smokeDbPath: null,
      seedMode: null
    };
  }
  const smokeDbPath = env.PLATFORM_OPERATIONS_E2E_SMOKE_DB_PATH?.trim() || SMOKE_DB_PATH;
  return {
    mode: "isolated",
    baseUrl: null,
    defaultReuseUrl: DEFAULT_REUSE_URL,
    smokeDbPath,
    seedMode: "off"
  };
}

async function startOrReuseServer() {
  const plan = resolvePlatformOperationsE2ESmokePlan();
  if (plan.mode === "reuse") {
    await waitForReady(plan.baseUrl);
    return { baseUrl: plan.baseUrl, reused: true, plan, stop: () => {} };
  }

  const port = await findPort();
  const command = process.execPath;
  const args = [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)];
  const serverOutPath = path.join(OUTPUT_DIR, `server-${RUN_ID}.out.log`);
  const serverErrPath = path.join(OUTPUT_DIR, `server-${RUN_ID}.err.log`);
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SELF_MEDIA_DB_PATH: plan.smokeDbPath,
      SELF_MEDIA_SEED_MODE: plan.seedMode,
      NEXT_DIST_DIR: `.next-platform-operations-e2e-${RUN_ID}`
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdout?.on("data", (chunk) => writeFileSync(serverOutPath, chunk, { flag: "a" }));
  child.stderr?.on("data", (chunk) => writeFileSync(serverErrPath, chunk, { flag: "a" }));
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl);
  return {
    baseUrl,
    reused: false,
    plan,
    logs: {
      stdout: serverOutPath,
      stderr: serverErrPath
    },
    stop: () => {
      if (child.killed || !child.pid) return;
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  };
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

async function dashboard(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/self-media/dashboard");
    if (!response.ok) throw new Error(`Dashboard fetch failed: ${response.status}`);
    return response.json();
  });
}

function operationRow(page, platform) {
  return page.locator(".platform-import-operation-row").filter({ hasText: PLATFORM_LABELS[platform] }).first();
}

async function waitForOperationsIdle(page) {
  await page.waitForFunction(() => {
    const runningLabels = Array.from(document.querySelectorAll(".platform-import-operation-label span")).map((item) => item.textContent ?? "");
    const resultText = document.querySelector(".platform-import-operation-result")?.textContent ?? "";
    return !runningLabels.some((text) => text.includes("处理中")) && !resultText.includes("运行中");
  }, null, { timeout: 60000 });
}

async function operationResultText(page) {
  return page.locator(".platform-import-operation-result").innerText().catch(() => "");
}

async function openPlatformOperationsHistory(page) {
  const secondarySection = page.locator('[data-testid="platform-sync-freshness-detail"]');
  await secondarySection.waitFor({ state: "attached", timeout: 30000 });
  const wasOpen = await secondarySection.evaluate((element) => element.open === true);
  if (!wasOpen) {
    await page.locator('[data-testid="platform-sync-freshness-detail"] > summary').click();
  }
  await page.locator('[data-testid="platform-operation-history-table"]').waitFor({ state: "visible", timeout: 30000 });
}

async function clickOperation(page, action, platform) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/self-media/platform-imports/operations") && response.request().method() === "POST",
    { timeout: 90000 }
  );
  if (action === "save_smoke") {
    await page.locator(".platform-import-operation-smoke").getByRole("button", { name: /运行(保存验证|烟测)/ }).click();
  } else {
    const row = operationRow(page, platform);
    const buttonName = action === "preview" ? "预览" : "保存";
    await row.getByRole("button", { name: buttonName }).click();
  }
  const response = await responsePromise;
  let body = null;
  let bodyReadError = null;
  try {
    body = await response.json();
  } catch (error) {
    bodyReadError = error instanceof Error ? error.message : String(error);
  }
  await waitForOperationsIdle(page);
  await sleep(250);
  const resultText = await operationResultText(page);
  const uiSummaryCount = action === "save_smoke" ? await page.locator(".platform-import-operation-summaries article").count().catch(() => 0) : null;
  return {
    action,
    platform: platform ?? "all",
    status: response.status(),
    ok: response.ok(),
    body,
    bodyReadError,
    resultText,
    uiPassed: resultText.includes("操作完成"),
    uiSummaryCount
  };
}

function sourceForPlatform(platform) {
  return EXPECTED_SOURCES[platform];
}

function summarizeOperation(result) {
  return {
    action: result.action,
    platform: result.platform,
    ok: result.ok,
    status: result.status,
    passed: result.body?.passed === true || (result.body === null && result.ok && result.uiPassed),
    bodyReadError: result.bodyReadError,
    uiSummaryCount: result.uiSummaryCount,
    summaries: (result.body?.summaries ?? []).map((summary) => ({
      platform: summary.platform,
      source: summary.source,
      passed: summary.passed === true,
      contentCount: summary.contentCount,
      metricCount: summary.metricCount,
      warningCount: summary.warnings?.length ?? 0,
      runId: summary.runId
    }))
  };
}

function recentHistoryForRunIds(history, runIds) {
  const runSet = new Set(runIds);
  return history.filter((item) => runSet.has(item.runId));
}

function recentHistorySince(beforeHistory, afterHistory) {
  const beforeIds = new Set(beforeHistory.map((item) => item.id));
  return afterHistory.filter((item) => !beforeIds.has(item.id));
}

function scanSensitiveText(label, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const matched = SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
  return { label, ok: !matched };
}

function scanDefaultImportCopy(label, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const matchedPatterns = DEFAULT_IMPORT_COPY_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  return { label, ok: matchedPatterns.length === 0, matchedPatterns };
}

function isIgnoredHttpFailure(url) {
  return url.includes("/favicon.ico") || url.includes(".webpack.hot-update.");
}

function collectRunIds(operations) {
  return operations.flatMap((operation) => (operation.body?.summaries ?? []).map((summary) => summary.runId).filter(Boolean));
}

function countActions(history) {
  return history.reduce((counts, item) => {
    counts[item.action] = (counts[item.action] ?? 0) + 1;
    return counts;
  }, {});
}

function assertSources(history, statuses) {
  for (const platform of PLATFORM_ORDER) {
    const source = sourceForPlatform(platform);
    assert(history.some((item) => item.platform === platform && item.source === source), `Missing operation history source for ${platform}: ${source}`);
    assert(statuses.some((item) => item.source === source && (item.latestSource === null || item.latestSource === source)), `Missing refreshed platform status source for ${platform}: ${source}`);
  }
}

async function runSmoke() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const server = await startOrReuseServer();
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const consoleErrors = [];
  const httpFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !isIgnoredHttpFailure(response.url())) httpFailures.push(`${response.status()} ${response.url()}`);
  });

  try {
    const importResponse = await page.goto(`${server.baseUrl}${IMPORT_PATH}`, { waitUntil: "networkidle" });
    assert(importResponse?.ok(), `Import page did not load: ${importResponse?.status() ?? "no-response"}`);
    const defaultVisibleText = await page.locator("body").innerText();
    const defaultCopyCheck = scanDefaultImportCopy("visible-import-default-copy", defaultVisibleText);
    assert(defaultCopyCheck.ok, `Engineering import warning copy appeared in the default UI: ${defaultCopyCheck.matchedPatterns.join(", ")}`);
    assert(await page.locator('[data-testid="platform-operation-history-table"]').isVisible().catch(() => false) === false, "Operation history table should stay folded on the default import first screen.");
    await openPlatformOperationsHistory(page);
    const before = await dashboard(page);
    const operations = [];

    for (const platform of PLATFORM_ORDER) {
      operations.push(await clickOperation(page, "preview", platform));
    }
    operations.push(await clickOperation(page, "save", "bilibili"));
    operations.push(await clickOperation(page, "save_smoke"));

    const after = await dashboard(page);
    const recentHistory = recentHistorySince(before.operationHistory, after.operationHistory);
    const actionCounts = countActions(recentHistory);
    const visibleText = await page.locator("body").innerText();
    const sensitiveChecks = [
      scanSensitiveText("visible-import-text", visibleText),
      scanSensitiveText("operation-history", recentHistory),
      scanSensitiveText("operation-results", operations.map(summarizeOperation))
    ];
    const statusSources = after.platformImportStatuses.map((item) => ({
      platform: item.platform,
      source: item.source,
      latestSource: item.latestSource,
      latestStatus: item.latestStatus,
      contentCount: item.contentCount,
      metricCount: item.metricCount,
      enteredDashboardReview: item.enteredDashboardReview
    }));

    assert(operations.every((item) => item.ok && item.uiPassed && item.body?.passed !== false), "One or more platform operations failed.");
    const smokeOperation = operations.find((item) => item.action === "save_smoke");
    const smokeSummaryCount = smokeOperation?.body?.summaries?.length ?? smokeOperation?.uiSummaryCount ?? 0;
    assert(smokeSummaryCount === 4, "Unified smoke did not return four platform summaries.");
    assert(recentHistory.length >= 9, `Expected at least 9 recent operation history rows, got ${recentHistory.length}.`);
    assert(actionCounts.preview >= 4, "Expected four preview operation history rows.");
    assert(actionCounts.save >= 1, "Expected Bilibili save operation history row.");
    assert(actionCounts.save_smoke >= 4, "Expected four unified smoke operation history rows.");
    assertSources(recentHistory, after.platformImportStatuses);
    assert(sensitiveChecks.every((item) => item.ok), "Sensitive text appeared in visible operation output or operation history.");
    assert(defaultCopyCheck.ok, `Engineering import warning copy appeared in the default UI: ${defaultCopyCheck.matchedPatterns.join(", ")}`);
    assert(consoleErrors.length === 0, `Console errors found: ${consoleErrors.join("; ")}`);
    assert(httpFailures.length === 0, `HTTP failures found: ${httpFailures.join("; ")}`);

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    const report = {
      generatedAt: new Date().toISOString(),
      task: "PLATFORM-OPERATIONS-E2E-SMOKE-027",
      passed: true,
      baseUrl: server.baseUrl,
      reusedServer: server.reused,
      serverMode: server.plan.mode,
      database: {
        smokeDbPath: server.plan.smokeDbPath,
        seedMode: server.plan.seedMode,
        defaultReuseUrl: server.plan.defaultReuseUrl,
        isolation: server.plan.mode === "isolated" ? "forced_smoke_db" : "explicit_smoke_base_url"
      },
      route: "/import",
      checks: {
        openedImport: true,
        previewPlatforms: PLATFORM_ORDER,
        bilibiliSave: true,
        unifiedSmokePlatformCount: smokeSummaryCount,
        operationHistoryRows: recentHistory.length,
        actionCounts,
        statusSources,
        expectedSources: EXPECTED_SOURCES,
        sensitiveTextClean: sensitiveChecks.every((item) => item.ok),
        defaultImportCopyClean: defaultCopyCheck.ok,
        consoleErrors: consoleErrors.length,
        httpFailures: httpFailures.length,
        beforeOperationHistoryCount: before.operationHistory.length,
        afterOperationHistoryCount: after.operationHistory.length
      },
      operations: operations.map(summarizeOperation),
      outputs: {
        report: ".local/platform-operations-e2e/report.json",
        screenshot: ".local/platform-operations-e2e/screenshot.png",
        serverLogs: server.logs
          ? {
              stdout: path.relative(process.cwd(), server.logs.stdout),
              stderr: path.relative(process.cwd(), server.logs.stderr)
            }
          : null
      },
      notes: [
        "The smoke uses existing local platform capture evidence through the /import UI operation controls.",
        "No browser collection entrypoint or WeChat Official Account flow is exercised."
      ]
    };
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: true, reportPath: REPORT_PATH, screenshotPath: SCREENSHOT_PATH, operationHistoryRows: recentHistory.length }, null, 2));
  } catch (error) {
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true }).catch(() => {});
    const report = {
      generatedAt: new Date().toISOString(),
      task: "PLATFORM-OPERATIONS-E2E-SMOKE-027",
      passed: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      baseUrl: server.baseUrl,
      reusedServer: server.reused,
      serverMode: server.plan.mode,
      database: {
        smokeDbPath: server.plan.smokeDbPath,
        seedMode: server.plan.seedMode,
        defaultReuseUrl: server.plan.defaultReuseUrl,
        isolation: server.plan.mode === "isolated" ? "forced_smoke_db" : "explicit_smoke_base_url"
      },
      outputs: {
        report: ".local/platform-operations-e2e/report.json",
        screenshot: ".local/platform-operations-e2e/screenshot.png",
        serverLogs: server.logs
          ? {
              stdout: path.relative(process.cwd(), server.logs.stdout),
              stderr: path.relative(process.cwd(), server.logs.stderr)
            }
          : null
      },
      consoleErrors,
      httpFailures
    };
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await browser.close().catch(() => {});
    server.stop();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSmoke().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
