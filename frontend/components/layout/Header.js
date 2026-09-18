"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountMenu } from "./AccountMenu";
import { PageTitle } from "./Breadcrumbs";
import { useIsMac } from "./CommandPalette";
import { NotificationMenu } from "./NotificationMenu";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ onMenu, onSearch }) {
  const isMac = useIsMac();

  return (
    <header className="sticky top-0 z-20 flex h-16 min-w-0 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-surface/80 px-3 backdrop-blur sm:gap-3 sm:px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </Button>
        <PageTitle className="truncate font-display text-base font-semibold md:hidden" />
      </div>
      <button
        type="button"
        onClick={onSearch}
        className="hidden h-10 min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-bg px-3 text-left text-sm text-muted transition hover:border-primary/40 md:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Search or jump to…</span>
        <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onSearch} aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <NotificationMenu />
        <AccountMenu variant="header" />
      </div>
    </header>
  );
}
