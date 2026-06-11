import type { DashboardSnapshot, Platform } from "../../types";
import { PlatformBadge } from "../components/PlatformBadge";
import { formatDateTime, formatNumber } from "../foundations/format";
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

const freshWithinHours = 24;
const refreshNeededAfterHours = 72;

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
    headline: "助手页面扫描",
    detail: "扫描当前视频号助手作品/数据列表，先预览候选，再批量确认保存。",
    actionLabel: "扫描视频号助手"
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

function healthPlatformKey(key: ImportUpdatePanelKey): DashboardSnapshot["platformDataHealth"]["platforms"][number]["platform"] {
  if (key === "video_account") return "video-account";
  return key;
}

function freshnessPolicyFor(snapshot: DashboardSnapshot, key: ImportUpdatePanelKey): ImportPlatformFlowState {
  const health = snapshot.platformDataHealth.platforms.find((item) => item.platform === healthPlatformKey(key));
  const age = health?.freshness.realCaptureAgeHours;
  if (!health?.freshness.latestRealCaptureAt || health.realCaptureStatus === "missing") {
    return {
      label: "需要刷新",
      tone: "warning",
      nextAction: "还没有可靠的最近抓取记录，建议先更新一次。",
      detail: "新鲜度策略：24 小时内新鲜，24-72 小时建议刷新，超过 72 小时需要刷新。"
    };
  }
  if (typeof age === "number" && age < freshWithinHours) {
    return {
      label: "数据新鲜",
      tone: "success",
      nextAction: "最近 24 小时内有真实抓取，今天可以先看数据。",
      detail: "新鲜度策略：24 小时内新鲜。"
    };
  }
  if (typeof age === "number" && age <= refreshNeededAfterHours) {
    return {
      label: "建议刷新",
      tone: "info",
      nextAction: "最近真实抓取已超过 24 小时，建议今天补一次数据。",
      detail: "新鲜度策略：24-72 小时建议刷新。"
    };
  }
  return {
    label: "需要刷新",
    tone: "warning",
    nextAction: "最近真实抓取已超过 72 小时，请优先刷新这个平台。",
    detail: "新鲜度策略：超过 72 小时需要刷新；不会用假数据消除提醒。"
  };
}

function defaultFlowState(snapshot: DashboardSnapshot, key: ImportUpdatePanelKey): ImportPlatformFlowState {
  if (key === "video_account") {
    return {
      label: "可扫描当前助手页",
      tone: "info",
      nextAction: "打开并登录视频号助手，切到作品/数据列表后扫描当前页面；保存前仍需人工确认。",
      detail: "默认不会自动开窗或自动保存；粘贴/上传表格仍作为兜底。"
    };
  }
  if (key === "bilibili") {
    return {
      label: "可刷新",
      tone: "info",
      nextAction: "导入 B站稿件内容级数据；账号总览指标只预览，不写入可信总量。",
      detail: "确认保存会作为 B站内容级导入证据；适合上传或粘贴创作中心导出的稿件表。"
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
    .filter((item) => {
      const age = item.freshness.realCaptureAgeHours;
      return item.realCaptureStatus === "stale"
        || item.realCaptureStatus === "missing"
        || !item.freshness.latestRealCaptureAt
        || (typeof age === "number" && age > freshWithinHours);
    })
    .map((item) => labels[item.platform]);
  if (stalePlatforms.length === 0) return null;
  return `建议刷新：${stalePlatforms.join("、")}。24 小时内新鲜，24-72 小时建议刷新，超过 72 小时需要刷新；这些提示只提醒你补抓，不会制造假数据。`;
}

function refreshReason(snapshot: DashboardSnapshot, key: ImportUpdatePanelKey) {
  const health = snapshot.platformDataHealth.platforms.find((item) => item.platform === healthPlatformKey(key));
  const age = health?.freshness.realCaptureAgeHours;
  if (!health?.freshness.latestRealCaptureAt || health.realCaptureStatus === "missing") return "暂无最近刷新记录，建议先补一次内容级数据。";
  if (typeof age === "number" && age < freshWithinHours) return `最近约 ${formatNumber(Math.max(0, Math.round(age)))} 小时内更新，今天可以先看数据。`;
  if (typeof age === "number" && age <= refreshNeededAfterHours) return `距上次更新约 ${formatNumber(Math.round(age))} 小时，建议今天补一次。`;
  return "距上次更新已超过 72 小时，请优先刷新。";
}

function refreshChecklistNextAction(key: ImportUpdatePanelKey, freshness: ImportPlatformFlowState) {
  const isFresh = freshness.label === "数据新鲜";
  if (key === "douyin") {
    return isFresh ? "可先看数据；需要补抓时展开抖音更新。" : "打开抖音更新，登录创作者中心后回到这里重新检查/预览。";
  }
  if (key === "xiaohongshu") {
    return isFresh ? "可先看数据；需要补抓时展开小红书更新。" : "打开小红书更新，切到内容分析表格页后读取。";
  }
  if (key === "video_account") {
    return isFresh ? "可先看数据；有新作品时扫描视频号助手当前页。" : "打开视频号助手作品/数据列表，扫描当前页生成预览。";
  }
  return isFresh ? "可先看数据；有新稿件时导入 B站内容级表格。" : "导入当前稿件级表格；账号指标仍 preview-only。";
}

function todayRefreshChecklist(snapshot: DashboardSnapshot) {
  return platformCards.map((card) => {
    const health = snapshot.platformDataHealth.platforms.find((item) => item.platform === healthPlatformKey(card.key));
    const freshness = freshnessPolicyFor(snapshot, card.key);
    return {
      ...card,
      freshness,
      latestAt: health?.freshness.latestRealCaptureAt ?? null,
      reason: refreshReason(snapshot, card.key),
      nextAction: refreshChecklistNextAction(card.key, freshness)
    };
  });
}

export function ImportPlatformOverview({
  activePanel,
  captureStates,
  isChecking,
  onCheckStatus,
  onOpenPanel,
  snapshot
}: {
  activePanel: ImportUpdatePanelKey | null;
  captureStates?: Partial<Record<ImportUpdatePanelKey, ImportPlatformFlowState>>;
  isChecking?: boolean;
  onCheckStatus?: () => void;
  onOpenPanel: (panel: ImportUpdatePanelKey) => void;
  snapshot: DashboardSnapshot;
}) {
  const freshness = freshnessSummary(snapshot);
  const refreshRows = todayRefreshChecklist(snapshot);
  return (
    <Panel
      className="import-platform-overview"
      data-testid="import-platform-overview"
      title="今天怎么更新数据"
      eyebrow="四平台更新"
    >
      <div className="trusted-weekly-summary-foot">
        <span>手动更新平台数据，预览后确认保存；进入本页不会自动打开任何平台窗口。</span>
        {onCheckStatus && (
          <Button data-testid="import-platform-check-status" onClick={onCheckStatus} variant="secondary" disabled={isChecking}>
            {isChecking ? "检查中" : "重新检查状态"}
          </Button>
        )}
      </div>
      {freshness && (
        <div className="capture-reality-box" data-testid="import-platform-freshness-warning">
          <strong>哪些数据建议刷新</strong>
          <p>{freshness}</p>
        </div>
      )}
      <div data-testid="today-refresh-checklist">
        <div className="trusted-weekly-summary-foot">
          <span><b>今日建议刷新</b> 本地服务启动后，首次进入看板或导入页会只读检查这些状态。</span>
          <span>不会自动开窗，也不会静默保存。</span>
        </div>
        <div className="platform-operation-grid">
          {refreshRows.map((row) => (
            <article className="platform-operation-card" data-testid={`today-refresh-row-${row.key}`} key={`today-refresh-${row.key}`}>
              <div className="platform-operation-card-head">
                <PlatformBadge platform={row.platform} />
                <Badge tone={row.freshness.tone}>{row.freshness.label}</Badge>
              </div>
              <strong>{platformLabels[row.platform]}</strong>
              <p>{row.reason}</p>
              <small>最近更新：{formatDateTime(row.latestAt ?? undefined)}</small>
              <small>{row.nextAction}</small>
              <div className="import-preview-actions">
                <Button data-testid={`today-refresh-open-${row.key}`} onClick={() => onOpenPanel(row.key)} variant={row.freshness.label === "数据新鲜" ? "secondary" : "primary"}>
                  {row.actionLabel}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="login-platform-status-grid import-platform-overview-grid" data-testid="import-platform-overview-grid">
        {platformCards.map((card) => {
          const status = statusFor(snapshot, card.key);
          const flow = captureStates?.[card.key] ?? defaultFlowState(snapshot, card.key);
          const freshness = freshnessPolicyFor(snapshot, card.key);
          const isActive = activePanel === card.key;
          return (
            <article className={isActive ? "is-active" : ""} data-testid={`import-platform-card-${card.key}`} key={card.key}>
              <div className="platform-operation-card-head">
                <PlatformBadge platform={card.platform} />
                <Badge tone={statusTone(status)}>{card.headline}</Badge>
                <Badge tone={freshness.tone}>{freshness.label}</Badge>
                <Badge tone={flow.tone}>{flow.label}</Badge>
              </div>
              <strong>{platformLabels[card.platform]}</strong>
              <p>{card.detail}</p>
              <small data-testid={`import-platform-freshness-${card.key}`}>{freshness.nextAction}</small>
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
