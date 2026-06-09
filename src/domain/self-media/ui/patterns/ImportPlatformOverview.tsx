import type { DashboardSnapshot, Platform } from "../../types";
import { PlatformBadge } from "../components/PlatformBadge";
import { platformLabels } from "../foundations/labels";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

export type ImportUpdatePanelKey = "douyin" | "xiaohongshu" | "video_account" | "bilibili";

interface PlatformUpdateCard {
  key: ImportUpdatePanelKey;
  platform: Platform;
  headline: string;
  detail: string;
  actionLabel: string;
}

const platformCards: PlatformUpdateCard[] = [
  {
    key: "douyin",
    platform: "douyin",
    headline: "登录抓取可用",
    detail: "打开抖音创作者后台，读取作品详情或作品管理页，保存前人工确认。",
    actionLabel: "打开抖音更新"
  },
  {
    key: "xiaohongshu",
    platform: "xiaohongshu",
    headline: "内容分析表格可用",
    detail: "读取小红书创作者后台内容分析表格，每行一条笔记，保存前人工确认。",
    actionLabel: "打开小红书更新"
  },
  {
    key: "video_account",
    platform: "video_account",
    headline: "手动更新为主",
    detail: "粘贴或上传视频号内容级数据；登录抓取需扫码，暂不作为每日自动流程。",
    actionLabel: "手动更新视频号"
  },
  {
    key: "bilibili",
    platform: "bilibili",
    headline: "内容级导入可用",
    detail: "导入 B站稿件内容级数据；账号指标仍 preview-only，不进入 durable totals。",
    actionLabel: "导入 B站数据"
  }
];

function statusFor(snapshot: DashboardSnapshot, key: ImportUpdatePanelKey) {
  return snapshot.trustedAutoCaptureScheduler.statuses.find((item) => item.platform === key);
}

function statusTone(status: ReturnType<typeof statusFor>) {
  if (!status) return "info";
  if (status.browserSessionAvailable || status.isAuthorized) return "success";
  if (status.needsManualAction) return "warning";
  return "info";
}

export function ImportPlatformOverview({
  activePanel,
  onOpenPanel,
  snapshot
}: {
  activePanel: ImportUpdatePanelKey | null;
  onOpenPanel: (panel: ImportUpdatePanelKey) => void;
  snapshot: DashboardSnapshot;
}) {
  return (
    <Panel
      className="import-platform-overview"
      data-testid="import-platform-overview"
      title="今天怎么更新数据"
      eyebrow="四平台更新"
    >
      <div className="trusted-weekly-summary-foot">
        <span>手动更新平台数据，预览后确认保存；进入本页不会自动打开任何平台窗口。</span>
      </div>
      <div className="login-platform-status-grid import-platform-overview-grid" data-testid="import-platform-overview-grid">
        {platformCards.map((card) => {
          const status = statusFor(snapshot, card.key);
          const isActive = activePanel === card.key;
          return (
            <article className={isActive ? "is-active" : ""} data-testid={`import-platform-card-${card.key}`} key={card.key}>
              <div className="platform-operation-card-head">
                <PlatformBadge platform={card.platform} />
                <Badge tone={statusTone(status)}>{card.headline}</Badge>
              </div>
              <strong>{platformLabels[card.platform]}</strong>
              <p>{card.detail}</p>
              <small>{status?.needsManualAction ? "需要你手动登录或提供数据" : "可以继续预览更新"}</small>
              <div className="import-preview-actions">
                <Button data-testid={`import-platform-open-${card.key}`} onClick={() => onOpenPanel(card.key)} variant={isActive ? "primary" : "secondary"}>
                  {card.actionLabel}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="real-preview-summary" data-testid="import-first-screen-boundary">
        <span><b>保存前人工确认</b> 保存规则</span>
        <span><b>不会自动打开平台窗口</b> 页面加载</span>
        <span><b>视频号手动更新为主</b> 当前边界</span>
        <span><b>B站账号指标 preview-only</b> 数据边界</span>
      </div>
    </Panel>
  );
}
