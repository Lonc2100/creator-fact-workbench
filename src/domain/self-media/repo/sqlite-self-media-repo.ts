import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { workbenchDbPath } from "../config";
import type {
  AuditRecord,
  AutomationRun,
  CompetitorProfile,
  Contact,
  ContentItem,
  ContentPlatformVersion,
  Experiment,
  ImportRun,
  MetricSnapshot,
  MonetizationLead,
  PlatformAccount,
  PlatformMetric,
  PublishRecord,
  ProviderImportPayload,
  PublishQueueItem,
  ReviewActionItem,
  SavedReview,
  TopicIdea,
  WorkbenchLog
} from "../types";

type JsonRecord = Record<string, unknown>;

function now() {
  return new Date().toISOString();
}

function toJson(value: unknown) {
  return JSON.stringify(value);
}

function fromJson<T>(value: unknown): T {
  return JSON.parse(String(value)) as T;
}

function rowToEntity<T>(row: unknown): T {
  return fromJson<T>((row as { data: string }).data);
}

function rowsToEntities<T>(rows: unknown[]): T[] {
  return rows.map((row) => rowToEntity<T>(row));
}

export class SqliteSelfMediaRepo {
  private readonly db: DatabaseSync;

  constructor(dbPath = workbenchDbPath) {
    const absolute = path.resolve(process.cwd(), dbPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    this.db = new DatabaseSync(absolute);
    this.initialize();
  }

  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (collection, id)
      );
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        event TEXT NOT NULL,
        scope TEXT NOT NULL,
        message TEXT NOT NULL,
        trace_id TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_runs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        imported_count INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        error_message TEXT,
        data TEXT NOT NULL
      );
    `);
  }

  close() {
    this.db.close();
  }

  upsertEntity(collection: string, id: string, data: JsonRecord | object) {
    this.db.prepare("INSERT OR REPLACE INTO entities (collection, id, data, updated_at) VALUES (?, ?, ?, ?)").run(collection, id, toJson(data), now());
  }

  listEntities<T>(collection: string): T[] {
    const rows = this.db.prepare("SELECT data FROM entities WHERE collection = ? ORDER BY updated_at DESC").all(collection);
    return rowsToEntities<T>(rows);
  }

  getEntity<T>(collection: string, id: string): T | undefined {
    const row = this.db.prepare("SELECT data FROM entities WHERE collection = ? AND id = ?").get(collection, id);
    return row ? rowToEntity<T>(row) : undefined;
  }

  appendLog(log: WorkbenchLog) {
    this.db
      .prepare("INSERT OR REPLACE INTO logs (id, level, event, scope, message, trace_id, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(log.id, log.level, log.event, log.scope, log.message, log.traceId, toJson(log.data ?? {}), log.createdAt);
  }

  listLogs(limit = 30): WorkbenchLog[] {
    return this.db
      .prepare("SELECT id, level, event, scope, message, trace_id as traceId, data, created_at as createdAt FROM logs ORDER BY created_at DESC LIMIT ?")
      .all(limit)
      .map((row) => {
        const item = row as unknown as WorkbenchLog & { data: string };
        return { ...item, data: fromJson<Record<string, unknown>>(item.data) };
      });
  }

  recordImport(run: ImportRun) {
    this.db
      .prepare("INSERT OR REPLACE INTO import_runs (id, source, status, imported_count, started_at, finished_at, error_message, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(run.id, run.source, run.status, run.importedCount, run.startedAt, run.finishedAt ?? null, run.errorMessage ?? null, toJson(run));
  }

  listImports(): ImportRun[] {
    return this.db.prepare("SELECT data FROM import_runs ORDER BY started_at DESC").all().map((row) => rowToEntity<ImportRun>(row));
  }

  savePayload(payload: ProviderImportPayload) {
    const run: ImportRun = {
      id: `import-${payload.source}-${Date.now()}`,
      source: payload.source,
      status: "success",
      importedCount: payload.contents.length + payload.metrics.length + (payload.ideas?.length ?? 0),
      startedAt: now(),
      finishedAt: now(),
      warnings: payload.warnings
    };
    for (const item of payload.contents) this.upsertEntity("contents", item.id, item);
    for (const item of payload.metrics) this.upsertEntity("metrics", item.id, item);
    for (const item of payload.ideas ?? []) this.upsertEntity("ideas", item.id, item);
    for (const item of payload.competitors ?? []) this.upsertEntity("competitors", item.id, item);
    for (const item of payload.contacts ?? []) this.upsertEntity("contacts", item.id, item);
    for (const item of payload.leads ?? []) this.upsertEntity("leads", item.id, item);
    this.recordImport(run);
    return run;
  }

  seedIfEmpty(payload: ProviderImportPayload) {
    const existing = this.listEntities<ContentItem>("contents");
    if (existing.length === 0) {
      this.savePayload(payload);
      return true;
    }
    return false;
  }

  listAccounts() {
    return this.listEntities<PlatformAccount>("accounts");
  }

  listContents() {
    return this.listEntities<ContentItem>("contents");
  }

  listMetrics() {
    return this.listEntities<PlatformMetric>("metrics");
  }

  listIdeas() {
    return this.listEntities<TopicIdea>("ideas");
  }

  listCompetitors() {
    return this.listEntities<CompetitorProfile>("competitors");
  }

  listExperiments() {
    return this.listEntities<Experiment>("experiments");
  }

  listContacts() {
    return this.listEntities<Contact>("contacts");
  }

  listLeads() {
    return this.listEntities<MonetizationLead>("leads");
  }

  listQueue() {
    return this.listEntities<PublishQueueItem>("queue");
  }

  listPlatformVersions() {
    return this.listEntities<ContentPlatformVersion>("platformVersions");
  }

  listPublishRecords() {
    return this.listEntities<PublishRecord>("publishRecords");
  }

  listMetricSnapshots() {
    return this.listEntities<MetricSnapshot>("metricSnapshots");
  }

  listSavedReviews() {
    return this.listEntities<SavedReview>("savedReviews");
  }

  listActionItems() {
    return this.listEntities<ReviewActionItem>("actionItems");
  }

  listAutomationRuns() {
    return this.listEntities<AutomationRun>("automationRuns");
  }

  listAudits() {
    return this.listEntities<AuditRecord>("audits");
  }
}
