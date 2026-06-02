"use client";

import { useEffect, useState } from "react";
import type { ContentItem, ContentPlatformVersion, ContentPlatformVersionRequest, PlatformChecklist, PlatformVersionPatchRequest } from "../../types";
import { formatDateTime } from "../foundations/format";
import { contentStatusLabels, platformLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../primitives/Button";
import { Field, SelectInput, TextArea, TextInput } from "../primitives/Form";
import { Panel } from "../primitives/Panel";
import { cx } from "../foundations/cx";

export function ContentTable({ contents, versions, selectedContentId, onSelect }: { contents: ContentItem[]; versions: ContentPlatformVersion[]; selectedContentId?: string; onSelect?: (contentId: string) => void }) {
  return (
    <Panel title="内容库" eyebrow="Content Database">
      <div className="table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>阶段</th>
              <th>平台版本</th>
              <th>选题</th>
              <th>下次排期</th>
            </tr>
          </thead>
          <tbody>
            {contents.slice(0, 12).map((item) => {
              const itemVersions = versions.filter((version) => version.contentId === item.id);
              return (
                <tr className={item.id === selectedContentId ? "is-selected-row" : ""} key={item.id} onClick={() => onSelect?.(item.id)}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.format}</small>
                  </td>
                  <td><StatusBadge status={item.status} /></td>
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
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function ContentDetail({ content, versions, selectedVersionId, onSelectVersion }: { content?: ContentItem; versions: ContentPlatformVersion[]; selectedVersionId?: string; onSelectVersion?: (versionId: string) => void }) {
  const selected = content ? versions.filter((version) => version.contentId === content.id) : [];
  return (
    <Panel title={content?.title ?? "内容详情"} eyebrow="Platform Versions">
      {content ? (
        <div className="detail-stack">
          <div className="detail-line">
            <span>当前阶段</span>
            <strong>{contentStatusLabels[content.status]}</strong>
          </div>
          <p className="muted">{content.notes ?? "内容详情用于管理一条内容在多个平台上的表达版本。"}</p>
          <div className="version-card-list">
            {selected.map((version) => (
              <article className={cx("version-mini-card", version.id === selectedVersionId && "is-selected-card")} key={version.id} onClick={() => onSelectVersion?.(version.id)}>
                <div>
                  <PlatformBadge platform={version.platform} />
                  <StatusBadge status={version.status} />
                </div>
                <strong>{version.title}</strong>
                <p>{version.coverNote || version.body || "等待补齐正文和封面备注。"}</p>
              </article>
            ))}
            {selected.length === 0 && <p className="muted">还没有平台版本。下一步应从内容页创建平台版本，再进入发布日历。</p>}
          </div>
        </div>
      ) : (
        <p className="muted">选择一条内容查看平台版本。</p>
      )}
    </Panel>
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
  onSave,
  onStatusPatch
}: {
  content?: ContentItem;
  version?: ContentPlatformVersion;
  onSave: (payload: ContentPlatformVersionRequest) => Promise<void>;
  onStatusPatch: (payload: PlatformVersionPatchRequest) => Promise<void>;
}) {
  const [title, setTitle] = useState(version?.title ?? content?.title ?? "");
  const [body, setBody] = useState(version?.body ?? "");
  const [script, setScript] = useState(version?.script ?? "");
  const [coverNote, setCoverNote] = useState(version?.coverNote ?? "");
  const [scheduledAt, setScheduledAt] = useState(localDateTime(version?.scheduledAt));
  const [checklist, setChecklist] = useState<Partial<PlatformChecklist>>(version?.checklist ?? {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(version?.title ?? content?.title ?? "");
    setBody(version?.body ?? "");
    setScript(version?.script ?? "");
    setCoverNote(version?.coverNote ?? "");
    setScheduledAt(localDateTime(version?.scheduledAt));
    setChecklist(version?.checklist ?? {});
  }, [content?.id, content?.title, version]);

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

  if (!content || !version) {
    return (
      <Panel title="平台版本编辑器" eyebrow="Editor">
        <p className="muted">选择一条内容和平台版本后开始编辑。</p>
      </Panel>
    );
  }

  return (
    <Panel title="平台版本编辑器" eyebrow={platformLabels[version.platform]}>
      <div className="form-grid" data-testid="platform-version-editor">
        <Field label="标题"><TextInput data-testid="version-title-input" value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="发布时间"><TextInput data-testid="version-scheduled-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} /></Field>
        <Field label="正文"><TextArea data-testid="version-body-input" value={body} onChange={(event) => setBody(event.target.value)} /></Field>
        <Field label="脚本"><TextArea data-testid="version-script-input" value={script} onChange={(event) => setScript(event.target.value)} /></Field>
        <Field label="封面备注"><TextArea data-testid="version-cover-input" value={coverNote} onChange={(event) => setCoverNote(event.target.value)} /></Field>
        <Field label="状态推进">
          <SelectInput defaultValue={version.status} onChange={(event) => patchStatus(event.target.value as PlatformVersionPatchRequest["status"])}>
            <option value="draft">草稿</option>
            <option value="needs_review">待审核</option>
            <option value="scheduled">已排期</option>
            <option value="published">已发布</option>
            <option value="blocked">阻塞</option>
            <option value="failed">失败</option>
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
          <Button data-testid="save-platform-version" disabled={busy} onClick={save} variant="primary">保存平台版本</Button>
          <Button disabled={busy} onClick={() => patchStatus("needs_review")}>转待审核</Button>
          <Button disabled={busy} onClick={() => patchStatus("scheduled")}>转已排期</Button>
        </div>
      </div>
    </Panel>
  );
}
