import type { ReactNode } from "react";
import { cx } from "../foundations/cx";

interface BadgeProps {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return <span className={cx("sm-badge", `sm-badge-${tone}`, className)}>{children}</span>;
}
