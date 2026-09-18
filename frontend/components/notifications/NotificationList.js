"use client";

import { useEffect, useState } from "react";
import { notificationService } from "@/services/notificationService";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export function NotificationList() {
  const [data, setData] = useState({ items: [], unreadCount: 0 });

  async function load() {
    const response = await notificationService.list({ limit: 50 });
    setData(response.data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted">{data.unreadCount} unread</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await notificationService.markAllRead();
            load();
          }}
        >
          Mark all read
        </Button>
      </div>
      {data.items.length === 0 ? (
        <EmptyState title="You're all caught up" description="In-app notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted">{item.body}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(item.createdAt)}</p>
                </div>
                {!item.readAt ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await notificationService.markRead(item.id);
                      load();
                    }}
                  >
                    Mark read
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
