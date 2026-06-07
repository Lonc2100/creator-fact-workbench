#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const OUTPUT_DIR = path.join(process.cwd(), ".local", "calendar-real-scheduling-workflow-044");
const SCREENSHOT_PATH = path.join(process.cwd(), ".local", "calendar-real-scheduling-workflow-044.png");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const DB_PATH = path.join(".local", "calendar-real-scheduling-workflow-044", `self-media-calendar-real-${RUN_ID}.sqlite`);
const CALENDAR_PATH = "/calendar/";
const ACTION_VERSION_ID = "version-calendar-real-action-draft-044-douyin";
const ACTION_QUEUE_ID = "queue-calendar-real-action-draft-044";
const USER_VERSION_ID = "version-calendar-real-user-draft-044-xhs";
const DIAGNOSTIC_VERSION_ID = "version-calendar-demo-debug-044-xhs";

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

async function findPort(start = 3360) {
  for (let port = start; port < start + 90; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free calendar real scheduling smoke port found.");
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const [apiResponse, pageResponse] = await Promise.all([
        fetch(`${baseUrl}/api/self-media/dashboard`),
        fetch(`${baseUrl}${CALENDAR_PATH}`)
      ]);
      if (apiResponse.ok && pageResponse.ok) return;
    } catch {
      // Keep polling until the isolated dev server is ready.
    }
    await sleep(800);
  }
  throw new Error(`Calendar real scheduling smoke target did not become ready: ${baseUrl}`);
}

export function resolveCalendarRealSchedulingSmokePlan(env = process.env) {
  return {
    mode: "isolated",
    smokeDbPath: env.CALENDAR_REAL_SCHEDULING_SMOKE_DB_PATH?.trim() || DB_PATH,
    seedMode: "off",
    portStart: Number(env.CALENDAR_REAL_SCHEDULING_SMOKE_PORT_START ?? 3360),
    screenshotPath: SCREENSHOT_PATH,
    reportPath: REPORT_PATH
  };
}

function checklist() {
  return { title: true, cover: false, script: false, platformFit: true, humanConfirmed: false };
}

function daysFromNow(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

async function seedDatabase(dbPath) {
  process.env.SELF_MEDIA_DB_PATH = dbPath;
  process.env.SELF_MEDIA_SEED_MODE = "off";
  const [{ SqliteSelfMediaRepo }] = await Promise.all([
    import("../src/domain/self-media/repo/sqlite-self-media-repo.ts")
  ]);
  const repo = new SqliteSelfMediaRepo(dbPath);
  const now = new Date().toISOString();
  try {
    repo.upsertEntity("contents", "calendar-real-user-draft-044", {
      id: "calendar-real-user-draft-044",
      title: "044 用户创建待排草稿",
      platform: "xiaohongshu",
      status: "draft",
      format: "image_text",
      topic: "044 真实待排队列",
      notes: "用户创建的本地草稿，等待排期。"
    });
    repo.upsertEntity("platformVersions", USER_VERSION_ID, {
      id: USER_VERSION_ID,
      contentId: "calendar-real-user-draft-044",
      platform: "xiaohongshu",
      title: "044 用户创建待排草稿",
      body: "本地用户草稿正文。",
      script: "",
      coverNote: "",
      status: "draft",
      nextAction: "确认封面和发布时间。",
      checklist: checklist(),
      updatedAt: now
    });
    repo.upsertEntity("queue", "queue-calendar-real-user-draft-044", {
      id: "queue-calendar-real-user-draft-044",
      contentId: "calendar-real-user-draft-044",
      platform: "xiaohongshu",
      status: "draft",
      scheduledAt: daysFromNow(1, 13),
      nextAction: "确认封面和发布时间。",
      updatedAt: now
    });

    repo.upsertEntity("contents", "calendar-real-action-draft-044", {
      id: "calendar-real-action-draft-044",
      title: "044 行动生成待排草稿",
      platform: "douyin",
      status: "draft",
      format: "short_video",
      topic: "044 行动生成草稿",
      notes: "actionItem:calendar-real-action-044"
    });
    repo.upsertEntity("platformVersions", ACTION_VERSION_ID, {
      id: ACTION_VERSION_ID,
      contentId: "calendar-real-action-draft-044",
      platform: "douyin",
      title: "044 行动生成待排草稿",
      body: "行动项生成的草稿正文。",
      script: "",
      coverNote: "",
      status: "needs_review",
      nextAction: "复核标题和发布时间后拖入日历。",
      checklist: checklist(),
      updatedAt: now
    });
    repo.upsertEntity("queue", ACTION_QUEUE_ID, {
      id: ACTION_QUEUE_ID,
      contentId: "calendar-real-action-draft-044",
      platform: "douyin",
      status: "needs_review",
      scheduledAt: daysFromNow(2, 17),
      nextAction: "复核标题和发布时间后拖入日历。",
      updatedAt: now
    });
    repo.upsertEntity("actionItems", "calendar-real-action-044", {
      id: "calendar-real-action-044",
      title: "044 行动生成待排草稿",
      status: "doing",
      priority: "high",
      relatedType: "content",
      relatedId: "calendar-real-action-draft-044",
      nextAction: "复核标题和发布时间后拖入日历。",
      contentDraftId: "calendar-real-action-draft-044",
      platformVersionId: ACTION_VERSION_ID,
      publishQueueItemId: ACTION_QUEUE_ID,
      contentWorkflowStatus: "draft_created",
      contentWorkflowUpdatedAt: now,
      updatedAt: now
    });

    repo.upsertEntity("contents", "calendar-demo-debug-044", {
      id: "calendar-demo-debug-044",
      title: "044 demo debug scheduled row",
      platform: "xiaohongshu",
      status: "scheduled",
      format: "image_text",
      topic: "diagnostic row",
      scheduledAt: daysFromNow(1, 9),
      notes: "debug row must stay out of default calendar."
    });
    repo.upsertEntity("platformVersions", DIAGNOSTIC_VERSION_ID, {
      id: DIAGNOSTIC_VERSION_ID,
      contentId: "calendar-demo-debug-044",
      platform: "xiaohongshu",
      title: "044 demo debug scheduled row",
      body: "diagnostic only",
      script: "",
      coverNote: "",
      scheduledAt: daysFromNow(1, 9),
      status: "scheduled",
      nextAction: "diagnostic row",
      checklist: checklist(),
      updatedAt: now
    });
    repo.upsertEntity("queue", "queue-calendar-demo-debug-044", {
      id: "queue-calendar-demo-debug-044",
      contentId: "calendar-demo-debug-044",
      platform: "xiaohongshu",
      status: "scheduled",
      scheduledAt: daysFromNow(1, 9),
      nextAction: "diagnostic row",
      updatedAt: now
    });
  } finally {
    repo.close();
  }
}

async function startServer(plan) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const port = await findPort(plan.portStart);
  const serverOutPath = path.join(OUTPUT_DIR, `server-${RUN_ID}.out.log`);
  const serverErrPath = path.join(OUTPUT_DIR, `server-${RUN_ID}.err.log`);
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SELF_MEDIA_DB_PATH: plan.smokeDbPath,
      SELF_MEDIA_SEED_MODE: plan.seedMode,
      NEXT_DIST_DIR: `.next-calendar-real-scheduling-044-${RUN_ID}`
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
    logs: { stdout: serverOutPath, stderr: serverErrPath },
    stop: () => {
      if (child.killed || !child.pid) return;
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  };
}

async function dashboard(page) {
  return page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
}

async function contentWorkbench(page) {
  return page.evaluate(async () => (await fetch("/api/self-media/content-workbench")).json());
}

async function serverJson(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`);
  if (!response.ok) throw new Error(`Server JSON fetch failed ${route}: ${response.status}`);
  return response.json();
}

async function runSmoke() {
  const plan = resolveCalendarRealSchedulingSmokePlan();
  mkdirSync(path.dirname(plan.smokeDbPath), { recursive: true });
  await seedDatabase(plan.smokeDbPath);
  const server = await startServer(plan);
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const consoleErrors = [];
  const httpFailures = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("/favicon.ico")) httpFailures.push(`${response.status()} ${response.url()}`);
  });

  try {
    const beforeDashboard = await serverJson(server.baseUrl, "/api/self-media/dashboard");
    const beforeWorkbench = await serverJson(server.baseUrl, "/api/self-media/content-workbench");
    const beforePublishRecordCount = beforeWorkbench.publishRecords.length;
    const beforeActionVersionScheduledAt = beforeWorkbench.platformVersions.find((item) => item.id === ACTION_VERSION_ID)?.scheduledAt ?? null;
    await page.goto(`${server.baseUrl}${CALENDAR_PATH}`, { waitUntil: "networkidle" });
    await page.locator('[data-testid="publish-calendar"]').waitFor({ timeout: 30000 });

    const scheduledCardCount = await page.locator("[data-calendar-card='true']").count();
    const pendingCount = await page.locator('[data-testid="calendar-pending-draft-card"]').count();
    const emptySlotCount = await page.locator(".calendar-empty-slot").count();
    const visibleText = await page.locator("body").innerText();
    assert(scheduledCardCount === 0, `Default calendar should start empty, found ${scheduledCardCount} scheduled cards.`);
    assert(pendingCount >= 2, `Expected real pending draft queue, found ${pendingCount} cards.`);
    assert(emptySlotCount === 0, `Default calendar rendered fake empty slots: ${emptySlotCount}.`);
    assert(visibleText.includes("044 用户创建待排草稿"), "User-created draft was not visible in pending schedule queue.");
    assert(visibleText.includes("044 行动生成待排草稿"), "Action-generated draft was not visible in pending schedule queue.");
    assert(!visibleText.includes("044 demo debug scheduled row"), "Diagnostic scheduled row leaked into default calendar.");
    assert(visibleText.includes("不用假排期占位"), "Empty calendar did not explain real queue without fake slots.");
    await page.screenshot({ path: plan.screenshotPath, fullPage: true });

    await page.locator(`[data-testid="calendar-pending-draft-card"][data-platform-version-id="${ACTION_VERSION_ID}"]`).getByTestId("calendar-open-schedule-editor").click();
    await page.locator('[role="dialog"][aria-label="平台版本详情"]').waitFor({ timeout: 10000 });
    await page.locator(".calendar-inspector-close").click();

    const source = page.locator(`[data-testid="calendar-pending-draft-card"][data-platform-version-id="${ACTION_VERSION_ID}"] .calendar-pending-drag-handle`);
    const target = page.locator("[data-calendar-hour='17']").first();
    await source.scrollIntoViewIfNeeded();
    await target.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    assert(sourceBox && targetBox, "Calendar pending drag source or target was not measurable.");
    const targetDate = await target.getAttribute("data-calendar-date");
    assert(targetDate, "Calendar drag target date was not discoverable.");
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + Math.min(targetBox.height / 2, 56), { steps: 18 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('[data-testid="calendar-operation-message"]')?.textContent?.includes("排期已保存"), null, { timeout: 20000 });

    const afterWorkbench = await contentWorkbench(page);
    const afterDashboard = await dashboard(page);
    const scheduledVersion = afterWorkbench.platformVersions.find((item) => item.id === ACTION_VERSION_ID);
    const scheduledQueue = afterWorkbench.queue.find((item) => item.id === ACTION_QUEUE_ID);
    assert(scheduledVersion?.status === "scheduled", `Dragged draft was not scheduled: ${scheduledVersion?.status}`);
    assert(Boolean(scheduledVersion?.scheduledAt), "Dragged draft did not receive a scheduledAt value.");
    assert(scheduledVersion.scheduledAt !== beforeActionVersionScheduledAt, `Dragged draft scheduledAt did not change: ${scheduledVersion.scheduledAt}`);
    assert(scheduledQueue?.status === "scheduled", `Queue was not synchronized to scheduled: ${scheduledQueue?.status}`);
    assert(afterWorkbench.publishRecords.length === beforePublishRecordCount, "Scheduling created a publish record.");
    assert(afterDashboard.trustedOperatingStatus.trustedContentCount === beforeDashboard.trustedOperatingStatus.trustedContentCount, "Scheduling changed trusted content totals.");
    assert(afterDashboard.trustedOperatingStatus.trustedMetricSnapshotCount === beforeDashboard.trustedOperatingStatus.trustedMetricSnapshotCount, "Scheduling changed trusted metric totals.");
    assert(await page.locator(`[data-calendar-card='true'][data-platform-version-id="${ACTION_VERSION_ID}"]`).count() === 1, "Scheduled draft did not enter the visible calendar after drag.");
    assert(consoleErrors.length === 0, `Console errors found: ${consoleErrors.join("; ")}`);
    assert(httpFailures.length === 0, `HTTP failures found: ${httpFailures.join("; ")}`);

    const report = {
      generatedAt: new Date().toISOString(),
      task: "CALENDAR-REAL-SCHEDULING-WORKFLOW-044",
      passed: true,
      baseUrl: server.baseUrl,
      database: {
        smokeDbPath: plan.smokeDbPath,
        seedMode: plan.seedMode,
        isolation: plan.mode
      },
      checks: {
        defaultScheduledCardsBefore: scheduledCardCount,
        pendingDraftCardsBefore: pendingCount,
        defaultFakeSlotsBefore: emptySlotCount,
        diagnosticRowHidden: !visibleText.includes("044 demo debug scheduled row"),
        oneClickOpenedScheduleEditor: true,
        draggedVersionId: ACTION_VERSION_ID,
        intendedTargetDate: targetDate,
        actualScheduledAt: scheduledVersion.scheduledAt,
        scheduledStatus: scheduledVersion.status,
        queueStatus: scheduledQueue.status,
        publishRecordsBefore: beforePublishRecordCount,
        publishRecordsAfter: afterWorkbench.publishRecords.length,
        trustedContentCountUnchanged: afterDashboard.trustedOperatingStatus.trustedContentCount === beforeDashboard.trustedOperatingStatus.trustedContentCount,
        trustedMetricSnapshotCountUnchanged: afterDashboard.trustedOperatingStatus.trustedMetricSnapshotCount === beforeDashboard.trustedOperatingStatus.trustedMetricSnapshotCount
      },
      outputs: {
        report: ".local/calendar-real-scheduling-workflow-044/report.json",
        screenshot: ".local/calendar-real-scheduling-workflow-044.png",
        serverLogs: {
          stdout: path.relative(process.cwd(), server.logs.stdout),
          stderr: path.relative(process.cwd(), server.logs.stderr)
        }
      }
    };
    writeFileSync(plan.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ok: true, reportPath: plan.reportPath, screenshotPath: plan.screenshotPath, dbPath: plan.smokeDbPath, baseUrl: server.baseUrl }, null, 2));
  } catch (error) {
    await page.screenshot({ path: plan.screenshotPath, fullPage: true }).catch(() => {});
    const report = {
      generatedAt: new Date().toISOString(),
      task: "CALENDAR-REAL-SCHEDULING-WORKFLOW-044",
      passed: false,
      errorMessage: error instanceof Error ? error.message : String(error),
      database: {
        smokeDbPath: plan.smokeDbPath,
        seedMode: plan.seedMode,
        isolation: plan.mode
      },
      consoleErrors,
      httpFailures,
      outputs: {
        report: ".local/calendar-real-scheduling-workflow-044/report.json",
        screenshot: ".local/calendar-real-scheduling-workflow-044.png"
      }
    };
    writeFileSync(plan.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    throw error;
  } finally {
    await browser.close().catch(() => {});
    server.stop();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runSmoke().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
}
