import type { ContentItem, ContentPlatformVersion } from "../../types";
import { formatDateTime } from "../foundations/format";
import { contentStatusLabels } from "../foundations/labels";
import { PlatformBadge } from "../components/PlatformBadge";
import { StatusBadge } from "../components/StatusBadge";
import { Panel } from "../primitives/Panel";

export function ContentTable({ contents, versions }: { contents: ContentItem[]; versions: ContentPlatformVersion[] }) {
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
                <tr key={item.id}>
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

export function ContentDetail({ content, versions }: { content?: ContentItem; versions: ContentPlatformVersion[] }) {
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
              <article className="version-mini-card" key={version.id}>
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
