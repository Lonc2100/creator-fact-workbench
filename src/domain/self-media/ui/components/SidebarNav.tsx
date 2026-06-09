import { BarChart3, CalendarDays, FileText, Home, Lightbulb, Megaphone, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { cx } from "../foundations/cx";

const navItems = [
  { href: "/", label: "总览", icon: BarChart3 },
  { href: "/import", label: "导入", icon: Upload },
  { href: "/content", label: "内容", icon: FileText },
  { href: "/calendar", label: "发布日历", icon: CalendarDays },
  { href: "/dashboard", label: "数据看板", icon: Sparkles },
  { href: "/reviews", label: "周月复盘", icon: Lightbulb }
];

const railItems = [
  { href: "/", label: "总览", icon: Home },
  { href: "/content", label: "内容", icon: FileText },
  { href: "/calendar", label: "排期", icon: CalendarDays },
  { href: "/dashboard", label: "数据", icon: Sparkles },
  { href: "/reviews", label: "复盘", icon: Lightbulb }
];

const navSections = [
  { title: "工作台", items: navItems.slice(0, 2) },
  { title: "创作运营", items: navItems.slice(2, 5) },
  { title: "增长复盘", items: navItems.slice(5) }
];

export function SidebarNav({ active }: { active: string }) {
  return (
    <aside className="sm-sidebar" aria-label="自媒体工作台导航">
      <div className="sm-sidebar-rail" aria-label="快捷工作区">
        <Link className="sm-rail-brand" href="/" aria-label="自媒体 AI 工作台">
          AI
        </Link>
        <div className="sm-rail-nav">
          {railItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link className={cx("sm-rail-item", isActive && "is-active")} href={item.href} key={item.href} aria-label={item.label}>
                <Icon aria-hidden="true" size={17} />
              </Link>
            );
          })}
        </div>
      </div>
      <div className="sm-sidebar-panel">
        <div className="sm-brand">
          <div>
            <strong>CreatorFact</strong>
            <span>自媒体运营后台</span>
          </div>
        </div>
        <nav>
          {navSections.map((section) => (
            <section className="sm-nav-section" key={section.title}>
              <p>{section.title}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link className={cx("sm-nav-item", active === item.href && "is-active")} href={item.href} key={item.href}>
                    <Icon aria-hidden="true" size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="sm-sidebar-note">
          <Megaphone size={16} aria-hidden="true" />
          <span>只做自媒体后台，不引入画布上下文。</span>
        </div>
      </div>
    </aside>
  );
}
