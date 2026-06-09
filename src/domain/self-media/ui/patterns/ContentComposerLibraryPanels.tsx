import type { ReactNode } from "react";
import { Tabs } from "../primitives/Tabs";

export type ContentPageMode = "composer" | "library";

const contentModeItems: Array<{ id: ContentPageMode; label: string }> = [
  { id: "composer", label: "创作" },
  { id: "library", label: "内容库" }
];

export function ContentModeSwitch({
  activeMode,
  libraryCount,
  onModeChange,
  scheduledCount
}: {
  activeMode: ContentPageMode;
  libraryCount: number;
  onModeChange: (mode: ContentPageMode) => void;
  scheduledCount: number;
}) {
  return (
    <section className="content-mode-switch" data-testid="content-mode-switch">
      <div>
        <p className="sm-eyebrow">内容工作区</p>
        <h2>{activeMode === "composer" ? "先把今天的新内容写出来" : "管理已保存的内容资产"}</h2>
        <p>{activeMode === "composer" ? "从一个想法开始，生成四个平台草稿，保存前人工确认。" : "查看最近内容、编辑平台版本、管理运营看板口径和人工发布动作。"}</p>
      </div>
      <div className="content-mode-actions">
        <Tabs
          activeId={activeMode}
          className="content-mode-tabs"
          items={contentModeItems}
          onSelect={(id) => onModeChange(id === "library" ? "library" : "composer")}
        />
        <div className="inline-stack">
          <span className="sm-badge sm-badge-info">{libraryCount} 条内容</span>
          <span className="sm-badge sm-badge-success">{scheduledCount} 条已排期</span>
        </div>
      </div>
    </section>
  );
}

export function ContentComposerPanel({ children }: { children: ReactNode }) {
  return (
    <section className="content-composer-mode" data-testid="content-composer-mode">
      {children}
    </section>
  );
}

export function ContentLibraryPanel({ children }: { children: ReactNode }) {
  return (
    <section className="content-library-mode" data-testid="content-library-mode">
      {children}
    </section>
  );
}
