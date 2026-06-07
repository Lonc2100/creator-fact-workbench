import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const outDir = path.resolve(rootDir, ".local/entropy-governance-scan");
const reportJsonPath = path.join(outDir, "report.json");
const reportMdPath = path.join(outDir, "report.md");

const LOCAL_LIMITS = {
  fileCount: 2000,
  totalBytes: 250 * 1024 * 1024,
  dbCount: 25
};
const TEXT_EXTENSIONS = new Set([".md", ".mjs", ".ts", ".tsx", ".js", ".json"]);
const TEST_DATA_PATTERN = /\b(demo|smoke|fixture|fake|sample|seed|test|acceptance|e2e|o2)\b|烟测|演示|样例|测试/i;
const PAUSED_PATTERN = /wechat|微信|公众号|backend|bilibili-account|account-metrics/i;
const SENSITIVE_LOCAL_PATTERN = /chrome-profile|cookies|token|credential|self-media\.sqlite|raw\//i;
const QUARANTINED_DATA_DOMAINS = new Set(["acceptance_run", "demo_seed", "system_log"]);

function runGit(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function rel(filePath) {
  return normalizePath(path.relative(rootDir, filePath));
}

function bytesToMiB(bytes) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

function parseJson(value, fallback = {}) {
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function isQuarantinedDbRecord(data) {
  return QUARANTINED_DATA_DOMAINS.has(data?.dataDomain) || typeof data?.quarantineTaskId === "string";
}

function listFiles(dir, options = {}) {
  const base = path.resolve(rootDir, dir);
  if (!existsSync(base)) return [];
  const files = [];
  const stack = [base];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (options.recursive === false) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        files.push(full);
      }
    }
  }
  return files.sort((a, b) => rel(a).localeCompare(rel(b)));
}

function parseStatus() {
  const lines = runGit(["status", "--porcelain=v1", "--untracked-files=all"])
    .split(/\r?\n/)
    .filter(Boolean);
  const records = lines.map((line) => {
    const status = line.slice(0, 2);
    const file = normalizePath(line.slice(3).replace(/^"|"$/g, ""));
    return { status, file };
  });
  const untracked = records.filter((item) => item.status === "??");
  const modified = records.filter((item) => item.status !== "??");
  return {
    modifiedCount: modified.length,
    untrackedCount: untracked.length,
    totalCount: records.length,
    modified: modified.map((item) => item.file),
    untracked: untracked.map((item) => item.file)
  };
}

function parseMarkdownLinks(markdown) {
  const links = new Set();
  const regex = /\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(markdown))) {
    const target = match[1].split("#")[0];
    if (target.endsWith(".md")) links.add(normalizePath(path.normalize(target)));
  }
  return links;
}

function readIfExists(file) {
  const abs = path.resolve(rootDir, file);
  return existsSync(abs) ? readFileSync(abs, "utf8") : "";
}

function indexedSpecs() {
  const indexPath = "docs/product-specs/index.md";
  const markdown = readIfExists(indexPath);
  const links = parseMarkdownLinks(markdown);
  return new Set(
    [...links]
      .filter((item) => item.endsWith(".md") && !item.startsWith("../"))
      .map((item) => normalizePath(path.join("docs/product-specs", item)))
  );
}

function referencedHandoffs() {
  const files = [
    "docs/handoffs/README.md",
    "docs/handoffs/CURRENT-PLATFORM-STATUS.md",
    "docs/product-specs/index.md",
    "docs/task-board.md"
  ];
  const referenced = new Set();
  const handoffRegex = /(?:docs\/handoffs\/)?([A-Z0-9._-]+\.md)/g;
  for (const file of files) {
    const text = readIfExists(file);
    let match;
    while ((match = handoffRegex.exec(text))) {
      if (match[1].includes("-") || match[1].startsWith("CURRENT-")) {
        referenced.add(`docs/handoffs/${match[1]}`);
      }
    }
  }
  return referenced;
}

function handoffStats(status) {
  const files = listFiles("docs/handoffs", { recursive: false }).filter((file) => file.endsWith(".md"));
  const untracked = status.untracked.filter((file) => file.startsWith("docs/handoffs/") && file.endsWith(".md"));
  const referenced = referencedHandoffs();
  const archivalCandidates = files
    .map(rel)
    .filter((file) => file !== "docs/handoffs/README.md" && !referenced.has(file))
    .filter((file) => status.untracked.includes(file) || PAUSED_PATTERN.test(file) || /0[0-4][0-9]|AUD-00|UI-|BACKEND|WECHAT/i.test(file))
    .slice(0, 200);
  return {
    totalFiles: files.length,
    untrackedCount: untracked.length,
    trackedCount: files.length - untracked.length,
    referencedCount: [...referenced].filter((file) => existsSync(path.resolve(rootDir, file))).length,
    archivalCandidateCount: archivalCandidates.length,
    archivalCandidates
  };
}

function specStats(status) {
  const files = listFiles("docs/product-specs", { recursive: false }).filter((file) => file.endsWith(".md"));
  const indexed = indexedSpecs();
  const all = files.map(rel);
  const unindexed = all.filter((file) => file !== "docs/product-specs/index.md" && !indexed.has(file));
  const untracked = status.untracked.filter((file) => file.startsWith("docs/product-specs/") && file.endsWith(".md"));
  return {
    totalFiles: files.length,
    indexedCount: all.filter((file) => indexed.has(file)).length,
    unindexedCount: unindexed.length,
    untrackedCount: untracked.length,
    unindexed,
    untracked
  };
}

function localStats() {
  const files = listFiles(".local");
  const dbExtensions = new Set([".sqlite", ".sqlite3", ".db"]);
  let totalBytes = 0;
  const topFiles = [];
  const topDirs = new Map();
  const dbFiles = [];
  const sensitiveLocalAssets = [];

  for (const file of files) {
    const stats = statSync(file);
    const relative = rel(file);
    totalBytes += stats.size;
    topFiles.push({ path: relative, bytes: stats.size, mib: bytesToMiB(stats.size) });
    const parts = relative.split("/");
    const bucket = parts.length >= 2 ? parts.slice(0, 2).join("/") : parts[0];
    const current = topDirs.get(bucket) ?? { path: bucket, fileCount: 0, bytes: 0, mib: 0 };
    current.fileCount += 1;
    current.bytes += stats.size;
    current.mib = bytesToMiB(current.bytes);
    topDirs.set(bucket, current);
    if (dbExtensions.has(path.extname(file).toLowerCase())) {
      dbFiles.push({ path: relative, bytes: stats.size, mib: bytesToMiB(stats.size), kind: relative === ".local/self-media.sqlite" ? "operating_db" : "local_or_acceptance_db" });
    }
    if (SENSITIVE_LOCAL_PATTERN.test(relative)) {
      sensitiveLocalAssets.push(relative);
    }
  }

  dbFiles.sort((a, b) => b.bytes - a.bytes);
  topFiles.sort((a, b) => b.bytes - a.bytes);
  const topDirList = [...topDirs.values()].sort((a, b) => b.bytes - a.bytes);
  const overLimit = files.length > LOCAL_LIMITS.fileCount || totalBytes > LOCAL_LIMITS.totalBytes || dbFiles.length > LOCAL_LIMITS.dbCount;
  return {
    fileCount: files.length,
    totalBytes,
    totalMiB: bytesToMiB(totalBytes),
    dbCount: dbFiles.length,
    limits: { ...LOCAL_LIMITS, totalMiB: bytesToMiB(LOCAL_LIMITS.totalBytes) },
    overLimit,
    dbFiles: dbFiles.slice(0, 50),
    topFiles: topFiles.slice(0, 20),
    topDirs: topDirList.slice(0, 20),
    sensitiveLocalAssets: sensitiveLocalAssets.slice(0, 100)
  };
}

function packageScripts() {
  const pkg = JSON.parse(readIfExists("package.json") || "{}");
  return pkg.scripts ?? {};
}

function scriptStats(status) {
  const files = listFiles("scripts", { recursive: false }).filter((file) => TEXT_EXTENSIONS.has(path.extname(file)));
  const scripts = packageScripts();
  const scriptValues = Object.values(scripts).join("\n");
  const records = files.map((file) => {
    const relative = rel(file);
    const name = path.basename(relative);
    const indexedByPackage = scriptValues.includes(relative) || scriptValues.includes(name);
    const statusKind = status.untracked.includes(relative) ? "untracked" : "tracked_or_modified";
    const duplicateGroup = name
      .replace(/^(douyin|xiaohongshu|video-account|bilibili|wechat)-/, "<platform>-")
      .replace(/-\d{3,}/g, "-<task>")
      .replace(/-(036|038|039|044)/g, "-<task>");
    return { path: relative, name, indexedByPackage, statusKind, duplicateGroup };
  });
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.duplicateGroup) ?? [];
    group.push(record.path);
    groups.set(record.duplicateGroup, group);
  }
  const duplicateCandidates = [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([group, paths]) => ({ group, paths }))
    .sort((a, b) => b.paths.length - a.paths.length);
  const unindexed = records.filter((item) => !item.indexedByPackage).map((item) => item.path);
  const untracked = records.filter((item) => item.statusKind === "untracked").map((item) => item.path);
  const staleOrPaused = records
    .filter((item) => PAUSED_PATTERN.test(item.path) || /browser|discovery|preview|e2e|smoke/i.test(item.path))
    .map((item) => item.path);
  return {
    totalFiles: records.length,
    packageScriptCount: Object.keys(scripts).length,
    untrackedCount: untracked.length,
    unindexedCount: unindexed.length,
    duplicateCandidateCount: duplicateCandidates.length,
    untracked,
    unindexed,
    duplicateCandidates,
    staleOrPausedCandidates: staleOrPaused
  };
}

function dbPollutionEvidence() {
  const dbPath = path.resolve(rootDir, ".local/self-media.sqlite");
  const evidence = {
    dbPath: rel(dbPath),
    exists: existsSync(dbPath),
    readOnly: true,
    status: "missing_db",
    scannedTables: [],
    suspectRecordCount: 0,
    suspectSamples: []
  };
  if (!evidence.exists) return evidence;

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const tableRows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
    const tables = tableRows.map((row) => row.name).filter((name) => ["entities", "import_runs"].includes(name));
    evidence.scannedTables = tables;
    if (tables.includes("entities")) {
      const rows = db.prepare("SELECT collection, id, data FROM entities").all();
      for (const row of rows) {
        const data = parseJson(row.data);
        if (isQuarantinedDbRecord(data)) continue;
        const text = `${row.collection} ${row.id} ${row.data ?? ""}`;
        if (TEST_DATA_PATTERN.test(text)) {
          evidence.suspectRecordCount += 1;
          if (evidence.suspectSamples.length < 25) {
            evidence.suspectSamples.push({ table: "entities", collection: row.collection, id: row.id, reason: "test_like_marker_in_id_or_json" });
          }
        }
      }
    }
    if (tables.includes("import_runs")) {
      const rows = db.prepare("SELECT id, source, status, data FROM import_runs").all();
      for (const row of rows) {
        const data = parseJson(row.data);
        if (isQuarantinedDbRecord(data)) continue;
        const text = `${row.id} ${row.source} ${row.status} ${row.data ?? ""}`;
        if (TEST_DATA_PATTERN.test(text)) {
          evidence.suspectRecordCount += 1;
          if (evidence.suspectSamples.length < 25) {
            evidence.suspectSamples.push({ table: "import_runs", id: row.id, source: row.source, reason: "test_like_marker_in_id_source_or_json" });
          }
        }
      }
    }
    evidence.status = "ok";
    return evidence;
  } catch (error) {
    evidence.status = "scan_failed";
    evidence.error = error instanceof Error ? error.message : String(error);
    return evidence;
  } finally {
    db.close();
  }
}

function buildClassification(report) {
  const mustKeep = [
    "docs/handoffs/CURRENT-PLATFORM-STATUS.md",
    "docs/handoffs/README.md",
    "docs/product-specs/index.md",
    "docs/golden-principles.md",
    "docs/agent-playbook.md",
    "scripts/entropy-governance-scan.mjs",
    ".local/self-media.sqlite"
  ];
  const archiveCandidates = [
    ...report.handoffs.archivalCandidates.slice(0, 80),
    ...report.specs.unindexed.filter((file) => PAUSED_PATTERN.test(file)).slice(0, 20),
    ...report.scripts.staleOrPausedCandidates.slice(0, 40)
  ];
  const deleteRequiresConfirmation = [
    ...report.local.dbFiles
      .filter((item) => item.kind !== "operating_db" && !SENSITIVE_LOCAL_PATTERN.test(item.path))
      .slice(0, 40)
      .map((item) => item.path),
    ...report.local.topDirs
      .filter((item) => /smoke|e2e|draft-review|main-session/i.test(item.path) && !SENSITIVE_LOCAL_PATTERN.test(item.path))
      .slice(0, 20)
      .map((item) => item.path)
  ];
  const migrateToLogsOrAcceptance = [
    ".local/entropy-governance-scan/report.md",
    ".local/platform-data-health/report.json",
    ".local/local-data-quarantine/report.md",
    ...report.local.topDirs.filter((item) => /screenshots?|report|weekly|daily/i.test(item.path)).slice(0, 20).map((item) => item.path)
  ];
  const sensitiveLocalAssets = [
    ".local/self-media.sqlite",
    ...report.local.sensitiveLocalAssets.filter((item) => item !== ".local/self-media.sqlite").slice(0, 60)
  ];
  return {
    mustKeep: [...new Set(mustKeep)],
    archiveCandidates: [...new Set(archiveCandidates)],
    deleteRequiresUserConfirmation: [...new Set(deleteRequiresConfirmation)],
    mustMigrateToLogsOrAcceptanceArea: [...new Set(migrateToLogsOrAcceptance)],
    sensitiveOrLocalOnlyDoNotMoveWithoutDecision: [...new Set(sensitiveLocalAssets)]
  };
}

function buildReport() {
  const status = parseStatus();
  const report = {
    taskId: "ENTROPY-GOVERNANCE-SCAN-073",
    generatedAt: new Date().toISOString(),
    mode: "read_only_scan",
    safety: {
      destructiveActions: false,
      fileDeletes: false,
      databaseWrites: false,
      reportOnly: true
    },
    git: status,
    handoffs: handoffStats(status),
    specs: specStats(status),
    local: localStats(),
    scripts: scriptStats(status),
    operatingDbPollution: dbPollutionEvidence()
  };
  report.classification = buildClassification(report);
  return report;
}

function listLines(items, limit = 30) {
  const visible = items.slice(0, limit);
  const lines = visible.map((item) => `- ${typeof item === "string" ? item : JSON.stringify(item)}`);
  if (items.length > visible.length) lines.push(`- ... ${items.length - visible.length} more in report.json`);
  return lines;
}

function toMarkdown(report) {
  const lines = [
    "# Entropy Governance Scan 073",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Mode: ${report.mode}`,
    `- Safety: destructiveActions=${report.safety.destructiveActions}, fileDeletes=${report.safety.fileDeletes}, databaseWrites=${report.safety.databaseWrites}`,
    "",
    "## Current Disorder Counts",
    "",
    `- Git modified count: ${report.git.modifiedCount}`,
    `- Git untracked count: ${report.git.untrackedCount}`,
    `- docs/handoffs files: ${report.handoffs.totalFiles}; untracked: ${report.handoffs.untrackedCount}; archival candidates sampled: ${report.handoffs.archivalCandidateCount}`,
    `- docs/product-specs files: ${report.specs.totalFiles}; untracked: ${report.specs.untrackedCount}; unindexed: ${report.specs.unindexedCount}`,
    `- .local files: ${report.local.fileCount}; size: ${report.local.totalMiB} MiB; sqlite/db count: ${report.local.dbCount}; over limit: ${report.local.overLimit}`,
    `- scripts files: ${report.scripts.totalFiles}; untracked: ${report.scripts.untrackedCount}; not referenced by package scripts: ${report.scripts.unindexedCount}; duplicate groups: ${report.scripts.duplicateCandidateCount}`,
    `- Real operating DB suspect acceptance/demo/test records: ${report.operatingDbPollution.suspectRecordCount}`,
    "",
    "## Classification",
    "",
    "### Must Keep",
    "",
    ...listLines(report.classification.mustKeep),
    "",
    "### Archive Candidates",
    "",
    ...listLines(report.classification.archiveCandidates),
    "",
    "### Delete Only After User Confirmation",
    "",
    ...listLines(report.classification.deleteRequiresUserConfirmation),
    "",
    "### Migrate To Logs Or Acceptance Area",
    "",
    ...listLines(report.classification.mustMigrateToLogsOrAcceptanceArea),
    "",
    "### Sensitive Or Local Only",
    "",
    ...listLines(report.classification.sensitiveOrLocalOnlyDoNotMoveWithoutDecision),
    "",
    "## Script Duplicate Candidates",
    "",
    ...listLines(report.scripts.duplicateCandidates, 20),
    "",
    "## Operating DB Pollution Samples",
    "",
    ...listLines(report.operatingDbPollution.suspectSamples, 25),
    "",
    "No files were deleted. No database rows were inserted, updated, or deleted."
  ];
  return `${lines.join("\n")}\n`;
}

const report = buildReport();
mkdirSync(outDir, { recursive: true });
writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(reportMdPath, toMarkdown(report), "utf8");

console.log(
  JSON.stringify(
    {
      status: "ok",
      taskId: report.taskId,
      reportJson: rel(reportJsonPath),
      reportMd: rel(reportMdPath),
      git: {
        modifiedCount: report.git.modifiedCount,
        untrackedCount: report.git.untrackedCount
      },
      handoffs: {
        totalFiles: report.handoffs.totalFiles,
        untrackedCount: report.handoffs.untrackedCount
      },
      specs: {
        totalFiles: report.specs.totalFiles,
        unindexedCount: report.specs.unindexedCount
      },
      local: {
        fileCount: report.local.fileCount,
        totalMiB: report.local.totalMiB,
        dbCount: report.local.dbCount,
        overLimit: report.local.overLimit
      },
      operatingDbPollution: {
        status: report.operatingDbPollution.status,
        suspectRecordCount: report.operatingDbPollution.suspectRecordCount
      }
    },
    null,
    2
  )
);
