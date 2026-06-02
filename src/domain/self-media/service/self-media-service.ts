import { selfMediaPlatforms } from "../config";
import { CsvPresetProvider, FakeSelfMediaProvider, ManualImportProvider, MediaCrawlerImportProvider, N8nExecutionProvider } from "../providers";
import { SqliteSelfMediaRepo } from "../repo";
import type {
  AuditRecord,
  AutomationRun,
  AutomationRunRequest,
  CalendarQuery,
  ContentPlatformVersion,
  ContentPlatformVersionRequest,
  ContentItem,
  CsvImportPreset,
  DashboardSnapshot,
  EvidenceInsight,
  Experiment,
  ActionItemPatchRequest,
  IdeaCreateRequest,
  IdeaStatusRequest,
  IdeaToContentRequest,
  IdeaToContentResult,
  ImportPreviewResult,
  ImportDiffKind,
  ImportRequest,
  ImportResult,
  ImportSource,
  LeadCreateRequest,
  LeadPatchRequest,
  MetricSnapshot,
  MetricSnapshotRequest,
  MonetizationLead,
  PlatformAccount,
  PlatformChecklist,
  PlatformVersionPatchRequest,
  PlatformVersionStatus,
  ProviderImportPayload,
  PublishCalendarItem,
  PublishQueueItem,
  PublishQueueStatus,
  PublishRecord,
  PublishQueueTransitionRequest,
  PublishQueueTransitionResult,
  ReviewActionItem,
  SaveReviewRequest,
  SavedReview,
  TopicIdea,
  WorkbenchErrorKind
} from "../types";
import { createTraceId, createWorkbenchError, levelForError, writeLog } from "./observability-service";
import { generateReview } from "./review-service";

function createAccounts(): PlatformAccount[] {
  return selfMediaPlatforms.slice(0, 4).map((platform) => ({
    id: `account-${platform.id}`,
    platform: platform.id,
    handle: `ai-new-world-${platform.id}`,
    displayName: `AI 新世界 ${platform.label}`
  }));
}

function createExperiments(): Experiment[] {
  return [
    { id: "exp-cadence", title: "轻量高频发布实验", hypothesis: "15 秒精华和过程图文能提高发布频率并减少完美主义阻力。", status: "planned" },
    { id: "exp-personal-expression", title: "真人表达训练实验", hypothesis: "固定每日 AI 观点分享能提升信任和线索转化。", status: "planned" }
  ];
}

function createQueue(): PublishQueueItem[] {
  return [
    { id: "queue-wechat-review", contentId: "content-ai-thinking-001", platform: "wechat", status: "scheduled", scheduledAt: "2026-06-02T09:00:00.000Z", nextAction: "发布前人工确认标题和摘要。" },
    { id: "queue-xhs-product", contentId: "content-product-001", platform: "xiaohongshu", status: "needs_review", scheduledAt: "2026-06-03T12:00:00.000Z", nextAction: "补封面和前三秒钩子。" }
  ];
}

function createAudits(): AuditRecord[] {
  return [
    { id: "audit-provider-boundary", target: "Providers", status: "pass", finding: "外部数据先通过 Providers 转为内部模型。", createdAt: new Date().toISOString() },
    { id: "audit-observability-o1", target: "O1", status: "warn", finding: "结构化日志已落地，Chrome DevTools 和本地观测栈仍在 O2/O3。", createdAt: new Date().toISOString() }
  ];
}

const queueTransitions: Record<PublishQueueStatus, PublishQueueStatus[]> = {
  draft: ["needs_review", "blocked"],
  needs_review: ["queued", "blocked"],
  queued: ["scheduled", "blocked"],
  scheduled: ["publishing", "blocked"],
  publishing: ["published", "failed"],
  published: [],
  failed: ["needs_review", "blocked"],
  blocked: ["needs_review"]
};

const platformVersionTransitions: Record<PlatformVersionStatus, PlatformVersionStatus[]> = {
  draft: ["needs_review", "blocked"],
  needs_review: ["scheduled", "blocked"],
  scheduled: ["published", "failed", "blocked"],
  published: [],
  failed: ["needs_review", "blocked"],
  blocked: ["needs_review"]
};

const defaultChecklist: PlatformChecklist = {
  title: false,
  cover: false,
  script: false,
  platformFit: false,
  humanConfirmed: false
};

function importSourceForMode(mode: ImportRequest["mode"]): ImportSource {
  if (mode === "mediacrawler") return "mediacrawler";
  if (mode === "n8n") return "n8n";
  if (mode === "manual") return "manual";
  if (mode === "csv") return "csv";
  return "json";
}

function createPayloadFromRequest(service: SelfMediaService, request: ImportRequest): ProviderImportPayload {
  if (request.mode === "csv") return service.parseCsvPayload(request.csv ?? "", request.preset ?? "generic");
  if (request.mode === "json") return service.parseJsonPayload(request.json);
  if (request.mode === "mediacrawler") return service.parseMediaCrawlerPayload(request.json);
  if (request.mode === "n8n") return service.parseN8nPayload(request.json);
  if (request.mode === "manual" && request.manual) return service.parseManualPayload(request.manual);
  throw new Error("不支持的导入模式。");
}

function checklistScore(checklist: PlatformChecklist) {
  const values = Object.values(checklist);
  return { done: values.filter(Boolean).length, total: values.length };
}

function snapshotId(platformVersionId: string, snapshotDate: string) {
  return `snapshot-${platformVersionId}-${snapshotDate}`;
}

function dateOnly(value: string | undefined) {
  return (value ?? new Date().toISOString()).slice(0, 10);
}

function statusFromContent(content: ContentItem): PlatformVersionStatus {
  if (content.status === "published" || content.publishedAt) return "published";
  if (content.status === "scheduled" || content.scheduledAt) return "scheduled";
  return "draft";
}

export class SelfMediaService {
  constructor(
    private readonly repo = new SqliteSelfMediaRepo(),
    private readonly fakeProvider = new FakeSelfMediaProvider(),
    private readonly manualProvider = new ManualImportProvider(),
    private readonly csvPresetProvider = new CsvPresetProvider(),
    private readonly mediaCrawlerProvider = new MediaCrawlerImportProvider(),
    private readonly n8nProvider = new N8nExecutionProvider()
  ) {}

  async ensureSeedData() {
    const traceId = createTraceId("seed");
    try {
      const payload = await this.fakeProvider.importSample();
      const seeded = this.repo.seedIfEmpty(payload);
      for (const item of createAccounts()) this.repo.upsertEntity("accounts", item.id, item);
      for (const item of createExperiments()) this.repo.upsertEntity("experiments", item.id, item);
      for (const item of createQueue()) this.repo.upsertEntity("queue", item.id, item);
      for (const item of createAudits()) this.repo.upsertEntity("audits", item.id, item);
      if (seeded) writeLog(this.repo, { level: "info", event: "self_media.seed", scope: "service", message: "Self-media sample data is ready.", traceId });
    } catch (error) {
      const workbenchError = createWorkbenchError("persistence", "Failed to seed self-media data.", traceId, error);
      writeLog(this.repo, { level: levelForError(workbenchError.kind), event: "self_media.seed_failed", scope: "service", message: workbenchError.message, traceId, data: workbenchError });
      throw error;
    }
  }

  importPayload(payload: ProviderImportPayload) {
    const traceId = createTraceId("import");
    const run = this.repo.savePayload(payload);
    for (const content of payload.contents) {
      const existing = this.repo.getEntity<ContentPlatformVersion>("platformVersions", `version-${content.id}-${content.platform}`);
      const version: ContentPlatformVersion = {
        id: `version-${content.id}-${content.platform}`,
        contentId: content.id,
        platform: content.platform,
        title: content.title,
        body: existing?.body ?? content.notes ?? "",
        script: existing?.script ?? "",
        coverNote: existing?.coverNote ?? "",
        scheduledAt: content.scheduledAt ?? existing?.scheduledAt,
        publishedAt: content.publishedAt ?? existing?.publishedAt,
        status: existing?.status ?? statusFromContent(content),
        failureReason: existing?.failureReason,
        nextAction: existing?.nextAction ?? "根据平台表现决定是否二次分发。",
        checklist: existing?.checklist ?? { ...defaultChecklist, title: Boolean(content.title), humanConfirmed: Boolean(content.publishedAt) },
        updatedAt: new Date().toISOString()
      };
      this.repo.upsertEntity("platformVersions", version.id, version);
    }
    for (const metric of payload.metrics) {
      const versionId = `version-${metric.contentId}-${metric.platform}`;
      const version = this.repo.getEntity<ContentPlatformVersion>("platformVersions", versionId);
      if (version) {
        const snapshot: MetricSnapshot = {
          id: snapshotId(versionId, dateOnly(metric.capturedAt)),
          platformVersionId: versionId,
          contentId: metric.contentId,
          platform: metric.platform,
          snapshotDate: dateOnly(metric.capturedAt),
          views: metric.views,
          likes: metric.likes,
          comments: metric.comments,
          saves: metric.saves,
          shares: metric.shares,
          followersDelta: metric.followersDelta,
          source: payload.source,
          importRunId: run.id,
          updatedAt: new Date().toISOString()
        };
        this.repo.upsertEntity("metricSnapshots", snapshot.id, snapshot);
      }
    }
    run.traceId = traceId;
    this.repo.recordImport(run);
    writeLog(this.repo, {
      level: "info",
      event: "self_media.import",
      scope: "provider",
      message: `Imported ${run.importedCount} records from ${payload.source}.`,
      traceId,
      data: { source: payload.source, importedCount: run.importedCount }
    });
    return { run, traceId } satisfies ImportResult;
  }

  importJson(input: unknown) {
    return this.importPayload(this.manualProvider.fromJson(input));
  }

  importCsv(csv: string) {
    return this.importPayload(this.csvPresetProvider.fromCsv(csv, "generic"));
  }

  importCsvPreset(csv: string, preset: CsvImportPreset = "generic") {
    return this.importPayload(this.csvPresetProvider.fromCsv(csv, preset));
  }

  importManual(input: NonNullable<ImportRequest["manual"]>) {
    return this.importPayload(this.manualProvider.fromManual(input));
  }

  importMediaCrawler(input: unknown) {
    return this.importPayload(this.mediaCrawlerProvider.fromJson(input));
  }

  importN8nExecution(input: unknown) {
    return this.importPayload(this.n8nProvider.fromJson(input));
  }

  csvTemplate(preset: CsvImportPreset = "generic") {
    return this.csvPresetProvider.template(preset);
  }

  parseCsvPayload(csv: string, preset: CsvImportPreset = "generic") {
    return this.csvPresetProvider.fromCsv(csv, preset);
  }

  parseJsonPayload(input: unknown) {
    return this.manualProvider.fromJson(input);
  }

  parseManualPayload(input: NonNullable<ImportRequest["manual"]>) {
    return this.manualProvider.fromManual(input);
  }

  parseMediaCrawlerPayload(input: unknown) {
    return this.mediaCrawlerProvider.fromJson(input);
  }

  parseN8nPayload(input: unknown) {
    return this.n8nProvider.fromJson(input);
  }

  previewImportRequest(request: ImportRequest): ImportPreviewResult {
    const traceId = createTraceId("preview");
    const payload = createPayloadFromRequest(this, request);
    const existingIds = new Set(this.repo.listContents().map((item) => item.id));
    const existingSnapshots = new Set(this.repo.listMetricSnapshots().map((item) => `${item.contentId}:${item.platform}:${item.snapshotDate}`));
    const duplicateContentIds = payload.contents.filter((item) => existingIds.has(item.id)).map((item) => item.id);
    const diff = payload.contents.map((item) => {
      const metric = payload.metrics.find((entry) => entry.contentId === item.id);
      const key = `${item.id}:${item.platform}:${dateOnly(metric?.capturedAt)}`;
      const kind: ImportDiffKind = !item.title ? "invalid" : existingSnapshots.has(key) ? "update" : existingIds.has(item.id) ? "duplicate" : "new";
      return { id: item.id, title: item.title, platform: item.platform, kind, reason: kind === "update" ? "同一内容/平台/日期已有指标快照，将按 merge 更新。" : undefined };
    });
    writeLog(this.repo, {
      level: duplicateContentIds.length > 0 ? "warn" : "info",
      event: "self_media.import_preview",
      scope: "service",
      message: `Previewed ${payload.contents.length} content rows from ${payload.source}.`,
      traceId,
      data: { source: payload.source, duplicates: duplicateContentIds.length }
    });
    return {
      traceId,
      source: payload.source,
      importedCount: payload.contents.length + payload.metrics.length + (payload.ideas?.length ?? 0),
      contentCount: payload.contents.length,
      metricCount: payload.metrics.length,
      ideaCount: payload.ideas?.length ?? 0,
      duplicateContentIds,
      diff,
      warnings: payload.warnings ?? [],
      items: diff.slice(0, 8)
    };
  }

  importRequest(request: ImportRequest): ImportResult {
    const traceId = createTraceId("import-request");
    try {
      if (request.mode === "csv") return this.importCsvPreset(request.csv ?? "", request.preset ?? "generic");
      if (request.mode === "json") return this.importJson(request.json);
      if (request.mode === "mediacrawler") return this.importMediaCrawler(request.json);
      if (request.mode === "n8n") return this.importN8nExecution(request.json);
      if (request.mode === "manual" && request.manual) return this.importManual(request.manual);
      throw new Error("不支持的导入模式。");
    } catch (error) {
      const kind: WorkbenchErrorKind = error instanceof Error && error.message.includes("必须") ? "validation" : "provider";
      const workbenchError = createWorkbenchError(kind, "Import request failed.", traceId, error);
      const source = importSourceForMode(request.mode);
      const run = {
        id: `import-failed-${Date.now()}`,
        source,
        status: "failed" as const,
        importedCount: 0,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage: workbenchError.cause ?? workbenchError.message,
        traceId,
        warnings: request.preset ? [`preset:${request.preset}`] : undefined
      };
      this.repo.recordImport(run);
      writeLog(this.repo, {
        level: levelForError(workbenchError.kind),
        event: "self_media.import_failed",
        scope: "provider",
        message: run.errorMessage ?? workbenchError.message,
        traceId,
        data: workbenchError
      });
      return { run, traceId };
    }
  }

  createIdea(input: IdeaCreateRequest) {
    const traceId = createTraceId("idea");
    const idea: TopicIdea = {
      id: `idea-manual-${Date.now()}`,
      title: input.title.trim(),
      source: input.source ?? "manual",
      platform: input.platform,
      confidence: input.confidence ?? 0.72,
      status: "new",
      rationale: input.rationale,
      nextAction: input.nextAction,
      createdAt: new Date().toISOString()
    };
    if (!idea.title) throw new Error("选题标题不能为空。");
    this.repo.upsertEntity("ideas", idea.id, idea);
    writeLog(this.repo, { level: "info", event: "self_media.idea_created", scope: "service", message: `Created idea ${idea.id}.`, traceId, data: { id: idea.id } });
    return { idea, traceId };
  }

  updateIdeaStatus(input: IdeaStatusRequest) {
    const traceId = createTraceId("idea-status");
    const idea = this.repo.getEntity<TopicIdea>("ideas", input.id);
    if (!idea) throw new Error(`找不到选题：${input.id}`);
    const updated: TopicIdea = { ...idea, status: input.status };
    this.repo.upsertEntity("ideas", updated.id, updated);
    writeLog(this.repo, { level: "info", event: "self_media.idea_status", scope: "service", message: `Idea ${updated.id} moved to ${updated.status}.`, traceId, data: { id: updated.id, status: updated.status } });
    return { idea: updated, traceId };
  }

  convertIdeaToContent(input: IdeaToContentRequest): IdeaToContentResult {
    const traceId = createTraceId("idea-content");
    const idea = this.repo.getEntity<TopicIdea>("ideas", input.id);
    if (!idea) throw new Error(`找不到选题：${input.id}`);
    const now = Date.now();
    const content: ContentItem = {
      id: `content-from-${idea.id}-${now}`,
      title: idea.title,
      platform: idea.platform,
      status: "draft",
      format: idea.platform === "wechat" ? "article" : idea.platform === "xiaohongshu" ? "image_text" : "short_video",
      topic: idea.title,
      scheduledAt: input.scheduledAt,
      notes: idea.rationale
    };
    const queue: PublishQueueItem = {
      id: `queue-from-${content.id}`,
      contentId: content.id,
      platform: content.platform,
      status: "draft",
      scheduledAt: input.scheduledAt ?? new Date(Date.now() + 86400000).toISOString(),
      nextAction: "补充脚本、封面和平台版本。"
    };
    const updatedIdea: TopicIdea = { ...idea, status: "produced" };
    this.repo.upsertEntity("contents", content.id, content);
    this.repo.upsertEntity("queue", queue.id, queue);
    this.repo.upsertEntity("ideas", updatedIdea.id, updatedIdea);
    this.upsertPlatformVersion({
      contentId: content.id,
      platform: content.platform,
      title: content.title,
      body: content.notes,
      scheduledAt: queue.scheduledAt,
      status: "draft",
      nextAction: queue.nextAction
    });
    writeLog(this.repo, { level: "info", event: "self_media.idea_to_content", scope: "service", message: `Converted idea ${idea.id} to draft content.`, traceId, data: { ideaId: idea.id, contentId: content.id, queueId: queue.id } });
    return { idea: updatedIdea, content, queue, traceId };
  }

  createLead(input: LeadCreateRequest) {
    const traceId = createTraceId("lead");
    const lead: MonetizationLead = {
      id: `lead-${Date.now()}`,
      source: input.source.trim(),
      demand: input.demand.trim(),
      status: input.status ?? "new",
      valueEstimate: input.valueEstimate,
      nextAction: input.nextAction,
      updatedAt: new Date().toISOString()
    };
    if (!lead.source || !lead.demand) throw new Error("线索来源和需求不能为空。");
    this.repo.upsertEntity("leads", lead.id, lead);
    writeLog(this.repo, { level: "info", event: "self_media.lead_created", scope: "service", message: `Created monetization lead ${lead.id}.`, traceId, data: { id: lead.id, valueEstimate: lead.valueEstimate } });
    return { lead, traceId };
  }

  upsertPlatformVersion(input: ContentPlatformVersionRequest) {
    const traceId = createTraceId("version");
    const existing = input.id ? this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.id) : undefined;
    const now = new Date().toISOString();
    const version: ContentPlatformVersion = {
      id: input.id ?? `version-${input.contentId}-${input.platform}-${Date.now()}`,
      contentId: input.contentId,
      platform: input.platform,
      title: input.title,
      body: input.body ?? existing?.body ?? "",
      script: input.script ?? existing?.script ?? "",
      coverNote: input.coverNote ?? existing?.coverNote ?? "",
      scheduledAt: input.scheduledAt ?? existing?.scheduledAt,
      publishedAt: existing?.publishedAt,
      status: input.status ?? existing?.status ?? "draft",
      failureReason: existing?.failureReason,
      nextAction: input.nextAction ?? existing?.nextAction ?? "补齐平台版本并确认发布。",
      checklist: { ...defaultChecklist, ...(existing?.checklist ?? {}), ...(input.checklist ?? {}) },
      updatedAt: now
    };
    this.repo.upsertEntity("platformVersions", version.id, version);
    writeLog(this.repo, { level: "info", event: "self_media.platform_version_upserted", scope: "service", message: `Upserted platform version ${version.id}.`, traceId, data: { id: version.id, platform: version.platform } });
    return { version, traceId };
  }

  patchPlatformVersion(input: PlatformVersionPatchRequest) {
    const traceId = createTraceId("version-status");
    const version = this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.id);
    if (!version) throw new Error(`找不到平台版本：${input.id}`);
    if (input.status && input.status !== version.status && !platformVersionTransitions[version.status].includes(input.status)) throw new Error(`非法平台版本状态流转：${version.status} -> ${input.status}`);
    const updated: ContentPlatformVersion = {
      ...version,
      status: input.status ?? version.status,
      scheduledAt: input.scheduledAt ?? version.scheduledAt,
      publishedAt: input.publishedAt ?? (input.status === "published" ? new Date().toISOString() : version.publishedAt),
      failureReason: input.failureReason,
      nextAction: input.nextAction ?? version.nextAction,
      checklist: { ...version.checklist, ...(input.checklist ?? {}) },
      updatedAt: new Date().toISOString()
    };
    this.repo.upsertEntity("platformVersions", updated.id, updated);
    if (input.status && ["published", "failed", "blocked"].includes(input.status)) {
      const record: PublishRecord = {
        id: `publish-record-${updated.id}-${Date.now()}`,
        platformVersionId: updated.id,
        contentId: updated.contentId,
        platform: updated.platform,
        status: input.status === "published" ? "published" : input.status === "failed" ? "failed" : "blocked",
        happenedAt: new Date().toISOString(),
        note: input.failureReason ?? input.nextAction,
        traceId
      };
      this.repo.upsertEntity("publishRecords", record.id, record);
    }
    writeLog(this.repo, { level: "info", event: "self_media.platform_version_status", scope: "service", message: `Platform version ${updated.id} moved to ${updated.status}.`, traceId, data: { id: updated.id, status: updated.status } });
    return { version: updated, traceId };
  }

  calendar(query: CalendarQuery = {}) {
    const items = this.repo.listPlatformVersions().map((version): PublishCalendarItem => {
      const score = checklistScore(version.checklist);
      return {
        id: `calendar-${version.id}`,
        platformVersionId: version.id,
        contentId: version.contentId,
        platform: version.platform,
        status: version.status,
        scheduledAt: version.scheduledAt ?? new Date().toISOString(),
        title: version.title,
        blockers: version.failureReason ? [version.failureReason] : undefined,
        checklistDone: score.done,
        checklistTotal: score.total
      };
    });
    return items.filter((item) => (!query.platform || item.platform === query.platform) && (!query.status || item.status === query.status));
  }

  upsertMetricSnapshot(input: MetricSnapshotRequest) {
    const traceId = createTraceId("metric-snapshot");
    const version = this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.platformVersionId);
    if (!version) throw new Error(`找不到平台版本：${input.platformVersionId}`);
    const id = snapshotId(input.platformVersionId, input.snapshotDate);
    const snapshot: MetricSnapshot = {
      id,
      platformVersionId: input.platformVersionId,
      contentId: version.contentId,
      platform: version.platform,
      snapshotDate: input.snapshotDate,
      views: input.views,
      likes: input.likes ?? 0,
      comments: input.comments ?? 0,
      saves: input.saves ?? 0,
      shares: input.shares ?? 0,
      followersDelta: input.followersDelta ?? 0,
      source: input.source ?? "manual",
      updatedAt: new Date().toISOString()
    };
    this.repo.upsertEntity("metricSnapshots", snapshot.id, snapshot);
    writeLog(this.repo, { level: "info", event: "self_media.metric_snapshot_upserted", scope: "service", message: `Upserted metric snapshot ${snapshot.id}.`, traceId, data: { id: snapshot.id } });
    return { snapshot, traceId };
  }

  createAutomationRun(input: AutomationRunRequest) {
    const traceId = createTraceId("automation");
    const status = input.status ?? "success";
    const run: AutomationRun = {
      id: `automation-${Date.now()}`,
      kind: input.kind,
      status,
      traceId,
      retryCount: status === "retrying" ? 1 : 0,
      startedAt: new Date().toISOString(),
      finishedAt: ["success", "failed"].includes(status) ? new Date().toISOString() : undefined,
      errorMessage: input.errorMessage,
      source: input.source
    };
    this.repo.upsertEntity("automationRuns", run.id, run);
    writeLog(this.repo, { level: status === "failed" ? "error" : "info", event: "self_media.automation_run", scope: "service", message: `Automation run ${run.id} recorded as ${run.status}.`, traceId, data: { id: run.id, kind: run.kind, status: run.status } });
    return { run, traceId };
  }

  buildEvidenceInsights(): EvidenceInsight[] {
    const snapshots = this.repo.listMetricSnapshots();
    const versions = this.repo.listPlatformVersions();
    const leads = this.repo.listLeads();
    const top = [...snapshots].sort((a, b) => b.views + b.likes - (a.views + a.likes))[0];
    const blocked = versions.find((item) => item.status === "blocked" || item.status === "failed");
    const activeLead = leads.find((lead) => !["won", "lost"].includes(lead.status));
    return [
      top
        ? { id: "insight-top-snapshot", title: "高表现内容", finding: `${top.platform} 在 ${top.snapshotDate} 的曝光和互动最高，适合二次拆解。`, evidenceRefs: [{ type: "metric_snapshot", id: top.id }, { type: "platform_version", id: top.platformVersionId }] }
        : { id: "insight-top-snapshot", title: "高表现内容", finding: "暂无指标快照，先完成数据回收。", evidenceRefs: [] },
      blocked
        ? { id: "insight-blocked-publish", title: "发布阻塞", finding: `${blocked.platform} 版本存在阻塞或失败，需要先处理发布 checklist。`, evidenceRefs: [{ type: "platform_version", id: blocked.id }] }
        : { id: "insight-blocked-publish", title: "发布阻塞", finding: "当前没有阻塞的平台版本。", evidenceRefs: [] },
      activeLead
        ? { id: "insight-lead-followup", title: "线索推进", finding: `活跃线索需要跟进：${activeLead.nextAction}`, evidenceRefs: [{ type: "lead", id: activeLead.id }] }
        : { id: "insight-lead-followup", title: "线索推进", finding: "暂无活跃线索，复盘后应补充下一步触达。", evidenceRefs: [] }
    ];
  }

  saveReview(input: SaveReviewRequest) {
    const traceId = createTraceId("saved-review");
    const contents = this.repo.listContents();
    const metrics = this.repo.listMetrics();
    const ideas = this.repo.listIdeas();
    const queue = this.repo.listQueue();
    const leads = this.repo.listLeads();
    const platformVersions = this.repo.listPlatformVersions();
    const snapshots = this.repo.listMetricSnapshots();
    const report = generateReview(input.period, contents, metrics, { ideas, queue, leads });
    const insights = this.buildEvidenceInsights();
    const actionItems: ReviewActionItem[] = report.actions.map((action) => ({
      id: `action-item-${action.id}-${Date.now()}`,
      title: action.title,
      status: "todo",
      priority: action.priority,
      relatedType: action.id.includes("lead") ? "lead" : undefined,
      relatedId: action.id.includes("lead") ? leads.find((lead) => !["won", "lost"].includes(lead.status))?.id : undefined,
      updatedAt: new Date().toISOString()
    }));
    const saved: SavedReview = {
      id: `saved-${input.period}-${Date.now()}`,
      period: input.period,
      startDate: report.startDate,
      endDate: report.endDate,
      markdown: report.markdown,
      summary: report.summary,
      metrics: report.metrics,
      contentIds: contents.map((item) => item.id),
      platformVersionIds: platformVersions.map((item) => item.id),
      metricSnapshotIds: snapshots.map((item) => item.id),
      leadIds: leads.map((item) => item.id),
      actionItemIds: actionItems.map((item) => item.id),
      insights,
      createdAt: new Date().toISOString()
    };
    for (const item of actionItems) this.repo.upsertEntity("actionItems", item.id, { ...item, reviewId: saved.id });
    this.repo.upsertEntity("savedReviews", saved.id, saved);
    writeLog(this.repo, { level: "info", event: "self_media.review_saved", scope: "service", message: `Saved ${input.period} review ${saved.id}.`, traceId, data: { id: saved.id } });
    return { review: saved, actionItems, traceId };
  }

  updateActionItem(input: ActionItemPatchRequest) {
    const traceId = createTraceId("action");
    const item = this.repo.getEntity<ReviewActionItem>("actionItems", input.id);
    if (!item) throw new Error(`找不到行动项：${input.id}`);
    const updated: ReviewActionItem = { ...item, status: input.status, nextAction: input.nextAction ?? item.nextAction, updatedAt: new Date().toISOString() };
    this.repo.upsertEntity("actionItems", updated.id, updated);
    writeLog(this.repo, { level: "info", event: "self_media.action_item_status", scope: "service", message: `Action item ${updated.id} moved to ${updated.status}.`, traceId, data: { id: updated.id, status: updated.status } });
    return { actionItem: updated, traceId };
  }

  updateLead(input: LeadPatchRequest) {
    const traceId = createTraceId("lead-status");
    const lead = this.repo.getEntity<MonetizationLead>("leads", input.id);
    if (!lead) throw new Error(`找不到线索：${input.id}`);
    const updated: MonetizationLead = { ...lead, status: input.status, nextAction: input.nextAction ?? lead.nextAction, lastContactedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.repo.upsertEntity("leads", updated.id, updated);
    writeLog(this.repo, { level: "info", event: "self_media.lead_status", scope: "service", message: `Lead ${updated.id} moved to ${updated.status}.`, traceId, data: { id: updated.id, status: updated.status } });
    return { lead: updated, traceId };
  }

  updatePublishQueueStatus(request: PublishQueueTransitionRequest): PublishQueueTransitionResult {
    const traceId = createTraceId("queue");
    try {
      const item = this.repo.getEntity<PublishQueueItem>("queue", request.id);
      if (!item) throw new Error(`找不到发布队列项：${request.id}`);
      const allowed = queueTransitions[item.status];
      if (!allowed.includes(request.status)) throw new Error(`非法状态流转：${item.status} -> ${request.status}`);
      const updated: PublishQueueItem = {
        ...item,
        status: request.status,
        failureReason: request.failureReason,
        nextAction: request.nextAction ?? item.nextAction,
        updatedAt: new Date().toISOString()
      };
      this.repo.upsertEntity("queue", updated.id, updated);
      writeLog(this.repo, {
        level: "info",
        event: "self_media.queue_transition",
        scope: "service",
        message: `Publish queue ${item.id} moved ${item.status} -> ${updated.status}.`,
        traceId,
        data: { id: item.id, from: item.status, to: updated.status }
      });
      return { ok: true, item: updated, traceId };
    } catch (error) {
      const workbenchError = createWorkbenchError("validation", "Publish queue transition failed.", traceId, error);
      writeLog(this.repo, {
        level: "warn",
        event: "self_media.queue_transition_failed",
        scope: "service",
        message: workbenchError.cause ?? workbenchError.message,
        traceId,
        data: workbenchError
      });
      return { ok: false, traceId, errorMessage: workbenchError.cause ?? workbenchError.message };
    }
  }

  async dashboard(): Promise<DashboardSnapshot> {
    await this.ensureSeedData();
    const contents = this.repo.listContents();
    const metrics = this.repo.listMetrics();
    const ideas = this.repo.listIdeas();
    const queue = this.repo.listQueue();
    const leads = this.repo.listLeads();
    const platformVersions = this.repo.listPlatformVersions();
    const calendarItems = this.calendar();
    const metricSnapshots = this.repo.listMetricSnapshots();
    const savedReviews = this.repo.listSavedReviews();
    const actionItems = this.repo.listActionItems();
    const automationRuns = this.repo.listAutomationRuns();
    const evidenceInsights = this.buildEvidenceInsights();
    return {
      generatedAt: new Date().toISOString(),
      accounts: this.repo.listAccounts(),
      contents,
      metrics,
      ideas,
      competitors: this.repo.listCompetitors(),
      experiments: this.repo.listExperiments(),
      contacts: this.repo.listContacts(),
      leads,
      imports: this.repo.listImports(),
      queue,
      platformVersions,
      calendarItems,
      publishRecords: this.repo.listPublishRecords(),
      metricSnapshots,
      savedReviews,
      actionItems,
      automationRuns,
      evidenceInsights,
      weeklyReview: generateReview("weekly", contents, metrics, { ideas, queue, leads }),
      monthlyReview: generateReview("monthly", contents, metrics, { ideas, queue, leads }),
      logs: this.repo.listLogs(),
      audits: this.repo.listAudits()
    };
  }
}
