export type Platform = "douyin" | "xiaohongshu" | "wechat" | "video_account" | "bilibili" | "other";

export type ContentStatus = "idea" | "draft" | "scheduled" | "published" | "reviewed";

export type ImportSource = "manual" | "csv" | "json" | "fake" | "mediacrawler" | "n8n" | "wechat_official" | "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center";

export type CsvImportPreset = "generic" | "douyin" | "xiaohongshu" | "wechat" | "video_account" | "bilibili";

export type WorkbenchErrorKind = "validation" | "provider" | "persistence" | "analysis" | "unknown";

export type LogLevel = "info" | "warn" | "error";

export type PlatformVersionStatus = "draft" | "needs_review" | "scheduled" | "published" | "failed" | "blocked";

export type CalendarView = "week" | "month";

export type ContentWorkOwnership = "user_owned_work" | "operator_owned_work";

export type ContentDataDomain = "user_work" | "acceptance_run" | "demo_seed" | "imported_metric" | "publish_ledger" | "system_log";

export type ImportDiffKind = "new" | "update" | "duplicate" | "conflict" | "invalid";

export type ReviewActionStatus = "todo" | "doing" | "done" | "dropped";

export type AutomationRunStatus = "pending" | "running" | "success" | "failed" | "retrying";

export type ImportOperationKind = "import" | "platform_preview" | "platform_save" | "platform_save_smoke" | "manual_snapshot" | "seed" | "sync";

export interface ImportProvenanceMetadata {
  isTestFixture?: boolean;
  operationKind?: ImportOperationKind;
  trustedScopeEligible?: boolean;
  dataDomain?: ContentDataDomain;
  acceptanceRunId?: string;
}

export interface PlatformAccount {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  url?: string;
}

export interface ContentItem {
  id: string;
  title: string;
  platform: Platform;
  status: ContentStatus;
  format: "short_video" | "image_text" | "article" | "livestream" | "other";
  topic: string;
  publishedAt?: string;
  scheduledAt?: string;
  notes?: string;
  userExcludedFromTrustedScope?: boolean;
  trustedScopeOverride?: "include" | "exclude";
  trustedScopeUpdatedAt?: string;
  trustedScopeUpdatedBy?: string;
  workOwnership?: ContentWorkOwnership;
  dataDomain?: ContentDataDomain;
  dataDomainUpdatedAt?: string;
  dataDomainReason?: string;
  acceptanceRunId?: string;
  userConfirmedForLibrary?: boolean;
}

export interface PlatformChecklist {
  title: boolean;
  cover: boolean;
  script: boolean;
  platformFit: boolean;
  humanConfirmed: boolean;
}

export interface ContentPlatformVersion {
  id: string;
  contentId: string;
  platform: Platform;
  title: string;
  body: string;
  script: string;
  coverNote: string;
  tags?: string[];
  platformAdvice?: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: PlatformVersionStatus;
  failureReason?: string;
  nextAction?: string;
  checklist: PlatformChecklist;
  updatedAt: string;
}

export interface PublishCalendarItem {
  id: string;
  platformVersionId: string;
  contentId: string;
  platform: Platform;
  status: PlatformVersionStatus;
  scheduledAt: string;
  title: string;
  blockers?: string[];
  checklistDone: number;
  checklistTotal: number;
}

export type PublishRecordStatus = "submitted_review" | "published" | "failed" | "blocked" | "confirmed";

export interface PublishRecord {
  id: string;
  platformVersionId: string;
  contentId: string;
  platform: Platform;
  status: PublishRecordStatus;
  happenedAt: string;
  note?: string;
  platformPostId?: string;
  platformUrl?: string;
  confirmationSource?: "manual" | "provider" | "import";
  providerRunId?: string;
  confirmedBy?: string;
  idempotencyKey?: string;
  traceId: string;
  dataDomain?: Extract<ContentDataDomain, "publish_ledger">;
}

export interface PlatformMetric {
  id: string;
  contentId: string;
  platform: Platform;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
}

export interface MetricSnapshot {
  id: string;
  platformVersionId: string;
  contentId: string;
  platform: Platform;
  snapshotDate: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  source: ImportSource | "manual";
  importRunId?: string;
  provenance?: ImportProvenanceMetadata;
  updatedAt: string;
  dataDomain?: Extract<ContentDataDomain, "imported_metric" | "demo_seed" | "acceptance_run" | "user_work">;
}

export interface AccountMetricSnapshot {
  id: string;
  platform: Platform;
  source: ImportSource | "manual";
  date: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  rawEvidenceRef: string;
  importRunId?: string;
  updatedAt: string;
}

export interface MetricSnapshotSourceGroup {
  source: ImportSource | "manual";
  platform: Platform | "mixed";
  snapshotCount: number;
  contentCount: number;
  importRunCount: number;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  engagement: number;
  latestSnapshotDate?: string;
  latestImportRunId?: string;
  includedInReview: boolean;
}

export interface MetricSnapshotPlatformGroup {
  platform: Platform;
  snapshotCount: number;
  contentCount: number;
  sourceCount: number;
  sources: Array<ImportSource | "manual">;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  engagement: number;
  latestSnapshotDate?: string;
  includedInReview: boolean;
}

export interface AccountMetricGroup {
  platform: Platform;
  source: ImportSource | "manual";
  date: string;
  snapshotCount: number;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  engagement: number;
  latestImportRunId?: string;
  includedInContentReview: false;
}

export type PostImportActionSuggestionType = "reuse_high_performer" | "review_low_engagement" | "platform_priority" | "bilibili_archives_content" | "data_health_anomaly";

export interface PostImportActionEvidence {
  platform: Platform;
  contentId?: string;
  source?: ImportSource | "manual";
  metricSnapshotId?: string;
  importRunId?: string;
}

export interface PostImportActionSuggestion {
  id: string;
  type: PostImportActionSuggestionType;
  priority: "high" | "medium" | "low";
  title: string;
  summary: string;
  nextAction: string;
  evidence: PostImportActionEvidence[];
  convertedToActionItem?: boolean;
  actionItemId?: string;
}

export interface RealDataScopeSourceSummary {
  source: ImportSource | "manual" | "review_metric";
  contentCount: number;
  metricCount: number;
  metricSnapshotCount: number;
  importRunCount: number;
  views: number;
}

export interface RealDataScopeSummary {
  defaultScope: "trusted_real_creator_center";
  trustedSources: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center">[];
  isDefaultDashboardTrusted: boolean;
  trustedContentCount: number;
  trustedMetricCount: number;
  trustedMetricSnapshotCount: number;
  trustedImportRunCount: number;
  excludedContentCount: number;
  excludedMetricCount: number;
  excludedMetricSnapshotCount: number;
  excludedImportRunCount: number;
  allContentCount: number;
  allMetricCount: number;
  allMetricSnapshotCount: number;
  allImportRunCount: number;
  userExcludedContentCount: number;
  userExcludedMetricSnapshotCount: number;
  excludedSources: RealDataScopeSourceSummary[];
}

export interface TrustedScopeCurationItem {
  contentId: string;
  title: string;
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  source: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center">;
  userExcludedFromTrustedScope: boolean;
  trustedScopeOverride?: "include" | "exclude";
  includedInTrustedScope: boolean;
  snapshotCount: number;
  views: number;
  engagement: number;
  latestSnapshotDate?: string;
}

export interface TrustedScopeCurationSummary {
  items: TrustedScopeCurationItem[];
  trustedCandidateContentCount: number;
  activeContentCount: number;
  userExcludedContentCount: number;
  userExcludedMetricSnapshotCount: number;
}

export type ContentWorkbenchOriginKind = "trusted_creator_center" | "local_draft" | "action_item_generated" | "idea_converted" | "manual_import" | "external_untrusted" | "unknown_local";

export interface ContentWorkbenchContentRow {
  content: ContentItem;
  platformVersions: ContentPlatformVersion[];
  queueItems: PublishQueueItem[];
  actionItems: ReviewActionItem[];
  sourceKinds: Array<ImportSource | "manual" | "local_workflow" | "unknown">;
  originKind: ContentWorkbenchOriginKind;
  originLabel: string;
  includedInTrustedDashboardReview: boolean;
  dashboardReviewLabel: "进入运营看板" | "不进运营看板";
  dashboardReviewReason: string;
  trustedMetricSnapshotCount: number;
  localMetricSnapshotCount: number;
  latestSnapshotDate?: string;
}

export type ClosedLoopContentPlatform = "douyin" | "xiaohongshu" | "video_account" | "bilibili";

export interface PublishExecutionItem {
  platformVersionId: string;
  contentId: string;
  queueId?: string;
  platform: ClosedLoopContentPlatform;
  contentTitle: string;
  versionTitle: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: PlatformVersionStatus;
  queueStatus?: PublishQueueStatus;
  timing: "overdue" | "due_today" | "upcoming" | "published_waiting_metrics" | "blocked_or_failed";
  minutesUntilDue?: number;
  nextAction: string;
  needsManualRefresh: boolean;
  publishRecordId?: string;
  contentUrl: string;
  calendarUrl: string;
}

export type PublishHandoffCapabilityStatus = "future_official_api_candidate" | "manual_backend_only";
export type PublishHandoffDefaultMode = "manual_backend";
export type PublishHandoffStatusAction = "submitted_review" | "published" | "failed";

export interface PublishHandoffPackage {
  id: string;
  platformVersionId: string;
  contentId: string;
  platform: ClosedLoopContentPlatform;
  contentTitle: string;
  versionTitle: string;
  scheduledAt?: string;
  status: PlatformVersionStatus;
  latestRecordStatus?: PublishRecordStatus;
  latestRecordAt?: string;
  officialBackendUrl: string;
  backendActionLabel: string;
  defaultMode: PublishHandoffDefaultMode;
  capability: {
    status: PublishHandoffCapabilityStatus;
    label: string;
    note: string;
  };
  copy: {
    publishText: string;
    tagsText: string;
    coverNote: string;
    scheduleText: string;
  };
  statusActions: PublishHandoffStatusAction[];
  complianceNote: string;
}

export interface PlatformContentMatchCandidate {
  id: string;
  platform: ClosedLoopContentPlatform;
  localContentId: string;
  localPlatformVersionId: string;
  importedContentId: string;
  importedTitle: string;
  importedPublishedAt?: string;
  importRunId?: string;
  metricSnapshotIds: string[];
  score: number;
  reasons: string[];
  status: "candidate" | "matched";
}

export interface PostPublishRefreshCandidate {
  id: string;
  platform: ClosedLoopContentPlatform;
  importPlatformKey: PlatformImportOperationPlatform;
  contentId: string;
  platformVersionId: string;
  contentTitle: string;
  versionTitle: string;
  publishedAt?: string;
  scheduledAt?: string;
  latestMetricSnapshotAt?: string;
  latestImportRunId?: string;
  nextAction: string;
  manualRefreshCopy: string;
  matchCandidates: PlatformContentMatchCandidate[];
}

export type PostPublishRecoveryMatchStatus = "needs_capture" | "captured_no_candidate" | "candidate_ready" | "attributed";

export interface PostPublishRecoveryItem {
  id: string;
  platform: ClosedLoopContentPlatform;
  importPlatformKey: PlatformImportOperationPlatform;
  contentId: string;
  platformVersionId: string;
  contentTitle: string;
  versionTitle: string;
  publishedAt?: string;
  scheduledAt?: string;
  officialBackendUrl: string;
  backendActionLabel: string;
  recommendedRefreshAction: string;
  manualRefreshSteps: string[];
  latestImportRunId?: string;
  latestImportAt?: string;
  latestImportStatus: ImportRun["status"] | "never";
  recentlyCaptured: boolean;
  matchStatus: PostPublishRecoveryMatchStatus;
  matchStatusLabel: string;
  attributionStatusLabel: string;
  metricSnapshotCount: number;
  latestMetricSnapshotAt?: string;
  matchCandidateCount: number;
  bestCandidateScore?: number;
  nextAction: string;
}

export interface PublishToMetricsWorkbench {
  generatedAt: string;
  publishHandoffPackages: PublishHandoffPackage[];
  executionItems: PublishExecutionItem[];
  postPublishRefresh: PostPublishRefreshCandidate[];
  postPublishRecoveryItems: PostPublishRecoveryItem[];
  matchCandidates: PlatformContentMatchCandidate[];
  manualRefreshCopy: string;
  scheduledRefresh: {
    nextSuggestedAt: string;
    command: string;
    boundary: string;
  };
}

export interface ContentWorkbenchSnapshot {
  generatedAt: string;
  contents: ContentItem[];
  contentRows: ContentWorkbenchContentRow[];
  platformVersions: ContentPlatformVersion[];
  queue: PublishQueueItem[];
  publishRecords: PublishRecord[];
  actionItems: ReviewActionItem[];
  ideas: TopicIdea[];
  metricSnapshots: MetricSnapshot[];
  publishToMetricsWorkbench: PublishToMetricsWorkbench;
  trustedScopeCuration: TrustedScopeCurationSummary;
  trustedOperatingStatus: TrustedOperatingStatus;
  summary: {
    allContentCount: number;
    platformVersionCount: number;
    queueCount: number;
    publishRecordCount: number;
    actionGeneratedDraftCount: number;
    ideaConvertedDraftCount: number;
    manualImportedContentCount: number;
    externalUntrustedContentCount: number;
    trustedDashboardContentCount: number;
    notInTrustedDashboardContentCount: number;
    draftContentCount: number;
  };
}

export interface DataFreshnessTimelineView {
  latestRealCaptureAt?: string | null;
  latestSmokeAt?: string | null;
  latestAuditAt?: string | null;
  realCaptureAgeHours?: number | null;
  smokeAgeHours?: number | null;
  realCaptureIsStale?: boolean | null;
  smokeIsStale?: boolean | null;
  staleAfterHours?: number | null;
}

export type RealCaptureFreshnessStatus = "fresh" | "stale" | "missing" | "unknown";

export type DataCaptureScheduleStatus = "fresh" | "stale" | "missing" | "failed" | "unknown";

export type CaptureMode = "manual" | "browser_assisted" | "official_api";

export type CaptureConnectionStatus = "not_authorized" | "authorized" | "browser_session_active" | "browser_session_missing";

export type CaptureScheduleCadence = "disabled" | "hourly" | "daily";

export interface CaptureScheduleView {
  enabled: boolean;
  cadence: CaptureScheduleCadence;
  intervalHours: number | null;
  allowScheduledCapture: boolean;
  reason: string;
}

export interface PlatformCaptureSchedulerStatus {
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  key: "douyin" | "xiaohongshu" | "video-account" | "bilibili";
  label: string;
  captureMode: CaptureMode;
  captureConnectionStatus: CaptureConnectionStatus;
  isAuthorized: boolean;
  browserSessionAvailable: boolean;
  captureSchedule: CaptureScheduleView;
  lastSuccessfulCaptureAt?: string | null;
  nextScheduledCaptureAt?: string | null;
  missedCaptureReason?: string | null;
  startupCatchUpRequired: boolean;
  needsManualAction: boolean;
  canRunImmediateCapture: boolean;
  statusLabel: string;
  nextAction: string;
}

export interface TrustedAutoCaptureSchedulerView {
  generatedAt: string;
  staleAfterHours: number;
  schedulerEnabledCount: number;
  manualOnlyCount: number;
  startupCatchUpCount: number;
  statuses: PlatformCaptureSchedulerStatus[];
  boundaries: {
    noRealPlatformApiCall: true;
    noSensitiveLoginMaterial: true;
    noScheduleWithoutAuthorization: true;
    browserSessionMustBeActive: true;
  };
}

export interface DataCaptureScheduleReliabilityView {
  mode: "manual_only";
  modeLabel: string;
  hasHourlyAutomation: boolean;
  hasBackgroundDaemon: boolean;
  hasStartupAutomation: boolean;
  windowsTaskSchedulerRegistered: boolean;
  suggestedFrequencyHours: number;
  staleAfterHours: number;
  latestRealCaptureAt?: string | null;
  latestSuccessfulImportAt?: string | null;
  latestFailureAt?: string | null;
  nextSuggestedAt?: string | null;
  status: DataCaptureScheduleStatus;
  statusLabel: string;
  startupCatchUpRequired: boolean;
  startupCatchUpCopy: string;
  manualImmediateRefreshCopy: string;
  failureSummary: string;
  visibleNextAction: string;
  boundaries: {
    noSensitiveLoginMaterial: true;
    wechatPaused: true;
    bilibiliAccountPreviewOnly: true;
    noAutoRegistration: true;
    noBackgroundCapture: true;
  };
}

export interface PlatformAssistedRefreshCommands {
  manualStep: string;
  preview: string;
  save: string;
  health: string;
  freshness: string;
  audit: string;
  gate: string;
}

export interface TrustedDashboardAuditView {
  reportPath: string;
  exists: boolean;
  status: "pass" | "fail" | "missing" | "error";
  generatedAt?: string | null;
  dashboardInput?: string | null;
  trustedContentCount: number;
  trustedMetricSnapshotCount: number;
  views: number;
  engagement: number;
  mismatchCount: number;
  mismatches: string[];
  freshness?: DataFreshnessTimelineView;
  message?: string;
}

export interface TrustedOperatingStatus {
  defaultScope: "trusted_real_creator_center";
  profile: "dirty" | "clean";
  profileLabel: string;
  seedMode: "demo" | "off";
  auditCommand: string;
  trustedContentCount: number;
  trustedMetricSnapshotCount: number;
  views: number;
  engagement: number;
  isDefaultDashboardTrusted: boolean;
  audit: TrustedDashboardAuditView;
}

export interface TrustedWeeklyReportSummary {
  generatedAt: string;
  defaultScope: "trusted_real_creator_center";
  localEvidencePath: string;
  redactedSummaryPath: string;
  exportGuidance: string;
  trustedContentCount: number;
  trustedMetricSnapshotCount: number;
  views: number;
  engagement: number;
  bestPlatform: Platform;
  platformOverview: Array<{
    platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
    contentCount: number;
    metricSnapshotCount: number;
    views: number;
    engagement: number;
    viewShare: number;
    engagementRate: number;
  }>;
  freshness: DataFreshnessTimelineView & {
    realCaptureStaleCount: number;
    sourceMismatchCount: number;
  };
  excluded: {
    excludedContentCount: number;
    excludedMetricSnapshotCount: number;
    userExcludedContentCount: number;
    excludedSourceCount: number;
  };
  redaction: {
    contentTitlesIncluded: false;
    accountMetricsIncluded: false;
    captureDetailsIncluded: false;
  };
}

export interface TrustedWeeklySafeReport {
  task: "SAFE-WEEKLY-REPORT-UI-EXPORT-036";
  generatedAt: string;
  defaultScope: "trusted_real_creator_center";
  source: "trusted_dashboard_review";
  exportGuidance: string;
  localEvidencePath: string;
  safeApiPath: string;
  totals: {
    trustedContentCount: number;
    trustedMetricSnapshotCount: number;
    views: number;
    engagement: number;
    bestPlatform: Platform;
  };
  platformOverview: TrustedWeeklyReportSummary["platformOverview"];
  topContentPerformance: Array<{
    rank: number;
    platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
    views: number;
    engagement: number;
    engagementRate: number;
    latestSnapshotDate?: string;
  }>;
  lowInteractionPerformance: Array<{
    rank: number;
    platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
    views: number;
    engagement: number;
    engagementRate: number;
    latestSnapshotDate?: string;
  }>;
  freshness: TrustedWeeklyReportSummary["freshness"];
  excluded: TrustedWeeklyReportSummary["excluded"];
  recommendationTypes: Array<{
    type: PostImportActionSuggestionType;
    priority: "high" | "medium" | "low";
    evidenceCount: number;
  }>;
  redaction: TrustedWeeklyReportSummary["redaction"];
  consistencyChecks: Record<string, boolean>;
}

export interface TrustedWeeklySafeReportResponse {
  report: TrustedWeeklySafeReport;
  markdown: string;
}

export interface DailyPlatformOpsGateStepView {
  exists: boolean;
  status: "pass" | "fail" | "missing" | "error";
  label: string;
  passed?: boolean | null;
  durationMs?: number | null;
  summaryStatus?: string | null;
  blockingReasons: string[];
  warnings: string[];
  freshness?: DataFreshnessTimelineView;
}

export interface DailyPlatformOpsGateTrustedAuditView extends DailyPlatformOpsGateStepView {
  trustedContentCount: number;
  trustedMetricSnapshotCount: number;
  views: number;
  engagement: number;
  mismatchCount: number;
  mismatches: string[];
  dashboardInput?: string | null;
  latestAuditAt?: string | null;
}

export interface DailyPlatformOpsGateView {
  reportPath: string;
  exists: boolean;
  status: "pass" | "fail" | "missing" | "error";
  passed?: boolean | null;
  generatedAt?: string | null;
  completedAllSteps?: boolean | null;
  blockingReasons: string[];
  warnings: string[];
  freshness: DataFreshnessTimelineView;
  healthGate: DailyPlatformOpsGateStepView;
  trustedAudit: DailyPlatformOpsGateTrustedAuditView;
  message?: string;
}

export interface DailySelfMediaOpsStepView {
  key: "local_server_health_preflight" | "platform_data_health" | "real_capture_freshness" | "trusted_weekly_safe" | "trusted_dashboard_audit" | "daily_platform_ops_gate";
  label: string;
  status: "pass" | "fail" | "missing" | "error";
  passed?: boolean | null;
  exitCode?: number | null;
  durationMs?: number | null;
  command?: string | null;
  reportPath?: string | null;
  summaryStatus?: string | null;
}

export interface DailySelfMediaOpsPreflightView {
  enabled: boolean;
  status: "disabled" | "pass" | "fail" | "missing" | "error";
  passed?: boolean | null;
  preferredDashboardUrl?: string | null;
  healthyPorts: number[];
  apiReadyPorts: number[];
  safeWeeklyReadyPorts: number[];
  trustedDataReadyPorts: number[];
  pageReadyPorts: number[];
  staleOrOldRoutePorts: number[];
}

export interface DailySelfMediaOpsView {
  reportPath: string;
  exists: boolean;
  status: "pass" | "warn" | "fail" | "missing" | "error";
  passed?: boolean | null;
  generatedAt?: string | null;
  command: string;
  defaultDashboardUrl: string;
  fallbackDashboardUrlHint: string;
  stepCount: number;
  plannedStepCount: number;
  completedAllSteps?: boolean | null;
  blockingReasons: string[];
  warnings: string[];
  nextActions: string[];
  preflightHealth: DailySelfMediaOpsPreflightView;
  steps: DailySelfMediaOpsStepView[];
  safeWeeklyRedactedPaths: {
    json: string;
    markdown: string;
  };
  scope: {
    serialExecution: boolean | null;
    noCollection: boolean | null;
    browserOpened: boolean | null;
    platformLoginOpened: boolean | null;
    databaseDeletion: boolean | null;
    wechatPaused: boolean | null;
    bilibiliAccountMetricsSaved: boolean | null;
    commandOutputStored: boolean | null;
    trustedWeeklyRedactedOnly: boolean | null;
  };
  message?: string;
}

export interface TopicIdea {
  id: string;
  title: string;
  source: ImportSource;
  platform: Platform;
  confidence: number;
  status: "new" | "selected" | "discarded" | "produced";
  rationale: string;
  nextAction?: string;
  createdAt?: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  platform: Platform;
  handle: string;
  strength: string;
  observedPattern: string;
}

export interface Experiment {
  id: string;
  title: string;
  hypothesis: string;
  status: "planned" | "running" | "done";
  result?: string;
}

export interface Contact {
  id: string;
  name: string;
  channel: string;
  relationship: "new" | "warm" | "client" | "partner";
  note: string;
}

export interface MonetizationLead {
  id: string;
  contactId?: string;
  source: string;
  status: "new" | "follow_up" | "contacted" | "proposal" | "won" | "lost";
  valueEstimate: number;
  nextAction: string;
  demand?: string;
  lastContactedAt?: string;
  updatedAt?: string;
}

export interface ImportRun {
  id: string;
  source: ImportSource;
  status: "pending" | "success" | "failed";
  importedCount: number;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  traceId?: string;
  warnings?: string[];
  provenance?: ImportProvenanceMetadata;
  dataDomain?: Extract<ContentDataDomain, "imported_metric" | "demo_seed" | "acceptance_run" | "user_work">;
}

export interface PlatformImportStatus {
  source: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center">;
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  label: string;
  latestRunId?: string;
  latestRunAt?: string;
  latestSource?: ImportSource;
  latestStatus: ImportRun["status"] | "never";
  importedCount: number;
  contentCount: number;
  metricCount: number;
  enteredDashboardReview: boolean;
  lastMessage?: string;
}

export type PlatformReadinessStage = "closed_loop" | "preview_ready" | "discovery_only" | "paused";

export interface PlatformReadinessStatus {
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili" | "wechat">;
  label: string;
  stage: PlatformReadinessStage;
  stageLabel: string;
  discoveryStatus: string;
  mappingStatus: string;
  saveStatus: string;
  dashboardReviewStatus: string;
  operationsStatus: string;
  evidenceFile: string;
  nextStep: string;
  source?: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center" | "wechat_official">;
  latestRunAt?: string;
  latestStatus?: ImportRun["status"] | "never";
  contentCount: number;
  metricCount: number;
  enteredDashboardReview: boolean;
}

export type PlatformImportOperationPlatform = "douyin" | "xiaohongshu" | "video-account" | "bilibili";

export type PlatformImportOperationAction = "preview" | "save" | "save_smoke";

export interface PlatformImportOperationCapability {
  key: PlatformImportOperationPlatform;
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  label: string;
  source: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center">;
  discoverCommand: string;
  previewEnabled: boolean;
  saveEnabled: boolean;
  saveSmokeEnabled: boolean;
  disabledReason?: string;
  nextHandoff?: string;
}

export interface PlatformImportOperationRequest {
  action: PlatformImportOperationAction;
  platform?: PlatformImportOperationPlatform | "all";
}

export interface PlatformImportOperationSummary {
  platform: PlatformImportOperationPlatform;
  source: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center">;
  label: string;
  contentCount: number;
  metricCount: number;
  warnings: string[];
  runId: string;
  passed: boolean;
  errorMessage?: string;
  rawDir?: string;
  discoverCommand?: string;
  provenance?: ImportProvenanceMetadata;
}

export interface OperationHistory {
  id: string;
  actor: "local_user" | "system";
  action: PlatformImportOperationAction;
  platform: PlatformImportOperationPlatform;
  source: Extract<ImportSource, "douyin_creator_center" | "xiaohongshu_creator_center" | "video_account_creator_center" | "bilibili_creator_center">;
  status: "success" | "failed" | "disabled";
  contentCount: number;
  metricCount: number;
  warningCount: number;
  warningSummary: string;
  runId: string;
  provenance?: ImportProvenanceMetadata;
  createdAt: string;
  dataDomain?: Extract<ContentDataDomain, "system_log">;
}

export interface PlatformImportOperationResult {
  action: PlatformImportOperationAction;
  platform: PlatformImportOperationPlatform | "all";
  runId: string;
  passed: boolean;
  summaries: PlatformImportOperationSummary[];
  warnings: string[];
}

export type AuthedBrowserPlatform = Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;

export type AuthedBrowserProfileState = "not_opened" | "waiting_login" | "session_maybe_available" | "session_expired" | "capture_failed";

export interface AuthedBrowserProfileConfig {
  platform: AuthedBrowserPlatform;
  key: PlatformImportOperationPlatform;
  label: string;
  startUrl: string;
  allowedHosts: string[];
  sessionTtlHours: number;
  captureMvpEnabled: boolean;
  profileDirRef: string;
}

export interface AuthedBrowserProfileStatus {
  platform: AuthedBrowserPlatform;
  key: PlatformImportOperationPlatform;
  label: string;
  startUrl: string;
  profileDirRef: string;
  profileExists: boolean;
  state: AuthedBrowserProfileState;
  stateLabel: string;
  nextAction: string;
  lastOpenedAt?: string;
  lastUserConfirmedLoginAt?: string;
  lastCaptureFailureAt?: string;
  failureMessage?: string;
  sessionTtlHours: number;
  captureMvpEnabled: boolean;
  safety: {
    profileOnlyInLocal: true;
    noCookieTokenHeaderInBusinessDb: true;
    noStorageStateExport: true;
    noSensitiveLoginMaterialInDocsTestsOrGit: true;
  };
}

export interface AuthedBrowserProfileStatusView {
  generatedAt: string;
  profiles: AuthedBrowserProfileStatus[];
  safety: {
    baseDirRef: ".local/browser-profiles";
    noCookieTokenHeaderInBusinessDb: true;
    localProfilesIgnoredByGit: true;
    wechatPaused: true;
    bilibiliAccountMetricsPreviewOnly: true;
  };
}

export interface AuthedBrowserProfileRequest {
  platform: AuthedBrowserPlatform | PlatformImportOperationPlatform;
  target?: AuthedBrowserCaptureTarget;
}

export interface AuthedBrowserProfileActionResult {
  ok: boolean;
  action: "open" | "confirm_login" | "status" | "record_failure";
  status: AuthedBrowserProfileStatus;
  message: string;
  warnings: string[];
}

export type AuthedBrowserAutoRefreshPlatformResultStatus = "needs_login" | "preview_ready" | "needs_content_page" | "unsupported" | "failed";

export interface AuthedBrowserAutoRefreshPlatformResult {
  platform: AuthedBrowserPlatform;
  key: PlatformImportOperationPlatform;
  label: string;
  status: AuthedBrowserAutoRefreshPlatformResultStatus;
  statusLabel: string;
  message: string;
  nextAction: string;
  attemptedPreview: boolean;
  openedWindow: boolean;
  contentCount: number;
  metricCount: number;
  profileState: AuthedBrowserProfileState;
  preview?: DouyinAuthedBrowserCaptureResult | XiaohongshuAuthedBrowserCaptureResult;
  warnings: string[];
}

export interface AuthedBrowserAutoRefreshRequest {
  platforms?: Array<AuthedBrowserPlatform | PlatformImportOperationPlatform> | "all";
  autoOpen?: boolean;
  trigger?: "startup" | "manual" | "focus_return";
}

export interface AuthedBrowserAutoRefreshResult {
  ok: boolean;
  generatedAt: string;
  mode: "user_triggered_preview_only";
  trigger: "startup" | "manual" | "focus_return";
  summary: string;
  autoOpenEnabled: boolean;
  openedWindowCount: number;
  results: AuthedBrowserAutoRefreshPlatformResult[];
  safety: {
    previewOnly: true;
    userMustConfirmSave: true;
    noSilentBackgroundCapture: true;
    noSensitiveLoginMaterialSaved: true;
    localExportFallbackOnly: true;
    wechatPaused: true;
    bilibiliAccountMetricsPreviewOnly: true;
  };
}

export type DouyinAuthedBrowserCaptureAction = "open" | "status" | "capture_preview" | "open_first_visible_detail" | "capture_current_detail_preview" | "save" | "close";
export type AuthedBrowserCaptureTarget = "default" | "works_page";
export type AuthedBrowserSourcePageKind = "creator_center_owned_works" | "creator_center_owned_detail" | "creator_center_data_analysis_table" | "creator_center_unknown" | "public_creator_home" | "public_or_wrong_page";
export type AuthedBrowserRowConfidence = "owned_creator_center_row" | "owned_creator_center_detail" | "owned_creator_center_data_analysis_table" | "fallback_visible_card" | "unknown";
export type AuthedBrowserNativeIdConfidence = "stable_platform_id" | "visible_platform_id" | "fallback_text_hash" | "missing";

export type DouyinAuthedBrowserLoginState = "not_opened" | "needs_login" | "user_confirmed" | "logged_in_or_accessible" | "unknown" | "closed" | "error";

export interface DouyinBrowserVisibleRow {
  id: string;
  nativeId?: string;
  title: string;
  publishedAt?: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  itemUrl?: string;
  extractionSource: "visible_dom";
  sourcePageKind: AuthedBrowserSourcePageKind;
  confidence: AuthedBrowserRowConfidence;
  nativeIdConfidence: AuthedBrowserNativeIdConfidence;
  warnings: string[];
}

export interface DouyinAuthedBrowserCaptureRequest {
  action: DouyinAuthedBrowserCaptureAction;
  target?: AuthedBrowserCaptureTarget;
  userConfirmedLogin?: boolean;
  userConfirmedContentMetrics?: boolean;
}

export interface DouyinAuthedBrowserCaptureResult {
  action: DouyinAuthedBrowserCaptureAction;
  ok: boolean;
  loginState: DouyinAuthedBrowserLoginState;
  browserOpened: boolean;
  pageUrl?: string;
  openedAt?: string;
  capturedAt?: string;
  rows: DouyinBrowserVisibleRow[];
  contentCount: number;
  metricCount: number;
  saveCandidateCount?: number;
  importRunId?: string;
  dashboardUrl?: string;
  message: string;
  warnings: string[];
  safety: {
    noPasswordSaved: true;
    noCookieTokenHeaderSaved: true;
    noRawRequestSaved: true;
    contentLevelOnly: true;
    accountMetricsExcluded: true;
  };
}

export type XiaohongshuAuthedBrowserCaptureAction = "open" | "status" | "capture_preview" | "open_first_visible_detail" | "capture_current_detail_preview" | "diagnose_data_analysis_table" | "save" | "close";

export type XiaohongshuAuthedBrowserLoginState = "not_opened" | "needs_login" | "user_confirmed" | "logged_in_or_accessible" | "wrong_page" | "unknown" | "closed" | "error";

export interface XiaohongshuBrowserVisibleRow {
  id: string;
  nativeId?: string;
  title: string;
  publishedAt?: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  followersDelta: number;
  exposures?: number;
  coverClickRate?: number;
  metricColumns?: string[];
  missingMetricColumns?: string[];
  noteUrl?: string;
  format: "image_text" | "short_video";
  extractionSource: "visible_dom";
  sourcePageKind: AuthedBrowserSourcePageKind;
  confidence: AuthedBrowserRowConfidence;
  nativeIdConfidence: AuthedBrowserNativeIdConfidence;
  warnings: string[];
}

export interface XiaohongshuAuthedBrowserCaptureRequest {
  action: XiaohongshuAuthedBrowserCaptureAction;
  target?: AuthedBrowserCaptureTarget;
  userConfirmedLogin?: boolean;
  userConfirmedContentMetrics?: boolean;
  selectedNativeIds?: string[];
}

export interface XiaohongshuAuthedBrowserCaptureResult {
  action: XiaohongshuAuthedBrowserCaptureAction;
  ok: boolean;
  loginState: XiaohongshuAuthedBrowserLoginState;
  browserOpened: boolean;
  pageUrl?: string;
  openedAt?: string;
  capturedAt?: string;
  rows: XiaohongshuBrowserVisibleRow[];
  contentCount: number;
  metricCount: number;
  saveCandidateCount?: number;
  importRunId?: string;
  dashboardUrl?: string;
  message: string;
  warnings: string[];
  safety: {
    noPasswordSaved: true;
    noCookieTokenHeaderSaved: true;
    noRawRequestSaved: true;
    contentLevelOnly: true;
    publicRecommendationExcluded: true;
  };
}

export type PublishQueueStatus = "draft" | "needs_review" | "queued" | "scheduled" | "publishing" | "published" | "failed" | "blocked";

export interface PublishQueueItem {
  id: string;
  contentId: string;
  platform: Platform;
  status: PublishQueueStatus;
  scheduledAt: string;
  failureReason?: string;
  nextAction?: string;
  updatedAt?: string;
}

export interface ReviewAction {
  id: string;
  title: string;
  owner: "creator" | "agent" | "system";
  priority: "high" | "medium" | "low";
  due?: string;
}

export interface ReviewInsight {
  id: string;
  title: string;
  evidence: string;
  recommendation: string;
}

export interface ReviewReport {
  id: string;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  summary: string;
  markdown: string;
  metrics: {
    contentCount: number;
    totalViews: number;
    totalLikes: number;
    totalEngagement: number;
    bestPlatform: Platform;
  };
  insights: ReviewInsight[];
  actions: ReviewAction[];
}

export interface EvidenceRef {
  type: "content" | "platform_version" | "metric_snapshot" | "review" | "action_item" | "lead";
  id: string;
}

export interface EvidenceInsight {
  id: string;
  title: string;
  finding: string;
  evidenceRefs: EvidenceRef[];
}

export interface ReviewActionItem {
  id: string;
  reviewId?: string;
  sourceSuggestionId?: string;
  suggestionType?: PostImportActionSuggestionType;
  title: string;
  status: ReviewActionStatus;
  priority: "high" | "medium" | "low";
  relatedType?: EvidenceRef["type"];
  relatedId?: string;
  nextAction?: string;
  evidence?: PostImportActionEvidence[];
  contentDraftId?: string;
  platformVersionId?: string;
  publishQueueItemId?: string;
  contentWorkflowStatus?: "draft_created" | "scheduled";
  contentWorkflowUpdatedAt?: string;
  updatedAt: string;
}

export interface SavedReview {
  id: string;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  markdown: string;
  summary: string;
  metrics: ReviewReport["metrics"];
  contentIds: string[];
  platformVersionIds: string[];
  metricSnapshotIds: string[];
  leadIds: string[];
  actionItemIds: string[];
  insights: EvidenceInsight[];
  createdAt: string;
}

export interface AutomationRun {
  id: string;
  kind: "manual_import" | "n8n_import" | "local_runner";
  status: AutomationRunStatus;
  traceId: string;
  retryCount: number;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  source?: ImportSource | "manual";
}

export interface WorkbenchLog {
  id: string;
  level: LogLevel;
  event: string;
  scope: "provider" | "repo" | "service" | "runtime" | "ui" | "audit";
  message: string;
  createdAt: string;
  traceId: string;
  data?: Record<string, unknown>;
  dataDomain?: Extract<ContentDataDomain, "system_log">;
}

export interface AuditRecord {
  id: string;
  target: string;
  status: "pass" | "warn" | "fail";
  finding: string;
  createdAt: string;
  dataDomain?: Extract<ContentDataDomain, "system_log">;
  dataDomainUpdatedAt?: string;
  dataDomainReason?: string;
}

export type PlatformDataHealthStatus = "ok" | "warn" | "error" | "missing";

export interface PlatformDataHealthCheckView {
  exists: boolean;
  status: Exclude<PlatformDataHealthStatus, "missing">;
  generatedAt?: string | null;
  isStale?: boolean | null;
  sourceMatches?: boolean | null;
  source?: string | null;
}

export interface PlatformDataHealthPlatformView {
  platform: "douyin" | "xiaohongshu" | "video-account" | "bilibili";
  label: string;
  status: Exclude<PlatformDataHealthStatus, "missing">;
  realCaptureStatus: RealCaptureFreshnessStatus;
  rawCaptureCount: number;
  rawStatus: Exclude<PlatformDataHealthStatus, "missing">;
  rawLatestModifiedAt?: string | null;
  mappingPreview: PlatformDataHealthCheckView & { contentCount?: number | null; metricCount?: number | null; previewOnly?: boolean | null; saved?: boolean | null };
  saveSmoke: PlatformDataHealthCheckView & { passed?: boolean | null; contentCount?: number | null; metricCount?: number | null };
  latestGeneratedAt?: string | null;
  freshness: DataFreshnessTimelineView;
  nextAction: string;
  commands: PlatformAssistedRefreshCommands;
  warnings: string[];
}

export interface PlatformDataHealthView {
  reportPath: string;
  exists: boolean;
  status: PlatformDataHealthStatus;
  generatedAt?: string | null;
  staleAfterHours?: number | null;
  summary: {
    platformCount: number;
    okCount: number;
    warnCount: number;
    errorCount: number;
    missingCount: number;
    staleCount: number;
    realCaptureStaleCount: number;
    sourceMismatchCount: number;
    bilibiliPreviewOnlyOk: boolean | null;
    freshness: DataFreshnessTimelineView;
  };
  platforms: PlatformDataHealthPlatformView[];
  bilibiliAccount: {
    status: Exclude<PlatformDataHealthStatus, "missing">;
    latestGeneratedAt?: string | null;
    accountPreview: PlatformDataHealthCheckView & {
      candidateCount?: number | null;
      previewOnly?: boolean | null;
      saved?: boolean | null;
      previewOnlyOk?: boolean | null;
    };
    warnings: string[];
  } | null;
  message?: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  accounts: PlatformAccount[];
  contents: ContentItem[];
  metrics: PlatformMetric[];
  ideas: TopicIdea[];
  competitors: CompetitorProfile[];
  experiments: Experiment[];
  contacts: Contact[];
  leads: MonetizationLead[];
  imports: ImportRun[];
  operationHistory: OperationHistory[];
  platformImportStatuses: PlatformImportStatus[];
  platformImportOperationCapabilities: PlatformImportOperationCapability[];
  platformReadinessStatuses: PlatformReadinessStatus[];
  platformDataHealth: PlatformDataHealthView;
  dataCaptureScheduleReliability: DataCaptureScheduleReliabilityView;
  trustedAutoCaptureScheduler: TrustedAutoCaptureSchedulerView;
  realDataScope: RealDataScopeSummary;
  trustedOperatingStatus: TrustedOperatingStatus;
  trustedWeeklySummary: TrustedWeeklyReportSummary;
  dailyPlatformOpsGate: DailyPlatformOpsGateView;
  dailySelfMediaOps: DailySelfMediaOpsView;
  trustedScopeCuration: TrustedScopeCurationSummary;
  queue: PublishQueueItem[];
  platformVersions: ContentPlatformVersion[];
  calendarItems: PublishCalendarItem[];
  publishRecords: PublishRecord[];
  metricSnapshots: MetricSnapshot[];
  metricSourceGroups: MetricSnapshotSourceGroup[];
  metricPlatformGroups: MetricSnapshotPlatformGroup[];
  accountMetricSnapshots: AccountMetricSnapshot[];
  accountMetricGroups: AccountMetricGroup[];
  postImportActionSuggestions: PostImportActionSuggestion[];
  savedReviews: SavedReview[];
  actionItems: ReviewActionItem[];
  automationRuns: AutomationRun[];
  evidenceInsights: EvidenceInsight[];
  weeklyReview: ReviewReport;
  monthlyReview: ReviewReport;
  logs: WorkbenchLog[];
  audits: AuditRecord[];
  publishToMetricsWorkbench: PublishToMetricsWorkbench;
}

export interface ProviderImportPayload {
  source: ImportSource;
  contents: ContentItem[];
  metrics: PlatformMetric[];
  ideas?: TopicIdea[];
  competitors?: CompetitorProfile[];
  contacts?: Contact[];
  leads?: MonetizationLead[];
  warnings?: string[];
  provenance?: ImportProvenanceMetadata;
}

export interface WorkbenchError {
  kind: WorkbenchErrorKind;
  message: string;
  traceId: string;
  cause?: string;
}

export interface ContentTrustScopePatchRequest {
  contentId: string;
  userExcludedFromTrustedScope: boolean;
  actor?: string;
}

export interface ImportRequest {
  mode: "csv" | "json" | "manual" | "mediacrawler" | "n8n" | "platform_local_file";
  preset?: CsvImportPreset;
  csv?: string;
  json?: unknown;
  platformLocalFile?: {
    platform: "douyin" | "xiaohongshu" | "bilibili";
    csv?: string;
    fileBase64?: string;
    fileName?: string;
    contentType?: string;
  };
  manual?: {
    title: string;
    platform: Platform;
    format: ContentItem["format"];
    topic: string;
    status?: ContentStatus;
    publishedAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    followersDelta?: number;
  };
}

export interface ImportResult {
  run: ImportRun;
  traceId: string;
}

export interface ImportPreviewItem {
  id: string;
  title: string;
  platform: Platform;
  kind: ImportDiffKind;
  reason?: string;
}

export type ImportMappingConfidence = "confirmed_official" | "mature_reference" | "draft_realistic" | "confirmed_sampled";

export interface RealImportPreviewRow {
  rowNumber: number;
  platform: Platform;
  normalized: {
    id?: string;
    title?: string;
    publishedAt?: string;
    capturedAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    followersDelta?: number;
  };
  nativeMetrics: Record<string, unknown>;
  rawFields: Record<string, unknown>;
  mappingConfidence: ImportMappingConfidence;
  warnings: string[];
  previewDedupeKey: string;
  canConfirmSave: boolean;
}

export interface ImportPreviewResult {
  traceId: string;
  source: ImportSource;
  importedCount: number;
  contentCount: number;
  metricCount: number;
  ideaCount: number;
  duplicateContentIds: string[];
  diff: ImportPreviewItem[];
  warnings: string[];
  items: ImportPreviewItem[];
  realPreviewRows?: RealImportPreviewRow[];
}

export interface ContentPlatformVersionRequest {
  id?: string;
  contentId: string;
  platform: Platform;
  title: string;
  body?: string;
  script?: string;
  coverNote?: string;
  tags?: string[];
  platformAdvice?: string;
  scheduledAt?: string;
  status?: PlatformVersionStatus;
  nextAction?: string;
  checklist?: Partial<PlatformChecklist>;
}

export interface CreatorVideoIdeaRequest {
  title: string;
  topic: string;
  brief: string;
  scriptNotes?: string;
  materialNotes?: string;
  scheduledAt?: string;
  revisionPrompt?: string;
  copilotAnalysis?: string;
  acceptanceRunId?: string;
  dataDomain?: Extract<ContentDataDomain, "user_work" | "acceptance_run">;
}

export interface CreatorPlatformDraft {
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  title: string;
  body: string;
  tags: string[];
  coverNote: string;
  platformAdvice: string;
  incentiveTagAdvice: string;
}

export interface CreatorVideoDiscussionRequest {
  title?: string;
  topic?: string;
  brief: string;
  scriptNotes?: string;
  materialNotes?: string;
  scheduledAt?: string;
  revisionPrompt?: string;
  previousAnalysis?: string;
  acceptanceRunId?: string;
  dataDomain?: Extract<ContentDataDomain, "user_work" | "acceptance_run">;
}

export interface CreatorPlatformDifference {
  platform: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  focus: string;
  format: string;
  adjustment: string;
  manualCheck: string;
}

export interface CreatorPublishPlan {
  scheduledAt?: string;
  planSummary: string;
  checklist: string[];
}

export interface CreatorVideoDiscussionResult {
  idea: CreatorVideoIdeaRequest;
  analysis: {
    direction: string;
    audience: string;
    tone: string;
    duration: string;
    structure: string[];
    risks: string[];
  };
  platformDifferences: CreatorPlatformDifference[];
  drafts: CreatorPlatformDraft[];
  publishPlan: CreatorPublishPlan;
  revisionPrompt?: string;
  traceId: string;
}

export interface CreatorVideoDraftResult {
  content: ContentItem;
  platformVersions: ContentPlatformVersion[];
  queueItems: PublishQueueItem[];
  drafts: CreatorPlatformDraft[];
  traceId: string;
}

export interface ContentDraftReviewRequest {
  contentId: string;
  platformVersionId?: string;
  publishQueueItemId?: string;
  title?: string;
  body?: string;
  topic?: string;
  scheduledAt?: string;
  status?: PlatformVersionStatus;
  nextAction?: string;
  checklist?: Partial<PlatformChecklist>;
}

export interface ContentDraftReviewResult {
  content: ContentItem;
  platformVersion: ContentPlatformVersion;
  queue?: PublishQueueItem;
  actionItem?: ReviewActionItem;
  traceId: string;
}

export interface PlatformVersionPatchRequest {
  id: string;
  status?: PlatformVersionStatus;
  title?: string;
  body?: string;
  script?: string;
  coverNote?: string;
  tags?: string[];
  platformAdvice?: string;
  scheduledAt?: string;
  publishedAt?: string;
  failureReason?: string;
  nextAction?: string;
  checklist?: Partial<PlatformChecklist>;
}

export interface ConfirmPlatformVersionPublishRequest {
  platformVersionId: string;
  status: "submitted_review" | "published" | "failed" | "blocked";
  happenedAt?: string;
  note?: string;
  failureReason?: string;
  platformPostId?: string;
  platformUrl?: string;
  confirmationSource?: "manual" | "provider" | "import";
  providerRunId?: string;
  confirmedBy?: string;
  idempotencyKey?: string;
}

export interface ConfirmPlatformVersionPublishResult {
  version: ContentPlatformVersion;
  publishRecord: PublishRecord;
  traceId: string;
  idempotent: boolean;
}

export interface ConfirmPlatformContentMatchRequest {
  localContentId: string;
  localPlatformVersionId: string;
  importedContentId: string;
  metricSnapshotIds?: string[];
  confirmedBy?: string;
}

export interface ConfirmPlatformContentMatchResult {
  content: ContentItem;
  platformVersion: ContentPlatformVersion;
  metricSnapshots: MetricSnapshot[];
  importedContent: ContentItem;
  traceId: string;
}

export interface CalendarQuery {
  view?: CalendarView;
  platform?: Platform;
  status?: PlatformVersionStatus;
}

export interface ClearFutureScheduleResult {
  clearedPlatformVersionCount: number;
  clearedQueueCount: number;
  preservedPublishRecordCount: number;
  preservedMetricSnapshotCount: number;
  traceId: string;
}

export interface MetricSnapshotRequest {
  platformVersionId: string;
  snapshotDate: string;
  views: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  followersDelta?: number;
  source?: ImportSource | "manual";
  provenance?: ImportProvenanceMetadata;
}

export interface SaveReviewRequest {
  period: "weekly" | "monthly";
}

export interface ActionItemFromSuggestionRequest {
  suggestionId: string;
}

export interface ActionItemPatchRequest {
  id: string;
  status: ReviewActionStatus;
  nextAction?: string;
}

export interface ActionItemToContentRequest {
  id: string;
  platform?: Extract<Platform, "douyin" | "xiaohongshu" | "video_account" | "bilibili">;
  scheduledAt?: string;
}

export interface ActionItemToContentResult {
  actionItem: ReviewActionItem;
  content: ContentItem;
  platformVersion: ContentPlatformVersion;
  queue: PublishQueueItem;
  traceId: string;
  idempotent: boolean;
}

export interface LeadPatchRequest {
  id: string;
  status: MonetizationLead["status"];
  nextAction?: string;
}

export interface AutomationRunRequest {
  kind: AutomationRun["kind"];
  status?: AutomationRunStatus;
  source?: ImportSource | "manual";
  errorMessage?: string;
}

export interface WechatArticleSummaryRow {
  ref_date: string;
  msgid?: string;
  title?: string;
  int_page_read_user?: number;
  int_page_read_count?: number;
  ori_page_read_user?: number;
  ori_page_read_count?: number;
  share_user?: number;
  share_count?: number;
  add_to_fav_user?: number;
  add_to_fav_count?: number;
}

export interface WechatUserSummaryRow {
  ref_date: string;
  user_source?: number;
  new_user?: number;
  cancel_user?: number;
}

export interface WechatOfficialSyncRequest {
  beginDate: string;
  endDate: string;
  accountId?: string;
}

export interface WechatOfficialSyncResult {
  importResult: ImportResult;
  articleRows: number;
  userRows: number;
  contentIds: string[];
  snapshotIds: string[];
  traceId: string;
  warnings: string[];
}

export interface IdeaCreateRequest {
  title: string;
  platform: Platform;
  source?: ImportSource;
  confidence?: number;
  rationale: string;
  nextAction?: string;
}

export interface IdeaStatusRequest {
  id: string;
  status: TopicIdea["status"];
}

export interface IdeaToContentRequest {
  id: string;
  scheduledAt?: string;
}

export interface IdeaToContentResult {
  idea: TopicIdea;
  content: ContentItem;
  queue: PublishQueueItem;
  traceId: string;
}

export interface LeadCreateRequest {
  source: string;
  demand: string;
  nextAction: string;
  valueEstimate: number;
  status?: MonetizationLead["status"];
}

export interface PublishQueueTransitionRequest {
  id: string;
  status: PublishQueueStatus;
  failureReason?: string;
  nextAction?: string;
}

export interface PublishQueueTransitionResult {
  item?: PublishQueueItem;
  traceId: string;
  ok: boolean;
  errorMessage?: string;
}
