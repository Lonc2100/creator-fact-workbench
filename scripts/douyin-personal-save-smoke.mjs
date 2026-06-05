#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo/sqlite-self-media-repo.ts";
import { SelfMediaService } from "../src/domain/self-media/service/self-media-service.ts";

const OUT_DIR = path.join(process.cwd(), ".local", "douyin-personal-v1");
const PREVIEW_PATH = path.join(OUT_DIR, "mapping-preview.json");
const REPORT_PATH = path.join(OUT_DIR, "save-smoke-report.json");
const SENSITIVE_TERMS = [
  "cookie",
  "authorization",
  "auth[_-]?header",
  "access[_-]?" + "token",
  "refresh[_-]?" + "token",
  "ms" + "Token",
  "a_" + "bogus",
  "x-" + "signature",
  "passport",
  "sessionid"
];
const SENSITIVE_PATTERN = new RegExp(`(${SENSITIVE_TERMS.join("|")})`, "i");

function runImportSave() {
  const result = spawnSync("npm run import:douyin -- --save", {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    windowsHide: true
  });
  if (result.status !== 0) {
    const output = result.stderr || result.stdout || result.error?.message || "unknown spawn failure";
    throw new Error(`npm run import:douyin -- --save failed: ${output.slice(0, 2000)}`);
  }
  return {
    stdout: result.stdout.slice(0, 2000),
    stderr: result.stderr.slice(0, 2000)
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readPreview() {
  assert(existsSync(PREVIEW_PATH), `missing preview output: ${PREVIEW_PATH}`);
  return JSON.parse(readFileSync(PREVIEW_PATH, "utf8"));
}

function scanText(name, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return { name, ok: !SENSITIVE_PATTERN.test(text) };
}

mkdirSync(OUT_DIR, { recursive: true });
const beforeRepo = new SqliteSelfMediaRepo();
const before = {
  imports: beforeRepo.listImports().filter((item) => item.source === "douyin_creator_center").length,
  contents: beforeRepo.listContents().filter((item) => item.platform === "douyin").length,
  metricSnapshots: beforeRepo.listMetricSnapshots().filter((item) => item.source === "douyin_creator_center").length
};
beforeRepo.close();

const commandOutput = runImportSave();
const preview = readPreview();
const expectedIds = (preview.payload?.contents ?? []).map((item) => item.id);
const expectedMetricIds = (preview.payload?.metrics ?? []).map((item) => item.contentId);
const expectedTotalViews = (preview.payload?.metrics ?? []).reduce((sum, item) => sum + (item.views ?? 0), 0);

assert(preview.saved === true, "mapping preview should record saved=true after --save");
assert(preview.payload?.source === "douyin_creator_center", "preview source should be douyin_creator_center");
assert(expectedIds.length > 0, "preview should contain mapped Douyin content ids");
assert(expectedMetricIds.length === expectedIds.length, "preview metric count should match content count");
assert(preview.importResult?.run?.source === "douyin_creator_center", "import run source should be douyin_creator_center");
assert(preview.importResult?.run?.status === "success", "import run should succeed");

const repo = new SqliteSelfMediaRepo();
try {
  const service = new SelfMediaService(repo);
  const dashboard = await service.dashboard();
  const contents = repo.listContents().filter((item) => expectedIds.includes(item.id));
  const metrics = repo.listMetrics().filter((item) => expectedIds.includes(item.contentId) && item.platform === "douyin");
  const versions = repo.listPlatformVersions().filter((item) => expectedIds.includes(item.contentId) && item.platform === "douyin");
  const snapshots = repo.listMetricSnapshots().filter((item) => expectedIds.includes(item.contentId) && item.source === "douyin_creator_center");
  const imports = repo.listImports().filter((item) => item.source === "douyin_creator_center");
  const dashboardContents = dashboard.contents.filter((item) => expectedIds.includes(item.id));
  const dashboardMetrics = dashboard.metrics.filter((item) => expectedIds.includes(item.contentId) && item.platform === "douyin");
  const dashboardSnapshots = dashboard.metricSnapshots.filter((item) => expectedIds.includes(item.contentId) && item.source === "douyin_creator_center");
  const dashboardVersions = dashboard.platformVersions.filter((item) => expectedIds.includes(item.contentId) && item.platform === "douyin");

  assert(contents.length === expectedIds.length, "saved contents should include every mapped Douyin item");
  assert(metrics.length === expectedIds.length, "saved metrics should include every mapped Douyin item");
  assert(versions.length === expectedIds.length, "saved platform versions should include every mapped Douyin item");
  assert(snapshots.length === expectedIds.length, "metric snapshots should include every mapped Douyin item");
  assert(imports.length > before.imports, "a new Douyin import run should be recorded");
  assert(dashboardContents.length === expectedIds.length, "dashboard should include saved Douyin contents");
  assert(dashboardMetrics.length === expectedIds.length, "dashboard should include saved Douyin metrics");
  assert(dashboardSnapshots.length === expectedIds.length, "dashboard should include saved Douyin metric snapshots");
  assert(dashboardVersions.length === expectedIds.length, "dashboard should include saved Douyin platform versions");
  assert(dashboard.weeklyReview.metrics.totalViews >= expectedTotalViews, "weekly review should include imported Douyin metric views");
  assert(dashboard.monthlyReview.metrics.totalViews >= expectedTotalViews, "monthly review should include imported Douyin metric views");

  const safetyChecks = [
    scanText("mapping-preview", preview),
    scanText("command-output", commandOutput),
    scanText("saved-content-notes", contents.map((item) => item.notes ?? "")),
    scanText("smoke-report-intended", { expectedIds, importRunId: preview.importResult?.run?.id })
  ];
  assert(safetyChecks.every((item) => item.ok), `sensitive pattern found in smoke outputs: ${safetyChecks.filter((item) => !item.ok).map((item) => item.name).join(", ")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    command: "npm run import:douyin -- --save",
    passed: true,
    before,
    after: {
      imports: imports.length,
      contents: repo.listContents().filter((item) => item.platform === "douyin").length,
      metrics: repo.listMetrics().filter((item) => item.platform === "douyin").length,
      metricSnapshots: repo.listMetricSnapshots().filter((item) => item.source === "douyin_creator_center").length
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
      expectedDouyinViews: expectedTotalViews,
      safetyChecks
    },
    warnings: preview.payload.warnings ?? []
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT_PATH, passed: true, source: report.source, contentCount: report.contentCount, metricCount: report.metricCount, importRunId: report.importRunId }, null, 2));
} finally {
  repo.close();
}
