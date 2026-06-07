#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const OUTPUT_DIR = path.join(process.cwd(), ".local", "operating-e2e-action-to-content-038");
const SCREENSHOT_PATH = path.join(process.cwd(), ".local", "operating-e2e-action-to-content-038.png");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const DB_PATH = path.join(".local", "operating-e2e-action-to-content-038", `self-media-action-content-${RUN_ID}.sqlite`);
const DASHBOARD_PATH = "/dashboard/";
const CONTENT_PATH = "/content/";
const CALENDAR_PATH = "/calendar/";

const SENSITIVE_PATTERNS = [
  /\braw\s+payload\b/i,
  /\bcookie\b/i,
  /\btoken\b/i,
  /\bheaders?\b/i,
  /\bcomment\s+body\b/i,
  /\bdanmu\b/i,
  /评论正文/i,
  /弹幕/i
];

const PLATFORM_FIXTURES = [
  {
    source: "douyin_creator_center",
    platform: "douyin",
    id: "action-content-e2e-douyin-high",
    title: "行动转内容样本 A",
    capturedAt: "2026-06-04T08:00:00.000Z",
    views: 3600,
    likes: 320,
    comments: 34,
    saves: 46,
    shares: 30
  },
  {
    source: "xiaohongshu_creator_center",
    platform: "xiaohongshu",
    id: "action-content-e2e-xhs-low",
    title: "行动转内容样本 B",
    capturedAt: "2026-06-04T08:05:00.000Z",
    views: 940,
    likes: 3,
    comments: 0,
    saves: 0,
    shares: 0
  },
  {
    source: "video_account_creator_center",
    platform: "video_account",
    id: "action-content-e2e-video-account",
    title: "行动转内容样本 C",
    capturedAt: "2026-06-04T08:10:00.000Z",
    views: 760,
    likes: 48,
    comments: 6,
    saves: 7,
    shares: 5
  },
  {
    source: "bilibili_creator_center",
    platform: "bilibili",
    id: "action-content-e2e-bilibili-archives",
    title: "行动转内容样本 D",
    capturedAt: "2026-06-04T08:15:00.000Z",
    views: 820,
    likes: 52,
    comments: 8,
    saves: 12,
    shares: 7
  }
];

const UNTRUSTED_ACTION_ID = "action-content-e2e-untrusted-manual";
const EXCLUDED_ACTION_ID = "action-content-e2e-user-excluded";

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

async function findPort(start = 3280) {
  for (let port = start; port < start + 80; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free action-to-content E2E port found.");
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/self-media/dashboard`);
      if (response.ok) return;
    } catch {
      // Keep polling until the isolated dev server is ready.
    }
    await sleep(800);
  }
  throw new Error(`Action-to-content E2E target did not become ready: ${baseUrl}`);
}

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

export function resolveOperatingActionToContentE2EPlan(env = process.env) {
  return {
    mode: "isolated",
    smokeDbPath: env.OPERATING_ACTION_TO_CONTENT_E2E_DB_PATH?.trim() || DB_PATH,
    seedMode: "off",
    portStart: Number(env.OPERATING_ACTION_TO_CONTENT_E2E_PORT_START ?? 3280),
    screenshotPath: SCREENSHOT_PATH,
    reportPath: REPORT_PATH
  };
}

async function seedDatabase(dbPath) {
  process.env.SELF_MEDIA_DB_PATH = dbPath;
  process.env.SELF_MEDIA_SEED_MODE = "off";
  const [{ SqliteSelfMediaRepo }, { SelfMediaService }] = await Promise.all([
    import("../src/domain/self-media/repo/sqlite-self-media-repo.ts"),
    import("../src/domain/self-media/service/self-media-service.ts")
  ]);
  const repo = new SqliteSelfMediaRepo(dbPath);
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
            topic: "脱敏行动转内容联调",
            publishedAt: "2026-06-03T08:00:00.000Z",
            notes: "operating-e2e-action-to-content-038 sanitized fixture"
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
          warnings: ["operating-e2e-action-to-content-038 sanitized fixture only"]
        },
        { isTestFixture: false, operationKind: "platform_save", trustedScopeEligible: true }
      );
    }

    service.importPayload({
      source: "manual",
      contents: [{ id: "action-content-e2e-manual-source", title: "阻断样本 手动来源", platform: "douyin", status: "published", format: "short_video", topic: "阻断", publishedAt: "2026-06-03T09:00:00.000Z" }],
      metrics: [{ id: "metric-action-content-e2e-manual-source", contentId: "action-content-e2e-manual-source", platform: "douyin", capturedAt: "2026-06-03T10:00:00.000Z", views: 999, likes: 9, comments: 1, saves: 1, shares: 1, followersDelta: 0 }]
    });
    const manualSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "action-content-e2e-manual-source");
    assert(manualSnapshot, "Manual blocking snapshot was not seeded.");
    repo.upsertEntity("actionItems", UNTRUSTED_ACTION_ID, {
      id: UNTRUSTED_ACTION_ID,
      title: "阻断样本 手动证据",
      status: "todo",
      priority: "low",
      evidence: [{ platform: "douyin", contentId: "action-content-e2e-manual-source", metricSnapshotId: manualSnapshot.id, source: "manual" }],
      nextAction: "这条不可信证据不能转内容。",
      updatedAt: "2026-06-04T10:00:00.000Z"
    });

    service.importPayload({
      source: "xiaohongshu_creator_center",
      contents: [{ id: "action-content-e2e-excluded-source", title: "阻断样本 用户排除", platform: "xiaohongshu", status: "published", format: "image_text", topic: "阻断", publishedAt: "2026-06-03T11:00:00.000Z" }],
      metrics: [{ id: "metric-action-content-e2e-excluded-source", contentId: "action-content-e2e-excluded-source", platform: "xiaohongshu", capturedAt: "2026-06-03T12:00:00.000Z", views: 1200, likes: 90, comments: 8, saves: 20, shares: 6, followersDelta: 0 }]
    });
    const excludedSnapshot = repo.listMetricSnapshots().find((item) => item.contentId === "action-content-e2e-excluded-source");
    assert(excludedSnapshot, "Excluded blocking snapshot was not seeded.");
    repo.upsertEntity("actionItems", EXCLUDED_ACTION_ID, {
      id: EXCLUDED_ACTION_ID,
      title: "阻断样本 排除证据",
      status: "todo",
      priority: "low",
      evidence: [{ platform: "xiaohongshu", contentId: "action-content-e2e-excluded-source", metricSnapshotId: excludedSnapshot.id, source: "xiaohongshu_creator_center" }],
      nextAction: "这条用户排除证据不能转内容。",
      updatedAt: "2026-06-04T10:05:00.000Z"
    });
    service.updateContentTrustedScope({ contentId: "action-content-e2e-excluded-source", userExcludedFromTrustedScope: true, actor: "operating-e2e-action-to-content-038" });
  } finally {
    repo.close();
  }
}

async function startServer(plan) {
  const port = await findPort(plan.portStart);
  const command = process.execPath;
  const args = [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SELF_MEDIA_DB_PATH: plan.smokeDbPath,
      SELF_MEDIA_SEED_MODE: plan.seedMode
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
    actionItems: lastSnapshot?.actionItems?.length ?? null,
    contents: lastSnapshot?.contents?.length ?? null,
    queue: lastSnapshot?.queue?.length ?? null,
    platformVersions: lastSnapshot?.platformVersions?.length ?? null
  })}`);
}

async function assertNoSensitiveText(page, label) {
  const text = await page.locator("body").innerText();
  for (const pattern of SENSITIVE_PATTERNS) {
    assert(!pattern.test(text), `${label} exposes forbidden sensitive text: ${pattern}`);
  }
}

function trustedTotals(snapshot) {
  return {
    trustedContentCount: snapshot.realDataScope.trustedContentCount,
    trustedMetricSnapshotCount: snapshot.realDataScope.trustedMetricSnapshotCount,
    trustedViews: snapshot.trustedOperatingStatus.views,
    trustedEngagement: snapshot.trustedOperatingStatus.engagement,
    weeklyViews: snapshot.weeklyReview.metrics.totalViews,
    weeklyEngagement: snapshot.weeklyReview.metrics.totalEngagement,
    monthlyViews: snapshot.monthlyReview.metrics.totalViews,
    monthlyEngagement: snapshot.monthlyReview.metrics.totalEngagement
  };
}

function assertTotalsUnchanged(before, after) {
  assert(JSON.stringify(after) === JSON.stringify(before), `Trusted dashboard/review totals changed. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
}

async function postActionToContent(page, actionItemId) {
  return page.evaluate(async (id) => {
    const response = await fetch("/api/self-media/action-items/content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id })
    });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  }, actionItemId);
}

async function main() {
  ensureOutputDir();
  const plan = resolveOperatingActionToContentE2EPlan();
  await seedDatabase(plan.smokeDbPath);
  const server = await startServer(plan);
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const report = {
    task: "OPERATING-E2E-ACTION-TO-CONTENT-038",
    baseUrl: server.baseUrl,
    isolatedDb: true,
    dbPath: plan.smokeDbPath,
    dashboard: {},
    content: {},
    blocked: {}
  };

  try {
    await gotoAppPage(page, server.baseUrl, DASHBOARD_PATH);
    await page.getByText("导入后行动建议").waitFor({ timeout: 15000 });
    await page.getByText("内部行动项").waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "dashboard-initial");

    const before = await dashboard(page);
    const beforeTotals = trustedTotals(before);
    const beforeGeneratedContentCount = before.contents.filter((item) => item.id.startsWith("content-from-action-")).length;
    const beforeGeneratedVersionCount = before.platformVersions.filter((item) => item.id.includes("content-from-action-")).length;
    const beforeGeneratedQueueCount = before.queue.filter((item) => item.id.includes("content-from-action-")).length;
    const beforeActionCount = before.actionItems.length;
    assert(before.postImportActionSuggestions.some((item) => !item.convertedToActionItem), "No convertible post-import suggestion was available.");

    await page.getByRole("button", { name: "转为任务" }).first().click();
    const afterSuggestion = await waitForDashboard(
      page,
      (snapshot) => snapshot.actionItems.length > beforeActionCount && snapshot.postImportActionSuggestions.some((item) => item.convertedToActionItem),
      "Post-import suggestion did not convert to an action item"
    );
    const createdAction = afterSuggestion.actionItems.find((item) => item.sourceSuggestionId && !item.contentDraftId);
    assert(createdAction, "Converted action item was not found.");

    const actionCard = page.locator(`[data-action-item-id="${createdAction.id}"]`);
    await actionCard.waitFor({ timeout: 15000 });
    await actionCard.getByRole("button", { name: "生成排期草稿" }).click();
    const afterContent = await waitForDashboard(
      page,
      (snapshot) => {
        const item = snapshot.actionItems.find((candidate) => candidate.id === createdAction.id);
        return Boolean(item?.contentDraftId && item.platformVersionId && item.publishQueueItemId && item.contentWorkflowStatus);
      },
      "Action item did not create a content draft"
    );
    const convertedAction = afterContent.actionItems.find((item) => item.id === createdAction.id);
    assert(convertedAction?.contentDraftId, "Converted action item has no content draft id.");
    assert(convertedAction?.platformVersionId, "Converted action item has no platform version id.");
    assert(convertedAction?.publishQueueItemId, "Converted action item has no queue id.");
    assert(convertedAction.contentWorkflowStatus === "scheduled" || convertedAction.contentWorkflowStatus === "draft_created", "Converted action item has no workflow status.");
    assertTotalsUnchanged(beforeTotals, trustedTotals(afterContent));

    const generatedContentId = convertedAction.contentDraftId;
    const generatedVersionId = convertedAction.platformVersionId;
    const generatedQueueId = convertedAction.publishQueueItemId;
    const generatedTitle = afterContent.contents.find((item) => item.id === generatedContentId)?.title;
    assert(generatedTitle, "Generated content was not visible in the dashboard snapshot.");

    const repeated = await postActionToContent(page, createdAction.id);
    assert(repeated.ok, `Repeated action-to-content POST failed: ${JSON.stringify(repeated)}`);
    assert(repeated.body.idempotent === true, "Repeated action-to-content POST was not idempotent.");
    const afterRepeat = await dashboard(page);
    assert(afterRepeat.contents.filter((item) => item.id === generatedContentId).length === 1, "Repeated request duplicated content.");
    assert(afterRepeat.platformVersions.filter((item) => item.id === generatedVersionId).length === 1, "Repeated request duplicated platform version.");
    assert(afterRepeat.queue.filter((item) => item.id === generatedQueueId).length === 1, "Repeated request duplicated queue item.");
    assert(afterRepeat.contents.filter((item) => item.id.startsWith("content-from-action-")).length === beforeGeneratedContentCount + 1, "Unexpected generated content count after repeat.");
    assert(afterRepeat.platformVersions.filter((item) => item.id.includes("content-from-action-")).length === beforeGeneratedVersionCount + 1, "Unexpected generated platform version count after repeat.");
    assert(afterRepeat.queue.filter((item) => item.id.includes("content-from-action-")).length === beforeGeneratedQueueCount + 1, "Unexpected generated queue count after repeat.");
    assertTotalsUnchanged(beforeTotals, trustedTotals(afterRepeat));
    await assertNoSensitiveText(page, "dashboard-after-content");

    const untrusted = await postActionToContent(page, UNTRUSTED_ACTION_ID);
    assert(!untrusted.ok && untrusted.status === 400, "Untrusted manual evidence was allowed to create content.");
    const excluded = await postActionToContent(page, EXCLUDED_ACTION_ID);
    assert(!excluded.ok && excluded.status === 400, "User-excluded evidence was allowed to create content.");
    const afterBlocked = await dashboard(page);
    assert(afterBlocked.contents.filter((item) => item.id.startsWith("content-from-action-")).length === beforeGeneratedContentCount + 1, "Blocked evidence created extra content.");
    assert(afterBlocked.platformVersions.filter((item) => item.id.includes("content-from-action-")).length === beforeGeneratedVersionCount + 1, "Blocked evidence created extra platform version.");
    assert(afterBlocked.queue.filter((item) => item.id.includes("content-from-action-")).length === beforeGeneratedQueueCount + 1, "Blocked evidence created extra queue item.");
    assertTotalsUnchanged(beforeTotals, trustedTotals(afterBlocked));

    await gotoAppPage(page, server.baseUrl, CONTENT_PATH);
    await page.getByText(generatedTitle).first().waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "content-page");

    await gotoAppPage(page, server.baseUrl, CALENDAR_PATH);
    await page.locator(`[data-platform-version-id="${generatedVersionId}"]`).first().waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "calendar-page");
    await page.screenshot({ path: plan.screenshotPath, fullPage: true });

    report.dashboard = {
      actionItemId: createdAction.id,
      contentDraftId: generatedContentId,
      platformVersionId: generatedVersionId,
      publishQueueItemId: generatedQueueId,
      totalsBefore: beforeTotals,
      totalsAfter: trustedTotals(afterBlocked),
      generatedContentCount: afterBlocked.contents.filter((item) => item.id.startsWith("content-from-action-")).length,
      repeatedIdempotent: repeated.body.idempotent === true
    };
    report.content = {
      contentPageVisible: true,
      calendarPageVisible: true,
      screenshotPath: plan.screenshotPath
    };
    report.blocked = {
      untrustedStatus: untrusted.status,
      excludedStatus: excluded.status,
      noExtraContentCreated: true
    };
    writeFileSync(plan.reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, reportPath: plan.reportPath, screenshotPath: plan.screenshotPath, dbPath: plan.smokeDbPath, baseUrl: server.baseUrl }, null, 2));
  } finally {
    await browser.close().catch(() => {});
    server.stop();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
