import type { DashboardSnapshot } from "../../types";
import { ArrowRight, CalendarDays, CheckCircle2, Flame, Lightbulb, Sparkles, TrendingUp, Users } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { formatNumber } from "../foundations/format";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

function isPausedWechatAction(item: DashboardSnapshot["actionItems"][number]) {
  const text = [item.title, item.nextAction, item.relatedType, item.relatedId]
    .filter(Boolean)
    .join(" ");
  return /(公众号|微信后台|wechat|wechat_official)/i.test(text);
}

export function OverviewPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const published = snapshot.platformVersions.filter((item) => item.status === "published").length;
  const blocked = snapshot.platformVersions.filter((item) => item.status === "blocked").length;
  const scheduled = snapshot.platformVersions.filter((item) => item.status === "scheduled").length;
  const operatorActionItems = snapshot.actionItems.filter((item) => !isPausedWechatAction(item));
  const activeActions = operatorActionItems.filter((item) => !["done", "dropped"].includes(item.status));
  const highPriorityActions = activeActions.filter((item) => item.priority === "high");
  const activeLeads = snapshot.leads.filter((lead) => !["won", "lost"].includes(lead.status));
  const totalLeadValue = activeLeads.reduce((total, lead) => total + lead.valueEstimate, 0);
  const totalEngagement = snapshot.weeklyReview.metrics.totalEngagement;
  const topVersion = snapshot.platformVersions[0];
  const nextAction = activeActions[0];
  const bestPlatform = snapshot.weeklyReview.metrics.bestPlatform;

  return (
    <AppShell active="/">
      <PageHeader
        eyebrow="经营总览"
        title="自媒体经营后台"
        description="每天打开先看节奏、行动和机会：内容计划、发布排期、数据回收、复盘跟进都在同一个创作者工作台里。"
        actions={<Button variant="primary">新建内容</Button>}
      />
      <div className="creator-overview-grid">
        <section className="creator-hero-card">
          <div className="creator-card-topline">
            <span>今日工作入口</span>
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <h2>把本周内容节奏稳住，再找一个可放大的样本。</h2>
          <p>优先处理高优先级行动项、阻塞排期和最新数据回收。当前优势平台是 {bestPlatform}。</p>
          <div className="creator-hero-metrics">
            <span><strong>{formatNumber(snapshot.weeklyReview.metrics.totalViews)}</strong>曝光</span>
            <span><strong>{formatNumber(totalEngagement)}</strong>互动</span>
            <span><strong>{highPriorityActions.length}</strong>高优先级</span>
          </div>
          <a className="creator-card-link" href="/reviews">进入复盘行动 <ArrowRight size={16} aria-hidden="true" /></a>
        </section>

        <a className="creator-tile creator-tile-lime" href="/calendar">
          <div className="creator-tile-icon"><CalendarDays size={19} aria-hidden="true" /></div>
          <span>发布节奏</span>
          <strong>{published}/{snapshot.platformVersions.length}</strong>
          <p>已发布平台版本，另有 {scheduled} 条排期中、{blocked} 条阻塞。</p>
        </a>

        <a className="creator-tile" href="/dashboard">
          <div className="creator-tile-icon"><TrendingUp size={19} aria-hidden="true" /></div>
          <span>数据增长</span>
          <strong>{formatNumber(snapshot.weeklyReview.metrics.totalViews)}</strong>
          <p>基于已回收的内容数据，先看曝光、互动和平台差异。</p>
        </a>

        <a className="creator-tile creator-tile-dark" href="/content">
          <div className="creator-tile-icon"><Flame size={19} aria-hidden="true" /></div>
          <span>内容资产</span>
          <strong>{snapshot.contents.length}</strong>
          <p>{topVersion ? topVersion.title : "暂无最新平台版本"}。</p>
        </a>

        <a className="creator-tile" href="/reviews">
          <div className="creator-tile-icon"><Lightbulb size={19} aria-hidden="true" /></div>
          <span>复盘行动</span>
          <strong>{activeActions.length}</strong>
          <p>{nextAction ? nextAction.title : "暂无待推进动作"}。</p>
        </a>

        <a className="creator-tile" href="/leads">
          <div className="creator-tile-icon"><Users size={19} aria-hidden="true" /></div>
          <span>线索机会</span>
          <strong>{formatNumber(totalLeadValue)}</strong>
          <p>{activeLeads.length} 条活跃线索，跟进动作进入下一轮计划。</p>
        </a>
      </div>

      <div className="overview-lower-grid">
        <Panel title="最近平台版本" eyebrow="内容状态">
          <div className="compact-list">
            {snapshot.platformVersions.slice(0, 6).map((version) => (
              <div className="compact-row" key={version.id}>
                <PlatformBadge platform={version.platform} />
                <strong>{version.title}</strong>
                <StatusBadge status={version.status} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="下一步动作" eyebrow="行动重点">
          <div className="creator-focus-list">
            {activeActions.slice(0, 4).map((item) => (
              <div className="creator-focus-row" key={item.id}>
                <CheckCircle2 size={17} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.nextAction ?? "等待推进"} · {item.priority}</span>
                </div>
              </div>
            ))}
            {activeActions.length === 0 && <p className="muted">暂无待推进动作，保存复盘后会生成下一步。</p>}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
