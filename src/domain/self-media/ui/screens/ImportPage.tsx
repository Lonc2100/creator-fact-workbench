import type { DashboardSnapshot } from "../../types";
import { AppShell } from "../components/AppShell";
import { PageHeader } from "../components/PageHeader";
import { ImportDiffTable } from "../patterns/ImportDiffTable";
import { Button } from "../primitives/Button";
import { Field, SelectInput, TextArea } from "../primitives/Form";
import { Panel } from "../primitives/Panel";

export function ImportPage({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <AppShell active="/import">
      <PageHeader
        eyebrow="n8n executions inspired"
        title="数据导入"
        description="外部数据先经过来源选择、字段识别和 diff 预览，再确认写入内部事实源。"
        actions={<Button variant="primary">预览导入</Button>}
      />
      <div className="import-layout">
        <Panel title="导入来源" eyebrow="Source">
          <div className="form-grid">
            <Field label="来源类型">
              <SelectInput defaultValue="csv">
                <option value="csv">平台 CSV</option>
                <option value="mediacrawler">MediaCrawler JSON</option>
                <option value="n8n">n8n 执行结果</option>
              </SelectInput>
            </Field>
            <Field label="平台预设">
              <SelectInput defaultValue="douyin">
                <option value="douyin">抖音</option>
                <option value="xiaohongshu">小红书</option>
                <option value="wechat">公众号</option>
                <option value="video_account">视频号</option>
                <option value="bilibili">B站</option>
              </SelectInput>
            </Field>
            <Field label="文件内容" note="第一版展示静态样例；真实保存仍走现有 import API。">
              <TextArea defaultValue={"作品ID,标题,发布时间,播放量\nsm-001,AI短片复盘,2026-06-01,2100"} />
            </Field>
          </div>
        </Panel>
        <ImportDiffTable imports={snapshot.imports} />
      </div>
    </AppShell>
  );
}
