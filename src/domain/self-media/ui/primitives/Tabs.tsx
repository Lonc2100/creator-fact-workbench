import type { ReactNode } from "react";
import { cx } from "../foundations/cx";

interface TabItem {
  id: string;
  label: string;
}

export function Tabs({ items, activeId, className }: { items: TabItem[]; activeId: string; className?: string }) {
  return (
    <div className={cx("sm-tabs", className)}>
      {items.map((item) => (
        <span className={cx("sm-tab", item.id === activeId && "is-active")} key={item.id}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) {
  return <div className="sm-tab-panel">{children}</div>;
}
