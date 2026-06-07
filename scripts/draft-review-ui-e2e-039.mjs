#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const OUTPUT_DIR = path.join(process.cwd(), ".local", "draft-review-ui-e2e-039");
const SCREENSHOT_PATH = path.join(OUTPUT_DIR, "calendar-published.png");
const CONTENT_HISTORY_SCREENSHOT_PATH = path.join(OUTPUT_DIR, "content-publish-history.png");
const REPORT_PATH = path.join(OUTPUT_DIR, "report.json");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const DB_PATH = path.join(".local", "draft-review-ui-e2e-039", `self-media-draft-review-${RUN_ID}.sqlite`);
const DASHBOARD_PATH = "/dashboard";
const CONTENT_PATH = "/content";
const CALENDAR_PATH = "/calendar";
const EDITED_TITLE = "039 人工复核后的行动草稿";
const EDITED_BODY = "039 浏览器级 E2E 编辑后的正文草稿，只用于本地隔离验证。";
const EDITED_TOPIC = "039 草稿审核选题";
const NEXT_ACTION = "039 发布前人工检查标题、正文和平台适配。";

function pad(value) {
  return String(value).padStart(2, "0");
}

function localDateTimeInput(date = new Date(), hour = 11) {
  const scheduled = new Date(date);
  scheduled.setHours(hour, 0, 0, 0);
  return `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}T${pad(hour)}:00`;
}

const SCHEDULED_LOCAL = localDateTimeInput(new Date(), 17);
const PUBLISHED_AT = new Date(`${SCHEDULED_LOCAL}:00`).toISOString();

const SENSITIVE_PATTERNS = [
  /\braw\s+payload\b/i,
  /\bcookie\b/i,
  /\btoken\b/i,
  /\bheaders?\b/i,
  /\bcomment\s+body\b/i,
  /\bcomment_content\b/i,
  /\bdanmu\b/i,
  /\bdanmu_text\b/i,
  /评论正文/i,
  /弹幕/i
];

const PLATFORM_FIXTURES = [
  {
    source: "douyin_creator_center",
    platform: "douyin",
    id: "draft-review-ui-e2e-douyin-high",
    title: "草稿审核样本 A",
    capturedAt: "2026-06-04T08:00:00.000Z",
    views: 4200,
    likes: 360,
    comments: 38,
    saves: 52,
    shares: 34
  },
  {
    source: "xiaohongshu_creator_center",
    platform: "xiaohongshu",
    id: "draft-review-ui-e2e-xhs-low",
    title: "草稿审核样本 B",
    capturedAt: "2026-06-04T08:05:00.000Z",
    views: 860,
    likes: 6,
    comments: 0,
    saves: 1,
    shares: 0
  },
  {
    source: "video_account_creator_center",
    platform: "video_account",
    id: "draft-review-ui-e2e-video-account",
    title: "草稿审核样本 C",
    capturedAt: "2026-06-04T08:10:00.000Z",
    views: 780,
    likes: 42,
    comments: 6,
    saves: 7,
    shares: 5
  },
  {
    source: "bilibili_creator_center",
    platform: "bilibili",
    id: "draft-review-ui-e2e-bilibili",
    title: "草稿审核样本 D",
    capturedAt: "2026-06-04T08:15:00.000Z",
    views: 910,
    likes: 58,
    comments: 8,
    saves: 12,
    shares: 7
  }
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

async function findPort(start = 3320) {
  for (let port = start; port < start + 90; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free draft-review E2E port found.");
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const [apiResponse, pageResponse] = await Promise.all([
        fetch(`${baseUrl}/api/self-media/dashboard`),
        fetch(`${baseUrl}${DASHBOARD_PATH}`)
      ]);
      if (apiResponse.ok && pageResponse.ok) return;
    } catch {
      // Keep polling until the isolated dev server is ready.
    }
    await sleep(800);
  }
  throw new Error(`Draft review E2E target did not become ready: ${baseUrl}`);
}

function ensureOutputDir() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

export function resolveDraftReviewUiE2EPlan(env = process.env) {
  return {
    mode: "isolated",
    smokeDbPath: env.DRAFT_REVIEW_UI_E2E_DB_PATH?.trim() || DB_PATH,
    seedMode: "off",
    portStart: Number(env.DRAFT_REVIEW_UI_E2E_PORT_START ?? 3320),
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
            topic: "039 脱敏草稿审核样本",
            publishedAt: "2026-06-03T08:00:00.000Z",
            notes: "draft-review-ui-e2e-039 sanitized fixture"
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
          warnings: ["draft-review-ui-e2e-039 sanitized fixture only"]
        },
        { isTestFixture: false, operationKind: "platform_save", trustedScopeEligible: true }
      );
    }
  } finally {
    repo.close();
  }
}

async function startServer(plan) {
  const port = await findPort(plan.portStart);
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
      NEXT_DIST_DIR: `.next-draft-review-ui-e2e-${RUN_ID}`
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
    port,
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
    actionItems: lastSnapshot?.actionItems?.length ?? null,
    contents: lastSnapshot?.contents?.length ?? null,
    queue: lastSnapshot?.queue?.length ?? null,
    platformVersions: lastSnapshot?.platformVersions?.length ?? null,
    publishRecords: lastSnapshot?.publishRecords?.length ?? null
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

async function patchPlatformVersion(page, payload) {
  return page.evaluate(async (input) => {
    const response = await fetch("/api/self-media/content-versions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  }, payload);
}

async function confirmPublish(page, payload) {
  return patchPlatformVersion(page, { ...payload, action: "confirm_publish" });
}

async function createActionGeneratedDraft(page) {
  const before = await dashboard(page);
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
  const afterDraft = await waitForDashboard(
    page,
    (snapshot) => {
      const item = snapshot.actionItems.find((candidate) => candidate.id === createdAction.id);
      return Boolean(item?.contentDraftId && item.platformVersionId && item.publishQueueItemId);
    },
    "Action item did not create a content draft"
  );
  const action = afterDraft.actionItems.find((item) => item.id === createdAction.id);
  assert(action?.contentDraftId && action.platformVersionId && action.publishQueueItemId, "Action-generated draft references were incomplete.");
  return { before, beforeTotals: trustedTotals(before), action, snapshot: afterDraft };
}

async function saveDraftReview(page, status) {
  await page.getByTestId("content-title-input").fill(EDITED_TITLE);
  await page.getByTestId("content-topic-input").fill(EDITED_TOPIC);
  await page.getByTestId("version-title-input").fill(EDITED_TITLE);
  await page.getByTestId("version-body-input").fill(EDITED_BODY);
  await page.getByTestId("version-next-action-input").fill(NEXT_ACTION);
  await page.getByTestId("version-scheduled-input").fill(SCHEDULED_LOCAL);
  await page.getByRole("checkbox", { name: "标题确认" }).check();
  await page.getByRole("checkbox", { name: "平台适配" }).check();
  await page.getByRole("checkbox", { name: "人工确认" }).check();
  await page.getByTestId("draft-review-status-select").selectOption(status);
  await page.getByTestId("review-content-draft").click();
  await page.waitForFunction(() => document.querySelector("[data-testid='content-operation-message']")?.textContent?.includes("草稿审核已保存"), null, { timeout: 15000 });
}

async function main() {
  ensureOutputDir();
  const plan = resolveDraftReviewUiE2EPlan();
  await seedDatabase(plan.smokeDbPath);
  const server = await startServer(plan);
  const browser = await chromium.launch({ executablePath: chromeExecutablePath(), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();
  const report = {
    task: "DRAFT-REVIEW-UI-E2E-039",
    baseUrl: server.baseUrl,
    isolatedDb: true,
    dbPath: plan.smokeDbPath,
    noRealPlatformApi: true,
    flow: {},
    safety: {},
    verification: {}
  };

  try {
    await gotoAppPage(page, server.baseUrl, DASHBOARD_PATH);
    await page.getByText("导入后行动建议").waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "dashboard-initial");

    const created = await createActionGeneratedDraft(page);
    assertTotalsUnchanged(created.beforeTotals, trustedTotals(created.snapshot));
    await assertNoSensitiveText(page, "dashboard-after-action-draft");

    const versionId = created.action.platformVersionId;
    const contentId = created.action.contentDraftId;
    const queueId = created.action.publishQueueItemId;
    const contentUrl = `${CONTENT_PATH}?contentId=${encodeURIComponent(contentId)}&versionId=${encodeURIComponent(versionId)}`;
    await gotoAppPage(page, server.baseUrl, contentUrl);
    await page.getByTestId("platform-version-editor").waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "content-before-review");

    await saveDraftReview(page, "draft");
    const afterDraft = await dashboard(page);
    const draftVersion = afterDraft.platformVersions.find((item) => item.id === versionId);
    const draftContent = afterDraft.contents.find((item) => item.id === contentId);
    const draftQueue = afterDraft.queue.find((item) => item.id === queueId);
    assert(draftContent?.title === EDITED_TITLE, "Draft review did not update content title.");
    assert(draftContent?.topic === EDITED_TOPIC, "Draft review did not update content topic.");
    assert(draftVersion?.body === EDITED_BODY, "Draft review did not update body.");
    assert(draftVersion?.status === "draft", "Draft review did not move version to draft.");
    assert(draftVersion?.checklist.title && draftVersion.checklist.platformFit && draftVersion.checklist.humanConfirmed, "Draft review checklist was not saved.");
    assert(draftQueue?.status === "draft", "Draft review did not sync queue to draft.");
    assert(afterDraft.publishRecords.length === 0, "Draft review created a publish record.");
    assertTotalsUnchanged(created.beforeTotals, trustedTotals(afterDraft));

    await saveDraftReview(page, "scheduled");
    const afterSchedule = await dashboard(page);
    const scheduledVersion = afterSchedule.platformVersions.find((item) => item.id === versionId);
    const scheduledQueue = afterSchedule.queue.find((item) => item.id === queueId);
    assert(scheduledVersion?.status === "scheduled", "Draft review did not move version to scheduled.");
    assert(scheduledQueue?.status === "scheduled", "Draft review did not sync queue to scheduled.");
    assert(afterSchedule.calendarItems.some((item) => item.platformVersionId === versionId && item.status === "scheduled"), "Scheduled version did not enter calendar.");
    assert(afterSchedule.publishRecords.length === 0, "Scheduling created a publish record.");
    assertTotalsUnchanged(created.beforeTotals, trustedTotals(afterSchedule));

    const genericPublished = await patchPlatformVersion(page, { id: versionId, status: "published", publishedAt: PUBLISHED_AT });
    const genericFailed = await patchPlatformVersion(page, { id: versionId, status: "failed", failureReason: "generic patch must not write failed" });
    const genericPublishedAt = await patchPlatformVersion(page, { id: versionId, publishedAt: PUBLISHED_AT });
    assert(!genericPublished.ok && genericPublished.status === 400, "Generic PATCH was allowed to write published/publishedAt.");
    assert(!genericFailed.ok && genericFailed.status === 400, "Generic PATCH was allowed to write failed.");
    assert(!genericPublishedAt.ok && genericPublishedAt.status === 400, "Generic PATCH was allowed to write publishedAt.");
    const afterRejectedPatch = await dashboard(page);
    const rejectedPatchVersion = afterRejectedPatch.platformVersions.find((item) => item.id === versionId);
    assert(rejectedPatchVersion?.status === "scheduled", "Rejected generic PATCH changed version status.");
    assert(!rejectedPatchVersion?.publishedAt, "Rejected generic PATCH wrote publishedAt.");
    assert(afterRejectedPatch.publishRecords.length === 0, "Rejected generic PATCH created publish records.");
    assertTotalsUnchanged(created.beforeTotals, trustedTotals(afterRejectedPatch));

    await assertNoSensitiveText(page, "content-after-review");
    await gotoAppPage(page, server.baseUrl, CALENDAR_PATH);
    await page.locator(`[data-platform-version-id="${versionId}"]`).first().waitFor({ timeout: 15000 });
    await page.locator(`[data-platform-version-id="${versionId}"]`).first().click();
    await page.getByRole("dialog", { name: "平台版本详情" }).waitFor({ timeout: 15000 });
    await assertNoSensitiveText(page, "calendar-before-confirm");
    await page.getByTestId("calendar-confirm-publish").click();
    await page.waitForFunction(() => document.querySelector("[data-testid='calendar-operation-message']")?.textContent?.includes("已记录人工发布确认"), null, { timeout: 15000 });
    const afterPublish = await dashboard(page);
    const publishedVersion = afterPublish.platformVersions.find((item) => item.id === versionId);
    const publishRecords = afterPublish.publishRecords.filter((item) => item.platformVersionId === versionId);
    assert(publishedVersion?.status === "published", "Calendar publish confirmation did not publish the version.");
    assert(Boolean(publishedVersion?.publishedAt), "Calendar publish confirmation did not set publishedAt.");
    assert(publishRecords.length === 1, "Calendar publish confirmation did not create exactly one publish record.");
    assert(publishRecords[0]?.confirmationSource === "manual", "Publish record was not manual confirmation.");
    assertTotalsUnchanged(created.beforeTotals, trustedTotals(afterPublish));
    const publishRecord = publishRecords[0];
    const ledgerRow = page.locator(`[data-publish-record-id="${publishRecord.id}"]`);
    await page.getByTestId("publish-ledger").scrollIntoViewIfNeeded();
    await ledgerRow.waitFor({ timeout: 15000 });
    await page.getByTestId("publish-ledger").getByText(EDITED_TITLE).waitFor({ timeout: 15000 });
    await page.getByTestId("publish-ledger").getByText("manual").waitFor({ timeout: 15000 });
    await page.getByTestId("publish-ledger").getByText("日历人工确认发布").waitFor({ timeout: 15000 });
    await page.getByTestId("publish-ledger-status-filter").selectOption("published");
    await ledgerRow.waitFor({ timeout: 15000 });
    const publishDateKey = publishRecord.happenedAt.slice(0, 10);
    await page.getByTestId("publish-ledger-date-filter").fill(publishDateKey);
    await ledgerRow.waitFor({ timeout: 15000 });
    assert(await page.locator(`[data-publish-record-id="${publishRecord.id}"]`).count() === 1, "Publish ledger did not show exactly one row after filters.");

    const repeated = await confirmPublish(page, {
      platformVersionId: versionId,
      status: "published",
      note: "日历人工确认发布",
      confirmationSource: "manual"
    });
    assert(repeated.ok, `Repeated confirm_publish failed: ${JSON.stringify(repeated)}`);
    assert(repeated.body.idempotent === true, "Repeated confirm_publish was not idempotent.");
    const afterRepeat = await dashboard(page);
    assert(afterRepeat.publishRecords.filter((item) => item.platformVersionId === versionId).length === 1, "Repeated confirm_publish duplicated publish records.");
    assertTotalsUnchanged(created.beforeTotals, trustedTotals(afterRepeat));
    assert(await page.locator(`[data-publish-record-id="${publishRecord.id}"]`).count() === 1, "Repeated confirm_publish duplicated the visible ledger row.");
    await assertNoSensitiveText(page, "calendar-after-confirm");
    await page.screenshot({ path: plan.screenshotPath, fullPage: true });

    await gotoAppPage(page, server.baseUrl, contentUrl);
    await page.getByTestId("content-publish-history").scrollIntoViewIfNeeded();
    const historyRow = page.locator(`[data-publish-history-version-id="${versionId}"]`);
    await historyRow.waitFor({ timeout: 15000 });
    await historyRow.getByText("manual", { exact: true }).waitFor({ timeout: 15000 });
    await historyRow.getByText("日历人工确认发布").waitFor({ timeout: 15000 });
    await page.locator(`[data-publish-record-id="${publishRecord.id}"]`).waitFor({ timeout: 15000 });
    const calendarHref = await historyRow.locator(`a[href*="/calendar"]`).first().getAttribute("href");
    assert(calendarHref?.includes(`versionId=${encodeURIComponent(versionId)}`), "Content publish history calendar link does not target the selected version.");
    assert(calendarHref?.includes("#publish-ledger"), "Content publish history calendar link does not target the ledger.");
    await assertNoSensitiveText(page, "content-publish-history");
    await page.screenshot({ path: CONTENT_HISTORY_SCREENSHOT_PATH, fullPage: true });

    report.flow = {
      actionItemId: created.action.id,
      contentDraftId: contentId,
      platformVersionId: versionId,
      publishQueueItemId: queueId,
      draftStatus: draftVersion?.status,
      scheduledStatus: scheduledVersion?.status,
      publishedStatus: publishedVersion?.status,
      publishRecordId: publishRecords[0]?.id,
      repeatedPublishIdempotent: repeated.body.idempotent === true,
      ledgerVisible: true,
      contentPublishHistoryVisible: true,
      ledgerFilters: {
        status: "published",
        date: publishDateKey
      }
    };
    report.safety = {
      isolatedDatabase: true,
      seedMode: "off",
      genericPatchBlocked: {
        published: genericPublished.status,
        failed: genericFailed.status,
        publishedAt: genericPublishedAt.status
      },
      trustedTotalsBefore: created.beforeTotals,
      trustedTotalsAfter: trustedTotals(afterRepeat),
      noSensitiveUiText: true,
      noRealPlatformApi: true
    };
    report.verification = {
      contentPageReviewed: true,
      calendarPublishConfirmed: true,
      contentPublishHistoryChecked: true,
      screenshotPath: path.relative(process.cwd(), plan.screenshotPath),
      contentHistoryScreenshotPath: path.relative(process.cwd(), CONTENT_HISTORY_SCREENSHOT_PATH),
      serverLogs: {
        stdout: path.relative(process.cwd(), server.logs.stdout),
        stderr: path.relative(process.cwd(), server.logs.stderr)
      }
    };
    writeFileSync(plan.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ ok: true, reportPath: plan.reportPath, screenshotPath: plan.screenshotPath, contentHistoryScreenshotPath: CONTENT_HISTORY_SCREENSHOT_PATH, dbPath: plan.smokeDbPath, baseUrl: server.baseUrl }, null, 2));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    server.stop();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
