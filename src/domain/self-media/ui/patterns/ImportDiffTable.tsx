import type { ImportPreviewItem, ImportRun } from "../../types";
import { diffKindLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Panel } from "../primitives/Panel";

const sampleDiff: ImportPreviewItem[] = [
  { id: "diff-new-1", title: "AI短片复盘 15 秒版本", platform: "douyin", kind: "new", reason: "未匹配到内部内容" },
  { id: "diff-update-1", title: "公众号月度复盘", platform: "wechat", kind: "update", reason: "更新 2026-06-01 指标快照" },
  { id: "diff-dup-1", title: "小红书工具拆解", platform: "xiaohongshu", kind: "duplicate", reason: "同日期指标一致" },
  { id: "diff-conflict-1", title: "视频号活动观点", platform: "video_account", kind: "conflict", reason: "播放量低于已有快照" },
  { id: "diff-invalid-1", title: "缺少标题行", platform: "bilibili", kind: "invalid", reason: "缺少内容 ID 或标题" }
];

export function ImportDiffTable({ imports }: { imports: ImportRun[] }) {
  return (
    <Panel title="Diff 预览" eyebrow="Import Preview" action={<span className="muted">preview 不写入数据库</span>}>
      <div className="import-stepper">
        {["选择来源", "字段识别", "Diff 预览", "确认保存"].map((step, index) => (
          <span className={index === 2 ? "is-active" : ""} key={step}>{step}</span>
        ))}
      </div>
      <div className="table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>平台</th>
              <th>内容匹配</th>
              <th>处理建议</th>
            </tr>
          </thead>
          <tbody>
            {sampleDiff.map((item) => (
              <tr key={item.id}>
                <td><StatusBadge status={item.kind} /></td>
                <td><PlatformBadge platform={item.platform} /></td>
                <td>
                  <strong>{item.title}</strong>
                  <small>{diffKindLabels[item.kind]}</small>
                </td>
                <td>{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="run-summary">
        <strong>最近导入运行</strong>
        {imports.slice(0, 3).map((run) => (
          <div className="run-row" key={run.id}>
            <span>{run.source}</span>
            <StatusBadge status={run.status === "success" ? "published" : run.status === "failed" ? "failed" : "draft"} />
            <small>{run.traceId ?? run.id}</small>
          </div>
        ))}
      </div>
    </Panel>
  );
}
