import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { EvidenceReviewReport } from "../patterns/EvidenceReviewReport";
import { Button } from "../primitives/Button";
import { Tabs } from "../primitives/Tabs";

export function ReviewsPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <AppShell active="/reviews">
      <PageHeader
        eyebrow="Evidence inspired"
        title="周月复盘"
        description="复盘是可沉淀的运营记录：报告、证据 refs、行动项和下轮计划。"
        actions={<Button variant="primary">生成复盘</Button>}
      />
      <Tabs activeId="weekly" items={[{ id: "weekly", label: "周复盘" }, { id: "monthly", label: "月复盘" }]} />
      <EvidenceReviewReport snapshot={snapshot} />
    </AppShell>
  );
}
