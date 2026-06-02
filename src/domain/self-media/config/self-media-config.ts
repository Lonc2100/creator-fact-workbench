import type { Platform } from "../types";

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
