"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsNav } from "@/config/nav";
import { useAuth } from "@/contexts/AuthProvider";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const items = settingsNav.filter((item) => can(item.permission));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              pathname === item.href ? "bg-indigo-50 text-primary dark:bg-indigo-950" : "text-muted hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
