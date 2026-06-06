import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { platformImportOperationCapabilities, platformImportStatusDefinitions, platformReadinessDefinitions, platformReadinessStageLabels, resolveSelfMediaLocalProfile, resolveSelfMediaSeedMode, selfMediaPlatforms, shouldSeedSelfMediaDemoData } from "../config";
import { BilibiliPersonalProvider, CsvPresetProvider, DouyinPersonalProvider, FakeSelfMediaProvider, getCsvPresetPreviewRows, ManualImportProvider, MediaCrawlerImportProvider, N8nExecutionProvider, VideoAccountPersonalProvider, WechatOfficialProvider, XiaohongshuPersonalProvider } from "../providers";
import { SqliteSelfMediaRepo } from "../repo";
import type {
  AccountMetricGroup,
  AccountMetricSnapshot,
  AuditRecord,
  AutomationRun,
  AutomationRunRequest,
  CalendarQuery,
  ClearFutureScheduleResult,
  ClosedLoopContentPlatform,
  ConfirmPlatformContentMatchRequest,
  ConfirmPlatformContentMatchResult,
  ConfirmPlatformVersionPublishRequest,
  ConfirmPlatformVersionPublishResult,
  ContentDraftReviewRequest,
  ContentDraftReviewResult,
  ContentDataDomain,
  ContentTrustScopePatchRequest,
  ContentWorkbenchContentRow,
  ContentWorkbenchSnapshot,
  ContentPlatformVersion,
  ContentPlatformVersionRequest,
  ContentItem,
  CaptureConnectionStatus,
  CaptureMode,
  CsvImportPreset,
  CreatorPlatformDraft,
  CreatorVideoDiscussionRequest,
  CreatorVideoDiscussionResult,
  CreatorVideoDraftResult,
  CreatorVideoIdeaRequest,
  DataCaptureScheduleReliabilityView,
  DailySelfMediaOpsStepView,
  DailySelfMediaOpsView,
  DailyPlatformOpsGateStepView,
  DailyPlatformOpsGateTrustedAuditView,
  DailyPlatformOpsGateView,
  DashboardSnapshot,
  EvidenceInsight,
  Experiment,
  ActionItemFromSuggestionRequest,
  ActionItemPatchRequest,
  ActionItemToContentRequest,
  ActionItemToContentResult,
  IdeaCreateRequest,
  IdeaStatusRequest,
  IdeaToContentRequest,
  IdeaToContentResult,
  ImportPreviewResult,
  ImportDiffKind,
  ImportRequest,
  ImportResult,
  ImportRun,
  ImportProvenanceMetadata,
  OperationHistory,
  PlatformImportOperationAction,
  PlatformImportOperationPlatform,
  PlatformContentMatchCandidate,
  PlatformImportOperationSummary,
  PlatformImportStatus,
  PlatformDataHealthView,
  PlatformReadinessStatus,
  PostImportActionEvidence,
  PostImportActionSuggestion,
  PostPublishRecoveryItem,
  PostPublishRefreshCandidate,
  ImportSource,
  LeadCreateRequest,
  LeadPatchRequest,
  MetricSnapshot,
  MetricSnapshotPlatformGroup,
  MetricSnapshotRequest,
  MetricSnapshotSourceGroup,
  MonetizationLead,
  Platform,
  PlatformCaptureSchedulerStatus,
  PlatformMetric,
  PlatformAccount,
  PlatformChecklist,
  PlatformVersionPatchRequest,
  PlatformVersionStatus,
  ProviderImportPayload,
  PublishCalendarItem,
  PublishExecutionItem,
  PublishHandoffPackage,
  PublishQueueItem,
  PublishQueueStatus,
  PublishRecord,
  PublishToMetricsWorkbench,
  PublishQueueTransitionRequest,
  PublishQueueTransitionResult,
  RealDataScopeSummary,
  RealCaptureFreshnessStatus,
  ReviewActionItem,
  SaveReviewRequest,
  SavedReview,
  TrustedDashboardAuditView,
  TrustedOperatingStatus,
  TrustedAutoCaptureSchedulerView,
  TrustedWeeklySafeReport,
  TrustedWeeklySafeReportResponse,
  TrustedWeeklyReportSummary,
  TrustedScopeCurationSummary,
  TopicIdea,
  WechatArticleSummaryRow,
  WechatOfficialSyncRequest,
  WechatOfficialSyncResult,
  WechatUserSummaryRow,
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

function metricDateKey(value: string) {
  return value ? value.slice(0, 10) : "unknown";
}

function metricReviewKey(metric: PlatformMetric) {
  return `${metric.contentId}|${metric.platform}|${metricDateKey(metric.capturedAt)}`;
}

function snapshotReviewKey(snapshot: MetricSnapshot) {
  return `${snapshot.contentId}|${snapshot.platform}|${metricDateKey(snapshot.snapshotDate)}`;
}

function snapshotEngagement(snapshot: MetricSnapshot) {
  return snapshot.likes + snapshot.comments + snapshot.saves + snapshot.shares;
}

function accountSnapshotEngagement(snapshot: AccountMetricSnapshot) {
  return snapshot.likes + snapshot.comments + snapshot.saves + snapshot.shares;
}

function buildAccountMetricGroups(accountMetricSnapshots: AccountMetricSnapshot[]): AccountMetricGroup[] {
  const groups = new Map<string, AccountMetricGroup>();
  for (const snapshot of accountMetricSnapshots) {
    const date = metricDateKey(snapshot.date);
    const key = `${snapshot.platform}|${snapshot.source}|${date}`;
    const current = groups.get(key) ?? {
      platform: snapshot.platform,
      source: snapshot.source,
      date,
      snapshotCount: 0,
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      followersDelta: 0,
      engagement: 0,
      latestImportRunId: undefined,
      includedInContentReview: false as const
    };
    current.snapshotCount += 1;
    current.views += snapshot.views;
    current.likes += snapshot.likes;
    current.comments += snapshot.comments;
    current.saves += snapshot.saves;
    current.shares += snapshot.shares;
    current.followersDelta += snapshot.followersDelta;
    current.engagement += accountSnapshotEngagement(snapshot);
    if (snapshot.importRunId) current.latestImportRunId = snapshot.importRunId;
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date) || b.views - a.views);
}

const closedLoopContentPlatforms = ["douyin", "xiaohongshu", "video_account", "bilibili"] as const;
const trustedRealCreatorCenterSources = ["douyin_creator_center", "xiaohongshu_creator_center", "video_account_creator_center", "bilibili_creator_center"] as const;

const creatorPlatformDraftLabels: Record<typeof closedLoopContentPlatforms[number], string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  video_account: "视频号",
  bilibili: "B站"
};

const creatorPlatformDraftAdvice: Record<typeof closedLoopContentPlatforms[number], { hook: string; body: string; cover: string; advice: string; tags: string[]; focus: string; format: string }> = {
  douyin: {
    hook: "3 秒钩子",
    body: "短句、强节奏、先给结论，再给 2-3 个画面点。",
    cover: "大字标题 + 真人/关键画面，突出冲突或结果。",
    advice: "建议按短视频强钩子改写；创作标签/平台激励只作为选题提示，发布前需人工确认官方后台。",
    tags: ["短视频", "AI创作", "效率提升"],
    focus: "用一个强结果或反差开场，先让观众愿意停留。",
    format: "15-60 秒竖屏口播/演示，前三秒给结论。"
  },
  xiaohongshu: {
    hook: "痛点 + 结果",
    body: "正文适合拆成步骤、清单和个人体验，语气更像给朋友的经验贴。",
    cover: "封面用清晰主题词和对比结果，适合图文首屏检查。",
    advice: "建议按搜索和收藏场景改写；创作标签/平台激励仅为建议，需人工确认实时官方活动。",
    tags: ["经验分享", "自媒体", "AI工具"],
    focus: "把问题、结果和可收藏步骤说清楚，适合搜索和复看。",
    format: "图文/短视频均可，正文保留清单感和个人体验。"
  },
  video_account: {
    hook: "观点开场",
    body: "适合更可信的口播结构：观点、案例、行动建议，保留个人表达。",
    cover: "封面强调人物、观点和可信场景，避免过度标题党。",
    advice: "建议按私域传播和信任建设改写；创作标签/平台激励仅供人工复核。",
    tags: ["视频号", "观点表达", "创作者日常"],
    focus: "先给可信观点，再讲一个能被转发给朋友的具体例子。",
    format: "45-120 秒口播，语气稳一点，强调经验和行动建议。"
  },
  bilibili: {
    hook: "问题定义",
    body: "适合更完整的结构：背景、过程、方法、结果，可保留脚本和章节感。",
    cover: "封面突出主题、方法和结果，可加系列编号。",
    advice: "建议按中长视频/知识记录改写；创作标签/平台激励不是实时官方信息，需人工确认。",
    tags: ["知识记录", "AI工作流", "创作复盘"],
    focus: "把问题讲完整，保留方法论、过程证据和复盘价值。",
    format: "3-8 分钟中长视频，适合分章节或系列化。"
  }
};

function compactLines(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function normalizeCreatorTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function firstCreatorLine(value: string) {
  return value.split(/[\n。！？!?]/).map((item) => item.trim()).find(Boolean) ?? "";
}

function inferCreatorTopic(value: string) {
  if (/AI|智能体|自动化|工作流/i.test(value)) return "AI创作工作流";
  if (/复盘|踩坑|失败|经验/.test(value)) return "创作复盘";
  if (/教程|方法|步骤|工具/.test(value)) return "工具教程";
  if (/日常|生活|记录/.test(value)) return "创作者日常";
  return "自媒体创作";
}

function inferCreatorDiscussionSignals(value: string) {
  const audience = /新手|小白|刚开始|入门/.test(value)
    ? "刚开始做内容的新手创作者"
    : /老板|团队|公司|运营/.test(value)
      ? "需要做内容经营的小团队"
      : "想提高内容效率的个人创作者";
  const tone = /轻松|口语|幽默|朋友/.test(value)
    ? "轻松口语，像和朋友讲经验"
    : /专业|严肃|深度|方法论/.test(value)
      ? "专业克制，突出方法和证据"
      : "直接、可信、有一点个人复盘感";
  const duration = /30秒|半分钟|很短|短一点/.test(value)
    ? "30 秒内"
    : /3分钟|5分钟|中长|长一点/.test(value)
      ? "3-5 分钟"
      : "60-90 秒";
  return { audience, tone, duration };
}

function normalizeCreatorIdeaInput(input: CreatorVideoIdeaRequest | CreatorVideoDiscussionRequest): CreatorVideoIdeaRequest {
  const brief = input.brief?.trim();
  if (!brief) throw new Error("创作讨论需要先输入视频大意。");
  const seed = `${input.title ?? ""} ${input.topic ?? ""} ${brief} ${input.revisionPrompt ?? ""}`;
  const fallbackTitle = firstCreatorLine(brief) || "新视频想法";
  const title = normalizeCreatorTitle(input.title || fallbackTitle);
  const topic = normalizeCreatorTitle(input.topic || inferCreatorTopic(seed));
  return {
    title,
    topic,
    brief,
    scriptNotes: input.scriptNotes?.trim() || undefined,
    materialNotes: input.materialNotes?.trim() || undefined,
    scheduledAt: input.scheduledAt?.trim() || undefined,
    revisionPrompt: input.revisionPrompt?.trim() || undefined,
    copilotAnalysis: "creator_copilot_discussion:local_rule_v1",
    acceptanceRunId: input.acceptanceRunId?.trim() || undefined,
    dataDomain: input.dataDomain
  };
}

function buildCreatorPlatformDrafts(input: CreatorVideoIdeaRequest | CreatorVideoDiscussionRequest): CreatorPlatformDraft[] {
  const normalized = normalizeCreatorIdeaInput(input);
  const title = normalized.title;
  const topic = normalized.topic;
  const brief = normalized.brief.trim();
  const scriptNotes = input.scriptNotes?.trim();
  const materialNotes = input.materialNotes?.trim();
  const revisionPrompt = normalized.revisionPrompt;
  const signals = inferCreatorDiscussionSignals(`${brief} ${scriptNotes ?? ""} ${materialNotes ?? ""} ${revisionPrompt ?? ""}`);

  return closedLoopContentPlatforms.map((platform) => {
    const config = creatorPlatformDraftAdvice[platform];
    const label = creatorPlatformDraftLabels[platform];
    const platformTitle = platform === "bilibili"
      ? `${topic}：${title}`
      : platform === "xiaohongshu"
        ? `${title}｜${topic}`
        : title;
    const tags = [...new Set([topic, ...config.tags].map((item) => item.replace(/^#/, "").trim()).filter(Boolean))].slice(0, 6);
    const incentiveTagAdvice = "平台激励/创作标签建议：仅为本地内容策划建议，需发布前人工确认平台后台和实时官方活动。";
    const body = compactLines([
      `${config.hook}：${brief}`,
      revisionPrompt ? `本轮调整：${revisionPrompt}` : undefined,
      scriptNotes ? `脚本备注：${scriptNotes}` : undefined,
      materialNotes ? `素材备注：${materialNotes}` : undefined,
      `表达结构：${config.body}`,
      `语气/受众/时长：${signals.tone}；面向${signals.audience}；建议${signals.duration}。`,
      `标签建议：${tags.map((tag) => `#${tag}`).join(" ")}`,
      incentiveTagAdvice
    ]).join("\n");
    return {
      platform,
      title: platformTitle.slice(0, platform === "bilibili" ? 90 : 60),
      body,
      tags,
      coverNote: `${label}封面备注：${config.cover}`,
      platformAdvice: config.advice,
      incentiveTagAdvice
    };
  });
}

function buildCreatorVideoDiscussion(input: CreatorVideoDiscussionRequest): CreatorVideoDiscussionResult {
  const idea = normalizeCreatorIdeaInput(input);
  const signals = inferCreatorDiscussionSignals(`${idea.brief} ${idea.scriptNotes ?? ""} ${idea.materialNotes ?? ""} ${idea.revisionPrompt ?? ""}`);
  const adjustment = idea.revisionPrompt ? `本轮按“${idea.revisionPrompt}”重新收束。` : "第一轮先确认选题角度、受众和平台差异。";
  const drafts = buildCreatorPlatformDrafts(idea);
  return {
    idea,
    analysis: {
      direction: `${idea.topic}方向：用“${idea.title}”作为主线，先给观众一个明确收益，再用过程或案例证明。${adjustment}`,
      audience: signals.audience,
      tone: signals.tone,
      duration: signals.duration,
      structure: [
        "开场先说观众能得到什么，避免只讲工具或过程。",
        "中段保留 2-3 个可拍画面或步骤，便于四个平台各自改写。",
        "结尾给一个轻行动：收藏、评论问题、或等下一条复盘。"
      ],
      risks: [
        "平台激励/创作标签不是实时官方信息，需人工确认。",
        "保存后只进入人工排期和工作台，不会自动发布。"
      ]
    },
    platformDifferences: closedLoopContentPlatforms.map((platform) => ({
      platform,
      focus: creatorPlatformDraftAdvice[platform].focus,
      format: creatorPlatformDraftAdvice[platform].format,
      adjustment: idea.revisionPrompt ? `按本轮调整重写标题、正文和标签：${idea.revisionPrompt}` : "先按平台默认内容消费场景改写。",
      manualCheck: "创作标签/平台活动/激励均需人工确认，不视为实时官方承诺。"
    })),
    drafts,
    publishPlan: {
      scheduledAt: idea.scheduledAt,
      planSummary: idea.scheduledAt ? "保存后四个平台版本会进入日历排期，等待人工发布前检查。" : "可先保存为待审草稿，再到日历选择未来发布时间。",
      checklist: [
        "确认标题、封面、标签与平台调性。",
        "人工确认平台创作标签/激励活动。",
        "发布前手动检查素材、脚本和评论引导。"
      ]
    },
    revisionPrompt: idea.revisionPrompt,
    traceId: createTraceId("creator-copilot")
  };
}

function isTrustedRealCreatorCenterSource(source: ImportSource | "manual" | "review_metric") {
  return trustedRealCreatorCenterSources.includes(source as typeof trustedRealCreatorCenterSources[number]);
}

const acceptanceRunTextPattern = /(^|[\s:/._-])(mainline|human-mouse|calendar-real|creator day workflow|workflow)([\s:/._-]|$)|验收|回归|测试|走查|真实鼠标|人工鼠标|浏览器烟测|创作者一天流程|信息架构回归|AI选题计划|AI短片复盘|我最喜欢的小雏菊|小雏菊|想拍一条短视频|我的真实作品070测试|071验收测试|真实作品：六月内容计划|真实内容评估|05[0-9]|06[0-9]|07[0-2]/i;
const demoSeedTextPattern = /(^|[\s:/._-])(smoke|sample|demo|fixture|debug|seed|fake|op-save)([\s:/._-]|$)|O2|烟测|浏览器烟测|BiliOpSave/i;

function legacyTextSuggestsTestOrDemoContent(content: ContentItem | undefined, snapshot?: MetricSnapshot) {
  const text = [content?.id, content?.title, content?.topic, content?.notes, snapshot?.id, snapshot?.contentId, snapshot?.platformVersionId].filter(Boolean).join(" ");
  return acceptanceRunTextPattern.test(text) || demoSeedTextPattern.test(text);
}

function contentDomainClassificationText(content: ContentItem | undefined, extra?: Array<string | undefined>) {
  return [
    content?.id,
    content?.title,
    content?.topic,
    content?.notes,
    content?.acceptanceRunId,
    ...(extra ?? [])
  ].filter(Boolean).join(" ");
}

function explicitIsolatedDomainFromText(text: string): { dataDomain: ContentDataDomain; reason: string } | undefined {
  if (acceptanceRunTextPattern.test(text)) return { dataDomain: "acceptance_run", reason: "acceptance_or_regression_marker" };
  if (demoSeedTextPattern.test(text)) return { dataDomain: "demo_seed", reason: "demo_seed_or_fixture_marker" };
  return undefined;
}

function classifyContentDataDomain(input: {
  content: ContentItem;
  snapshots?: MetricSnapshot[];
  source?: ImportSource | "manual";
  provenance?: ImportProvenanceMetadata;
  extraText?: Array<string | undefined>;
}): { dataDomain: ContentDataDomain; reason: string; acceptanceRunId?: string } {
  const text = contentDomainClassificationText(input.content, input.extraText);
  const acceptanceRunId = input.content.acceptanceRunId ?? input.provenance?.acceptanceRunId;
  const snapshotSources = new Set((input.snapshots ?? []).map((snapshot) => snapshot.source));
  if (acceptanceRunId) return { dataDomain: "acceptance_run", reason: "acceptance_run_id", acceptanceRunId };
  if (input.provenance?.isTestFixture === true) return { dataDomain: "demo_seed", reason: "provenance_test_fixture" };
  const isolatedByText = explicitIsolatedDomainFromText(text);
  if (isolatedByText) {
    return {
      ...isolatedByText,
      acceptanceRunId: isolatedByText.dataDomain === "acceptance_run" ? "title-classified-acceptance-run" : undefined
    };
  }
  if (input.provenance?.dataDomain) return { dataDomain: input.provenance.dataDomain, reason: "provenance_data_domain", acceptanceRunId };
  if (
    input.provenance?.trustedScopeEligible === true &&
    (
      (input.source && isTrustedRealCreatorCenterSource(input.source)) ||
      [...snapshotSources].some((source) => isTrustedRealCreatorCenterSource(source)) ||
      input.content.dataDomain === "user_work" ||
      input.content.workOwnership === "user_owned_work"
    )
  ) {
    return { dataDomain: "user_work", reason: "trusted_provenance_user_work", acceptanceRunId };
  }
  if (input.content.dataDomain === "acceptance_run" || input.content.dataDomain === "demo_seed") {
    return { dataDomain: input.content.dataDomain, reason: "explicit_isolated_content_data_domain", acceptanceRunId };
  }
  if ((input.source && isTrustedRealCreatorCenterSource(input.source)) || [...snapshotSources].some((source) => isTrustedRealCreatorCenterSource(source))) {
    return { dataDomain: "user_work", reason: "trusted_creator_center_user_work", acceptanceRunId };
  }
  if (input.content.dataDomain) return { dataDomain: input.content.dataDomain, reason: "explicit_content_data_domain", acceptanceRunId };
  if (input.content.userConfirmedForLibrary || input.content.workOwnership === "user_owned_work") {
    return { dataDomain: "user_work", reason: "explicit_user_owned_work", acceptanceRunId };
  }
  if (input.content.workOwnership === "operator_owned_work") {
    return { dataDomain: "system_log", reason: "operator_generated_workflow", acceptanceRunId };
  }
  if (input.source || snapshotSources.size > 0) return { dataDomain: "imported_metric", reason: "imported_metric_or_untrusted_source", acceptanceRunId };
  return { dataDomain: "system_log", reason: "unconfirmed_local_record", acceptanceRunId };
}

function isDefaultUserWorkContent(content: ContentItem | undefined) {
  return content?.dataDomain === "user_work";
}

function isUserExcludedFromTrustedScope(content: ContentItem | undefined) {
  return content?.userExcludedFromTrustedScope === true || content?.trustedScopeOverride === "exclude";
}

function isTrustedScopeEligibleByProvenance(provenance?: ImportProvenanceMetadata) {
  if (provenance?.isTestFixture === true) return false;
  if (provenance?.trustedScopeEligible === false) return false;
  if (provenance?.trustedScopeEligible === true) return true;
  return undefined;
}

function isTrustedRealMetricSnapshot(snapshot: MetricSnapshot, contentsById: Map<string, ContentItem>) {
  if (!isTrustedRealCreatorCenterSource(snapshot.source)) return false;
  const content = contentsById.get(snapshot.contentId);
  if (isUserExcludedFromTrustedScope(content)) return false;
  const inferredDomain = content?.dataDomain ?? (content ? classifyContentDataDomain({ content, snapshots: [snapshot], source: snapshot.source, provenance: snapshot.provenance }).dataDomain : undefined);
  if (inferredDomain !== "user_work") return false;
  if (snapshot.dataDomain && snapshot.dataDomain !== "user_work") return false;
  const provenanceEligible = isTrustedScopeEligibleByProvenance(snapshot.provenance);
  if (provenanceEligible !== undefined) return provenanceEligible;
  if (content?.trustedScopeOverride === "include") return true;
  if (content?.dataDomain === "user_work" || snapshot.dataDomain === "user_work") return true;
  return !legacyTextSuggestsTestOrDemoContent(content, snapshot);
}

function trustedReviewMetricFromSnapshot(snapshot: MetricSnapshot): PlatformMetric {
  return {
    id: `review-metric-${snapshot.id}`,
    contentId: snapshot.contentId,
    platform: snapshot.platform,
    capturedAt: dateToIso(snapshot.snapshotDate),
    views: snapshot.views,
    likes: snapshot.likes,
    comments: snapshot.comments,
    saves: snapshot.saves,
    shares: snapshot.shares,
    followersDelta: snapshot.followersDelta
  };
}

function buildRealDataScopeSummary(input: {
  contents: ContentItem[];
  metrics: PlatformMetric[];
  metricSnapshots: MetricSnapshot[];
  imports: ImportRun[];
  trustedSnapshots: MetricSnapshot[];
}): RealDataScopeSummary {
  const contentsById = new Map(input.contents.map((content) => [content.id, content]));
  const trustedContentIds = new Set(input.trustedSnapshots.map((snapshot) => snapshot.contentId));
  const trustedImportRunIds = new Set(input.trustedSnapshots.map((snapshot) => snapshot.importRunId).filter((id): id is string => Boolean(id)));
  const trustedMetricIds = new Set(input.trustedSnapshots.map((snapshot) => `${snapshot.contentId}|${snapshot.platform}|${metricDateKey(snapshot.snapshotDate)}`));
  const trustedSnapshotIds = new Set(input.trustedSnapshots.map((snapshot) => snapshot.id));
  const untrustedSnapshots = input.metricSnapshots.filter((snapshot) => !trustedSnapshotIds.has(snapshot.id));
  const userExcludedSnapshots = input.metricSnapshots.filter((snapshot) => isTrustedRealCreatorCenterSource(snapshot.source) && isUserExcludedFromTrustedScope(contentsById.get(snapshot.contentId)));
  const untrustedContentIds = new Set(untrustedSnapshots.map((snapshot) => snapshot.contentId));
  const untrustedImportRunIds = new Set(untrustedSnapshots.map((snapshot) => snapshot.importRunId).filter((id): id is string => Boolean(id)));
  const excludedImports = input.imports.filter((run) => !isTrustedRealCreatorCenterSource(run.source) || (untrustedImportRunIds.has(run.id) && !trustedImportRunIds.has(run.id)));
  const excludedMetricCount = Math.max(input.metrics.length - trustedMetricIds.size, 0);
  const excludedBySource = new Map<RealDataScopeSummary["excludedSources"][number]["source"], RealDataScopeSummary["excludedSources"][number]>();
  for (const snapshot of untrustedSnapshots) {
    const current = excludedBySource.get(snapshot.source) ?? { source: snapshot.source, contentCount: 0, metricCount: 0, metricSnapshotCount: 0, importRunCount: 0, views: 0 };
    current.metricSnapshotCount += 1;
    current.metricCount += 1;
    current.views += snapshot.views;
    excludedBySource.set(snapshot.source, current);
  }
  for (const run of excludedImports) {
    const current = excludedBySource.get(run.source) ?? { source: run.source, contentCount: 0, metricCount: 0, metricSnapshotCount: 0, importRunCount: 0, views: 0 };
    current.importRunCount += 1;
    excludedBySource.set(run.source, current);
  }
  for (const source of [...excludedBySource.keys()]) {
    const relatedSnapshots = untrustedSnapshots.filter((snapshot) => snapshot.source === source);
    const current = excludedBySource.get(source);
    if (current) current.contentCount = new Set(relatedSnapshots.map((snapshot) => snapshot.contentId)).size;
  }
  const snapshotMetricCount = untrustedSnapshots.length;
  const reviewMetricExcludedCount = Math.max(excludedMetricCount - snapshotMetricCount, 0);
  if (reviewMetricExcludedCount > 0 || input.metrics.length > input.metricSnapshots.length) {
    const current = excludedBySource.get("review_metric") ?? { source: "review_metric", contentCount: 0, metricCount: 0, metricSnapshotCount: 0, importRunCount: 0, views: 0 };
    current.metricCount += reviewMetricExcludedCount;
    const trustedContentIdSet = new Set(input.trustedSnapshots.map((snapshot) => snapshot.contentId));
    const reviewOnlyMetrics = input.metrics.filter((metric) => !trustedContentIdSet.has(metric.contentId));
    current.contentCount = new Set(reviewOnlyMetrics.map((metric) => metric.contentId)).size;
    current.views += reviewOnlyMetrics.reduce((total, metric) => total + metric.views, 0);
    excludedBySource.set("review_metric", current);
  }
  return {
    defaultScope: "trusted_real_creator_center",
    trustedSources: [...trustedRealCreatorCenterSources],
    isDefaultDashboardTrusted: input.trustedSnapshots.every((snapshot) => isTrustedRealCreatorCenterSource(snapshot.source)),
    trustedContentCount: trustedContentIds.size,
    trustedMetricCount: input.trustedSnapshots.length,
    trustedMetricSnapshotCount: input.trustedSnapshots.length,
    trustedImportRunCount: trustedImportRunIds.size,
    excludedContentCount: untrustedContentIds.size,
    excludedMetricCount,
    excludedMetricSnapshotCount: untrustedSnapshots.length,
    excludedImportRunCount: excludedImports.length,
    allContentCount: input.contents.length,
    allMetricCount: input.metrics.length,
    allMetricSnapshotCount: input.metricSnapshots.length,
    allImportRunCount: input.imports.length,
    userExcludedContentCount: new Set(userExcludedSnapshots.map((snapshot) => snapshot.contentId)).size,
    userExcludedMetricSnapshotCount: userExcludedSnapshots.length,
    excludedSources: [...excludedBySource.values()].sort((a, b) => b.metricSnapshotCount + b.importRunCount - (a.metricSnapshotCount + a.importRunCount))
  };
}

const actionSuggestionPlatformLabels: Record<MetricSnapshot["platform"], string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  wechat: "公众号",
  video_account: "视频号",
  bilibili: "B站",
  other: "其它"
};

function snapshotEvidence(snapshot: MetricSnapshot): PostImportActionEvidence {
  return {
    platform: snapshot.platform,
    contentId: snapshot.contentId,
    source: snapshot.source,
    metricSnapshotId: snapshot.id,
    importRunId: snapshot.importRunId
  };
}

function contentTitle(contents: ContentItem[], contentId: string) {
  return contents.find((content) => content.id === contentId)?.title ?? contentId;
}

function metricEngagement(snapshot: Pick<MetricSnapshot, "likes" | "comments" | "saves" | "shares">) {
  return snapshot.likes + snapshot.comments + snapshot.saves + snapshot.shares;
}

function metricEngagementRate(snapshot: MetricSnapshot) {
  return snapshot.views > 0 ? metricEngagement(snapshot) / snapshot.views : 0;
}

function healthPlatformToContentPlatform(platform: PlatformDataHealthView["platforms"][number]["platform"]): PostImportActionEvidence["platform"] {
  if (platform === "video-account") return "video_account";
  return platform;
}

function buildPostImportActionSuggestions(input: {
  contents: ContentItem[];
  metricSnapshots: MetricSnapshot[];
  metricPlatformGroups: MetricSnapshotPlatformGroup[];
  platformDataHealth: PlatformDataHealthView;
}): PostImportActionSuggestion[] {
  const contentSnapshots = input.metricSnapshots.filter((snapshot) => closedLoopContentPlatforms.includes(snapshot.platform as typeof closedLoopContentPlatforms[number]) && isTrustedRealCreatorCenterSource(snapshot.source));
  const suggestions: PostImportActionSuggestion[] = [];
  const topSnapshot = [...contentSnapshots].sort((a, b) => b.views + metricEngagement(b) * 8 - (a.views + metricEngagement(a) * 8))[0];
  if (topSnapshot) {
    suggestions.push({
      id: `post-import-reuse-${topSnapshot.id}`,
      type: "reuse_high_performer",
      priority: "high",
      title: "高表现内容复用",
      summary: `${actionSuggestionPlatformLabels[topSnapshot.platform]}《${contentTitle(input.contents, topSnapshot.contentId)}》曝光 ${topSnapshot.views}，互动 ${metricEngagement(topSnapshot)}，适合拆成二次发布变量。`,
      nextAction: "提取标题、封面、开头钩子和评论反馈，排入下周至少 2 条复用内容。",
      evidence: [snapshotEvidence(topSnapshot)]
    });
  }

  const lowSnapshot = [...contentSnapshots]
    .filter((snapshot) => snapshot.views >= 50)
    .sort((a, b) => metricEngagementRate(a) - metricEngagementRate(b) || b.views - a.views)[0];
  if (lowSnapshot && metricEngagementRate(lowSnapshot) < 0.05) {
    suggestions.push({
      id: `post-import-review-low-${lowSnapshot.id}`,
      type: "review_low_engagement",
      priority: "medium",
      title: "低互动内容复盘",
      summary: `${actionSuggestionPlatformLabels[lowSnapshot.platform]}《${contentTitle(input.contents, lowSnapshot.contentId)}》互动率 ${(metricEngagementRate(lowSnapshot) * 100).toFixed(1)}%，需要复核选题表达和平台适配。`,
      nextAction: "复看前 3 秒、标题关键词和评论区反馈，记录一个可修改变量后再决定是否重发。",
      evidence: [snapshotEvidence(lowSnapshot)]
    });
  }

  const platformGroups = input.metricPlatformGroups.filter((group) => closedLoopContentPlatforms.includes(group.platform as typeof closedLoopContentPlatforms[number]));
  const topPlatform = [...platformGroups].sort((a, b) => b.views - a.views || b.engagement - a.engagement)[0];
  if (topPlatform) {
    const evidenceSnapshot = contentSnapshots.find((snapshot) => snapshot.platform === topPlatform.platform);
    suggestions.push({
      id: `post-import-platform-priority-${topPlatform.platform}`,
      type: "platform_priority",
      priority: "high",
      title: "平台优先级",
      summary: `${actionSuggestionPlatformLabels[topPlatform.platform]} 当前内容级曝光 ${topPlatform.views}，在四平台导入数据中优先级最高。`,
      nextAction: "下一轮排期优先保留该平台版本，同时把第二平台作为对照实验。",
      evidence: evidenceSnapshot ? [snapshotEvidence(evidenceSnapshot)] : [{ platform: topPlatform.platform, source: topPlatform.sources[0] }]
    });
  }

  const bilibiliSnapshots = contentSnapshots.filter((snapshot) => snapshot.source === "bilibili_creator_center");
  if (bilibiliSnapshots.length > 0) {
    const topBilibili = [...bilibiliSnapshots].sort((a, b) => b.views - a.views)[0];
    suggestions.push({
      id: `post-import-bilibili-archives-${topBilibili.id}`,
      type: "bilibili_archives_content",
      priority: "medium",
      title: "B站 archives 内容级提示",
      summary: `B站已按 archives 内容级快照参与复盘，共 ${bilibiliSnapshots.length} 条内容级指标；账号 diagnostics 仍不进入内容总量。`,
      nextAction: "优先复盘 archives 中播放最高的稿件，再决定是否开启账号级趋势保存任务。",
      evidence: [snapshotEvidence(topBilibili)]
    });
  }

  const health = input.platformDataHealth;
  const healthProblems = health.summary.missingCount + health.summary.staleCount + health.summary.sourceMismatchCount + health.summary.errorCount;
  if (!health.exists || health.status !== "ok" || healthProblems > 0) {
    const platform = health.platforms.find((item) => item.status !== "ok" || item.rawStatus !== "ok" || item.mappingPreview.status !== "ok" || item.saveSmoke.status !== "ok") ?? health.platforms[0];
    suggestions.push({
      id: `post-import-health-${health.status}-${healthProblems}`,
      type: "data_health_anomaly",
      priority: health.status === "error" || health.status === "missing" ? "high" : "medium",
      title: "数据健康异常提醒",
      summary: health.exists
        ? `平台数据健康为 ${health.status}：missing ${health.summary.missingCount} / stale ${health.summary.staleCount} / source mismatch ${health.summary.sourceMismatchCount}。`
        : "未找到平台数据健康报告，当前建议无法确认四平台原始数据新鲜度。",
      nextAction: "先运行 npm run health:platform-data，再处理缺失、过期或来源不匹配的平台数据。",
      evidence: [{
        platform: platform ? healthPlatformToContentPlatform(platform.platform) : "other",
        source: platform?.mappingPreview.source as ImportSource | undefined
      }]
    });
  }

  return suggestions.slice(0, 6);
}

function enrichPostImportActionSuggestions(suggestions: PostImportActionSuggestion[], actionItems: ReviewActionItem[]): PostImportActionSuggestion[] {
  const actionBySuggestionId = new Map(actionItems.filter((item) => item.sourceSuggestionId).map((item) => [item.sourceSuggestionId, item]));
  return suggestions.map((suggestion) => {
    const actionItem = actionBySuggestionId.get(suggestion.id);
    return actionItem
      ? { ...suggestion, convertedToActionItem: true, actionItemId: actionItem.id }
      : { ...suggestion, convertedToActionItem: false };
  });
}

function relatedEvidence(evidence: PostImportActionEvidence[]) {
  const snapshotEvidenceItem = evidence.find((item) => item.metricSnapshotId);
  if (snapshotEvidenceItem?.metricSnapshotId) return { relatedType: "metric_snapshot" as const, relatedId: snapshotEvidenceItem.metricSnapshotId };
  const contentEvidenceItem = evidence.find((item) => item.contentId);
  if (contentEvidenceItem?.contentId) return { relatedType: "content" as const, relatedId: contentEvidenceItem.contentId };
  return {};
}

function actionItemFromPostImportSuggestion(suggestion: PostImportActionSuggestion): ReviewActionItem {
  const now = new Date().toISOString();
  const related = relatedEvidence(suggestion.evidence);
  return {
    id: `action-item-${suggestion.id}`,
    sourceSuggestionId: suggestion.id,
    suggestionType: suggestion.type,
    title: suggestion.title,
    status: "todo",
    priority: suggestion.priority,
    relatedType: related.relatedType,
    relatedId: related.relatedId,
    nextAction: suggestion.nextAction,
    evidence: suggestion.evidence.map((item) => ({ ...item })),
    updatedAt: now
  };
}

function actionEvidenceCandidates(item: ReviewActionItem, suggestion?: PostImportActionSuggestion) {
  const candidates = (suggestion?.evidence ?? item.evidence ?? []).map((evidence) => ({ ...evidence }));
  if (item.relatedType === "metric_snapshot" && item.relatedId) candidates.push({ platform: "other", metricSnapshotId: item.relatedId });
  if (item.relatedType === "content" && item.relatedId) candidates.push({ platform: "other", contentId: item.relatedId });
  return candidates;
}

function contentFormatForPlatform(platform: Platform): ContentItem["format"] {
  if (platform === "xiaohongshu") return "image_text";
  if (platform === "wechat") return "article";
  return "short_video";
}

function defaultActionScheduleAt() {
  const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
  next.setUTCHours(9, 0, 0, 0);
  return next.toISOString();
}

const platformDataHealthReportPath = ".local/platform-data-health/report.json";
const trustedDashboardAuditReportPath = ".local/trusted-dashboard-audit/report.json";
const dailyPlatformOpsGateReportPath = ".local/daily-platform-ops/report.json";
const dailySelfMediaOpsReportPath = ".local/daily-self-media-ops/report.json";
const trustedDashboardAuditCommand = "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard";
const dailySelfMediaOpsCommand = "npm run ops:daily-self-media";
const dailySelfMediaOpsDefaultDashboardUrl = "http://127.0.0.1:3200/api/self-media/dashboard";
const dailySelfMediaOpsFallbackHint = "如果 3200 超时，可运行 npm run ops:daily-self-media -- --dashboard-url=http://127.0.0.1:<healthy-port>/api/self-media/dashboard";
const sensitiveOperatingTextPattern = /cookie|authorization|headers?|\btoken\b|access[_-]?token|refresh[_-]?token|session|secret|credential|raw\s*payload|comment_content|danmu_text|danmu|评论正文|弹幕/i;
const sensitiveCommandFlagPattern = /(?:^|\s)--?[a-z0-9_-]*(?:token|cookie|secret|credential|header)[a-z0-9_-]*(?:=|\s|$)/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function safeOperatingText(value: unknown, fallback: string | null = "") {
  if (typeof value !== "string") return fallback;
  return sensitiveOperatingTextPattern.test(value) || sensitiveCommandFlagPattern.test(value) ? "已隐藏敏感操作细节" : value;
}

function safeOperatingTextArray(value: unknown) {
  return stringArrayValue(value).map((item) => safeOperatingText(item, "")).filter((item): item is string => Boolean(item)).slice(0, 20);
}

function freshnessTimelineView(value: unknown) {
  const item = asRecord(value);
  return {
    latestRealCaptureAt: stringValue(item.latestRealCaptureAt),
    latestSmokeAt: stringValue(item.latestSmokeAt),
    latestAuditAt: stringValue(item.latestAuditAt),
    realCaptureAgeHours: numberValue(item.realCaptureAgeHours),
    smokeAgeHours: numberValue(item.smokeAgeHours),
    realCaptureIsStale: booleanValue(item.realCaptureIsStale),
    smokeIsStale: booleanValue(item.smokeIsStale),
    staleAfterHours: numberValue(item.staleAfterHours)
  };
}

function healthStatus(value: unknown): "ok" | "warn" | "error" {
  return value === "ok" || value === "warn" || value === "error" ? value : "error";
}

function realCaptureStatus(value: unknown): PlatformDataHealthView["platforms"][number]["realCaptureStatus"] {
  return value === "fresh" || value === "stale" || value === "missing" || value === "unknown" ? value : "unknown";
}

const assistedRefreshCommandDefaults: Record<PlatformDataHealthView["platforms"][number]["platform"], PlatformDataHealthView["platforms"][number]["commands"]> = {
  douyin: {
    manualStep: "人工登录抖音创作者中心，完成真实采集；本检查不会自动打开平台。",
    preview: "npm run import:douyin",
    save: "npm run import:douyin -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  },
  xiaohongshu: {
    manualStep: "人工登录小红书创作服务平台，完成真实采集；本检查不会自动打开平台。",
    preview: "npm run import:xiaohongshu",
    save: "npm run import:xiaohongshu -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  },
  "video-account": {
    manualStep: "人工登录视频号助手，完成真实采集；本检查不会自动打开平台。",
    preview: "npm run import:video-account",
    save: "npm run import:video-account -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  },
  bilibili: {
    manualStep: "人工登录 B站创作中心，完成 archives 内容级真实采集；账号级指标仍只预览不保存。",
    preview: "npm run import:bilibili",
    save: "npm run import:bilibili -- --save",
    health: "npm run health:platform-data",
    freshness: "npm run check:real-capture-freshness",
    audit: "npm run audit:trusted-dashboard -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard",
    gate: "npm run gate:daily-platform-ops -- --dashboard-url=http://127.0.0.1:3200/api/self-media/dashboard"
  }
};

function assistedRefreshCommandsView(value: unknown, platform: PlatformDataHealthView["platforms"][number]["platform"]) {
  const item = asRecord(value);
  const defaults = assistedRefreshCommandDefaults[platform] ?? assistedRefreshCommandDefaults.douyin;
  return {
    manualStep: stringValue(item.manualStep) ?? defaults.manualStep,
    preview: stringValue(item.preview) ?? defaults.preview,
    save: stringValue(item.save) ?? defaults.save,
    health: stringValue(item.health) ?? defaults.health,
    freshness: stringValue(item.freshness) ?? defaults.freshness,
    audit: stringValue(item.audit) ?? defaults.audit,
    gate: stringValue(item.gate) ?? defaults.gate
  };
}

function gateStatus(value: unknown): DailyPlatformOpsGateView["status"] {
  if (value === "pass" || value === "fail") return value;
  return "error";
}

function stepGateStatus(passed: boolean | null, exists: boolean, summaryStatus?: string | null): DailyPlatformOpsGateStepView["status"] {
  if (!exists) return "missing";
  if (passed === true) return "pass";
  if (passed === false) return "fail";
  return summaryStatus === "pass" || summaryStatus === "ok" ? "pass" : summaryStatus === "fail" || summaryStatus === "error" ? "fail" : "error";
}

function emptyDailyGateStep(label: string): DailyPlatformOpsGateStepView {
  return {
    exists: false,
    status: "missing",
    label,
    passed: null,
    durationMs: null,
    summaryStatus: null,
    blockingReasons: [],
    warnings: [],
    freshness: freshnessTimelineView(null)
  };
}

function emptyDailyGateTrustedAuditStep(): DailyPlatformOpsGateTrustedAuditView {
  return {
    ...emptyDailyGateStep("Trusted dashboard audit"),
    trustedContentCount: 0,
    trustedMetricSnapshotCount: 0,
    views: 0,
    engagement: 0,
    mismatchCount: 0,
    mismatches: [],
    dashboardInput: null
  };
}

function readDailyGateStep(step: Record<string, unknown>, fallbackLabel: string): DailyPlatformOpsGateStepView {
  const summary = asRecord(step.summary);
  const passed = booleanValue(step.passed);
  const summaryStatus = stringValue(summary.status);
  const exists = Object.keys(step).length > 0;
  return {
    exists,
    status: stepGateStatus(passed, exists, summaryStatus),
    label: stringValue(step.label) ?? fallbackLabel,
    passed,
    durationMs: numberValue(step.durationMs),
    summaryStatus,
    blockingReasons: stringArrayValue(summary.blockingReasons),
    warnings: stringArrayValue(summary.warnings),
    freshness: freshnessTimelineView(summary.freshness)
  };
}

function healthCheckView(value: unknown): PlatformDataHealthView["platforms"][number]["mappingPreview"] {
  const item = asRecord(value);
  return {
    exists: Boolean(item.exists),
    status: healthStatus(item.status),
    generatedAt: stringValue(item.generatedAt),
    isStale: booleanValue(item.isStale),
    sourceMatches: booleanValue(item.sourceMatches),
    source: stringValue(item.source),
    contentCount: numberValue(item.contentCount),
    metricCount: numberValue(item.metricCount),
    previewOnly: booleanValue(item.previewOnly),
    saved: booleanValue(item.saved)
  };
}

function healthSummaryView(report: Record<string, unknown>): PlatformDataHealthView["summary"] {
  const summary = asRecord(report.summary);
  return {
    platformCount: numberValue(summary.platformCount) ?? 0,
    okCount: numberValue(summary.okCount) ?? 0,
    warnCount: numberValue(summary.warnCount) ?? 0,
    errorCount: numberValue(summary.errorCount) ?? 0,
    missingCount: numberValue(summary.missingCount) ?? 0,
    staleCount: numberValue(summary.staleCount) ?? 0,
    realCaptureStaleCount: numberValue(summary.realCaptureStaleCount) ?? 0,
    sourceMismatchCount: numberValue(summary.sourceMismatchCount) ?? 0,
    bilibiliPreviewOnlyOk: booleanValue(summary.bilibiliPreviewOnlyOk),
    freshness: freshnessTimelineView(summary.freshness)
  };
}

export function readPlatformDataHealthView(cwd = process.cwd()): PlatformDataHealthView {
  const reportPath = path.join(cwd, platformDataHealthReportPath);
  const base = {
    reportPath: platformDataHealthReportPath,
    generatedAt: null,
    staleAfterHours: null,
    summary: {
      platformCount: 0,
      okCount: 0,
      warnCount: 0,
      errorCount: 0,
      missingCount: 0,
      staleCount: 0,
      sourceMismatchCount: 0,
      bilibiliPreviewOnlyOk: null,
      realCaptureStaleCount: 0,
      freshness: freshnessTimelineView(null)
    },
    platforms: [],
    bilibiliAccount: null
  };
  if (!existsSync(reportPath)) {
    return {
      ...base,
      exists: false,
      status: "missing",
      message: "未找到平台数据健康报告，请运行 npm run health:platform-data。"
    };
  }
  try {
    const report = asRecord(JSON.parse(readFileSync(reportPath, "utf8")));
    const platforms = (Array.isArray(report.platforms) ? report.platforms : []).map((value) => {
      const platform = asRecord(value);
      const raw = asRecord(platform.raw);
      const mappingPreview = healthCheckView(platform.mappingPreview);
      const saveSmoke = healthCheckView(platform.saveSmokeReport);
      const platformKey = stringValue(platform.platform) as PlatformDataHealthView["platforms"][number]["platform"];
      const commandDefaults = assistedRefreshCommandDefaults[platformKey] ?? assistedRefreshCommandDefaults.douyin;
      const freshness = freshnessTimelineView(platform.freshness);
      const rawCaptureCount = numberValue(raw.captureCount) ?? 0;
      const explicitRealCaptureStatus = realCaptureStatus(platform.realCaptureStatus);
      const status: RealCaptureFreshnessStatus = explicitRealCaptureStatus !== "unknown"
        ? explicitRealCaptureStatus
        : !raw.exists || rawCaptureCount === 0
          ? "missing"
          : freshness.realCaptureIsStale === true
            ? "stale"
            : freshness.realCaptureIsStale === false
              ? "fresh"
              : "unknown";
      return {
        platform: platformKey,
        label: stringValue(platform.label) ?? platformKey ?? "unknown",
        status: healthStatus(platform.status),
        realCaptureStatus: status,
        rawCaptureCount,
        rawStatus: healthStatus(raw.status),
        rawLatestModifiedAt: stringValue(raw.latestModifiedAt),
        mappingPreview,
        saveSmoke: {
          ...saveSmoke,
          passed: booleanValue(asRecord(platform.saveSmokeReport).passed)
        },
        latestGeneratedAt: stringValue(platform.latestGeneratedAt),
        freshness,
        nextAction: stringValue(platform.nextAction) ?? (status === "stale" || status === "missing"
          ? `${commandDefaults.manualStep} 然后运行 preview/save/health/freshness/audit/gate。`
          : "真实采集仍在 72 小时内；可继续 preview/save，再运行 health/freshness/audit/gate。"),
        commands: assistedRefreshCommandsView(platform.commands, platformKey),
        warnings: Array.isArray(platform.warnings) ? platform.warnings.filter((warning): warning is string => typeof warning === "string") : []
      };
    }).filter((platform) => ["douyin", "xiaohongshu", "video-account", "bilibili"].includes(platform.platform));
    const bilibiliAccountRaw = report.bilibiliAccount ? asRecord(report.bilibiliAccount) : null;
    const accountPreviewRaw = asRecord(bilibiliAccountRaw?.accountPreview);
    return {
      reportPath: platformDataHealthReportPath,
      exists: true,
      status: healthStatus(report.status),
      generatedAt: stringValue(report.generatedAt),
      staleAfterHours: numberValue(report.staleAfterHours),
      summary: healthSummaryView(report),
      platforms,
      bilibiliAccount: bilibiliAccountRaw ? {
        status: healthStatus(bilibiliAccountRaw.status),
        latestGeneratedAt: stringValue(bilibiliAccountRaw.latestGeneratedAt),
        accountPreview: {
          ...healthCheckView(accountPreviewRaw),
          candidateCount: numberValue(accountPreviewRaw.candidateCount),
          previewOnlyOk: booleanValue(accountPreviewRaw.previewOnlyOk)
        },
        warnings: Array.isArray(bilibiliAccountRaw.warnings) ? bilibiliAccountRaw.warnings.filter((warning): warning is string => typeof warning === "string") : []
      } : null
    };
  } catch (error) {
    return {
      ...base,
      exists: true,
      status: "error",
      message: `平台数据健康报告解析失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function readTrustedDashboardAuditView(cwd = process.cwd()): TrustedDashboardAuditView {
  const reportPath = path.join(cwd, trustedDashboardAuditReportPath);
  const base = {
    reportPath: trustedDashboardAuditReportPath,
    trustedContentCount: 0,
    trustedMetricSnapshotCount: 0,
    views: 0,
    engagement: 0,
    mismatchCount: 0,
    mismatches: [],
    freshness: freshnessTimelineView(null)
  };
  if (!existsSync(reportPath)) {
    return {
      ...base,
      exists: false,
      status: "missing",
      generatedAt: null,
      dashboardInput: null,
      message: `未找到可信看板审计报告，请运行 ${trustedDashboardAuditCommand}。`
    };
  }
  try {
    const report = asRecord(JSON.parse(readFileSync(reportPath, "utf8")));
    const expected = asRecord(report.expected);
    const mismatches = stringArrayValue(report.mismatches);
    const rawStatus = stringValue(report.status);
    const status: TrustedDashboardAuditView["status"] = rawStatus === "pass" || rawStatus === "fail" ? rawStatus : "error";
    return {
      ...base,
      exists: true,
      status,
      generatedAt: stringValue(report.generatedAt),
      dashboardInput: stringValue(report.dashboardInput),
      trustedContentCount: numberValue(expected.contentCount) ?? 0,
      trustedMetricSnapshotCount: numberValue(expected.metricSnapshotCount) ?? 0,
      views: numberValue(expected.views) ?? 0,
      engagement: numberValue(expected.engagement) ?? 0,
      mismatchCount: mismatches.length,
      mismatches,
      freshness: freshnessTimelineView(report.freshness),
      message: status === "pass" ? "可信看板审计通过。" : status === "fail" ? "可信看板审计存在 mismatch。" : "可信看板审计报告格式异常。"
    };
  } catch (error) {
    return {
      ...base,
      exists: true,
      status: "error",
      generatedAt: null,
      dashboardInput: null,
      freshness: freshnessTimelineView(null),
      message: error instanceof Error ? error.message : "读取可信看板审计报告失败。"
    };
  }
}

export function readDailyPlatformOpsGateView(cwd = process.cwd()): DailyPlatformOpsGateView {
  const reportPath = path.join(cwd, dailyPlatformOpsGateReportPath);
  const base = {
    reportPath: dailyPlatformOpsGateReportPath,
    generatedAt: null,
    passed: null,
    completedAllSteps: null,
    blockingReasons: [],
    warnings: [],
    freshness: freshnessTimelineView(null),
    healthGate: emptyDailyGateStep("Platform ops with health gate"),
    trustedAudit: emptyDailyGateTrustedAuditStep()
  };
  if (!existsSync(reportPath)) {
    return {
      ...base,
      exists: false,
      status: "missing",
      message: "未运行：当前没有 daily platform ops gate report。"
    };
  }
  try {
    const report = asRecord(JSON.parse(readFileSync(reportPath, "utf8")));
    const steps = Array.isArray(report.steps) ? report.steps.map(asRecord) : [];
    const healthStep = steps.find((step) => stringValue(step.key) === "platform_ops_with_health");
    const auditStep = steps.find((step) => stringValue(step.key) === "trusted_dashboard_audit");
    const reportSummary = asRecord(report.summary);
    const auditSummary = asRecord(auditStep?.summary);
    const mismatches = stringArrayValue(auditSummary.mismatches);
    const status = gateStatus(report.status);
    return {
      ...base,
      exists: true,
      status,
      passed: booleanValue(report.passed),
      generatedAt: stringValue(report.generatedAt),
      completedAllSteps: booleanValue(reportSummary.completedAllSteps),
      blockingReasons: stringArrayValue(reportSummary.blockingReasons),
      warnings: stringArrayValue(reportSummary.warnings),
      freshness: freshnessTimelineView(reportSummary.freshness),
      healthGate: healthStep ? readDailyGateStep(healthStep, "Platform ops with health gate") : base.healthGate,
      trustedAudit: auditStep ? {
        ...readDailyGateStep(auditStep, "Trusted dashboard audit"),
        trustedContentCount: numberValue(auditSummary.trustedContentCount) ?? 0,
        trustedMetricSnapshotCount: numberValue(auditSummary.trustedMetricSnapshotCount) ?? 0,
        views: numberValue(auditSummary.views) ?? 0,
        engagement: numberValue(auditSummary.engagement) ?? 0,
        mismatchCount: mismatches.length,
        mismatches,
        dashboardInput: stringValue(auditSummary.dashboardInput),
        latestAuditAt: stringValue(auditSummary.latestAuditAt),
        freshness: freshnessTimelineView(auditSummary.freshness)
      } : base.trustedAudit,
      message: status === "pass" ? "daily gate 通过。" : "daily gate 未通过，请查看 blocking reasons。"
    };
  } catch (error) {
    return {
      ...base,
      exists: true,
      status: "error",
      message: `daily gate report 解析失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

const dailySelfMediaOpsStepDefinitions: Array<{ key: DailySelfMediaOpsStepView["key"]; label: string }> = [
  { key: "platform_data_health", label: "Platform data health" },
  { key: "real_capture_freshness", label: "Real capture freshness" },
  { key: "trusted_weekly_safe", label: "Trusted weekly safe report" },
  { key: "trusted_dashboard_audit", label: "Trusted dashboard audit" },
  { key: "daily_platform_ops_gate", label: "Daily platform ops gate" }
];

const dailySelfMediaOpsPreflightDefinition: { key: DailySelfMediaOpsStepView["key"]; label: string } = {
  key: "local_server_health_preflight",
  label: "Local server health preflight"
};

function dailySelfMediaOpsStatus(value: unknown): DailySelfMediaOpsView["status"] {
  if (value === "pass" || value === "warn" || value === "fail") return value;
  return "error";
}

function dailySelfMediaOpsStepStatus(step: Record<string, unknown>): DailySelfMediaOpsStepView["status"] {
  const passed = booleanValue(step.passed);
  if (passed === true) return "pass";
  if (passed === false) return "fail";
  const exitCode = numberValue(step.exitCode);
  if (exitCode === 0) return "pass";
  if (exitCode !== null) return "fail";
  return "error";
}

function safeWeeklyRedactedPaths(report: Record<string, unknown>) {
  const outputs = asRecord(report.outputs);
  const sections = asRecord(report.sections);
  const trustedWeeklySafe = asRecord(sections.trustedWeeklySafe);
  const paths = asRecord(trustedWeeklySafe.paths);
  return {
    json: safeOperatingText(outputs.trustedWeeklyRedactedJson, safeOperatingText(paths.redactedJson, ".local/trusted-weekly-report/redacted-summary.json")) ?? ".local/trusted-weekly-report/redacted-summary.json",
    markdown: safeOperatingText(outputs.trustedWeeklyRedactedMarkdown, safeOperatingText(paths.redactedMarkdown, ".local/trusted-weekly-report/redacted-summary.md")) ?? ".local/trusted-weekly-report/redacted-summary.md"
  };
}

function dailySelfMediaOpsPreflightView(report: Record<string, unknown>) {
  const sections = asRecord(report.sections);
  const raw = asRecord(sections.preflightHealth);
  const enabled = booleanValue(raw.enabled) === true;
  const statusValue = stringValue(raw.status);
  const status = !enabled
    ? "disabled" as const
    : statusValue === "pass"
      ? "pass" as const
      : statusValue === "fail"
        ? "fail" as const
        : statusValue === "missing"
          ? "missing" as const
          : "error" as const;
  const numberArray = (value: unknown) => Array.isArray(value) ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item)) : [];
  return {
    enabled,
    status,
    passed: booleanValue(raw.passed),
    preferredDashboardUrl: safeOperatingText(raw.preferredDashboardUrl, null),
    healthyPorts: numberArray(raw.healthyPorts),
    apiReadyPorts: numberArray(raw.apiReadyPorts),
    safeWeeklyReadyPorts: numberArray(raw.safeWeeklyReadyPorts),
    trustedDataReadyPorts: numberArray(raw.trustedDataReadyPorts),
    pageReadyPorts: numberArray(raw.pageReadyPorts),
    staleOrOldRoutePorts: numberArray(raw.staleOrOldRoutePorts)
  };
}

export function readDailySelfMediaOpsView(cwd = process.cwd()): DailySelfMediaOpsView {
  const reportPath = path.join(cwd, dailySelfMediaOpsReportPath);
  const base = {
    reportPath: dailySelfMediaOpsReportPath,
    generatedAt: null,
    passed: null,
    command: dailySelfMediaOpsCommand,
    defaultDashboardUrl: dailySelfMediaOpsDefaultDashboardUrl,
    fallbackDashboardUrlHint: dailySelfMediaOpsFallbackHint,
    stepCount: 0,
    plannedStepCount: dailySelfMediaOpsStepDefinitions.length,
    completedAllSteps: null,
    blockingReasons: [],
    warnings: [],
    nextActions: [],
    preflightHealth: {
      enabled: false,
      status: "disabled" as const,
      passed: null,
      preferredDashboardUrl: null,
      healthyPorts: [],
      apiReadyPorts: [],
      safeWeeklyReadyPorts: [],
      trustedDataReadyPorts: [],
      pageReadyPorts: [],
      staleOrOldRoutePorts: []
    },
    steps: dailySelfMediaOpsStepDefinitions.map((definition) => ({
      ...definition,
      status: "missing" as const,
      passed: null,
      exitCode: null,
      durationMs: null,
      command: null,
      reportPath: null,
      summaryStatus: null
    })),
    safeWeeklyRedactedPaths: {
      json: ".local/trusted-weekly-report/redacted-summary.json",
      markdown: ".local/trusted-weekly-report/redacted-summary.md"
    },
    scope: {
      serialExecution: null,
      noCollection: null,
      browserOpened: null,
      platformLoginOpened: null,
      databaseDeletion: null,
      wechatPaused: null,
      bilibiliAccountMetricsSaved: null,
      commandOutputStored: null,
      trustedWeeklyRedactedOnly: null
    }
  };
  if (!existsSync(reportPath)) {
    return {
      ...base,
      exists: false,
      status: "missing",
      message: `未找到每日运营闭环报告。请运行 ${dailySelfMediaOpsCommand}；默认 dashboard-url 为 ${dailySelfMediaOpsDefaultDashboardUrl}。${dailySelfMediaOpsFallbackHint}。`
    };
  }
  try {
    const report = asRecord(JSON.parse(readFileSync(reportPath, "utf8")));
    const summary = asRecord(report.summary);
    const scope = asRecord(report.scope);
    const stepRecords = new Map((Array.isArray(report.steps) ? report.steps.map(asRecord) : []).map((step) => [stringValue(step.key), step]));
    const preflight = dailySelfMediaOpsPreflightView(report);
    const stepDefinitions = preflight.enabled ? [dailySelfMediaOpsPreflightDefinition, ...dailySelfMediaOpsStepDefinitions] : dailySelfMediaOpsStepDefinitions;
    const steps = stepDefinitions.map((definition) => {
      const step = stepRecords.get(definition.key);
      if (!step) return base.steps.find((item) => item.key === definition.key) ?? { ...definition, status: "missing" as const };
      const stepSummary = asRecord(step.summary);
      return {
        key: definition.key,
        label: safeOperatingText(step.label, definition.label) ?? definition.label,
        status: dailySelfMediaOpsStepStatus(step),
        passed: booleanValue(step.passed),
        exitCode: numberValue(step.exitCode),
        durationMs: numberValue(step.durationMs),
        command: safeOperatingText(step.command, null),
        reportPath: safeOperatingText(step.reportPath, null),
        summaryStatus: safeOperatingText(stepSummary.status, null)
      };
    });
    const status = dailySelfMediaOpsStatus(report.status);
    return {
      ...base,
      exists: true,
      status,
      passed: booleanValue(report.passed),
      generatedAt: stringValue(report.generatedAt),
      stepCount: numberValue(summary.stepCount) ?? steps.filter((step) => step.status !== "missing").length,
      plannedStepCount: numberValue(summary.plannedStepCount) ?? dailySelfMediaOpsStepDefinitions.length,
      completedAllSteps: booleanValue(summary.completedAllSteps),
      blockingReasons: safeOperatingTextArray(summary.blockingReasons),
      warnings: safeOperatingTextArray(summary.warnings),
      nextActions: safeOperatingTextArray(summary.nextActions),
      preflightHealth: preflight,
      steps,
      safeWeeklyRedactedPaths: safeWeeklyRedactedPaths(report),
      scope: {
        serialExecution: booleanValue(scope.serialExecution),
        noCollection: booleanValue(scope.noCollection),
        browserOpened: booleanValue(scope.browserOpened),
        platformLoginOpened: booleanValue(scope.platformLoginOpened),
        databaseDeletion: booleanValue(scope.databaseDeletion),
        wechatPaused: booleanValue(scope.wechatPaused),
        bilibiliAccountMetricsSaved: booleanValue(scope.bilibiliAccountMetricsSaved),
        commandOutputStored: booleanValue(scope.commandOutputStored),
        trustedWeeklyRedactedOnly: booleanValue(scope.trustedWeeklyRedactedOnly)
      },
      message: status === "pass"
        ? "每日运营闭环通过。"
        : status === "warn"
          ? "每日运营闭环有提醒，请查看 warnings 和 next actions。"
          : "每日运营闭环未通过，请查看 blocking reasons 和 next actions。"
    };
  } catch (error) {
    return {
      ...base,
      exists: true,
      status: "error",
      message: `每日运营闭环报告解析失败：${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function addHoursIso(value: string | null | undefined, hours: number) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + hours * 60 * 60 * 1000).toISOString();
}

function latestIso(...values: Array<string | null | undefined>) {
  const dated = values
    .map((value) => ({ value, time: value ? new Date(value).getTime() : Number.NaN }))
    .filter((item): item is { value: string; time: number } => Boolean(item.value) && Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time);
  return dated[0]?.value ?? null;
}

export function buildDataCaptureScheduleReliability(input: {
  generatedAt: string;
  platformDataHealth: PlatformDataHealthView;
  dailySelfMediaOps: DailySelfMediaOpsView;
  dailyPlatformOpsGate: DailyPlatformOpsGateView;
}): DataCaptureScheduleReliabilityView {
  const suggestedFrequencyHours = 24;
  const staleAfterHours = input.platformDataHealth.staleAfterHours
    ?? input.platformDataHealth.summary.freshness.staleAfterHours
    ?? 72;
  const latestRealCaptureAt = input.platformDataHealth.summary.freshness.latestRealCaptureAt
    ?? input.dailyPlatformOpsGate.freshness.latestRealCaptureAt
    ?? null;
  const latestSuccessfulImportAt = latestIso(
    latestRealCaptureAt,
    input.platformDataHealth.status === "ok" ? input.platformDataHealth.generatedAt : null,
    input.dailyPlatformOpsGate.status === "pass" ? input.dailyPlatformOpsGate.generatedAt : null,
    input.dailySelfMediaOps.status === "pass" ? input.dailySelfMediaOps.generatedAt : null
  );
  const failedAt = latestIso(
    input.platformDataHealth.status === "error" ? input.platformDataHealth.generatedAt : null,
    input.dailyPlatformOpsGate.status === "fail" || input.dailyPlatformOpsGate.status === "error" ? input.dailyPlatformOpsGate.generatedAt : null,
    input.dailySelfMediaOps.status === "fail" || input.dailySelfMediaOps.status === "error" ? input.dailySelfMediaOps.generatedAt : null
  );
  const latestFailureAt = failedAt ?? null;
  const isFailed = Boolean(latestFailureAt) || input.platformDataHealth.status === "error";
  const isStale = input.platformDataHealth.summary.freshness.realCaptureIsStale === true
    || input.platformDataHealth.summary.realCaptureStaleCount > 0;
  const status: DataCaptureScheduleReliabilityView["status"] = isFailed
    ? "failed"
    : !latestRealCaptureAt || input.platformDataHealth.status === "missing"
      ? "missing"
      : isStale
        ? "stale"
        : input.platformDataHealth.summary.freshness.realCaptureIsStale === false || input.platformDataHealth.status === "ok"
          ? "fresh"
          : "unknown";
  const nextSuggestedAt = addHoursIso(latestRealCaptureAt, suggestedFrequencyHours) ?? input.generatedAt;
  const startupCatchUpRequired = status === "missing" || status === "stale" || status === "failed";
  const statusLabels: Record<DataCaptureScheduleReliabilityView["status"], string> = {
    fresh: "抓取新鲜",
    stale: "需要补抓",
    missing: "等待首次抓取",
    failed: "抓取链路需复核",
    unknown: "待确认"
  };
  const failureSummary = status === "failed"
    ? "最近检查发现抓取链路异常；先看平台健康，再手动刷新四平台。"
    : status === "stale"
      ? "最近真实采集已过期或部分平台过期；开机后建议先补抓。"
      : status === "missing"
        ? "暂无可用真实采集时间；先进行一次手动抓取。"
        : status === "fresh"
          ? "最近真实采集仍在建议窗口内。"
          : "抓取状态待确认；建议先复核平台健康。";
  return {
    mode: "manual_only",
    modeLabel: "手动抓取 + 开机补抓提示",
    hasHourlyAutomation: false,
    hasBackgroundDaemon: false,
    hasStartupAutomation: false,
    windowsTaskSchedulerRegistered: false,
    suggestedFrequencyHours,
    staleAfterHours,
    latestRealCaptureAt,
    latestSuccessfulImportAt,
    latestFailureAt,
    nextSuggestedAt,
    status,
    statusLabel: statusLabels[status],
    startupCatchUpRequired,
    startupCatchUpCopy: startupCatchUpRequired
      ? "开机后先补抓：刷新四平台后再确认健康和门禁。"
      : "开机后无需补抓：继续按建议频率复核。",
    manualImmediateRefreshCopy: "手动立即抓取：先登录对应平台完成真实采集，再保存导入并复核健康。",
    failureSummary,
    visibleNextAction: startupCatchUpRequired ? "先补抓四平台真实数据" : "按建议频率继续观察",
    boundaries: {
      noSensitiveLoginMaterial: true,
      wechatPaused: true,
      bilibiliAccountPreviewOnly: true,
      noAutoRegistration: true,
      noBackgroundCapture: true
    }
  };
}

type TrustedAutoCaptureSchedulerConnectionInput = {
  platform: PlatformCaptureSchedulerStatus["platform"] | PlatformCaptureSchedulerStatus["key"];
  captureMode?: CaptureMode;
  isAuthorized?: boolean;
  browserSessionAvailable?: boolean;
  captureScheduleEnabled?: boolean;
  intervalHours?: number;
  lastSuccessfulCaptureAt?: string | null;
};

const captureSchedulerPlatformDefinitions: Array<Pick<PlatformCaptureSchedulerStatus, "platform" | "key" | "label">> = [
  { platform: "douyin", key: "douyin", label: "抖音" },
  { platform: "xiaohongshu", key: "xiaohongshu", label: "小红书" },
  { platform: "video_account", key: "video-account", label: "视频号" },
  { platform: "bilibili", key: "bilibili", label: "B站" }
];

function isIsoDue(value: string | null | undefined, generatedAt: string) {
  if (!value) return false;
  const valueTime = new Date(value).getTime();
  const generatedTime = new Date(generatedAt).getTime();
  return Number.isFinite(valueTime) && Number.isFinite(generatedTime) && valueTime <= generatedTime;
}

function captureConnectionStatusFor(input: {
  captureMode: CaptureMode;
  officialApiAuthorized: boolean;
  browserSessionAvailable: boolean;
}): CaptureConnectionStatus {
  if (input.captureMode === "official_api") return input.officialApiAuthorized ? "authorized" : "not_authorized";
  if (input.captureMode === "browser_assisted") return input.browserSessionAvailable ? "browser_session_active" : "browser_session_missing";
  return "not_authorized";
}

function captureModeLabel(mode: CaptureMode) {
  if (mode === "official_api") return "官方 API";
  if (mode === "browser_assisted") return "浏览器辅助";
  return "手动";
}

export function buildTrustedAutoCaptureScheduler(input: {
  generatedAt: string;
  platformDataHealth: PlatformDataHealthView;
  platformImportStatuses?: PlatformImportStatus[];
  connections?: TrustedAutoCaptureSchedulerConnectionInput[];
}): TrustedAutoCaptureSchedulerView {
  const staleAfterHours = input.platformDataHealth.staleAfterHours
    ?? input.platformDataHealth.summary.freshness.staleAfterHours
    ?? 72;
  const statusByPlatform = new Map((input.platformImportStatuses ?? []).map((status) => [status.platform, status]));
  const healthByPlatform = new Map(input.platformDataHealth.platforms.map((health) => [health.platform, health]));
  const connectionByKey = new Map((input.connections ?? []).map((connection) => [String(connection.platform), connection]));

  const statuses = captureSchedulerPlatformDefinitions.map((definition): PlatformCaptureSchedulerStatus => {
    const connection = connectionByKey.get(definition.platform) ?? connectionByKey.get(definition.key);
    const captureMode: CaptureMode = connection?.captureMode ?? "manual";
    const officialApiAuthorized = captureMode === "official_api" && connection?.isAuthorized === true;
    const browserSessionAvailable = captureMode === "browser_assisted" && connection?.browserSessionAvailable === true;
    const allowScheduledCapture = officialApiAuthorized || browserSessionAvailable;
    const intervalHours = allowScheduledCapture
      ? connection?.intervalHours ?? (captureMode === "official_api" ? 1 : 24)
      : null;
    const cadence: PlatformCaptureSchedulerStatus["captureSchedule"]["cadence"] = !intervalHours ? "disabled" : intervalHours <= 1 ? "hourly" : "daily";
    const health = healthByPlatform.get(definition.key);
    const importStatus = statusByPlatform.get(definition.platform);
    const lastSuccessfulCaptureAt = connection?.lastSuccessfulCaptureAt
      ?? (importStatus?.latestStatus === "success" ? importStatus.latestRunAt : undefined)
      ?? health?.freshness.latestRealCaptureAt
      ?? health?.rawLatestModifiedAt
      ?? null;
    const nextScheduledCaptureAt = allowScheduledCapture
      ? addHoursIso(lastSuccessfulCaptureAt, intervalHours ?? 24) ?? input.generatedAt
      : null;
    const staleByHealth = health?.freshness.realCaptureIsStale === true || health?.realCaptureStatus === "stale" || health?.realCaptureStatus === "missing";
    const dueBySchedule = allowScheduledCapture && isIsoDue(nextScheduledCaptureAt, input.generatedAt);
    const startupCatchUpRequired = !lastSuccessfulCaptureAt || staleByHealth || dueBySchedule;
    const captureConnectionStatus = captureConnectionStatusFor({ captureMode, officialApiAuthorized, browserSessionAvailable });

    let missedCaptureReason: string | null = null;
    if (!allowScheduledCapture) {
      missedCaptureReason = captureMode === "official_api"
        ? "官方 API 未授权，不能定时抓取。"
        : captureMode === "browser_assisted"
          ? "浏览器辅助会话不可用，需要先打开平台后台并连接本地浏览器助手。"
          : "未授权平台只能手动导入，不能自动抓取。";
    } else if (startupCatchUpRequired) {
      missedCaptureReason = !lastSuccessfulCaptureAt
        ? "没有成功抓取记录，启动后需要补抓。"
        : "已超过下一次计划或新鲜度阈值，启动后需要补抓。";
    }

    const captureSchedule = {
      enabled: allowScheduledCapture && connection?.captureScheduleEnabled === true,
      cadence,
      intervalHours,
      allowScheduledCapture,
      reason: allowScheduledCapture
        ? `${captureModeLabel(captureMode)} 可调度；本地框架只允许安全适配器执行。`
        : missedCaptureReason ?? "缺少授权或会话。"
    };
    const needsManualAction = !allowScheduledCapture || startupCatchUpRequired;
    const statusLabel = captureSchedule.enabled
      ? "定时抓取已启用"
      : allowScheduledCapture
        ? "可立即补抓/可启用定时"
        : captureMode === "browser_assisted"
          ? "等待浏览器辅助会话"
          : "手动导入";
    const nextAction = allowScheduledCapture
      ? startupCatchUpRequired
        ? "可用安全适配器立即补抓。"
        : "等待下一次计划抓取。"
      : "手动导入或先连接平台。";

    return {
      ...definition,
      captureMode,
      captureConnectionStatus,
      isAuthorized: officialApiAuthorized,
      browserSessionAvailable,
      captureSchedule,
      lastSuccessfulCaptureAt,
      nextScheduledCaptureAt,
      missedCaptureReason,
      startupCatchUpRequired,
      needsManualAction,
      canRunImmediateCapture: allowScheduledCapture,
      statusLabel,
      nextAction
    };
  });

  return {
    generatedAt: input.generatedAt,
    staleAfterHours,
    schedulerEnabledCount: statuses.filter((status) => status.captureSchedule.enabled).length,
    manualOnlyCount: statuses.filter((status) => status.captureMode === "manual").length,
    startupCatchUpCount: statuses.filter((status) => status.startupCatchUpRequired).length,
    statuses,
    boundaries: {
      noRealPlatformApiCall: true,
      noSensitiveLoginMaterial: true,
      noScheduleWithoutAuthorization: true,
      browserSessionMustBeActive: true
    }
  };
}

function buildTrustedOperatingStatus(realDataScope: RealDataScopeSummary, metricSnapshots: MetricSnapshot[]): TrustedOperatingStatus {
  const profile = resolveSelfMediaLocalProfile();
  const views = metricSnapshots.reduce((total, snapshot) => total + snapshot.views, 0);
  const engagement = metricSnapshots.reduce((total, snapshot) => total + snapshotEngagement(snapshot), 0);
  return {
    defaultScope: "trusted_real_creator_center",
    profile,
    profileLabel: profile === "clean" ? "clean" : "dirty/history",
    seedMode: resolveSelfMediaSeedMode(),
    auditCommand: trustedDashboardAuditCommand,
    trustedContentCount: realDataScope.trustedContentCount,
    trustedMetricSnapshotCount: realDataScope.trustedMetricSnapshotCount,
    views,
    engagement,
    isDefaultDashboardTrusted: realDataScope.isDefaultDashboardTrusted,
    audit: readTrustedDashboardAuditView()
  };
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function ratePercent(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

function buildTrustedWeeklyReportSummary(input: {
  generatedAt: string;
  realDataScope: RealDataScopeSummary;
  trustedOperatingStatus: TrustedOperatingStatus;
  metricPlatformGroups: MetricSnapshotPlatformGroup[];
  platformDataHealth: PlatformDataHealthView;
  dailyPlatformOpsGate: DailyPlatformOpsGateView;
  weeklyReview: ReturnType<typeof generateReview>;
}): TrustedWeeklyReportSummary {
  const totalViews = input.weeklyReview.metrics.totalViews;
  const platformGroups = new Map(input.metricPlatformGroups.map((group) => [group.platform, group]));
  return {
    generatedAt: input.generatedAt,
    defaultScope: "trusted_real_creator_center",
    localEvidencePath: ".local/trusted-weekly-report/report.md",
    redactedSummaryPath: ".local/trusted-weekly-report/redacted-summary.md",
    exportGuidance: "完整周报只作为本地证据；外发、粘贴或跨系统同步请使用 redacted 摘要。",
    trustedContentCount: input.realDataScope.trustedContentCount,
    trustedMetricSnapshotCount: input.realDataScope.trustedMetricSnapshotCount,
    views: input.weeklyReview.metrics.totalViews,
    engagement: input.weeklyReview.metrics.totalEngagement,
    bestPlatform: input.weeklyReview.metrics.bestPlatform,
    platformOverview: closedLoopContentPlatforms.map((platform) => {
      const group = platformGroups.get(platform);
      const views = group?.views ?? 0;
      const engagement = group?.engagement ?? 0;
      return {
        platform,
        contentCount: group?.contentCount ?? 0,
        metricSnapshotCount: group?.snapshotCount ?? 0,
        views,
        engagement,
        viewShare: percent(views, totalViews),
        engagementRate: ratePercent(engagement, views)
      };
    }),
    freshness: {
      latestRealCaptureAt: input.dailyPlatformOpsGate.freshness.latestRealCaptureAt ?? input.platformDataHealth.summary.freshness.latestRealCaptureAt ?? null,
      latestSmokeAt: input.dailyPlatformOpsGate.freshness.latestSmokeAt ?? input.platformDataHealth.summary.freshness.latestSmokeAt ?? null,
      latestAuditAt: input.dailyPlatformOpsGate.freshness.latestAuditAt ?? input.trustedOperatingStatus.audit.generatedAt ?? null,
      realCaptureAgeHours: input.dailyPlatformOpsGate.freshness.realCaptureAgeHours ?? input.platformDataHealth.summary.freshness.realCaptureAgeHours ?? null,
      smokeAgeHours: input.dailyPlatformOpsGate.freshness.smokeAgeHours ?? input.platformDataHealth.summary.freshness.smokeAgeHours ?? null,
      realCaptureIsStale: input.dailyPlatformOpsGate.freshness.realCaptureIsStale ?? input.platformDataHealth.summary.freshness.realCaptureIsStale ?? null,
      smokeIsStale: input.dailyPlatformOpsGate.freshness.smokeIsStale ?? input.platformDataHealth.summary.freshness.smokeIsStale ?? null,
      staleAfterHours: input.dailyPlatformOpsGate.freshness.staleAfterHours ?? input.platformDataHealth.summary.freshness.staleAfterHours ?? null,
      realCaptureStaleCount: input.platformDataHealth.summary.realCaptureStaleCount,
      sourceMismatchCount: input.platformDataHealth.summary.sourceMismatchCount
    },
    excluded: {
      excludedContentCount: input.realDataScope.excludedContentCount,
      excludedMetricSnapshotCount: input.realDataScope.excludedMetricSnapshotCount,
      userExcludedContentCount: input.realDataScope.userExcludedContentCount,
      excludedSourceCount: input.realDataScope.excludedSources.length
    },
    redaction: {
      contentTitlesIncluded: false,
      accountMetricsIncluded: false,
      captureDetailsIncluded: false
    }
  };
}

function buildTrustedWeeklyPerformanceRows(metricSnapshots: MetricSnapshot[]) {
  return metricSnapshots
    .filter((snapshot) => closedLoopContentPlatforms.includes(snapshot.platform as typeof closedLoopContentPlatforms[number]))
    .map((snapshot) => {
      const engagement = snapshotEngagement(snapshot);
      return {
        platform: snapshot.platform as typeof closedLoopContentPlatforms[number],
        views: snapshot.views,
        engagement,
        engagementRate: ratePercent(engagement, snapshot.views),
        latestSnapshotDate: snapshot.snapshotDate
      };
    });
}

function renderTrustedWeeklySafeMarkdown(report: TrustedWeeklySafeReport) {
  const platformLabels: Record<typeof closedLoopContentPlatforms[number], string> = {
    douyin: "抖音",
    xiaohongshu: "小红书",
    video_account: "视频号",
    bilibili: "B站"
  };
  const numberText = (value: number) => new Intl.NumberFormat("en-US").format(value);
  const valueText = (value?: string | number | boolean | null) => (value === undefined || value === null || value === "" ? "-" : String(value));
  const table = (headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) => [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((item) => valueText(item).replaceAll("|", "/")).join(" | ")} |`)
  ].join("\n");
  return [
    "# Trusted Weekly Safe Summary",
    "",
    `Generated at: ${report.generatedAt}`,
    `Scope: ${report.defaultScope}`,
    "",
    "## 外发边界",
    "",
    `- ${report.exportGuidance}`,
    "- 本摘要只含 trusted real creator-center 内容级聚合口径。",
    "- 已移除标题文本、内部内容标识、账号级指标、采集细节和平台互动文本。",
    "",
    "## 四平台概览",
    "",
    `- 可信内容：${numberText(report.totals.trustedContentCount)}`,
    `- 内容级快照：${numberText(report.totals.trustedMetricSnapshotCount)}`,
    `- 总曝光：${numberText(report.totals.views)}`,
    `- 总互动：${numberText(report.totals.engagement)}`,
    `- 当前优势平台：${platformLabels[report.totals.bestPlatform as typeof closedLoopContentPlatforms[number]] ?? report.totals.bestPlatform}`,
    "",
    table(
      ["平台", "内容", "快照", "曝光", "曝光占比", "互动", "互动率"],
      report.platformOverview.map((item) => [platformLabels[item.platform], numberText(item.contentCount), numberText(item.metricSnapshotCount), numberText(item.views), `${item.viewShare}%`, numberText(item.engagement), `${item.engagementRate}%`])
    ),
    "",
    "## Top 内容表现",
    "",
    report.topContentPerformance.length > 0
      ? table(["排名", "平台", "曝光", "互动", "互动率", "快照日"], report.topContentPerformance.map((item) => [item.rank, platformLabels[item.platform], numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`, item.latestSnapshotDate]))
      : "- 暂无可摘要内容表现。",
    "",
    "## 低互动表现",
    "",
    report.lowInteractionPerformance.length > 0
      ? table(["排名", "平台", "曝光", "互动", "互动率", "快照日"], report.lowInteractionPerformance.map((item) => [item.rank, platformLabels[item.platform], numberText(item.views), numberText(item.engagement), `${item.engagementRate}%`, item.latestSnapshotDate]))
      : "- 暂无达到阈值的低互动表现。",
    "",
    "## 数据新鲜度",
    "",
    `- 最近真实采集：${valueText(report.freshness.latestRealCaptureAt)}`,
    `- 最近 smoke：${valueText(report.freshness.latestSmokeAt)}`,
    `- 最近审计：${valueText(report.freshness.latestAuditAt)}`,
    `- 真实采集过期：${valueText(report.freshness.realCaptureIsStale)}；过期平台数：${numberText(report.freshness.realCaptureStaleCount)}`,
    "",
    "## 排除口径",
    "",
    `- 已排除内容：${numberText(report.excluded.excludedContentCount)}`,
    `- 已排除快照：${numberText(report.excluded.excludedMetricSnapshotCount)}`,
    `- 用户手动排除内容：${numberText(report.excluded.userExcludedContentCount)}`,
    `- 被排除来源种类：${numberText(report.excluded.excludedSourceCount)}`,
    "",
    "## 下一步建议",
    "",
    report.recommendationTypes.length > 0
      ? table(["类型", "优先级", "证据条数"], report.recommendationTypes.map((item) => [item.type, item.priority, item.evidenceCount]))
      : "- 暂无建议类型。",
    "",
    "## 一致性检查",
    "",
    ...Object.entries(report.consistencyChecks).map(([key, value]) => `- ${key}: ${value}`),
    ""
  ].join("\n");
}

function buildTrustedScopeCurationSummary(contents: ContentItem[], allSnapshots: MetricSnapshot[], activeSnapshots: MetricSnapshot[]): TrustedScopeCurationSummary {
  const contentById = new Map(contents.map((content) => [content.id, content]));
  const activeSnapshotIds = new Set(activeSnapshots.map((snapshot) => snapshot.id));
  const rows = new Map<string, TrustedScopeCurationSummary["items"][number]>();

  for (const snapshot of allSnapshots) {
    if (!closedLoopContentPlatforms.includes(snapshot.platform as typeof closedLoopContentPlatforms[number])) continue;
    if (!isTrustedRealCreatorCenterSource(snapshot.source)) continue;
    const content = contentById.get(snapshot.contentId);
    if (!content) continue;
    const existing = rows.get(snapshot.contentId) ?? {
      contentId: snapshot.contentId,
      title: content.title,
      platform: snapshot.platform as TrustedScopeCurationSummary["items"][number]["platform"],
      source: snapshot.source as TrustedScopeCurationSummary["items"][number]["source"],
      userExcludedFromTrustedScope: isUserExcludedFromTrustedScope(content),
      trustedScopeOverride: content.trustedScopeOverride,
      includedInTrustedScope: false,
      snapshotCount: 0,
      views: 0,
      engagement: 0,
      latestSnapshotDate: undefined
    };
    existing.snapshotCount += 1;
    existing.views += snapshot.views;
    existing.engagement += snapshotEngagement(snapshot);
    existing.includedInTrustedScope ||= activeSnapshotIds.has(snapshot.id);
    if (!existing.latestSnapshotDate || snapshot.snapshotDate.localeCompare(existing.latestSnapshotDate) > 0) existing.latestSnapshotDate = snapshot.snapshotDate;
    rows.set(snapshot.contentId, existing);
  }

  const items = [...rows.values()].sort((a, b) => Number(b.includedInTrustedScope) - Number(a.includedInTrustedScope) || Number(a.userExcludedFromTrustedScope) - Number(b.userExcludedFromTrustedScope) || b.views - a.views);
  const userExcludedItems = items.filter((item) => item.userExcludedFromTrustedScope);
  return {
    items,
    trustedCandidateContentCount: items.length,
    activeContentCount: items.filter((item) => item.includedInTrustedScope).length,
    userExcludedContentCount: userExcludedItems.length,
    userExcludedMetricSnapshotCount: userExcludedItems.reduce((sum, item) => sum + item.snapshotCount, 0)
  };
}

function buildContentWorkbenchRows(input: {
  contents: ContentItem[];
  platformVersions: ContentPlatformVersion[];
  queue: PublishQueueItem[];
  actionItems: ReviewActionItem[];
  ideas: TopicIdea[];
  metricSnapshots: MetricSnapshot[];
  trustedSnapshots: MetricSnapshot[];
}): ContentWorkbenchContentRow[] {
  const trustedSnapshotIds = new Set(input.trustedSnapshots.map((snapshot) => snapshot.id));
  const actionItemsByContent = new Map<string, ReviewActionItem[]>();
  const ideaIds = new Set(input.ideas.map((idea) => idea.id));

  for (const item of input.actionItems) {
    if (!item.contentDraftId) continue;
    actionItemsByContent.set(item.contentDraftId, [...(actionItemsByContent.get(item.contentDraftId) ?? []), item]);
  }

  return input.contents
    .map((content): ContentWorkbenchContentRow => {
      const platformVersions = input.platformVersions.filter((version) => version.contentId === content.id);
      const queueItems = input.queue.filter((item) => item.contentId === content.id);
      const actionItems = actionItemsByContent.get(content.id) ?? input.actionItems.filter((item) => platformVersions.some((version) => version.id === item.platformVersionId) || queueItems.some((queueItem) => queueItem.id === item.publishQueueItemId));
      const snapshots = input.metricSnapshots.filter((snapshot) => snapshot.contentId === content.id);
      const trustedSnapshots = snapshots.filter((snapshot) => trustedSnapshotIds.has(snapshot.id));
      const sourceKinds = snapshots.length > 0 ? [...new Set(snapshots.map((snapshot) => snapshot.source))] : (actionItems.length > 0 || platformVersions.length > 0 || queueItems.length > 0 ? ["local_workflow" as const] : ["unknown" as const]);
      const hasTrustedCreatorCenterSnapshot = snapshots.some((snapshot) => isTrustedRealCreatorCenterSource(snapshot.source));
      const hasManualSource = snapshots.some((snapshot) => snapshot.source === "manual") || content.id.startsWith("manual-");
      const hasExternalUntrustedSource = snapshots.some((snapshot) => !isTrustedRealCreatorCenterSource(snapshot.source) && snapshot.source !== "manual");
      const ideaConverted = content.id.startsWith("content-from-") && [...ideaIds].some((ideaId) => content.id.startsWith(`content-from-${ideaId}-`));
      const actionGenerated = actionItems.some((item) => item.contentDraftId === content.id) || content.id.startsWith("content-from-action-");
      const draftLike = content.status === "idea" || content.status === "draft" || content.status === "scheduled" || platformVersions.some((version) => version.status === "draft" || version.status === "needs_review" || version.status === "scheduled" || version.status === "blocked") || queueItems.some((item) => item.status === "draft" || item.status === "needs_review" || item.status === "queued" || item.status === "scheduled");
      const includedInTrustedDashboardReview = trustedSnapshots.length > 0;
      const latestSnapshotDate = snapshots
        .map((snapshot) => snapshot.snapshotDate)
        .filter(Boolean)
        .sort()
        .at(-1);

      let originKind: ContentWorkbenchContentRow["originKind"] = "unknown_local";
      let originLabel = "本地内容";
      if (includedInTrustedDashboardReview || hasTrustedCreatorCenterSnapshot) {
        originKind = "trusted_creator_center";
        originLabel = "创作者中心内容";
      }
      if (hasExternalUntrustedSource) {
        originKind = "external_untrusted";
        originLabel = "外部非可信来源";
      }
      if (hasManualSource) {
        originKind = "manual_import";
        originLabel = "手动导入";
      }
      if (draftLike && snapshots.length === 0) {
        originKind = "local_draft";
        originLabel = "本地草稿";
      }
      if (ideaConverted) {
        originKind = "idea_converted";
        originLabel = "idea 转内容";
      }
      if (actionGenerated) {
        originKind = "action_item_generated";
        originLabel = "行动项生成草稿";
      }

      let dashboardReviewReason = "没有可信创作者中心内容级指标快照。";
      if (includedInTrustedDashboardReview) dashboardReviewReason = "已有可信真实创作者中心内容级快照。";
      else if (hasManualSource) dashboardReviewReason = "手动导入只保存在内容工作台，不进入默认运营看板/复盘。";
      else if (hasExternalUntrustedSource) dashboardReviewReason = "外部、demo、csv、MediaCrawler、n8n 或 paused source 不进入默认运营口径。";
      else if (hasTrustedCreatorCenterSnapshot && isUserExcludedFromTrustedScope(content)) dashboardReviewReason = "用户已手动设为不进入运营看板。";
      else if (hasTrustedCreatorCenterSnapshot) dashboardReviewReason = "创作者中心快照存在，但被 provenance/fixture/legacy 规则排除。";
      else if (draftLike) dashboardReviewReason = "草稿、排期和人工发布记录不是可信指标证据。";

      return {
        content,
        platformVersions,
        queueItems,
        actionItems,
        sourceKinds,
        originKind,
        originLabel,
        includedInTrustedDashboardReview,
        dashboardReviewLabel: includedInTrustedDashboardReview ? "进入运营看板" : "不进运营看板",
        dashboardReviewReason,
        trustedMetricSnapshotCount: trustedSnapshots.length,
        localMetricSnapshotCount: snapshots.length,
        latestSnapshotDate
      };
    })
    .sort((a, b) => Number(b.includedInTrustedDashboardReview) - Number(a.includedInTrustedDashboardReview) || b.platformVersions.length - a.platformVersions.length || a.content.title.localeCompare(b.content.title));
}

function buildMetricSourceGroups(metricSnapshots: MetricSnapshot[], metrics: PlatformMetric[]): MetricSnapshotSourceGroup[] {
  const reviewKeys = new Set(metrics.map(metricReviewKey));
  const groups = new Map<string, MetricSnapshotSourceGroup & { platforms: Set<MetricSnapshot["platform"]>; contents: Set<string>; importRuns: Set<string>; includedCount: number }>();
  for (const snapshot of metricSnapshots) {
    const current = groups.get(snapshot.source) ?? {
      source: snapshot.source,
      platform: snapshot.platform,
      snapshotCount: 0,
      contentCount: 0,
      importRunCount: 0,
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      followersDelta: 0,
      engagement: 0,
      latestSnapshotDate: undefined,
      latestImportRunId: undefined,
      includedInReview: false,
      platforms: new Set<MetricSnapshot["platform"]>(),
      contents: new Set<string>(),
      importRuns: new Set<string>(),
      includedCount: 0
    };
    current.snapshotCount += 1;
    current.views += snapshot.views;
    current.likes += snapshot.likes;
    current.comments += snapshot.comments;
    current.saves += snapshot.saves;
    current.shares += snapshot.shares;
    current.followersDelta += snapshot.followersDelta;
    current.engagement += snapshotEngagement(snapshot);
    current.platforms.add(snapshot.platform);
    current.contents.add(snapshot.contentId);
    if (snapshot.importRunId) current.importRuns.add(snapshot.importRunId);
    if (reviewKeys.has(snapshotReviewKey(snapshot))) current.includedCount += 1;
    if (!current.latestSnapshotDate || snapshot.snapshotDate > current.latestSnapshotDate) {
      current.latestSnapshotDate = snapshot.snapshotDate;
      current.latestImportRunId = snapshot.importRunId;
    }
    groups.set(snapshot.source, current);
  }
  return [...groups.values()]
    .map((group): MetricSnapshotSourceGroup => {
      const platform: MetricSnapshotSourceGroup["platform"] = group.platforms.size === 1 ? [...group.platforms][0] : "mixed";
      return {
        source: group.source,
        platform,
        snapshotCount: group.snapshotCount,
        contentCount: group.contents.size,
        importRunCount: group.importRuns.size,
        views: group.views,
        likes: group.likes,
        comments: group.comments,
        saves: group.saves,
        shares: group.shares,
        followersDelta: group.followersDelta,
        engagement: group.engagement,
        latestSnapshotDate: group.latestSnapshotDate,
        latestImportRunId: group.latestImportRunId,
        includedInReview: group.snapshotCount > 0 && group.includedCount === group.snapshotCount
      };
    })
    .sort((a, b) => (b.latestSnapshotDate ?? "").localeCompare(a.latestSnapshotDate ?? "") || b.views - a.views);
}

function buildMetricPlatformGroups(metricSnapshots: MetricSnapshot[], metrics: PlatformMetric[]): MetricSnapshotPlatformGroup[] {
  const reviewKeys = new Set(metrics.map(metricReviewKey));
  const groups = new Map<MetricSnapshot["platform"], MetricSnapshotPlatformGroup & { contents: Set<string>; sourceSet: Set<ImportSource | "manual">; includedCount: number }>();
  for (const snapshot of metricSnapshots) {
    const current = groups.get(snapshot.platform) ?? {
      platform: snapshot.platform,
      snapshotCount: 0,
      contentCount: 0,
      sourceCount: 0,
      sources: [],
      views: 0,
      likes: 0,
      comments: 0,
      saves: 0,
      shares: 0,
      followersDelta: 0,
      engagement: 0,
      latestSnapshotDate: undefined,
      includedInReview: false,
      contents: new Set<string>(),
      sourceSet: new Set<ImportSource | "manual">(),
      includedCount: 0
    };
    current.snapshotCount += 1;
    current.views += snapshot.views;
    current.likes += snapshot.likes;
    current.comments += snapshot.comments;
    current.saves += snapshot.saves;
    current.shares += snapshot.shares;
    current.followersDelta += snapshot.followersDelta;
    current.engagement += snapshotEngagement(snapshot);
    current.contents.add(snapshot.contentId);
    current.sourceSet.add(snapshot.source);
    if (reviewKeys.has(snapshotReviewKey(snapshot))) current.includedCount += 1;
    if (!current.latestSnapshotDate || snapshot.snapshotDate > current.latestSnapshotDate) current.latestSnapshotDate = snapshot.snapshotDate;
    groups.set(snapshot.platform, current);
  }
  return [...groups.values()]
    .map((group) => ({
      platform: group.platform,
      snapshotCount: group.snapshotCount,
      contentCount: group.contents.size,
      sourceCount: group.sourceSet.size,
      sources: [...group.sourceSet],
      views: group.views,
      likes: group.likes,
      comments: group.comments,
      saves: group.saves,
      shares: group.shares,
      followersDelta: group.followersDelta,
      engagement: group.engagement,
      latestSnapshotDate: group.latestSnapshotDate,
      includedInReview: group.snapshotCount > 0 && group.includedCount === group.snapshotCount
    }))
    .sort((a, b) => b.views - a.views);
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

function contentStatusFromPlatformVersion(status: PlatformVersionStatus): ContentItem["status"] {
  if (status === "published") return "published";
  if (status === "scheduled") return "scheduled";
  return "draft";
}

function queueStatusFromPlatformVersion(status: PlatformVersionStatus): PublishQueueStatus {
  if (status === "needs_review") return "needs_review";
  if (status === "scheduled") return "scheduled";
  if (status === "published") return "published";
  if (status === "failed") return "failed";
  if (status === "blocked") return "blocked";
  return "draft";
}

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
  if (request.mode === "csv") return service.parseCsvRequestPayload(request);
  if (request.mode === "json") return service.parseJsonPayload(request.json);
  if (request.mode === "mediacrawler") return service.parseMediaCrawlerPayload(request.json);
  if (request.mode === "n8n") return service.parseN8nPayload(request.json);
  if (request.mode === "manual" && request.manual) return service.parseManualPayload(request.manual);
  throw new Error("不支持的导入模式。");
}

function createPreviewPayloadFromRequest(service: SelfMediaService, request: ImportRequest): ProviderImportPayload {
  if (request.mode === "csv") return service.parseCsvRequestPayload(request, { allowInvalidPreviewRows: true });
  return createPayloadFromRequest(service, request);
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

function dateToIso(value: string) {
  return `${value.slice(0, 10)}T00:00:00.000Z`;
}

function stableHash(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function isClosedLoopContentPlatform(platform: Platform): platform is ClosedLoopContentPlatform {
  return closedLoopContentPlatforms.includes(platform as ClosedLoopContentPlatform);
}

const publishHandoffBackendMeta: Record<ClosedLoopContentPlatform, Pick<PublishHandoffPackage, "officialBackendUrl" | "backendActionLabel" | "defaultMode" | "capability" | "complianceNote">> = {
  douyin: {
    officialBackendUrl: "https://creator.douyin.com/",
    backendActionLabel: "打开抖音创作者中心",
    defaultMode: "manual_backend",
    capability: {
      status: "future_official_api_candidate",
      label: "未来可接官方 API",
      note: "官方开放平台存在视频创建能力，但需应用、OAuth 与权限资质；默认不自动发布。"
    },
    complianceNote: "当前只生成发布包并打开官方后台；不调用真实发布 API，不保存登录凭据或请求明细。"
  },
  xiaohongshu: {
    officialBackendUrl: "https://creator.xiaohongshu.com/",
    backendActionLabel: "打开小红书创作服务平台",
    defaultMode: "manual_backend",
    capability: {
      status: "manual_backend_only",
      label: "默认人工后台发布",
      note: "未确认面向本场景的一键草稿/发布 API；按官方后台人工提交。"
    },
    complianceNote: "当前只生成发布包并打开官方后台；不采集账号登录材料，不模拟隐藏请求。"
  },
  video_account: {
    officialBackendUrl: "https://channels.weixin.qq.com/",
    backendActionLabel: "打开视频号助手",
    defaultMode: "manual_backend",
    capability: {
      status: "manual_backend_only",
      label: "默认人工后台发布",
      note: "视频号助手以网页登录人工发布为准；不确认草稿箱 API。"
    },
    complianceNote: "当前只生成发布包并打开官方后台；不保存微信登录态或请求明细。"
  },
  bilibili: {
    officialBackendUrl: "https://member.bilibili.com/platform/upload/video/frame",
    backendActionLabel: "打开 B站创作中心投稿",
    defaultMode: "manual_backend",
    capability: {
      status: "future_official_api_candidate",
      label: "未来可接官方 API",
      note: "开放平台能力需身份、应用和权限确认；默认不自动投稿。账号指标仍为 preview-only。"
    },
    complianceNote: "当前只生成发布包并打开官方后台；不调用真实投稿 API，不保存登录凭据或请求明细。"
  }
};

function platformToImportOperationKey(platform: ClosedLoopContentPlatform): PlatformImportOperationPlatform {
  return platform === "video_account" ? "video-account" : platform;
}

function importSourceForClosedLoopPlatform(platform: ClosedLoopContentPlatform): Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center"> {
  if (platform === "douyin") return "douyin_creator_center";
  if (platform === "xiaohongshu") return "xiaohongshu_creator_center";
  if (platform === "video_account") return "video_account_creator_center";
  return "bilibili_creator_center";
}

const postPublishRecoveryGuides: Record<ClosedLoopContentPlatform, Pick<PostPublishRecoveryItem, "recommendedRefreshAction" | "manualRefreshSteps">> = {
  douyin: {
    recommendedRefreshAction: "打开抖音创作者中心，进入作品管理或数据表现，刷新刚发布视频的数据后回到本页预览并保存抖音抓取。",
    manualRefreshSteps: [
      "人工打开抖音创作者中心并完成登录。",
      "进入作品管理或数据表现，找到刚发布的视频。",
      "刷新页面或完成本地安全抓取后，回到本页预览并保存抖音最新数据。"
    ]
  },
  xiaohongshu: {
    recommendedRefreshAction: "打开小红书创作服务平台，查看刚发布笔记的数据，完成本地安全抓取后回到本页预览并保存。",
    manualRefreshSteps: [
      "人工打开小红书创作服务平台并完成登录。",
      "进入笔记管理或数据中心，找到刚发布的笔记。",
      "刷新可见数据或完成本地安全抓取后，回到本页预览并保存小红书最新数据。"
    ]
  },
  video_account: {
    recommendedRefreshAction: "打开视频号助手，进入内容管理，刷新刚发布视频的数据后回到本页预览并保存视频号抓取。",
    manualRefreshSteps: [
      "人工打开视频号助手并完成登录。",
      "进入内容管理，找到刚发布的视频。",
      "刷新可见数据或完成本地安全抓取后，回到本页预览并保存视频号最新数据。"
    ]
  },
  bilibili: {
    recommendedRefreshAction: "打开 B站创作中心，进入稿件管理或数据页，刷新刚发布稿件的内容级数据；账号指标仍只预览不保存。",
    manualRefreshSteps: [
      "人工打开 B站创作中心并完成登录。",
      "进入稿件管理或数据页，找到刚发布的视频。",
      "只回收稿件内容级数据；账号级指标保持 preview-only，不写入内容总量。"
    ]
  }
};

function buildPublishHandoffText(input: { content: ContentItem; version: ContentPlatformVersion }) {
  const tagsText = (input.version.tags ?? []).map((tag) => tag.startsWith("#") ? tag : `#${tag}`).join(" ");
  return [
    `标题：${input.version.title || input.content.title}`,
    "",
    input.version.body,
    "",
    input.version.script ? `脚本/口播：\n${input.version.script}` : undefined,
    input.version.coverNote ? `封面备注：${input.version.coverNote}` : undefined,
    tagsText ? `标签：${tagsText}` : undefined,
    input.version.scheduledAt ? `计划发布时间：${input.version.scheduledAt}` : undefined
  ].filter((line): line is string => Boolean(line)).join("\n");
}

function buildPublishHandoffPackages(input: {
  contents: ContentItem[];
  platformVersions: ContentPlatformVersion[];
  publishRecords: PublishRecord[];
}): PublishHandoffPackage[] {
  const packages: PublishHandoffPackage[] = [];
  for (const version of input.platformVersions) {
    if (!isClosedLoopContentPlatform(version.platform)) continue;
    if (version.status === "published") continue;
    const platform = version.platform;
    const content = input.contents.find((item) => item.id === version.contentId);
    if (!content) continue;
    const latestRecord = [...input.publishRecords]
      .filter((record) => record.platformVersionId === version.id)
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))[0];
    const tagsText = (version.tags ?? []).map((tag) => tag.startsWith("#") ? tag : `#${tag}`).join(" ");
    const meta = publishHandoffBackendMeta[platform];
    packages.push({
      id: `publish-handoff-${version.id}`,
      platformVersionId: version.id,
      contentId: content.id,
      platform,
      contentTitle: content.title,
      versionTitle: version.title,
      scheduledAt: version.scheduledAt,
      status: version.status,
      latestRecordStatus: latestRecord?.status,
      latestRecordAt: latestRecord?.happenedAt,
      officialBackendUrl: meta.officialBackendUrl,
      backendActionLabel: meta.backendActionLabel,
      defaultMode: meta.defaultMode,
      capability: meta.capability,
      copy: {
        publishText: buildPublishHandoffText({ content, version }),
        tagsText,
        coverNote: version.coverNote,
        scheduleText: version.scheduledAt ?? "未排期，请先在日历确认发布时间。"
      },
      statusActions: ["submitted_review", "published", "failed"],
      complianceNote: meta.complianceNote
    });
  }
  return packages.sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "") || creatorPlatformDraftLabels[a.platform].localeCompare(creatorPlatformDraftLabels[b.platform]));
}

function normalizeMatchText(value: string | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function titleSimilarity(left: string | undefined, right: string | undefined) {
  const a = normalizeMatchText(left);
  const b = normalizeMatchText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  const aChars = new Set([...a]);
  const bChars = new Set([...b]);
  const intersection = [...aChars].filter((char) => bChars.has(char)).length;
  const union = new Set([...aChars, ...bChars]).size;
  return union > 0 ? intersection / union : 0;
}

function hoursBetween(left?: string, right?: string) {
  if (!left || !right) return undefined;
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return Math.abs(a - b) / 36e5;
}

function latestMetricAfter(snapshots: MetricSnapshot[], since?: string) {
  const sinceDate = since ? dateOnly(since) : undefined;
  return [...snapshots]
    .filter((snapshot) => !sinceDate || snapshot.snapshotDate >= sinceDate)
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
}

function latestImportRunForSource(imports: ImportRun[], source: ImportSource) {
  return [...imports]
    .filter((run) => run.source === source)
    .sort((a, b) => latestTime(b).localeCompare(latestTime(a)))[0];
}

function isAtOrAfter(value: string | undefined, since: string | undefined) {
  if (!value || !since) return false;
  const valueTime = new Date(value).getTime();
  const sinceTime = new Date(since).getTime();
  return Number.isFinite(valueTime) && Number.isFinite(sinceTime) && valueTime >= sinceTime;
}

function recoveryStatusLabels(status: PostPublishRecoveryItem["matchStatus"]) {
  const labels: Record<PostPublishRecoveryItem["matchStatus"], { match: string; attribution: string; nextAction: string }> = {
    needs_capture: {
      match: "待抓取",
      attribution: "未归因",
      nextAction: "先按平台步骤手动刷新并保存最新抓取。"
    },
    captured_no_candidate: {
      match: "已抓取，暂无候选",
      attribution: "未归因",
      nextAction: "检查平台标题和发布时间；必要时再次保存最新抓取。"
    },
    candidate_ready: {
      match: "已有匹配候选",
      attribution: "待人工确认",
      nextAction: "在候选表确认后，指标才会归因到本地内容。"
    },
    attributed: {
      match: "已归因",
      attribution: "已归因到本地内容",
      nextAction: "指标已回收到本地内容，可回到看板/复盘查看。"
    }
  };
  return labels[status];
}

function buildPlatformContentMatchCandidates(input: {
  contents: ContentItem[];
  platformVersions: ContentPlatformVersion[];
  metricSnapshots: MetricSnapshot[];
  trustedSnapshots: MetricSnapshot[];
  localVersion: ContentPlatformVersion;
  localContent: ContentItem;
}): PlatformContentMatchCandidate[] {
  if (!isClosedLoopContentPlatform(input.localVersion.platform)) return [];
  const importedSnapshotsByContent = new Map<string, MetricSnapshot[]>();
  for (const snapshot of input.trustedSnapshots) {
    if (snapshot.platform !== input.localVersion.platform) continue;
    if (snapshot.contentId === input.localContent.id) continue;
    importedSnapshotsByContent.set(snapshot.contentId, [...(importedSnapshotsByContent.get(snapshot.contentId) ?? []), snapshot]);
  }

  const candidates: PlatformContentMatchCandidate[] = [];
  for (const [importedContentId, snapshots] of importedSnapshotsByContent) {
    const importedContent = input.contents.find((content) => content.id === importedContentId);
    if (!importedContent || importedContent.id === input.localContent.id || importedContent.userExcludedFromTrustedScope) continue;
    const similarity = Math.max(titleSimilarity(input.localVersion.title, importedContent.title), titleSimilarity(input.localContent.title, importedContent.title));
    const timeGap = hoursBetween(importedContent.publishedAt, input.localVersion.publishedAt ?? input.localVersion.scheduledAt ?? input.localContent.publishedAt ?? input.localContent.scheduledAt);
    const timeScore = timeGap === undefined ? 0 : timeGap <= 36 ? 0.25 : timeGap <= 96 ? 0.1 : 0;
    const score = Number(Math.min(1, similarity * 0.75 + timeScore).toFixed(2));
    if (score < 0.45) continue;
    const reasons = [
      `同平台 ${creatorPlatformDraftLabels[input.localVersion.platform]}`,
      similarity >= 0.75 ? "标题高度相近" : "标题部分相近",
      timeGap !== undefined && timeGap <= 96 ? `发布时间窗口约 ${Math.round(timeGap)} 小时` : undefined
    ].filter((item): item is string => Boolean(item));
    candidates.push({
      id: `match-candidate-${input.localVersion.id}-${importedContent.id}`,
      platform: input.localVersion.platform,
      localContentId: input.localContent.id,
      localPlatformVersionId: input.localVersion.id,
      importedContentId: importedContent.id,
      importedTitle: importedContent.title,
      importedPublishedAt: importedContent.publishedAt,
      importRunId: snapshots.find((snapshot) => snapshot.importRunId)?.importRunId,
      metricSnapshotIds: snapshots.map((snapshot) => snapshot.id),
      score,
      reasons,
      status: "candidate"
    });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
}

function buildPublishToMetricsWorkbench(input: {
  generatedAt: string;
  contents: ContentItem[];
  platformVersions: ContentPlatformVersion[];
  queue: PublishQueueItem[];
  publishRecords: PublishRecord[];
  imports: ImportRun[];
  metricSnapshots: MetricSnapshot[];
  trustedSnapshots: MetricSnapshot[];
  now?: Date;
}): PublishToMetricsWorkbench {
  const now = input.now ?? new Date();
  const nowTime = now.getTime();
  const nearDueMs = 36 * 60 * 60 * 1000;
  const executionItems: PublishExecutionItem[] = [];
  const postPublishRefresh: PostPublishRefreshCandidate[] = [];
  const postPublishRecoveryItems: PostPublishRecoveryItem[] = [];
  const allMatchCandidates: PlatformContentMatchCandidate[] = [];

  for (const version of input.platformVersions) {
    if (!isClosedLoopContentPlatform(version.platform)) continue;
    const content = input.contents.find((item) => item.id === version.contentId);
    if (!content) continue;
    const queueItem = input.queue.find((item) => item.contentId === version.contentId && item.platform === version.platform);
    const latestRecord = [...input.publishRecords]
      .filter((record) => record.platformVersionId === version.id)
      .sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))[0];
    const scheduledAt = version.scheduledAt ?? queueItem?.scheduledAt;
    const scheduledTime = scheduledAt ? new Date(scheduledAt).getTime() : undefined;
    const minutesUntilDue = scheduledTime === undefined ? undefined : Math.round((scheduledTime - nowTime) / 60000);
    const ownSnapshots = input.trustedSnapshots.filter((snapshot) => snapshot.contentId === version.contentId && snapshot.platformVersionId === version.id);
    const latestOwnSnapshot = latestMetricAfter(ownSnapshots, version.publishedAt);
    const isManuallyConfirmedPublish = Boolean(latestRecord);
    const publishedWaitingMetrics = version.status === "published" && isManuallyConfirmedPublish && !latestOwnSnapshot;
    const publishedForRecovery = version.status === "published" && isManuallyConfirmedPublish;
    const dueSoon = version.status === "scheduled" && scheduledTime !== undefined && scheduledTime <= nowTime + nearDueMs;
    const blockedOrFailed = version.status === "failed" || version.status === "blocked";
    if (!dueSoon && !publishedWaitingMetrics && !blockedOrFailed && !publishedForRecovery) continue;

    let timing: PublishExecutionItem["timing"] = "upcoming";
    if (blockedOrFailed) timing = "blocked_or_failed";
    else if (publishedWaitingMetrics) timing = "published_waiting_metrics";
    else if (scheduledTime !== undefined && scheduledTime < nowTime) timing = "overdue";
    else if (scheduledTime !== undefined && new Date(scheduledTime).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)) timing = "due_today";

    const nextAction = latestRecord?.status === "submitted_review"
      ? "已提交官方后台审核；等待平台审核结果，回来确认已发布或记录失败。"
      : latestRecord?.status === "failed"
        ? "发布失败已记录；回到内容草稿处理原因后重新排期。"
        : publishedWaitingMetrics
      ? "已人工确认发布；下一步去 /import 手动抓取最新数据，再人工匹配回本地内容。"
      : blockedOrFailed
        ? "处理失败/阻塞原因后回到草稿或重新排期。"
        : "到点后人工发布，发布完成再点击已发布确认。";
    if (dueSoon || publishedWaitingMetrics || blockedOrFailed) {
      executionItems.push({
        platformVersionId: version.id,
        contentId: content.id,
        queueId: queueItem?.id,
        platform: version.platform,
        contentTitle: content.title,
        versionTitle: version.title,
        scheduledAt,
        publishedAt: version.publishedAt,
        status: version.status,
        queueStatus: queueItem?.status,
        timing,
        minutesUntilDue,
        nextAction,
        needsManualRefresh: publishedWaitingMetrics,
        publishRecordId: latestRecord?.id,
        contentUrl: `/content?contentId=${encodeURIComponent(content.id)}&versionId=${encodeURIComponent(version.id)}`,
        calendarUrl: `/calendar?versionId=${encodeURIComponent(version.id)}`
      });
    }

    if (publishedForRecovery) {
      const matchCandidates = buildPlatformContentMatchCandidates({
        contents: input.contents,
        platformVersions: input.platformVersions,
        metricSnapshots: input.metricSnapshots,
        trustedSnapshots: input.trustedSnapshots,
        localVersion: version,
        localContent: content
      });
      if (!latestOwnSnapshot) allMatchCandidates.push(...matchCandidates);
      const latestImport = latestImportRunForSource(input.imports, importSourceForClosedLoopPlatform(version.platform));
      const latestImportAt = latestImport ? latestTime(latestImport) : undefined;
      const recentlyCaptured = Boolean(latestImport && latestImport.status === "success" && (isAtOrAfter(latestImportAt, version.publishedAt) || matchCandidates.length > 0));
      const matchStatus: PostPublishRecoveryItem["matchStatus"] = latestOwnSnapshot
        ? "attributed"
        : matchCandidates.length > 0
          ? "candidate_ready"
          : recentlyCaptured
            ? "captured_no_candidate"
            : "needs_capture";
      const labels = recoveryStatusLabels(matchStatus);
      const guide = postPublishRecoveryGuides[version.platform];
      postPublishRecoveryItems.push({
        id: `post-publish-recovery-${version.id}`,
        platform: version.platform,
        importPlatformKey: platformToImportOperationKey(version.platform),
        contentId: content.id,
        platformVersionId: version.id,
        contentTitle: content.title,
        versionTitle: version.title,
        publishedAt: version.publishedAt,
        scheduledAt,
        officialBackendUrl: publishHandoffBackendMeta[version.platform].officialBackendUrl,
        backendActionLabel: publishHandoffBackendMeta[version.platform].backendActionLabel,
        recommendedRefreshAction: guide.recommendedRefreshAction,
        manualRefreshSteps: guide.manualRefreshSteps,
        latestImportRunId: latestImport?.id,
        latestImportAt,
        latestImportStatus: latestImport?.status ?? "never",
        recentlyCaptured,
        matchStatus,
        matchStatusLabel: labels.match,
        attributionStatusLabel: labels.attribution,
        metricSnapshotCount: ownSnapshots.length,
        latestMetricSnapshotAt: latestOwnSnapshot ? dateToIso(latestOwnSnapshot.snapshotDate) : undefined,
        matchCandidateCount: matchCandidates.length,
        bestCandidateScore: matchCandidates[0]?.score,
        nextAction: labels.nextAction
      });
      if (publishedWaitingMetrics) {
        postPublishRefresh.push({
          id: `post-publish-refresh-${version.id}`,
          platform: version.platform,
          importPlatformKey: platformToImportOperationKey(version.platform),
          contentId: content.id,
          platformVersionId: version.id,
          contentTitle: content.title,
          versionTitle: version.title,
          publishedAt: version.publishedAt,
          scheduledAt,
          latestMetricSnapshotAt: undefined,
          latestImportRunId: latestImport?.id,
          nextAction: labels.nextAction,
          manualRefreshCopy: "这是本地手动抓取/同步，不是平台自动回调；匹配前不会把新内容指标自动归入本地草稿。",
          matchCandidates
        });
      }
    }
  }

  return {
    generatedAt: input.generatedAt,
    publishHandoffPackages: buildPublishHandoffPackages({
      contents: input.contents,
      platformVersions: input.platformVersions,
      publishRecords: input.publishRecords
    }),
    executionItems: executionItems.sort((a, b) => (a.scheduledAt ?? a.publishedAt ?? "").localeCompare(b.scheduledAt ?? b.publishedAt ?? "")),
    postPublishRefresh: postPublishRefresh.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    postPublishRecoveryItems: postPublishRecoveryItems.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    matchCandidates: allMatchCandidates.sort((a, b) => b.score - a.score),
    manualRefreshCopy: "发布确认后请到 /import 手动预览/保存四平台最新本地抓取；系统不会调用真实发布 API，也不会等待平台自动回调。",
    scheduledRefresh: {
      nextSuggestedAt: new Date(nowTime + 2 * 60 * 60 * 1000).toISOString(),
      command: "npm run check:local-server-health -- --ports=3200 --strict --require-trusted-data --check-page",
      boundary: "第一版只显示本地计划说明和状态；不做后台 daemon，不静默自动登录，不保存敏感登录材料或原始请求明细。"
    }
  };
}

function envValue(name: string) {
  return process.env[name]?.trim();
}

function createWechatOfficialProviderFromEnv() {
  const appId = envValue("WECHAT_APP_ID");
  const appSecret = envValue("WECHAT_APP_SECRET");
  const accountId = envValue("WECHAT_OFFICIAL_ACCOUNT_ID");
  if (!appId || !appSecret || appSecret.includes("ROTATE")) throw new Error("WECHAT_APP_ID and WECHAT_APP_SECRET must be set in .env.local.");
  return new WechatOfficialProvider({ appId, appSecret, accountId });
}

function statusFromContent(content: ContentItem): PlatformVersionStatus {
  if (content.status === "published" || content.publishedAt) return "published";
  if (content.status === "scheduled" || content.scheduledAt) return "scheduled";
  return "draft";
}

function latestTime(run: { finishedAt?: string; startedAt: string }) {
  return run.finishedAt ?? run.startedAt;
}

const operationHistorySensitivePatterns = [
  /(cookie|token|password|authorization|headers?|secret|session|auth)=([^&\s]+)/gi,
  /cookie/gi,
  /token/gi,
  /password/gi,
  /authorization/gi,
  /headers?/gi,
  /raw\s*payload/gi,
  /captures?/gi,
  /SESSDATA/gi,
  /bili_jct/gi,
  /(secret|session|auth)=([^&\s]+)/gi
];

function sanitizeOperationWarning(value: string) {
  let text = value.replace(/\s+/g, " ").trim();
  for (const pattern of operationHistorySensitivePatterns) text = text.replace(pattern, "[redacted]");
  return text.slice(0, 140);
}

function operationHistoryStatus(summary: PlatformImportOperationSummary): OperationHistory["status"] {
  if (summary.passed) return "success";
  const text = [summary.errorMessage, ...summary.warnings].filter(Boolean).join(" ");
  return /暂未开放|待保存|禁用|(?:^|\s)disabled(?:$|\s)/i.test(text) ? "disabled" : "failed";
}

function mergeProvenance(base?: ImportProvenanceMetadata, override?: ImportProvenanceMetadata) {
  const provenance = { ...(base ?? {}), ...(override ?? {}) };
  return Object.keys(provenance).length > 0 ? provenance : undefined;
}

export class SelfMediaService {
  constructor(
    private readonly repo = new SqliteSelfMediaRepo(),
    private readonly fakeProvider = new FakeSelfMediaProvider(),
    private readonly manualProvider = new ManualImportProvider(),
    private readonly csvPresetProvider = new CsvPresetProvider(),
    private readonly mediaCrawlerProvider = new MediaCrawlerImportProvider(),
    private readonly n8nProvider = new N8nExecutionProvider(),
    private readonly douyinPersonalProvider = new DouyinPersonalProvider(),
    private readonly xiaohongshuPersonalProvider = new XiaohongshuPersonalProvider(),
    private readonly videoAccountPersonalProvider = new VideoAccountPersonalProvider(),
    private readonly bilibiliPersonalProvider = new BilibiliPersonalProvider()
  ) {}

  private backfillContentDataDomains() {
    const snapshots = this.repo.listMetricSnapshots();
    const snapshotsByContentId = new Map<string, MetricSnapshot[]>();
    for (const snapshot of snapshots) {
      snapshotsByContentId.set(snapshot.contentId, [...(snapshotsByContentId.get(snapshot.contentId) ?? []), snapshot]);
    }

    const updatedContentById = new Map<string, ContentItem>();
    for (const content of this.repo.listContents()) {
      const relatedSnapshots = snapshotsByContentId.get(content.id) ?? [];
      const classification = classifyContentDataDomain({ content, snapshots: relatedSnapshots });
      const existingIsContradicted = content.dataDomain === "user_work" && classification.dataDomain !== "user_work";
      const promotedToUserWork = content.dataDomain !== "user_work" && classification.dataDomain === "user_work";
      const needsUpdate =
        !content.dataDomain ||
        existingIsContradicted ||
        promotedToUserWork ||
        (classification.acceptanceRunId && content.acceptanceRunId !== classification.acceptanceRunId);
      if (!needsUpdate) {
        updatedContentById.set(content.id, content);
        continue;
      }
      const updated: ContentItem = {
        ...content,
        dataDomain: classification.dataDomain,
        dataDomainUpdatedAt: new Date().toISOString(),
        dataDomainReason: classification.reason,
        acceptanceRunId: classification.acceptanceRunId ?? content.acceptanceRunId
      };
      this.repo.upsertEntity("contents", updated.id, updated);
      updatedContentById.set(updated.id, updated);
    }

    for (const snapshot of snapshots) {
      const content = updatedContentById.get(snapshot.contentId);
      const dataDomain: MetricSnapshot["dataDomain"] =
        content?.dataDomain === "user_work" ? "user_work" :
        content?.dataDomain === "acceptance_run" ? "acceptance_run" :
        content?.dataDomain === "demo_seed" ? "demo_seed" :
        "imported_metric";
      if (snapshot.dataDomain === dataDomain) continue;
      this.repo.upsertEntity("metricSnapshots", snapshot.id, { ...snapshot, dataDomain, updatedAt: new Date().toISOString() });
    }

    for (const run of this.repo.listImports()) {
      const dataDomain: ImportRun["dataDomain"] =
        run.provenance?.dataDomain === "acceptance_run" ? "acceptance_run" :
        run.provenance?.dataDomain === "demo_seed" || run.provenance?.isTestFixture ? "demo_seed" :
        isTrustedRealCreatorCenterSource(run.source) ? "user_work" :
        "imported_metric";
      if (run.dataDomain === dataDomain) continue;
      this.repo.recordImport({ ...run, dataDomain });
    }
  }

  recordPlatformOperationHistory(action: PlatformImportOperationAction, summary: PlatformImportOperationSummary) {
    const warnings = [summary.errorMessage, ...summary.warnings].filter((item): item is string => Boolean(item)).map(sanitizeOperationWarning).filter(Boolean);
    const history: OperationHistory = {
      id: `operation-history-${summary.runId}-${summary.platform}-${action}`,
      actor: "local_user",
      action,
      platform: summary.platform,
      source: summary.source,
      status: operationHistoryStatus(summary),
      contentCount: summary.contentCount,
      metricCount: summary.metricCount,
      warningCount: warnings.length,
      warningSummary: warnings.slice(0, 2).join(" / "),
      runId: summary.runId,
      provenance: summary.provenance,
      createdAt: new Date().toISOString(),
      dataDomain: "system_log"
    };
    this.repo.upsertEntity("operationHistory", history.id, history);
    writeLog(this.repo, {
      level: history.status === "success" ? "info" : "warn",
      event: "self_media.platform_operation_history",
      scope: "audit",
      message: `${history.platform} ${history.action} ${history.status}.`,
      traceId: history.runId,
      data: { id: history.id, platform: history.platform, action: history.action, status: history.status }
    });
    return history;
  }

  listOperationHistory(limit = 12) {
    return this.repo
      .listEntities<OperationHistory>("operationHistory")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async ensureSeedData() {
    if (!shouldSeedSelfMediaDemoData()) return;
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

  async syncWechatOfficialAnalytics(input: WechatOfficialSyncRequest, provider = createWechatOfficialProviderFromEnv()): Promise<WechatOfficialSyncResult> {
    const traceId = createTraceId("wechat-sync");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.beginDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) throw new Error("公众号同步日期必须是 YYYY-MM-DD。");
    try {
      const token = await provider.getAccessToken();
      const articleRows = await provider.getArticleSummary(token.accessToken, input.beginDate, input.endDate);
      let userRows: WechatUserSummaryRow[] = [];
      const warnings: string[] = [];
      try {
        userRows = await provider.getUserSummary(token.accessToken, input.beginDate, input.endDate);
      } catch (error) {
        warnings.push(`wechat_official:getusersummary skipped: ${error instanceof Error ? error.message : String(error)}`);
      }
      const payload = this.wechatRowsToPayload(articleRows, userRows, input.accountId ?? envValue("WECHAT_OFFICIAL_ACCOUNT_ID"), warnings);
      const importResult = this.importPayload(payload);
      writeLog(this.repo, {
        level: "info",
        event: "self_media.wechat_official_sync",
        scope: "provider",
        message: `Synced ${articleRows.length} WeChat article rows and ${userRows.length} user rows.`,
        traceId,
        data: {
          beginDate: input.beginDate,
          endDate: input.endDate,
          articleRows: articleRows.length,
          userRows: userRows.length,
          userNetNew: userRows.reduce((sum, row) => sum + (row.new_user ?? 0) - (row.cancel_user ?? 0), 0)
        }
      });
      return {
        importResult,
        articleRows: articleRows.length,
        userRows: userRows.length,
        contentIds: payload.contents.map((item) => item.id),
        snapshotIds: payload.metrics.map((item) => snapshotId(`version-${item.contentId}-${item.platform}`, dateOnly(item.capturedAt))),
        traceId,
        warnings: payload.warnings ?? []
      };
    } catch (error) {
      const workbenchError = createWorkbenchError("provider", "WeChat official account sync failed.", traceId, error);
      const run = {
        id: `import-failed-wechat-${Date.now()}`,
        source: "wechat_official" as const,
        status: "failed" as const,
        importedCount: 0,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage: workbenchError.cause ?? workbenchError.message,
        traceId,
        warnings: ["wechat_official"]
      };
      this.repo.recordImport(run);
      writeLog(this.repo, { level: "error", event: "self_media.wechat_official_sync_failed", scope: "provider", message: run.errorMessage ?? workbenchError.message, traceId, data: workbenchError });
      return { importResult: { run, traceId }, articleRows: 0, userRows: 0, contentIds: [], snapshotIds: [], traceId, warnings: run.warnings };
    }
  }

  private wechatRowsToPayload(articleRows: WechatArticleSummaryRow[], userRows: WechatUserSummaryRow[], accountId?: string, extraWarnings: string[] = []): ProviderImportPayload {
    const accountSuffix = accountId ? stableHash(accountId) : "default";
    const contentIds = new Set<string>();
    const contents: ContentItem[] = [];
    const metrics = articleRows.map((row, index) => {
      const rowKey = row.msgid ? String(row.msgid) : `${row.ref_date}:${row.title ?? "untitled"}:${index}`;
      let contentId = `wechat-article-${accountSuffix}-${stableHash(rowKey)}`;
      while (contentIds.has(contentId)) contentId = `wechat-article-${accountSuffix}-${stableHash(`${rowKey}:${contentIds.size}`)}`;
      contentIds.add(contentId);
      const title = row.title?.trim() || `公众号图文 ${row.ref_date}`;
      contents.push({
        id: contentId,
        title,
        platform: "wechat",
        status: "published",
        format: "article",
        topic: title,
        publishedAt: dateToIso(row.ref_date),
        notes: `wechat_official:${row.msgid ?? "no-msgid"}`
      });
      return {
        id: `metric-${contentId}-${row.ref_date}`,
        contentId,
        platform: "wechat" as const,
        capturedAt: dateToIso(row.ref_date),
        views: row.int_page_read_count ?? row.ori_page_read_count ?? 0,
        likes: 0,
        comments: 0,
        saves: row.add_to_fav_count ?? row.add_to_fav_user ?? 0,
        shares: row.share_count ?? row.share_user ?? 0,
        followersDelta: 0
      };
    });
    const warnings = [
      "wechat_official: article summary maps reads/shares/favorites; likes/comments require other source or browser collector.",
      `wechat_official: user summary rows=${userRows.length}, netNew=${userRows.reduce((sum, row) => sum + (row.new_user ?? 0) - (row.cancel_user ?? 0), 0)}`
    ].concat(extraWarnings);
    return { source: "wechat_official", contents, metrics, warnings };
  }

  importPayload(payload: ProviderImportPayload, provenanceOverride?: ImportProvenanceMetadata) {
    const traceId = createTraceId("import");
    const provenance = mergeProvenance(payload.provenance, provenanceOverride);
    const taggedContents = payload.contents.map((content): ContentItem => {
      const classification = classifyContentDataDomain({ content, source: payload.source, provenance });
      return {
        ...content,
        dataDomain: content.dataDomain ?? classification.dataDomain,
        dataDomainUpdatedAt: content.dataDomainUpdatedAt ?? new Date().toISOString(),
        dataDomainReason: content.dataDomainReason ?? classification.reason,
        acceptanceRunId: content.acceptanceRunId ?? classification.acceptanceRunId
      };
    });
    const payloadWithProvenance = { ...payload, contents: taggedContents, provenance };
    const run = this.repo.savePayload(payloadWithProvenance);
    for (const content of taggedContents) {
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
        const baseSnapshotId = snapshotId(versionId, dateOnly(metric.capturedAt));
        const snapshot: MetricSnapshot = {
          id: provenance?.isTestFixture ? `${baseSnapshotId}-fixture` : baseSnapshotId,
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
          provenance,
          dataDomain: this.repo.getEntity<ContentItem>("contents", metric.contentId)?.dataDomain === "user_work" ? "user_work" : this.repo.getEntity<ContentItem>("contents", metric.contentId)?.dataDomain === "acceptance_run" ? "acceptance_run" : this.repo.getEntity<ContentItem>("contents", metric.contentId)?.dataDomain === "demo_seed" ? "demo_seed" : "imported_metric",
          updatedAt: new Date().toISOString()
        };
        this.repo.upsertEntity("metricSnapshots", snapshot.id, snapshot);
      }
    }
    run.traceId = traceId;
    run.dataDomain =
      provenance?.dataDomain === "acceptance_run" ? "acceptance_run" :
      provenance?.dataDomain === "demo_seed" || provenance?.isTestFixture ? "demo_seed" :
      isTrustedRealCreatorCenterSource(payload.source) ? "user_work" :
      "imported_metric";
    this.repo.recordImport(run);
    writeLog(this.repo, {
      level: "info",
      event: "self_media.import",
      scope: "provider",
      message: `Imported ${run.importedCount} records from ${payload.source}.`,
      traceId,
      data: { source: payload.source, importedCount: run.importedCount, provenance }
    });
    return { run, traceId } satisfies ImportResult;
  }

  updateContentTrustedScope(input: ContentTrustScopePatchRequest) {
    const traceId = createTraceId("content-trust");
    const content = this.repo.getEntity<ContentItem>("contents", input.contentId);
    if (!content) throw new Error(`找不到内容：${input.contentId}`);
    const updated: ContentItem = {
      ...content,
      userExcludedFromTrustedScope: input.userExcludedFromTrustedScope,
      trustedScopeOverride: input.userExcludedFromTrustedScope ? "exclude" : undefined,
      trustedScopeUpdatedAt: new Date().toISOString(),
      trustedScopeUpdatedBy: input.actor ?? "local_user"
    };
    this.repo.upsertEntity("contents", updated.id, updated);
    writeLog(this.repo, {
      level: "info",
      event: "self_media.content_trust_scope_updated",
      scope: "service",
      message: `Content ${updated.id} trusted scope updated.`,
      traceId,
      data: {
        id: updated.id,
        platform: updated.platform,
        userExcludedFromTrustedScope: updated.userExcludedFromTrustedScope,
        trustedScopeOverride: updated.trustedScopeOverride
      }
    });
    return { content: updated, traceId };
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

  parseCsvRequestPayload(request: ImportRequest, options: { allowInvalidPreviewRows?: boolean } = {}) {
    const preset = request.preset ?? "generic";
    const fileRequest = request as ImportRequest & { fileBase64?: string; fileContentBase64?: string; fileName?: string; contentType?: string };
    const base64 = fileRequest.fileBase64 ?? fileRequest.fileContentBase64;
    const fileName = fileRequest.fileName ?? "";
    const contentType = fileRequest.contentType ?? "";
    if (base64 && (fileName.toLowerCase().endsWith(".xlsx") || contentType.includes("spreadsheetml"))) {
      return this.csvPresetProvider.fromXlsxBase64(base64, preset, options);
    }
    return this.csvPresetProvider.fromCsv(request.csv ?? "", preset, options);
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

  parseDouyinPersonalCaptures(input: unknown) {
    return this.douyinPersonalProvider.fromCaptures(Array.isArray(input) ? input : []);
  }

  importDouyinPersonalCaptures(input: unknown, provenance?: ImportProvenanceMetadata) {
    return this.importPayload(this.parseDouyinPersonalCaptures(input), provenance);
  }

  parseXiaohongshuPersonalCaptures(input: unknown) {
    return this.xiaohongshuPersonalProvider.fromCaptures(Array.isArray(input) ? input : []);
  }

  importXiaohongshuPersonalCaptures(input: unknown, provenance?: ImportProvenanceMetadata) {
    return this.importPayload(this.parseXiaohongshuPersonalCaptures(input), provenance);
  }

  parseVideoAccountPersonalCaptures(input: unknown) {
    return this.videoAccountPersonalProvider.fromCaptures(Array.isArray(input) ? input : []);
  }

  importVideoAccountPersonalCaptures(input: unknown, provenance?: ImportProvenanceMetadata) {
    return this.importPayload(this.parseVideoAccountPersonalCaptures(input), provenance);
  }

  parseBilibiliPersonalCaptures(input: unknown) {
    return this.bilibiliPersonalProvider.fromCaptures(Array.isArray(input) ? input : []);
  }

  importBilibiliPersonalCaptures(input: unknown, provenance?: ImportProvenanceMetadata): ImportResult {
    return this.importPayload(this.parseBilibiliPersonalCaptures(input), provenance);
  }

  platformImportStatuses(): PlatformImportStatus[] {
    const imports = this.repo.listImports();
    const metricSnapshots = this.repo.listMetricSnapshots();
    return platformImportStatusDefinitions.map((definition) => {
      const latestRun = imports
        .filter((run) => run.source === definition.source)
        .sort((a, b) => latestTime(b).localeCompare(latestTime(a)))[0];
      const runSnapshots = latestRun ? metricSnapshots.filter((snapshot) => snapshot.importRunId === latestRun.id && snapshot.source === definition.source) : [];
      const contentIds = new Set(runSnapshots.map((snapshot) => snapshot.contentId));
      const lastMessage = latestRun?.errorMessage ?? latestRun?.warnings?.[0];
      return {
        ...definition,
        latestRunId: latestRun?.id,
        latestRunAt: latestRun ? latestTime(latestRun) : undefined,
        latestSource: latestRun?.source,
        latestStatus: latestRun?.status ?? "never",
        importedCount: latestRun?.importedCount ?? 0,
        contentCount: contentIds.size,
        metricCount: runSnapshots.length,
        enteredDashboardReview: runSnapshots.length > 0,
        lastMessage
      };
    });
  }

  platformReadinessStatuses(): PlatformReadinessStatus[] {
    const imports = this.repo.listImports();
    const metricSnapshots = this.repo.listMetricSnapshots();
    const importStatusBySource = new Map<string, PlatformImportStatus>(this.platformImportStatuses().map((status) => [status.source, status]));
    return platformReadinessDefinitions.map((definition) => {
      const latestRun = definition.source
        ? imports
          .filter((run) => run.source === definition.source)
          .sort((a, b) => latestTime(b).localeCompare(latestTime(a)))[0]
        : undefined;
      const runSnapshots = latestRun && definition.source ? metricSnapshots.filter((snapshot) => snapshot.importRunId === latestRun.id && snapshot.source === definition.source) : [];
      const contentIds = new Set(runSnapshots.map((snapshot) => snapshot.contentId));
      const importStatus = definition.source ? importStatusBySource.get(definition.source) : undefined;
      return {
        ...definition,
        stageLabel: platformReadinessStageLabels[definition.stage],
        latestRunAt: importStatus?.latestRunAt ?? (latestRun ? latestTime(latestRun) : undefined),
        latestStatus: importStatus?.latestStatus ?? latestRun?.status ?? "never",
        contentCount: importStatus?.contentCount ?? contentIds.size,
        metricCount: importStatus?.metricCount ?? runSnapshots.length,
        enteredDashboardReview: importStatus?.enteredDashboardReview ?? (definition.stage !== "paused" && runSnapshots.length > 0)
      };
    });
  }

  previewImportRequest(request: ImportRequest): ImportPreviewResult {
    const traceId = createTraceId("preview");
    const payload = createPreviewPayloadFromRequest(this, request);
    const realPreviewRows = getCsvPresetPreviewRows(payload);
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
    const result = {
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
    } satisfies ImportPreviewResult;
    return realPreviewRows.length > 0 ? ({ ...result, realPreviewRows } as ImportPreviewResult) : result;
  }

  importRequest(request: ImportRequest): ImportResult {
    const traceId = createTraceId("import-request");
    try {
      if (request.mode === "csv") return this.importPayload(this.parseCsvRequestPayload(request));
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
      notes: idea.rationale,
      workOwnership: "user_owned_work"
    };
    const classification = classifyContentDataDomain({ content, extraText: [idea.id, idea.source, idea.rationale] });
    content.dataDomain = classification.dataDomain;
    content.dataDomainUpdatedAt = new Date().toISOString();
    content.dataDomainReason = classification.reason;
    content.acceptanceRunId = classification.acceptanceRunId;
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

  createCreatorVideoDiscussion(input: CreatorVideoDiscussionRequest): CreatorVideoDiscussionResult {
    return buildCreatorVideoDiscussion(input);
  }

  createCreatorVideoDraft(input: CreatorVideoIdeaRequest): CreatorVideoDraftResult {
    const traceId = createTraceId("creator-video");
    const normalized = normalizeCreatorIdeaInput(input);
    const drafts = buildCreatorPlatformDrafts(normalized);
    const now = new Date().toISOString();
    const contentId = `content-creator-${stableHash(`${normalized.title}|${normalized.topic}|${normalized.brief}|${Date.now()}`)}`;
    const scheduledAt = normalized.scheduledAt;
    const status: PlatformVersionStatus = scheduledAt ? "scheduled" : "needs_review";
    const baseContent: ContentItem = {
      id: contentId,
      title: normalized.title,
      platform: "douyin",
      status: scheduledAt ? "scheduled" : "draft",
      format: "short_video",
      topic: normalized.topic,
      scheduledAt,
      workOwnership: "user_owned_work",
      acceptanceRunId: normalized.acceptanceRunId,
      notes: compactLines([
        "creator_draft:local_rule_v1",
        normalized.copilotAnalysis,
        normalized.acceptanceRunId ? `acceptanceRunId:${normalized.acceptanceRunId}` : undefined,
        normalized.brief,
        normalized.revisionPrompt ? `revisionPrompt:${normalized.revisionPrompt}` : undefined,
        normalized.scriptNotes ? `scriptNotes:${normalized.scriptNotes}` : undefined,
        normalized.materialNotes ? `materialNotes:${normalized.materialNotes}` : undefined,
        "平台激励/创作标签为本地建议，发布前需人工确认。"
      ]).join("\n")
    };
    const classification = classifyContentDataDomain({ content: { ...baseContent, dataDomain: normalized.dataDomain } });
    const content: ContentItem = {
      ...baseContent,
      workOwnership: classification.dataDomain === "user_work" ? "user_owned_work" : undefined,
      dataDomain: classification.dataDomain,
      dataDomainUpdatedAt: now,
      dataDomainReason: classification.reason,
      acceptanceRunId: classification.acceptanceRunId ?? normalized.acceptanceRunId
    };
    this.repo.upsertEntity("contents", content.id, content);

    const platformVersions: ContentPlatformVersion[] = [];
    const queueItems: PublishQueueItem[] = [];
    for (const draft of drafts) {
      const queue: PublishQueueItem = {
        id: `queue-${content.id}-${draft.platform}`,
        contentId: content.id,
        platform: draft.platform,
        status: scheduledAt ? "scheduled" : "needs_review",
        scheduledAt: scheduledAt ?? defaultActionScheduleAt(),
        nextAction: scheduledAt ? "按排期做人工发布前检查；不会自动发布。" : "确认脚本、封面和平台标签后再进入日历排期。",
        updatedAt: now
      };
      this.repo.upsertEntity("queue", queue.id, queue);
      const version = this.upsertPlatformVersion({
        contentId: content.id,
        platform: draft.platform,
        title: draft.title,
        body: draft.body,
        script: normalized.scriptNotes,
        coverNote: draft.coverNote,
        tags: draft.tags,
        platformAdvice: draft.platformAdvice,
        scheduledAt,
        status,
        nextAction: queue.nextAction,
        checklist: { title: true, platformFit: true, script: Boolean(normalized.scriptNotes), cover: Boolean(normalized.materialNotes), humanConfirmed: false }
      }).version;
      platformVersions.push(version);
      queueItems.push(queue);
    }
    writeLog(this.repo, {
      level: "info",
      event: "self_media.creator_video_draft_created",
      scope: "service",
      message: `Created creator video draft ${content.id} with four platform versions.`,
      traceId,
      data: { contentId: content.id, platformVersionCount: platformVersions.length, scheduledAt }
    });
    return { content, platformVersions, queueItems, drafts, traceId };
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

  private workflowQueueForVersion(version: ContentPlatformVersion, queueId?: string) {
    return (queueId ? this.repo.getEntity<PublishQueueItem>("queue", queueId) : undefined) ??
      this.repo.listQueue().find((item) => item.contentId === version.contentId && item.platform === version.platform);
  }

  private workflowActionForVersion(version: ContentPlatformVersion, queueId?: string) {
    return this.repo.listActionItems().find((item) => item.platformVersionId === version.id || item.publishQueueItemId === queueId);
  }

  private syncWorkflowRecordsFromVersion(version: ContentPlatformVersion, options: { title?: string; topic?: string; queueId?: string; nextAction?: string } = {}) {
    const content = this.repo.getEntity<ContentItem>("contents", version.contentId);
    const now = new Date().toISOString();
    const queue = this.workflowQueueForVersion(version, options.queueId);
    const actionItem = this.workflowActionForVersion(version, queue?.id ?? options.queueId);
    const contentStatus = contentStatusFromPlatformVersion(version.status);
    const updatedContent = content ? {
      ...content,
      title: options.title ?? version.title ?? content.title,
      topic: options.topic ?? content.topic,
      status: contentStatus,
      scheduledAt: version.scheduledAt ?? content.scheduledAt,
      publishedAt: version.status === "published" ? version.publishedAt ?? content.publishedAt : content.publishedAt
    } : undefined;
    if (updatedContent) this.repo.upsertEntity("contents", updatedContent.id, updatedContent);

    const updatedQueue = queue ? {
      ...queue,
      status: queueStatusFromPlatformVersion(version.status),
      scheduledAt: version.scheduledAt ?? queue.scheduledAt,
      failureReason: version.failureReason ?? queue.failureReason,
      nextAction: options.nextAction ?? version.nextAction ?? queue.nextAction,
      updatedAt: now
    } : undefined;
    if (updatedQueue) this.repo.upsertEntity("queue", updatedQueue.id, updatedQueue);

    const updatedAction = actionItem ? {
      ...actionItem,
      contentWorkflowStatus: version.status === "scheduled" ? "scheduled" as const : "draft_created" as const,
      contentWorkflowUpdatedAt: now,
      nextAction: options.nextAction ?? version.nextAction ?? actionItem.nextAction,
      updatedAt: now
    } : undefined;
    if (updatedAction) this.repo.upsertEntity("actionItems", updatedAction.id, updatedAction);
    return { content: updatedContent, queue: updatedQueue, actionItem: updatedAction };
  }

  upsertPlatformVersion(input: ContentPlatformVersionRequest) {
    const traceId = createTraceId("version");
    const existing =
      (input.id ? this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.id) : undefined) ??
      this.repo.listPlatformVersions().find((item) => item.contentId === input.contentId && item.platform === input.platform);
    const now = new Date().toISOString();
    const version: ContentPlatformVersion = {
      id: input.id ?? existing?.id ?? `version-${input.contentId}-${input.platform}`,
      contentId: input.contentId,
      platform: input.platform,
      title: input.title,
      body: input.body ?? existing?.body ?? "",
      script: input.script ?? existing?.script ?? "",
      coverNote: input.coverNote ?? existing?.coverNote ?? "",
      tags: input.tags ?? existing?.tags,
      platformAdvice: input.platformAdvice ?? existing?.platformAdvice,
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

  reviewContentDraft(input: ContentDraftReviewRequest): ContentDraftReviewResult {
    const traceId = createTraceId("content-review");
    const content = this.repo.getEntity<ContentItem>("contents", input.contentId);
    if (!content) throw new Error(`找不到内容草稿：${input.contentId}`);
    const version =
      (input.platformVersionId ? this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.platformVersionId) : undefined) ??
      this.repo.listPlatformVersions().find((item) => item.contentId === content.id && item.platform === content.platform);
    if (!version) throw new Error(`找不到内容草稿的平台版本：${content.id}`);
    if (input.status === "published" || input.status === "failed") throw new Error("发布成功/失败必须走人工发布确认，不通过草稿审核直接改写。");
    if (version.status === "published" && input.status) throw new Error("已发布版本不能通过草稿审核退回，请创建新版本或记录复盘动作。");
    const nextStatus = input.status ?? version.status;
    const title = input.title?.trim() || content.title;
    const nextAction = input.nextAction?.trim() || version.nextAction;
    const updatedVersion: ContentPlatformVersion = {
      ...version,
      title,
      body: input.body ?? version.body,
      status: nextStatus,
      scheduledAt: input.scheduledAt ?? version.scheduledAt,
      nextAction,
      checklist: { ...version.checklist, ...(input.checklist ?? {}) },
      updatedAt: new Date().toISOString()
    };
    this.repo.upsertEntity("platformVersions", updatedVersion.id, updatedVersion);
    const synced = this.syncWorkflowRecordsFromVersion(updatedVersion, { title, topic: input.topic, queueId: input.publishQueueItemId, nextAction });
    const updatedContent = synced.content ?? content;
    writeLog(this.repo, {
      level: "info",
      event: "self_media.content_draft_reviewed",
      scope: "service",
      message: `Reviewed content draft ${updatedContent.id} and platform version ${updatedVersion.id}.`,
      traceId,
      data: { contentId: updatedContent.id, platformVersionId: updatedVersion.id, queueId: synced.queue?.id, status: updatedVersion.status }
    });
    return { content: updatedContent, platformVersion: updatedVersion, queue: synced.queue, actionItem: synced.actionItem, traceId };
  }

  patchPlatformVersion(input: PlatformVersionPatchRequest) {
    const traceId = createTraceId("version-status");
    const version = this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.id);
    if (!version) throw new Error(`找不到平台版本：${input.id}`);
    if (input.status === "published" || input.status === "failed" || input.publishedAt) {
      throw new Error("发布成功/失败必须走人工发布确认，不通过平台版本补丁直接改写。");
    }
    if (input.status && input.status !== version.status && !platformVersionTransitions[version.status].includes(input.status)) throw new Error(`非法平台版本状态流转：${version.status} -> ${input.status}`);
    const updated: ContentPlatformVersion = {
      ...version,
      title: input.title ?? version.title,
      body: input.body ?? version.body,
      script: input.script ?? version.script,
      coverNote: input.coverNote ?? version.coverNote,
      tags: input.tags ?? version.tags,
      platformAdvice: input.platformAdvice ?? version.platformAdvice,
      status: input.status ?? version.status,
      scheduledAt: input.scheduledAt ?? version.scheduledAt,
      publishedAt: version.publishedAt,
      failureReason: input.failureReason ?? version.failureReason,
      nextAction: input.nextAction ?? version.nextAction,
      checklist: { ...version.checklist, ...(input.checklist ?? {}) },
      updatedAt: new Date().toISOString()
    };
    this.repo.upsertEntity("platformVersions", updated.id, updated);
    this.syncWorkflowRecordsFromVersion(updated, { nextAction: updated.nextAction });
    writeLog(this.repo, { level: "info", event: "self_media.platform_version_status", scope: "service", message: `Platform version ${updated.id} moved to ${updated.status}.`, traceId, data: { id: updated.id, status: updated.status } });
    return { version: updated, traceId };
  }

  clearFutureSchedules(now = new Date()): ClearFutureScheduleResult {
    const traceId = createTraceId("calendar-clear");
    const nowTime = now.getTime();
    let clearedPlatformVersionCount = 0;
    let clearedQueueCount = 0;

    for (const version of this.repo.listPlatformVersions()) {
      const scheduledTime = version.scheduledAt ? new Date(version.scheduledAt).getTime() : 0;
      const isFuture = scheduledTime > nowTime;
      const isDraftSchedule = version.status === "scheduled" || version.status === "needs_review" || version.status === "draft";
      if (!isFuture || !isDraftSchedule || version.publishedAt || version.status === "published" || version.status === "failed") continue;
      const updated: ContentPlatformVersion = {
        ...version,
        status: "needs_review",
        scheduledAt: undefined,
        nextAction: "未来排期已清空，请重新选择发布时间后再进入日历。",
        updatedAt: new Date().toISOString()
      };
      this.repo.upsertEntity("platformVersions", updated.id, updated);
      this.syncWorkflowRecordsFromVersion(updated, { nextAction: updated.nextAction });
      clearedPlatformVersionCount += 1;
    }

    for (const queue of this.repo.listQueue()) {
      const scheduledTime = new Date(queue.scheduledAt).getTime();
      const isFuture = scheduledTime > nowTime;
      const isDraftQueue = queue.status === "queued" || queue.status === "scheduled" || queue.status === "needs_review" || queue.status === "draft";
      if (!isFuture || !isDraftQueue) continue;
      const updated: PublishQueueItem = {
        ...queue,
        status: "needs_review",
        scheduledAt: now.toISOString(),
        nextAction: "未来排期已清空，等待重新选择发布时间。",
        updatedAt: new Date().toISOString()
      };
      this.repo.upsertEntity("queue", updated.id, updated);
      clearedQueueCount += 1;
    }

    const contentIdsToRecheck = new Set([
      ...this.repo.listPlatformVersions().map((version) => version.contentId),
      ...this.repo.listQueue().map((queue) => queue.contentId)
    ]);
    for (const contentId of contentIdsToRecheck) {
      const content = this.repo.getEntity<ContentItem>("contents", contentId);
      if (!content) continue;
      const futureScheduledVersion = this.repo.listPlatformVersions().some((version) => version.contentId === content.id && version.scheduledAt && new Date(version.scheduledAt).getTime() > nowTime && version.status === "scheduled");
      if (!futureScheduledVersion && content.scheduledAt && new Date(content.scheduledAt).getTime() > nowTime && content.status === "scheduled") {
        this.repo.upsertEntity("contents", content.id, { ...content, status: "draft", scheduledAt: undefined });
      }
    }

    const preservedPublishRecordCount = this.repo.listPublishRecords().length;
    const preservedMetricSnapshotCount = this.repo.listMetricSnapshots().length;
    writeLog(this.repo, {
      level: "info",
      event: "self_media.future_schedules_cleared",
      scope: "service",
      message: `Cleared ${clearedPlatformVersionCount} future platform schedules and ${clearedQueueCount} queue schedules.`,
      traceId,
      data: { clearedPlatformVersionCount, clearedQueueCount, preservedPublishRecordCount, preservedMetricSnapshotCount }
    });
    return { clearedPlatformVersionCount, clearedQueueCount, preservedPublishRecordCount, preservedMetricSnapshotCount, traceId };
  }

  confirmPlatformVersionPublish(input: ConfirmPlatformVersionPublishRequest): ConfirmPlatformVersionPublishResult {
    const traceId = createTraceId("publish-confirm");
    const version = this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.platformVersionId);
    if (!version) throw new Error(`找不到平台版本：${input.platformVersionId}`);
    const nextVersionStatus = input.status === "submitted_review" ? version.status : input.status;
    if (nextVersionStatus !== version.status && !platformVersionTransitions[version.status].includes(nextVersionStatus)) throw new Error(`非法平台版本发布确认：${version.status} -> ${input.status}`);
    const note = input.note ?? input.failureReason;
    if ((input.status === "failed" || input.status === "blocked") && !note) throw new Error("发布失败或阻塞确认必须提供原因。");

    const happenedAt = input.happenedAt ?? new Date().toISOString();
    const confirmationSource = input.confirmationSource ?? "manual";
    const idempotencyKey =
      input.idempotencyKey ??
      [
        version.id,
        input.status,
        confirmationSource,
        input.platformPostId ?? "",
        input.platformUrl ?? "",
        input.providerRunId ?? "",
        input.confirmedBy ?? ""
      ].join("|");
    const recordId = `publish-record-${version.id}-${stableHash(idempotencyKey)}`;
    const existingRecord = this.repo.listPublishRecords().find((item) => item.id === recordId || item.idempotencyKey === idempotencyKey);
    const confirmedAt = existingRecord?.happenedAt ?? happenedAt;
    const nextAction = input.status === "published"
      ? "已人工确认发布；下一步去 /import 手动抓取最新数据并人工匹配指标。"
      : input.status === "submitted_review"
        ? "已人工提交官方后台审核；等待平台审核通过后再回填已发布，失败则记录失败原因。"
        : note;
    const updated: ContentPlatformVersion = {
      ...version,
      status: nextVersionStatus,
      publishedAt: input.status === "published" ? confirmedAt : version.publishedAt,
      failureReason: input.status === "failed" || input.status === "blocked" ? note : version.failureReason,
      nextAction: nextAction ?? version.nextAction,
      checklist: input.status === "published" ? { ...version.checklist, humanConfirmed: true } : version.checklist,
      updatedAt: new Date().toISOString()
    };
    this.repo.upsertEntity("platformVersions", updated.id, updated);
    this.syncWorkflowRecordsFromVersion(updated, { nextAction: updated.nextAction });

    const publishRecord: PublishRecord =
      existingRecord ?? {
        id: recordId,
        platformVersionId: updated.id,
        contentId: updated.contentId,
        platform: updated.platform,
        status: input.status,
        happenedAt: confirmedAt,
        note,
        platformPostId: input.platformPostId,
        platformUrl: input.platformUrl,
        confirmationSource,
        providerRunId: input.providerRunId,
        confirmedBy: input.confirmedBy,
        idempotencyKey,
        traceId,
        dataDomain: "publish_ledger"
      };
    this.repo.upsertEntity("publishRecords", publishRecord.id, publishRecord);
    writeLog(this.repo, {
      level: "info",
      event: "self_media.platform_version_publish_confirmed",
      scope: "service",
      message: `Confirmed platform version ${updated.id} as ${input.status}.`,
      traceId,
      data: { id: updated.id, status: input.status, versionStatus: updated.status, confirmationSource, idempotent: Boolean(existingRecord) }
    });
    return { version: updated, publishRecord, traceId, idempotent: Boolean(existingRecord) };
  }

  publishToMetricsWorkbench(now = new Date()): PublishToMetricsWorkbench {
    this.backfillContentDataDomains();
    const contents = this.repo.listContents();
    const platformVersions = this.repo.listPlatformVersions();
    const queue = this.repo.listQueue();
    const publishRecords = this.repo.listPublishRecords();
    const imports = this.repo.listImports();
    const metricSnapshots = this.repo.listMetricSnapshots();
    const contentsById = new Map(contents.map((content) => [content.id, content]));
    const trustedSnapshots = metricSnapshots.filter((snapshot) => isTrustedRealMetricSnapshot(snapshot, contentsById));
    return buildPublishToMetricsWorkbench({
      generatedAt: new Date().toISOString(),
      contents,
      platformVersions,
      queue,
      publishRecords,
      imports,
      metricSnapshots,
      trustedSnapshots,
      now
    });
  }

  confirmPlatformContentMatch(input: ConfirmPlatformContentMatchRequest): ConfirmPlatformContentMatchResult {
    const traceId = createTraceId("content-match");
    const localContent = this.repo.getEntity<ContentItem>("contents", input.localContentId);
    if (!localContent) throw new Error(`找不到本地内容：${input.localContentId}`);
    const localVersion = this.repo.getEntity<ContentPlatformVersion>("platformVersions", input.localPlatformVersionId);
    if (!localVersion || localVersion.contentId !== localContent.id) throw new Error(`找不到本地平台版本：${input.localPlatformVersionId}`);
    if (!isClosedLoopContentPlatform(localVersion.platform)) throw new Error("只支持四平台内容级匹配。");
    const importedContent = this.repo.getEntity<ContentItem>("contents", input.importedContentId);
    if (!importedContent) throw new Error(`找不到导入内容：${input.importedContentId}`);
    if (importedContent.platform !== localVersion.platform) throw new Error("导入内容和本地版本平台不一致，不能匹配。");
    if (importedContent.id === localContent.id) throw new Error("导入内容已经是当前本地内容，不需要重复匹配。");

    const contents = this.repo.listContents();
    const contentsById = new Map(contents.map((content) => [content.id, content]));
    const metricSnapshots = this.repo.listMetricSnapshots();
    const allowedSnapshots = metricSnapshots.filter((snapshot) =>
      snapshot.contentId === importedContent.id &&
      snapshot.platform === localVersion.platform &&
      isTrustedRealMetricSnapshot(snapshot, contentsById)
    );
    const selectedIds = input.metricSnapshotIds?.length ? new Set(input.metricSnapshotIds) : undefined;
    const selectedSnapshots = selectedIds ? allowedSnapshots.filter((snapshot) => selectedIds.has(snapshot.id)) : allowedSnapshots;
    if (selectedSnapshots.length === 0) throw new Error("没有可匹配的可信内容级指标快照；请先在 /import 保存对应平台最新本地抓取。");

    const now = new Date().toISOString();
    const updatedContent: ContentItem = {
      ...localContent,
      status: "published",
      publishedAt: localContent.publishedAt ?? localVersion.publishedAt ?? importedContent.publishedAt,
      notes: compactLines([
        localContent.notes,
        `confirmed_platform_content_match:${importedContent.id}`
      ]).join("\n")
    };
    const updatedVersion: ContentPlatformVersion = {
      ...localVersion,
      status: "published",
      publishedAt: localVersion.publishedAt ?? importedContent.publishedAt ?? now,
      nextAction: "平台内容已人工匹配；后续以手动抓取到的内容级快照更新指标。",
      checklist: { ...localVersion.checklist, humanConfirmed: true },
      updatedAt: now
    };
    const updatedImportedContent: ContentItem = {
      ...importedContent,
      userExcludedFromTrustedScope: true,
      trustedScopeOverride: "exclude",
      trustedScopeUpdatedAt: now,
      trustedScopeUpdatedBy: input.confirmedBy ?? "local_user"
    };

    this.repo.upsertEntity("contents", updatedContent.id, updatedContent);
    this.repo.upsertEntity("platformVersions", updatedVersion.id, updatedVersion);
    this.repo.upsertEntity("contents", updatedImportedContent.id, updatedImportedContent);

    const matchedSnapshots: MetricSnapshot[] = selectedSnapshots.map((snapshot) => {
      const id = `snapshot-match-${updatedVersion.id}-${snapshot.snapshotDate}-${stableHash(snapshot.id)}`;
      const matched: MetricSnapshot = {
        ...snapshot,
        id,
        platformVersionId: updatedVersion.id,
        contentId: updatedContent.id,
        updatedAt: now
      };
      this.repo.upsertEntity("metricSnapshots", matched.id, matched);
      return matched;
    });

    writeLog(this.repo, {
      level: "info",
      event: "self_media.platform_content_match_confirmed",
      scope: "service",
      message: `Matched imported content ${importedContent.id} to local platform version ${updatedVersion.id}.`,
      traceId,
      data: {
        localContentId: updatedContent.id,
        localPlatformVersionId: updatedVersion.id,
        importedContentId: importedContent.id,
        metricSnapshotCount: matchedSnapshots.length
      }
    });
    return { content: updatedContent, platformVersion: updatedVersion, metricSnapshots: matchedSnapshots, importedContent: updatedImportedContent, traceId };
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
      provenance: input.provenance,
      dataDomain: isTrustedRealCreatorCenterSource(input.source ?? "manual") ? "user_work" : "imported_metric",
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

  buildEvidenceInsights(snapshots?: MetricSnapshot[]): EvidenceInsight[] {
    const contentsById = new Map(this.repo.listContents().map((content) => [content.id, content]));
    const filteredSnapshots = snapshots ?? this.repo.listMetricSnapshots().filter((snapshot) => isTrustedRealMetricSnapshot(snapshot, contentsById));
    const versions = this.repo.listPlatformVersions();
    const leads = this.repo.listLeads();
    const top = [...filteredSnapshots].sort((a, b) => b.views + b.likes - (a.views + a.likes))[0];
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

  currentPostImportActionSuggestions() {
    const allContents = this.repo.listContents();
    const contentsById = new Map(allContents.map((content) => [content.id, content]));
    const metricSnapshots = this.repo.listMetricSnapshots().filter((snapshot) => isTrustedRealMetricSnapshot(snapshot, contentsById));
    const trustedContentIds = new Set(metricSnapshots.map((snapshot) => snapshot.contentId));
    const contents = allContents.filter((content) => trustedContentIds.has(content.id));
    const metrics = metricSnapshots.map(trustedReviewMetricFromSnapshot);
    const metricPlatformGroups = buildMetricPlatformGroups(metricSnapshots, metrics);
    return enrichPostImportActionSuggestions(
      buildPostImportActionSuggestions({ contents, metricSnapshots, metricPlatformGroups, platformDataHealth: readPlatformDataHealthView() }),
      this.repo.listActionItems()
    );
  }

  createActionItemFromPostImportSuggestion(input: ActionItemFromSuggestionRequest) {
    const traceId = createTraceId("post-import-action");
    const suggestion = this.currentPostImportActionSuggestions().find((item) => item.id === input.suggestionId);
    if (!suggestion) throw new Error(`找不到可转任务的导入后建议：${input.suggestionId}`);
    const existing = this.repo.listActionItems().find((item) => item.sourceSuggestionId === suggestion.id);
    if (existing) return { actionItem: existing, suggestion: { ...suggestion, convertedToActionItem: true, actionItemId: existing.id }, traceId, idempotent: true };
    const actionItem = actionItemFromPostImportSuggestion(suggestion);
    this.repo.upsertEntity("actionItems", actionItem.id, actionItem);
    writeLog(this.repo, {
      level: "info",
      event: "self_media.post_import_suggestion_action_item",
      scope: "service",
      message: `Created action item from post-import suggestion ${suggestion.id}.`,
      traceId,
      data: {
        id: actionItem.id,
        sourceSuggestionId: suggestion.id,
        suggestionType: suggestion.type,
        evidence: actionItem.evidence?.map((item) => ({
          platform: item.platform,
          contentId: item.contentId,
          metricSnapshotId: item.metricSnapshotId,
          source: item.source,
          importRunId: item.importRunId
        }))
      }
    });
    return { actionItem, suggestion: { ...suggestion, convertedToActionItem: true, actionItemId: actionItem.id }, traceId, idempotent: false };
  }

  private trustedActionContentEvidence(item: ReviewActionItem, targetPlatform?: ActionItemToContentRequest["platform"]) {
    const contentsById = new Map(this.repo.listContents().map((content) => [content.id, content]));
    const snapshots = this.repo.listMetricSnapshots();
    const currentSuggestion = item.sourceSuggestionId ? this.currentPostImportActionSuggestions().find((suggestion) => suggestion.id === item.sourceSuggestionId) : undefined;
    if (item.sourceSuggestionId && !currentSuggestion) throw new Error("行动项证据已过期或已被排除，不能转为内容。");
    const candidates = actionEvidenceCandidates(item, currentSuggestion);
    for (const evidence of candidates) {
      const platform = targetPlatform ?? (closedLoopContentPlatforms.includes(evidence.platform as typeof closedLoopContentPlatforms[number]) ? evidence.platform as typeof closedLoopContentPlatforms[number] : undefined);
      if (!platform) continue;
      if (evidence.metricSnapshotId) {
        const snapshot = snapshots.find((candidate) => candidate.id === evidence.metricSnapshotId);
        if (!snapshot || snapshot.platform !== platform || !isTrustedRealMetricSnapshot(snapshot, contentsById)) continue;
        const content = contentsById.get(snapshot.contentId);
        if (content) return { evidence: { ...evidence, platform, contentId: snapshot.contentId, metricSnapshotId: snapshot.id, source: snapshot.source, importRunId: snapshot.importRunId }, snapshot, content, platform };
      }
      if (evidence.contentId) {
        const content = contentsById.get(evidence.contentId);
        if (!content || isUserExcludedFromTrustedScope(content)) continue;
        const snapshot = snapshots.find((candidate) => candidate.contentId === content.id && candidate.platform === platform && isTrustedRealMetricSnapshot(candidate, contentsById));
        if (snapshot) return { evidence: { ...evidence, platform, contentId: content.id, metricSnapshotId: snapshot.id, source: snapshot.source, importRunId: snapshot.importRunId }, snapshot, content, platform };
      }
    }
    throw new Error("行动项缺少当前可信的内容级证据，不能转为内容。");
  }

  createContentFromActionItem(input: ActionItemToContentRequest): ActionItemToContentResult {
    const traceId = createTraceId("action-content");
    const item = this.repo.getEntity<ReviewActionItem>("actionItems", input.id);
    if (!item) throw new Error(`找不到行动项：${input.id}`);
    const existingContent = item.contentDraftId ? this.repo.getEntity<ContentItem>("contents", item.contentDraftId) : undefined;
    const existingVersion = item.platformVersionId ? this.repo.getEntity<ContentPlatformVersion>("platformVersions", item.platformVersionId) : undefined;
    const existingQueue = item.publishQueueItemId ? this.repo.getEntity<PublishQueueItem>("queue", item.publishQueueItemId) : undefined;
    if (existingContent && existingVersion && existingQueue) return { actionItem: item, content: existingContent, platformVersion: existingVersion, queue: existingQueue, traceId, idempotent: true };

    const trustedEvidence = this.trustedActionContentEvidence(item, input.platform);
    const scheduledAt = input.scheduledAt ?? defaultActionScheduleAt();
    const contentId = `content-from-action-${stableHash(item.id)}`;
    const queueId = `queue-from-${contentId}`;
    const status = scheduledAt ? "scheduled" : "draft";
    const now = new Date().toISOString();
    const content: ContentItem = {
      id: contentId,
      title: item.title,
      platform: trustedEvidence.platform,
      status,
      format: contentFormatForPlatform(trustedEvidence.platform),
      topic: item.title,
      scheduledAt,
      workOwnership: "operator_owned_work",
      dataDomain: "system_log",
      dataDomainUpdatedAt: now,
      dataDomainReason: "operator_generated_workflow",
      notes: [
        `actionItem:${item.id}`,
        item.sourceSuggestionId ? `sourceSuggestion:${item.sourceSuggestionId}` : undefined,
        trustedEvidence.evidence.metricSnapshotId ? `metricSnapshot:${trustedEvidence.evidence.metricSnapshotId}` : undefined,
        trustedEvidence.evidence.importRunId ? `importRun:${trustedEvidence.evidence.importRunId}` : undefined
      ].filter(Boolean).join("\n")
    };
    const queue: PublishQueueItem = {
      id: queueId,
      contentId: content.id,
      platform: content.platform,
      status,
      scheduledAt,
      nextAction: "补齐内容草稿、平台版本和人工排期确认。",
      updatedAt: now
    };
    this.repo.upsertEntity("contents", content.id, content);
    this.repo.upsertEntity("queue", queue.id, queue);
    const version = this.upsertPlatformVersion({
      contentId: content.id,
      platform: content.platform,
      title: content.title,
      body: "",
      scheduledAt,
      status,
      nextAction: queue.nextAction
    }).version;
    const updatedAction: ReviewActionItem = {
      ...item,
      status: item.status === "todo" ? "doing" : item.status,
      contentDraftId: content.id,
      platformVersionId: version.id,
      publishQueueItemId: queue.id,
      contentWorkflowStatus: scheduledAt ? "scheduled" : "draft_created",
      contentWorkflowUpdatedAt: now,
      nextAction: "已进入内容生产排期，下一步补齐草稿和平台版本细节。",
      updatedAt: now
    };
    this.repo.upsertEntity("actionItems", updatedAction.id, updatedAction);
    writeLog(this.repo, {
      level: "info",
      event: "self_media.action_item_to_content",
      scope: "service",
      message: `Created content draft ${content.id} from action item ${item.id}.`,
      traceId,
      data: {
        actionItemId: item.id,
        contentId: content.id,
        platformVersionId: version.id,
        queueId: queue.id,
        platform: content.platform,
        sourceSuggestionId: item.sourceSuggestionId,
        metricSnapshotId: trustedEvidence.evidence.metricSnapshotId,
        importRunId: trustedEvidence.evidence.importRunId
      }
    });
    return { actionItem: updatedAction, content, platformVersion: version, queue, traceId, idempotent: false };
  }

  async trustedWeeklySafeReport(): Promise<TrustedWeeklySafeReportResponse> {
    const snapshot = await this.dashboard();
    const performanceRows = buildTrustedWeeklyPerformanceRows(snapshot.metricSnapshots);
    const topContentPerformance = [...performanceRows]
      .sort((a, b) => b.views - a.views || b.engagement - a.engagement)
      .slice(0, 5)
      .map((item, index) => ({ rank: index + 1, ...item }));
    const lowInteractionPerformance = [...performanceRows]
      .filter((item) => item.views >= 50)
      .sort((a, b) => a.engagementRate - b.engagementRate || b.views - a.views)
      .slice(0, 5)
      .map((item, index) => ({ rank: index + 1, ...item }));
    const platformViews = snapshot.trustedWeeklySummary.platformOverview.reduce((sum, item) => sum + item.views, 0);
    const report: TrustedWeeklySafeReport = {
      task: "SAFE-WEEKLY-REPORT-UI-EXPORT-036",
      generatedAt: snapshot.generatedAt,
      defaultScope: "trusted_real_creator_center",
      source: "trusted_dashboard_review",
      exportGuidance: "完整周报只作为本地证据；外发、粘贴或跨系统同步请使用本 API 返回的安全摘要。",
      localEvidencePath: snapshot.trustedWeeklySummary.localEvidencePath,
      safeApiPath: "/api/self-media/reports/trusted-weekly-safe",
      totals: {
        trustedContentCount: snapshot.trustedWeeklySummary.trustedContentCount,
        trustedMetricSnapshotCount: snapshot.trustedWeeklySummary.trustedMetricSnapshotCount,
        views: snapshot.trustedWeeklySummary.views,
        engagement: snapshot.trustedWeeklySummary.engagement,
        bestPlatform: snapshot.trustedWeeklySummary.bestPlatform
      },
      platformOverview: snapshot.trustedWeeklySummary.platformOverview,
      topContentPerformance,
      lowInteractionPerformance,
      freshness: snapshot.trustedWeeklySummary.freshness,
      excluded: snapshot.trustedWeeklySummary.excluded,
      recommendationTypes: snapshot.postImportActionSuggestions.map((item) => ({
        type: item.type,
        priority: item.priority,
        evidenceCount: item.evidence.length
      })),
      redaction: snapshot.trustedWeeklySummary.redaction,
      consistencyChecks: {
        weeklyViewsEqualTrustedStatus: snapshot.weeklyReview.metrics.totalViews === snapshot.trustedOperatingStatus.views,
        weeklyEngagementEqualTrustedStatus: snapshot.weeklyReview.metrics.totalEngagement === snapshot.trustedOperatingStatus.engagement,
        weeklyContentCountEqualTrustedScope: snapshot.weeklyReview.metrics.contentCount === snapshot.realDataScope.trustedContentCount,
        metricSnapshotCountEqualTrustedScope: snapshot.metricSnapshots.length === snapshot.realDataScope.trustedMetricSnapshotCount,
        platformViewsEqualWeeklyViews: platformViews === snapshot.weeklyReview.metrics.totalViews,
        accountMetricSnapshotsExcluded: true
      }
    };
    return { report, markdown: renderTrustedWeeklySafeMarkdown(report) };
  }

  saveReview(input: SaveReviewRequest) {
    const traceId = createTraceId("saved-review");
    this.backfillContentDataDomains();
    const allContents = this.repo.listContents();
    const ideas = this.repo.listIdeas();
    const queue = this.repo.listQueue();
    const leads = this.repo.listLeads();
    const platformVersions = this.repo.listPlatformVersions();
    const contentsById = new Map(allContents.map((content) => [content.id, content]));
    const snapshots = this.repo.listMetricSnapshots().filter((snapshot) => isTrustedRealMetricSnapshot(snapshot, contentsById));
    const trustedContentIds = new Set(snapshots.map((snapshot) => snapshot.contentId));
    const contents = allContents.filter((content) => trustedContentIds.has(content.id));
    const metrics = snapshots.map(trustedReviewMetricFromSnapshot);
    const report = generateReview(input.period, contents, metrics, { ideas, queue, leads });
    const insights = this.buildEvidenceInsights(snapshots);
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
      platformVersionIds: platformVersions.filter((item) => trustedContentIds.has(item.contentId)).map((item) => item.id),
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

  async contentWorkbench(): Promise<ContentWorkbenchSnapshot> {
    await this.ensureSeedData();
    this.backfillContentDataDomains();
    const contents = this.repo.listContents();
    const allMetrics = this.repo.listMetrics();
    const platformVersions = this.repo.listPlatformVersions();
    const queue = this.repo.listQueue();
    const publishRecords = this.repo.listPublishRecords();
    const actionItems = this.repo.listActionItems();
    const ideas = this.repo.listIdeas();
    const metricSnapshots = this.repo.listMetricSnapshots();
    const imports = this.repo.listImports();
    const contentsById = new Map(contents.map((content) => [content.id, content]));
    const trustedSnapshots = metricSnapshots.filter((snapshot) => isTrustedRealMetricSnapshot(snapshot, contentsById));
    const realDataScope = buildRealDataScopeSummary({ contents, metrics: allMetrics, metricSnapshots, imports, trustedSnapshots });
    const trustedOperatingStatus = buildTrustedOperatingStatus(realDataScope, trustedSnapshots);
    const trustedScopeCuration = buildTrustedScopeCurationSummary(contents, metricSnapshots, trustedSnapshots);
    const contentRows = buildContentWorkbenchRows({ contents, platformVersions, queue, actionItems, ideas, metricSnapshots, trustedSnapshots });
    const generatedAt = new Date().toISOString();
    const publishToMetricsWorkbench = buildPublishToMetricsWorkbench({ generatedAt, contents, platformVersions, queue, publishRecords, imports: this.repo.listImports(), metricSnapshots, trustedSnapshots });
    return {
      generatedAt,
      contents,
      contentRows,
      platformVersions,
      queue,
      publishRecords,
      actionItems,
      ideas,
      metricSnapshots,
      publishToMetricsWorkbench,
      trustedScopeCuration,
      trustedOperatingStatus,
      summary: {
        allContentCount: contents.length,
        platformVersionCount: platformVersions.length,
        queueCount: queue.length,
        publishRecordCount: publishRecords.length,
        actionGeneratedDraftCount: contentRows.filter((row) => row.originKind === "action_item_generated").length,
        ideaConvertedDraftCount: contentRows.filter((row) => row.originKind === "idea_converted").length,
        manualImportedContentCount: contentRows.filter((row) => row.originKind === "manual_import").length,
        externalUntrustedContentCount: contentRows.filter((row) => row.originKind === "external_untrusted").length,
        trustedDashboardContentCount: contentRows.filter((row) => row.includedInTrustedDashboardReview).length,
        notInTrustedDashboardContentCount: contentRows.filter((row) => !row.includedInTrustedDashboardReview).length,
        draftContentCount: contentRows.filter((row) => row.content.status === "draft" || row.platformVersions.some((version) => version.status === "draft" || version.status === "needs_review")).length
      }
    };
  }

  async dashboard(): Promise<DashboardSnapshot> {
    await this.ensureSeedData();
    this.backfillContentDataDomains();
    const allContents = this.repo.listContents();
    const allMetrics = this.repo.listMetrics();
    const ideas = this.repo.listIdeas();
    const queue = this.repo.listQueue();
    const leads = this.repo.listLeads();
    const allPlatformVersions = this.repo.listPlatformVersions();
    const calendarItems = this.calendar();
    const allMetricSnapshots = this.repo.listMetricSnapshots();
    const imports = this.repo.listImports();
    const savedReviews = this.repo.listSavedReviews();
    const actionItems = this.repo.listActionItems();
    const contentsById = new Map(allContents.map((content) => [content.id, content]));
    const metricSnapshots = allMetricSnapshots.filter((snapshot) => isTrustedRealMetricSnapshot(snapshot, contentsById));
    const trustedContentIds = new Set(metricSnapshots.map((snapshot) => snapshot.contentId));
    const visibleContentIds = new Set([...trustedContentIds].filter((id) => isDefaultUserWorkContent(contentsById.get(id))));
    const trustedContents = allContents.filter((content) => trustedContentIds.has(content.id));
    const contents = allContents.filter((content) => visibleContentIds.has(content.id));
    const metrics = metricSnapshots.map(trustedReviewMetricFromSnapshot);
    const platformVersions = allPlatformVersions.filter((version) => visibleContentIds.has(version.contentId));
    const metricSourceGroups = buildMetricSourceGroups(metricSnapshots, metrics);
    const metricPlatformGroups = buildMetricPlatformGroups(metricSnapshots, metrics);
    const accountMetricSnapshots = this.repo.listAccountMetricSnapshots();
    const accountMetricGroups = buildAccountMetricGroups(accountMetricSnapshots);
    const generatedAt = new Date().toISOString();
    const platformDataHealth = readPlatformDataHealthView();
    const dailyPlatformOpsGate = readDailyPlatformOpsGateView();
    const dailySelfMediaOps = readDailySelfMediaOpsView();
    const platformImportStatuses = this.platformImportStatuses();
    const dataCaptureScheduleReliability = buildDataCaptureScheduleReliability({ generatedAt, platformDataHealth, dailySelfMediaOps, dailyPlatformOpsGate });
    const trustedAutoCaptureScheduler = buildTrustedAutoCaptureScheduler({ generatedAt, platformDataHealth, platformImportStatuses });
    const realDataScope = buildRealDataScopeSummary({ contents: allContents, metrics: allMetrics, metricSnapshots: allMetricSnapshots, imports, trustedSnapshots: metricSnapshots });
    const trustedOperatingStatus = buildTrustedOperatingStatus(realDataScope, metricSnapshots);
    const trustedScopeCuration = buildTrustedScopeCurationSummary(allContents, allMetricSnapshots, metricSnapshots);
    const postImportActionSuggestions = enrichPostImportActionSuggestions(buildPostImportActionSuggestions({ contents: trustedContents, metricSnapshots, metricPlatformGroups, platformDataHealth }), actionItems);
    const automationRuns = this.repo.listAutomationRuns();
    const evidenceInsights = this.buildEvidenceInsights(metricSnapshots);
    const publishToMetricsWorkbench = buildPublishToMetricsWorkbench({ generatedAt, contents: allContents, platformVersions: allPlatformVersions, queue, publishRecords: this.repo.listPublishRecords(), imports, metricSnapshots: allMetricSnapshots, trustedSnapshots: metricSnapshots });
    const weeklyReview = generateReview("weekly", trustedContents, metrics, { ideas, queue, leads });
    const monthlyReview = generateReview("monthly", trustedContents, metrics, { ideas, queue, leads });
    const trustedWeeklySummary = buildTrustedWeeklyReportSummary({ generatedAt, realDataScope, trustedOperatingStatus, metricPlatformGroups, platformDataHealth, dailyPlatformOpsGate, weeklyReview });
    return {
      generatedAt,
      accounts: this.repo.listAccounts(),
      contents,
      metrics,
      ideas,
      competitors: this.repo.listCompetitors(),
      experiments: this.repo.listExperiments(),
      contacts: this.repo.listContacts(),
      leads,
      imports,
      operationHistory: this.listOperationHistory(),
      platformImportStatuses,
      platformImportOperationCapabilities,
      platformReadinessStatuses: this.platformReadinessStatuses(),
      platformDataHealth,
      dataCaptureScheduleReliability,
      trustedAutoCaptureScheduler,
      realDataScope,
      trustedOperatingStatus,
      trustedWeeklySummary,
      dailyPlatformOpsGate,
      dailySelfMediaOps,
      trustedScopeCuration,
      queue,
      platformVersions,
      calendarItems,
      publishRecords: this.repo.listPublishRecords(),
      metricSnapshots,
      metricSourceGroups,
      metricPlatformGroups,
      accountMetricSnapshots,
      accountMetricGroups,
      postImportActionSuggestions,
      savedReviews,
      actionItems,
      automationRuns,
      evidenceInsights,
      weeklyReview,
      monthlyReview,
      logs: this.repo.listLogs(),
      audits: this.repo.listAudits(),
      publishToMetricsWorkbench
    };
  }
}
