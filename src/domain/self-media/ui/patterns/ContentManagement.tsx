"use client";

import { useEffect, useState } from "react";
import type { ConfirmPlatformVersionPublishRequest, ContentDraftReviewRequest, ContentItem, ContentPlatformVersion, ContentPlatformVersionRequest, ContentWorkbenchContentRow, PlatformChecklist, PlatformVersionPatchRequest, PublishQueueItem, PublishRecord, ReviewActionItem } from "../../types";
import { formatDateTime } from "../foundations/format";
import { contentStatusLabels, platformLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../primitives/Button";
import { Field, SelectInput, TextArea, TextInput } from "../primitives/Form";
import { Panel } from "../primitives/Panel";
import { cx } from "../foundations/cx";

const publishRecordStatusLabels: Record<PublishRecord["status"], string> = {
  submitted_review: "已提交审核",
  published: "已发布",
  failed: "发布失败",
  blocked: "发布阻塞",
  confirmed: "已确认"
};

const contentFormatLabels: Record<ContentItem["format"], string> = {
  short_video: "短视频",
  image_text: "图文",
  article: "文章",
  livestream: "直播",
  other: "其他"
};

function confirmationSourceLabel(value?: PublishRecord["confirmationSource"]) {
  if (value === "provider") return "平台回执";
  if (value === "import") return "导入确认";
  return "人工确认";
}

function provenanceSourceLabel(value: string) {
  const labels: Array<[RegExp, string]> = [
    [/douyin_creator_center/i, "抖音创作者中心"],
    [/xiaohongshu_creator_center/i, "小红书创作者中心"],
    [/video_account_creator_center/i, "视频号助手"],
    [/bilibili_creator_center/i, "B站创作中心"],
    [/wechat_official/i, "公众号历史数据"]
  ];
  return labels.find(([pattern]) => pattern.test(value))?.[1];
}

function containsInternalProvenance(value?: string) {
  return Boolean(value && (
    /creator_center/i.test(value) ||
    /wechat_official/i.test(value) ||
    /\braw\s*[:=]/i.test(value) ||
    /\bsource\s*[:=]/i.test(value) ||
    /\bprovenance\s*[:=]/i.test(value) ||
    /\brunId\s*[:=]/i.test(value) ||
    /\brawDir\s*[:=]/i.test(value)
  ));
}

function operatorText(value?: string, fallback = "") {
  if (!value) return fallback;
  if (!containsInternalProvenance(value)) return value;
  const label = provenanceSourceLabel(value) ?? "创作者中心";
  return `${label}采集内容，来源细节已隐藏。`;
}

export function ContentTable({
  contents,
  versions,
  rows,
  selectedContentId,
  onSelect,
  resultSummary,
  density = "comfortable"
}: {
  contents: ContentItem[];
  versions: ContentPlatformVersion[];
  rows?: ContentWorkbenchContentRow[];
  selectedContentId?: string;
  onSelect?: (contentId: string) => void;
  resultSummary?: string;
  density?: "comfortable" | "compact";
}) {
  const rowByContentId = new Map((rows ?? []).map((row) => [row.content.id, row]));
  return (
    <Panel title="运营内容列表" eyebrow={resultSummary ?? "默认运营视图"}>
      <div className="table-wrap">
        <table className={cx("sm-table", density === "compact" && "content-table-compact")}>
          <thead>
            <tr>
              <th>标题</th>
              <th>阶段</th>
              <th>来源</th>
              <th>看板/复盘</th>
              <th>平台版本</th>
              <th>选题</th>
              <th>下次排期</th>
            </tr>
          </thead>
          <tbody>
            {contents.map((item) => {
              const itemVersions = versions.filter((version) => version.contentId === item.id);
              const workbenchRow = rowByContentId.get(item.id);
              return (
                <tr className={item.id === selectedContentId ? "is-selected-row" : ""} key={item.id} onClick={() => onSelect?.(item.id)}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{contentFormatLabels[item.format]}</small>
                  </td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    <span className="sm-badge sm-badge-info">{workbenchRow?.originLabel ?? "本地内容"}</span>
                    {workbenchRow?.actionItems.length ? <small>已关联行动项</small> : null}
                  </td>
                  <td>
                    <span className={workbenchRow?.includedInTrustedDashboardReview ? "sm-badge sm-badge-success" : "sm-badge sm-badge-warning"}>{workbenchRow?.dashboardReviewLabel ?? "不进运营看板"}</span>
                    {workbenchRow && <small>{workbenchRow.trustedMetricSnapshotCount > 0 ? `内容级指标 ${workbenchRow.trustedMetricSnapshotCount} 条` : "不计入运营指标"}</small>}
                  </td>
                  <td>
                    <div className="inline-stack">
                      {itemVersions.slice(0, 4).map((version) => <PlatformBadge compact platform={version.platform} key={version.id} />)}
                      {itemVersions.length === 0 && <span className="muted">未拆分</span>}
                    </div>
                  </td>
                  <td>{item.topic}</td>
                  <td>{formatDateTime(item.scheduledAt ?? item.publishedAt)}</td>
                </tr>
              );
            })}
            {contents.length === 0 && (
              <tr>
                <td colSpan={7}>没有符合当前筛选条件的内容；清空搜索或切换筛选后再看。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function latestPublishRecord(records: PublishRecord[]) {
  return [...records].sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())[0];
}

function versionCalendarHref(versionId: string) {
  return `/calendar?versionId=${encodeURIComponent(versionId)}`;
}

function versionLedgerHref(versionId: string) {
  return `${versionCalendarHref(versionId)}#publish-ledger`;
}

export function ContentDetail({
  content,
  versions,
  workbenchRow,
  selectedVersionId,
  onSelectVersion,
  publishRecords = [],
  queueItems = []
}: {
  content?: ContentItem;
  versions: ContentPlatformVersion[];
  workbenchRow?: ContentWorkbenchContentRow;
  selectedVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
  publishRecords?: PublishRecord[];
  queueItems?: PublishQueueItem[];
}) {
  const selected = content ? versions.filter((version) => version.contentId === content.id) : [];
  const contentQueue = content ? queueItems.filter((item) => item.contentId === content.id) : [];
  const contentRecords = content ? publishRecords.filter((record) => record.contentId === content.id || selected.some((version) => version.id === record.platformVersionId)) : [];
  const recordsByVersion = new Map(selected.map((version) => [version.id, contentRecords.filter((record) => record.platformVersionId === version.id)]));
  return (
    <Panel title={content?.title ?? "内容详情"} eyebrow="平台稿件">
      {content ? (
        <div className="detail-stack">
          <div className="detail-line">
            <span>当前阶段</span>
            <strong>{contentStatusLabels[content.status]}</strong>
          </div>
          <p className="muted">{operatorText(content.notes, "内容详情用于管理一条内容在多个平台上的表达版本。")}</p>
          {workbenchRow && (
            <div className="content-workflow-reference">
              <div>
                <span>工作台来源</span>
                <strong>{workbenchRow.originLabel}</strong>
                <small>{workbenchRow.actionItems.length > 0 ? "由行动项生成，可继续编辑确认。" : "用于内容运营和复盘查看。"}</small>
              </div>
              <div>
                <span>运营口径</span>
                <strong>{workbenchRow.dashboardReviewLabel}</strong>
                <small>{operatorText(workbenchRow.dashboardReviewReason, "按当前运营口径显示。")}</small>
              </div>
              <div>
                <span>关联工作</span>
                <strong>{workbenchRow.platformVersions.length} 平台稿件 · {workbenchRow.queueItems.length} 排期项 · {workbenchRow.actionItems.length} 行动项</strong>
                <small>{workbenchRow.latestSnapshotDate ? `最新快照 ${workbenchRow.latestSnapshotDate}` : "暂无指标快照"}</small>
              </div>
            </div>
          )}
          <div className="version-card-list">
            {selected.map((version) => (
              <article className={cx("version-mini-card", version.id === selectedVersionId && "is-selected-card")} key={version.id} onClick={() => onSelectVersion?.(version.id)}>
                <div>
                  <PlatformBadge platform={version.platform} />
                  <StatusBadge status={version.status} />
                </div>
                <strong>{version.title}</strong>
                <p>{operatorText(version.coverNote || version.body, "等待补齐正文和封面备注。")}</p>
                {version.tags?.length ? <small>标签建议：{version.tags.map((tag) => `#${tag}`).join(" ")}</small> : null}
                {version.platformAdvice ? <small>{version.platformAdvice}</small> : null}
              </article>
            ))}
            {selected.length === 0 && <p className="muted">还没有平台版本。下一步应从内容页创建平台版本，再进入发布日历。</p>}
          </div>
          <div className="content-publish-history" data-testid="content-publish-history">
            <div className="section-heading-row">
              <div>
                <p className="sm-eyebrow">发布历史 · 只读</p>
                <h3>本内容发布历史</h3>
              </div>
              <a className="sm-button sm-button-secondary" href={selected[0] ? versionLedgerHref(selected[0].id) : "/calendar#publish-ledger"}>打开日历台账</a>
            </div>
            <div className="table-wrap">
              <table className="sm-table content-publish-history-table">
                <thead>
                  <tr>
                    <th>平台稿件</th>
                    <th>状态</th>
                    <th>排期</th>
                    <th>发布</th>
                    <th>确认来源</th>
                    <th>原因/备注</th>
                    <th>队列</th>
                    <th>跳转</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((version) => {
                    const versionRecords = recordsByVersion.get(version.id) ?? [];
                    const latestRecord = latestPublishRecord(versionRecords);
                    const queueItem = contentQueue.find((item) => item.platform === version.platform);
                    const note = operatorText(version.failureReason ?? latestRecord?.note ?? queueItem?.failureReason, "无");
                    return (
                      <tr data-publish-history-version-id={version.id} key={version.id}>
                        <td>
                          <PlatformBadge compact platform={version.platform} />
                          <small>{version.title}</small>
                        </td>
                        <td><StatusBadge status={version.status} /></td>
                        <td>{formatDateTime(version.scheduledAt ?? queueItem?.scheduledAt)}</td>
                        <td>{formatDateTime(version.publishedAt ?? latestRecord?.happenedAt)}</td>
                        <td>{latestRecord ? confirmationSourceLabel(latestRecord.confirmationSource) : "无记录"}</td>
                        <td>{note}</td>
                        <td>
                          {queueItem ? (
                            <>
                              <StatusBadge status={queueItem.status} />
                              <small>{operatorText(queueItem.nextAction, "等待人工推进。")}</small>
                            </>
                          ) : (
                            <span className="muted">无队列项</span>
                          )}
                        </td>
                        <td>
                          <div className="inline-stack">
                            <button className="sm-button sm-button-secondary" onClick={() => onSelectVersion?.(version.id)} type="button">选中版本</button>
                            <a className="sm-button sm-button-ghost" href={versionCalendarHref(version.id)}>日历</a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {selected.length === 0 && (
                    <tr>
                      <td colSpan={8}>暂无平台稿件，因此没有发布历史。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="content-publish-record-strip" data-testid="content-publish-records">
              {contentRecords.map((record) => (
                <span className="sm-badge sm-badge-info" data-publish-record-id={record.id} key={record.id}>
                  {publishRecordStatusLabels[record.status]} · {confirmationSourceLabel(record.confirmationSource)} · {formatDateTime(record.happenedAt)}
                </span>
              ))}
              {contentRecords.length === 0 && <span className="muted">人工确认后，这里会出现发布结果。</span>}
            </div>
            <p className="muted">这里只看排期稿和人工发布结果；平台指标仍以创作者中心数据为准。</p>
          </div>
        </div>
      ) : (
        <p className="muted">选择一条内容查看平台版本。</p>
      )}
    </Panel>
  );
}

export function ContentWorkflowReference({ actionItem, queueItem }: { actionItem?: ReviewActionItem; queueItem?: PublishQueueItem }) {
  if (!actionItem && !queueItem) return null;
  return (
    <div className="content-workflow-reference">
      {actionItem && (
        <div>
          <span>来源行动项</span>
          <strong>{actionItem.title}</strong>
          <small>{operatorText(actionItem.nextAction, "等待人工推进。")}</small>
        </div>
      )}
      {queueItem && (
            <div>
          <span>排期状态</span>
          <strong><StatusBadge status={queueItem.status} /></strong>
          <small>{formatDateTime(queueItem.scheduledAt)} · {operatorText(queueItem.nextAction, "等待人工确认。")}</small>
        </div>
      )}
    </div>
  );
}

const checklistItems: Array<{ key: keyof PlatformChecklist; label: string }> = [
  { key: "title", label: "标题确认" },
  { key: "cover", label: "封面确认" },
  { key: "script", label: "脚本确认" },
  { key: "platformFit", label: "平台适配" },
  { key: "humanConfirmed", label: "人工确认" }
];

function localDateTime(value?: string) {
  if (!value) return "";
  return value.slice(0, 16);
}

function isoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function PlatformVersionEditor({
  content,
  version,
  queueItem,
  actionItem,
  onSave,
  onStatusPatch,
  onReviewDraft,
  onConfirmPublish
}: {
  content?: ContentItem;
  version?: ContentPlatformVersion;
  queueItem?: PublishQueueItem;
  actionItem?: ReviewActionItem;
  onSave: (payload: ContentPlatformVersionRequest) => Promise<void>;
  onStatusPatch: (payload: PlatformVersionPatchRequest) => Promise<void>;
  onReviewDraft: (payload: ContentDraftReviewRequest) => Promise<void>;
  onConfirmPublish: (payload: ConfirmPlatformVersionPublishRequest) => Promise<void>;
}) {
  const [rootTitle, setRootTitle] = useState(content?.title ?? "");
  const [topic, setTopic] = useState(content?.topic ?? "");
  const [title, setTitle] = useState(version?.title ?? content?.title ?? "");
  const [body, setBody] = useState(operatorText(version?.body));
  const [script, setScript] = useState(operatorText(version?.script));
  const [coverNote, setCoverNote] = useState(operatorText(version?.coverNote));
  const [scheduledAt, setScheduledAt] = useState(localDateTime(version?.scheduledAt));
  const [nextAction, setNextAction] = useState(operatorText(version?.nextAction ?? queueItem?.nextAction));
  const [status, setStatus] = useState<ContentDraftReviewRequest["status"]>(version?.status ?? "draft");
  const [checklist, setChecklist] = useState<Partial<PlatformChecklist>>(version?.checklist ?? {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRootTitle(content?.title ?? "");
    setTopic(content?.topic ?? "");
    setTitle(version?.title ?? content?.title ?? "");
    setBody(operatorText(version?.body));
    setScript(operatorText(version?.script));
    setCoverNote(operatorText(version?.coverNote));
    setScheduledAt(localDateTime(version?.scheduledAt));
    setNextAction(operatorText(version?.nextAction ?? queueItem?.nextAction));
    setStatus(version?.status ?? "draft");
    setChecklist(version?.checklist ?? {});
  }, [content?.id, content?.title, content?.topic, queueItem, version]);

  async function save() {
    if (!content || !version) return;
    setBusy(true);
    try {
      await onSave({
        id: version.id,
        contentId: content.id,
        platform: version.platform,
        title,
        body,
        script,
        coverNote,
        scheduledAt: isoFromLocal(scheduledAt),
        checklist
      });
    } finally {
      setBusy(false);
    }
  }

  async function patchStatus(status: PlatformVersionPatchRequest["status"]) {
    if (!version || !status) return;
    setBusy(true);
    try {
      await onStatusPatch({ id: version.id, status, scheduledAt: isoFromLocal(scheduledAt), checklist });
    } finally {
      setBusy(false);
    }
  }

  async function reviewDraft() {
    if (!content || !version) return;
    setBusy(true);
    try {
      await onReviewDraft({
        action: "review_draft",
        contentId: content.id,
        platformVersionId: version.id,
        publishQueueItemId: queueItem?.id,
        title: rootTitle,
        body,
        topic,
        scheduledAt: isoFromLocal(scheduledAt),
        status,
        nextAction,
        checklist
      } as ContentDraftReviewRequest & { action: "review_draft" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmPublish(status: ConfirmPlatformVersionPublishRequest["status"]) {
    if (!version) return;
    setBusy(true);
    try {
      await onConfirmPublish({
        platformVersionId: version.id,
        status,
        note: status === "failed" || status === "blocked" ? nextAction || "人工确认发布未成功，需要回到草稿处理。" : nextAction,
        confirmationSource: "manual"
      });
    } finally {
      setBusy(false);
    }
  }

  if (!content || !version) {
    return (
      <Panel title="平台版本编辑器" eyebrow="版本编辑">
        <p className="muted">选择一条内容和平台版本后开始编辑。</p>
      </Panel>
    );
  }

  return (
    <Panel title="草稿审核台" eyebrow={`${platformLabels[version.platform]} · 人工确认`}>
      <div className="form-grid" data-testid="platform-version-editor">
        <ContentWorkflowReference actionItem={actionItem} queueItem={queueItem} />
        <Field label="内容标题"><TextInput data-testid="content-title-input" value={rootTitle} onChange={(event) => { setRootTitle(event.target.value); setTitle(event.target.value); }} /></Field>
        <Field label="选题"><TextInput data-testid="content-topic-input" value={topic} onChange={(event) => setTopic(event.target.value)} /></Field>
        <Field label="平台标题"><TextInput data-testid="version-title-input" value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="发布时间"><TextInput data-testid="version-scheduled-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></Field>
        <Field label="正文"><TextArea data-testid="version-body-input" value={body} onChange={(event) => setBody(event.target.value)} /></Field>
        <Field label="脚本"><TextArea data-testid="version-script-input" value={script} onChange={(event) => setScript(event.target.value)} /></Field>
        <Field label="封面备注"><TextArea data-testid="version-cover-input" value={coverNote} onChange={(event) => setCoverNote(event.target.value)} /></Field>
        <Field label="下一步"><TextArea data-testid="version-next-action-input" value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></Field>
        <Field label="草稿状态">
          <SelectInput data-testid="draft-review-status-select" value={status} onChange={(event) => setStatus(event.target.value as ContentDraftReviewRequest["status"])}>
            <option value="draft">草稿</option>
            <option value="needs_review">待审核</option>
            <option value="scheduled">已排期</option>
            <option value="blocked">阻塞</option>
          </SelectInput>
        </Field>
        <div className="checklist editable-checklist">
          <div className="checklist-head">
            <strong>发布检查</strong>
            <span>固定状态</span>
          </div>
          {checklistItems.map((item) => (
            <label className="checklist-item" key={item.key}>
              <input checked={Boolean(checklist[item.key])} onChange={(event) => setChecklist((current) => ({ ...current, [item.key]: event.target.checked }))} type="checkbox" />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <div className="inline-stack">
          <Button data-testid="review-content-draft" disabled={busy} onClick={reviewDraft} variant="primary">保存草稿审核</Button>
          <Button data-testid="save-platform-version" disabled={busy} onClick={save} variant="secondary">仅保存平台版本</Button>
          <Button disabled={busy} onClick={() => patchStatus("needs_review")}>转待审核</Button>
          <Button disabled={busy} onClick={() => patchStatus("scheduled")}>转已排期</Button>
        </div>
        <div className="publish-confirmation-strip">
          <strong>发布结果</strong>
          <span>这里只记录人工发布结果；排期变更不会自动生成记录。</span>
          <div className="inline-stack">
            <Button disabled={busy || version.status !== "scheduled"} onClick={() => confirmPublish("published")} variant="secondary">人工确认已发布</Button>
            <Button disabled={busy || version.status !== "scheduled"} onClick={() => confirmPublish("failed")} variant="danger">记录发布失败</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
