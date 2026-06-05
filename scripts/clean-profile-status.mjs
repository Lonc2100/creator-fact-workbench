import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { resolveSelfMediaLocalProfile, resolveSelfMediaSeedMode, resolveWorkbenchDbPath, workbenchDbPath } from "../src/domain/self-media/config/self-media-config.ts";
import { SqliteSelfMediaRepo } from "../src/domain/self-media/repo/sqlite-self-media-repo.ts";
import { SelfMediaService } from "../src/domain/self-media/service/self-media-service.ts";

process.env.SELF_MEDIA_PROFILE ??= "clean";
process.env.SELF_MEDIA_SEED_MODE ??= "off";

const outputDir = path.resolve(process.cwd(), ".local/clean-profile");
const reportJsonPath = path.join(outputDir, "report.json");
const reportMdPath = path.join(outputDir, "report.md");
const demoSmokePattern = /(^|[-_\s:])(demo|smoke|sample|seed|fake|test|o2|save-smoke|platform-smoke)([-_\s:]|$)|烟测|演示|样例/i;

function hasDemoSmokeText(items) {
  return items.some((item) => demoSmokePattern.test(JSON.stringify(item).toLowerCase()));
}

function toMarkdown(report) {
  return [
    "# Clean Profile Status",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Active profile: ${report.profile}`,
    `- Seed mode: ${report.seedMode}`,
    `- Clean DB path: ${report.dbPath}`,
    `- Dirty/history DB path: ${report.dirtyProfilePath}`,
    `- Dirty/history DB exists: ${report.dirtyProfileExists}`,
    `- Dashboard trusted: ${report.dashboard.isDefaultDashboardTrusted}`,
    `- Content rows: ${report.repo.contentCount}`,
    `- Metric snapshot rows: ${report.repo.metricSnapshotCount}`,
    `- Import runs: ${report.repo.importRunCount}`,
    `- Demo/smoke detected: ${report.safety.demoSmokeDetected}`,
    "",
    "## Safe Commands",
    "",
    "- PowerShell clean profile: `$env:SELF_MEDIA_PROFILE='clean'; $env:SELF_MEDIA_SEED_MODE='off'; npm run dev`",
    "- PowerShell return to dirty/history profile: `Remove-Item Env:SELF_MEDIA_PROFILE -ErrorAction SilentlyContinue; Remove-Item Env:SELF_MEDIA_SEED_MODE -ErrorAction SilentlyContinue; Remove-Item Env:SELF_MEDIA_DB_PATH -ErrorAction SilentlyContinue; npm run dev`",
    "- Explicit clean DB path: `$env:SELF_MEDIA_DB_PATH='.local/self-media-clean.sqlite'; $env:SELF_MEDIA_SEED_MODE='off'; npm run dev`",
    "",
    "No files or database rows were deleted by this command."
  ].join("\n") + "\n";
}

mkdirSync(outputDir, { recursive: true });

const repo = new SqliteSelfMediaRepo();
try {
  const service = new SelfMediaService(repo);
  const snapshot = await service.dashboard();
  const contents = repo.listContents();
  const metrics = repo.listMetrics();
  const metricSnapshots = repo.listMetricSnapshots();
  const imports = repo.listImports();
  const logs = repo.listLogs(100);
  const dbPath = path.resolve(process.cwd(), resolveWorkbenchDbPath());
  const dirtyProfilePath = path.resolve(process.cwd(), workbenchDbPath);
  const report = {
    generatedAt: new Date().toISOString(),
    profile: resolveSelfMediaLocalProfile(),
    seedMode: resolveSelfMediaSeedMode(),
    dbPath,
    dirtyProfilePath,
    dirtyProfileExists: existsSync(dirtyProfilePath),
    repo: {
      contentCount: contents.length,
      metricCount: metrics.length,
      metricSnapshotCount: metricSnapshots.length,
      importRunCount: imports.length,
      seedLogCount: logs.filter((log) => log.event === "self_media.seed").length
    },
    dashboard: {
      contentCount: snapshot.contents.length,
      metricSnapshotCount: snapshot.metricSnapshots.length,
      trustedContentCount: snapshot.realDataScope.trustedContentCount,
      excludedMetricSnapshotCount: snapshot.realDataScope.excludedMetricSnapshotCount,
      isDefaultDashboardTrusted: snapshot.realDataScope.isDefaultDashboardTrusted
    },
    safety: {
      destructiveActions: false,
      databaseDeletes: false,
      dirtyProfileModified: false,
      demoSmokeDetected: hasDemoSmokeText([...contents, ...metrics, ...metricSnapshots, ...imports])
    }
  };
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, toMarkdown(report), "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.safety.demoSmokeDetected ? "warn" : "ok",
        profile: report.profile,
        seedMode: report.seedMode,
        dbPath: path.relative(process.cwd(), report.dbPath),
        dirtyProfileExists: report.dirtyProfileExists,
        repo: report.repo,
        dashboard: report.dashboard,
        reportJson: path.relative(process.cwd(), reportJsonPath),
        reportMd: path.relative(process.cwd(), reportMdPath)
      },
      null,
      2
    )
  );
} finally {
  repo.close();
}
