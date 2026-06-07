import type { AuthedBrowserProfileConfig, Platform, PlatformImportOperationCapability, PlatformImportStatus, PlatformReadinessStage, PlatformReadinessStatus } from "../types";

export const selfMediaPlatforms: Array<{ id: Platform; label: string; tone: string }> = [
  { id: "douyin", label: "抖音", tone: "强钩子、强节奏、短句表达" },
  { id: "xiaohongshu", label: "小红书", tone: "经验感、清单感、可收藏" },
  { id: "wechat", label: "公众号", tone: "结构化、观点完整、可沉淀" },
  { id: "video_account", label: "视频号", tone: "可信任、关系链传播、真人表达" },
  { id: "bilibili", label: "B站", tone: "解释充分、过程透明、学习价值" },
  { id: "other", label: "其他", tone: "按目标平台调整" }
];

export const reviewThresholds = {
  lowCadenceWarning: 4,
  highEngagementRate: 0.08,
  leadFollowUpDays: 3
};

export const workbenchDbPath = ".local/self-media.sqlite";
export const cleanWorkbenchDbPath = ".local/self-media-clean.sqlite";

export type SelfMediaLocalProfile = "dirty" | "clean";
export type SelfMediaSeedMode = "demo" | "off";

export function resolveSelfMediaLocalProfile(): SelfMediaLocalProfile {
  const value = process.env.SELF_MEDIA_PROFILE?.trim().toLowerCase();
  return value === "clean" ? "clean" : "dirty";
}

export function resolveWorkbenchDbPath() {
  const explicitPath = process.env.SELF_MEDIA_DB_PATH?.trim();
  if (explicitPath) return explicitPath;
  return resolveSelfMediaLocalProfile() === "clean" ? cleanWorkbenchDbPath : workbenchDbPath;
}

export function resolveSelfMediaSeedMode(): SelfMediaSeedMode {
  const value = process.env.SELF_MEDIA_SEED_MODE?.trim().toLowerCase();
  if (value && ["0", "false", "off", "none", "disabled", "seed-free"].includes(value)) return "off";
  if (value && ["1", "true", "on", "demo", "sample"].includes(value)) return "demo";
  return resolveSelfMediaLocalProfile() === "clean" ? "off" : "demo";
}

export function shouldSeedSelfMediaDemoData() {
  return resolveSelfMediaSeedMode() === "demo";
}

export const platformReadinessStageLabels: Record<PlatformReadinessStage, string> = {
  closed_loop: "已闭环",
  preview_ready: "可预览",
  discovery_only: "仅发现",
  paused: "暂停"
};

export const platformReadinessDefinitions: Array<
  Omit<PlatformReadinessStatus, "stageLabel" | "latestRunAt" | "latestStatus" | "contentCount" | "metricCount" | "enteredDashboardReview">
> = [
  {
    platform: "douyin",
    label: "抖音",
    stage: "closed_loop",
    source: "douyin_creator_center",
    discoveryStatus: "已完成 real capture",
    mappingStatus: "V1 mapping 已接入",
    saveStatus: "已确认保存入库",
    dashboardReviewStatus: "已进入 dashboard/review",
    operationsStatus: "operations 可运行",
    evidenceFile: "PLATFORM-OPS-019-orchestrator-review.md",
    nextStep: "保持四平台保存烟测与 import status 可见。"
  },
  {
    platform: "xiaohongshu",
    label: "小红书",
    stage: "closed_loop",
    source: "xiaohongshu_creator_center",
    discoveryStatus: "已完成 real capture",
    mappingStatus: "V1 mapping 已接入",
    saveStatus: "已确认保存入库",
    dashboardReviewStatus: "已进入 dashboard/review",
    operationsStatus: "operations 可运行",
    evidenceFile: "PLATFORM-OPS-019-orchestrator-review.md",
    nextStep: "保持四平台保存烟测与 import status 可见。"
  },
  {
    platform: "video_account",
    label: "视频号",
    stage: "closed_loop",
    source: "video_account_creator_center",
    discoveryStatus: "已完成 real capture",
    mappingStatus: "V1 mapping 已接入",
    saveStatus: "已确认保存入库",
    dashboardReviewStatus: "已进入 dashboard/review",
    operationsStatus: "operations 可运行",
    evidenceFile: "PLATFORM-OPS-019-orchestrator-review.md",
    nextStep: "保持四平台保存烟测与 import status 可见。"
  },
  {
    platform: "bilibili",
    label: "B站",
    stage: "closed_loop",
    source: "bilibili_creator_center",
    discoveryStatus: "real discovery 已完成",
    mappingStatus: "V1 archives 内容级 mapping 已接入",
    saveStatus: "已确认 archives 内容级保存入库",
    dashboardReviewStatus: "archives 内容级指标进入 dashboard/review",
    operationsStatus: "operations 可运行",
    evidenceFile: "BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-orchestrator-review.md",
    nextStep: "保持 accountMetrics/dateKeyRows 诊断-only，后续另行评审账号级指标。"
  },
  {
    platform: "wechat",
    label: "公众号/微信后台",
    stage: "paused",
    source: "wechat_official",
    discoveryStatus: "后台发现暂停",
    mappingStatus: "不继续 V1 mapping",
    saveStatus: "不新增保存路径",
    dashboardReviewStatus: "仅保留历史数据展示",
    operationsStatus: "暂停入口",
    evidenceFile: "PLATFORM-PRIORITY-019-orchestrator-decision.md",
    nextStep: "除非用户明确重启，否则不继续公众号/微信后台。"
  }
];

export const platformImportStatusDefinitions: Array<Pick<PlatformImportStatus, "source" | "platform" | "label">> = [
  { source: "douyin_creator_center", platform: "douyin", label: "抖音创作者中心" },
  { source: "xiaohongshu_creator_center", platform: "xiaohongshu", label: "小红书创作中心" },
  { source: "video_account_creator_center", platform: "video_account", label: "视频号助手" },
  { source: "bilibili_creator_center", platform: "bilibili", label: "B站创作中心" }
];

export const platformImportOperationCapabilities: PlatformImportOperationCapability[] = [
  {
    key: "douyin",
    source: "douyin_creator_center",
    platform: "douyin",
    label: "抖音",
    discoverCommand: "npm run discover:douyin",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true
  },
  {
    key: "xiaohongshu",
    source: "xiaohongshu_creator_center",
    platform: "xiaohongshu",
    label: "小红书",
    discoverCommand: "npm run discover:xiaohongshu",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true
  },
  {
    key: "video-account",
    source: "video_account_creator_center",
    platform: "video_account",
    label: "视频号",
    discoverCommand: "npm run discover:video-account",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true
  },
  {
    key: "bilibili",
    source: "bilibili_creator_center",
    platform: "bilibili",
    label: "B站",
    discoverCommand: "npm run discover:bilibili",
    previewEnabled: true,
    saveEnabled: true,
    saveSmokeEnabled: true,
    nextHandoff: "BILIBILI-PERSONAL-V1-SAVE-SMOKE-022-orchestrator-review.md"
  }
];

export const authedBrowserProfileConfigs: AuthedBrowserProfileConfig[] = [
  {
    platform: "douyin",
    key: "douyin",
    label: "抖音",
    startUrl: "https://creator.douyin.com/creator-micro/content/manage",
    allowedHosts: ["creator.douyin.com", "www.douyin.com"],
    sessionTtlHours: 72,
    captureMvpEnabled: true,
    profileDirRef: ".local/browser-profiles/douyin"
  },
  {
    platform: "xiaohongshu",
    key: "xiaohongshu",
    label: "小红书",
    startUrl: "https://creator.xiaohongshu.com/",
    allowedHosts: ["creator.xiaohongshu.com", "www.xiaohongshu.com"],
    sessionTtlHours: 72,
    captureMvpEnabled: true,
    profileDirRef: ".local/browser-profiles/xiaohongshu"
  },
  {
    platform: "video_account",
    key: "video-account",
    label: "视频号",
    startUrl: "https://channels.weixin.qq.com/platform",
    allowedHosts: ["channels.weixin.qq.com"],
    sessionTtlHours: 72,
    captureMvpEnabled: false,
    profileDirRef: ".local/browser-profiles/video_account"
  },
  {
    platform: "bilibili",
    key: "bilibili",
    label: "B站",
    startUrl: "https://member.bilibili.com/platform/home",
    allowedHosts: ["member.bilibili.com", "www.bilibili.com"],
    sessionTtlHours: 72,
    captureMvpEnabled: false,
    profileDirRef: ".local/browser-profiles/bilibili"
  }
];
