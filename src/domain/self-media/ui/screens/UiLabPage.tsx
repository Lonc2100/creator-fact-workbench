"use client";

import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../primitives/Button";
import { Field, SelectInput, TextInput } from "../primitives/Form";
import { Panel } from "../primitives/Panel";
import { Tabs } from "../primitives/Tabs";

export function UiLabPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <AppShell active="/ui-lab">
      <PageHeader
        eyebrow="Component-driven UI"
        title="UI Lab"
        description="第一阶段用内部组件实验室替代 Storybook，展示 tokens、状态和组件组合。"
        actions={<Button variant="primary">记录视觉基准</Button>}
      />
      <div className="ui-lab-grid">
        <Panel title="按钮状态" eyebrow="Primitives">
          <div className="inline-stack">
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Panel>
        <Panel title="平台与状态" eyebrow="Components">
          <div className="inline-stack">
            {(["douyin", "xiaohongshu", "wechat", "video_account", "bilibili"] as const).map((platform) => <PlatformBadge platform={platform} key={platform} />)}
          </div>
          <div className="inline-stack">
            {(["draft", "needs_review", "scheduled", "published", "blocked", "failed"] as const).map((status) => <StatusBadge status={status} key={status} />)}
          </div>
        </Panel>
        <Panel title="表单状态" eyebrow="Forms">
          <div className="form-grid">
            <Field label="标题"><TextInput defaultValue="AI短片创作复盘" /></Field>
            <Field label="平台"><SelectInput defaultValue="douyin"><option value="douyin">抖音</option></SelectInput></Field>
          </div>
        </Panel>
        <Panel title="Tabs 与空态" eyebrow="Patterns">
          <Tabs activeId="week" items={[{ id: "week", label: "本周" }, { id: "month", label: "本月" }]} />
          <p className="muted">当前数据：{snapshot.contents.length} 条内容，{snapshot.platformVersions.length} 个平台版本。</p>
        </Panel>
      </div>
    </AppShell>
  );
}
