import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { LeadPipeline } from "../patterns/LeadPipeline";
import { Button } from "../primitives/Button";

export function LeadsPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <AppShell active="/leads">
      <PageHeader
        eyebrow="CRM light"
        title="线索跟进"
        description="把复盘行动项和客户需求接起来，持续推进变现线索。"
        actions={<Button variant="primary">新增线索</Button>}
      />
      <LeadPipeline leads={snapshot.leads} />
    </AppShell>
  );
}
