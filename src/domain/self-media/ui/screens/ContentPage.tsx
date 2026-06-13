"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ConfirmPlatformVersionPublishRequest, ContentDraftReviewRequest, ContentPlatformVersionRequest, ContentStatus, ContentWorkbenchContentRow, ContentWorkbenchOriginKind, ContentWorkbenchSnapshot, CreatorVideoDiscussionResult, CreatorVideoDraftResult, Platform, PlatformVersionPatchRequest, PlatformVersionStatus, PublishHandoffPackage } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { formatDateTime, isoFromLocalDateTime, localDateTimeInputValue } from "../foundations/format";
import { contentStatusLabels, platformLabels, platformVersionStatusLabels } from "../foundations/labels";
import { ContentComposerPanel, ContentLibraryPanel, ContentModeSwitch, type ContentPageMode } from "../patterns/ContentComposerLibraryPanels";
import { ContentDetail, ContentTable, PlatformVersionEditor } from "../patterns/ContentManagement";
import { Button } from "../primitives/Button";
import { Panel } from "../primitives/Panel";

type SourceFilter = "operating_default" | "all" | "trusted_dashboard" | "not_trusted_dashboard" | ContentWorkbenchOriginKind;
type StatusFilter = "all" | `content:${ContentStatus}` | `version:${PlatformVersionStatus}`;
type SortKey = "operating_desc" | "updated_desc" | "published_desc" | "platform_asc" | "trusted_desc" | "trusted_asc";
type DensityMode = "comfortable" | "compact";

export interface ContentPageInitialRequest {
  scheduledAt?: string;
  acceptanceRunId?: string;
  dataDomain?: "acceptance_run" | "user_work";
  contentId?: string;
  versionId?: string;
  mode?: ContentPageMode;
}

const platformFilters: Array<Platform | "all"> = ["all", "douyin", "xiaohongshu", "video_account", "bilibili", "other"];

const sourceFilters: Array<{ value: SourceFilter; label: string }> = [
  { value: "operating_default", label: "真实作品" },
  { value: "trusted_dashboard", label: "进入运营看板" },
  { value: "action_item_generated", label: "行动项草稿" },
  { value: "local_draft", label: "待审/排期草稿" },
  { value: "trusted_creator_center", label: "创作者中心内容" },
  { value: "idea_converted", label: "idea 转内容" },
  { value: "not_trusted_dashboard", label: "不进运营看板" },
  { value: "manual_import", label: "手动补录" },
  { value: "external_untrusted", label: "外部导入" },
  { value: "unknown_local", label: "未归类本地内容" },
  { value: "all", label: "全部本地内容" }
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

function isUserWorkContentRow(row: ContentWorkbenchContentRow) {
  return row.content.dataDomain === "user_work" || row.content.userConfirmedForLibrary === true;
}

function isLocalAcceptanceOrTestContentRow(row: ContentWorkbenchContentRow) {
  return row.content.dataDomain === "acceptance_run" || row.content.dataDomain === "demo_seed";
}

function isOperatingContentRow(row: ContentWorkbenchContentRow) {
  return isUserWorkContentRow(row);
}

function operatingPriority(row: ContentWorkbenchContentRow) {
  if (!isUserWorkContentRow(row)) return 0;
  if (row.platformVersions.some((version) => version.status === "failed" || version.status === "blocked")) return 5;
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

function CreatorVideoPanel({
  initialRequest,
  onCreated
}: {
  initialRequest?: ContentPageInitialRequest;
  onCreated: (result: CreatorVideoDraftResult) => Promise<void>;
}) {
  function defaultCreatorScheduleInput() {
    if (initialRequest?.scheduledAt) return localDateTimeInputValue(initialRequest.scheduledAt);
    const date = new Date(Date.now() + 45 * 60 * 1000);
    const minutes = date.getMinutes();
    if (minutes === 0 || minutes === 30) {
      date.setSeconds(0, 0);
    } else if (minutes < 30) {
      date.setMinutes(30, 0, 0);
    } else {
      date.setHours(date.getHours() + 1, 0, 0, 0);
    }
    return localDateTimeInputValue(date.toISOString());
  }

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState("");
  const [scriptNotes, setScriptNotes] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultCreatorScheduleInput);
  const [acceptanceRunId] = useState(() => initialRequest?.acceptanceRunId);
  const [requestedDataDomain] = useState(() => initialRequest?.dataDomain);
  const scheduleInputRef = useRef<HTMLInputElement | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [discussion, setDiscussion] = useState<CreatorVideoDiscussionResult | null>(null);
  const [result, setResult] = useState<CreatorVideoDraftResult | null>(null);
  const [busy, setBusy] = useState<"discuss" | "save" | null>(null);
  const [message, setMessage] = useState("粘贴上下文或概述视频内容，系统会自动提取选题策略、标题、简介、标签，并默认排到今天。");

  function scheduleInputValue() {
    return scheduleInputRef.current?.value ?? scheduledAt;
  }

  function syncScheduledAt(value: string) {
    setScheduledAt(value);
  }

  const schedulePreviewIso = isoFromLocalDateTime(scheduledAt);
  const schedulePreviewTime = schedulePreviewIso ? new Date(schedulePreviewIso).getTime() : undefined;
  const hasScheduleInput = scheduledAt.trim().length > 0;
  const schedulePreviewIsFuture = schedulePreviewTime !== undefined && schedulePreviewTime > Date.now();

  function creatorDraftPayload(extra?: { action?: "discuss" }) {
    const currentScheduledAt = scheduleInputValue();
    return {
      action: extra?.action,
      title: title || discussion?.idea.title,
      topic: topic || discussion?.idea.topic,
      brief,
      scriptNotes: scriptNotes || undefined,
      materialNotes: materialNotes || undefined,
      scheduledAt: isoFromLocalDateTime(currentScheduledAt),
      revisionPrompt: revisionPrompt || undefined,
      previousAnalysis: discussion?.analysis.direction,
      copilotAnalysis: discussion?.idea.copilotAnalysis,
      acceptanceRunId,
      dataDomain: requestedDataDomain ?? (acceptanceRunId ? "acceptance_run" : undefined)
    };
  }

  async function discussDraft(regenerating = false) {
    setBusy("discuss");
    setMessage(regenerating ? "正在按调整要求重新生成选题策略..." : "正在提取上下文，生成选题策略和四平台标题...");
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
      const sourceLabel = body.assistance.source === "ai_model" ? "AI 已辅助生成" : "已使用本地规则回退";
      setMessage(regenerating ? `${sourceLabel}，并按调整要求重新生成；可继续修改或确认保存。` : `${sourceLabel}选题策略；标题、简介和标签已自动填好，可以直接确认保存。`);
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
      const payload = creatorDraftPayload();
      const requestedScheduleInput = scheduleInputValue().trim();
      const requestedScheduleIso = payload.scheduledAt;
      if (requestedScheduleInput && !requestedScheduleIso) {
        throw new Error("发布时间没有识别成功，请重新选择日期和时间。");
      }
      if (requestedScheduleIso && new Date(requestedScheduleIso).getTime() <= Date.now()) {
        throw new Error("请选择今天稍后的发布时间；过去时间不会加入发布日历。");
      }
      const response = await fetch("/api/self-media/creator-drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json() as CreatorVideoDraftResult & { errorMessage?: string };
      if (!response.ok) throw new Error(body.errorMessage ?? "新视频生成失败");
      const verification = await fetch("/api/self-media/content-workbench");
      const snapshot = (await verification.json()) as ContentWorkbenchSnapshot & { errorMessage?: string };
      if (!verification.ok) throw new Error(snapshot.errorMessage ?? "保存后校验失败");
      const persistedVersions = snapshot.platformVersions.filter((version) => version.contentId === body.content.id);
      if (!snapshot.contents.some((content) => content.id === body.content.id) || persistedVersions.length !== body.platformVersions.length) {
        throw new Error("保存后未在系统中查到完整内容和四平台版本，请重试。");
      }
      const persistedContent = snapshot.contents.find((content) => content.id === body.content.id);
      const persistedQueue = snapshot.queue.filter((item) => item.contentId === body.content.id);
      if (requestedScheduleIso) {
        if (body.content.scheduledAt !== requestedScheduleIso || persistedContent?.scheduledAt !== requestedScheduleIso) {
          throw new Error("已填写未来发布时间，但内容没有加入发布日历，请重试。");
        }
        const versionsScheduled = body.platformVersions.every((version) => version.scheduledAt === requestedScheduleIso && version.status === "scheduled")
          && persistedVersions.every((version) => version.scheduledAt === requestedScheduleIso && version.status === "scheduled");
        const queuesScheduled = persistedQueue.length === body.platformVersions.length
          && persistedQueue.every((item) => item.scheduledAt === requestedScheduleIso && item.status === "scheduled");
        if (!versionsScheduled || !queuesScheduled) {
          throw new Error("已填写未来发布时间，但发布日历没有完整生成四个平台排期，请重试。");
        }
      }
      await onCreated(body);
      setResult(body);
      setMessage(requestedScheduleIso ? `四平台版本已保存，并已加入发布日历：${formatDateTime(requestedScheduleIso)}。` : "四平台版本已保存，等待人工确认发布时间。");
    } catch (error) {
      setResult(null);
      setMessage(error instanceof Error ? error.message : "新视频生成失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title="创作讨论"
      eyebrow="创作者工作流"
      action={<span className={`sm-badge ${discussion?.assistance.source === "ai_model" ? "sm-badge-success" : "sm-badge-info"}`}>{discussion?.assistance.label ?? "AI 辅助 / 本地回退"}</span>}
    >
      <div className="form-grid creator-video-form" id="new-video" data-testid="creator-new-video-panel">
        <label>
          <span>视频上下文 / 概述</span>
          <textarea className="sm-input" data-testid="creator-video-brief" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="把刚做完的视频上下文粘过来，或用几句话概述：这个视频讲什么、最想让观众记住什么、有没有成片画面/数据/踩坑。" />
        </label>
        <label>
          <span>发布日期</span>
          <input className="sm-input" data-testid="creator-video-scheduled-at" ref={scheduleInputRef} type="datetime-local" value={scheduledAt} onChange={(event) => syncScheduledAt(event.target.value)} onInput={(event) => syncScheduledAt(event.currentTarget.value)} />
        </label>
        {schedulePreviewIsFuture && <p className="muted" data-testid="creator-video-schedule-preview">默认排到 {formatDateTime(schedulePreviewIso)}；要改时间再手动调整。</p>}
        {hasScheduleInput && !schedulePreviewIsFuture && <p className="muted" data-testid="creator-video-schedule-preview">请选择今天稍后的发布时间；过去时间不会进入发布日历。</p>}
        <label>
          <span>调整方向/语气/时长/受众</span>
          <textarea className="sm-input" data-testid="creator-copilot-revision" value={revisionPrompt} onChange={(event) => setRevisionPrompt(event.target.value)} placeholder="可选：例如面向新手、语气更轻松、控制在 60 秒、少讲工具多讲结果。" />
        </label>
        <details className="advanced-diagnostics">
          <summary>高级补充：手动改标题、选题、脚本和素材</summary>
          <div className="form-grid">
            <label>
              <span>标题方向</span>
              <input className="sm-input" data-testid="creator-video-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="不填则自动从概述提取" />
            </label>
            <label>
              <span>主题</span>
              <input className="sm-input" data-testid="creator-video-topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="不填则自动判断选题类别" />
            </label>
            <label>
              <span>脚本备注</span>
              <textarea className="sm-input" value={scriptNotes} onChange={(event) => setScriptNotes(event.target.value)} placeholder="可选：口播结构、关键台词、镜头顺序。" />
            </label>
            <label>
              <span>素材备注</span>
              <textarea className="sm-input" value={materialNotes} onChange={(event) => setMaterialNotes(event.target.value)} placeholder="可选：已有素材、封面方向、不能漏的信息。" />
            </label>
          </div>
        </details>
        <div className="inline-stack">
          <Button data-testid="creator-copilot-generate" disabled={Boolean(busy) || !brief.trim()} onClick={() => discussDraft(false)} variant="primary">生成选题策略与四平台标题</Button>
          <Button data-testid="creator-copilot-regenerate" disabled={Boolean(busy) || !discussion} onClick={() => discussDraft(true)} variant="secondary">按调整重新生成</Button>
          <Button data-testid="creator-video-generate" disabled={Boolean(busy) || !brief.trim()} onClick={createDraft} variant="secondary">确认保存并排到今天</Button>
          <a className="sm-button sm-button-secondary" href="/calendar">去日历排期</a>
        </div>
        <p className="muted">{message}</p>
        <p className="muted">平台激励/创作标签均为建议，需发布前人工确认；模型缺少配置或返回异常时使用本地规则，不会自动发布。</p>
      </div>
      {discussion && (
        <div className="creator-video-result" data-testid="creator-copilot-discussion">
          <section>
            <div className="section-title-row">
              <div>
                <p className="eyebrow">讨论结果</p>
                <h2>内容方向分析</h2>
              </div>
              <span className={`sm-badge ${discussion.assistance.source === "ai_model" ? "sm-badge-success" : "sm-badge-warning"}`}>{discussion.assistance.label}</span>
            </div>
            <p>{discussion.analysis.direction}</p>
            <div className="metric-grid">
              <div><span className="muted">受众</span><strong>{discussion.analysis.audience}</strong></div>
              <div><span className="muted">语气</span><strong>{discussion.analysis.tone}</strong></div>
              <div><span className="muted">时长</span><strong>{discussion.analysis.duration}</strong></div>
              <div><span className="muted">发布计划</span><strong>{discussion.publishPlan.planSummary}</strong></div>
            </div>
            <div className="metric-grid" data-testid="creator-topic-strategy">
              <div><span className="muted">选题角度</span><strong>{discussion.analysis.topicStrategy.coreAngle}</strong></div>
              <div><span className="muted">观众痛点</span><strong>{discussion.analysis.topicStrategy.audiencePain}</strong></div>
              <div><span className="muted">内容承诺</span><strong>{discussion.analysis.topicStrategy.promise}</strong></div>
              <div><span className="muted">证明点</span><strong>{discussion.analysis.topicStrategy.proof}</strong></div>
            </div>
            <ul>
              {discussion.analysis.topicStrategy.titleOptions.map((item) => <li key={item}>标题候选：{item}</li>)}
            </ul>
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

function PublishExecutionWorkbenchPanel({
  snapshot,
  onConfirmPublish,
  onSelect,
  selectedContentId
}: {
  snapshot: ContentWorkbenchSnapshot;
  onConfirmPublish: (payload: ConfirmPlatformVersionPublishRequest) => Promise<void>;
  onSelect: (contentId: string, versionId: string) => void;
  selectedContentId?: string;
}) {
  const [copyMessage, setCopyMessage] = useState("手动发布助手只复制本地内容，不会替你自动发布。");
  const allPackages = snapshot.publishToMetricsWorkbench.publishHandoffPackages;
  const packages = selectedContentId ? allPackages.filter((pkg) => pkg.contentId === selectedContentId).slice(0, 4) : [];
  const items = selectedContentId ? snapshot.publishToMetricsWorkbench.executionItems.filter((item) => item.contentId === selectedContentId).slice(0, 4) : [];
  async function copyText(label: string, text: string) {
    if (!text.trim()) {
      setCopyMessage(`${label}暂无可复制内容。`);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyMessage(`${label}已准备好；当前浏览器不支持自动写入剪贴板。`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${label}已复制。`);
    } catch {
      setCopyMessage(`${label}复制失败，请在内容编辑区手动复制。`);
    }
  }
  function handoffNote(pkg: PublishHandoffPackage) {
    return [
      `手动发布助手：${platformLabels[pkg.platform]}人工后台回填。`,
      `能力状态：${pkg.capability.label}。`,
      pkg.complianceNote
    ].join(" ");
  }
  return (
    <Panel
      title="手动发布助手"
      eyebrow="人工发布"
      action={<span className="sm-badge sm-badge-info">{packages.length} 个当前作品平台动作</span>}
    >
      <p className="muted">当前不是自动发布；这里只帮你复制文案/标签、打开平台后台，并在人工操作后回填 submitted_review / published / blocked / failed。</p>
      {!selectedContentId && <p className="muted">先在内容列表选择一个真实作品，助手才显示对应四个平台动作，不铺开旧发布包。</p>}
      <div className="platform-import-operation-summaries" data-testid="publish-handoff-package">
        {packages.map((pkg) => {
          const canConfirm = pkg.status === "scheduled";
          return (
            <article
              className={pkg.capability.status === "future_official_api_candidate" ? "is-passed" : ""}
              data-content-id={pkg.contentId}
              data-platform-version-id={pkg.platformVersionId}
              key={pkg.id}
            >
              <header>
                <PlatformBadge compact platform={pkg.platform} />
                <span className="sm-badge sm-badge-info">{pkg.capability.label}</span>
              </header>
              <strong>{pkg.versionTitle}</strong>
              <p>{pkg.copy.coverNote || "封面备注待补充"}</p>
              <p>{pkg.copy.scheduleText}</p>
              <p>{pkg.capability.note}</p>
              <p>不是自动发布：复制文案/标签后，请到平台后台手动发布或提交审核。</p>
              {pkg.latestRecordStatus && <p>最近回填：{pkg.latestRecordStatus} · {formatDateTime(pkg.latestRecordAt)}</p>}
              <div className="inline-stack">
                <Button data-testid="copy-publish-text" onClick={() => void copyText(`${platformLabels[pkg.platform]}发布文案`, pkg.copy.publishText)} variant="secondary">复制发布文案</Button>
                <Button data-testid="copy-tags" onClick={() => void copyText(`${platformLabels[pkg.platform]}标签`, pkg.copy.tagsText)} variant="secondary">复制标签</Button>
                <a className="sm-button sm-button-primary" data-testid="open-official-backend" href={pkg.officialBackendUrl} rel="noreferrer" target="_blank">{pkg.backendActionLabel}</a>
                {canConfirm ? (
                  <>
                    <Button
                      data-testid="record-submitted-review"
                      onClick={() => onConfirmPublish({ platformVersionId: pkg.platformVersionId, status: "submitted_review", confirmationSource: "manual", note: `${handoffNote(pkg)} 已提交平台后台审核。` })}
                      variant="secondary"
                    >
                      记录已提交审核
                    </Button>
                    <Button
                      data-testid="record-published"
                      onClick={() => onConfirmPublish({ platformVersionId: pkg.platformVersionId, status: "published", confirmationSource: "manual", note: `${handoffNote(pkg)} 已发布。` })}
                      variant="primary"
                    >
                      记录已发布
                    </Button>
                    <Button
                      data-testid="record-failed"
                      onClick={() => onConfirmPublish({ platformVersionId: pkg.platformVersionId, status: "failed", confirmationSource: "manual", note: `${handoffNote(pkg)} 发布失败，需要回到草稿处理。` })}
                      variant="ghost"
                    >
                      记录失败
                    </Button>
                  </>
                ) : (
                  <span className="sm-badge sm-badge-warning" data-testid="publish-handoff-not-scheduled">未排期作品先保存排期；这里不显示“记录已发布”主按钮。</span>
                )}
              </div>
            </article>
          );
        })}
        {selectedContentId && packages.length === 0 && (
          <article>
            <strong>当前作品暂无可发布平台动作</strong>
            <p>先生成并保存四个平台版本，或在平台版本编辑区保存排期后再回来。</p>
          </article>
        )}
      </div>
      <p className="muted">{copyMessage}</p>
      <div className="table-wrap" data-testid="publish-execution-workbench">
        <table className="sm-table">
          <thead>
            <tr>
              <th>内容</th>
              <th>平台</th>
              <th>计划/状态</th>
              <th>下一步</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.platformVersionId}>
                <td>
                  <strong>{item.contentTitle}</strong>
                  <small>{item.versionTitle}</small>
                </td>
                <td><PlatformBadge compact platform={item.platform} /></td>
                <td>
                  <span className={item.timing === "blocked_or_failed" ? "sm-badge sm-badge-warning" : item.timing === "published_waiting_metrics" ? "sm-badge sm-badge-info" : "sm-badge sm-badge-success"}>
                    {platformVersionStatusLabels[item.status]}
                  </span>
                  <small>{formatDateTime(item.scheduledAt ?? item.publishedAt)}</small>
                </td>
                <td>{item.nextAction}</td>
                <td>
                  <div className="inline-stack">
                    <Button onClick={() => onSelect(item.contentId, item.platformVersionId)} variant="secondary">打开内容编辑</Button>
                    <a className="sm-button sm-button-secondary" href={item.calendarUrl}>打开日历</a>
                    {item.status === "scheduled" && (
                      <>
                        <Button onClick={() => onConfirmPublish({ platformVersionId: item.platformVersionId, status: "published", confirmationSource: "manual", note: "内容执行台人工确认已发布" })} variant="primary">人工确认已发布</Button>
                        <Button onClick={() => onConfirmPublish({ platformVersionId: item.platformVersionId, status: "failed", confirmationSource: "manual", note: "内容执行台记录发布失败，需要回到草稿处理。" })} variant="ghost">记录发布失败</Button>
                        <Button onClick={() => onConfirmPublish({ platformVersionId: item.platformVersionId, status: "blocked", confirmationSource: "manual", note: "内容执行台记录发布阻塞，需要补素材或平台检查。" })} variant="ghost">记录发布阻塞</Button>
                      </>
                    )}
                    {item.needsManualRefresh && <a className="sm-button sm-button-primary" href="/import#post-publish-refresh">去手动抓取最新数据</a>}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>{selectedContentId ? "当前作品暂无到期发布或发布后回收动作。" : "选择一个真实作品后，只显示该作品的发布和回收动作。"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">{snapshot.publishToMetricsWorkbench.manualRefreshCopy}</p>
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
  const operatingRows = snapshot.contentRows.filter(isOperatingContentRow);
  const operatingContentIds = new Set(operatingRows.map((row) => row.content.id));
  const operatingScheduledCount = snapshot.platformVersions.filter((item) => operatingContentIds.has(item.contentId) && item.status === "scheduled").length;
  return (
    <Panel title="内容运营概览" eyebrow="默认运营视图">
      <div className="metric-strip">
        <div><strong>{operatingRows.length}</strong><span>默认可见</span></div>
        <div><strong>{snapshot.summary.trustedDashboardContentCount}</strong><span>进入运营看板</span></div>
        <div><strong>{snapshot.summary.draftContentCount}</strong><span>待审草稿</span></div>
        <div><strong>{operatingScheduledCount}</strong><span>已排期稿件</span></div>
        <div><strong>{snapshot.summary.actionGeneratedDraftCount}</strong><span>行动项草稿</span></div>
        <div><strong>{snapshot.summary.publishRecordCount}</strong><span>人工发布记录</span></div>
      </div>
      <p className="muted">默认先看进入运营看板的真实内容、待审核/已排期稿件和行动项生成草稿；手动补录、外部导入和未归类历史行保留在“全部本地内容”筛选里。</p>
    </Panel>
  );
}

function ContentCurrentTaskPanel({ snapshot }: { snapshot: ContentWorkbenchSnapshot }) {
  const packages = snapshot.publishToMetricsWorkbench.publishHandoffPackages;
  const scheduledPackages = packages.filter((item) => item.status === "scheduled");
  const operatingContentIds = new Set(snapshot.contentRows.filter(isOperatingContentRow).map((row) => row.content.id));
  const reviewDrafts = snapshot.platformVersions.filter((item) => operatingContentIds.has(item.contentId) && (item.status === "draft" || item.status === "needs_review"));
  const nextPackage = scheduledPackages[0] ?? packages[0];
  return (
    <Panel
      title="当前任务 / 下一步动作"
      eyebrow="今天从这里开始"
      action={<span className="sm-badge sm-badge-info">{scheduledPackages.length} 个待发布平台包</span>}
    >
      <div className="metric-strip">
        <span><b>1</b> 新视频</span>
        <span><b>{reviewDrafts.length}</b> 待审核草稿</span>
        <span><b>{scheduledPackages.length}</b> 手动发布动作</span>
        <span><b>{snapshot.publishToMetricsWorkbench.executionItems.length}</b> 今日/近期待处理</span>
      </div>
      <div className="trusted-weekly-summary-foot">
        <span>{nextPackage ? `下一步：处理 ${platformLabels[nextPackage.platform]}《${nextPackage.contentTitle}》手动发布动作。` : "下一步：先创建新视频，保存四平台版本后再进入日历排期。"}</span>
        <div className="inline-stack">
          <a className="sm-button sm-button-primary" href="#new-video">新视频</a>
          <a className="sm-button sm-button-secondary" href="/calendar">引用到日历</a>
          <a className="sm-button sm-button-secondary" href="#new-video">生成四平台版本</a>
          <a className="sm-button sm-button-secondary" href="#publish-handoff">手动发布助手</a>
        </div>
      </div>
      <p className="muted">参考多频道 composer 的工作法：先定一个内容，再确认四个平台版本、排期和人工发布动作；历史/全部内容放在下方筛选。</p>
    </Panel>
  );
}

function LocalAcceptanceContentPanel({ rows }: { rows: ContentWorkbenchContentRow[] }) {
  return (
    <details className="calendar-acceptance-data-pool content-acceptance-data-pool" data-testid="content-acceptance-data-pool">
      <summary>
        <span>
          <strong>隔离数据</strong>
          <small>隔离内容默认收起，不进入作品库默认视图。</small>
        </span>
        <i>展开</i>
      </summary>
      <div className="table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th>内容</th>
              <th>数据域</th>
              <th>来源</th>
              <th>平台版本</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.content.id}>
                <td>
                  <strong>{row.content.title}</strong>
                  <small>{row.content.acceptanceRunId ?? row.content.dataDomainReason ?? row.content.id}</small>
                </td>
                <td><span className="sm-badge sm-badge-warning">{row.content.dataDomain}</span></td>
                <td>{row.originLabel}</td>
                <td>{row.platformVersions.length} 个</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>暂无被隔离的本地内容。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function ContentPage({ initialRequest, snapshot }: { initialRequest?: ContentPageInitialRequest; snapshot: ContentWorkbenchSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [mode, setMode] = useState<ContentPageMode>(() => initialRequest?.mode ?? "composer");
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
    return initialRequest?.contentId ?? defaultContentId;
  });
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(() => {
    return initialRequest?.versionId ?? snapshot.platformVersions[0]?.id;
  });
  const [message, setMessage] = useState("选择内容后编辑平台版本。");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedContentId = params.get("contentId") ?? undefined;
    const requestedVersionId = params.get("versionId") ?? undefined;
    if (requestedContentId) setSelectedContentId(requestedContentId);
    if (requestedVersionId) setSelectedVersionId(requestedVersionId);
  }, []);

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
  const acceptanceRows = current.contentRows.filter(isLocalAcceptanceOrTestContentRow);

  useEffect(() => {
    setPage(1);
  }, [pageSize, platformFilter, query, sort, sourceFilter, statusFilter]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      if (selectedContentId && current.contentRows.some((row) => row.content.id === selectedContentId)) return;
      if (selectedContentId) setSelectedContentId(undefined);
      if (selectedVersionId) setSelectedVersionId(undefined);
      return;
    }
    if (selectedContentId && current.contentRows.some((row) => row.content.id === selectedContentId)) return;
    const next = filteredRows[0];
    setSelectedContentId(next.content.id);
    setSelectedVersionId(next.platformVersions[0]?.id);
  }, [current.contentRows, current.platformVersions, filteredRows, selectedContentId, selectedVersionId]);

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/content-workbench");
    const next = (await response.json()) as ContentWorkbenchSnapshot;
    setCurrent(next);
    return next;
  }

  async function handleCreatorDraftCreated(result: CreatorVideoDraftResult) {
    const isUserWork = result.content.dataDomain === "user_work";
    const next = await refreshDashboard();
    setSort("updated_desc");
    if (!isUserWork) {
      setSourceFilter("operating_default");
      setStatusFilter("all");
      const firstUserWork = next.contentRows.find(isOperatingContentRow);
      setSelectedContentId(firstUserWork?.content.id);
      setSelectedVersionId(firstUserWork?.platformVersions[0]?.id);
      setMessage("新内容已保存到隔离数据折叠区，不进入默认作品库或日历。");
      return;
    }
    const persistedRow = next.contentRows.find((row) => row.content.id === result.content.id);
    if (!persistedRow) {
      setSourceFilter("all");
      setStatusFilter("all");
      setSelectedContentId(result.content.id);
      setSelectedVersionId(result.platformVersions[0]?.id);
      setMessage("新视频已保存，但当前筛选未显示；切换到全部本地内容可查看。");
      return;
    }
    setSourceFilter("local_draft");
    setStatusFilter(result.content.scheduledAt ? "version:scheduled" : "all");
    setSelectedContentId(result.content.id);
    setSelectedVersionId(persistedRow.platformVersions[0]?.id ?? result.platformVersions[0]?.id);
    setMode("library");
    setMessage(result.content.scheduledAt ? "新视频已保存并加入发布日历；已选中内容库，可继续发布交接。" : "新视频已保存并选中；可继续编辑四个平台版本。");
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
    setMessage(payload.status === "submitted_review" ? "已记录提交审核；等待平台审核后再回填已发布或失败。" : result.version.status === "published" ? "已记录人工发布确认。" : "已记录发布异常，回到草稿处理下一步。");
    await refreshDashboard();
  }

  return (
    <AppShell active="/content">
      <PageHeader
        eyebrow="内容运营"
        title="内容工作台"
        description="先创作新内容，再到内容库管理平台版本、排期和人工发布。"
        actions={
          mode === "composer" ? (
            <>
              <span className="sm-badge sm-badge-info">创作模式</span>
              <span className="sm-badge sm-badge-success">{current.summary.draftContentCount} 条草稿</span>
              <span className="sm-badge sm-badge-success">{scheduledCount} 条已排期</span>
              <span className="sm-badge sm-badge-info">保存前人工确认</span>
            </>
          ) : (
            <>
              <span className="sm-badge sm-badge-info">{operatingDefaultCount} 条默认可见</span>
              <span className="sm-badge sm-badge-success">{current.summary.trustedDashboardContentCount} 条进运营看板</span>
              <span className="sm-badge sm-badge-success">{scheduledCount} 条已排期</span>
              <span className="sm-badge sm-badge-warning">{acceptanceRows.length} 条隔离</span>
              <span className="sm-badge sm-badge-info">{current.summary.publishRecordCount} 条人工发布记录</span>
              {blockedCount > 0 && <span className="sm-badge sm-badge-warning">{blockedCount} 条需处理</span>}
            </>
          )
        }
      />
      {mode === "library" && <p className="operation-message" data-testid="content-operation-message">{message}</p>}
      <ContentModeSwitch activeMode={mode} libraryCount={operatingDefaultCount} onModeChange={setMode} scheduledCount={scheduledCount} />
      {mode === "composer" ? (
        <ContentComposerPanel>
          <CreatorVideoPanel initialRequest={initialRequest} onCreated={handleCreatorDraftCreated} />
        </ContentComposerPanel>
      ) : (
        <ContentLibraryPanel>
          <ContentCurrentTaskPanel snapshot={current} />
          <WorkbenchSummaryPanel snapshot={current} />
          <Panel title="内容列表筛选" eyebrow="最近优先">
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
            <p className="muted">内容库默认只显示真实用户作品，并按运营优先/最近更新排序；手动补录、外部导入、历史样例和行动项草稿仍可在本地内容筛选里查看，但不会因此进入默认作品库。</p>
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
          <div id="publish-handoff">
            <PublishExecutionWorkbenchPanel
              onConfirmPublish={confirmPublish}
              onSelect={(contentId, versionId) => {
                setSelectedContentId(contentId);
                setSelectedVersionId(versionId);
                setMessage("已打开待发布内容；可编辑、改排期或记录发布结果。");
              }}
              snapshot={current}
              selectedContentId={selectedContentId}
            />
          </div>
          <TrustedScopeCurationPanel snapshot={current} onToggle={patchTrustedScope} />
          <LocalAcceptanceContentPanel rows={acceptanceRows} />
        </ContentLibraryPanel>
      )}
    </AppShell>
  );
}
