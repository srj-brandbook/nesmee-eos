"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Factory,
  FileStack,
  Globe,
  Handshake,
  ListTodo,
  Package,
  Plus,
  RefreshCw,
  Shield,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { dashboardService } from "@/services/dashboardService";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Chart } from "@/components/ui/Chart";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, cn } from "@/lib/utils";
import { formatInr } from "@/constants/billing";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

const KPI_ICONS = {
  factory: Factory,
  handshake: Handshake,
  bell: Bell,
  package: Package,
  shield: Shield,
  globe: Globe,
  wallet: Wallet,
  users: Users,
  file: FileStack,
  clipboard: ClipboardCheck,
};

const TONE_CLASSES = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
};

function formatKpiValue(item) {
  if (item == null || item.value == null) return "—";
  if (item.format === "inr") return formatInr(item.value);
  return Number(item.value).toLocaleString("en-IN");
}

function KpiCard({ item }) {
  const Icon = KPI_ICONS[item.icon] || ClipboardCheck;
  const content = (
    <Card className={cn("h-full transition", item.href && "hover:border-primary")}>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{formatKpiValue(item)}</p>
            {item.hint ? <p className="mt-1 truncate text-xs text-muted">{item.hint}</p> : null}
          </div>
          <span className={cn("rounded-md p-2", TONE_CLASSES[item.tone] || TONE_CLASSES.default)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardBody>
    </Card>
  );
  return item.href ? <Link href={item.href}>{content}</Link> : content;
}

function SnapshotStat({ label, value, hint }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value ?? "—"}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function DashboardHome() {
  const { user, can } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await dashboardService.overview();
        setData(response.data);
      } catch {
        toast.error("Unable to load live dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <DashboardLoading />;

  const kpis = data?.kpis || [];
  const attention = data?.attention || [];
  const trend = data?.activityTrend || [];
  const sourcing = data?.sourcing;
  const exp = data?.export;
  const billing = data?.billing;
  const products = data?.products;
  const nextMeeting = sourcing?.upcomingMeetings?.[0];

  return (
    <div className="space-y-6">
      {user.status === "pending_verification" || data?.emailVerificationRequired ? (
        <Alert variant="warning">Verify your email to unlock the rest of the application.</Alert>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Welcome, {user.name}</h1>
          <p className="text-sm text-muted">Live operations across your export operating system.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">
            {data?.generatedAt ? `Updated ${formatDateTime(data.generatedAt)}` : "Live counts"}
          </p>
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {kpis.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <KpiCard key={item.key} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState title="No KPIs yet" description="Counts appear here as soon as you have access to a workspace module." />
      )}

      {attention.length ? (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs attention
            </span>
            <Badge variant="warning">{attention.length}</Badge>
          </CardHeader>
          <CardBody className="grid gap-2 md:grid-cols-2">
            {attention.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 hover:border-primary"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.hint ? <p className="text-xs text-muted">{item.hint}</p> : null}
                </div>
                <Badge variant={item.severity === "danger" ? "danger" : "warning"}>{item.value}</Badge>
              </Link>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Activity this week</h2>
              <p className="text-xs text-muted">Leads, products, documents, jobs, and verification cases created</p>
            </div>
          </CardHeader>
          <CardBody>
            {trend.some((point) => point.value > 0) ? (
              <Chart data={trend} />
            ) : (
              <p className="text-sm text-muted">No new records in the last seven days.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Quick actions</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {can(PERMISSIONS.LEADS_CREATE) ? (
              <Link href={`${ROUTES.leads}/new`}>
                <Button className="w-full">
                  <Plus className="h-4 w-4" />
                  New manufacturer lead
                </Button>
              </Link>
            ) : null}
            {can(PERMISSIONS.PRODUCTS_CREATE) ? (
              <Link href={`${ROUTES.products}/new`}>
                <Button variant="outline" className="w-full">
                  <Package className="h-4 w-4" />
                  New product
                </Button>
              </Link>
            ) : null}
            {can(PERMISSIONS.ACTIVITIES_VIEW) ? (
              <>
                <Link href={ROUTES.appointments}>
                  <Button variant="outline" className="w-full">
                    <CalendarDays className="h-4 w-4" />
                    Appointments
                  </Button>
                </Link>
                <Link href={ROUTES.meetings}>
                  <Button variant="outline" className="w-full">
                    <Video className="h-4 w-4" />
                    Meetings
                  </Button>
                </Link>
                <Link href={ROUTES.tasks}>
                  <Button variant="outline" className="w-full">
                    <ListTodo className="h-4 w-4" />
                    Task manager
                  </Button>
                </Link>
                <Link href={ROUTES.followUps}>
                  <Button variant="outline" className="w-full">
                    <Bell className="h-4 w-4" />
                    Follow-ups
                  </Button>
                </Link>
              </>
            ) : null}
            {can(PERMISSIONS.CALENDAR_VIEW) ? (
              <Link href={ROUTES.calendar}>
                <Button variant="outline" className="w-full">
                  <CalendarDays className="h-4 w-4" />
                  Open calendar
                </Button>
              </Link>
            ) : null}
            {can(PERMISSIONS.USERS_CREATE) ? (
              <Link href={`${ROUTES.users}/new`}>
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4" />
                  Create user
                </Button>
              </Link>
            ) : null}
            <Link href={ROUTES.notifications}>
              <Button variant="ghost" className="w-full">
                Notifications
              </Button>
            </Link>
            <Link href={ROUTES.profile}>
              <Button variant="ghost" className="w-full">
                Edit profile
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      {sourcing || exp || billing || products ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sourcing ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold">Sourcing</h2>
                <Link href={ROUTES.leads} className="text-sm text-primary">
                  View leads
                </Link>
              </CardHeader>
              <CardBody className="grid gap-4 sm:grid-cols-3">
                <SnapshotStat label="Converted" value={sourcing.converted} hint={`${sourcing.disqualified || 0} disqualified`} />
                <SnapshotStat label="Open tasks" value={sourcing.openTasks} hint={`${sourcing.overdueTasks || 0} overdue`} />
                <SnapshotStat
                  label="Next meeting"
                  value={
                    nextMeeting
                      ? nextMeeting.title || nextMeeting.leadName || "Meeting"
                      : "None scheduled"
                  }
                  hint={nextMeeting ? formatDateTime(nextMeeting.startsAt) : undefined}
                />
              </CardBody>
            </Card>
          ) : null}
          {exp ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold">Export</h2>
                <Link href={ROUTES.export} className="text-sm text-primary">
                  Control center
                </Link>
              </CardHeader>
              <CardBody className="grid gap-4 sm:grid-cols-3">
                <SnapshotStat label="Corridors" value={exp.activeCorridors} hint={`${exp.averageTransitTime || 0} day avg transit`} />
                <SnapshotStat label="Distributors" value={exp.activeBuyers} hint={`${exp.newOpportunities || 0} new opportunities`} />
                <SnapshotStat
                  label={exp.expectedRevenue == null ? "Pipeline" : "Expected revenue"}
                  value={exp.expectedRevenue == null ? exp.newOpportunities : formatInr(exp.expectedRevenue)}
                  hint={exp.averageMargin != null ? `${exp.averageMargin}% avg margin` : "Open opportunities"}
                />
              </CardBody>
            </Card>
          ) : null}
          {billing ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold">Billing</h2>
                <Link href={ROUTES.billing} className="text-sm text-primary">
                  View billing
                </Link>
              </CardHeader>
              <CardBody className="grid gap-4 sm:grid-cols-3">
                <SnapshotStat
                  label="Collected MTD"
                  value={billing.collectedMtd != null ? formatInr(billing.collectedMtd) : "—"}
                />
                <SnapshotStat label="Jobs in flight" value={billing.jobsInFlight || 0} />
                <SnapshotStat
                  label="Overdue"
                  value={billing.overdue != null ? formatInr(billing.overdue) : billing.overdueCount || 0}
                  hint={`${billing.overdueCount || 0} invoices`}
                />
              </CardBody>
            </Card>
          ) : null}
          {products ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="font-semibold">Catalog</h2>
                <Link href={ROUTES.products} className="text-sm text-primary">
                  View products
                </Link>
              </CardHeader>
              <CardBody className="grid gap-4 sm:grid-cols-3">
                <SnapshotStat label="Total" value={products.total} />
                <SnapshotStat label="Listed" value={products.listed} />
                <SnapshotStat label="Drafts" value={products.draft} hint={`${products.inVerification || 0} in verification`} />
              </CardBody>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Recent activity</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {(data?.recentActivity || []).length === 0 ? (
            <p className="text-sm text-muted">No recent events yet.</p>
          ) : (
            data.recentActivity.map((item) => (
              <Link key={item.id} href={item.href || ROUTES.notifications} className="flex justify-between gap-4 text-sm hover:text-primary">
                <span>
                  {item.title}
                  {item.subtitle ? <span className="text-muted"> · {item.subtitle}</span> : null}
                </span>
                <span className="shrink-0 text-muted">{formatDateTime(item.at)}</span>
              </Link>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
