import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const TASK_ID = "OPERATING-DB-POLLUTION-QUARANTINE-077";
const rootDir = process.cwd();
const dbPath = path.resolve(rootDir, ".local/self-media.sqlite");
const backupPath = path.resolve(rootDir, ".local/db-backups/self-media-before-quarantine-077.sqlite");
const outputDir = path.resolve(rootDir, ".local/operating-db-quarantine-077");
const reportJsonPath = path.join(outputDir, "report.json");
const reportMdPath = path.join(outputDir, "report.md");
const apply = process.argv.includes("--apply");

const candidateCollections = new Set([
  "contents",
  "platformVersions",
  "metrics",
  "metricSnapshots",
  "ideas",
  "leads",
  "queue",
  "publishRecords",
  "actionItems",
  "operationHistory",
  "automationRuns",
  "audits",
  "savedReviews"
]);

const acceptancePattern =
  /(^|[\s:/._-])(mainline|human-mouse|calendar-real|creator day workflow|workflow|e2e|test|acceptance)([\s:/._-]|$)|O2|验收|回归|测试|走查|真实鼠标|人工鼠标|浏览器烟测|创作者一天流程|信息架构回归|AI选题计划|AI短片复盘|小雏菊|想拍一条短视频|我的真实作品070测试|071验收测试|真实内容评估|(^|[^a-z0-9])(05[0-9]|06[0-9]|07[0-7])[-_ ]?(worker|auditor|mainline|验收|测试|回归)/i;
const demoSeedPattern = /(^|[\s:/._-])(smoke|sample|demo|fixture|debug|seed|fake|op-save)([\s:/._-]|$)|烟测|演示|样例|BiliOpSave/i;

function rel(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, "/");
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

function searchableEntityText(record) {
  const data = record.data ?? {};
  const tags = Array.isArray(data.tags) ? data.tags : [];
  return [
    record.collection,
    record.id,
    data.id,
    data.title,
    data.topic,
    data.notes,
    data.contentId,
    data.platformVersionId,
    data.importRunId,
    data.providerRunId,
    data.runId,
    data.source,
    data.status,
    data.nextAction,
    data.failureReason,
    data.markdown,
    data.summary,
    data.finding,
    data.target,
    ...tags
  ]
    .map(asText)
    .filter(Boolean)
    .join(" ");
}

function searchableImportText(record) {
  const data = record.data ?? {};
  return [
    record.id,
    record.source,
    record.status,
    data.id,
    data.source,
    data.status,
    data.traceId,
    data.provenance?.acceptanceRunId,
    data.provenance?.operationKind,
    ...(Array.isArray(data.warnings) ? data.warnings : [])
  ]
    .map(asText)
    .filter(Boolean)
    .join(" ");
}

function provenanceDomain(record) {
  const provenance = record.data?.provenance;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) return undefined;
  if (provenance.dataDomain === "acceptance_run" || provenance.acceptanceRunId) return "acceptance_run";
  if (provenance.dataDomain === "demo_seed" || provenance.isTestFixture === true || provenance.operationKind === "seed" || provenance.operationKind === "platform_save_smoke") return "demo_seed";
  return undefined;
}

function classifyRecord(record, kind) {
  if (kind === "entity" && !candidateCollections.has(record.collection)) return undefined;
  const text = kind === "importRun" ? searchableImportText(record) : searchableEntityText(record);
  const fullJsonText = JSON.stringify(record.data ?? {});
  const explicitDomain = provenanceDomain(record);
  if (explicitDomain === "acceptance_run") return { dataDomain: "acceptance_run", reason: "provenance_acceptance_marker" };
  if (acceptancePattern.test(text)) return { dataDomain: "acceptance_run", reason: "acceptance_marker_in_id_title_notes_or_run" };
  if (record.collection === "savedReviews" && acceptancePattern.test(fullJsonText)) return { dataDomain: "acceptance_run", reason: "acceptance_marker_in_saved_review_links" };
  if (explicitDomain === "demo_seed") return { dataDomain: "demo_seed", reason: "provenance_demo_seed_marker" };
  if (record.data?.source === "fake") return { dataDomain: "demo_seed", reason: "fake_source" };
  if (demoSeedPattern.test(text)) return { dataDomain: "demo_seed", reason: "demo_seed_smoke_marker_in_id_title_notes_or_run" };
  if (record.collection === "savedReviews" && demoSeedPattern.test(fullJsonText)) return { dataDomain: "demo_seed", reason: "demo_seed_marker_in_saved_review_links" };
  return undefined;
}

function targetDomainFor(record, kind, classification) {
  if (kind === "entity" && ["operationHistory", "automationRuns", "audits", "savedReviews", "leads", "actionItems"].includes(record.collection)) return "system_log";
  return classification.dataDomain;
}

function alreadyQuarantined(data) {
  return data?.quarantineTaskId === TASK_ID;
}

function withQuarantineFields(record, kind, classification, now) {
  const domain = targetDomainFor(record, kind, classification);
  const next = {
    ...(record.data ?? {}),
    dataDomain: domain,
    dataDomainUpdatedAt: now,
    dataDomainReason: `${TASK_ID}:${classification.reason}`,
    quarantineTaskId: TASK_ID,
    quarantineReason: classification.reason,
    quarantinedAt: now
  };
  if (domain === "acceptance_run") next.acceptanceRunId = next.acceptanceRunId || TASK_ID;
  return next;
}

function readEntities(db) {
  return db
    .prepare("SELECT collection, id, data, updated_at FROM entities ORDER BY collection, id")
    .all()
    .map((row) => ({
      kind: "entity",
      collection: String(row.collection),
      id: String(row.id),
      updatedAt: String(row.updated_at),
      data: parseJson(row.data)
    }));
}

function readImportRuns(db) {
  return db
    .prepare("SELECT id, source, status, imported_count, started_at, finished_at, error_message, data FROM import_runs ORDER BY started_at DESC")
    .all()
    .map((row) => ({
      kind: "importRun",
      collection: "import_runs",
      id: String(row.id),
      source: String(row.source),
      status: String(row.status),
      importedCount: Number(row.imported_count),
      startedAt: String(row.started_at),
      finishedAt: row.finished_at ? String(row.finished_at) : undefined,
      errorMessage: row.error_message ? String(row.error_message) : undefined,
      data: parseJson(row.data)
    }));
}

function summarize(candidates) {
  const byCollection = {};
  const byDomain = {};
  const byReason = {};
  for (const item of candidates) {
    byCollection[item.collection] = (byCollection[item.collection] ?? 0) + 1;
    byDomain[item.dataDomain] = (byDomain[item.dataDomain] ?? 0) + 1;
    byReason[item.reason] = (byReason[item.reason] ?? 0) + 1;
  }
  return { byCollection, byDomain, byReason };
}

function buildReport(db, mode) {
  const generatedAt = new Date().toISOString();
  const entities = readEntities(db);
  const importRuns = readImportRuns(db);
  const records = [...entities, ...importRuns];
  const candidates = [];
  const alreadyTagged = [];

  for (const record of records) {
    const classification = classifyRecord(record, record.kind);
    if (!classification) continue;
    const dataDomain = targetDomainFor(record, record.kind, classification);
    const item = {
      table: record.kind === "importRun" ? "import_runs" : "entities",
      collection: record.collection,
      id: record.id,
      dataDomain,
      reason: classification.reason,
      previousDataDomain: record.data?.dataDomain
    };
    if (alreadyQuarantined(record.data)) alreadyTagged.push(item);
    else candidates.push(item);
  }

  return {
    taskId: TASK_ID,
    generatedAt,
    mode,
    dbPath: rel(dbPath),
    backupPath: rel(backupPath),
    safety: {
      databaseRowsDeleted: false,
      databaseFileDeleted: false,
      rawCaptureStored: false,
      sensitiveFieldsStored: false
    },
    scanned: {
      entityCount: entities.length,
      importRunCount: importRuns.length
    },
    candidates: {
      count: candidates.length,
      ...summarize(candidates),
      samples: candidates.slice(0, 30)
    },
    alreadyTagged: {
      count: alreadyTagged.length,
      ...summarize(alreadyTagged),
      samples: alreadyTagged.slice(0, 15)
    }
  };
}

function applyQuarantine(db, now) {
  const entities = readEntities(db);
  const importRuns = readImportRuns(db);
  let entityUpdates = 0;
  let importRunUpdates = 0;

  const updateEntity = db.prepare("UPDATE entities SET data = ?, updated_at = ? WHERE collection = ? AND id = ?");
  const updateImportRun = db.prepare("UPDATE import_runs SET data = ? WHERE id = ?");
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const record of entities) {
      const classification = classifyRecord(record, "entity");
      if (!classification || alreadyQuarantined(record.data)) continue;
      const updated = withQuarantineFields(record, "entity", classification, now);
      updateEntity.run(JSON.stringify(updated), now, record.collection, record.id);
      entityUpdates += 1;
    }

    for (const record of importRuns) {
      const classification = classifyRecord(record, "importRun");
      if (!classification || alreadyQuarantined(record.data)) continue;
      const updated = withQuarantineFields(record, "importRun", classification, now);
      if (!updated.provenance || typeof updated.provenance !== "object" || Array.isArray(updated.provenance)) updated.provenance = {};
      updated.provenance = {
        ...updated.provenance,
        dataDomain: updated.dataDomain,
        acceptanceRunId: updated.dataDomain === "acceptance_run" ? updated.acceptanceRunId : updated.provenance.acceptanceRunId
      };
      updateImportRun.run(JSON.stringify(updated), record.id);
      importRunUpdates += 1;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { entityUpdates, importRunUpdates };
}

function toMarkdown(report) {
  const lines = [
    `# ${TASK_ID} Migration Report`,
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Mode: ${report.mode}`,
    `- DB path: ${report.dbPath}`,
    `- Backup path: ${report.backupPath}`,
    `- Rows deleted: ${report.safety.databaseRowsDeleted}`,
    `- DB file deleted: ${report.safety.databaseFileDeleted}`,
    `- Raw capture or sensitive fields stored: ${report.safety.rawCaptureStored || report.safety.sensitiveFieldsStored}`,
    "",
    "## Scan Totals",
    "",
    `- Entities scanned: ${report.scanned.entityCount}`,
    `- Import runs scanned: ${report.scanned.importRunCount}`,
    `- Newly quarantined candidates: ${report.candidates.count}`,
    `- Already tagged by this task: ${report.alreadyTagged.count}`,
    "",
    "## New Candidates By Collection",
    "",
    ...Object.entries(report.candidates.byCollection).map(([collection, count]) => `- ${collection}: ${count}`),
    "",
    "## New Candidates By Domain",
    "",
    ...Object.entries(report.candidates.byDomain).map(([domain, count]) => `- ${domain}: ${count}`),
    "",
    "## Sample Records",
    "",
    ...report.candidates.samples.map((item) => `- ${item.table}/${item.collection}/${item.id}: ${item.dataDomain}, ${item.reason}`),
    "",
    "No database rows were deleted. The migration only updates JSON metadata fields."
  ];
  if (report.applied) {
    lines.splice(8, 0, `- Entity rows updated: ${report.applied.entityUpdates}`, `- Import runs updated: ${report.applied.importRunUpdates}`);
  }
  return `${lines.join("\n")}\n`;
}

if (!existsSync(dbPath)) throw new Error(`Missing operating DB: ${rel(dbPath)}`);

mkdirSync(outputDir, { recursive: true });
if (apply) {
  mkdirSync(path.dirname(backupPath), { recursive: true });
  if (!existsSync(backupPath)) copyFileSync(dbPath, backupPath);
}

const db = new DatabaseSync(dbPath);
try {
  const before = buildReport(db, apply ? "apply_before" : "dry_run");
  let report = before;
  if (apply) {
    const applied = applyQuarantine(db, new Date().toISOString());
    const after = buildReport(db, "apply_after");
    report = { ...after, before, applied };
  }
  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(reportMdPath, toMarkdown(report), "utf8");
  console.log(JSON.stringify({
    status: "ok",
    mode: report.mode,
    reportJson: rel(reportJsonPath),
    reportMd: rel(reportMdPath),
    backup: apply ? rel(backupPath) : undefined,
    candidates: report.candidates.count,
    alreadyTagged: report.alreadyTagged.count,
    applied: report.applied
  }, null, 2));
} finally {
  db.close();
}
