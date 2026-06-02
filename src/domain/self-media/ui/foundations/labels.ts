import type { ContentStatus, ImportDiffKind, Platform, PlatformVersionStatus, PublishQueueStatus, ReviewActionStatus } from "../../types";

export const platformLabels: Record<Platform, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  wechat: "公众号",
  video_account: "视频号",
  bilibili: "B站",
  other: "其他"
};

export const platformShortLabels: Record<Platform, string> = {
  douyin: "抖",
  xiaohongshu: "红",
  wechat: "公",
  video_account: "视",
  bilibili: "B",
  other: "其"
};

export const platformTone: Record<Platform, string> = {
  douyin: "platform-douyin",
  xiaohongshu: "platform-xiaohongshu",
  wechat: "platform-wechat",
  video_account: "platform-video",
  bilibili: "platform-bilibili",
  other: "platform-other"
};

export const platformVersionStatusLabels: Record<PlatformVersionStatus, string> = {
  draft: "草稿",
  needs_review: "待审核",
  scheduled: "已排期",
  published: "已发布",
  failed: "失败",
  blocked: "阻塞"
};

export const queueStatusLabels: Record<PublishQueueStatus, string> = {
  draft: "草稿",
  needs_review: "待审核",
  queued: "队列中",
  scheduled: "已排期",
  publishing: "发布中",
  published: "已发布",
  failed: "失败",
  blocked: "阻塞"
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  idea: "选题",
  draft: "草稿",
  scheduled: "已排期",
  published: "已发布",
  reviewed: "已复盘"
};

export const actionStatusLabels: Record<ReviewActionStatus, string> = {
  todo: "待做",
  doing: "进行中",
  done: "已完成",
  dropped: "放弃"
};

export const diffKindLabels: Record<ImportDiffKind, string> = {
  new: "新增",
  update: "更新",
  duplicate: "重复",
  conflict: "冲突",
  invalid: "异常"
};

export function statusTone(status: PlatformVersionStatus | PublishQueueStatus | ReviewActionStatus | ImportDiffKind | ContentStatus) {
  if (["published", "done", "new"].includes(status)) return "success";
  if (["scheduled", "queued", "doing", "update", "reviewed"].includes(status)) return "info";
  if (["blocked", "needs_review", "conflict", "draft", "idea"].includes(status)) return "warning";
  if (["failed", "invalid", "dropped"].includes(status)) return "danger";
  return "neutral";
}
