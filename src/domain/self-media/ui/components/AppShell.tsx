import type { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";

export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <main className="sm-app-shell" data-theme="self-media">
      <SidebarNav active={active} />
      <section className="sm-workspace">{children}</section>
    </main>
  );
}
