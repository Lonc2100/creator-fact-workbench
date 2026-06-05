#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { XiaohongshuPersonalProvider } from "../src/domain/self-media/providers/xiaohongshu-personal-provider.ts";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo/sqlite-self-media-repo.ts";
import { importXiaohongshuPersonalCaptures } from "../src/domain/self-media/runtime/self-media-runtime.ts";
import { SelfMediaService } from "../src/domain/self-media/service/self-media-service.ts";

const OUT_DIR = path.join(process.cwd(), ".local", "xiaohongshu-personal-v1");
const RAW_DIR = path.join(process.cwd(), ".local", "xiaohongshu-personal-v0", "raw");
const PREVIEW_PATH = path.join(OUT_DIR, "mapping-preview.json");
const REPORT_PATH = path.join(OUT_DIR, "save-smoke-report.json");
const SENSITIVE_TERMS = [
  "cookie",
  "authorization",
  "auth[_-]?header",
  "access[_-]?" + "token",
  "refresh[_-]?" + "token",
  "web[_-]?session",
  "xsec",
  "x-s",
  "x-t",
  "passport",
  "sessionid"
];
const SENSITIVE_PATTERN = new RegExp(`(${SENSITIVE_TERMS.join("|")})`, "i");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadCaptures(rawDir) {
  return readdirSync(rawDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const capture = JSON.parse(readFileSync(path.join(rawDir, file), "utf8"));
      return { ...capture, file: capture.file ?? `raw/${file}` };
    });
}

function summarizePayload(payload) {
  return {
    source: payload.source,
    contentCount: payload.contents.length,
    metricCount: payload.metrics.length,
    contents: payload.contents.map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      format: item.format,
      publishedAt: item.publishedAt,
      notes: item.notes
    })),
    metrics: payload.metrics.map((item) => ({
      id: item.id,
      contentId: item.contentId,
      platform: item.platform,
      capturedAt: item.capturedAt,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      saves: item.saves,
      shares: item.shares,
      followersDelta: item.followersDelta
    })),
    warnings: payload.warnings ?? []
  };
}

function scanText(name, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return { name, ok: !SENSITIVE_PATTERN.test(text) };
}

mkdirSync(OUT_DIR, { recursive: true });
assert(existsSync(RAW_DIR), `missing raw capture dir: ${RAW_DIR}`);
const beforeRepo = new SqliteSelfMediaRepo();
const before = {
  imports: beforeRepo.listImports().filter((item) => item.source === "xiaohongshu_creator_center").length,
  contents: beforeRepo.listContents().filter((item) => item.platform === "xiaohongshu").length,
  metricSnapshots: beforeRepo.listMetricSnapshots().filter((item) => item.source === "xiaohongshu_creator_center").length
};
beforeRepo.close();

const captures = loadCaptures(RAW_DIR);
const payload = new XiaohongshuPersonalProvider().fromCaptures(captures);
const importResult = await importXiaohongshuPersonalCaptures(captures);
const preview = {
  generatedAt: new Date().toISOString(),
  rawDir: RAW_DIR,
  saved: true,
  payload: summarizePayload(payload),
  importResult
};
writeFileSync(PREVIEW_PATH, JSON.stringify(preview, null, 2));
const expectedIds = (preview.payload?.contents ?? []).map((item) => item.id);
const expectedMetricIds = (preview.payload?.metrics ?? []).map((item) => item.contentId);
const expectedTotalViews = (preview.payload?.metrics ?? []).reduce((sum, item) => sum + (item.views ?? 0), 0);

assert(preview.saved === true, "mapping preview should record saved=true after --save");
assert(preview.payload?.source === "xiaohongshu_creator_center", "preview source should be xiaohongshu_creator_center");
assert(expectedIds.length > 0, "preview should contain mapped Xiaohongshu content ids");
assert(expectedMetricIds.length === expectedIds.length, "preview metric count should match content count");
assert(preview.importResult?.run?.source === "xiaohongshu_creator_center", "import run source should be xiaohongshu_creator_center");
assert(preview.importResult?.run?.status === "success", "import run should succeed");

const repo = new SqliteSelfMediaRepo();
try {
  const service = new SelfMediaService(repo);
  const dashboard = await service.dashboard();
  const contents = repo.listContents().filter((item) => expectedIds.includes(item.id));
  const metrics = repo.listMetrics().filter((item) => expectedIds.includes(item.contentId) && item.platform === "xiaohongshu");
  const versions = repo.listPlatformVersions().filter((item) => expectedIds.includes(item.contentId) && item.platform === "xiaohongshu");
  const snapshots = repo.listMetricSnapshots().filter((item) => expectedIds.includes(item.contentId) && item.source === "xiaohongshu_creator_center");
  const imports = repo.listImports().filter((item) => item.source === "xiaohongshu_creator_center");
  const dashboardContents = dashboard.contents.filter((item) => expectedIds.includes(item.id));
  const dashboardMetrics = dashboard.metrics.filter((item) => expectedIds.includes(item.contentId) && item.platform === "xiaohongshu");
  const dashboardSnapshots = dashboard.metricSnapshots.filter((item) => expectedIds.includes(item.contentId) && item.source === "xiaohongshu_creator_center");
  const dashboardVersions = dashboard.platformVersions.filter((item) => expectedIds.includes(item.contentId) && item.platform === "xiaohongshu");

  assert(contents.length === expectedIds.length, "saved contents should include every mapped Xiaohongshu item");
  assert(metrics.length === expectedIds.length, "saved metrics should include every mapped Xiaohongshu item");
  assert(versions.length === expectedIds.length, "saved platform versions should include every mapped Xiaohongshu item");
  assert(snapshots.length === expectedIds.length, "metric snapshots should include every mapped Xiaohongshu item");
  assert(imports.length > before.imports, "a new Xiaohongshu import run should be recorded");
  assert(dashboardContents.length === expectedIds.length, "dashboard should include saved Xiaohongshu contents");
  assert(dashboardMetrics.length === expectedIds.length, "dashboard should include saved Xiaohongshu metrics");
  assert(dashboardSnapshots.length === expectedIds.length, "dashboard should include saved Xiaohongshu metric snapshots");
  assert(dashboardVersions.length === expectedIds.length, "dashboard should include saved Xiaohongshu platform versions");
  assert(dashboard.weeklyReview.metrics.totalViews >= expectedTotalViews, "weekly review should include imported Xiaohongshu metric views");
  assert(dashboard.monthlyReview.metrics.totalViews >= expectedTotalViews, "monthly review should include imported Xiaohongshu metric views");

  const safetyChecks = [
    scanText("mapping-preview", preview),
    scanText("saved-content-notes", contents.map((item) => item.notes ?? "")),
    scanText("smoke-report-intended", { expectedIds, importRunId: preview.importResult?.run?.id })
  ];
  assert(safetyChecks.every((item) => item.ok), `sensitive pattern found in smoke outputs: ${safetyChecks.filter((item) => !item.ok).map((item) => item.name).join(", ")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    command: "npm run smoke:xiaohongshu-save",
    savePath: "runtime:importXiaohongshuPersonalCaptures",
    passed: true,
    before,
    after: {
      imports: imports.length,
      contents: repo.listContents().filter((item) => item.platform === "xiaohongshu").length,
      metrics: repo.listMetrics().filter((item) => item.platform === "xiaohongshu").length,
      metricSnapshots: repo.listMetricSnapshots().filter((item) => item.source === "xiaohongshu_creator_center").length
    },
    source: preview.payload.source,
    contentCount: expectedIds.length,
    metricCount: expectedMetricIds.length,
    importRunId: preview.importResult.run.id,
    contentIds: expectedIds,
    checks: {
      savedFlag: preview.saved,
      contents: contents.length,
      metrics: metrics.length,
      platformVersions: versions.length,
      metricSnapshots: snapshots.length,
      imports: imports.length,
      dashboardContents: dashboardContents.length,
      dashboardMetrics: dashboardMetrics.length,
      dashboardMetricSnapshots: dashboardSnapshots.length,
      dashboardPlatformVersions: dashboardVersions.length,
      weeklyReviewTotalViews: dashboard.weeklyReview.metrics.totalViews,
      monthlyReviewTotalViews: dashboard.monthlyReview.metrics.totalViews,
      expectedXiaohongshuViews: expectedTotalViews,
      safetyChecks
    },
    warnings: preview.payload.warnings ?? []
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT_PATH, passed: true, source: report.source, contentCount: report.contentCount, metricCount: report.metricCount, importRunId: report.importRunId }, null, 2));
} finally {
  repo.close();
}
