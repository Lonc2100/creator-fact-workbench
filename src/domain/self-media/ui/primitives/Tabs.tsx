import type { ReactNode } from "react";
import { cx } from "../foundations/cx";

interface TabItem {
  id: string;
  label: string;
}

export function Tabs({ items, activeId, className, onSelect }: { items: TabItem[]; activeId: string; className?: string; onSelect?: (id: string) => void }) {
  return (
    <div className={cx("sm-tabs", className)}>
      {items.map((item) => (
        <button className={cx("sm-tab", item.id === activeId && "is-active")} key={item.id} onClick={() => onSelect?.(item.id)} type="button">
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ children }: { children: ReactNode }) {
  return <div className="sm-tab-panel">{children}</div>;
}
