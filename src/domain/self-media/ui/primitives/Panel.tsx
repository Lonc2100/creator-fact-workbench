import type { ReactNode } from "react";
import { cx } from "../foundations/cx";

interface PanelProps {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, eyebrow, action, className, children }: PanelProps) {
  return (
    <section className={cx("sm-panel", className)}>
      {(title || eyebrow || action) && (
        <div className="sm-panel-head">
          <div>
            {eyebrow && <p className="sm-eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
