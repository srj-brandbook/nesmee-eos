"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { userService } from "@/services/userService";
import { auditService } from "@/services/auditService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { formatDate } from "@/lib/utils";
import { PERMISSIONS } from "@/constants/permissions";

export function UserDetail({ userId }) {
  const { can } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("profile");
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    userService.get(userId).then((response) => setUser(response.data.user));
  }, [userId]);

  useEffect(() => {
    if (tab === "sessions" && can(PERMISSIONS.USERS_UPDATE)) {
      userService.sessions(userId).then((response) => setSessions(response.data.items)).catch(() => setSessions([]));
    }
    if (tab === "activity" && can(PERMISSIONS.AUDIT_VIEW)) {
      auditService.list({ actorId: userId, limit: 20 }).then((response) => setActivity(response.data.items)).catch(() => setActivity([]));
    }
  }, [can, tab, userId]);

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatarUrl} size={48} />
          <div>
            <h1 className="font-display text-2xl font-semibold">{user.name}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <Badge>{user.status}</Badge>
        </div>
        <div className="flex gap-2">
          {can(PERMISSIONS.USERS_UPDATE) ? (
            <Link href={`/users/${user.id}/edit`}>
              <Button>Edit</Button>
            </Link>
          ) : null}
          {can(PERMISSIONS.USERS_UPDATE) ? (
            <Button
              variant="outline"
              onClick={async () => {
                await userService.resetPassword(user.id);
                toast.success("Reset email sent");
              }}
            >
              Send password reset
            </Button>
          ) : null}
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "profile", label: "Profile" },
          { value: "activity", label: "Activity" },
          { value: "sessions", label: "Sessions" },
        ]}
      />
      {tab === "profile" ? (
        <Card>
          <CardBody className="space-y-2 text-sm">
            <p>Last login: {formatDate(user.lastLoginAt)}</p>
            <p>Verified: {formatDate(user.emailVerifiedAt)}</p>
            <p>Created: {formatDate(user.createdAt)}</p>
          </CardBody>
        </Card>
      ) : null}
      {tab === "activity" ? (
        <Card>
          <CardHeader>Audit trail</CardHeader>
          <CardBody className="space-y-2 text-sm">
            {activity.map((item) => (
              <p key={item.id}>
                {item.module}.{item.action} · {formatDate(item.createdAt)}
              </p>
            ))}
            {activity.length === 0 ? <p className="text-muted">No activity or missing audit.view.</p> : null}
          </CardBody>
        </Card>
      ) : null}
      {tab === "sessions" ? (
        <Card>
          <CardBody className="space-y-2 text-sm">
            {sessions.map((session) => (
              <p key={session.id}>
                {session.ip || "Unknown IP"} · {session.userAgent} · {formatDate(session.lastSeenAt)}
              </p>
            ))}
            {sessions.length === 0 ? <p className="text-muted">No sessions.</p> : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
