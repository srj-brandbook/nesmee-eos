"use client";

import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  CheckSquare,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  StickyNote,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContactPanel } from "./ContactPanel";
import {
  ACTIVITY_TYPES,
  labelFor,
  isActivityOpen,
  isActivityOverdue,
  activityWhen,
  websiteHref,
} from "@/constants/crm";
import { formatDateTime } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";

const TYPE_ICON = {
  call: PhoneCall,
  follow_up: CalendarClock,
  appointment: Calendar,
  meeting: Video,
  task: CheckSquare,
  note: StickyNote,
};

function detailLine(item) {
  const parts = [];
  if (item.contact?.name) parts.push(item.contact.name);
  if (item.location) parts.push(item.location);
  parts.push(formatDateTime(activityWhen(item)));
  return parts.join(" · ");
}

function Fact({ label, value, href, external, span }) {
  if (!value) return null;
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      {href ? (
        <a
          href={href}
          className="mt-0.5 inline-flex items-center gap-1.5 break-all text-sm text-primary hover:underline"
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {value}
        </a>
      ) : (
        <p className="mt-0.5 whitespace-pre-wrap text-sm">{value}</p>
      )}
    </div>
  );
}

export function SupplierOverview({ lead, activities, onOpenTab, onLogActivity, onChanged }) {
  const openItems = activities.filter(isActivityOpen);
  const overdue = openItems.filter(isActivityOverdue);
  const upcoming = openItems
    .filter((item) => !isActivityOverdue(item))
    .sort((a, b) => new Date(activityWhen(a)) - new Date(activityWhen(b)));
  const queue = [...overdue, ...upcoming].slice(0, 6);
  const recent = activities.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Company profile</h2>
            <p className="mt-1 text-sm text-muted">What this factory makes, certifies, and ships.</p>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Fact label="Legal name" value={lead.legalName} />
            <Fact label="Location" value={[lead.city, lead.country].filter(Boolean).join(", ")} />
            <Fact label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : ""} />
            <Fact label="Phone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : ""} />
            <Fact label="Website" value={lead.website} href={lead.website ? websiteHref(lead.website) : ""} external span />
            <Fact label="Products / capabilities" value={lead.products} span />
            <Fact label="Certifications" value={lead.certifications} />
            <Fact label="MOQ" value={lead.moq} />
            <Fact label="Export markets" value={lead.exportMarkets} span />
            <Fact label="GSTIN" value={lead.gstin} />
            <Fact label="Billing state" value={lead.billingState} />
            <Fact label="Billing address" value={lead.billingAddress} span />
            {!lead.legalName &&
            !lead.email &&
            !lead.phone &&
            !lead.website &&
            !lead.products &&
            !lead.certifications &&
            !lead.moq &&
            !lead.exportMarkets ? (
              <p className="sm:col-span-2 text-sm text-muted">
                Profile fields are empty.{" "}
                <Link href={`${ROUTES.leads}/${lead.id}/edit`} className="text-primary hover:underline">
                  Add company details
                </Link>
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Next work</h2>
              <p className="mt-1 text-sm text-muted">Open tasks, visits, and follow-ups for this supplier.</p>
            </div>
            {overdue.length ? (
              <Badge variant="danger">
                <span className="inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {overdue.length} overdue
                </span>
              </Badge>
            ) : null}
          </CardHeader>
          <CardBody className="space-y-2">
            {queue.length === 0 ? (
              <EmptyState
                className="px-2 py-8"
                title="Nothing waiting"
                description="Log a follow-up or task when you need to chase samples, certs, or pricing."
                actionLabel="Log follow-up"
                onAction={() => onLogActivity?.("follow_up")}
              />
            ) : (
              queue.map((item) => {
                const Icon = TYPE_ICON[item.type] || CalendarClock;
                const overdueItem = isActivityOverdue(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenTab("activity")}
                    className="flex w-full items-start gap-3 rounded-md border border-border px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-bg"
                  >
                    <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{item.title || labelFor(ACTIVITY_TYPES, item.type)}</span>
                        {overdueItem ? (
                          <Badge variant="danger">Overdue</Badge>
                        ) : (
                          <Badge>{labelFor(ACTIVITY_TYPES, item.type)}</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{detailLine(item)}</span>
                      {item.meetingUrl ? (
                        <a
                          href={item.meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Join meeting
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
            {queue.length ? (
              <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => onOpenTab("activity")}>
                View all activity
              </button>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <ContactPanel
        leadId={lead.id}
        contacts={lead.contacts || []}
        onChanged={onChanged}
        title="People"
        description="Who to call at this factory for samples, certificates, or orders."
      />

      {lead.notes ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Notes</h2>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-6">{lead.notes}</p>
            <Link href={`${ROUTES.leads}/${lead.id}/edit`} className="mt-3 inline-block text-sm text-primary hover:underline">
              Edit notes
            </Link>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-muted">Latest notes, calls, and scheduled work.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenTab("activity")}>
            Open activity
          </Button>
        </CardHeader>
        <CardBody className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Nothing logged against this supplier yet.</p>
          ) : (
            recent.map((item) => {
              const Icon = TYPE_ICON[item.type] || StickyNote;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenTab("activity")}
                  className="flex w-full items-start gap-3 rounded-md border border-border px-3 py-2 text-left hover:bg-bg"
                >
                  <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.status === "done" ? "success" : isActivityOverdue(item) ? "danger" : "default"}>
                        {labelFor(ACTIVITY_TYPES, item.type)}
                      </Badge>
                      <span className="text-sm font-medium">{item.title || labelFor(ACTIVITY_TYPES, item.type)}</span>
                    </span>
                    {item.body ? <span className="mt-1 block line-clamp-2 text-sm text-muted">{item.body}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{formatDateTime(activityWhen(item))}</span>
                </button>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export function ProfileIconRow({ lead }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
      {lead.legalName ? <span>{lead.legalName}</span> : null}
      {[lead.city, lead.country].filter(Boolean).length ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {[lead.city, lead.country].filter(Boolean).join(", ")}
        </span>
      ) : null}
      {lead.email ? (
        <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 hover:text-primary">
          <Mail className="h-3.5 w-3.5" />
          {lead.email}
        </a>
      ) : null}
      {lead.phone ? (
        <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
          <Phone className="h-3.5 w-3.5" />
          {lead.phone}
        </a>
      ) : null}
      {lead.website ? (
        <a href={websiteHref(lead.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
          <Globe className="h-3.5 w-3.5" />
          Website
        </a>
      ) : null}
    </p>
  );
}
