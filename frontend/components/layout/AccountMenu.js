"use client";

import { Lock, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

export function AccountMenu({ variant = "header", collapsed = false }) {
  const { user, logout } = useAuth();
  const roleName = user?.roles?.[0]?.name;
  const placement = variant === "sidebar" ? (collapsed ? "right-end" : "top-start") : "bottom-end";

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        aria-label="Account menu"
        className={cn(
          "flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800",
          collapsed && "justify-center px-0"
        )}
      >
        <Avatar name={user?.name} src={user?.avatarUrl} size={32} />
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{user?.name}</span>
            <span className="block truncate text-xs text-muted">{user?.email}</span>
          </span>
        ) : null}
      </button>
    ) : (
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Account menu"
      >
        <Avatar name={user?.name} src={user?.avatarUrl} size={32} />
        <span className="hidden max-w-[10rem] truncate text-sm md:inline">{user?.name}</span>
      </button>
    );

  return (
    <Dropdown trigger={trigger} placement={placement} menuClassName="w-56">
      <div className="border-b border-border px-3 py-2">
        <p className="truncate text-sm font-medium">{user?.name}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
        {roleName ? <p className="mt-1 text-xs text-muted">{roleName}</p> : null}
      </div>
      <DropdownItem href={ROUTES.profile}>
        <User className="h-4 w-4" />
        Profile
      </DropdownItem>
      <DropdownItem href={ROUTES.security}>
        <Lock className="h-4 w-4" />
        Security
      </DropdownItem>
      <DropdownItem onClick={logout}>
        <LogOut className="h-4 w-4" />
        Log out
      </DropdownItem>
    </Dropdown>
  );
}
