"use client";

import { useEffect, useState } from "react";
import { activityService } from "@/services/crmService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { ACTIVITY_TYPES, LOG_ACTIVITY_TYPES, labelFor, stageVariant } from "@/constants/crm";
import { PERMISSIONS } from "@/constants/permissions";
import { formatDateTime } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

const emptyForm = {
  type: "note",
  title: "",
  body: "",
  contactId: "",
  startsAt: "",
  endsAt: "",
  dueAt: "",
  reminderAt: "",
  location: "",
  meetingUrl: "",
};

export function ActivityTimeline({ leadId, contacts = [] }) {
  const { can } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await activityService.list({ leadId, sort: "-createdAt", limit: 50 });
    setItems(response.data.items);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load activities"));
  }, [leadId]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await activityService.create({
        ...form,
        leadId,
        contactId: form.contactId || null,
      });
      setForm({ ...emptyForm, type: form.type, contactId: form.contactId });
      toast.success("Activity added");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save activity");
    } finally {
      setLoading(false);
    }
  }

  async function markDone(activity) {
    await activityService.update(activity.id, { status: "done" });
    load();
  }

  const timed = ["appointment", "meeting", "call"].includes(form.type);
  const due = ["follow_up", "task"].includes(form.type);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold">Lead process</h2>
        <p className="mt-1 text-sm text-muted">Calls, follow-ups, appointments, and notes for this manufacturer.</p>
      </CardHeader>
      <CardBody className="space-y-5">
        {can(PERMISSIONS.ACTIVITIES_CREATE) ? (
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Select label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              {LOG_ACTIVITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <Select
              label="Contact"
              value={form.contactId}
              onChange={(event) => setForm({ ...form, contactId: event.target.value })}
            >
              <option value="">Manufacturer (no specific contact)</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                  {contact.role ? ` · ${contact.role}` : ""}
                </option>
              ))}
            </Select>
            <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <div className="md:col-span-2">
              <Textarea label="Details" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
            </div>
            {timed ? (
              <>
                <Input
                  label="Starts"
                  type="datetime-local"
                  value={form.startsAt}
                  required
                  onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                />
                <Input
                  label="Ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                />
                <Input label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
                <Input
                  label="Meeting URL"
                  value={form.meetingUrl}
                  onChange={(event) => setForm({ ...form, meetingUrl: event.target.value })}
                />
              </>
            ) : null}
            {due ? (
              <Input
                label="Due"
                type="datetime-local"
                value={form.dueAt}
                required
                onChange={(event) => setForm({ ...form, dueAt: event.target.value })}
              />
            ) : null}
            {timed || due ? (
              <Input
                label="Reminder"
                type="datetime-local"
                value={form.reminderAt}
                onChange={(event) => setForm({ ...form, reminderAt: event.target.value })}
              />
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" loading={loading} size="sm">
                Add {labelFor(ACTIVITY_TYPES, form.type).toLowerCase()}
              </Button>
            </div>
          </form>
        ) : null}
        <div className="space-y-3">
          {items.length === 0 ? <p className="text-sm text-muted">No process activity yet.</p> : null}
          {items.map((activity) => (
            <div key={activity.id} className="rounded-md border border-border px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={stageVariant(activity.status)}>{labelFor(ACTIVITY_TYPES, activity.type)}</Badge>
                  <span className="text-sm font-medium">{activity.title || labelFor(ACTIVITY_TYPES, activity.type)}</span>
                </div>
                <span className="text-xs text-muted">{formatDateTime(activity.startsAt || activity.dueAt || activity.createdAt)}</span>
              </div>
              {activity.contact?.name ? <p className="mt-1 text-xs text-muted">With {activity.contact.name}</p> : null}
              {activity.body ? <p className="mt-1 text-sm text-muted">{activity.body}</p> : null}
              {can(PERMISSIONS.ACTIVITIES_UPDATE) && activity.status === "scheduled" ? (
                <button type="button" className="mt-2 text-xs text-primary" onClick={() => markDone(activity)}>
                  Mark done
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
