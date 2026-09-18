"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appName } from "@/config/env";
import { isNavActive, navGroups, navItems } from "@/config/nav";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { AccountMenu } from "./AccountMenu";
import { navIcons } from "./navIcons";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export function SidebarNav({ onNavigate, collapsed = false }) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <nav className="space-y-4 px-2">
      {navGroups
        .map((group) => ({
          ...group,
          items: navItems.filter((item) => item.group === group.id && can(item.permission)),
        }))
        .filter((group) => group.items.length)
        .map((group, groupIndex) => (
          <div key={group.id}>
            {collapsed ? (
              groupIndex > 0 ? <div className="mx-2 mb-2 h-px bg-border" /> : null
            ) : (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.label}</p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = navIcons[item.icon];
                const active = isNavActive(pathname, item);
                const link = (
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted hover:bg-slate-100 hover:text-text dark:hover:bg-slate-800"
                    )}
                  >
                    {active ? (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    ) : null}
                    {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : null}
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                );

                if (!collapsed) {
                  return (
                    <span key={item.href} className="block">
                      {link}
                    </span>
                  );
                }
                return (
                  <Tooltip key={item.href} label={item.label} side="right" className="w-full">
                    {link}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
    </nav>
  );
}

export function Sidebar({ collapsed = false, onToggleCollapsed }) {
  const mark = appName?.trim()?.[0] || "A";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex border-b border-border",
          collapsed ? "flex-col items-center gap-2 px-2 py-3" : "h-16 items-center gap-2 px-3"
        )}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-display text-sm font-semibold text-primary">
          {mark}
        </span>
        {!collapsed ? <span className="min-w-0 flex-1 truncate font-display text-base font-semibold">{appName}</span> : null}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="border-t border-border p-2">
        <AccountMenu variant="sidebar" collapsed={collapsed} />
      </div>
    </aside>
  );
}
