"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  CalendarClock,
  CheckSquare,
  ExternalLink,
  MapPin,
  PhoneCall,
  StickyNote,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ACTIVITY_TYPES,
  labelFor,
  isActivityOpen,
  isActivityOverdue,
  activityWhen,
} from "@/constants/crm";
import { formatDateTime } from "@/lib/utils";

const TYPE_ICON = {
  call: PhoneCall,
  follow_up: CalendarClock,
  appointment: Calendar,
  meeting: Video,
  task: CheckSquare,
  note: StickyNote,
  status_change: ArrowRightLeft,
};

function detailLine(item) {
  const parts = [];
  if (item.contact?.name) parts.push(item.contact.name);
  if (item.location) parts.push(item.location);
  if (item.reminderAt) parts.push(`Reminder ${formatDateTime(item.reminderAt)}`);
  parts.push(formatDateTime(activityWhen(item)));
  return parts.join(" · ");
}

export function LeadOverview({ lead, activities, onOpenTab, onLogActivity }) {
  const contacts = lead.contacts || [];
  const primary = contacts.find((contact) => contact.isPrimary) || contacts[0];
  const openItems = activities.filter(isActivityOpen);
  const overdue = openItems.filter(isActivityOverdue);
  const upcoming = openItems
    .filter((item) => !isActivityOverdue(item))
    .sort((a, b) => new Date(activityWhen(a)) - new Date(activityWhen(b)));
  const nextEvent = upcoming.find((item) => ["meeting", "appointment", "call"].includes(item.type)) || upcoming[0];
  const lastCall = activities.find((item) => item.type === "call");
  const lastTouch = activities[0];
  const openTasks = activities.filter((item) => item.type === "task" && isActivityOpen(item)).length;
  const openFollowUps = activities.filter((item) => item.type === "follow_up" && isActivityOpen(item)).length;
  const mix = ACTIVITY_TYPES.map((item) => ({
    ...item,
    count: activities.filter((activity) => activity.type === item.value).length,
  })).filter((item) => item.count);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Open work"
          value={openTasks + openFollowUps}
          hint={`${openTasks} task${openTasks === 1 ? "" : "s"} · ${openFollowUps} follow-up${openFollowUps === 1 ? "" : "s"}`}
        />
        <Metric
          label="Overdue"
          value={overdue.length}
          hint={overdue.length ? "Needs attention before the next stage" : "Nothing overdue"}
          tone={overdue.length ? "danger" : undefined}
        />
        <Metric
          label="Next event"
          value={nextEvent ? labelFor(ACTIVITY_TYPES, nextEvent.type) : "—"}
          hint={nextEvent ? formatDateTime(activityWhen(nextEvent)) : "Nothing scheduled"}
        />
        <Metric
          label="Last touch"
          value={lastTouch ? labelFor(ACTIVITY_TYPES, lastTouch.type) : "—"}
          hint={lastTouch ? formatDateTime(activityWhen(lastTouch)) : "No process activity yet"}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Sourcing insight</h2>
          <p className="mt-1 text-sm text-muted">Coverage on this manufacturer before you push the stage.</p>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Insight
            ok={contacts.length > 0}
            label="Decision contact"
            value={primary ? `${primary.name}${primary.role ? ` · ${primary.role}` : ""}` : "No contact on file"}
            action={contacts.length ? undefined : () => onOpenTab("contacts")}
            actionLabel="Add contact"
          />
          <Insight
            ok={Boolean(lastCall)}
            label="Last call"
            value={lastCall ? formatDateTime(activityWhen(lastCall)) : "No call logged"}
            action={lastCall ? undefined : () => onLogActivity?.("call")}
            actionLabel="Log call"
          />
          <Insight
            ok={openFollowUps > 0 || ["converted", "won"].includes(lead.stage)}
            label="Follow-up queued"
            value={openFollowUps ? `${openFollowUps} open` : "None scheduled"}
            action={openFollowUps ? undefined : () => onLogActivity?.("follow_up")}
            actionLabel="Schedule"
          />
          <Insight
            ok={Boolean(lead.products)}
            label="Capability notes"
            value={lead.products || "Products / capabilities not filled in"}
          />
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Next actions</h2>
              <p className="mt-1 text-sm text-muted">Open work for this manufacturer.</p>
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
            {overdue.length === 0 && upcoming.length === 0 ? (
              <EmptyState
                className="px-2 py-8"
                title="Pipeline is clear"
                description="Schedule a call, follow-up, or visit to keep this manufacturer moving."
                actionLabel="Log activity"
                onAction={() => onLogActivity?.("follow_up")}
              />
            ) : null}
            {[...overdue, ...upcoming].slice(0, 6).map((item) => {
              const Icon = TYPE_ICON[item.type] || CalendarClock;
              const overdueItem = isActivityOverdue(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenTab(item.type)}
                  className="flex w-full items-start gap-3 rounded-md border border-border px-3 py-2.5 text-left transition hover:border-primary/40 hover:bg-bg"
                >
                  <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.title || labelFor(ACTIVITY_TYPES, item.type)}</span>
                      {overdueItem ? <Badge variant="danger">Overdue</Badge> : <Badge>{labelFor(ACTIVITY_TYPES, item.type)}</Badge>}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{detailLine(item)}</span>
                    {item.location ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </span>
                    ) : null}
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
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Primary contact</h2>
              <p className="mt-1 text-sm text-muted">Person to reach at this factory.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpenTab("contacts")}>
              <Users className="h-4 w-4" />
              Manage
            </Button>
          </CardHeader>
          <CardBody>
            {primary ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{primary.name}</p>
                {primary.role ? <p className="text-muted">{primary.role}</p> : null}
                {primary.email ? (
                  <a className="block text-primary hover:underline" href={`mailto:${primary.email}`}>
                    {primary.email}
                  </a>
                ) : null}
                {primary.phone ? (
                  <a className="block text-primary hover:underline" href={`tel:${primary.phone}`}>
                    {primary.phone}
                  </a>
                ) : null}
                {contacts.length > 1 ? (
                  <p className="pt-1 text-xs text-muted">
                    +{contacts.length - 1} more contact{contacts.length === 2 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState
                className="px-2 py-8"
                title="No contacts yet"
                description="Add a merchandiser, owner, or export manager before the first call."
                actionLabel="Add contact"
                onAction={() => onOpenTab("contacts")}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Recent activity</h2>
            <p className="mt-1 text-sm text-muted">Latest notes, calls, visits, and scheduled work.</p>
          </div>
          {mix.length ? (
            <div className="flex flex-wrap gap-1.5">
              {mix.map((item) => (
                <Badge key={item.value}>
                  {item.label} {item.count}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardBody className="space-y-2">
          {activities.length === 0 ? (
            <EmptyState
              className="px-2 py-8"
              title="Nothing logged yet"
              description="Use Log activity to capture a note, call, meeting, visit, follow-up, or task."
              actionLabel="Log activity"
              onAction={() => onLogActivity?.("note")}
            />
          ) : null}
          {activities.slice(0, 8).map((item) => {
            const Icon = TYPE_ICON[item.type] || StickyNote;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenTab(item.type)}
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
                  <span className="mt-1 block text-xs text-muted">{detailLine(item)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(activityWhen(item))}</span>
              </button>
            );
          })}
        </CardBody>
      </Card>

      {lead.notes ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Manufacturer notes</h2>
          </CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-6">{lead.notes}</p>
            <Link href={`/leads/${lead.id}/edit`} className="mt-3 inline-block text-sm text-primary hover:underline">
              Edit profile notes
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value, hint, tone }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={`mt-1 font-display text-2xl font-semibold ${tone === "danger" ? "text-danger" : ""}`}>{value}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </CardBody>
    </Card>
  );
}

function Insight({ ok, label, value, action, actionLabel }) {
  return (
    <div className="rounded-md border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <Badge variant={ok ? "success" : "warning"}>{ok ? "Ready" : "Gap"}</Badge>
      </div>
      <p className="mt-1 text-sm">{value}</p>
      {action ? (
        <button type="button" className="mt-2 text-xs font-medium text-primary hover:underline" onClick={action}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
