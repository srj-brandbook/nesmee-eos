"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Factory,
  Globe,
  History,
  Layers,
  LayoutDashboard,
  ListTodo,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  ShieldCheck,
  StickyNote,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { activityService, leadService } from "@/services/crmService";
import { formService } from "@/services/formService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ContactPanel } from "./ContactPanel";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { VerificationPanel } from "@/components/verification/VerificationPanel";
import { SupplierBillingPanel } from "@/components/billing/SupplierBillingPanel";
import { LeadStatusModal } from "./LeadStatusModal";
import { LeadStagePipeline } from "./LeadStagePipeline";
import { LeadOverview } from "./LeadOverview";
import { LeadProcessPanel } from "./LeadProcessPanel";
import { ActivityQuickAddModal } from "./ActivityQuickAddModal";
import { LeadHistory } from "./LeadHistory";
import {
  ACTIVITY_TYPES,
  LEAD_STAGES,
  LEAD_SOURCES,
  PROCESS_STAGES,
  labelFor,
  locationLabel,
  stageVariant,
  websiteHref,
  isActivityOpen,
  isActivityOverdue,
  activityWhen,
} from "@/constants/crm";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { formatDate, formatDateTime } from "@/lib/utils";

const SECTION_TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "onboarding", label: "Onboarding", icon: ClipboardCheck },
  { value: "verification", label: "Verification", icon: ShieldCheck },
  { value: "services", label: "Services", icon: Briefcase },
  { value: "history", label: "History", icon: History },
  { value: "tasks", label: "Tasks", icon: ListTodo },
  { value: "contacts", label: "Contacts", icon: Users },
];

function getPriorities(activities) {
  return activities
    .filter((item) => isActivityOpen(item) && (item.dueAt || item.startsAt))
    .map((item) => {
      const due = new Date(activityWhen(item));
      const today = new Date();
      const sameDay =
        due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate();
      return {
        ...item,
        _due: due,
        _bucket: isActivityOverdue(item) ? "overdue" : sameDay ? "today" : "upcoming",
      };
    })
    .sort((a, b) => a._due - b._due)
    .slice(0, 5);
}

const ACTIVITY_ICONS = {
  note: StickyNote,
  call: PhoneCall,
  follow_up: CalendarClock,
  appointment: Calendar,
  meeting: Video,
  status_change: History,
  task: ListTodo,
};

const BUCKET_STYLE = {
  overdue: { badge: "danger", label: "Overdue", icon: AlertCircle },
  today: { badge: "warning", label: "Today", icon: Clock },
  upcoming: { badge: "default", label: "Upcoming", icon: Clock },
};

export function LeadDetail({ leadId, variant = "sourcing" }) {
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const isDirectory = variant === "directory";
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState("overview");
  const [activityFilter, setActivityFilter] = useState("all");
  const [statusAction, setStatusAction] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null); // holds the preselected type, or null when closed
  const [onboardingState, setOnboardingState] = useState({ onboarding: null, formConfigured: false });

  async function loadOnboarding() {
    try {
      const response = await formService.onboarding.subject("lead", leadId);
      setOnboardingState(response.data);
    } catch {
      setOnboardingState({ onboarding: null, formConfigured: false });
    }
  }

  async function load() {
    const response = await leadService.get(leadId);
    setLead(response.data.lead);
    loadOnboarding();
    if (!can(PERMISSIONS.ACTIVITIES_VIEW)) {
      setActivities([]);
      return;
    }
    try {
      const activityResponse = await activityService.list({ leadId, sort: "-createdAt", limit: 100 });
      setActivities(activityResponse.data.items);
    } catch {
      setActivities([]);
    }
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load lead"));
  }, [leadId]);

  useEffect(() => {
    if (!lead || !isDirectory) return;
    if (lead.stage !== "won") router.replace(`${ROUTES.leads}/${leadId}`);
  }, [lead, isDirectory, leadId, router]);

  const counts = useMemo(() => {
    const byType = { contacts: lead?.contacts?.length || 0, tasks: 0, history: 0, verification: lead?.verificationSummary?.required || 0 };
    activities.forEach((item) => {
      if (item.type === "task") byType.tasks += 1;
      else byType.history += 1;
    });
    return byType;
  }, [activities, lead]);

  const priorities = useMemo(() => getPriorities(activities), [activities]);

  if (!lead || (isDirectory && lead.stage !== "won")) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const canConvert = !isDirectory && can(PERMISSIONS.LEADS_CONVERT) && PROCESS_STAGES.includes(lead.stage);
  const onboardingReady = !onboardingState.formConfigured || ["submitted", "approved"].includes(onboardingState.onboarding?.status);
  const canWon = !isDirectory && can(PERMISSIONS.LEADS_CONVERT) && lead.stage === "converted" && onboardingReady;
  const canCloseOut = !isDirectory && can(PERMISSIONS.LEADS_UPDATE) && !["won", "lost", "disqualified"].includes(lead.stage);
  const canLogActivity = can(PERMISSIONS.ACTIVITIES_CREATE);
  const continueOnboarding = !isDirectory && onboardingState.onboarding?.status === "draft";
  const listHref = isDirectory ? ROUTES.suppliers : ROUTES.leads;
  const listLabel = isDirectory ? "Suppliers" : "Manufacturer leads";

  function changeStage(next) {
    if (next === lead.stage) return;
    if (["converted", "won"].includes(next) && !can(PERMISSIONS.LEADS_CONVERT)) return;
    if (next === "won" && !onboardingReady) return;
    if (!["converted", "won"].includes(next) && !can(PERMISSIONS.LEADS_UPDATE)) return;
    setStatusAction(next);
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  function openPriority(item) {
    if (item.type === "task") {
      setTab("tasks");
      return;
    }
    setTab("history");
    setActivityFilter(item.type);
  }

  const tabs = SECTION_TABS.map((item) => ({
    ...item,
    count: item.value === "overview" || !counts[item.value] ? undefined : counts[item.value],
  }));

  const tasks = activities.filter((item) => item.type === "task");

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <Card>
        <CardBody className="space-y-4">
          <button
            type="button"
            onClick={() => router.push(listHref)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {listLabel}
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                <Factory className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{isDirectory ? "Supplier" : "Manufacturer lead"}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-display text-2xl font-semibold">{lead.name}</h1>
                  <Badge variant={stageVariant(lead.stage)}>{labelFor(LEAD_STAGES, lead.stage)}</Badge>
                  {lead.verificationStatus && lead.verificationStatus !== "none" ? (
                    <Badge variant={lead.verificationStatus === "verified" ? "success" : lead.verificationStatus === "expired" || lead.verificationStatus === "rejected" ? "danger" : "warning"}>
                      {lead.verificationStatus === "verified" ? "Verified" : lead.verificationStatus === "expired" ? "Expired docs" : lead.verificationStatus === "rejected" ? "Docs returned" : "Verification pending"}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  {lead.legalName ? <span>{lead.legalName}</span> : null}
                  {locationLabel(lead) ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLabel(lead)}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canLogActivity ? (
                <Button variant="outline" onClick={() => setQuickAdd("note")}>
                  <Plus className="h-4 w-4" />
                  Log activity
                </Button>
              ) : null}
              {canConvert ? <Button onClick={() => setStatusAction("converted")}>Convert</Button> : null}
              {continueOnboarding ? (
                <Link href={`/onboarding/${onboardingState.onboarding.id}`}>
                  <Button variant="outline">
                    <ClipboardCheck className="h-4 w-4" />
                    Continue onboarding
                  </Button>
                </Link>
              ) : null}
              {canWon ? (
                <Button onClick={() => setStatusAction("won")}>
                  <Trophy className="h-4 w-4" />
                  Mark won
                </Button>
              ) : null}
              {!isDirectory && lead.stage === "won" ? (
                <Link href={`${ROUTES.suppliers}/${leadId}`}>
                  <Button variant="outline">Open in suppliers</Button>
                </Link>
              ) : null}
              {isDirectory ? (
                <Link href={`${ROUTES.leads}/${leadId}`}>
                  <Button variant="outline">View in leads</Button>
                </Link>
              ) : null}
              {can(PERMISSIONS.LEADS_UPDATE) ? (
                <Link href={`${ROUTES.leads}/${leadId}/edit`}>
                  <Button variant="outline" size="icon" aria-label="Edit lead">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
              <Dropdown
                trigger={
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              >
                {canCloseOut ? (
                  <>
                    <DropdownItem onClick={() => setStatusAction("disqualified")} className="text-danger">
                      Mark disqualified
                    </DropdownItem>
                    <DropdownItem onClick={() => setStatusAction("lost")} className="text-danger">
                      Mark lost
                    </DropdownItem>
                  </>
                ) : null}
                <DropdownItem onClick={() => router.push(listHref)}>Back to {isDirectory ? "suppliers" : "leads"}</DropdownItem>
              </Dropdown>
            </div>
          </div>

          {isDirectory ? null : (
            <LeadStagePipeline
              stage={lead.stage}
              onSelect={changeStage}
              disabled={!can(PERMISSIONS.LEADS_UPDATE) && !can(PERMISSIONS.LEADS_CONVERT)}
            />
          )}
        </CardBody>
      </Card>

      {/* ── Body: main content + sidebar ──────────────────────────── */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          {/* Scrollable wrapper future-proofs against tab overflow on narrow
              screens without hiding content the way wrapping would. */}
          <div className="overflow-x-auto">
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
          </div>

          {tab === "overview" ? (
            <LeadOverview
              lead={lead}
              activities={activities}
              onOpenTab={(next) => {
                if (next === "contacts" || next === "tasks" || next === "history") setTab(next);
                else if (next === "activity") setTab("history");
                else {
                  setTab(next === "task" ? "tasks" : "history");
                  if (next !== "task") setActivityFilter(next);
                }
              }}
              onLogActivity={(nextType) => setQuickAdd(nextType)}
            />
          ) : null}

          {tab === "onboarding" ? (
            <OnboardingPanel
              subjectType="lead"
              subjectId={leadId}
              canStart={!isDirectory && can(PERMISSIONS.LEADS_CONVERT) && ["converted", "won"].includes(lead.stage)}
              startAction={() => leadService.startOnboarding(leadId)}
              onStarted={load}
            />
          ) : null}

          {tab === "verification" ? <VerificationPanel leadId={leadId} leadStage={lead.stage} /> : null}
          {tab === "services" ? <SupplierBillingPanel leadId={leadId} /> : null}

          {tab === "history" ? (
            <LeadHistory
              leadId={leadId}
              leadName={lead.name}
              contacts={lead.contacts || []}
              items={activities}
              filter={activityFilter}
              onFilter={setActivityFilter}
              onLog={(nextType) => setQuickAdd(nextType)}
              onChanged={load}
              canLog={canLogActivity}
            />
          ) : null}

          {tab === "tasks" ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setQuickAdd("task")}>
                  <Plus className="h-3.5 w-3.5" />
                  New task
                </Button>
              </div>
              <LeadProcessPanel
                type="task"
                leadId={leadId}
                leadName={lead.name}
                contacts={lead.contacts || []}
                items={tasks}
                onChanged={load}
                hideForm
              />
            </div>
          ) : null}

          {tab === "contacts" ? <ContactPanel leadId={leadId} contacts={lead.contacts || []} onChanged={load} /> : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          {/* Priorities — the "what needs my attention" panel */}
          {priorities.length > 0 ? (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Priorities</h2>
              </CardHeader>
              <CardBody className="space-y-1">
                {priorities.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.type] || CalendarClock;
                  const bucket = BUCKET_STYLE[item._bucket];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openPriority(item)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{item.title || labelFor(ACTIVITY_TYPES, item.type)}</p>
                        <p className="text-xs text-muted">{formatDateTime(item._due)}</p>
                      </div>
                      <Badge variant={bucket.badge} className="shrink-0 text-[10px]">
                        {bucket.label}
                      </Badge>
                    </button>
                  );
                })}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="flex items-center gap-2.5 py-4 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Nothing due — you're caught up on this {isDirectory ? "supplier" : "lead"}.
              </CardBody>
            </Card>
          )}

          {/* Fit score + owner */}
          <Card>
            <CardBody className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Fit score</p>
                  <span className="font-display text-lg font-semibold">{lead.score}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Number(lead.score) || 0)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  {lead.owner ? <Avatar name={lead.owner.name} src={lead.owner.avatarUrl} size={32} /> : null}
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Owner</p>
                    <p className="text-sm">{lead.owner?.name || "Unassigned"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <Building2 className="h-3.5 w-3.5" />
                  {labelFor(LEAD_SOURCES, lead.source)}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Contact */}
          {(lead.email || lead.phone || lead.website) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Contact</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <Fact icon={Mail} label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : ""} onCopy={copy} />
                <Fact icon={Phone} label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : ""} onCopy={copy} />
                <Fact icon={Globe} label="Website" value={lead.website} href={lead.website ? websiteHref(lead.website) : ""} external />
              </CardBody>
            </Card>
          )}

          {/* Sourcing profile */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Sourcing profile</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Fact icon={Package} label="Products" value={lead.products} span />
                <Fact icon={ShieldCheck} label="Certifications" value={lead.certifications} />
                <Fact icon={Layers} label="MOQ" value={lead.moq} />
                <Fact icon={Globe} label="Export markets" value={lead.exportMarkets} span />
              </div>
            </CardBody>
          </Card>

          {/* Timeline / outcome */}
          {(lead.convertedAt || lead.wonAt || lead.lostReason || lead.disqualifiedAt || lead.disqualifiedReason) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Timeline</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {lead.convertedAt ? <Fact icon={Calendar} label="Converted" value={formatDate(lead.convertedAt)} /> : null}
                {lead.wonAt ? <Fact icon={Award} label="Won" value={formatDate(lead.wonAt)} /> : null}
                {lead.disqualifiedAt ? <Fact icon={Calendar} label="Disqualified" value={formatDate(lead.disqualifiedAt)} /> : null}
                {lead.lostReason ? <Fact label="Lost reason" value={lead.lostReason} span /> : null}
                {lead.disqualifiedReason ? <Fact label="Disqualified reason" value={lead.disqualifiedReason} span /> : null}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      <LeadStatusModal
        open={Boolean(statusAction)}
        lead={lead}
        action={statusAction}
        onClose={() => setStatusAction(null)}
        onDone={() => load()}
      />

      <ActivityQuickAddModal
        open={Boolean(quickAdd)}
        defaultType={quickAdd || "note"}
        leadId={leadId}
        leadName={lead.name}
        contacts={lead.contacts || []}
        onClose={() => setQuickAdd(null)}
        onDone={() => load()}
      />
    </div>
  );
}

function Fact({ icon: Icon, label, value, href, external, onCopy, span }) {
  if (!value) return null;
  return (
    <div className={`flex items-start justify-between gap-2 ${span ? "col-span-2" : ""}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        {href ? (
          <a
            href={href}
            className="mt-0.5 inline-flex items-center gap-1.5 break-all text-sm text-primary hover:underline"
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
            {value}
          </a>
        ) : (
          <p className="mt-0.5 flex items-start gap-1.5 whitespace-pre-wrap text-sm">
            {Icon ? <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /> : null}
            <span>{value}</span>
          </p>
        )}
      </div>
      {onCopy ? (
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label={`Copy ${label}`} onClick={() => onCopy(value)}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}