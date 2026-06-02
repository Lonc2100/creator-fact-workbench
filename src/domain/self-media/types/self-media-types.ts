export type Platform = "douyin" | "xiaohongshu" | "wechat" | "video_account" | "bilibili" | "other";

export type ContentStatus = "idea" | "draft" | "scheduled" | "published" | "reviewed";

export type ImportSource = "manual" | "csv" | "json" | "fake" | "mediacrawler" | "n8n";

export type CsvImportPreset = "generic" | "douyin" | "xiaohongshu" | "wechat" | "video_account" | "bilibili";

export type WorkbenchErrorKind = "validation" | "provider" | "persistence" | "analysis" | "unknown";

export type LogLevel = "info" | "warn" | "error";

export type PlatformVersionStatus = "draft" | "needs_review" | "scheduled" | "published" | "failed" | "blocked";

export type CalendarView = "week" | "month";

export type ImportDiffKind = "new" | "update" | "duplicate" | "conflict" | "invalid";

export type ReviewActionStatus = "todo" | "doing" | "done" | "dropped";

export type AutomationRunStatus = "pending" | "running" | "success" | "failed" | "retrying";

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

export interface PublishRecord {
  id: string;
  platformVersionId: string;
  contentId: string;
  platform: Platform;
  status: "published" | "failed" | "blocked" | "confirmed";
  happenedAt: string;
  note?: string;
  traceId: string;
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
  updatedAt: string;
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
  title: string;
  status: ReviewActionStatus;
  priority: "high" | "medium" | "low";
  relatedType?: EvidenceRef["type"];
  relatedId?: string;
  nextAction?: string;
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
}

export interface AuditRecord {
  id: string;
  target: string;
  status: "pass" | "warn" | "fail";
  finding: string;
  createdAt: string;
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
  queue: PublishQueueItem[];
  platformVersions: ContentPlatformVersion[];
  calendarItems: PublishCalendarItem[];
  publishRecords: PublishRecord[];
  metricSnapshots: MetricSnapshot[];
  savedReviews: SavedReview[];
  actionItems: ReviewActionItem[];
  automationRuns: AutomationRun[];
  evidenceInsights: EvidenceInsight[];
  weeklyReview: ReviewReport;
  monthlyReview: ReviewReport;
  logs: WorkbenchLog[];
  audits: AuditRecord[];
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
}

export interface WorkbenchError {
  kind: WorkbenchErrorKind;
  message: string;
  traceId: string;
  cause?: string;
}

export interface ImportRequest {
  mode: "csv" | "json" | "manual" | "mediacrawler" | "n8n";
  preset?: CsvImportPreset;
  csv?: string;
  json?: unknown;
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
}

export interface ContentPlatformVersionRequest {
  id?: string;
  contentId: string;
  platform: Platform;
  title: string;
  body?: string;
  script?: string;
  coverNote?: string;
  scheduledAt?: string;
  status?: PlatformVersionStatus;
  nextAction?: string;
  checklist?: Partial<PlatformChecklist>;
}

export interface PlatformVersionPatchRequest {
  id: string;
  status?: PlatformVersionStatus;
  title?: string;
  body?: string;
  script?: string;
  coverNote?: string;
  scheduledAt?: string;
  publishedAt?: string;
  failureReason?: string;
  nextAction?: string;
  checklist?: Partial<PlatformChecklist>;
}

export interface CalendarQuery {
  view?: CalendarView;
  platform?: Platform;
  status?: PlatformVersionStatus;
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
}

export interface SaveReviewRequest {
  period: "weekly" | "monthly";
}

export interface ActionItemPatchRequest {
  id: string;
  status: ReviewActionStatus;
  nextAction?: string;
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
