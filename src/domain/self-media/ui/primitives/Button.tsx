import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../foundations/cx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ className, variant = "secondary", children, ...props }: ButtonProps) {
  return (
    <button className={cx("sm-button", `sm-button-${variant}`, className)} {...props}>
      {children}
    </button>
  );
}
