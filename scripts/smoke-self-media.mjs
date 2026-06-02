import { spawn } from "node:child_process";
import net from "node:net";
import { chromium } from "playwright-core";

const chromePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function findPort(start = 3022) {
  for (let port = start; port < start + 50; port += 1) {
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No free smoke port found.");
}

async function waitForReady(baseUrl) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/self-media/dashboard`);
      if (response.ok) return;
    } catch {
      // Keep polling until the dev server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(`Smoke target did not become ready: ${baseUrl}`);
}

async function startServer() {
  if (process.env.SMOKE_BASE_URL) return { baseUrl: process.env.SMOKE_BASE_URL, stop: () => {} };
  const port = await findPort();
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run dev -- --hostname 127.0.0.1 --port ${port}`]
      : ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
    windowsHide: true
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl);
  return {
    baseUrl,
    stop: () => {
      if (!child.killed) child.kill();
    }
  };
}

async function postJson(page, path, body) {
  return page.evaluate(
    async ({ path: requestPath, body: requestBody }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      return { ok: response.ok, status: response.status, body: await response.json() };
    },
    { path, body }
  );
}

async function patchJson(page, path, body) {
  return page.evaluate(
    async ({ path: requestPath, body: requestBody }) => {
      const response = await fetch(requestPath, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      return { ok: response.ok, status: response.status, body: await response.json() };
    },
    { path, body }
  );
}

const server = await startServer();
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  await page.goto(server.baseUrl, { waitUntil: "networkidle" });
  const title = await page.locator("h1").innerText();
  if (!title.includes("自媒体经营后台")) throw new Error(`Unexpected title: ${title}`);
  const before = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());

  const csv = [
    "作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,涨粉,选题",
    `smoke-douyin-${Date.now()},O2抖音CSV预设导入,2026-06-01T09:00:00.000Z,2100,91,15,33,11,5,O2烟测`
  ].join("\n");
  const previewResult = await postJson(page, "/api/self-media/import/preview", { mode: "csv", preset: "douyin", csv });
  if (!previewResult.ok) throw new Error(`CSV preview failed: ${JSON.stringify(previewResult)}`);
  const afterPreview = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
  if (afterPreview.imports.length !== before.imports.length) throw new Error("Import preview created an ImportRun.");
  const csvResult = await postJson(page, "/api/self-media/import", { mode: "csv", preset: "douyin", csv });
  if (!csvResult.ok) throw new Error(`CSV preset import failed: ${JSON.stringify(csvResult)}`);

  const mediaCrawlerResult = await postJson(page, "/api/self-media/import", {
    mode: "mediacrawler",
    json: { platform: "xhs", items: [{ note_id: `smoke-mc-${Date.now()}`, title: "O2 MediaCrawler JSON导入", liked_count: 70, comment_count: 9, collected_count: 35, share_count: 8, keyword: "O2烟测" }] }
  });
  if (!mediaCrawlerResult.ok) throw new Error(`MediaCrawler import failed: ${JSON.stringify(mediaCrawlerResult)}`);

  const n8nResult = await postJson(page, "/api/self-media/import", {
    mode: "n8n",
    json: { executionId: `exec-smoke-${Date.now()}`, workflowName: "O2导入烟测", items: [{ id: `smoke-n8n-${Date.now()}`, title: "O2 n8n执行结果导入", platform: "wechat", views: 830, likes: 31, comments: 4, saves: 13, shares: 5 }] }
  });
  if (!n8nResult.ok) throw new Error(`n8n import failed: ${JSON.stringify(n8nResult)}`);

  const ideaResult = await postJson(page, "/api/self-media/ideas", {
    title: `O2选题-${Date.now()}`,
    platform: "video_account",
    rationale: "从导入信号沉淀真人表达内容。",
    nextAction: "转内容草稿"
  });
  if (!ideaResult.ok) throw new Error(`Idea creation failed: ${JSON.stringify(ideaResult)}`);
  const convertResult = await postJson(page, "/api/self-media/ideas", { action: "convert", id: ideaResult.body.idea.id });
  if (!convertResult.ok) throw new Error(`Idea conversion failed: ${JSON.stringify(convertResult)}`);
  const leadResult = await postJson(page, "/api/self-media/leads", {
    source: "O2线下社群",
    demand: "AI短片工作流咨询",
    nextAction: "发送案例并约复盘时间",
    valueEstimate: 3600,
    status: "follow_up"
  });
  if (!leadResult.ok) throw new Error(`Lead creation failed: ${JSON.stringify(leadResult)}`);

  const versionA = await postJson(page, "/api/self-media/content-versions", {
    contentId: convertResult.body.content.id,
    platform: "douyin",
    title: "V1.5 抖音版本",
    body: "短句强钩子",
    script: "开头三秒给结论",
    coverNote: "AI工作台截图",
    scheduledAt: "2026-06-05T09:00:00.000Z",
    checklist: { title: true, script: true, platformFit: true }
  });
  if (!versionA.ok) throw new Error(`Platform version A failed: ${JSON.stringify(versionA)}`);
  const versionB = await postJson(page, "/api/self-media/content-versions", {
    contentId: convertResult.body.content.id,
    platform: "wechat",
    title: "V1.5 公众号版本",
    body: "完整复盘文章",
    script: "结构化说明",
    coverNote: "无需封面",
    scheduledAt: "2026-06-06T09:00:00.000Z",
    checklist: { title: true, script: true }
  });
  if (!versionB.ok) throw new Error(`Platform version B failed: ${JSON.stringify(versionB)}`);
  const published = await patchJson(page, "/api/self-media/content-versions", { id: versionA.body.version.id, status: "needs_review", checklist: { humanConfirmed: true } });
  if (!published.ok) throw new Error(`Platform version needs_review failed: ${JSON.stringify(published)}`);
  const scheduled = await patchJson(page, "/api/self-media/content-versions", { id: versionA.body.version.id, status: "scheduled" });
  if (!scheduled.ok) throw new Error(`Platform version scheduled failed: ${JSON.stringify(scheduled)}`);
  const finalPublished = await patchJson(page, "/api/self-media/content-versions", { id: versionA.body.version.id, status: "published" });
  if (!finalPublished.ok) throw new Error(`Platform version publish failed: ${JSON.stringify(finalPublished)}`);
  const blocked = await patchJson(page, "/api/self-media/content-versions", { id: versionB.body.version.id, status: "needs_review" });
  if (!blocked.ok) throw new Error(`Platform version B needs_review failed: ${JSON.stringify(blocked)}`);
  const blockedFinal = await patchJson(page, "/api/self-media/content-versions", { id: versionB.body.version.id, status: "blocked", failureReason: "缺少长图封面确认" });
  if (!blockedFinal.ok) throw new Error(`Platform version block failed: ${JSON.stringify(blockedFinal)}`);
  const snapshotResult = await postJson(page, "/api/self-media/metrics/snapshots", {
    platformVersionId: versionA.body.version.id,
    snapshotDate: "2026-06-06",
    views: 2600,
    likes: 120,
    comments: 18,
    saves: 40,
    shares: 16,
    source: "manual"
  });
  if (!snapshotResult.ok) throw new Error(`Metric snapshot failed: ${JSON.stringify(snapshotResult)}`);
  const calendarResponse = await page.evaluate(async () => {
    const response = await fetch("/api/self-media/calendar?view=week&platform=douyin&status=published");
    return { ok: response.ok, body: await response.json() };
  });
  if (!calendarResponse.ok || !calendarResponse.body.some((item) => item.platformVersionId === versionA.body.version.id)) throw new Error(`Calendar did not include published version: ${JSON.stringify(calendarResponse)}`);
  const reviewResult = await postJson(page, "/api/self-media/reviews", { period: "weekly" });
  if (!reviewResult.ok) throw new Error(`Saved review failed: ${JSON.stringify(reviewResult)}`);
  const actionUpdate = await patchJson(page, "/api/self-media/action-items", { id: reviewResult.body.actionItems[0].id, status: "doing", nextAction: "今天完成复盘动作" });
  if (!actionUpdate.ok) throw new Error(`Action update failed: ${JSON.stringify(actionUpdate)}`);
  const leadUpdate = await patchJson(page, "/api/self-media/leads", { id: leadResult.body.lead.id, status: "contacted", nextAction: "等待对方确认时间" });
  if (!leadUpdate.ok) throw new Error(`Lead update failed: ${JSON.stringify(leadUpdate)}`);
  const automationResult = await postJson(page, "/api/self-media/automation-runs", { kind: "n8n_import", status: "success", source: "n8n" });
  if (!automationResult.ok) throw new Error(`Automation run failed: ${JSON.stringify(automationResult)}`);

  const mid = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
  if (mid.weeklyReview.metrics.totalViews <= before.weeklyReview.metrics.totalViews) throw new Error("Review metrics did not increase after imports.");
  if (!mid.contents.some((item) => item.id === convertResult.body.content.id)) throw new Error("Converted idea content is missing from dashboard.");
  if (!mid.leads.some((item) => item.id === leadResult.body.lead.id)) throw new Error("Created lead is missing from dashboard.");
  if (!mid.platformVersions.some((item) => item.id === versionA.body.version.id) || !mid.platformVersions.some((item) => item.id === versionB.body.version.id)) throw new Error("Platform versions missing from dashboard.");
  if (!mid.metricSnapshots.some((item) => item.id === snapshotResult.body.snapshot.id)) throw new Error("Metric snapshot missing from dashboard.");
  if (!mid.savedReviews.some((item) => item.id === reviewResult.body.review.id)) throw new Error("Saved review missing from dashboard.");
  if (!mid.actionItems.some((item) => item.id === actionUpdate.body.actionItem.id && item.status === "doing")) throw new Error("Updated action item missing from dashboard.");
  if (!mid.automationRuns.some((item) => item.id === automationResult.body.run.id)) throw new Error("Automation run missing from dashboard.");
  if (!mid.evidenceInsights.some((item) => item.evidenceRefs.length > 0)) throw new Error("Evidence-backed insights missing from dashboard.");
  const queueItem = mid.queue.find((item) => item.status === "needs_review") ?? mid.queue[0];
  const nextStatus = queueItem.status === "needs_review" ? "queued" : queueItem.status === "queued" ? "scheduled" : queueItem.status === "scheduled" ? "publishing" : undefined;
  if (nextStatus) {
    const queueResult = await patchJson(page, "/api/self-media/queue", { id: queueItem.id, status: nextStatus });
    if (!queueResult.ok) throw new Error(`Queue transition failed: ${JSON.stringify(queueResult)}`);
  }

  const routeExpectations = [
    ["/", "自媒体经营后台", "今日工作入口"],
    ["/calendar", "发布日历", "平台版本详情"],
    ["/content", "内容管理", "内容库"],
    ["/import", "数据导入", "Diff 预览"],
    ["/dashboard", "数据看板", "曝光与互动趋势"],
    ["/reviews", "周月复盘", "总曝光"],
    ["/leads", "线索跟进", "新线索"],
    ["/ui-lab", "UI Lab", "按钮状态"]
  ];
  for (const [route, expectedTitle, expectedText] of routeExpectations) {
    await page.goto(`${server.baseUrl}${route}`, { waitUntil: "networkidle" });
    const routeTitle = await page.locator("h1").innerText();
    if (!routeTitle.includes(expectedTitle)) throw new Error(`Unexpected title for ${route}: ${routeTitle}`);
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes(expectedText)) throw new Error(`Expected ${expectedText} on ${route}`);
  }

  await page.goto(`${server.baseUrl}/content`, { waitUntil: "networkidle" });
  await page.locator('[data-testid="platform-version-editor"]').waitFor({ timeout: 10000 });
  const editedTitle = `O2编辑器保存-${Date.now()}`;
  await page.locator('[data-testid="version-title-input"]').fill(editedTitle);
  await page.locator('[data-testid="version-body-input"]').fill("从内容页直接编辑平台版本正文。");
  await page.locator('[data-testid="version-script-input"]').fill("开头给结论，中段给证据，结尾给行动。");
  await page.locator('[data-testid="version-cover-input"]').fill("封面展示 CreatorFact 工作台。");
  await page.locator('[data-testid="save-platform-version"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="content-operation-message"]')?.textContent?.includes("平台版本已保存"), null, { timeout: 10000 });
  const contentMessage = await page.locator('[data-testid="content-operation-message"]').innerText();
  if (!contentMessage.includes("平台版本已保存")) throw new Error(`Content editor save did not report success: ${contentMessage}`);
  const editedDashboard = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
  if (!editedDashboard.platformVersions.some((item) => item.title === editedTitle && item.body.includes("内容页直接编辑"))) throw new Error("Edited platform version was not persisted.");

  await page.goto(`${server.baseUrl}/calendar`, { waitUntil: "networkidle" });
  await page.locator('[data-testid="publish-calendar"]').waitFor({ timeout: 10000 });
  const firstCard = page.locator("[data-calendar-card='true']").first();
  const cardCount = await page.locator("[data-calendar-card='true']").count();
  if (cardCount === 0) throw new Error("Calendar has no draggable platform version cards.");
  const draggedVersionId = await firstCard.getAttribute("data-platform-version-id");
  const currentDate = await firstCard.evaluate((node) => node.closest("[data-calendar-date]")?.getAttribute("data-calendar-date"));
  const targetDay = page.locator(`[data-calendar-date]:not([data-calendar-date='${currentDate}'])`).last();
  const targetDate = await targetDay.getAttribute("data-calendar-date");
  if (!draggedVersionId || !targetDate) throw new Error("Calendar drag target was not discoverable.");
  await firstCard.scrollIntoViewIfNeeded();
  await targetDay.scrollIntoViewIfNeeded();
  const sourceBox = await firstCard.boundingBox();
  const targetBox = await targetDay.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Calendar drag boxes were not available.");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + Math.min(sourceBox.height / 2, 36));
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + Math.min(targetBox.height / 2, 88), { steps: 16 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('[data-testid="calendar-operation-message"]')?.textContent?.includes("排期已保存"), null, { timeout: 15000 });
  const draggedDashboard = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
  const draggedVersion = draggedDashboard.platformVersions.find((item) => item.id === draggedVersionId);
  if (!draggedVersion?.scheduledAt?.startsWith(targetDate)) throw new Error(`Dragged version did not move to ${targetDate}: ${draggedVersion?.scheduledAt}`);

  await page.goto(`${server.baseUrl}/reviews`, { waitUntil: "networkidle" });
  await page.locator('[data-testid="save-review-button"]').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="review-operation-message"]')?.textContent?.includes("已保存"), null, { timeout: 10000 });
  const actionButton = page.locator("[data-action-item-id] button", { hasText: "进行中" }).first();
  await actionButton.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="review-operation-message"]')?.textContent?.includes("行动项已更新"), null, { timeout: 10000 });
  const reviewDashboard = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
  if (!reviewDashboard.savedReviews.some((item) => item.period === "weekly")) throw new Error("Review UI did not save a weekly review.");
  if (!reviewDashboard.actionItems.some((item) => item.status === "doing")) throw new Error("Review UI did not advance an action item.");

  if (httpFailures.length) throw new Error(`HTTP failures: ${httpFailures.join(" | ")}`);
  if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(" | ")}`);
  const after = await page.evaluate(async () => (await fetch("/api/self-media/dashboard")).json());
  console.log(
    JSON.stringify(
      {
        baseUrl: server.baseUrl,
        title,
        beforeViews: before.weeklyReview.metrics.totalViews,
        afterViews: after.weeklyReview.metrics.totalViews,
        imports: [csvResult.body.run.source, mediaCrawlerResult.body.run.source, n8nResult.body.run.source],
        previewDidNotImport: true,
        ideaConverted: convertResult.body.content.id,
        leadCreated: leadResult.body.lead.id,
        platformVersions: [versionA.body.version.id, versionB.body.version.id],
        metricSnapshot: snapshotResult.body.snapshot.id,
        savedReview: reviewResult.body.review.id,
        actionItem: actionUpdate.body.actionItem.id,
        automationRun: automationResult.body.run.id,
        uiEditedVersion: editedTitle,
        uiDraggedVersion: draggedVersionId,
        uiSavedReview: true,
        uiAdvancedAction: true,
        queueChecked: Boolean(nextStatus)
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  server.stop();
}
