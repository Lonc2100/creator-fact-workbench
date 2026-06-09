import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const trustedSources = [
  "douyin_creator_center",
  "xiaohongshu_creator_center",
  "video_account_creator_center",
  "bilibili_creator_center"
];
const trustedSourceSet = new Set(trustedSources);
const closedLoopPlatforms = ["douyin", "xiaohongshu", "video_account", "bilibili"];
const acceptancePattern = /(^|[\s:/._-])(mainline|human-mouse|calendar-real|creator day workflow|workflow)([\s:/._-]|$)|验收|回归|测试|走查|真实鼠标|人工鼠标|浏览器烟测|创作者一天流程|信息架构回归|AI选题计划|AI短片复盘|我最喜欢的小雏菊|小雏菊|想拍一条短视频|我的真实作品070测试|071验收测试|真实作品：六月内容计划|真实内容评估|05[0-9]|06[0-9]|07[0-2]/i;
const demoPattern = /(^|[\s:/._-])(smoke|sample|demo|fixture|debug|seed|fake|op-save)([\s:/._-]|$)|O2|烟测|浏览器烟测|BiliOpSave/i;

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function resolveDbPath() {
  const explicitPath = process.env.SELF_MEDIA_DB_PATH?.trim();
  if (explicitPath) return path.resolve(process.cwd(), explicitPath);
  return path.resolve(process.cwd(), process.env.SELF_MEDIA_PROFILE?.trim().toLowerCase() === "clean" ? ".local/self-media-clean.sqlite" : ".local/self-media.sqlite");
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function readLatestHealthFreshness() {
  const reportPath = path.resolve(process.cwd(), ".local/platform-data-health/report.json");
  if (!existsSync(reportPath)) {
    return {
      source: "missing",
      latestRealCaptureAt: null,
      latestSmokeAt: null,
      latestAuditAt: null,
      realCaptureAgeHours: null,
      smokeAgeHours: null,
      realCaptureIsStale: null,
      smokeIsStale: null,
      staleAfterHours: null
    };
  }
  const report = parseJson(readFileSync(reportPath, "utf8"), {});
  const freshness = report?.summary?.freshness ?? {};
  return {
    source: ".local/platform-data-health/report.json",
    latestRealCaptureAt: freshness.latestRealCaptureAt ?? null,
    latestSmokeAt: freshness.latestSmokeAt ?? null,
    latestAuditAt: null,
    realCaptureAgeHours: freshness.realCaptureAgeHours ?? null,
    smokeAgeHours: freshness.smokeAgeHours ?? null,
    realCaptureIsStale: freshness.realCaptureIsStale ?? null,
    smokeIsStale: freshness.smokeIsStale ?? null,
    staleAfterHours: report?.staleAfterHours ?? freshness.staleAfterHours ?? null,
    realCaptureEvidenceSource: freshness.realCaptureEvidenceSource ?? null,
    latestTrustedBrowserCaptureAt: freshness.latestTrustedBrowserCaptureAt ?? null,
    trustedBrowserCaptureRowCount: freshness.trustedBrowserCaptureRowCount ?? null
  };
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeText(...values) {
  return values
    .filter((value) => typeof value === "string" || typeof value === "number")
    .map(String)
    .join(" ");
}

function isTestOrDemoContent(content, snapshot) {
  const text = safeText(content?.id, content?.title, content?.topic, content?.notes, snapshot?.id, snapshot?.contentId, snapshot?.platformVersionId);
  return acceptancePattern.test(text) || demoPattern.test(text);
}

function contentDataDomain(content, snapshot) {
  if (content?.dataDomain) return content.dataDomain;
  if (snapshot?.dataDomain) return snapshot.dataDomain;
  if (isTestOrDemoContent(content, snapshot)) return acceptancePattern.test(safeText(content?.id, content?.title, content?.topic, content?.notes, snapshot?.id, snapshot?.contentId, snapshot?.platformVersionId)) ? "acceptance_run" : "demo_seed";
  return trustedSourceSet.has(snapshot?.source) ? "user_work" : "imported_metric";
}

function isUserExcludedFromTrustedScope(content) {
  return content?.userExcludedFromTrustedScope === true || content?.trustedScopeOverride === "exclude";
}

function provenanceEligible(provenance) {
  if (!provenance || typeof provenance !== "object") return undefined;
  if (provenance.isTestFixture === true) return false;
  if (provenance.trustedScopeEligible === false) return false;
  if (provenance.trustedScopeEligible === true) return true;
  return undefined;
}

function isTrustedSnapshot(snapshot, contentsById) {
  if (!trustedSourceSet.has(snapshot.source)) return false;
  const content = contentsById.get(snapshot.contentId);
  if (isUserExcludedFromTrustedScope(content)) return false;
  if (contentDataDomain(content, snapshot) !== "user_work") return false;
  if (snapshot.dataDomain && snapshot.dataDomain !== "user_work") return false;
  const eligible = provenanceEligible(snapshot.provenance);
  if (eligible !== undefined) return eligible;
  if (content?.trustedScopeOverride === "include") return true;
  return !isTestOrDemoContent(content, snapshot);
}

function readCollection(db, collection) {
  const rows = db.prepare("SELECT id, data FROM entities WHERE collection = ? ORDER BY updated_at DESC").all(collection);
  return rows.map((row) => ({ id: row.id, ...parseJson(row.data, {}) }));
}

function readRows(dbPath) {
  if (!existsSync(dbPath)) return { status: "missing_db" };
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    const tableNames = new Set(tableRows.map((row) => row.name));
    if (!tableNames.has("entities") || !tableNames.has("import_runs")) return { status: "missing_tables" };
    return {
      status: "ok",
      contents: readCollection(db, "contents"),
      metrics: readCollection(db, "metrics"),
      metricSnapshots: readCollection(db, "metricSnapshots"),
      imports: db.prepare("SELECT data FROM import_runs ORDER BY started_at DESC").all().map((row) => parseJson(row.data, {}))
    };
  } finally {
    db.close();
  }
}

function emptyDistribution() {
  return {
    contentCount: 0,
    metricSnapshotCount: 0,
    views: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    followersDelta: 0,
    engagement: 0
  };
}

function addToDistribution(target, key, snapshot, contentIdSet) {
  const current = target[key] ?? emptyDistribution();
  current.metricSnapshotCount += 1;
  current.views += asNumber(snapshot.views);
  current.likes += asNumber(snapshot.likes);
  current.comments += asNumber(snapshot.comments);
  current.saves += asNumber(snapshot.saves);
  current.shares += asNumber(snapshot.shares);
  current.followersDelta += asNumber(snapshot.followersDelta);
  current.engagement += asNumber(snapshot.likes) + asNumber(snapshot.comments) + asNumber(snapshot.saves) + asNumber(snapshot.shares);
  contentIdSet.add(snapshot.contentId);
  target[key] = current;
}

function finalizeDistribution(target, contentSets) {
  return Object.fromEntries(
    Object.entries(target)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, { ...value, contentCount: contentSets[key]?.size ?? 0 }])
  );
}

function buildExpected(rows) {
  const contentsById = new Map(rows.contents.map((content) => [content.id, content]));
  const trustedSnapshots = rows.metricSnapshots.filter((snapshot) => isTrustedSnapshot(snapshot, contentsById));
  const trustedContentIds = new Set(trustedSnapshots.map((snapshot) => snapshot.contentId));
  const trustedSnapshotIds = new Set(trustedSnapshots.map((snapshot) => snapshot.id));
  const trustedImportRunIds = new Set(trustedSnapshots.map((snapshot) => snapshot.importRunId).filter(Boolean));
  const byPlatform = {};
  const bySource = {};
  const platformContentSets = {};
  const sourceContentSets = {};
  const totals = emptyDistribution();
  const totalContentSet = new Set();

  for (const snapshot of trustedSnapshots) {
    addToDistribution({ total: totals }, "total", snapshot, totalContentSet);
    const platform = closedLoopPlatforms.includes(snapshot.platform) ? snapshot.platform : "other";
    platformContentSets[platform] ??= new Set();
    sourceContentSets[snapshot.source] ??= new Set();
    addToDistribution(byPlatform, platform, snapshot, platformContentSets[platform]);
    addToDistribution(bySource, snapshot.source, snapshot, sourceContentSets[snapshot.source]);
  }

  const untrustedSnapshots = rows.metricSnapshots.filter((snapshot) => !trustedSnapshotIds.has(snapshot.id));
  const userExcludedSnapshots = rows.metricSnapshots.filter((snapshot) => trustedSourceSet.has(snapshot.source) && isUserExcludedFromTrustedScope(contentsById.get(snapshot.contentId)));
  const trustedMetricKeys = new Set(trustedSnapshots.map((snapshot) => `${snapshot.contentId}|${snapshot.platform}|${String(snapshot.snapshotDate ?? "").slice(0, 10)}`));
  return {
    trustedSources,
    defaultScope: "trusted_real_creator_center",
    contentCount: trustedContentIds.size,
    metricCount: trustedSnapshots.length,
    metricSnapshotCount: trustedSnapshots.length,
    importRunCount: trustedImportRunIds.size,
    views: totals.views,
    likes: totals.likes,
    comments: totals.comments,
    saves: totals.saves,
    shares: totals.shares,
    followersDelta: totals.followersDelta,
    engagement: totals.engagement,
    platformDistribution: finalizeDistribution(byPlatform, platformContentSets),
    sourceDistribution: finalizeDistribution(bySource, sourceContentSets),
    excluded: {
      contentCount: new Set(untrustedSnapshots.map((snapshot) => snapshot.contentId)).size,
      metricCount: Math.max(rows.metrics.length - trustedMetricKeys.size, 0),
      metricSnapshotCount: untrustedSnapshots.length,
      importRunCount: rows.imports.filter((run) => !trustedSourceSet.has(run.source)).length,
      userExcludedContentCount: new Set(userExcludedSnapshots.map((snapshot) => snapshot.contentId)).size,
      userExcludedMetricSnapshotCount: userExcludedSnapshots.length
    },
    bilibili: {
      contentCount: new Set(trustedSnapshots.filter((snapshot) => snapshot.source === "bilibili_creator_center").map((snapshot) => snapshot.contentId)).size,
      metricSnapshotCount: trustedSnapshots.filter((snapshot) => snapshot.source === "bilibili_creator_center").length,
      excludedMetricSnapshotCount: untrustedSnapshots.filter((snapshot) => snapshot.source === "bilibili_creator_center").length
    },
    trustedSnapshotIds
  };
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => (current && typeof current === "object" ? current[key] : undefined), value);
}

function sortedJson(value) {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortedJson(item)]));
  return value;
}

function compare(checks, name, actual, expected) {
  const passed = JSON.stringify(sortedJson(actual)) === JSON.stringify(sortedJson(expected));
  checks.push({ name, passed, actual, expected });
}

function dashboardGroupMap(groups) {
  const result = {};
  for (const group of Array.isArray(groups) ? groups : []) {
    result[group.platform ?? group.source ?? "unknown"] = {
      contentCount: asNumber(group.contentCount),
      metricSnapshotCount: asNumber(group.snapshotCount ?? group.metricSnapshotCount),
      views: asNumber(group.views),
      engagement: asNumber(group.engagement)
    };
  }
  return result;
}

function expectedGroupMap(distribution) {
  return Object.fromEntries(
    Object.entries(distribution).map(([key, value]) => [
      key,
      {
        contentCount: value.contentCount,
        metricSnapshotCount: value.metricSnapshotCount,
        views: value.views,
        engagement: value.engagement
      }
    ])
  );
}

function auditSuggestions(dashboard, trustedSnapshotIds) {
  const suggestions = Array.isArray(dashboard.postImportActionSuggestions) ? dashboard.postImportActionSuggestions : [];
  let evidenceCount = 0;
  let trustedEvidenceCount = 0;
  let untrustedEvidenceCount = 0;
  let nonSnapshotEvidenceCount = 0;
  const suggestionTypes = {};

  for (const suggestion of suggestions) {
    suggestionTypes[suggestion.type ?? "unknown"] = (suggestionTypes[suggestion.type ?? "unknown"] ?? 0) + 1;
    const evidence = Array.isArray(suggestion.evidence) ? suggestion.evidence : [];
    for (const item of evidence) {
      evidenceCount += 1;
      if (item.metricSnapshotId) {
        if (trustedSnapshotIds.has(item.metricSnapshotId)) trustedEvidenceCount += 1;
        else untrustedEvidenceCount += 1;
      } else {
        nonSnapshotEvidenceCount += 1;
        if (item.source && !trustedSourceSet.has(item.source)) untrustedEvidenceCount += 1;
      }
    }
  }

  return {
    suggestionCount: suggestions.length,
    suggestionTypes,
    evidenceCount,
    trustedEvidenceCount,
    nonSnapshotEvidenceCount,
    untrustedEvidenceCount,
    onlyTrustedSnapshotEvidence: untrustedEvidenceCount === 0
  };
}

async function loadDashboard() {
  const dashboardJson = argValue("dashboard-json");
  const dashboardUrl = argValue("dashboard-url");
  if (dashboardJson) {
    return { kind: "json", value: parseJson(readFileSync(path.resolve(process.cwd(), dashboardJson), "utf8"), null) };
  }
  if (dashboardUrl) {
    const response = await fetch(dashboardUrl);
    if (!response.ok) throw new Error(`Dashboard API returned ${response.status}`);
    const body = await response.json();
    return { kind: "url", value: body };
  }
  return { kind: "none", value: null };
}

function buildDashboardComparison(expected, dashboard) {
  const checks = [];
  if (!dashboard) {
    checks.push({ name: "dashboard.input", passed: false, actual: "missing", expected: "dashboard-json or dashboard-url" });
    return { checks, suggestions: null };
  }
  compare(checks, "contents.count", Array.isArray(dashboard.contents) ? dashboard.contents.length : 0, expected.contentCount);
  compare(checks, "metrics.count", Array.isArray(dashboard.metrics) ? dashboard.metrics.length : 0, expected.metricCount);
  compare(checks, "metricSnapshots.count", Array.isArray(dashboard.metricSnapshots) ? dashboard.metricSnapshots.length : 0, expected.metricSnapshotCount);
  compare(checks, "weeklyReview.totalViews", getPath(dashboard, "weeklyReview.metrics.totalViews"), expected.views);
  compare(checks, "weeklyReview.totalEngagement", getPath(dashboard, "weeklyReview.metrics.totalEngagement"), expected.engagement);
  compare(checks, "weeklyReview.contentCount", getPath(dashboard, "weeklyReview.metrics.contentCount"), expected.contentCount);
  compare(checks, "monthlyReview.totalViews", getPath(dashboard, "monthlyReview.metrics.totalViews"), expected.views);
  compare(checks, "monthlyReview.totalEngagement", getPath(dashboard, "monthlyReview.metrics.totalEngagement"), expected.engagement);
  compare(checks, "monthlyReview.contentCount", getPath(dashboard, "monthlyReview.metrics.contentCount"), expected.contentCount);
  compare(checks, "realDataScope.defaultScope", getPath(dashboard, "realDataScope.defaultScope"), expected.defaultScope);
  compare(checks, "realDataScope.trustedSources", getPath(dashboard, "realDataScope.trustedSources"), expected.trustedSources);
  compare(checks, "realDataScope.isDefaultDashboardTrusted", getPath(dashboard, "realDataScope.isDefaultDashboardTrusted"), true);
  compare(checks, "realDataScope.trustedContentCount", getPath(dashboard, "realDataScope.trustedContentCount"), expected.contentCount);
  compare(checks, "realDataScope.trustedMetricCount", getPath(dashboard, "realDataScope.trustedMetricCount"), expected.metricCount);
  compare(checks, "realDataScope.trustedMetricSnapshotCount", getPath(dashboard, "realDataScope.trustedMetricSnapshotCount"), expected.metricSnapshotCount);
  compare(checks, "realDataScope.trustedImportRunCount", getPath(dashboard, "realDataScope.trustedImportRunCount"), expected.importRunCount);
  compare(checks, "realDataScope.userExcludedContentCount", getPath(dashboard, "realDataScope.userExcludedContentCount"), expected.excluded.userExcludedContentCount);
  compare(checks, "realDataScope.userExcludedMetricSnapshotCount", getPath(dashboard, "realDataScope.userExcludedMetricSnapshotCount"), expected.excluded.userExcludedMetricSnapshotCount);
  compare(checks, "trustedScopeCuration.userExcludedContentCount", getPath(dashboard, "trustedScopeCuration.userExcludedContentCount"), expected.excluded.userExcludedContentCount);
  compare(checks, "trustedScopeCuration.userExcludedMetricSnapshotCount", getPath(dashboard, "trustedScopeCuration.userExcludedMetricSnapshotCount"), expected.excluded.userExcludedMetricSnapshotCount);
  compare(checks, "metricPlatformGroups", dashboardGroupMap(dashboard.metricPlatformGroups), expectedGroupMap(expected.platformDistribution));
  const suggestions = auditSuggestions(dashboard, expected.trustedSnapshotIds);
  compare(checks, "postImportActionSuggestions.trustedEvidenceOnly", suggestions.onlyTrustedSnapshotEvidence, true);
  const bilibiliDashboardSnapshots = (Array.isArray(dashboard.metricSnapshots) ? dashboard.metricSnapshots : []).filter((snapshot) => snapshot.source === "bilibili_creator_center");
  compare(checks, "bilibili.defaultDashboard.snapshotCount", bilibiliDashboardSnapshots.length, expected.bilibili.metricSnapshotCount);
  return { checks, suggestions };
}

function stripInternal(report) {
  const { trustedSnapshotIds, ...expected } = report.expected;
  return { ...report, expected };
}

function toMarkdown(report) {
  const lines = [
    "# Trusted Dashboard Audit",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- DB path: ${report.dbPath}`,
    `- Dashboard input: ${report.dashboardInput}`,
    `- Safety: readOnly=${report.safety.databaseReadOnly}, databaseWrites=${report.safety.databaseWrites}, rawPayloadStored=${report.safety.rawPayloadStored}, sensitiveFieldsStored=${report.safety.sensitiveFieldsStored}`,
    "",
    "## Freshness Timeline",
    "",
    `- Recent real capture: ${report.freshness?.latestRealCaptureAt ?? "-"}`,
    `- Recent smoke: ${report.freshness?.latestSmokeAt ?? "-"}`,
    `- Recent audit: ${report.freshness?.latestAuditAt ?? report.generatedAt}`,
    `- Real capture stale over ${report.freshness?.staleAfterHours ?? "?"}h: ${report.freshness?.realCaptureIsStale ?? "-"}`,
    `- Smoke stale over ${report.freshness?.staleAfterHours ?? "?"}h: ${report.freshness?.smokeIsStale ?? "-"}`,
    "",
    "## Trusted Totals",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Contents | ${report.expected.contentCount} |`,
    `| Metric snapshots | ${report.expected.metricSnapshotCount} |`,
    `| Views | ${report.expected.views} |`,
    `| Engagement | ${report.expected.engagement} |`,
    `| User-excluded contents | ${report.expected.excluded.userExcludedContentCount} |`,
    `| User-excluded snapshots | ${report.expected.excluded.userExcludedMetricSnapshotCount} |`,
    `| Bilibili trusted snapshots | ${report.expected.bilibili.metricSnapshotCount} |`,
    `| Bilibili excluded snapshots | ${report.expected.bilibili.excludedMetricSnapshotCount} |`,
    "",
    "## Platform Distribution",
    "",
    "| Platform | Contents | Snapshots | Views | Engagement |",
    "| --- | ---: | ---: | ---: | ---: |"
  ];
  for (const [platform, stats] of Object.entries(report.expected.platformDistribution)) {
    lines.push(`| ${platform} | ${stats.contentCount} | ${stats.metricSnapshotCount} | ${stats.views} | ${stats.engagement} |`);
  }
  lines.push("", "## Checks", "", "| Check | Status | Expected | Actual |", "| --- | --- | ---: | ---: |");
  for (const check of report.checks) {
    const expected = typeof check.expected === "object" ? JSON.stringify(check.expected) : String(check.expected);
    const actual = typeof check.actual === "object" ? JSON.stringify(check.actual) : String(check.actual);
    lines.push(`| ${check.name} | ${check.passed ? "PASS" : "FAIL"} | ${expected} | ${actual} |`);
  }
  lines.push("", "Post-import suggestion evidence was checked by metric snapshot id/source only; no titles or raw payload were written.");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const healthFreshness = readLatestHealthFreshness();
  const dbPath = resolveDbPath();
  const outDir = path.resolve(process.cwd(), argValue("out-dir") ?? ".local/trusted-dashboard-audit");
  const rows = readRows(dbPath);
  const reportBase = {
    generatedAt,
    dbPath,
    dashboardInput: "none",
    safety: {
      databaseReadOnly: true,
      databaseWrites: false,
      rawPayloadStored: false,
      sensitiveFieldsStored: false,
      rawTitlesStored: false
    },
    freshness: {
      ...healthFreshness,
      latestAuditAt: generatedAt
    }
  };

  if (rows.status !== "ok") {
    const report = { ...reportBase, status: rows.status, expected: {}, dashboard: {}, checks: [{ name: "database.read", passed: false, expected: "ok", actual: rows.status }], mismatches: ["database.read"] };
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(path.join(outDir, "report.md"), toMarkdown({ ...report, expected: { contentCount: 0, metricSnapshotCount: 0, views: 0, engagement: 0, excluded: { userExcludedContentCount: 0, userExcludedMetricSnapshotCount: 0 }, bilibili: { metricSnapshotCount: 0, excludedMetricSnapshotCount: 0 }, platformDistribution: {} } }), "utf8");
    console.log(JSON.stringify({ status: report.status, reportJson: path.relative(process.cwd(), path.join(outDir, "report.json")), mismatches: report.mismatches }, null, 2));
    process.exitCode = 1;
    return;
  }

  const expected = buildExpected(rows);
  const dashboardInput = await loadDashboard();
  const { checks, suggestions } = buildDashboardComparison(expected, dashboardInput.value);
  const mismatches = checks.filter((check) => !check.passed).map((check) => check.name);
  const report = stripInternal({
    ...reportBase,
    status: mismatches.length === 0 ? "pass" : "fail",
    dashboardInput: dashboardInput.kind,
    expected,
    dashboard: dashboardInput.value
      ? {
          contents: Array.isArray(dashboardInput.value.contents) ? dashboardInput.value.contents.length : 0,
          metrics: Array.isArray(dashboardInput.value.metrics) ? dashboardInput.value.metrics.length : 0,
          metricSnapshots: Array.isArray(dashboardInput.value.metricSnapshots) ? dashboardInput.value.metricSnapshots.length : 0,
          realDataScope: dashboardInput.value.realDataScope
            ? {
                defaultScope: dashboardInput.value.realDataScope.defaultScope,
                trustedContentCount: dashboardInput.value.realDataScope.trustedContentCount,
                trustedMetricSnapshotCount: dashboardInput.value.realDataScope.trustedMetricSnapshotCount,
                userExcludedContentCount: dashboardInput.value.realDataScope.userExcludedContentCount,
                userExcludedMetricSnapshotCount: dashboardInput.value.realDataScope.userExcludedMetricSnapshotCount,
                isDefaultDashboardTrusted: dashboardInput.value.realDataScope.isDefaultDashboardTrusted
              }
            : null
        }
      : null,
    postImportSuggestions: suggestions,
    checks,
    mismatches
  });

  mkdirSync(outDir, { recursive: true });
  const reportJsonPath = path.join(outDir, "report.json");
  const reportMdPath = path.join(outDir, "report.md");
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, toMarkdown(report), "utf8");
  console.log(
    JSON.stringify(
      {
        status: report.status,
        reportJson: path.relative(process.cwd(), reportJsonPath),
        reportMd: path.relative(process.cwd(), reportMdPath),
        trustedContentCount: report.expected.contentCount,
        trustedMetricSnapshotCount: report.expected.metricSnapshotCount,
        views: report.expected.views,
        engagement: report.expected.engagement,
        mismatches
      },
      null,
      2
    )
  );
  if (mismatches.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
