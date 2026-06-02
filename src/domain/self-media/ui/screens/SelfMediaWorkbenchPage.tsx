"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Copy,
  Database,
  Download,
  FileText,
  LineChart,
  Megaphone,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CsvImportPreset, DashboardSnapshot, ImportPreviewResult, ImportRequest, Platform, PlatformMetric, PublishQueueItem, PublishQueueStatus, TopicIdea } from "../../types";

const platformLabels: Record<Platform, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  wechat: "公众号",
  video_account: "视频号",
  bilibili: "B站",
  other: "其他"
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function platformTotals(metrics: PlatformMetric[]) {
  const totals = new Map<Platform, number>();
  for (const metric of metrics) totals.set(metric.platform, (totals.get(metric.platform) ?? 0) + metric.views + metric.likes + metric.saves + metric.shares);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

const csvTemplate = [
  "id,title,platform,status,format,topic,publishedAt,views,likes,comments,saves,shares,followersDelta",
  "douyin-real-001,真实导入AI短片,douyin,published,short_video,AI短片,2026-06-01T09:00:00.000Z,1500,62,11,27,8,5"
].join("\n");

const importModes: Array<{ id: ImportRequest["mode"]; label: string }> = [
  { id: "csv", label: "CSV" },
  { id: "mediacrawler", label: "MediaCrawler" },
  { id: "n8n", label: "n8n" },
  { id: "json", label: "JSON" },
  { id: "manual", label: "MANUAL" }
];

const csvPresets: Array<{ id: CsvImportPreset; label: string }> = [
  { id: "generic", label: "通用" },
  { id: "douyin", label: "抖音" },
  { id: "xiaohongshu", label: "小红书" },
  { id: "wechat", label: "公众号" },
  { id: "video_account", label: "视频号" },
  { id: "bilibili", label: "B站" }
];

const mediaCrawlerExample = JSON.stringify(
  {
    platform: "xhs",
    items: [{ note_id: "xhs-mc-001", title: "AI自媒体工具拆解", liked_count: 88, comment_count: 12, collected_count: 55, share_count: 9, keyword: "AI工具" }]
  },
  null,
  2
);

const n8nExample = JSON.stringify(
  {
    executionId: "exec-001",
    workflowName: "平台数据回收",
    items: [{ id: "n8n-douyin-001", title: "n8n导入短片数据", platform: "douyin", views: 1800, likes: 72, comments: 10, saves: 24, shares: 6 }]
  },
  null,
  2
);

const nextQueueStatus: Partial<Record<PublishQueueStatus, PublishQueueStatus>> = {
  draft: "needs_review",
  needs_review: "queued",
  queued: "scheduled",
  scheduled: "publishing",
  publishing: "published",
  failed: "needs_review",
  blocked: "needs_review"
};

function queueActionLabel(item: PublishQueueItem) {
  const next = nextQueueStatus[item.status];
  return next ? `${item.status} -> ${next}` : "已完成";
}

export default function SelfMediaWorkbenchPage({ snapshot: initialSnapshot }: { snapshot: DashboardSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [mode, setMode] = useState<ImportRequest["mode"]>("csv");
  const [preset, setPreset] = useState<CsvImportPreset>("douyin");
  const [csv, setCsv] = useState(csvTemplate);
  const [json, setJson] = useState(JSON.stringify({ source: "json", contents: [], metrics: [] }, null, 2));
  const [manualTitle, setManualTitle] = useState("线下活动AI观点复盘");
  const [manualPlatform, setManualPlatform] = useState<Platform>("wechat");
  const [manualViews, setManualViews] = useState("300");
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importStatus, setImportStatus] = useState("等待导入");
  const [ideaTitle, setIdeaTitle] = useState("AI自媒体每日表达训练");
  const [ideaRationale, setIdeaRationale] = useState("把线下交流和AI工具体验拆成每日真人表达内容。");
  const [ideaPlatform, setIdeaPlatform] = useState<Platform>("video_account");
  const [leadSource, setLeadSource] = useState("线下社群");
  const [leadDemand, setLeadDemand] = useState("AI短片/自媒体工作流咨询");
  const [leadNextAction, setLeadNextAction] = useState("整理案例卡片并私聊确认预算。");
  const [leadValue, setLeadValue] = useState("3000");
  const [busy, setBusy] = useState(false);
  const totals = snapshot.weeklyReview.metrics;
  const platformRows = useMemo(() => platformTotals(snapshot.metrics), [snapshot.metrics]);
  const maxPlatformTotal = Math.max(...platformRows.map(([, total]) => total), 1);
  async function refreshDashboard() {
    const response = await fetch("/api/self-media/dashboard");
    setSnapshot((await response.json()) as DashboardSnapshot);
  }
  function buildImportPayload(): ImportRequest {
    let payload: ImportRequest;
    if (mode === "csv") payload = { mode, csv, preset };
    else if (mode === "json") payload = { mode, json: JSON.parse(json) };
    else if (mode === "mediacrawler") payload = { mode, json: JSON.parse(json) };
    else if (mode === "n8n") payload = { mode, json: JSON.parse(json) };
    else {
      payload = {
        mode,
        manual: {
          title: manualTitle,
          platform: manualPlatform,
          format: manualPlatform === "wechat" ? "article" : "short_video",
          topic: "AI自媒体",
          views: Number(manualViews),
          likes: 0,
          comments: 0,
          saves: 0,
          shares: 0,
          followersDelta: 0
        }
      };
    }
    return payload;
  }
  async function previewImport() {
    setBusy(true);
    setImportStatus("预览中...");
    try {
      const response = await fetch("/api/self-media/import/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildImportPayload())
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "预览失败");
      setPreview(result as ImportPreviewResult);
      setImportStatus(`预览完成：${result.contentCount} 条内容，重复 ${result.duplicateContentIds.length} 条`);
      await refreshDashboard();
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "预览失败");
    } finally {
      setBusy(false);
    }
  }
  async function submitImport() {
    setBusy(true);
    setImportStatus("保存中...");
    try {
      const response = await fetch("/api/self-media/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildImportPayload())
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.run?.errorMessage ?? "导入失败");
      setPreview(null);
      setImportStatus(`导入成功：${result.run.importedCount} 条，trace ${result.traceId}`);
      await refreshDashboard();
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }
  async function copyReview() {
    await navigator.clipboard.writeText(snapshot.weeklyReview.markdown);
    setImportStatus("已复制周复盘 Markdown");
  }
  async function advanceQueue(item: PublishQueueItem) {
    const status = nextQueueStatus[item.status];
    if (!status) return;
    const response = await fetch("/api/self-media/queue", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, status })
    });
    const result = await response.json();
    setImportStatus(response.ok ? `队列已更新：${item.id} -> ${status}` : result.errorMessage ?? "队列更新失败");
    await refreshDashboard();
  }
  async function createIdea() {
    const response = await fetch("/api/self-media/ideas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: ideaTitle, platform: ideaPlatform, rationale: ideaRationale, nextAction: "转内容草稿" })
    });
    const result = await response.json();
    setImportStatus(response.ok ? `选题已创建：${result.idea.title}` : result.errorMessage ?? "选题创建失败");
    await refreshDashboard();
  }
  async function convertIdea(idea: TopicIdea) {
    const response = await fetch("/api/self-media/ideas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "convert", id: idea.id })
    });
    const result = await response.json();
    setImportStatus(response.ok ? `已转内容草稿：${result.content.title}` : result.errorMessage ?? "转内容失败");
    await refreshDashboard();
  }
  async function createLead() {
    const response = await fetch("/api/self-media/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: leadSource, demand: leadDemand, nextAction: leadNextAction, valueEstimate: Number(leadValue), status: "follow_up" })
    });
    const result = await response.json();
    setImportStatus(response.ok ? `线索已创建：${result.lead.source}` : result.errorMessage ?? "线索创建失败");
    await refreshDashboard();
  }
  return (
    <main className="workbench-shell">
      <aside className="side-nav" aria-label="自媒体工作台导航">
        <div className="brand-block">
          <div className="brand-mark">AI</div>
          <div>
            <strong>自媒体工作台</strong>
            <span>Local Ops</span>
          </div>
        </div>
        <nav>
          {[
            ["总览", BarChart3],
            ["采集", Database],
            ["选题", Sparkles],
            ["内容队列", CalendarDays],
            ["复盘", FileText],
            ["线索", Users],
            ["审计", ShieldCheck]
          ].map(([label, Icon]) => (
            <a className="nav-item" href={`#${label}`} key={String(label)}>
              <Icon aria-hidden="true" size={17} />
              <span>{label as string}</span>
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Harness / SQLite / shadcn-style</p>
            <h1>自媒体经营后台</h1>
          </div>
          <div className="status-strip">
            <span>O1 日志已启用</span>
            <span>真实导入闭环</span>
            <span>{new Date(snapshot.generatedAt).toLocaleString("zh-CN")}</span>
          </div>
        </header>

        <section className="metric-grid" id="总览" aria-label="关键指标">
          <article className="metric-card">
            <Activity size={18} />
            <span>内容数</span>
            <strong>{totals.contentCount}</strong>
          </article>
          <article className="metric-card">
            <LineChart size={18} />
            <span>总曝光</span>
            <strong>{formatNumber(totals.totalViews)}</strong>
          </article>
          <article className="metric-card">
            <Megaphone size={18} />
            <span>总互动</span>
            <strong>{formatNumber(totals.totalEngagement)}</strong>
          </article>
          <article className="metric-card">
            <Network size={18} />
            <span>优势平台</span>
            <strong>{platformLabels[totals.bestPlatform]}</strong>
          </article>
        </section>

        <section className="dashboard-grid">
          <section className="panel wide" id="采集">
            <div className="panel-head">
              <div>
                <p className="eyebrow">参考 n8n executions / MediaCrawler</p>
                <h2>采集与导入运行</h2>
              </div>
              <Database size={18} />
            </div>
            <div className="import-console">
              <div className="segmented">
                {importModes.map((item) => (
                  <button
                    className={mode === item.id ? "active" : ""}
                    key={item.id}
                    onClick={() => {
                      setMode(item.id);
                      if (item.id === "mediacrawler") setJson(mediaCrawlerExample);
                      if (item.id === "n8n") setJson(n8nExample);
                    }}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {mode === "csv" ? (
                <>
                  <label className="inline-field">
                    平台预设
                    <select value={preset} onChange={(event) => setPreset(event.target.value as CsvImportPreset)}>
                      {csvPresets.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <textarea aria-label="CSV 导入内容" value={csv} onChange={(event) => setCsv(event.target.value)} />
                </>
              ) : mode === "json" ? (
                <textarea aria-label="JSON 导入内容" value={json} onChange={(event) => setJson(event.target.value)} />
              ) : mode === "mediacrawler" ? (
                <textarea aria-label="MediaCrawler JSON 导入内容" value={json} onChange={(event) => setJson(event.target.value)} />
              ) : mode === "n8n" ? (
                <textarea aria-label="n8n JSON 导入内容" value={json} onChange={(event) => setJson(event.target.value)} />
              ) : (
                <div className="manual-grid">
                  <label>
                    标题
                    <input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} />
                  </label>
                  <label>
                    平台
                    <select value={manualPlatform} onChange={(event) => setManualPlatform(event.target.value as Platform)}>
                      {Object.entries(platformLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    浏览量
                    <input inputMode="numeric" value={manualViews} onChange={(event) => setManualViews(event.target.value)} />
                  </label>
                </div>
              )}
              <div className="import-actions">
                <a className="ghost-button" href={`/api/self-media/import/template?preset=${preset}`}>
                  <Download size={14} /> 模板
                </a>
                <button disabled={busy} onClick={previewImport} type="button">
                  <Search size={14} /> 预览
                </button>
                <button disabled={busy} onClick={submitImport} type="button">
                  {busy ? <RefreshCw size={14} /> : <Upload size={14} />} 确认保存
                </button>
                <span>{importStatus}</span>
              </div>
              {preview ? (
                <div className="preview-box">
                  <strong>
                    {preview.source}：{preview.contentCount} 内容 / {preview.metricCount} 指标 / {preview.ideaCount} 选题
                  </strong>
                  <span>重复内容 {preview.duplicateContentIds.length} 条，预览不会写入 ImportRun。</span>
                  <div className="preview-list">
                    {preview.items.map((item) => (
                      <span className={`badge ${item.kind === "duplicate" ? "warn" : "success"}`} key={item.id}>
                        {platformLabels[item.platform]} {item.kind} {item.title}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <table>
              <thead>
                <tr>
                  <th>来源</th>
                  <th>状态</th>
                  <th>数量</th>
                  <th>完成时间</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.imports.map((item) => (
                  <tr key={item.id}>
                    <td>{item.source}</td>
                    <td>
                      <span className="badge success">{item.status}</span>
                    </td>
                    <td>{item.importedCount}</td>
                    <td>{item.finishedAt ? new Date(item.finishedAt).toLocaleString("zh-CN") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel" id="内容队列">
            <div className="panel-head">
              <div>
                <p className="eyebrow">参考 Postiz / Mixpost</p>
                <h2>发布队列</h2>
              </div>
              <CalendarDays size={18} />
            </div>
            <div className="queue-list">
              {snapshot.queue.map((item) => (
                <div className="queue-row" key={item.id}>
                  <div>
                    <span>{platformLabels[item.platform]}</span>
                    <time>{new Date(item.scheduledAt).toLocaleDateString("zh-CN")}</time>
                  </div>
                  <strong>{item.status}</strong>
                  <button disabled={!nextQueueStatus[item.status]} onClick={() => advanceQueue(item)} type="button">
                    {queueActionLabel(item)}
                  </button>
                  {item.nextAction ? <small>{item.nextAction}</small> : null}
                </div>
              ))}
            </div>
            <div className="calendar-strip">
              {snapshot.queue.slice(0, 7).map((item) => (
                <div className="calendar-cell" key={`cal-${item.id}`}>
                  <time>{new Date(item.scheduledAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time>
                  <strong>{platformLabels[item.platform]}</strong>
                  <span>{item.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" id="选题">
            <div className="panel-head">
              <div>
                <p className="eyebrow">参考 ALwrity</p>
                <h2>选题与品牌脑</h2>
              </div>
              <Search size={18} />
            </div>
            <div className="idea-list">
              <div className="mini-form">
                <input value={ideaTitle} onChange={(event) => setIdeaTitle(event.target.value)} />
                <select value={ideaPlatform} onChange={(event) => setIdeaPlatform(event.target.value as Platform)}>
                  {Object.entries(platformLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <input value={ideaRationale} onChange={(event) => setIdeaRationale(event.target.value)} />
                <button onClick={createIdea} type="button">
                  新建选题
                </button>
              </div>
              {snapshot.ideas.map((idea) => (
                <article className="idea-row" key={idea.id}>
                  <span className="badge">{platformLabels[idea.platform]}</span>
                  <h3>{idea.title}</h3>
                  <p>{idea.rationale}</p>
                  <meter min={0} max={1} value={idea.confidence} />
                  <button disabled={idea.status === "produced"} onClick={() => convertIdea(idea)} type="button">
                    {idea.status === "produced" ? "已转内容" : "转内容草稿"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel wide" id="数据看板">
            <div className="panel-head">
              <div>
                <p className="eyebrow">参考 Metabase</p>
                <h2>平台表现</h2>
              </div>
              <BarChart3 size={18} />
            </div>
            <div className="bar-list">
              {platformRows.map(([platform, total]) => (
                <div className="bar-row" key={platform}>
                  <span>{platformLabels[platform]}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${Math.max((total / maxPlatformTotal) * 100, 4)}%` }} />
                  </div>
                  <strong>{formatNumber(total)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel" id="线索">
            <div className="panel-head">
              <div>
                <p className="eyebrow">变现跟进</p>
                <h2>联系人与线索</h2>
              </div>
              <Users size={18} />
            </div>
            <div className="mini-form lead-form">
              <input value={leadSource} onChange={(event) => setLeadSource(event.target.value)} />
              <input value={leadDemand} onChange={(event) => setLeadDemand(event.target.value)} />
              <input value={leadNextAction} onChange={(event) => setLeadNextAction(event.target.value)} />
              <input inputMode="numeric" value={leadValue} onChange={(event) => setLeadValue(event.target.value)} />
              <button onClick={createLead} type="button">
                新增线索
              </button>
            </div>
            {snapshot.leads.map((lead) => (
              <article className="lead-row" key={lead.id}>
                <span className="badge warn">{lead.status}</span>
                <strong>{lead.source}</strong>
                {lead.demand ? <p>{lead.demand}</p> : null}
                <p>{lead.nextAction}</p>
                <small>估值 {formatNumber(lead.valueEstimate)}</small>
              </article>
            ))}
          </section>

          <section className="panel report" id="复盘">
            <div className="panel-head">
              <div>
                <p className="eyebrow">参考 Evidence</p>
                <h2>周/月复盘</h2>
              </div>
              <button className="icon-button" onClick={copyReview} title="复制周复盘 Markdown" type="button">
                <Copy size={16} />
              </button>
            </div>
            <pre>{snapshot.weeklyReview.markdown}</pre>
          </section>

          <section className="panel wide" id="审计">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Harness audit</p>
                <h2>日志与审计</h2>
              </div>
              <ClipboardCheck size={18} />
            </div>
            <div className="audit-grid">
              {snapshot.audits.map((item) => (
                <article className="audit-row" key={item.id}>
                  <span className={`badge ${item.status === "pass" ? "success" : "warn"}`}>{item.status}</span>
                  <strong>{item.target}</strong>
                  <p>{item.finding}</p>
                </article>
              ))}
              {snapshot.logs.slice(0, 4).map((log) => (
                <article className="audit-row" key={log.id}>
                  <span className={`badge ${log.level === "error" ? "danger" : log.level === "warn" ? "warn" : "success"}`}>{log.level}</span>
                  <strong>{log.event}</strong>
                  <p>{log.message}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
