import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { platformImportOperationCapabilities } from "../config";
import { SelfMediaService } from "../service";
import type {
  ActionItemPatchRequest,
  ActionItemFromSuggestionRequest,
  ActionItemToContentRequest,
  AutomationRunRequest,
  CalendarQuery,
  ConfirmPlatformVersionPublishRequest,
  ContentDraftReviewRequest,
  ContentTrustScopePatchRequest,
  ContentPlatformVersionRequest,
  CsvImportPreset,
  IdeaCreateRequest,
  IdeaStatusRequest,
  IdeaToContentRequest,
  ImportResult,
  ImportRequest,
  ImportProvenanceMetadata,
  LeadCreateRequest,
  LeadPatchRequest,
  MetricSnapshotRequest,
  PlatformImportOperationPlatform,
  PlatformImportOperationRequest,
  PlatformImportOperationResult,
  PlatformImportOperationSummary,
  PlatformImportStatus,
  PlatformVersionPatchRequest,
  ProviderImportPayload,
  PublishQueueTransitionRequest,
  SaveReviewRequest,
  WechatOfficialSyncRequest
} from "../types";

export async function getSelfMediaDashboard() {
  const service = new SelfMediaService();
  return service.dashboard();
}

export async function getSelfMediaContentWorkbench() {
  const service = new SelfMediaService();
  return service.contentWorkbench();
}

export async function getSelfMediaTrustedWeeklySafeReport() {
  const service = new SelfMediaService();
  return service.trustedWeeklySafeReport();
}

export async function importSelfMediaJson(input: unknown) {
  const service = new SelfMediaService();
  return service.importJson(input);
}

export async function importSelfMediaCsv(input: string) {
  const service = new SelfMediaService();
  return service.importCsv(input);
}

export async function importSelfMediaRequest(input: ImportRequest) {
  const service = new SelfMediaService();
  return service.importRequest(input);
}

export async function updateSelfMediaContentTrustedScope(input: ContentTrustScopePatchRequest) {
  const service = new SelfMediaService();
  return service.updateContentTrustedScope(input);
}

export async function previewDouyinPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.parseDouyinPersonalCaptures(input);
}

export async function importDouyinPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.importDouyinPersonalCaptures(input);
}

export async function previewXiaohongshuPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.parseXiaohongshuPersonalCaptures(input);
}

export async function importXiaohongshuPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.importXiaohongshuPersonalCaptures(input);
}

export async function previewVideoAccountPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.parseVideoAccountPersonalCaptures(input);
}

export async function importVideoAccountPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.importVideoAccountPersonalCaptures(input);
}

export async function previewBilibiliPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.parseBilibiliPersonalCaptures(input);
}

export async function importBilibiliPersonalCaptures(input: unknown) {
  const service = new SelfMediaService();
  return service.importBilibiliPersonalCaptures(input);
}

type PlatformImportOperationConfig = {
  key: PlatformImportOperationPlatform;
  source: PlatformImportStatus["source"];
  platform: PlatformImportStatus["platform"];
  label: string;
  rawDir: string;
  discoverCommand: string;
  previewEnabled: boolean;
  saveEnabled: boolean;
  saveSmokeEnabled: boolean;
  disabledReason?: string;
  parse: (service: SelfMediaService, captures: unknown[]) => ProviderImportPayload;
  save: (service: SelfMediaService, captures: unknown[], provenance?: ImportProvenanceMetadata) => ImportResult;
};

type PlatformImportOperationOptions = {
  service?: SelfMediaService;
  rawDirs?: Partial<Record<PlatformImportOperationPlatform, string>>;
};

const platformImportOperationOrder = platformImportOperationCapabilities.map((item) => item.key);
const saveSmokePlatformImportOperationOrder = platformImportOperationCapabilities.filter((item) => item.saveSmokeEnabled).map((item) => item.key);

const platformImportOperationConfigs: Record<PlatformImportOperationPlatform, PlatformImportOperationConfig> = {
  douyin: {
    key: "douyin",
    source: "douyin_creator_center",
    platform: "douyin",
    label: "抖音创作者中心",
    rawDir: path.join(process.cwd(), ".local", "douyin-personal-v0", "raw"),
    discoverCommand: "npm run discover:douyin",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true,
    parse: (service, captures) => service.parseDouyinPersonalCaptures(captures),
    save: (service, captures, provenance) => service.importDouyinPersonalCaptures(captures, provenance)
  },
  xiaohongshu: {
    key: "xiaohongshu",
    source: "xiaohongshu_creator_center",
    platform: "xiaohongshu",
    label: "小红书创作中心",
    rawDir: path.join(process.cwd(), ".local", "xiaohongshu-personal-v0", "raw"),
    discoverCommand: "npm run discover:xiaohongshu",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true,
    parse: (service, captures) => service.parseXiaohongshuPersonalCaptures(captures),
    save: (service, captures, provenance) => service.importXiaohongshuPersonalCaptures(captures, provenance)
  },
  "video-account": {
    key: "video-account",
    source: "video_account_creator_center",
    platform: "video_account",
    label: "视频号助手",
    rawDir: path.join(process.cwd(), ".local", "video-account-personal-v0", "raw"),
    discoverCommand: "npm run discover:video-account",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true,
    parse: (service, captures) => service.parseVideoAccountPersonalCaptures(captures),
    save: (service, captures, provenance) => service.importVideoAccountPersonalCaptures(captures, provenance)
  },
  bilibili: {
    key: "bilibili",
    source: "bilibili_creator_center",
    platform: "bilibili",
    label: "B站创作中心",
    rawDir: path.join(process.cwd(), ".local", "bilibili-personal-v0", "raw"),
    discoverCommand: "npm run discover:bilibili",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true,
    parse: (service, captures) => service.parseBilibiliPersonalCaptures(captures),
    save: (service, captures, provenance) => service.importBilibiliPersonalCaptures(captures, provenance)
  }
};

for (const capability of platformImportOperationCapabilities) {
  const config = platformImportOperationConfigs[capability.key];
  config.label = capability.label === "B站" ? "B站创作中心" : config.label;
  config.discoverCommand = capability.discoverCommand;
  config.previewEnabled = capability.previewEnabled;
  config.saveEnabled = capability.saveEnabled;
  config.saveSmokeEnabled = capability.saveSmokeEnabled;
  config.disabledReason = capability.disabledReason;
}

export function getSaveEnabledPlatformImportOperationPlatforms() {
  return platformImportOperationCapabilities.filter((item) => item.saveEnabled).map((item) => item.key);
}

function operationRunId() {
  return `platform-import-operation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertPlatformKey(value: unknown): PlatformImportOperationPlatform {
  if (platformImportOperationOrder.includes(value as PlatformImportOperationPlatform)) return value as PlatformImportOperationPlatform;
  throw new Error("不支持的平台。允许值：douyin、xiaohongshu、video-account、bilibili。");
}

function assertOperationAction(value: unknown): PlatformImportOperationRequest["action"] {
  if (value === "preview" || value === "save" || value === "save_smoke") return value;
  throw new Error("不支持的导入操作。允许值：preview、save、save_smoke。");
}

class RawCaptureDirectoryError extends Error {
  constructor(
    readonly config: PlatformImportOperationConfig,
    readonly rawDir: string,
    readonly reason: "missing" | "empty"
  ) {
    super(`${config.label} raw capture ${reason === "missing" ? "目录不存在" : "目录为空"}：${rawDir}。请先运行 ${config.discoverCommand}`);
  }
}

function rawCaptureErrorSummary(config: PlatformImportOperationConfig, rawDir: string, error: RawCaptureDirectoryError, runId = operationRunId()): PlatformImportOperationSummary {
  return {
    platform: config.key,
    source: config.source,
    label: config.label,
    contentCount: 0,
    metricCount: 0,
    warnings: [],
    runId,
    passed: false,
    errorMessage: error.message,
    rawDir,
    discoverCommand: config.discoverCommand
  };
}

function loadLocalRawCaptures(config: PlatformImportOperationConfig, rawDir: string) {
  if (!existsSync(rawDir)) throw new RawCaptureDirectoryError(config, rawDir, "missing");
  const files = readdirSync(rawDir).filter((file) => file.endsWith(".json")).sort();
  if (files.length === 0) throw new RawCaptureDirectoryError(config, rawDir, "empty");
  return files.map((file) => {
    const capture = JSON.parse(readFileSync(path.join(rawDir, file), "utf8")) as Record<string, unknown>;
    return { ...capture, file: capture.file ?? `raw/${file}` };
  });
}

function summarizePlatformOperation(config: PlatformImportOperationConfig, payload: ProviderImportPayload, runId: string, passed: boolean): PlatformImportOperationSummary {
  return {
    platform: config.key,
    source: config.source,
    label: config.label,
    contentCount: payload.contents.length,
    metricCount: payload.metrics.length,
    warnings: payload.warnings?.slice(0, 8) ?? [],
    runId,
    passed,
    provenance: payload.provenance
  };
}

const platformSaveProvenance: ImportProvenanceMetadata = {
  isTestFixture: false,
  operationKind: "platform_save",
  trustedScopeEligible: true
};

const platformSaveSmokeProvenance: ImportProvenanceMetadata = {
  isTestFixture: true,
  operationKind: "platform_save_smoke",
  trustedScopeEligible: false
};

const platformPreviewProvenance: ImportProvenanceMetadata = {
  isTestFixture: false,
  operationKind: "platform_preview",
  trustedScopeEligible: false
};

async function runSinglePlatformImportOperation(
  service: SelfMediaService,
  config: PlatformImportOperationConfig,
  action: Exclude<PlatformImportOperationRequest["action"], "save_smoke">,
  rawDir: string,
  provenance?: ImportProvenanceMetadata
): Promise<PlatformImportOperationSummary> {
  if (action === "preview" && !config.previewEnabled) {
    return summarizePlatformOperation(config, { source: config.source, contents: [], metrics: [], warnings: [config.disabledReason ?? "平台预览暂未开放。"] }, operationRunId(), false);
  }
  if (action === "save" && !config.saveEnabled) {
    return {
      platform: config.key,
      source: config.source,
      label: config.label,
      contentCount: 0,
      metricCount: 0,
      warnings: [config.disabledReason ?? "平台保存暂未开放。"],
      runId: operationRunId(),
      passed: false,
      errorMessage: config.disabledReason ?? "平台保存暂未开放。"
    };
  }
  const captures = loadLocalRawCaptures(config, rawDir);
  const payload = config.parse(service, captures);
  const parsePassed = payload.contents.length > 0 && payload.metrics.length > 0;
  if (action === "preview") return summarizePlatformOperation(config, { ...payload, provenance: platformPreviewProvenance }, operationRunId(), parsePassed);

  const saveProvenance = provenance ?? platformSaveProvenance;
  const result = config.save(service, captures, saveProvenance);
  const dashboard = await service.dashboard();
  const contentIds = new Set(payload.contents.map((item) => item.id));
  const dashboardContentCount = dashboard.contents.filter((item) => contentIds.has(item.id) && item.platform === config.platform).length;
  const dashboardMetricCount = dashboard.metricSnapshots.filter((item) => contentIds.has(item.contentId) && item.source === config.source).length;
  const warnings = [
    ...(payload.warnings ?? []),
    ...(dashboardContentCount < payload.contents.length ? ["默认可信真实数据口径未纳入本次保存内容；可能是 smoke/demo/test fixture 或历史来源。"] : []),
    ...(dashboardMetricCount < payload.metrics.length ? ["默认 dashboard/review 未纳入本次保存指标；可在排除来源统计中复核。"] : [])
  ];
  const savePayload: ProviderImportPayload = { ...payload, warnings, provenance: result.run.provenance ?? saveProvenance };
  return summarizePlatformOperation(
    config,
    savePayload,
    result.run.id,
    result.run.status === "success" && parsePassed
  );
}

export async function runSelfMediaPlatformImportOperation(input: PlatformImportOperationRequest, options: PlatformImportOperationOptions = {}): Promise<PlatformImportOperationResult> {
  const action = assertOperationAction(input.action);
  const service = options.service ?? new SelfMediaService();
  const runId = operationRunId();

  if (action === "save_smoke") {
    const summaries: PlatformImportOperationSummary[] = [];
    for (const platform of saveSmokePlatformImportOperationOrder) {
      const config = platformImportOperationConfigs[platform];
      try {
        summaries.push(await runSinglePlatformImportOperation(service, config, "save", options.rawDirs?.[platform] ?? config.rawDir, platformSaveSmokeProvenance));
      } catch (error) {
        if (error instanceof RawCaptureDirectoryError) {
          summaries.push(rawCaptureErrorSummary(config, error.rawDir, error, runId));
          continue;
        }
        summaries.push({
          platform,
          source: config.source,
          label: config.label,
          contentCount: 0,
          metricCount: 0,
          warnings: [error instanceof Error ? error.message : "平台保存烟测失败。"],
          runId,
          passed: false,
          errorMessage: error instanceof Error ? error.message : "平台保存烟测失败。"
        });
      }
    }
    for (const summary of summaries) service.recordPlatformOperationHistory(action, summary);
    return {
      action,
      platform: "all",
      runId,
      passed: summaries.every((item) => item.passed),
      summaries,
      warnings: summaries.flatMap((item) => item.warnings)
    };
  }

  const platform = assertPlatformKey(input.platform);
  const config = platformImportOperationConfigs[platform];
  const rawDir = options.rawDirs?.[platform] ?? config.rawDir;
  let summary: PlatformImportOperationSummary;
  try {
    summary = await runSinglePlatformImportOperation(service, config, action, rawDir);
  } catch (error) {
    if (!(error instanceof RawCaptureDirectoryError)) throw error;
    summary = rawCaptureErrorSummary(config, error.rawDir, error);
  }
  service.recordPlatformOperationHistory(action, summary);
  return {
    action,
    platform,
    runId: summary.runId,
    passed: summary.passed,
    summaries: [summary],
    warnings: summary.warnings
  };
}

export async function previewSelfMediaImport(input: ImportRequest) {
  const service = new SelfMediaService();
  return service.previewImportRequest(input);
}

export async function getSelfMediaImportTemplate(preset: CsvImportPreset = "generic") {
  const service = new SelfMediaService();
  return service.csvTemplate(preset);
}

export async function updateSelfMediaPublishQueue(input: PublishQueueTransitionRequest) {
  const service = new SelfMediaService();
  return service.updatePublishQueueStatus(input);
}

export async function createSelfMediaIdea(input: IdeaCreateRequest) {
  const service = new SelfMediaService();
  return service.createIdea(input);
}

export async function updateSelfMediaIdea(input: IdeaStatusRequest) {
  const service = new SelfMediaService();
  return service.updateIdeaStatus(input);
}

export async function convertSelfMediaIdeaToContent(input: IdeaToContentRequest) {
  const service = new SelfMediaService();
  return service.convertIdeaToContent(input);
}

export async function createSelfMediaLead(input: LeadCreateRequest) {
  const service = new SelfMediaService();
  return service.createLead(input);
}

export async function upsertSelfMediaPlatformVersion(input: ContentPlatformVersionRequest) {
  const service = new SelfMediaService();
  return service.upsertPlatformVersion(input);
}

export async function patchSelfMediaPlatformVersion(input: PlatformVersionPatchRequest) {
  const service = new SelfMediaService();
  return service.patchPlatformVersion(input);
}

export async function reviewSelfMediaContentDraft(input: ContentDraftReviewRequest) {
  const service = new SelfMediaService();
  return service.reviewContentDraft(input);
}

export async function confirmSelfMediaPlatformVersionPublish(input: ConfirmPlatformVersionPublishRequest) {
  const service = new SelfMediaService();
  return service.confirmPlatformVersionPublish(input);
}

export async function getSelfMediaCalendar(input: CalendarQuery) {
  const service = new SelfMediaService();
  await service.ensureSeedData();
  return service.calendar(input);
}

export async function upsertSelfMediaMetricSnapshot(input: MetricSnapshotRequest) {
  const service = new SelfMediaService();
  return service.upsertMetricSnapshot(input);
}

export async function saveSelfMediaReview(input: SaveReviewRequest) {
  const service = new SelfMediaService();
  return service.saveReview(input);
}

export async function updateSelfMediaActionItem(input: ActionItemPatchRequest) {
  const service = new SelfMediaService();
  return service.updateActionItem(input);
}

export async function createSelfMediaActionItemFromSuggestion(input: ActionItemFromSuggestionRequest) {
  const service = new SelfMediaService();
  return service.createActionItemFromPostImportSuggestion(input);
}

export async function createSelfMediaContentFromActionItem(input: ActionItemToContentRequest) {
  const service = new SelfMediaService();
  return service.createContentFromActionItem(input);
}

export async function updateSelfMediaLead(input: LeadPatchRequest) {
  const service = new SelfMediaService();
  return service.updateLead(input);
}

export async function createSelfMediaAutomationRun(input: AutomationRunRequest) {
  const service = new SelfMediaService();
  return service.createAutomationRun(input);
}

export async function syncWechatOfficialAnalytics(input: WechatOfficialSyncRequest) {
  const service = new SelfMediaService();
  return service.syncWechatOfficialAnalytics(input);
}
