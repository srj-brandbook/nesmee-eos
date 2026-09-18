"use client";

import { useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { sessionService } from "@/services/sessionService";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default function SecurityPage() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const [sessions, setSessions] = useState([]);

  async function load() {
    const response = await sessionService.list();
    setSessions(response.data.items);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Security</h1>
      <form
        className="max-w-xl space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await authService.changePassword(form);
          setForm({ currentPassword: "", newPassword: "" });
          toast.success("Password changed. Other sessions were signed out.");
          load();
        }}
      >
        <Input label="Current password" type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
        <Input label="New password" type="password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
        <Button type="submit">Change password</Button>
      </form>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span>Active sessions</span>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await sessionService.revokeAll();
              toast.success("Other sessions revoked");
              load();
            }}
          >
            Sign out others
          </Button>
        </CardHeader>
        <CardBody className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p>{session.current ? "This device" : session.userAgent || "Unknown device"}</p>
                <p className="text-muted">
                  {session.ip} · last seen {formatDate(session.lastSeenAt)}
                </p>
              </div>
              {!session.current ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await sessionService.revoke(session.id);
                    load();
                  }}
                >
                  Revoke
                </Button>
              ) : null}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
