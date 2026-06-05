"use client";

import { useEffect, useMemo, useState } from "react";
import type { ConfirmPlatformVersionPublishRequest, ContentDraftReviewRequest, ContentPlatformVersionRequest, ContentStatus, ContentWorkbenchContentRow, ContentWorkbenchOriginKind, ContentWorkbenchSnapshot, CreatorVideoDiscussionResult, CreatorVideoDraftResult, Platform, PlatformVersionPatchRequest, PlatformVersionStatus } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { contentStatusLabels, platformLabels, platformVersionStatusLabels } from "../foundations/labels";
import { ContentDetail, ContentTable, PlatformVersionEditor } from "../patterns/ContentManagement";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

type SourceFilter = "operating_default" | "all" | "trusted_dashboard" | "not_trusted_dashboard" | ContentWorkbenchOriginKind;
type StatusFilter = "all" | `content:${ContentStatus}` | `version:${PlatformVersionStatus}`;
type SortKey = "operating_desc" | "updated_desc" | "published_desc" | "platform_asc" | "trusted_desc" | "trusted_asc";
type DensityMode = "comfortable" | "compact";

const platformFilters: Array<Platform | "all"> = ["all", "douyin", "xiaohongshu", "video_account", "bilibili", "wechat", "other"];

const sourceFilters: Array<{ value: SourceFilter; label: string }> = [
  { value: "operating_default", label: "运营视图" },
  { value: "trusted_dashboard", label: "进入运营看板" },
  { value: "action_item_generated", label: "行动项草稿" },
  { value: "local_draft", label: "待审/排期草稿" },
  { value: "trusted_creator_center", label: "创作者中心内容" },
  { value: "idea_converted", label: "idea 转内容" },
  { value: "not_trusted_dashboard", label: "不进运营看板" },
  { value: "manual_import", label: "手动补录" },
  { value: "external_untrusted", label: "外部导入" },
  { value: "unknown_local", label: "未归类诊断" },
  { value: "all", label: "全部本地/诊断" }
];

const statusFilters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部状态" },
  ...(["idea", "draft", "scheduled", "published", "reviewed"] as ContentStatus[]).map((status) => ({ value: `content:${status}` as StatusFilter, label: `内容：${contentStatusLabels[status]}` })),
  ...(["draft", "needs_review", "scheduled", "published", "failed", "blocked"] as PlatformVersionStatus[]).map((status) => ({ value: `version:${status}` as StatusFilter, label: `版本：${platformVersionStatusLabels[status]}` }))
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "operating_desc", label: "运营优先" },
  { value: "updated_desc", label: "更新时间最近" },
  { value: "published_desc", label: "发布时间最近" },
  { value: "platform_asc", label: "平台 A-Z" },
  { value: "trusted_desc", label: "先看进入运营看板" },
  { value: "trusted_asc", label: "先看不进运营看板" }
];

function timeValue(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function rowUpdatedAt(row: ContentWorkbenchContentRow) {
  return Math.max(
    timeValue(row.content.scheduledAt),
    timeValue(row.content.publishedAt),
    timeValue(row.latestSnapshotDate),
    ...row.platformVersions.map((version) => timeValue(version.updatedAt)),
    ...row.platformVersions.map((version) => timeValue(version.scheduledAt)),
    ...row.queueItems.map((item) => timeValue(item.scheduledAt))
  );
}

function rowPublishedAt(row: ContentWorkbenchContentRow) {
  return Math.max(timeValue(row.content.publishedAt), ...row.platformVersions.map((version) => timeValue(version.publishedAt)));
}

function hasActionableVersion(row: ContentWorkbenchContentRow) {
  return row.platformVersions.some((version) => ["needs_review", "scheduled", "failed", "blocked"].includes(version.status)) ||
    row.queueItems.some((item) => ["needs_review", "queued", "scheduled", "publishing", "failed", "blocked"].includes(item.status));
}

function isOperatingContentRow(row: ContentWorkbenchContentRow) {
  if (row.includedInTrustedDashboardReview) return true;
  if (row.originKind === "action_item_generated") return true;
  if ((row.originKind === "local_draft" || row.originKind === "idea_converted") && hasActionableVersion(row)) return true;
  return false;
}

function operatingPriority(row: ContentWorkbenchContentRow) {
  if (row.platformVersions.some((version) => version.status === "failed" || version.status === "blocked")) return 5;
  if (row.originKind === "action_item_generated") return 4;
  if (row.platformVersions.some((version) => version.status === "needs_review")) return 3;
  if (row.platformVersions.some((version) => version.status === "scheduled")) return 2;
  if (row.includedInTrustedDashboardReview) return 1;
  return 0;
}

function rowPlatforms(row: ContentWorkbenchContentRow) {
  return new Set<Platform>([row.content.platform, ...row.platformVersions.map((version) => version.platform), ...row.queueItems.map((item) => item.platform)]);
}

function rowMatchesSearch(row: ContentWorkbenchContentRow, query: string) {
  if (!query) return true;
  const text = [
    row.content.title,
    row.content.topic,
    row.content.notes,
    row.originLabel,
    row.dashboardReviewLabel,
    row.dashboardReviewReason,
    ...row.platformVersions.flatMap((version) => [version.title, version.body, version.nextAction, version.platform])
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes(query.toLowerCase().trim());
}

function filterRows(rows: ContentWorkbenchContentRow[], filters: { query: string; platform: Platform | "all"; source: SourceFilter; status: StatusFilter; sort: SortKey }) {
  return rows
    .filter((row) => rowMatchesSearch(row, filters.query))
    .filter((row) => filters.platform === "all" || rowPlatforms(row).has(filters.platform))
    .filter((row) => {
      if (filters.source === "operating_default") return isOperatingContentRow(row);
      if (filters.source === "all") return true;
      if (filters.source === "trusted_dashboard") return row.includedInTrustedDashboardReview;
      if (filters.source === "not_trusted_dashboard") return !row.includedInTrustedDashboardReview;
      return row.originKind === filters.source;
    })
    .filter((row) => {
      if (filters.status === "all") return true;
      const [scope, value] = filters.status.split(":") as ["content" | "version", ContentStatus | PlatformVersionStatus];
      if (scope === "content") return row.content.status === value;
      return row.platformVersions.some((version) => version.status === value);
    })
    .sort((a, b) => {
      if (filters.sort === "operating_desc") return operatingPriority(b) - operatingPriority(a) || rowUpdatedAt(b) - rowUpdatedAt(a);
      if (filters.sort === "published_desc") return rowPublishedAt(b) - rowPublishedAt(a) || rowUpdatedAt(b) - rowUpdatedAt(a);
      if (filters.sort === "platform_asc") return platformLabels[a.content.platform].localeCompare(platformLabels[b.content.platform]) || rowUpdatedAt(b) - rowUpdatedAt(a);
      if (filters.sort === "trusted_desc") return Number(b.includedInTrustedDashboardReview) - Number(a.includedInTrustedDashboardReview) || rowUpdatedAt(b) - rowUpdatedAt(a);
      if (filters.sort === "trusted_asc") return Number(a.includedInTrustedDashboardReview) - Number(b.includedInTrustedDashboardReview) || rowUpdatedAt(b) - rowUpdatedAt(a);
      return rowUpdatedAt(b) - rowUpdatedAt(a);
    });
}

function isoFromLocalDateTime(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function CreatorVideoPanel({
  onCreated
}: {
  onCreated: (result: CreatorVideoDraftResult) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [scriptNotes, setScriptNotes] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [discussion, setDiscussion] = useState<CreatorVideoDiscussionResult | null>(null);
  const [result, setResult] = useState<CreatorVideoDraftResult | null>(null);
  const [busy, setBusy] = useState<"discuss" | "save" | null>(null);
  const [message, setMessage] = useState("输入一个大概想法，先和本地创作助手讨论，再保存四平台版本。");

  function creatorDraftPayload(extra?: { action?: "discuss" }) {
    return {
      action: extra?.action,
      title: title || discussion?.idea.title,
      topic: topic || discussion?.idea.topic,
      brief,
      scriptNotes: scriptNotes || undefined,
      materialNotes: materialNotes || undefined,
      scheduledAt: isoFromLocalDateTime(scheduledAt),
      revisionPrompt: revisionPrompt || undefined,
      previousAnalysis: discussion?.analysis.direction
    };
  }

  async function discussDraft(regenerating = false) {
    setBusy("discuss");
    setMessage(regenerating ? "正在按调整要求重新生成讨论稿..." : "正在分析方向并生成四平台讨论稿...");
    try {
      const response = await fetch("/api/self-media/creator-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creatorDraftPayload({ action: "discuss" }))
      });
      const body = await response.json() as CreatorVideoDiscussionResult & { errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "创作讨论生成失败");
      setDiscussion(body);
      if (!title) setTitle(body.idea.title);
      if (!topic) setTopic(body.idea.topic);
      setMessage(regenerating ? "已按调整要求重新生成，可继续修改或保存。" : "讨论稿已生成，可调整方向后重新生成，也可以直接保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创作讨论生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function createDraft() {
    setBusy("save");
    setMessage("正在保存四平台草稿...");
    try {
      const response = await fetch("/api/self-media/creator-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creatorDraftPayload())
      });
      const body = await response.json() as CreatorVideoDraftResult & { errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "新视频生成失败");
      setResult(body);
      await onCreated(body);
      setMessage(body.content.scheduledAt ? "四平台版本已保存，并已进入日历排期。" : "四平台版本已保存，等待人工确认发布时间。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新视频生成失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title="创作讨论"
      eyebrow="创作者工作流"
      action={<span className="sm-badge sm-badge-info">本地规则生成</span>}
    >
      <div className="form-grid creator-video-form" id="new-video" data-testid="creator-new-video-panel">
        <label>
          <span>标题方向</span>
          <input className="sm-input" data-testid="creator-video-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：我用 AI 做了一条短片复盘" />
        </label>
        <label>
          <span>主题</span>
          <input className="sm-input" data-testid="creator-video-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例如：AI短片 / 自媒体复盘 / 工具教程" />
        </label>
        <label>
          <span>未来发布时间</span>
          <input className="sm-input" data-testid="creator-video-scheduled-at" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
        </label>
        <label>
          <span>大致内容</span>
          <textarea className="sm-input" data-testid="creator-video-brief" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="写几句话就行：想表达什么、给谁看、希望观众做什么。" />
        </label>
        <label>
          <span>调整方向/语气/时长/受众</span>
          <textarea className="sm-input" data-testid="creator-copilot-revision" value={revisionPrompt} onChange={(event) => setRevisionPrompt(event.target.value)} placeholder="可选：例如面向新手、语气更轻松、控制在 60 秒、少讲工具多讲结果。" />
        </label>
        <label>
          <span>脚本备注</span>
          <textarea className="sm-input" value={scriptNotes} onChange={(event) => setScriptNotes(event.target.value)} placeholder="可选：口播结构、关键台词、镜头顺序。" />
        </label>
        <label>
          <span>素材备注</span>
          <textarea className="sm-input" value={materialNotes} onChange={(event) => setMaterialNotes(event.target.value)} placeholder="可选：已有素材、封面方向、不能漏的信息。" />
        </label>
        <div className="inline-stack">
          <Button data-testid="creator-copilot-generate" disabled={Boolean(busy)} onClick={() => discussDraft(false)} variant="primary">分析并生成讨论稿</Button>
          <Button data-testid="creator-copilot-regenerate" disabled={Boolean(busy) || !discussion} onClick={() => discussDraft(true)} variant="secondary">按调整重新生成</Button>
          <Button data-testid="creator-video-generate" disabled={Boolean(busy)} onClick={createDraft} variant="secondary">生成并保存四平台版本</Button>
          <a className="sm-button sm-button-secondary" href="/calendar">去日历排期</a>
        </div>
        <p className="muted">{message}</p>
        <p className="muted">平台激励/创作标签均为建议，需发布前人工确认；不会调用外部 LLM key，也不会自动发布。</p>
      </div>
      {discussion && (
        <div className="creator-video-result" data-testid="creator-copilot-discussion">
          <section>
            <div className="section-title-row">
              <div>
                <p className="eyebrow">讨论结果</p>
                <h2>内容方向分析</h2>
              </div>
              <span className="sm-badge sm-badge-warning">需人工确认标签/激励</span>
            </div>
            <p>{discussion.analysis.direction}</p>
            <div className="metric-grid">
              <div><span className="muted">受众</span><strong>{discussion.analysis.audience}</strong></div>
              <div><span className="muted">语气</span><strong>{discussion.analysis.tone}</strong></div>
              <div><span className="muted">时长</span><strong>{discussion.analysis.duration}</strong></div>
              <div><span className="muted">发布计划</span><strong>{discussion.publishPlan.planSummary}</strong></div>
            </div>
            <ul>
              {discussion.analysis.structure.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <p className="muted">{discussion.analysis.risks.join(" ")}</p>
          </section>
          <div className="platform-import-operation-summaries">
            {discussion.platformDifferences.map((item) => (
              <article className="is-passed" key={item.platform}>
                <header>
                  <PlatformBadge compact platform={item.platform} />
                  <span className="sm-badge sm-badge-info">平台差异</span>
                </header>
                <strong>{item.focus}</strong>
                <p>{item.format}</p>
                <p>{item.adjustment}</p>
                <p>{item.manualCheck}</p>
              </article>
            ))}
          </div>
          <div className="platform-import-operation-summaries">
            {discussion.drafts.map((draft) => (
              <article className="is-passed" key={draft.platform}>
                <header>
                  <PlatformBadge compact platform={draft.platform} />
                  <span className="sm-badge sm-badge-warning">待保存</span>
                </header>
                <strong>{draft.title}</strong>
                <p>{draft.body}</p>
                <p>{draft.coverNote}</p>
                <p>{draft.platformAdvice}</p>
                <p>{draft.incentiveTagAdvice}</p>
              </article>
            ))}
          </div>
        </div>
      )}
      {result && (
        <div className="platform-import-operation-summaries creator-video-result" data-testid="creator-video-result">
          {result.drafts.map((draft) => (
            <article className="is-passed" key={draft.platform}>
              <header>
                <PlatformBadge compact platform={draft.platform} />
                <span className="sm-badge sm-badge-success">已保存</span>
              </header>
              <strong>{draft.title}</strong>
              <p>{draft.body}</p>
              <p>{draft.coverNote}</p>
              <p>{draft.platformAdvice}</p>
              <p>{draft.incentiveTagAdvice}</p>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}

function TrustedScopeCurationPanel({
  snapshot,
  onToggle
}: {
  snapshot: ContentWorkbenchSnapshot;
  onToggle: (contentId: string, excluded: boolean) => Promise<void>;
}) {
  const items = snapshot.trustedScopeCuration.items.slice(0, 16);
  return (
    <Panel
      title="运营看板内容口径"
      eyebrow="不删除，只控制是否入看板"
      action={
        <div className="inline-stack">
          <span className="sm-badge sm-badge-success">{snapshot.trustedScopeCuration.activeContentCount} 条进入看板</span>
          {snapshot.trustedScopeCuration.userExcludedContentCount > 0 && <span className="sm-badge sm-badge-warning">{snapshot.trustedScopeCuration.userExcludedContentCount} 条不进看板</span>}
        </div>
      }
    >
      <div className="table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th>内容</th>
              <th>平台</th>
              <th>状态</th>
              <th>快照</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.contentId}>
                <td>
                  <strong>{item.title}</strong>
                </td>
                <td><PlatformBadge compact platform={item.platform} /></td>
                <td>{item.userExcludedFromTrustedScope ? <span className="sm-badge sm-badge-warning">不进运营看板</span> : <span className="sm-badge sm-badge-success">进入运营看板</span>}</td>
                <td>{item.snapshotCount} 条 / 曝光 {item.views}</td>
                <td>
                  <Button
                    onClick={() => onToggle(item.contentId, !item.userExcludedFromTrustedScope)}
                    variant={item.userExcludedFromTrustedScope ? "secondary" : "ghost"}
                  >
                    {item.userExcludedFromTrustedScope ? "恢复进看板" : "不进看板"}
                  </Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>暂无可进入运营看板的创作者中心内容。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">排除只影响默认运营看板、复盘和建议口径；内容、快照和导入记录仍保留在本地数据库。</p>
    </Panel>
  );
}

function WorkbenchSummaryPanel({ snapshot }: { snapshot: ContentWorkbenchSnapshot }) {
  const operatingRowCount = snapshot.contentRows.filter(isOperatingContentRow).length;
  return (
    <Panel title="内容运营概览" eyebrow="默认运营视图">
      <div className="metric-strip">
        <div><strong>{operatingRowCount}</strong><span>默认可见</span></div>
        <div><strong>{snapshot.summary.trustedDashboardContentCount}</strong><span>进入运营看板</span></div>
        <div><strong>{snapshot.summary.draftContentCount}</strong><span>待审草稿</span></div>
        <div><strong>{snapshot.platformVersions.filter((item) => item.status === "scheduled").length}</strong><span>已排期稿件</span></div>
        <div><strong>{snapshot.summary.actionGeneratedDraftCount}</strong><span>行动项草稿</span></div>
        <div><strong>{snapshot.summary.publishRecordCount}</strong><span>人工发布记录</span></div>
      </div>
      <p className="muted">默认先看进入运营看板的真实内容、待审核/已排期稿件和行动项生成草稿；手动补录、外部导入和未归类历史行保留在“全部本地/诊断”筛选里。</p>
    </Panel>
  );
}

export function ContentPage({ snapshot }: { snapshot: ContentWorkbenchSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("operating_default");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("operating_desc");
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState<DensityMode>("comfortable");
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>(() => {
    const defaultContentId = snapshot.contentRows.find(isOperatingContentRow)?.content.id ?? snapshot.contents[0]?.id;
    if (typeof window === "undefined") return defaultContentId;
    return new URLSearchParams(window.location.search).get("contentId") ?? defaultContentId;
  });
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return snapshot.platformVersions[0]?.id;
    return new URLSearchParams(window.location.search).get("versionId") ?? snapshot.platformVersions[0]?.id;
  });
  const [message, setMessage] = useState("选择内容后编辑平台版本。");
  const filteredRows = useMemo(
    () => filterRows(current.contentRows, { query, platform: platformFilter, source: sourceFilter, status: statusFilter, sort }),
    [current.contentRows, platformFilter, query, sort, sourceFilter, statusFilter]
  );
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleContents = pagedRows.map((row) => row.content);
  const resultStart = filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const resultEnd = Math.min(safePage * pageSize, filteredRows.length);
  const selected = selectedContentId ? current.contents.find((item) => item.id === selectedContentId) : undefined;
  const selectedWorkbenchRow = selected ? current.contentRows.find((row) => row.content.id === selected.id) : undefined;
  const selectedVersions = useMemo(() => selected ? current.platformVersions.filter((version) => version.contentId === selected.id) : [], [current.platformVersions, selected]);
  const selectedVersion = selectedVersions.find((version) => version.id === selectedVersionId) ?? selectedVersions[0];
  const selectedQueue = selectedVersion ? current.queue.find((item) => item.contentId === selectedVersion.contentId && item.platform === selectedVersion.platform) : undefined;
  const selectedActionItem = selectedVersion ? current.actionItems.find((item) => item.platformVersionId === selectedVersion.id || item.publishQueueItemId === selectedQueue?.id) : undefined;
  const scheduledCount = current.platformVersions.filter((item) => item.status === "scheduled").length;
  const blockedCount = current.platformVersions.filter((item) => item.status === "blocked" || item.status === "failed").length;
  const operatingDefaultCount = current.contentRows.filter(isOperatingContentRow).length;

  useEffect(() => {
    setPage(1);
  }, [pageSize, platformFilter, query, sort, sourceFilter, statusFilter]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      if (selectedContentId) setSelectedContentId(undefined);
      if (selectedVersionId) setSelectedVersionId(undefined);
      return;
    }
    if (selectedContentId && filteredRows.some((row) => row.content.id === selectedContentId)) return;
    const next = filteredRows[0];
    setSelectedContentId(next.content.id);
    setSelectedVersionId(next.platformVersions[0]?.id);
  }, [current.platformVersions, filteredRows, selectedContentId]);

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/content-workbench");
    const next = (await response.json()) as ContentWorkbenchSnapshot;
    setCurrent(next);
    return next;
  }

  async function handleCreatorDraftCreated(result: CreatorVideoDraftResult) {
    setSelectedContentId(result.content.id);
    setSelectedVersionId(result.platformVersions[0]?.id);
    setSourceFilter("local_draft");
    setStatusFilter(result.content.scheduledAt ? "version:scheduled" : "all");
    setSort("updated_desc");
    const next = await refreshDashboard();
    if (!next.contentRows.some((row) => row.content.id === result.content.id)) setMessage("新视频已保存，但当前筛选未显示；切换到全部本地/诊断可查看。");
    else setMessage("新视频已保存为内容和四个平台版本，可继续编辑或去日历查看排期。");
  }

  async function patchTrustedScope(contentId: string, excluded: boolean) {
    const response = await fetch("/api/self-media/contents/trust-scope", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentId, userExcludedFromTrustedScope: excluded })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.errorMessage ?? "内容可信范围更新失败");
      return;
    }
    setMessage(excluded ? "已设为不进入运营看板；数据没有删除，仍保留在本地库。" : "已恢复进入默认运营看板、复盘和建议。");
    await refreshDashboard();
  }

  async function saveVersion(payload: ContentPlatformVersionRequest) {
    const response = await fetch("/api/self-media/content-versions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errorMessage ?? "保存平台版本失败");
    setSelectedVersionId(result.version.id);
    setMessage(`平台版本已保存：${result.version.title}`);
    await refreshDashboard();
  }

  async function patchVersion(payload: PlatformVersionPatchRequest) {
    const version = current.platformVersions.find((item) => item.id === payload.id);
    async function send(next: PlatformVersionPatchRequest) {
      const response = await fetch("/api/self-media/content-versions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "平台版本更新失败");
      return result.version as ContentWorkbenchSnapshot["platformVersions"][number];
    }
    try {
      if (payload.status === "scheduled" && version && version.status !== "needs_review" && version.status !== "scheduled") {
        const needsReview = await send({ id: payload.id, status: "needs_review", scheduledAt: payload.scheduledAt, checklist: payload.checklist });
        await send({ ...payload, id: needsReview.id, status: "scheduled" });
      } else {
        await send(payload);
      }
      setMessage("平台版本状态已更新。");
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "平台版本更新失败");
    }
  }

  async function reviewDraft(payload: ContentDraftReviewRequest) {
    const response = await fetch("/api/self-media/content-versions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, action: "review_draft" })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.errorMessage ?? "草稿审核保存失败");
      return;
    }
    setSelectedContentId(result.content.id);
    setSelectedVersionId(result.platformVersion.id);
    setMessage(`草稿审核已保存：${result.content.title}。排期只是进入日历，不会自动发布。`);
    await refreshDashboard();
  }

  async function confirmPublish(payload: ConfirmPlatformVersionPublishRequest) {
    const response = await fetch("/api/self-media/content-versions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, action: "confirm_publish" })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.errorMessage ?? "发布结果记录失败");
      return;
    }
    setSelectedVersionId(result.version.id);
    setMessage(result.version.status === "published" ? "已记录人工发布确认。" : "已记录发布异常，回到草稿处理下一步。");
    await refreshDashboard();
  }

  return (
    <AppShell active="/content">
      <PageHeader
        eyebrow="内容运营"
        title="内容管理"
        description="默认只显示可直接运营的内容、待审核/已排期稿件和行动项草稿；全量历史记录在诊断筛选里查看。"
        actions={
          <>
            <span className="sm-badge sm-badge-info">{operatingDefaultCount} 条默认可见</span>
            <span className="sm-badge sm-badge-success">{current.summary.trustedDashboardContentCount} 条进运营看板</span>
            <span className="sm-badge sm-badge-success">{scheduledCount} 条已排期</span>
            <span className="sm-badge sm-badge-info">{current.summary.actionGeneratedDraftCount} 条行动草稿</span>
            <span className="sm-badge sm-badge-info">{current.summary.publishRecordCount} 条人工发布记录</span>
            {blockedCount > 0 && <span className="sm-badge sm-badge-warning">{blockedCount} 条需处理</span>}
          </>
        }
      />
      <p className="operation-message" data-testid="content-operation-message">{message}</p>
      <CreatorVideoPanel onCreated={handleCreatorDraftCreated} />
      <WorkbenchSummaryPanel snapshot={current} />
      <TrustedScopeCurationPanel snapshot={current} onToggle={patchTrustedScope} />
      <Panel title="内容列表筛选" eyebrow="默认运营视图">
        <div className="content-workbench-toolbar" data-testid="content-workbench-filters">
          <label className="content-workbench-search">
            <span>搜索</span>
            <input className="sm-input" onChange={(event) => setQuery(event.target.value)} placeholder="标题、选题、来源、平台版本" type="search" value={query} />
          </label>
          <label>
            <span>平台</span>
            <select className="sm-input" onChange={(event) => setPlatformFilter(event.target.value as Platform | "all")} value={platformFilter}>
              {platformFilters.map((item) => <option key={item} value={item}>{item === "all" ? "全部平台" : platformLabels[item]}</option>)}
            </select>
          </label>
          <label>
            <span>显示范围</span>
            <select className="sm-input" onChange={(event) => setSourceFilter(event.target.value as SourceFilter)} value={sourceFilter}>
              {sourceFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span>状态</span>
            <select className="sm-input" onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}>
              {statusFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span>排序</span>
            <select className="sm-input" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
              {sortOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span>每页</span>
            <select className="sm-input" onChange={(event) => setPageSize(Number(event.target.value))} value={pageSize}>
              {[12, 24, 48].map((item) => <option key={item} value={item}>{item} 条</option>)}
            </select>
          </label>
          <label>
            <span>密度</span>
            <select className="sm-input" onChange={(event) => setDensity(event.target.value as DensityMode)} value={density}>
              <option value="comfortable">标准</option>
              <option value="compact">紧凑</option>
            </select>
          </label>
        </div>
        <div className="content-workbench-pagination" aria-label="内容工作台分页">
          <span>{resultStart}-{resultEnd} / {filteredRows.length} 条匹配，库内共 {current.contentRows.length} 条</span>
          <div className="inline-stack">
            <Button disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} variant="secondary">上一页</Button>
            <span className="sm-badge sm-badge-info">第 {safePage} / {pageCount} 页</span>
            <Button disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} variant="secondary">下一页</Button>
          </div>
        </div>
        <p className="muted">进入运营看板 / 不进运营看板只说明默认运营看板和复盘是否采用该内容的创作者中心内容级指标；手动补录、外部导入和行动项草稿仍可在这里查看编辑，但不会因此进入运营指标总数。</p>
      </Panel>
      <div className="content-layout">
        <div className="content-main-stack">
          <ContentTable
            contents={visibleContents}
            density={density}
            onSelect={(id) => { setSelectedContentId(id); setSelectedVersionId(current.platformVersions.find((version) => version.contentId === id)?.id); }}
            resultSummary={`${resultStart}-${resultEnd} / ${filteredRows.length} 条`}
            rows={pagedRows}
            selectedContentId={selected?.id}
            versions={current.platformVersions}
          />
          <ContentDetail
            content={selected}
            onSelectVersion={setSelectedVersionId}
            publishRecords={current.publishRecords}
            queueItems={current.queue}
            selectedVersionId={selectedVersion?.id}
            versions={current.platformVersions}
            workbenchRow={selectedWorkbenchRow}
          />
        </div>
        <PlatformVersionEditor
          actionItem={selectedActionItem}
          content={selected}
          onConfirmPublish={confirmPublish}
          onReviewDraft={reviewDraft}
          onSave={saveVersion}
          onStatusPatch={patchVersion}
          queueItem={selectedQueue}
          version={selectedVersion}
        />
      </div>
    </AppShell>
  );
}
