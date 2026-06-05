"use client";

import { useState } from "react";
import type { DashboardSnapshot, ReviewActionItem } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { EvidenceReviewReport } from "../patterns/EvidenceReviewReport";
import { Button } from "../primitives/Button";

const periodCopy = {
  weekly: {
    label: "周复盘",
    cadence: "本周运营回看",
    description: "围绕本周内容、发布记录、指标快照和线索跟进，沉淀下一轮行动。"
  },
  monthly: {
    label: "月复盘",
    cadence: "本月经营复盘",
    description: "拉长时间窗口看平台势能、内容资产、变现线索和可复用经验。"
  }
} satisfies Record<"weekly" | "monthly", { label: string; cadence: string; description: string }>;

export function ReviewsPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [current, setCurrent] = useState(snapshot);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [message, setMessage] = useState("复盘默认只基于可信真实创作者中心内容级数据生成。");
  const [busy, setBusy] = useState(false);
  const selectedCopy = periodCopy[period];

  async function refreshDashboard() {
    const response = await fetch("/api/self-media/dashboard");
    setCurrent((await response.json()) as DashboardSnapshot);
  }

  async function saveReview() {
    setBusy(true);
    setMessage("正在生成并保存复盘...");
    try {
      const response = await fetch("/api/self-media/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "保存复盘失败");
      setMessage(`${period === "weekly" ? "周复盘" : "月复盘"}已保存：${result.review.id}`);
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存复盘失败");
    } finally {
      setBusy(false);
    }
  }

  async function updateAction(item: ReviewActionItem, status: ReviewActionItem["status"]) {
    setBusy(true);
    try {
      const response = await fetch("/api/self-media/action-items", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, status, nextAction: status === "done" ? "已完成，等待下次复盘验证效果。" : item.nextAction ?? "继续推进行动项。" })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errorMessage ?? "行动项更新失败");
      setMessage(`行动项已更新：${result.actionItem.title}`);
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "行动项更新失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell active="/reviews">
      <PageHeader
        eyebrow="经营复盘"
        title="周月复盘"
        description="默认只看可信真实四平台内容级数据，先读结论、指标、证据和行动项。"
        actions={<Button data-testid="save-review-button" disabled={busy} onClick={saveReview} variant="primary">保存{selectedCopy.label}</Button>}
      />
      <div className="route-card-grid review-mode-grid" aria-label="复盘入口">
        {(["weekly", "monthly"] as const).map((item) => (
          <button className="route-card" key={item} onClick={() => setPeriod(item)} type="button" aria-pressed={period === item}>
            <span>{periodCopy[item].cadence}</span>
            <strong>{periodCopy[item].label}</strong>
            <span>{periodCopy[item].description}</span>
          </button>
        ))}
      </div>
      <p className="operation-message" data-testid="review-operation-message">{message}</p>
      <EvidenceReviewReport onActionStatus={updateAction} period={period} snapshot={current} />
    </AppShell>
  );
}
