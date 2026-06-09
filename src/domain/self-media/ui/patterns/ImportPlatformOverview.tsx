import type { DashboardSnapshot, Platform } from "../../types";
import { PlatformBadge } from "../components/PlatformBadge";
import { platformLabels } from "../foundations/labels";
import { Badge } from "../primitives/Badge";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

export type ImportUpdatePanelKey = "douyin" | "xiaohongshu" | "video_account" | "bilibili";
type ImportPlatformFlowTone = "success" | "warning" | "info" | "danger";

export interface ImportPlatformFlowState {
  label: string;
  tone: ImportPlatformFlowTone;
  nextAction: string;
  detail?: string;
}

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

function defaultFlowState(snapshot: DashboardSnapshot, key: ImportUpdatePanelKey): ImportPlatformFlowState {
  if (key === "video_account") {
    return {
      label: "当前平台暂不支持自动抓取",
      tone: "info",
      nextAction: "视频号以手动更新为主：粘贴或上传内容级数据，预览后再确认保存。",
      detail: "登录抓取需要扫码，暂不作为每日自动流程。"
    };
  }
  if (key === "bilibili") {
    return {
      label: "可刷新",
      tone: "info",
      nextAction: "导入 B站稿件内容级数据；账号总览指标只预览，不写入可信总量。",
      detail: "适合上传或粘贴创作中心导出的稿件表。"
    };
  }

  const status = statusFor(snapshot, key);
  if (status?.browserSessionAvailable || status?.isAuthorized) {
    return {
      label: "可刷新",
      tone: "success",
      nextAction: key === "xiaohongshu"
        ? "展开小红书更新，读取内容分析表格；如果页面不对，请切到数据看板/内容分析。"
        : "展开抖音更新，读取作品管理页；如果列表抓不到，请点开作品详情再预览。",
      detail: "已有本机会话迹象，点击平台按钮后再手动刷新，不会自动保存。"
    };
  }
  return {
    label: "需要登录",
    tone: "warning",
    nextAction: key === "xiaohongshu"
      ? "先打开小红书创作服务平台并完成登录，再回到这里读取内容分析表格。"
      : "先打开抖音创作者中心并完成登录，再回到这里读取作品数据。",
    detail: "进入本页不会自动打开平台窗口。"
  };
}

function freshnessSummary(snapshot: DashboardSnapshot) {
  const labels: Record<DashboardSnapshot["platformDataHealth"]["platforms"][number]["platform"], string> = {
    douyin: "抖音",
    xiaohongshu: "小红书",
    "video-account": "视频号",
    bilibili: "B站"
  };
  const stalePlatforms = snapshot.platformDataHealth.platforms
    .filter((item) => item.realCaptureStatus === "stale" || item.realCaptureStatus === "missing")
    .map((item) => labels[item.platform]);
  if (stalePlatforms.length === 0) return null;
  return `建议刷新：${stalePlatforms.join("、")}。这些提示只提醒你补抓，不会制造假数据。`;
}

export function ImportPlatformOverview({
  activePanel,
  captureStates,
  onOpenPanel,
  snapshot
}: {
  activePanel: ImportUpdatePanelKey | null;
  captureStates?: Partial<Record<ImportUpdatePanelKey, ImportPlatformFlowState>>;
  onOpenPanel: (panel: ImportUpdatePanelKey) => void;
  snapshot: DashboardSnapshot;
}) {
  const freshness = freshnessSummary(snapshot);
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
      {freshness && (
        <div className="capture-reality-box" data-testid="import-platform-freshness-warning">
          <strong>哪些数据建议刷新</strong>
          <p>{freshness}</p>
        </div>
      )}
      <div className="login-platform-status-grid import-platform-overview-grid" data-testid="import-platform-overview-grid">
        {platformCards.map((card) => {
          const status = statusFor(snapshot, card.key);
          const flow = captureStates?.[card.key] ?? defaultFlowState(snapshot, card.key);
          const isActive = activePanel === card.key;
          return (
            <article className={isActive ? "is-active" : ""} data-testid={`import-platform-card-${card.key}`} key={card.key}>
              <div className="platform-operation-card-head">
                <PlatformBadge platform={card.platform} />
                <Badge tone={statusTone(status)}>{card.headline}</Badge>
                <Badge tone={flow.tone}>{flow.label}</Badge>
              </div>
              <strong>{platformLabels[card.platform]}</strong>
              <p>{card.detail}</p>
              <small data-testid={`import-platform-next-step-${card.key}`}>{flow.nextAction}</small>
              {flow.detail && <small>{flow.detail}</small>}
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
