"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { userService } from "@/services/userService";
import { notificationService } from "@/services/notificationService";
import { auditService } from "@/services/auditService";
import { leadService } from "@/services/crmService";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Chart } from "@/components/ui/Chart";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PERMISSIONS } from "@/constants/permissions";

export function DashboardHome() {
  const { user, can } = useAuth();
  const [stats, setStats] = useState({ users: 0, unread: 0, audits: 0 });
  const [crm, setCrm] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    async function load() {
      const unread = await notificationService.list({ limit: 1 }).catch(() => null);
      let users = 0;
      let audits = [];
      if (can(PERMISSIONS.USERS_VIEW)) {
        const list = await userService.list({ limit: 1 }).catch(() => null);
        users = list?.data.pagination.total || 0;
      }
      if (can(PERMISSIONS.AUDIT_VIEW)) {
        const logs = await auditService.list({ limit: 6 }).catch(() => null);
        audits = logs?.data.items || [];
      }
      if (can(PERMISSIONS.LEADS_VIEW)) {
        const dashboard = await leadService.dashboard().catch(() => null);
        setCrm(dashboard?.data || null);
      }
      setStats({
        users,
        unread: unread?.data.unreadCount || 0,
        audits: audits.length,
      });
      setActivity(audits);
    }
    load();
  }, [can]);

  const chartData = [
    { name: "Mon", value: 2 },
    { name: "Tue", value: 4 },
    { name: "Wed", value: 3 },
    { name: "Thu", value: 6 },
    { name: "Fri", value: 5 },
  ];

  return (
    <div className="space-y-6">
      {user.status === "pending_verification" ? (
        <Alert variant="warning">Verify your email to unlock the rest of the application.</Alert>
      ) : null}
      <div>
        <h1 className="font-display text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-sm text-muted">Source manufacturers and convert the right ones into export suppliers.</p>
      </div>
      {crm ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardBody>
              <p className="text-sm text-muted">In process</p>
              <p className="mt-2 font-display text-3xl">{crm.inProcess}</p>
              <p className="mt-1 text-xs text-muted">New, contacted, qualified</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-muted">Converted</p>
              <p className="mt-2 font-display text-3xl">{crm.converted}</p>
              <p className="mt-1 text-xs text-muted">{crm.won} won · {crm.lost} lost · {crm.disqualified || 0} disqualified</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-muted">Overdue follow-ups</p>
              <p className="mt-2 font-display text-3xl">{crm.overdueFollowUps}</p>
              <p className="mt-1 text-xs text-muted">{crm.leadsThisWeek} new this week</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm text-muted">Next meeting</p>
              <p className="mt-2 text-sm font-medium">
                {crm.upcomingMeetings?.[0]
                  ? `${crm.upcomingMeetings[0].title || crm.upcomingMeetings[0].leadName || "Meeting"} · ${formatDateTime(
                      crm.upcomingMeetings[0].startsAt
                    )}`
                  : "None scheduled"}
              </p>
            </CardBody>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-sm text-muted">Users</p>
            <p className="mt-2 font-display text-3xl">{stats.users}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-muted">Unread notifications</p>
            <p className="mt-2 font-display text-3xl">{stats.unread}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-muted">Recent audited actions</p>
            <p className="mt-2 font-display text-3xl">{stats.audits}</p>
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">Activity trend</h2>
          </CardHeader>
          <CardBody>
            <Chart data={chartData} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Quick actions</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {can(PERMISSIONS.LEADS_CREATE) ? (
              <Link href="/leads/new">
                <Button className="w-full">New manufacturer lead</Button>
              </Link>
            ) : null}
            {can(PERMISSIONS.ACTIVITIES_VIEW) ? (
              <>
                <Link href="/appointments">
                  <Button variant="outline" className="w-full">
                    Appointments
                  </Button>
                </Link>
                <Link href="/meetings">
                  <Button variant="outline" className="w-full">
                    Meetings
                  </Button>
                </Link>
                <Link href="/tasks">
                  <Button variant="outline" className="w-full">
                    Task manager
                  </Button>
                </Link>
                <Link href="/follow-ups">
                  <Button variant="outline" className="w-full">
                    Follow-ups & reminders
                  </Button>
                </Link>
              </>
            ) : null}
            {can(PERMISSIONS.CALENDAR_VIEW) ? (
              <Link href="/calendar">
                <Button variant="outline" className="w-full">
                  Open calendar
                </Button>
              </Link>
            ) : null}
            {can(PERMISSIONS.USERS_CREATE) ? (
              <Link href="/users/new">
                <Button className="w-full">Create user</Button>
              </Link>
            ) : null}
            <Link href="/notifications">
              <Button variant="outline" className="w-full">
                Notifications
              </Button>
            </Link>
            <Link href="/settings/profile">
              <Button variant="ghost" className="w-full">
                Edit profile
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Recent activity</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {activity.length === 0 ? <p className="text-sm text-muted">No recent audit events, or you lack audit.view.</p> : null}
          {activity.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <span>
                {item.actorEmail} · {item.module}.{item.action}
              </span>
              <span className="text-muted">{formatDate(item.createdAt)}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
