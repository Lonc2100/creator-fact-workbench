import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { ContentDetail, ContentTable } from "../patterns/ContentManagement";
import { Button } from "../primitives/Button";

export function ContentPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  const selected = snapshot.contents[0];
  return (
    <AppShell active="/content">
      <PageHeader
        eyebrow="Directus / Baserow inspired"
        title="内容管理"
        description="管理内容库和一条内容的多个平台版本；排期动作进入发布日历。"
        actions={<Button variant="primary">新建内容</Button>}
      />
      <div className="content-layout">
        <ContentTable contents={snapshot.contents} versions={snapshot.platformVersions} />
        <ContentDetail content={selected} versions={snapshot.platformVersions} />
      </div>
    </AppShell>
  );
}
