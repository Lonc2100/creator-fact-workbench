import { BarChart3, CalendarDays, Database, FileText, Lightbulb, Megaphone, ShieldCheck, Sparkles, Upload, Users } from "lucide-react";
import Link from "next/link";
import { cx } from "../foundations/cx";

const navItems = [
  { href: "/", label: "总览", icon: BarChart3 },
  { href: "/import", label: "导入", icon: Upload },
  { href: "/content", label: "内容", icon: FileText },
  { href: "/calendar", label: "发布日历", icon: CalendarDays },
  { href: "/dashboard", label: "数据看板", icon: Sparkles },
  { href: "/reviews", label: "周月复盘", icon: Lightbulb },
  { href: "/leads", label: "线索", icon: Users },
  { href: "/ui-lab", label: "UI Lab", icon: ShieldCheck }
];

export function SidebarNav({ active }: { active: string }) {
  return (
    <aside className="sm-sidebar" aria-label="自媒体工作台导航">
      <div className="sm-brand">
        <div className="sm-brand-mark">AI</div>
        <div>
          <strong>自媒体 AI 工作台</strong>
          <span>Creator Ops</span>
        </div>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link className={cx("sm-nav-item", active === item.href && "is-active")} href={item.href} key={item.href}>
              <Icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sm-sidebar-note">
        <Megaphone size={16} aria-hidden="true" />
        <span>只做自媒体后台，不引入画布上下文。</span>
      </div>
    </aside>
  );
}
