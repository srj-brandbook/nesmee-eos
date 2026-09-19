"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  ClipboardCheck,
  FileStack,
  History,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { activityService, leadService } from "@/services/crmService";
import { productService } from "@/services/productService";
import { billingService } from "@/services/billingService";
import { documentService } from "@/services/documentService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { VerificationPanel } from "@/components/verification/VerificationPanel";
import { SupplierBillingPanel } from "@/components/billing/SupplierBillingPanel";
import { SubjectDocumentsPanel } from "@/components/documents/SubjectDocumentsPanel";
import { SupplierProductsPanel } from "@/components/products/SupplierProductsPanel";
import { ActivityQuickAddModal } from "./ActivityQuickAddModal";
import { LeadHistory } from "./LeadHistory";
import { LeadProcessPanel } from "./LeadProcessPanel";
import { SupplierOverview, ProfileIconRow } from "./SupplierOverview";
import { isActivityOpen, isActivityOverdue, activityWhen } from "@/constants/crm";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { formatDate, cn } from "@/lib/utils";
import { labelFor as verificationLabel, LEAD_VERIFICATION_STATUSES, verificationStatusVariant } from "@/constants/verification";

const TABS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "catalog", label: "Catalog", icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
  { value: "compliance", label: "Compliance", icon: ShieldCheck },
  { value: "services", label: "Services", icon: Briefcase },
  { value: "documents", label: "Documents", icon: FileStack, permission: PERMISSIONS.DOCUMENTS_VIEW },
  { value: "activity", label: "Activity", icon: History },
];

const OPEN_JOBS = ["draft", "confirmed", "in_progress", "awaiting_authority", "delivered"];

function HealthTile({ label, value, hint, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[9.5rem] flex-1 rounded-lg border px-4 py-3 text-left transition",
        active ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/40",
        tone === "danger" && !active && "border-rose-200 dark:border-rose-900",
        tone === "warning" && !active && "border-amber-200 dark:border-amber-900"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 font-display text-xl font-semibold", tone === "danger" && "text-danger")}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </button>
  );
}

export function SupplierDetail({ supplierId }) {
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tab, setTab] = useState("overview");
  const [activityFilter, setActivityFilter] = useState("all");
  const [quickAdd, setQuickAdd] = useState(null);
  const [snapshot, setSnapshot] = useState({
    productsTotal: 0,
    productsListed: 0,
    jobsOpen: 0,
    documents: 0,
  });

  async function loadSnapshot(id) {
    const next = { productsTotal: 0, productsListed: 0, jobsOpen: 0, documents: 0 };
    const tasks = [];
    if (can(PERMISSIONS.PRODUCTS_VIEW)) {
      tasks.push(
        productService
          .list({ supplierId: id, limit: 50, sort: "-updatedAt" })
          .then((response) => {
            const items = response.data.items || [];
            next.productsTotal = response.data.pagination?.total ?? items.length;
            next.productsListed = items.filter((item) => item.listingStatus === "listed").length;
          })
          .catch(() => {})
      );
    }
    if (can(PERMISSIONS.SERVICES_JOBS_VIEW)) {
      tasks.push(
        billingService
          .listJobs({ leadId: id, limit: 50, sort: "-updatedAt" })
          .then((response) => {
            const items = response.data.items || [];
            next.jobsOpen = items.filter((item) => OPEN_JOBS.includes(item.status)).length;
          })
          .catch(() => {})
      );
    }
    if (can(PERMISSIONS.DOCUMENTS_VIEW)) {
      tasks.push(
        documentService
          .list({ subjectType: "lead", subjectId: id, limit: 1 })
          .then((response) => {
            next.documents = response.data.pagination?.total ?? (response.data.items || []).length;
          })
          .catch(() => {})
      );
    }
    await Promise.all(tasks);
    setSnapshot(next);
  }

  async function load() {
    const response = await leadService.get(supplierId);
    setLead(response.data.lead);
    loadSnapshot(supplierId);
    if (!can(PERMISSIONS.ACTIVITIES_VIEW)) {
      setActivities([]);
      return;
    }
    try {
      const activityResponse = await activityService.list({ leadId: supplierId, sort: "-createdAt", limit: 100 });
      setActivities(activityResponse.data.items);
    } catch {
      setActivities([]);
    }
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load supplier"));
  }, [supplierId]);

  useEffect(() => {
    if (!lead) return;
    if (lead.stage !== "won") router.replace(`${ROUTES.leads}/${supplierId}`);
  }, [lead, supplierId, router]);

  const openWork = useMemo(
    () => activities.filter((item) => isActivityOpen(item) && (item.dueAt || item.startsAt)),
    [activities]
  );
  const overdueCount = openWork.filter(isActivityOverdue).length;
  const nextDue = useMemo(() => {
    return [...openWork].sort((a, b) => new Date(activityWhen(a)) - new Date(activityWhen(b)))[0] || null;
  }, [openWork]);
  const tasks = activities.filter((item) => item.type === "task");
  const summary = lead?.verificationSummary || {};

  const tabs = TABS.filter((item) => !item.permission || can(item.permission)).map((item) => {
    const counts = {
      catalog: snapshot.productsTotal,
      compliance: (summary.pending || 0) + (summary.expired || 0) + (summary.expiringSoon || 0),
      services: snapshot.jobsOpen,
      documents: snapshot.documents,
      activity: openWork.length,
    };
    return { ...item, count: item.value === "overview" || !counts[item.value] ? undefined : counts[item.value] };
  });

  if (!lead || lead.stage !== "won") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const canLogActivity = can(PERMISSIONS.ACTIVITIES_CREATE);
  const canCreateProduct = can(PERMISSIONS.PRODUCTS_CREATE) && lead.verificationStatus === "verified";
  const verificationHint =
    summary.required > 0
      ? `${summary.verified || 0}/${summary.required} docs verified`
      : lead.verificationStatus === "verified"
        ? "No outstanding requirements"
        : "Permits and certificates";
  const complianceTone =
    lead.verificationStatus === "expired" || lead.verificationStatus === "rejected" || summary.expired
      ? "danger"
      : lead.verificationStatus === "pending" || summary.pending || summary.expiringSoon
        ? "warning"
        : undefined;
  const primary = lead.primaryContact || lead.contacts?.find((item) => item.isPrimary) || lead.contacts?.[0];

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-5">
          <button
            type="button"
            onClick={() => router.push(ROUTES.suppliers)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Suppliers
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Supplier</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-semibold">{lead.name}</h1>
                <Badge variant={verificationStatusVariant(lead.verificationStatus || "none")}>
                  {verificationLabel(LEAD_VERIFICATION_STATUSES, lead.verificationStatus || "none")}
                </Badge>
              </div>
              <ProfileIconRow lead={lead} />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-2">
                  {lead.owner ? <Avatar name={lead.owner.name} src={lead.owner.avatarUrl} size={24} /> : null}
                  <span className="text-muted">Owner</span>
                  <span>{lead.owner?.name || "Unassigned"}</span>
                </span>
                {lead.wonAt ? (
                  <span className="text-muted">
                    Won <span className="text-text">{formatDate(lead.wonAt)}</span>
                  </span>
                ) : null}
                {primary ? (
                  <span className="text-muted">
                    Contact <span className="text-text">{primary.name}</span>
                    {primary.role ? ` · ${primary.role}` : ""}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCreateProduct ? (
                <Link href={`${ROUTES.products}/new?supplierId=${supplierId}`}>
                  <Button>
                    <Plus className="h-4 w-4" />
                    New product
                  </Button>
                </Link>
              ) : null}
              {can(PERMISSIONS.LEADS_UPDATE) ? (
                <Link href={`${ROUTES.leads}/${supplierId}/edit`}>
                  <Button variant="outline">
                    <Pencil className="h-4 w-4" />
                    Edit profile
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
                {canLogActivity ? (
                  <DropdownItem onClick={() => setQuickAdd("note")}>Log activity</DropdownItem>
                ) : null}
                {canLogActivity ? (
                  <DropdownItem onClick={() => setQuickAdd("task")}>Add task</DropdownItem>
                ) : null}
                <DropdownItem href={`${ROUTES.leads}/${supplierId}`}>Open sourcing record</DropdownItem>
                <DropdownItem onClick={() => router.push(ROUTES.suppliers)}>Back to suppliers</DropdownItem>
              </Dropdown>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {can(PERMISSIONS.PRODUCTS_VIEW) ? (
              <HealthTile
                label="Catalog"
                value={snapshot.productsListed}
                hint={`${snapshot.productsTotal} product${snapshot.productsTotal === 1 ? "" : "s"} total`}
                active={tab === "catalog"}
                onClick={() => setTab("catalog")}
              />
            ) : null}
            <HealthTile
              label="Compliance"
              value={verificationLabel(LEAD_VERIFICATION_STATUSES, lead.verificationStatus || "none")}
              hint={verificationHint}
              tone={complianceTone}
              active={tab === "compliance"}
              onClick={() => setTab("compliance")}
            />
            {can(PERMISSIONS.SERVICES_JOBS_VIEW) ? (
              <HealthTile
                label="Services"
                value={snapshot.jobsOpen}
                hint="Jobs in flight"
                active={tab === "services"}
                onClick={() => setTab("services")}
              />
            ) : null}
            {can(PERMISSIONS.DOCUMENTS_VIEW) ? (
              <HealthTile
                label="Documents"
                value={snapshot.documents}
                hint="Issued and drafts"
                active={tab === "documents"}
                onClick={() => setTab("documents")}
              />
            ) : null}
            <HealthTile
              label="Next due"
              value={overdueCount ? overdueCount : nextDue ? formatDate(activityWhen(nextDue)) : "Clear"}
              hint={
                overdueCount
                  ? "Overdue items"
                  : nextDue
                    ? nextDue.title || "Scheduled work"
                    : "Nothing waiting"
              }
              tone={overdueCount ? "danger" : undefined}
              active={tab === "activity"}
              onClick={() => setTab("activity")}
            />
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === "overview" ? (
          <SupplierOverview
            lead={lead}
            activities={activities}
            onOpenTab={setTab}
            onLogActivity={setQuickAdd}
            onChanged={load}
          />
        ) : null}

        {tab === "catalog" ? (
          <SupplierProductsPanel
            supplierId={supplierId}
            canCreate={lead.verificationStatus === "verified"}
            blockedReason={
              lead.verificationStatus === "verified"
                ? null
                : "Verify this supplier before listing products to distributors."
            }
          />
        ) : null}

        {tab === "compliance" ? (
          <div className="space-y-4">
            <VerificationPanel leadId={supplierId} leadStage={lead.stage} />
            <div className="space-y-2">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardCheck className="h-4 w-4 text-muted" />
                  Onboarding record
                </h2>
                <p className="mt-1 text-xs text-muted">Intake history for this supplier. Day-to-day checks live above.</p>
              </div>
              <OnboardingPanel
                subjectType="lead"
                subjectId={supplierId}
                canStart={false}
                startAction={() => leadService.startOnboarding(supplierId)}
                onStarted={load}
              />
            </div>
          </div>
        ) : null}

        {tab === "services" ? <SupplierBillingPanel leadId={supplierId} /> : null}
        {tab === "documents" ? <SubjectDocumentsPanel subjectType="lead" subjectId={supplierId} /> : null}

        {tab === "activity" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              {canLogActivity ? (
                <Button size="sm" variant="outline" onClick={() => setQuickAdd("task")}>
                  <Plus className="h-3.5 w-3.5" />
                  New task
                </Button>
              ) : null}
            </div>
            <LeadProcessPanel
              type="task"
              leadId={supplierId}
              leadName={lead.name}
              contacts={lead.contacts || []}
              items={tasks}
              onChanged={load}
              hideForm
            />
            <LeadHistory
              leadId={supplierId}
              leadName={lead.name}
              contacts={lead.contacts || []}
              items={activities}
              filter={activityFilter}
              onFilter={setActivityFilter}
              onLog={(nextType) => setQuickAdd(nextType)}
              onChanged={load}
              canLog={canLogActivity}
            />
          </div>
        ) : null}
      </div>

      <ActivityQuickAddModal
        open={Boolean(quickAdd)}
        defaultType={quickAdd || "note"}
        leadId={supplierId}
        leadName={lead.name}
        contacts={lead.contacts || []}
        onClose={() => setQuickAdd(null)}
        onDone={() => load()}
      />
    </div>
  );
}
