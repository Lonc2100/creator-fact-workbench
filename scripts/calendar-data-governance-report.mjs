import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const outputDir = path.resolve(process.cwd(), ".local/calendar-data-governance-135");
const reportJsonPath = path.join(outputDir, "report.json");
const reportMdPath = path.join(outputDir, "report.md");
const defaultStatuses = new Set(["draft", "needs_review", "scheduled"]);
const acceptanceTextPattern = /(^|[\s:/._-])(mainline|human-mouse|calendar-real|creator day workflow|workflow|05[0-9]|06[0-9]|07[0-2])([\s:/._-]|$)|验收|回归|测试|走查|真实鼠标|人工鼠标|浏览器烟测|创作者一天流程|信息架构回归|我最喜欢的小雏菊|小雏菊|想拍一条短视频|我的真实作品070测试|071验收测试|真实作品：六月内容计划|真实内容评估/i;
const demoSeedTextPattern = /(^|[\s:/._-])(smoke|sample|demo|fixture|debug|seed|fake|op-save)([\s:/._-]|$)|O2|烟测|浏览器烟测|BiliOpSave/i;
const calendarHygieneTextPattern = /默认日历只显示\s*user_work|用来确认默认日历|确认默认日历|默认日历主网格|日历验收|日历测试/i;
const calendarDataGovernanceTextPattern = /(^|[\s:/._-])(acceptance|test|testing|backend-log|backend_log|system-log|system_log|capture|import|run|raw|rawdir|evidence)([\s:/._-]|$)|后台日志|系统日志|测试稿|验收稿|测试草稿|验收草稿|历史导入|历史已发布|已发布指标数据|默认发布日历污染|日历污染/i;

function resolveDbPath() {
  const explicitPath = process.env.SELF_MEDIA_DB_PATH?.trim();
  if (explicitPath) return path.resolve(process.cwd(), explicitPath);
  const cleanProfile = process.env.SELF_MEDIA_PROFILE?.trim().toLowerCase() === "clean";
  return path.resolve(process.cwd(), cleanProfile ? ".local/self-media-clean.sqlite" : ".local/self-media.sqlite");
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function asText(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function calendarText(content, version) {
  return [
    content?.id,
    content?.title,
    content?.topic,
    content?.notes,
    content?.acceptanceRunId,
    content?.dataDomainReason,
    version?.id,
    version?.title,
    version?.body,
    version?.script,
    version?.coverNote,
    version?.nextAction,
    version?.failureReason
  ].map(asText).filter(Boolean).join(" ");
}

function markerReasons(text) {
  const reasons = [];
  if (acceptanceTextPattern.test(text)) reasons.push("acceptance_or_regression_marker");
  if (demoSeedTextPattern.test(text)) reasons.push("demo_seed_or_fixture_marker");
  if (calendarHygieneTextPattern.test(text)) reasons.push("calendar_hygiene_marker");
  if (calendarDataGovernanceTextPattern.test(text)) reasons.push("calendar_data_governance_marker");
  return reasons;
}

function startOfToday(now) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

function classifyVersion(content, version, todayStart) {
  if (!version?.scheduledAt) return undefined;
  const reasons = [];
  if (!content) reasons.push("missing_content");
  if (content?.dataDomain !== "user_work") reasons.push(`data_domain_${content?.dataDomain ?? "missing"}`);
  if (content?.workOwnership !== "user_owned_work") reasons.push(`work_ownership_${content?.workOwnership ?? "missing"}`);
  if (content?.status === "published" || content?.publishedAt) reasons.push("historical_published_content");
  if (!defaultStatuses.has(version.status)) reasons.push(`version_status_${version.status}`);
  if (version.publishedAt) reasons.push("historical_published_version");
  reasons.push(...markerReasons(calendarText(content, version)));
  const scheduledTime = new Date(version.scheduledAt).getTime();
  const isFuture = Number.isFinite(scheduledTime) && scheduledTime >= todayStart.getTime();
  return {
    eligible: reasons.length === 0,
    isFuture,
    reasons
  };
}

function emptyReasonCounts() {
  return {
    dataDomain: {},
    workOwnership: {},
    status: {},
    marker: {},
    other: {}
  };
}

function addReason(counts, reason) {
  const bucket = reason.startsWith("data_domain_")
    ? counts.dataDomain
    : reason.startsWith("work_ownership_")
      ? counts.workOwnership
      : reason.startsWith("version_status_")
        ? counts.status
        : reason.includes("marker")
          ? counts.marker
          : counts.other;
  bucket[reason] = (bucket[reason] ?? 0) + 1;
}

function readEntityRows(db) {
  const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  const tableNames = new Set(tableRows.map((row) => row.name));
  if (!tableNames.has("entities")) throw new Error("Expected entities table is missing.");
  return db
    .prepare("SELECT collection, id, data, updated_at FROM entities ORDER BY collection, id")
    .all()
    .map((row) => ({
      collection: row.collection,
      id: row.id,
      updatedAt: row.updated_at,
      data: parseJson(row.data)
    }));
}

function buildReport() {
  const generatedAt = new Date().toISOString();
  const dbPath = resolveDbPath();
  const todayStart = startOfToday(process.env.CALENDAR_GOVERNANCE_NOW ?? generatedAt);
  const report = {
    taskId: "MAINLINE-CALENDAR-DATA-GOVERNANCE-135",
    generatedAt,
    dbPath,
    mode: "read_only_sqlite_calendar_governance_scan",
    safety: {
      destructiveActions: false,
      databaseWrites: false,
      fileDeletion: false,
      rawPayloadStored: false,
      titleBodyScriptStored: false
    },
    summary: {
      scheduledVersionCount: 0,
      eligibleFutureCount: 0,
      eligiblePastCount: 0,
      quarantinedScheduledCount: 0,
      quarantinedFutureCount: 0
    },
    reasonCounts: emptyReasonCounts(),
    examples: []
  };

  if (!existsSync(dbPath)) return { ...report, status: "missing_db", message: "No local self-media database was found; no database was created." };

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const entities = readEntityRows(db);
    const contents = new Map(entities.filter((row) => row.collection === "contents").map((row) => [row.id, row.data]));
    const versions = entities.filter((row) => row.collection === "platformVersions").map((row) => row.data);
    for (const version of versions) {
      const content = contents.get(version.contentId);
      const classification = classifyVersion(content, version, todayStart);
      if (!classification) continue;
      report.summary.scheduledVersionCount += 1;
      if (classification.eligible) {
        if (classification.isFuture) report.summary.eligibleFutureCount += 1;
        else report.summary.eligiblePastCount += 1;
        continue;
      }
      report.summary.quarantinedScheduledCount += 1;
      if (classification.isFuture) report.summary.quarantinedFutureCount += 1;
      for (const reason of classification.reasons) addReason(report.reasonCounts, reason);
      if (report.examples.length < 20) {
        report.examples.push({
          contentId: version.contentId,
          platformVersionId: version.id,
          platform: version.platform,
          scheduledAt: version.scheduledAt,
          status: version.status,
          reasons: classification.reasons
        });
      }
    }
    return { ...report, status: "ok" };
  } finally {
    db.close();
  }
}

function reasonTable(title, counts) {
  const entries = Object.entries(counts);
  if (entries.length === 0) return [`### ${title}`, "", "No records.", ""];
  return [
    `### ${title}`,
    "",
    "| Reason | Count |",
    "| --- | ---: |",
    ...entries.map(([reason, count]) => `| ${reason} | ${count} |`),
    ""
  ];
}

function renderMarkdown(report) {
  return [
    "# Calendar Data Governance Report",
    "",
    `- Task: ${report.taskId}`,
    `- Generated at: ${report.generatedAt}`,
    `- DB path: ${report.dbPath}`,
    `- Status: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Safety: destructiveActions=${report.safety.destructiveActions}, databaseWrites=${report.safety.databaseWrites}, fileDeletion=${report.safety.fileDeletion}, titleBodyScriptStored=${report.safety.titleBodyScriptStored}`,
    "",
    "## Summary",
    "",
    `- Scheduled versions scanned: ${report.summary.scheduledVersionCount}`,
    `- Eligible future versions: ${report.summary.eligibleFutureCount}`,
    `- Eligible past versions: ${report.summary.eligiblePastCount}`,
    `- Quarantined scheduled versions: ${report.summary.quarantinedScheduledCount}`,
    `- Quarantined future versions: ${report.summary.quarantinedFutureCount}`,
    "",
    "## Reason Counts",
    "",
    ...reasonTable("Data domain", report.reasonCounts.dataDomain),
    ...reasonTable("Work ownership", report.reasonCounts.workOwnership),
    ...reasonTable("Version status", report.reasonCounts.status),
    ...reasonTable("Governance markers", report.reasonCounts.marker),
    ...reasonTable("Other", report.reasonCounts.other),
    "## Sanitized Examples",
    "",
    report.examples.length === 0
      ? "No quarantined examples."
      : "| Content ID | Version ID | Platform | Scheduled at | Status | Reasons |\n| --- | --- | --- | --- | --- | --- |\n" + report.examples.map((item) => `| ${item.contentId} | ${item.platformVersionId} | ${item.platform} | ${item.scheduledAt} | ${item.status} | ${item.reasons.join(", ")} |`).join("\n"),
    "",
    "No content titles, bodies, scripts, database rows, files, or directories were modified by this command.",
    ""
  ].join("\n");
}

const report = buildReport();
mkdirSync(outputDir, { recursive: true });
writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(reportMdPath, renderMarkdown(report), "utf8");

console.log(JSON.stringify({
  status: report.status,
  reportJson: path.relative(process.cwd(), reportJsonPath),
  reportMd: path.relative(process.cwd(), reportMdPath),
  summary: report.summary
}, null, 2));
