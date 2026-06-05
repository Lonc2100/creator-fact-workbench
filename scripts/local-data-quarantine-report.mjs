import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function resolveDbPath() {
  const explicitPath = process.env.SELF_MEDIA_DB_PATH?.trim();
  if (explicitPath) return path.resolve(process.cwd(), explicitPath);
  return path.resolve(process.cwd(), process.env.SELF_MEDIA_PROFILE?.trim().toLowerCase() === "clean" ? ".local/self-media-clean.sqlite" : ".local/self-media.sqlite");
}

const dbPath = resolveDbPath();
const outputDir = path.resolve(process.cwd(), ".local/local-data-quarantine");
const reportJsonPath = path.join(outputDir, "report.json");
const reportMdPath = path.join(outputDir, "report.md");

const platforms = ["douyin", "xiaohongshu", "wechat", "video_account", "bilibili", "other", "unknown"];
const trustedSources = new Set([
  "douyin_creator_center",
  "xiaohongshu_creator_center",
  "video_account_creator_center",
  "bilibili_creator_center"
]);
const manualPipelineSources = new Set(["manual", "csv", "json", "mediacrawler", "n8n"]);
const sourcePlatform = new Map([
  ["douyin_creator_center", "douyin"],
  ["xiaohongshu_creator_center", "xiaohongshu"],
  ["video_account_creator_center", "video_account"],
  ["bilibili_creator_center", "bilibili"],
  ["wechat_official", "wechat"]
]);
const categories = [
  "trusted_real_creator_center",
  "demo_smoke",
  "manual_csv_mediacrawler_n8n",
  "paused_wechat",
  "unknown_unclassified"
];
const demoPattern = /(^|[-_\s:])(demo|smoke|sample|seed|fake|test|o2|save-smoke|platform-smoke)([-_\s:]|$)|烟测|演示|样例/i;

function emptyPlatformCounts() {
  return Object.fromEntries(platforms.map((platform) => [platform, 0]));
}

function emptyStats() {
  return {
    entityCount: 0,
    importRunCount: 0,
    totalRecordCount: 0,
    byPlatform: emptyPlatformCounts(),
    byCollection: {},
    bySource: {}
  };
}

function incrementKey(target, key) {
  const safeKey = key || "unknown";
  target[safeKey] = (target[safeKey] ?? 0) + 1;
}

function asString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function sourceFromText(text) {
  for (const source of [...trustedSources, ...manualPipelineSources, "fake", "wechat_official"]) {
    if (text.includes(source)) return source;
  }
  return undefined;
}

function platformFromText(text) {
  for (const platform of platforms) {
    if (platform !== "unknown" && text.includes(platform)) return platform;
  }
  if (text.includes("video-account")) return "video_account";
  return undefined;
}

function searchableText(record) {
  const data = record.data ?? {};
  return [
    record.collection,
    record.id,
    data.id,
    data.source,
    data.platform,
    data.contentId,
    data.platformVersionId,
    data.importRunId,
    data.providerRunId,
    data.runId,
    data.action,
    data.kind,
    data.status,
    data.title,
    data.topic,
    data.notes
  ]
    .map(asString)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferSource(record, contentSourceById) {
  const data = record.data ?? {};
  const explicit = asString(data.source);
  if (explicit) return explicit;

  const contentId = asString(data.contentId);
  if (contentId && contentSourceById.has(contentId)) return contentSourceById.get(contentId);

  const text = searchableText(record);
  return sourceFromText(text);
}

function inferPlatform(record, source) {
  const data = record.data ?? {};
  const explicit = asString(data.platform);
  if (explicit) return explicit;
  if (source && sourcePlatform.has(source)) return sourcePlatform.get(source);
  return platformFromText(searchableText(record)) ?? "unknown";
}

function provenanceFor(record) {
  const provenance = record.data?.provenance;
  return provenance && typeof provenance === "object" && !Array.isArray(provenance) ? provenance : {};
}

function isDemoSmoke(record, source) {
  if (source === "fake") return true;
  return demoPattern.test(searchableText(record));
}

function classify(record, contentSourceById) {
  const source = inferSource(record, contentSourceById);
  const platform = inferPlatform(record, source);
  const provenance = provenanceFor(record);

  if (provenance.isTestFixture === true || provenance.operationKind === "platform_save_smoke") return { category: "demo_smoke", source, platform };
  if (source && trustedSources.has(source) && provenance.trustedScopeEligible === true) return { category: "trusted_real_creator_center", source, platform };
  if (isDemoSmoke(record, source)) return { category: "demo_smoke", source, platform };
  if (source === "wechat_official" || platform === "wechat") return { category: "paused_wechat", source, platform };
  if (source && trustedSources.has(source) && provenance.trustedScopeEligible === false) return { category: "unknown_unclassified", source, platform };
  if (source && trustedSources.has(source)) return { category: "trusted_real_creator_center", source, platform };
  if (source && manualPipelineSources.has(source)) return { category: "manual_csv_mediacrawler_n8n", source, platform };
  return { category: "unknown_unclassified", source, platform };
}

function addRecord(summary, category, platform, source, collection, kind) {
  const stats = summary.categories[category] ?? summary.categories.unknown_unclassified;
  if (kind === "importRun") stats.importRunCount += 1;
  else stats.entityCount += 1;
  stats.totalRecordCount += 1;
  incrementKey(stats.byPlatform, platforms.includes(platform) ? platform : "unknown");
  incrementKey(stats.byCollection, collection);
  incrementKey(stats.bySource, source || "unknown");
}

function readRows(db) {
  const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
  const tableNames = new Set(tableRows.map((row) => row.name));
  if (!tableNames.has("entities") || !tableNames.has("import_runs")) {
    throw new Error("Expected entities/import_runs tables are missing.");
  }

  const entities = db
    .prepare("SELECT collection, id, data, updated_at FROM entities ORDER BY collection, id")
    .all()
    .map((row) => ({
      collection: row.collection,
      id: row.id,
      updatedAt: row.updated_at,
      data: parseJson(row.data, {})
    }));
  const importRuns = db
    .prepare("SELECT id, source, status, imported_count, started_at, finished_at, data FROM import_runs ORDER BY started_at DESC")
    .all()
    .map((row) => ({
      collection: "import_runs",
      id: row.id,
      data: {
        ...parseJson(row.data, {}),
        id: row.id,
        source: row.source,
        status: row.status,
        importedCount: row.imported_count,
        startedAt: row.started_at,
        finishedAt: row.finished_at
      }
    }));
  return { entities, importRuns };
}

function buildContentSourceIndex(entities) {
  const contentSourceById = new Map();
  const contentRows = entities.filter((record) => record.collection === "contents");
  for (const record of contentRows) {
    const source = inferSource(record, new Map());
    if (source) contentSourceById.set(record.id, source);
  }
  return contentSourceById;
}

function buildReport() {
  const generatedAt = new Date().toISOString();
  const summary = {
    generatedAt,
    dbPath,
    mode: "read_only_sqlite_scan",
    safety: {
      destructiveActions: false,
      databaseWrites: false,
      rawPayloadStored: false,
      sensitiveFieldsStored: false
    },
    categories: Object.fromEntries(categories.map((category) => [category, emptyStats()])),
    totals: {
      entityCount: 0,
      importRunCount: 0,
      totalRecordCount: 0
    },
    cleanProfileRecommendation: {
      preferred: "trusted_scope_view_first",
      options: [
        "trusted_scope_view: read dashboard/review from trusted creator-center sources only, excluding demo/smoke and paused/wechat rows.",
        "clean_local_db: create a new local sqlite file for future work and import only confirmed creator-center previews after backup.",
        "backup_then_seed_free_rebuild: copy current database as evidence, then generate a new seed-free local file only after main-session confirmation."
      ]
    }
  };

  if (!existsSync(dbPath)) {
    return {
      ...summary,
      status: "missing_db",
      message: "No local self-media database was found; no database was created."
    };
  }

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const { entities, importRuns } = readRows(db);
    const contentSourceById = buildContentSourceIndex(entities);

    for (const record of entities) {
      const { category, source, platform } = classify(record, contentSourceById);
      addRecord(summary, category, platform, source, record.collection, "entity");
      summary.totals.entityCount += 1;
      summary.totals.totalRecordCount += 1;
    }

    for (const record of importRuns) {
      const { category, source, platform } = classify(record, contentSourceById);
      addRecord(summary, category, platform, source, record.collection, "importRun");
      summary.totals.importRunCount += 1;
      summary.totals.totalRecordCount += 1;
    }

    return { ...summary, status: "ok" };
  } finally {
    db.close();
  }
}

function tableRow(label, stats) {
  return `| ${label} | ${stats.entityCount} | ${stats.importRunCount} | ${stats.totalRecordCount} | ${platforms.map((platform) => `${platform}:${stats.byPlatform[platform] ?? 0}`).join(", ")} |`;
}

function toMarkdown(report) {
  const lines = [
    "# Local Data Quarantine Report",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- DB path: ${report.dbPath}`,
    `- Status: ${report.status}`,
    `- Mode: ${report.mode}`,
    `- Safety: destructiveActions=${report.safety.destructiveActions}, databaseWrites=${report.safety.databaseWrites}, rawPayloadStored=${report.safety.rawPayloadStored}, sensitiveFieldsStored=${report.safety.sensitiveFieldsStored}`,
    "",
    "## Category Counts",
    "",
    "| Category | Entity rows | Import runs | Total records | Platform counts |",
    "| --- | ---: | ---: | ---: | --- |"
  ];

  for (const category of categories) lines.push(tableRow(category, report.categories[category]));

  lines.push(
    "",
    "## Clean Profile Recommendation",
    "",
    `Preferred: ${report.cleanProfileRecommendation.preferred}`,
    "",
    ...report.cleanProfileRecommendation.options.map((item) => `- ${item}`),
    "",
    "No database rows were deleted, modified, or inserted by this command."
  );
  return `${lines.join("\n")}\n`;
}

const report = buildReport();
mkdirSync(outputDir, { recursive: true });
writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(reportMdPath, toMarkdown(report), "utf8");

console.log(
  JSON.stringify(
    {
      status: report.status,
      reportJson: path.relative(process.cwd(), reportJsonPath),
      reportMd: path.relative(process.cwd(), reportMdPath),
      totals: report.totals,
      categories: Object.fromEntries(
        categories.map((category) => [
          category,
          {
            entityCount: report.categories[category].entityCount,
            importRunCount: report.categories[category].importRunCount,
            totalRecordCount: report.categories[category].totalRecordCount,
            byPlatform: report.categories[category].byPlatform
          }
        ])
      )
    },
    null,
    2
  )
);
