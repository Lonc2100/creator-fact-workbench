"use client";

import { useMemo, useState } from "react";
import type { ContentPlatformVersionRequest, DashboardSnapshot, PlatformVersionPatchRequest } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { ContentDetail, ContentTable, PlatformVersionEditor } from "../patterns/ContentManagement";
import { Button } from "../primitives/Button";

export function ContentPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>(snapshot.contents[0]?.id);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(snapshot.platformVersions[0]?.id);
  const [message, setMessage] = useState("选择内容后编辑平台版本。");
  const selected = current.contents.find((item) => item.id === selectedContentId) ?? current.contents[0];
  const selectedVersions = useMemo(() => selected ? current.platformVersions.filter((version) => version.contentId === selected.id) : [], [current.platformVersions, selected]);
  const selectedVersion = selectedVersions.find((version) => version.id === selectedVersionId) ?? selectedVersions[0];

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/dashboard");
    setCurrent((await response.json()) as DashboardSnapshot);
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
      return result.version as DashboardSnapshot["platformVersions"][number];
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

  return (
    <AppShell active="/content">
      <PageHeader
        eyebrow="Directus / Baserow inspired"
        title="内容管理"
        description="管理内容库和一条内容的多个平台版本；排期动作进入发布日历。"
        actions={<Button variant="primary">新建内容</Button>}
      />
      <p className="operation-message" data-testid="content-operation-message">{message}</p>
      <div className="content-layout">
        <div className="content-main-stack">
          <ContentTable contents={current.contents} onSelect={(id) => { setSelectedContentId(id); setSelectedVersionId(current.platformVersions.find((version) => version.contentId === id)?.id); }} selectedContentId={selected?.id} versions={current.platformVersions} />
          <ContentDetail content={selected} onSelectVersion={setSelectedVersionId} selectedVersionId={selectedVersion?.id} versions={current.platformVersions} />
        </div>
        <PlatformVersionEditor content={selected} onSave={saveVersion} onStatusPatch={patchVersion} version={selectedVersion} />
      </div>
    </AppShell>
  );
}
