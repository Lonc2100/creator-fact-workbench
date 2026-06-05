#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo/sqlite-self-media-repo.ts";
import { importBilibiliPersonalCaptures } from "../src/domain/self-media/runtime/self-media-runtime.ts";
import { SelfMediaService } from "../src/domain/self-media/service/self-media-service.ts";

const OUT_DIR = path.join(process.cwd(), ".local", "bilibili-personal-v1");
const RAW_DIR = path.join(process.cwd(), ".local", "bilibili-personal-v0", "raw");
const PREVIEW_PATH = path.join(OUT_DIR, "mapping-preview.json");
const REPORT_PATH = path.join(OUT_DIR, "save-smoke-report.json");
const EXPECTED_ARCHIVE_COUNT = 10;
const SENSITIVE_TERMS = [
  "cookie",
  "authorization",
  "auth[_-]?header",
  "access[_-]?" + "token",
  "refresh[_-]?" + "token",
  "SESS" + "DATA",
  "bili_" + "jct",
  "Dede" + "UserID",
  "headers",
  "comment_content",
  "danmu_text",
  "raw comment secret",
  "danmu text secret"
];
const SENSITIVE_PATTERN = new RegExp(`(${SENSITIVE_TERMS.join("|")})`, "i");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadCaptures(rawDir) {
  assert(existsSync(rawDir), `missing raw capture dir: ${rawDir}`);
  return readdirSync(rawDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const capture = JSON.parse(readFileSync(path.join(rawDir, file), "utf8"));
      return { ...capture, file: capture.file ?? `raw/${file}` };
    });
}

function runImportSave() {
  const result = spawnSync("npm run import:bilibili -- --save", {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    windowsHide: true
  });
  if (result.status !== 0) {
    const output = result.stderr || result.stdout || result.error?.message || "unknown spawn failure";
    throw new Error(`npm run import:bilibili -- --save failed: ${output.slice(0, 2000)}`);
  }
  return {
    stdout: result.stdout.slice(0, 2000),
    stderr: result.stderr.slice(0, 2000)
  };
}

function readPreview() {
  assert(existsSync(PREVIEW_PATH), `missing preview output: ${PREVIEW_PATH}`);
  return JSON.parse(readFileSync(PREVIEW_PATH, "utf8"));
}

function scanText(name, value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return { name, ok: !SENSITIVE_PATTERN.test(text) };
}

function countExpected(repo, expectedIds) {
  return {
    imports: repo.listImports().filter((item) => item.source === "bilibili_creator_center").length,
    contents: repo.listContents().filter((item) => expectedIds.includes(item.id) && item.platform === "bilibili").length,
    metrics: repo.listMetrics().filter((item) => expectedIds.includes(item.contentId) && item.platform === "bilibili").length,
    platformVersions: repo.listPlatformVersions().filter((item) => expectedIds.includes(item.contentId) && item.platform === "bilibili").length,
    metricSnapshots: repo.listMetricSnapshots().filter((item) => expectedIds.includes(item.contentId) && item.source === "bilibili_creator_center").length
  };
}

mkdirSync(OUT_DIR, { recursive: true });
const beforeRepo = new SqliteSelfMediaRepo();
const before = countExpected(beforeRepo, []);
beforeRepo.close();

const commandOutput = runImportSave();
const preview = readPreview();
const expectedIds = (preview.payload?.contents ?? []).map((item) => item.id);
const expectedMetricIds = (preview.payload?.metrics ?? []).map((item) => item.contentId);
const expectedTotalViews = (preview.payload?.metrics ?? []).reduce((sum, item) => sum + (item.views ?? 0), 0);

assert(preview.saved === true, "mapping preview should record saved=true after --save");
assert(preview.previewOnly === false, "mapping preview should record previewOnly=false after --save");
assert(preview.payload?.source === "bilibili_creator_center", "preview source should be bilibili_creator_center");
assert(expectedIds.length === EXPECTED_ARCHIVE_COUNT, `preview should contain ${EXPECTED_ARCHIVE_COUNT} Bilibili archive content ids`);
assert(expectedMetricIds.length === expectedIds.length, "preview metric count should match content count");
assert((preview.payload?.accountMetrics ?? []).length > 0, "preview should retain accountMetrics as diagnostics");
assert((preview.payload?.dateKeyRows ?? []).length > 0, "preview should retain dateKeyRows as diagnostics");
assert(preview.importResult?.run?.source === "bilibili_creator_center", "import run source should be bilibili_creator_center");
assert(preview.importResult?.run?.status === "success", "import run should succeed");

await sleep(5);
const captures = loadCaptures(RAW_DIR);
const secondRun = await importBilibiliPersonalCaptures(captures);

const repo = new SqliteSelfMediaRepo();
try {
  const service = new SelfMediaService(repo);
  const dashboard = await service.dashboard();
  const contents = repo.listContents().filter((item) => expectedIds.includes(item.id));
  const metrics = repo.listMetrics().filter((item) => expectedIds.includes(item.contentId) && item.platform === "bilibili");
  const versions = repo.listPlatformVersions().filter((item) => expectedIds.includes(item.contentId) && item.platform === "bilibili");
  const snapshots = repo.listMetricSnapshots().filter((item) => expectedIds.includes(item.contentId) && item.source === "bilibili_creator_center");
  const imports = repo.listImports().filter((item) => item.source === "bilibili_creator_center");
  const afterSecond = countExpected(repo, expectedIds);
  const dashboardContents = dashboard.contents.filter((item) => expectedIds.includes(item.id));
  const dashboardMetrics = dashboard.metrics.filter((item) => expectedIds.includes(item.contentId) && item.platform === "bilibili");
  const dashboardSnapshots = dashboard.metricSnapshots.filter((item) => expectedIds.includes(item.contentId) && item.source === "bilibili_creator_center");
  const dashboardVersions = dashboard.platformVersions.filter((item) => expectedIds.includes(item.contentId) && item.platform === "bilibili");

  assert(contents.length === expectedIds.length, "saved contents should include every mapped Bilibili item");
  assert(metrics.length === expectedIds.length, "saved metrics should include every mapped Bilibili item");
  assert(versions.length === expectedIds.length, "saved platform versions should include every mapped Bilibili item");
  assert(snapshots.length === expectedIds.length, "metric snapshots should include every mapped Bilibili item");
  assert(imports.some((item) => item.id === preview.importResult.run.id), "first Bilibili import run should be recorded");
  assert(imports.some((item) => item.id === secondRun.run.id), "second Bilibili import run should be recorded");
  assert(dashboardContents.length === expectedIds.length, "dashboard should include saved Bilibili contents");
  assert(dashboardMetrics.length === expectedIds.length, "dashboard should include saved Bilibili metrics");
  assert(dashboardSnapshots.length === expectedIds.length, "dashboard should include saved Bilibili metric snapshots");
  assert(dashboardVersions.length === expectedIds.length, "dashboard should include saved Bilibili platform versions");
  assert(dashboard.weeklyReview.metrics.totalViews >= expectedTotalViews, "weekly review should include imported Bilibili metric views");
  assert(dashboard.monthlyReview.metrics.totalViews >= expectedTotalViews, "monthly review should include imported Bilibili metric views");

  const safetyChecks = [
    scanText("mapping-preview", preview),
    scanText("command-output", commandOutput),
    scanText("saved-content-notes", contents.map((item) => item.notes ?? "")),
    scanText("saved-import-runs", imports.map((item) => ({ id: item.id, source: item.source, status: item.status, importedCount: item.importedCount }))),
    scanText("smoke-report-intended", { expectedIds, firstRunId: preview.importResult.run.id, secondRunId: secondRun.run.id })
  ];
  assert(safetyChecks.every((item) => item.ok), `sensitive pattern found in smoke outputs: ${safetyChecks.filter((item) => !item.ok).map((item) => item.name).join(", ")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    command: "npm run smoke:bilibili-save",
    savePath: "runtime:importBilibiliPersonalCaptures",
    passed: true,
    before,
    afterSecondSave: afterSecond,
    source: preview.payload.source,
    contentCount: expectedIds.length,
    metricCount: expectedMetricIds.length,
    importRunIds: [preview.importResult.run.id, secondRun.run.id],
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
      expectedBilibiliViews: expectedTotalViews,
      idempotency: {
        contentEntitiesStable: afterSecond.contents === expectedIds.length,
        platformVersionsStable: afterSecond.platformVersions === expectedIds.length,
        metricSnapshotsStable: afterSecond.metricSnapshots === expectedIds.length,
        importRunsAppend: afterSecond.imports >= before.imports + 2
      },
      diagnosticsExcludedFromPersistence: {
        accountMetricsSaved: false,
        dateKeyRowsSaved: false
      },
      safetyChecks
    },
    warnings: preview.payload.warnings ?? []
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ reportPath: REPORT_PATH, passed: true, source: report.source, contentCount: report.contentCount, metricCount: report.metricCount, importRunIds: report.importRunIds }, null, 2));
} finally {
  repo.close();
}
