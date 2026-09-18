"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { activityService, leadService } from "@/services/crmService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Avatar } from "@/components/ui/Avatar";
import { OwnerSelect } from "./OwnerSelect";
import { PROCESS_WORKSPACES } from "./LeadProcessPanel";
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
import { cn, formatDateTime, toDatetimeLocal } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

function defaultWhen(type) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(0);
  date.setDate(date.getDate() + 1);
  if (![9, 10, 11, 14, 15].includes(date.getHours())) date.setHours(10);
  return toDatetimeLocal(date);
}

const emptyForm = {
  leadId: "",
  contactId: "",
  assignedToId: "",
  title: "",
  body: "",
  startsAt: "",
  endsAt: "",
  dueAt: "",
  reminderAt: "",
  location: "",
  meetingUrl: "",
};

export function ActivityWorkspace({ type, title, description, showReminders = false }) {
  const { user, can } = useAuth();
  const toast = useToast();
  const workspace = PROCESS_WORKSPACES[type];
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 20 });
  const [status, setStatus] = useState("scheduled");
  const [assigneeId, setAssigneeId] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const sort = TIMED_ACTIVITY_TYPES.includes(type) ? "startsAt" : "dueAt";

  async function load() {
    const response = await activityService.list({
      type,
      status: status === "all" ? "" : status,
      assignedToId: assigneeId || undefined,
      search: debounced,
      sort,
      page,
      limit,
    });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load records"));
  }, [type, status, assigneeId, debounced, page, limit]);

  useEffect(() => {
    leadService
      .list({ limit: 100, sort: "name" })
      .then((response) => setLeads(response.data.items || []))
      .catch(() => setLeads([]));
  }, []);

  useEffect(() => {
    if (!form.leadId) {
      setContacts([]);
      return;
    }
    leadService
      .get(form.leadId)
      .then((response) => setContacts(response.data.lead?.contacts || []))
      .catch(() => setContacts([]));
  }, [form.leadId]);

  function openCreate() {
    setForm({
      ...emptyForm,
      assignedToId: user?.id || "",
      startsAt: TIMED_ACTIVITY_TYPES.includes(type) ? defaultWhen(type) : "",
      dueAt: DUE_ACTIVITY_TYPES.includes(type) ? defaultWhen(type) : "",
    });
    setFormOpen(true);
  }

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value, ...(key === "leadId" ? { contactId: "" } : {}) }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await activityService.create({
        type,
        title: form.title.trim() || workspace.defaultTitle,
        body: form.body,
        leadId: form.leadId,
        contactId: form.contactId || null,
        assignedToId: form.assignedToId || null,
        startsAt: TIMED_ACTIVITY_TYPES.includes(type) ? form.startsAt : undefined,
        endsAt: TIMED_ACTIVITY_TYPES.includes(type) ? form.endsAt || undefined : undefined,
        dueAt: DUE_ACTIVITY_TYPES.includes(type) ? form.dueAt : undefined,
        reminderAt: form.reminderAt || undefined,
        location: form.location,
        meetingUrl: form.meetingUrl,
      });
      toast.success("Saved");
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function setActivityStatus(item, nextStatus) {
    try {
      await activityService.update(item.id, { status: nextStatus });
      await load();
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
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    workspace.checklist
      ? {
          key: "done",
          label: "",
          render: (row) =>
            can(PERMISSIONS.ACTIVITIES_UPDATE) ? (
              <button
                type="button"
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded border",
                  row.status === "done" ? "border-success bg-success text-white" : "border-border"
                )}
                aria-label={row.status === "done" ? "Reopen task" : "Complete task"}
                onClick={() => setActivityStatus(row, row.status === "done" ? "scheduled" : "done")}
              >
                {row.status === "done" ? <Check className="h-3 w-3" /> : null}
              </button>
            ) : null,
        }
      : null,
    {
      key: "title",
      label: workspace.title.slice(0, -1),
      render: (row) => (
        <div>
          <p className={cn("font-medium", row.status === "done" && workspace.checklist && "text-muted line-through")}>
            {row.title || labelFor(ACTIVITY_TYPES, row.type)}
          </p>
          {row.body ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{row.body}</p> : null}
        </div>
      ),
    },
    {
      key: "lead",
      label: "Manufacturer",
      render: (row) =>
        row.lead?.id ? (
          <Link href={`/leads/${row.lead.id}`} className="text-primary hover:underline">
            {row.lead.name}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      key: "when",
      label: TIMED_ACTIVITY_TYPES.includes(type) ? "Starts" : "Due",
      render: (row) => (
        <span className={isActivityOverdue(row) ? "text-danger" : "text-muted"}>{formatDateTime(activityWhen(row))}</span>
      ),
    },
    type === "appointment"
      ? { key: "location", label: "Location", render: (row) => row.location || "—" }
      : null,
    type === "meeting"
      ? {
          key: "meetingUrl",
          label: "Link",
          render: (row) =>
            row.meetingUrl ? (
              <a href={row.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                Join
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              "—"
            ),
        }
      : null,
    type === "follow_up"
      ? { key: "reminderAt", label: "Reminder", render: (row) => (row.reminderAt ? formatDateTime(row.reminderAt) : "—") }
      : null,
    {
      key: "assignee",
      label: "Assignee",
      render: (row) =>
        row.assignedTo ? (
          <span className="inline-flex items-center gap-2" title={row.assignedTo.name}>
            <Avatar name={row.assignedTo.name} src={row.assignedTo.avatarUrl} size={28} />
            <span>{row.assignedTo.name}</span>
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant={isActivityOverdue(row) ? "danger" : stageVariant(row.status)}>
          {isActivityOverdue(row) ? "Overdue" : labelFor(ACTIVITY_STATUSES, row.status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {can(PERMISSIONS.ACTIVITIES_UPDATE) && isActivityOpen(row) ? (
            <Button size="sm" variant="outline" onClick={() => setActivityStatus(row, "done")}>
              Done
            </Button>
          ) : null}
          {can(PERMISSIONS.ACTIVITIES_DELETE) ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted hover:text-danger"
              aria-label="Delete"
              onClick={() => setPendingDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">{description}</p>
        </div>
        {can(PERMISSIONS.ACTIVITIES_CREATE) ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {workspace.addLabel}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          label="Search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="scheduled">Open</option>
          <option value="done">Done</option>
          <option value="all">All</option>
        </Select>
        <OwnerSelect
          label="Assignee"
          emptyLabel="Everyone"
          value={assigneeId}
          onChange={(event) => {
            setAssigneeId(event.target.value);
            setPage(1);
          }}
        />
        <p className="self-end pb-2 text-xs text-muted">
          {can(PERMISSIONS.ACTIVITIES_VIEW)
            ? "Your role can see the full team queue, not only records assigned to you."
            : null}
        </p>
      </div>

      <Card>
        <Table empty={workspace.emptyTitle} columns={columns} rows={data.items} />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>

      {showReminders ? <RemindersPanel /> : null}

      <Modal open={formOpen} title={workspace.addLabel} onClose={() => setFormOpen(false)} className="max-w-2xl">
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <Select label="Manufacturer" required value={form.leadId} onChange={(event) => setField("leadId", event.target.value)}>
            <option value="">Select manufacturer</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
              </option>
            ))}
          </Select>
          <Select label="Contact" value={form.contactId} onChange={(event) => setField("contactId", event.target.value)}>
            <option value="">Manufacturer (no specific person)</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.role ? ` · ${contact.role}` : ""}
              </option>
            ))}
          </Select>
          <Input
            label="Title"
            value={form.title}
            placeholder={workspace.defaultTitle}
            onChange={(event) => setField("title", event.target.value)}
          />
          <OwnerSelect
            label="Assignee"
            allowEmpty
            value={form.assignedToId}
            onChange={(event) => setField("assignedToId", event.target.value)}
          />
          {workspace.fields.includes("startsAt") ? (
            <Input
              label="Starts"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(event) => setField("startsAt", event.target.value)}
            />
          ) : null}
          {workspace.fields.includes("endsAt") ? (
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
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
            />
          ) : null}
          {workspace.fields.includes("meetingUrl") ? (
            <Input
              label="Meeting URL"
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
          <div className="md:col-span-2">
            <Textarea label="Details" value={form.body} onChange={(event) => setField("body", event.target.value)} />
          </div>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${labelFor(ACTIVITY_TYPES, type).toLowerCase()}?`}
        description="This removes it from the team queue. It cannot be undone from the UI."
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function RemindersPanel() {
  const toast = useToast();
  const [items, setItems] = useState([]);

  useEffect(() => {
    activityService
      .list({ hasReminder: true, sort: "reminderAt", limit: 50 })
      .then((response) => setItems(response.data.items || []))
      .catch(() => toast.error("Unable to load reminders"));
  }, []);

  const upcoming = items.filter((item) => item.reminderAt && new Date(item.reminderAt) >= new Date() && isActivityOpen(item));
  const overdue = items.filter((item) => item.reminderAt && new Date(item.reminderAt) < new Date() && isActivityOpen(item));

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Reminders</h2>
        <p className="mt-1 text-sm text-muted">Upcoming and overdue reminders across appointments, meetings, tasks, and follow-ups.</p>
      </CardHeader>
      <Table
        empty="No reminders set"
        columns={[
          {
            key: "type",
            label: "Type",
            render: (row) => <Badge>{labelFor(ACTIVITY_TYPES, row.type)}</Badge>,
          },
          {
            key: "title",
            label: "Reminder",
            render: (row) => (
              <div>
                <p className="font-medium">{row.title || labelFor(ACTIVITY_TYPES, row.type)}</p>
                {row.lead?.name ? (
                  <Link href={`/leads/${row.lead.id}`} className="text-xs text-primary hover:underline">
                    {row.lead.name}
                  </Link>
                ) : null}
              </div>
            ),
          },
          {
            key: "when",
            label: "Remind at",
            render: (row) => (
              <span className={new Date(row.reminderAt) < new Date() && isActivityOpen(row) ? "text-danger" : "text-muted"}>
                {formatDateTime(row.reminderAt)}
              </span>
            ),
          },
          {
            key: "assignee",
            label: "Assignee",
            render: (row) => row.assignedTo?.name || "Unassigned",
          },
        ]}
        rows={[...overdue, ...upcoming]}
      />
    </Card>
  );
}
