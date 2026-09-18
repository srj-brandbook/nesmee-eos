"use client";

import { cn } from "@/lib/utils";

const sizes = {
  md: {
    list: "gap-1 p-2",
    tab: "px-3.5 py-2.5 text-sm",
    icon: "h-4 w-4",
  },
  sm: {
    list: "gap-0.5 p-1",
    tab: "px-2 py-1.5 text-[11px] leading-none",
    icon: "h-3.5 w-3.5",
  },
};

export function Tabs({ tabs, value, onChange, className, size = "md", fill = false }) {
  const scale = sizes[size] || sizes.md;
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-nowrap overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        scale.list,
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px inline-flex items-center justify-center gap-1.5 border-b-2 font-medium transition",
              scale.tab,
              fill ? "min-w-0 flex-1 px-1.5" : "shrink-0",
              selected ? "border-primary text-primary" : "border-transparent text-muted hover:text-text"
            )}
          >
            {Icon ? <Icon className={cn("shrink-0", scale.icon)} aria-hidden="true" /> : null}
            <span className={cn(fill && "truncate")}>{tab.label}</span>
            {tab.count != null ? (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-4",
                  selected ? "bg-primary/10 text-primary" : "bg-slate-100 text-muted dark:bg-slate-800"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
