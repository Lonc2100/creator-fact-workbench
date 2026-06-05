import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../foundations/cx";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, eyebrow, action, className, children, ...sectionProps }: PanelProps) {
  return (
    <section {...sectionProps} className={cx("sm-panel", className)}>
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
