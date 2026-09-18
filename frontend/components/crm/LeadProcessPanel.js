"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Calendar,
  CalendarClock,
  Check,
  ExternalLink,
  ListTodo,
  MapPin,
  PhoneCall,
  StickyNote,
  Trash2,
  Video,
} from "lucide-react";
import { activityService } from "@/services/crmService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import {
  ACTIVITY_TYPES,
  ACTIVITY_STATUSES,
  DUE_ACTIVITY_TYPES,
  TIMED_ACTIVITY_TYPES,
  labelFor,
  stageVariant,
  isActivityOpen,
  isActivityOverdue,
  activityWhen,
} from "@/constants/crm";
import { PERMISSIONS } from "@/constants/permissions";
import { cn, formatDateTime, formatTime, toDatetimeLocal } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

export const PROCESS_WORKSPACES = {
  note: {
    title: "Notes",
    description: "Internal observations from visits, samples, and capability checks.",
    addLabel: "Add note",
    emptyTitle: "No notes yet",
    emptyDescription: "Capture factory context so the next person on this lead is not starting from scratch.",
    icon: StickyNote,
    fields: ["title", "body"],
    defaultTitle: "Sourcing note",
  },
  call: {
    title: "Calls",
    description: "Log a completed call or schedule the next one with this manufacturer.",
    addLabel: "Save call",
    emptyTitle: "No calls yet",
    emptyDescription: "Log the first conversation or book a time to qualify this factory.",
    icon: PhoneCall,
    fields: ["mode", "contact", "title", "startsAt", "endsAt", "body"],
    defaultTitle: "Call",
    filters: true,
  },
  follow_up: {
    title: "Follow-ups",
    description: "Keep the sourcing conversation moving with dated reminders.",
    addLabel: "Schedule follow-up",
    emptyTitle: "No follow-ups scheduled",
    emptyDescription: "Set a date to chase samples, pricing, or a decision.",
    icon: CalendarClock,
    fields: ["contact", "title", "dueAt", "reminderAt", "body"],
    defaultTitle: "Follow up",
    filters: true,
    groups: true,
  },
  appointment: {
    title: "Appointments",
    description: "Factory visits and in-person meetings.",
    addLabel: "Book appointment",
    emptyTitle: "No appointments",
    emptyDescription: "Book a visit or showroom meeting with this manufacturer.",
    icon: Calendar,
    fields: ["contact", "title", "startsAt", "endsAt", "location", "reminderAt", "body"],
    defaultTitle: "Factory visit",
    filters: true,
  },
  meeting: {
    title: "Meetings",
    description: "Video or conference calls, with a join link when you have one.",
    addLabel: "Schedule meeting",
    emptyTitle: "No meetings",
    emptyDescription: "Schedule a video call to review capabilities, MOQ, or samples.",
    icon: Video,
    fields: ["contact", "title", "startsAt", "endsAt", "meetingUrl", "location", "reminderAt", "body"],
    defaultTitle: "Meeting",
    filters: true,
  },
  task: {
    title: "Tasks",
    description: "Work that must be finished before this manufacturer can move forward.",
    addLabel: "Add task",
    emptyTitle: "No tasks",
    emptyDescription: "Track sample requests, cert checks, and pricing follow-through.",
    icon: ListTodo,
    fields: ["title", "dueAt", "reminderAt", "body"],
    defaultTitle: "Task",
    filters: true,
    checklist: true,
  },
  status_change: {
    title: "Status changes",
    description: "Pipeline moves recorded against this manufacturer.",
    addLabel: "Status change",
    emptyTitle: "No status changes",
    emptyDescription: "Status moves appear here with any note captured at the time.",
    icon: ArrowRightLeft,
    fields: [],
  },
};

const emptyForm = {
  title: "",
  body: "",
  contactId: "",
  startsAt: "",
  endsAt: "",
  dueAt: "",
  reminderAt: "",
  location: "",
  meetingUrl: "",
  mode: "schedule",
};

function defaultWhen(type) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(0);
  if (type === "call") date.setHours(date.getHours() + 1);
  else date.setDate(date.getDate() + 1);
  if (![9, 10, 11, 14, 15].includes(date.getHours())) date.setHours(10);
  return toDatetimeLocal(date);
}

export function LeadProcessPanel({
  type,
  leadId,
  leadName,
  contacts = [],
  items = [],
  onChanged,
  hideForm = false,
  embedded = false,
}) {
  const { can } = useAuth();
  const toast = useToast();
  const workspace = PROCESS_WORKSPACES[type] || {
    title: "Activity",
    emptyTitle: "No activity yet",
    emptyDescription: "Log a note, call, follow-up, appointment, or meeting. Status changes are recorded automatically.",
    filters: true,
    fields: [],
    icon: StickyNote,
  };
  const mixed = !type;
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    startsAt: TIMED_ACTIVITY_TYPES.includes(type) ? defaultWhen(type) : "",
    dueAt: DUE_ACTIVITY_TYPES.includes(type) ? defaultWhen(type) : "",
  }));
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState(mixed || type === "note" ? "all" : "open");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (embedded) return items;
    if (!workspace.filters || filter === "all") return items;
    if (filter === "open") return items.filter(isActivityOpen);
    if (filter === "done") return items.filter((item) => item.status === "done");
    return items;
  }, [embedded, filter, items, workspace.filters]);

  const grouped = useMemo(() => {
    if (embedded || !workspace.groups || filter === "done") return null;
    return {
      overdue: filtered.filter(isActivityOverdue),
      upcoming: filtered.filter((item) => isActivityOpen(item) && !isActivityOverdue(item)),
      closed: filtered.filter((item) => !isActivityOpen(item)),
    };
  }, [embedded, filter, filtered, workspace.groups]);

  function renderItem(item) {
    return (
      <ActivityCard
        key={item.id}
        item={item}
        workspace={PROCESS_WORKSPACES[item.type] || workspace}
        showType={mixed}
        canUpdate={can(PERMISSIONS.ACTIVITIES_UPDATE) && item.type !== "status_change"}
        canDelete={can(PERMISSIONS.ACTIVITIES_DELETE) && item.type !== "status_change"}
        onStatus={setStatus}
        onDelete={setPendingDelete}
      />
    );
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const logNow = type === "call" && form.mode === "log";
      const startsAt = logNow ? toDatetimeLocal(new Date()) : form.startsAt;
      await activityService.create({
        type,
        title: form.title.trim() || `${workspace.defaultTitle}${leadName ? ` · ${leadName}` : ""}`,
        body: form.body,
        leadId,
        contactId: form.contactId || null,
        startsAt: TIMED_ACTIVITY_TYPES.includes(type) ? startsAt : undefined,
        endsAt: TIMED_ACTIVITY_TYPES.includes(type) ? form.endsAt || undefined : undefined,
        dueAt: DUE_ACTIVITY_TYPES.includes(type) ? form.dueAt : undefined,
        reminderAt: form.reminderAt || undefined,
        location: form.location,
        meetingUrl: form.meetingUrl,
        status: type === "note" || logNow ? "done" : "scheduled",
      });
      setForm({
        ...emptyForm,
        startsAt: TIMED_ACTIVITY_TYPES.includes(type) ? defaultWhen(type) : "",
        dueAt: DUE_ACTIVITY_TYPES.includes(type) ? defaultWhen(type) : "",
      });
      toast.success(`${workspace.title.slice(0, -1)} saved`);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(activity, status) {
    try {
      await activityService.update(activity.id, { status });
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not update");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await activityService.remove(pendingDelete.id);
      toast.success("Removed");
      setPendingDelete(null);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  const Icon = workspace.icon;
  const showComposer = !hideForm && !mixed && can(PERMISSIONS.ACTIVITIES_CREATE);

  return (
    <div className="space-y-4">
      {showComposer ? (
        <Card>
          <CardHeader className="flex items-start gap-3">
            <span className="rounded-md bg-primary/10 p-2 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold">{workspace.title}</h2>
              <p className="mt-1 text-sm text-muted">{workspace.description}</p>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
              {workspace.fields.includes("mode") ? (
                <div className="md:col-span-2 inline-flex w-fit rounded-md border border-border p-0.5">
                  {[
                    { value: "schedule", label: "Schedule" },
                    { value: "log", label: "Log completed" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setField("mode", option.value)}
                      className={cn(
                        "rounded-sm px-3 py-1.5 text-sm font-medium",
                        form.mode === option.value ? "bg-primary text-white" : "text-muted hover:text-text"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {workspace.fields.includes("contact") ? (
                <Select label="Contact" value={form.contactId} onChange={(event) => setField("contactId", event.target.value)}>
                  <option value="">Manufacturer (no specific person)</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.role ? ` · ${contact.role}` : ""}
                    </option>
                  ))}
                </Select>
              ) : null}
              {workspace.fields.includes("title") ? (
                <Input
                  label="Title"
                  value={form.title}
                  placeholder={workspace.defaultTitle}
                  onChange={(event) => setField("title", event.target.value)}
                />
              ) : null}
              {workspace.fields.includes("startsAt") && form.mode !== "log" ? (
                <Input
                  label="Starts"
                  type="datetime-local"
                  required
                  value={form.startsAt}
                  onChange={(event) => setField("startsAt", event.target.value)}
                />
              ) : null}
              {workspace.fields.includes("endsAt") && form.mode !== "log" ? (
                <Input label="Ends" type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
              ) : null}
              {workspace.fields.includes("dueAt") ? (
                <Input
                  label="Due"
                  type="datetime-local"
                  required
                  value={form.dueAt}
                  onChange={(event) => setField("dueAt", event.target.value)}
                />
              ) : null}
              {workspace.fields.includes("location") ? (
                <Input
                  label="Location"
                  placeholder="Factory, showroom, or address"
                  value={form.location}
                  onChange={(event) => setField("location", event.target.value)}
                />
              ) : null}
              {workspace.fields.includes("meetingUrl") ? (
                <Input
                  label="Meeting URL"
                  placeholder="https://"
                  value={form.meetingUrl}
                  onChange={(event) => setField("meetingUrl", event.target.value)}
                />
              ) : null}
              {workspace.fields.includes("reminderAt") ? (
                <Input
                  label="Reminder"
                  type="datetime-local"
                  value={form.reminderAt}
                  onChange={(event) => setField("reminderAt", event.target.value)}
                />
              ) : null}
              {workspace.fields.includes("body") ? (
                <div className={workspace.fields.includes("title") ? "md:col-span-2" : "md:col-span-2"}>
                  <Textarea
                    label={type === "note" ? "Note" : "Details"}
                    required={type === "note"}
                    value={form.body}
                    onChange={(event) => setField("body", event.target.value)}
                  />
                </div>
              ) : null}
              <div className="md:col-span-2">
                <Button type="submit" loading={loading} size="sm">
                  {form.mode === "log" ? "Log call" : workspace.addLabel}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {embedded ? (
        <div className="space-y-3">{filtered.map((item) => renderItem(item))}</div>
      ) : (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">{items.length ? `${items.length} recorded` : workspace.title}</h3>
            {workspace.filters ? (
              <div className="inline-flex rounded-md border border-border p-0.5">
                {[
                  { value: "open", label: "Open" },
                  { value: "done", label: "Done" },
                  { value: "all", label: "All" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs font-medium",
                      filter === option.value ? "bg-primary text-white" : "text-muted hover:text-text"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardBody className="space-y-5">
            {filtered.length === 0 ? (
              <EmptyState className="px-2 py-8" title={workspace.emptyTitle} description={workspace.emptyDescription} />
            ) : grouped ? (
              <>
                <ActivitySection title="Overdue" items={grouped.overdue} empty="Nothing overdue." tone="danger" renderItem={renderItem} />
                <ActivitySection title="Upcoming" items={grouped.upcoming} empty="No upcoming follow-ups." renderItem={renderItem} />
                {filter !== "open" ? (
                  <ActivitySection title="Closed" items={grouped.closed} empty="No closed follow-ups." renderItem={renderItem} />
                ) : null}
              </>
            ) : (
              <div className="space-y-3">{filtered.map((item) => renderItem(item))}</div>
            )}
          </CardBody>
        </Card>
      )}

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${labelFor(ACTIVITY_TYPES, pendingDelete?.type || type).toLowerCase()}?`}
        description="This removes it from the lead process. It cannot be undone from the UI."
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ActivitySection({ title, items, empty, tone, renderItem }) {
  return (
    <section>
      <h4 className={cn("mb-2 text-xs font-semibold uppercase tracking-wide", tone === "danger" ? "text-danger" : "text-muted")}>
        {title}
        {items.length ? ` · ${items.length}` : ""}
      </h4>
      {items.length === 0 ? <p className="text-sm text-muted">{empty}</p> : <div className="space-y-3">{items.map(renderItem)}</div>}
    </section>
  );
}

function ActivityCard({ item, workspace, showType, canUpdate, canDelete, onStatus, onDelete }) {
  const overdue = isActivityOverdue(item);
  const open = isActivityOpen(item);
  const Icon = PROCESS_WORKSPACES[item.type]?.icon || workspace.icon;

  return (
    <div className={cn("rounded-md border px-3 py-3", overdue ? "border-danger/40 bg-danger/5" : "border-border")}>
      <div className="flex items-start gap-3">
        {workspace.checklist && canUpdate ? (
          <button
            type="button"
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
              item.status === "done" ? "border-success bg-success text-white" : "border-border"
            )}
            aria-label={item.status === "done" ? "Reopen task" : "Complete task"}
            onClick={() => onStatus(item, item.status === "done" ? "scheduled" : "done")}
          >
            {item.status === "done" ? <Check className="h-3 w-3" /> : null}
          </button>
        ) : Icon ? (
          <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {showType ? <Badge>{labelFor(ACTIVITY_TYPES, item.type)}</Badge> : null}
            <p className={cn("text-sm font-medium", item.status === "done" && workspace.checklist && "text-muted line-through")}>
              {item.title || labelFor(ACTIVITY_TYPES, item.type)}
            </p>
            {item.type !== "status_change" ? (
              <Badge variant={overdue ? "danger" : stageVariant(item.status)}>
                {overdue ? "Overdue" : labelFor(ACTIVITY_STATUSES, item.status)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {item.contact?.name ? `${item.contact.name} · ` : ""}
            {item.startsAt && item.endsAt
              ? `${formatDateTime(item.startsAt)} – ${formatTime(item.endsAt)}`
              : formatDateTime(activityWhen(item))}
            {item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ""}
          </p>
          {item.location ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
              <MapPin className="h-3 w-3" />
              {item.location}
            </p>
          ) : null}
          {item.reminderAt ? (
            <p className="mt-1 text-xs text-muted">Reminder {formatDateTime(item.reminderAt)}</p>
          ) : null}
          {item.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{item.body}</p> : null}
          {item.meetingUrl ? (
            <a
              href={item.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Join meeting
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          {open && canUpdate ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onStatus(item, "done")}>
                Mark done
              </Button>
              {TIMED_ACTIVITY_TYPES.includes(item.type) ? (
                <Button size="sm" variant="ghost" onClick={() => onStatus(item, "no_show")}>
                  No-show
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => onStatus(item, "cancelled")}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
        {canDelete ? (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted hover:text-danger"
            aria-label="Delete"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
