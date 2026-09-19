"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { appName } from "@/config/env";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { AccountMenu } from "./AccountMenu";
import { CommandPalette } from "./CommandPalette";
import { Header } from "./Header";
import { Sidebar, SidebarNav } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { isImmersiveEditorPath } from "@/constants/routes";

const COLLAPSE_KEY = "sidebar-collapsed";

export function AppShell({ children }) {
  const pathname = usePathname();
  const isPrintPath = pathname?.includes("/print");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => isImmersiveEditorPath(pathname));
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY) === "true";
    setCollapsed(isImmersiveEditorPath(pathname) ? true : stored);
  }, [pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }

  return (
    <div className="flex h-dvh max-h-dvh max-w-[100vw] overflow-hidden bg-bg">
      <div className={isPrintPath ? "print:hidden" : undefined}>
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>
      <Drawer open={mobileOpen} onClose={closeMobile}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="font-display text-lg font-semibold">{appName}</div>
          <Button variant="ghost" size="icon" onClick={closeMobile} aria-label="Close menu">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="-mx-2 flex-1 overflow-y-auto">
          <SidebarNav onNavigate={closeMobile} />
        </div>
        <div className="mt-4 border-t border-border pt-2">
          <AccountMenu variant="sidebar" />
        </div>
      </Drawer>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className={isPrintPath ? "print:hidden" : undefined}>
          <Header onMenu={() => setMobileOpen(true)} onSearch={openCommand} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 sm:px-4 md:px-6 print:overflow-visible print:px-0">
          <div className={isPrintPath ? "print:hidden" : undefined}>
            <Breadcrumbs />
          </div>
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto py-3 md:py-4 print:overflow-visible print:p-0">{children}</main>
        </div>
      </div>
      <CommandPalette open={commandOpen} onOpen={openCommand} onClose={closeCommand} />
    </div>
  );
}
