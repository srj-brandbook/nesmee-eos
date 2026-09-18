"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ROUTES } from "@/constants/routes";
import { formatDate } from "@/lib/utils";

export function NotificationMenu() {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const response = await notificationService.list({ limit: 5 });
      setUnread(response.data.unreadCount || 0);
      setItems(response.data.items || []);
    } catch {
      setUnread(0);
      setItems([]);
    }
  }

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await notificationService.list({ limit: 5 });
        if (!active) return;
        setUnread(response.data.unreadCount || 0);
        setItems(response.data.items || []);
      } catch {
        if (active) {
          setUnread(0);
          setItems([]);
        }
      }
    }
    refresh();
    const timer = setInterval(refresh, 60000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <Dropdown
      placement="bottom-end"
      menuClassName="w-80 p-0"
      onOpenChange={(open) => {
        if (open) load();
      }}
      trigger={
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      }
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-medium">Notifications</p>
        {unread > 0 ? (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={async (event) => {
              event.stopPropagation();
              await notificationService.markAllRead();
              load();
            }}
          >
            Mark all read
          </button>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">You&apos;re all caught up</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 border-b border-border px-3 py-2 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                {item.body ? <p className="truncate text-xs text-muted">{item.body}</p> : null}
                <p className="mt-1 text-[11px] text-muted">{formatDate(item.createdAt)}</p>
              </div>
              {!item.readAt ? (
                <button
                  type="button"
                  className="shrink-0 text-xs text-primary hover:underline"
                  onClick={async (event) => {
                    event.stopPropagation();
                    await notificationService.markRead(item.id);
                    load();
                  }}
                >
                  Read
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border p-1">
        <DropdownItem href={ROUTES.notifications} className="justify-center text-muted">
          View all
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
