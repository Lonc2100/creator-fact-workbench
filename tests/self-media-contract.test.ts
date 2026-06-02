import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { CsvPresetProvider, FakeSelfMediaProvider, ManualImportProvider, MediaCrawlerImportProvider, N8nExecutionProvider, WechatOfficialProvider } from "../src/domain/self-media/providers";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo";
import { SelfMediaService, generateReview } from "../src/domain/self-media/service";

test("fake provider maps external sample data into internal self-media payload", async () => {
  const payload = await new FakeSelfMediaProvider().importSample();
  assert.equal(payload.source, "fake");
  assert.ok(payload.contents.length >= 3);
  assert.ok(payload.metrics.every((metric) => metric.contentId.length > 0));
  assert.ok(payload.ideas?.some((idea) => idea.title.includes("复盘")));
});

test("manual csv provider returns content and metric contracts", () => {
  const csv = [
    "id,title,platform,status,format,topic,views,likes,comments,saves,shares,followersDelta",
    "csv-1,测试内容,douyin,published,short_video,AI短片,100,10,2,3,1,1"
  ].join("\n");
  const payload = new ManualImportProvider().fromCsv(csv);
  assert.equal(payload.source, "csv");
  assert.equal(payload.contents[0].title, "测试内容");
  assert.equal(payload.metrics[0].views, 100);
});

test("platform csv presets map exported rows into internal content and metrics", () => {
  const provider = new CsvPresetProvider();
  const cases = [
    ["douyin", "作品ID,标题,发布时间,播放量,点赞数,评论数,收藏数,分享数,涨粉\ndy-1,抖音导出,2026-06-01T09:00:00.000Z,100,10,2,3,1,1", "douyin"],
    ["xiaohongshu", "笔记ID,标题,发布时间,浏览量,点赞,评论,收藏,分享,涨粉\nxhs-1,小红书导出,2026-06-01T09:00:00.000Z,200,20,4,30,2,2", "xiaohongshu"],
    ["wechat", "文章ID,标题,发布时间,阅读,点赞,评论,收藏,分享,涨粉\nwx-1,公众号导出,2026-06-01T09:00:00.000Z,300,30,6,9,3,3", "wechat"],
    ["video_account", "视频ID,标题,发布时间,播放,点赞,评论,收藏,转发,涨粉\nva-1,视频号导出,2026-06-01T09:00:00.000Z,400,40,8,12,4,4", "video_account"],
    ["bilibili", "稿件ID,标题,发布时间,播放,点赞,评论,收藏,分享,涨粉\nbili-1,B站导出,2026-06-01T09:00:00.000Z,500,50,10,15,5,5", "bilibili"]
  ] as const;
  for (const [preset, csv, platform] of cases) {
    const payload = provider.fromCsv(csv, preset);
    assert.equal(payload.source, "csv");
    assert.equal(payload.contents[0].platform, platform);
    assert.equal(payload.metrics[0].platform, platform);
    assert.ok(payload.metrics[0].views > 0);
  }
});

test("mediacrawler json provider creates content, metrics, and idea signals", () => {
  const payload = new MediaCrawlerImportProvider().fromJson({
    platform: "xhs",
    items: [{ note_id: "mc-1", title: "爆款AI工具笔记", liked_count: 80, comment_count: 9, collected_count: 40, share_count: 7, keyword: "AI工具" }]
  });
  assert.equal(payload.source, "mediacrawler");
  assert.equal(payload.contents[0].platform, "xiaohongshu");
  assert.equal(payload.metrics[0].likes, 80);
  assert.ok(payload.ideas?.[0].title.includes("爆款AI工具笔记"));
});

test("n8n execution provider records workflow source and metrics", () => {
  const payload = new N8nExecutionProvider().fromJson({
    executionId: "exec-test",
    workflowName: "平台导出同步",
    items: [{ id: "n8n-1", title: "n8n同步内容", platform: "douyin", views: 700, likes: 33 }]
  });
  assert.equal(payload.source, "n8n");
  assert.equal(payload.contents[0].notes, "n8n:平台导出同步:exec-test");
  assert.equal(payload.metrics[0].views, 700);
  assert.ok(payload.warnings?.some((item) => item.includes("exec-test")));
});

test("wechat official provider reads token and analytics contracts without leaking secrets", async () => {
  const calls: Array<{ url: string; body?: string }> = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.includes("/cgi-bin/token")) return Response.json({ access_token: "test-token", expires_in: 7200 });
    if (url.includes("/datacube/getarticlesummary")) return Response.json({ list: [{ ref_date: "2026-06-01", title: "测试文章", int_page_read_count: 12, share_count: 2 }] });
    if (url.includes("/datacube/getusersummary")) return Response.json({ list: [{ ref_date: "2026-06-01", new_user: 1, cancel_user: 0 }] });
    return Response.json({ errcode: 40013, errmsg: "invalid appid" });
  }) as typeof fetch;
  const provider = new WechatOfficialProvider({ appId: "wx-test", appSecret: "secret-test" }, fakeFetch);
  const token = await provider.getAccessToken();
  const article = await provider.getArticleSummary(token.accessToken, "2026-06-01", "2026-06-01");
  const users = await provider.getUserSummary(token.accessToken, "2026-06-01", "2026-06-01");
  assert.equal(token.expiresIn, 7200);
  assert.equal(article[0].int_page_read_count, 12);
  assert.equal(users[0].new_user, 1);
  assert.ok(calls[0].url.includes("secret=secret-test"));
});

test("sqlite repo stores imported payloads and logs", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const payload = await new FakeSelfMediaProvider().importSample();
    const run = repo.savePayload(payload);
    assert.equal(run.status, "success");
    assert.equal(repo.listContents().length, payload.contents.length);
    assert.equal(repo.listMetrics().length, payload.metrics.length);
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("review generator creates structured data and markdown", async () => {
  const payload = await new FakeSelfMediaProvider().importSample();
  const review = generateReview("weekly", payload.contents, payload.metrics);
  assert.equal(review.period, "weekly");
  assert.ok(review.markdown.includes("# 周复盘"));
  assert.ok(review.metrics.totalViews > 0);
  assert.ok(review.actions.length >= 1);
});

test("service dashboard returns the complete backend workbench snapshot", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-service-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const snapshot = await service.dashboard();
    assert.ok(snapshot.contents.length >= 3);
    assert.ok(snapshot.weeklyReview.markdown.includes("下一步"));
    assert.ok(snapshot.logs.some((log) => log.event === "self_media.seed"));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("import request records CSV data, traceable logs, and review uses imported metrics", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-import-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({
      mode: "csv",
      csv: [
        "id,title,platform,status,format,topic,views,likes,comments,saves,shares,followersDelta",
        "real-1,真实导入内容,douyin,published,short_video,真实数据,2400,120,12,33,9,7"
      ].join("\n")
    });
    assert.equal(result.run.status, "success");
    assert.ok(result.traceId.startsWith("import"));
    const snapshot = await service.dashboard();
    assert.ok(snapshot.contents.some((item) => item.id === "real-1"));
    assert.ok(snapshot.weeklyReview.metrics.totalViews >= 2400);
    assert.ok(snapshot.logs.some((log) => log.event === "self_media.import" && log.traceId === result.traceId));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("failed import request is observable through import run and warning log", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-import-fail-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({ mode: "csv", csv: "" });
    assert.equal(result.run.status, "failed");
    assert.ok(result.run.errorMessage);
    assert.ok(repo.listImports().some((item) => item.id === result.run.id && item.status === "failed"));
    assert.ok(repo.listLogs().some((log) => log.event === "self_media.import_failed" && log.traceId === result.traceId));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("import preview detects duplicates without creating import run", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-preview-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    const beforeRuns = repo.listImports().length;
    const preview = service.previewImportRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,播放量,点赞数", "content-ai-short-001,重复内容预览,999,9"].join("\n")
    });
    assert.equal(preview.source, "csv");
    assert.equal(preview.contentCount, 1);
    assert.ok(preview.duplicateContentIds.includes("content-ai-short-001"));
    assert.equal(repo.listImports().length, beforeRuns);
    assert.ok(repo.listLogs().some((log) => log.event === "self_media.import_preview"));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("service imports mediacrawler and n8n through unified request contract", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-connectors-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const mediaCrawler = service.importRequest({
      mode: "mediacrawler",
      json: { platform: "douyin", items: [{ aweme_id: "mc-dy-1", desc: "MediaCrawler抖音内容", play_count: 1100, digg_count: 66 }] }
    });
    const n8n = service.importRequest({
      mode: "n8n",
      json: { executionId: "exec-contract", workflowName: "导入回收", items: [{ id: "n8n-contract-1", title: "n8n内容", platform: "wechat", views: 500 }] }
    });
    const snapshot = await service.dashboard();
    assert.equal(mediaCrawler.run.status, "success");
    assert.equal(n8n.run.status, "success");
    assert.ok(snapshot.contents.some((item) => item.id === "mc-dy-1"));
    assert.ok(snapshot.contents.some((item) => item.id === "n8n-contract-1"));
    assert.ok(snapshot.weeklyReview.metrics.totalViews >= 1600);
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("publish queue state machine accepts legal transitions and rejects illegal jumps", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-queue-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    repo.upsertEntity("queue", "queue-test", {
      id: "queue-test",
      contentId: "content-test",
      platform: "douyin",
      status: "draft",
      scheduledAt: "2026-06-02T09:00:00.000Z"
    });
    const accepted = service.updatePublishQueueStatus({ id: "queue-test", status: "needs_review" });
    const rejected = service.updatePublishQueueStatus({ id: "queue-test", status: "published" });
    assert.equal(accepted.ok, true);
    assert.equal(accepted.item?.status, "needs_review");
    assert.equal(rejected.ok, false);
    assert.ok(repo.listLogs().some((log) => log.event === "self_media.queue_transition_failed"));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("idea can become draft content and enter publish queue", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-idea-content-"));
  try {
    const repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.createIdea({ title: "AI表达训练", platform: "video_account", rationale: "每天一条真人表达。" });
    const converted = service.convertIdeaToContent({ id: created.idea.id, scheduledAt: "2026-06-04T09:00:00.000Z" });
    assert.equal(converted.idea.status, "produced");
    assert.equal(converted.content.status, "draft");
    assert.equal(converted.queue.status, "draft");
    assert.ok(repo.listContents().some((item) => item.id === converted.content.id));
    assert.ok(repo.listQueue().some((item) => item.id === converted.queue.id));
    repo.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("monetization lead appears in review action context", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-lead-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    service.createLead({ source: "线下社群", demand: "AI短片咨询", nextAction: "发送案例并约时间", valueEstimate: 3000, status: "follow_up" });
    const snapshot = await service.dashboard();
    assert.ok(snapshot.leads.some((lead) => lead.demand === "AI短片咨询"));
    assert.ok(snapshot.weeklyReview.markdown.includes("活跃变现线索"));
    assert.ok(snapshot.weeklyReview.actions.some((action) => action.title.includes("发送案例并约时间")));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("confirmed import creates platform versions and dated metric snapshots", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-v15-import-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const result = service.importRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,发布时间,播放量,点赞数", "v15-dy-1,V1.5导入,2026-06-01T09:00:00.000Z,1200,55"].join("\n")
    });
    assert.equal(result.run.status, "success");
    assert.ok(repo.listPlatformVersions().some((item) => item.id === "version-v15-dy-1-douyin"));
    assert.ok(repo.listMetricSnapshots().some((item) => item.platformVersionId === "version-v15-dy-1-douyin" && item.snapshotDate === "2026-06-01"));
    const preview = service.previewImportRequest({
      mode: "csv",
      preset: "douyin",
      csv: ["作品ID,标题,发布时间,播放量,点赞数", "v15-dy-1,V1.5导入,2026-06-01T09:00:00.000Z,1500,80"].join("\n")
    });
    assert.ok(preview.diff.some((item) => item.kind === "update"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("content can have multiple platform versions and rejects illegal status jumps", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-versions-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    repo.upsertEntity("contents", "content-v15-1", { id: "content-v15-1", title: "多平台内容", platform: "douyin", status: "draft", format: "short_video", topic: "V1.5" });
    const douyin = service.upsertPlatformVersion({ contentId: "content-v15-1", platform: "douyin", title: "抖音版本", body: "短文案" });
    const wechat = service.upsertPlatformVersion({ contentId: "content-v15-1", platform: "wechat", title: "公众号版本", body: "长文案" });
    const rejected = (() => {
      try {
        service.patchPlatformVersion({ id: douyin.version.id, status: "published" });
        return false;
      } catch {
        return true;
      }
    })();
    const ok = service.patchPlatformVersion({ id: douyin.version.id, status: "needs_review", checklist: { title: true, platformFit: true } });
    assert.equal(rejected, true);
    assert.equal(ok.version.status, "needs_review");
    assert.equal(repo.listPlatformVersions().filter((item) => item.contentId === "content-v15-1").length, 2);
    assert.ok(wechat.version.id);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("calendar filters by platform and status from platform versions", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-calendar-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    service.upsertPlatformVersion({ contentId: "c1", platform: "douyin", title: "抖音排期", scheduledAt: "2026-06-03T09:00:00.000Z", status: "scheduled" });
    service.upsertPlatformVersion({ contentId: "c1", platform: "wechat", title: "公众号排期", scheduledAt: "2026-06-04T09:00:00.000Z", status: "draft" });
    const filtered = service.calendar({ view: "week", platform: "douyin", status: "scheduled" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].platform, "douyin");
    assert.equal(filtered[0].status, "scheduled");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("platform version patch updates scheduledAt in calendar results", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-calendar-patch-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const created = service.upsertPlatformVersion({ contentId: "calendar-patch-content", platform: "douyin", title: "拖拽排期测试", scheduledAt: "2026-06-03T09:00:00.000Z", status: "scheduled" });
    service.patchPlatformVersion({ id: created.version.id, scheduledAt: "2026-06-05T09:00:00.000Z" });
    const calendarItem = service.calendar({ view: "week" }).find((item) => item.platformVersionId === created.version.id);
    assert.equal(calendarItem?.scheduledAt, "2026-06-05T09:00:00.000Z");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("saved review stores action items and evidence-backed insights", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-saved-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    const version = service.upsertPlatformVersion({ contentId: "content-ai-short-001", platform: "douyin", title: "AI短片复盘", status: "scheduled" });
    service.upsertMetricSnapshot({ platformVersionId: version.version.id, snapshotDate: "2026-06-01", views: 2200, likes: 100, source: "manual" });
    const saved = service.saveReview({ period: "weekly" });
    assert.equal(saved.review.period, "weekly");
    assert.ok(saved.review.metricSnapshotIds.length >= 1);
    assert.ok(saved.actionItems.length >= 1);
    assert.ok(saved.review.insights.some((item) => item.evidenceRefs.length > 0));
    const updated = service.updateActionItem({ id: saved.actionItems[0].id, status: "doing", nextAction: "今天完成" });
    assert.equal(updated.actionItem.status, "doing");
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("monthly review save and action status update are visible in dashboard", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-monthly-review-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    await service.dashboard();
    const saved = service.saveReview({ period: "monthly" });
    const updated = service.updateActionItem({ id: saved.actionItems[0].id, status: "done", nextAction: "月度动作已完成" });
    const snapshot = await service.dashboard();
    assert.ok(snapshot.savedReviews.some((item) => item.id === saved.review.id && item.period === "monthly"));
    assert.ok(snapshot.actionItems.some((item) => item.id === updated.actionItem.id && item.status === "done"));
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("lead status and automation runs are traceable internal facts", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "self-media-automation-"));
  let repo: SqliteSelfMediaRepo | undefined;
  try {
    repo = new SqliteSelfMediaRepo(path.join(dir, "test.sqlite"));
    const service = new SelfMediaService(repo);
    const lead = service.createLead({ source: "朋友介绍", demand: "AI工作流搭建", nextAction: "发送报价", valueEstimate: 5000 });
    const updatedLead = service.updateLead({ id: lead.lead.id, status: "contacted", nextAction: "等待回复" });
    const success = service.createAutomationRun({ kind: "n8n_import", status: "success", source: "n8n" });
    const retry = service.createAutomationRun({ kind: "local_runner", status: "retrying", errorMessage: "临时失败" });
    assert.equal(updatedLead.lead.status, "contacted");
    assert.ok(success.run.traceId.startsWith("automation"));
    assert.equal(retry.run.retryCount, 1);
    assert.equal(repo.listAutomationRuns().length, 2);
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
