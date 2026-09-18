"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calendarService, activityService, leadService } from "@/services/crmService";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { ACTIVITY_TYPES, CALENDAR_ACTIVITY_TYPES, labelFor, stageVariant } from "@/constants/crm";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthProvider";
import { PERMISSIONS } from "@/constants/permissions";
import { ApiClientError } from "@/lib/api/apiClient";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toIso(date) {
  return date.toISOString();
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventDate(activity) {
  return new Date(activity.startsAt || activity.dueAt);
}

export function CalendarView() {
  const toast = useToast();
  const { can } = useAuth();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState([]);
  const [leads, setLeads] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: "meeting",
    title: "",
    body: "",
    leadId: "",
    startsAt: "",
    dueAt: "",
    reminderAt: "",
  });

  const range = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return { from: toIso(from), to: toIso(to) };
  }, [cursor]);

  async function load() {
    const response = await calendarService.list(range);
    setItems(response.data.items);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load calendar"));
  }, [range.from, range.to]);

  useEffect(() => {
    leadService.list({ limit: 100 }).then((response) => setLeads(response.data.items)).catch(() => []);
  }, []);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const startWeekday = first.getDay();
    const lastDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= lastDate; day += 1) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
    }
    return cells;
  }, [cursor]);

  function openForDay(day) {
    const pad = (part) => String(part).padStart(2, "0");
    const stamp = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T09:00`;
    setForm({ type: "meeting", title: "", body: "", leadId: leads[0]?.id || "", startsAt: stamp, dueAt: stamp, reminderAt: "" });
    setModalOpen(true);
  }

  async function onSubmit(event) {
    event.preventDefault();
    try {
      const timed = ["appointment", "meeting", "call"].includes(form.type);
      await activityService.create({
        type: form.type,
        title: form.title,
        body: form.body,
        leadId: form.leadId,
        startsAt: timed ? form.startsAt : undefined,
        dueAt: timed ? undefined : form.dueAt,
        reminderAt: form.reminderAt || undefined,
      });
      setModalOpen(false);
      toast.success("Scheduled");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not schedule");
    }
  }

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Sourcing calendar</h1>
          <p className="text-sm text-muted">
            Team schedule for manufacturer outreach.
            {can(PERMISSIONS.ACTIVITIES_VIEW) ? (
              <>
                {" "}
                <Link href="/appointments" className="text-primary hover:underline">
                  Appointments
                </Link>
                {" · "}
                <Link href="/meetings" className="text-primary hover:underline">
                  Meetings
                </Link>
                {" · "}
                <Link href="/tasks" className="text-primary hover:underline">
                  Tasks
                </Link>
                {" · "}
                <Link href="/follow-ups" className="text-primary hover:underline">
                  Follow-ups
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            Prev
          </Button>
          <p className="min-w-36 text-center text-sm font-medium">{monthLabel}</p>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            Next
          </Button>
        </div>
      </div>
      <Card>
        <CardBody className="p-3">
          <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-md bg-border">
            {days.map((day, index) => {
              const events = day ? items.filter((item) => sameDay(eventDate(item), day)) : [];
              return (
                <button
                  key={day ? day.toISOString() : `empty-${index}`}
                  type="button"
                  disabled={!day}
                  onClick={() => day && openForDay(day)}
                  className="min-h-24 bg-surface p-1.5 text-left hover:bg-bg disabled:bg-bg"
                >
                  {day ? <p className="text-xs font-medium">{day.getDate()}</p> : null}
                  <div className="mt-1 space-y-1">
                    {events.slice(0, 3).map((item) => (
                      <p key={item.id} className="truncate rounded bg-primary/10 px-1 text-[10px] text-primary">
                        {item.title || item.lead?.name || labelFor(ACTIVITY_TYPES, item.type)}
                      </p>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Agenda</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {items.length === 0 ? <p className="text-sm text-muted">Nothing scheduled this month.</p> : null}
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={stageVariant(item.status)}>{labelFor(ACTIVITY_TYPES, item.type)}</Badge>
                <span>{item.title || item.lead?.name || "Activity"}</span>
                {item.lead?.name ? <span className="text-muted">· {item.lead.name}</span> : null}
              </div>
              <span className="text-muted">{formatDateTime(item.startsAt || item.dueAt)}</span>
            </div>
          ))}
        </CardBody>
      </Card>
      <Modal open={modalOpen} title="Schedule activity" onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-3">
          <Select label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            {CALENDAR_ACTIVITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          <Select label="Manufacturer" value={form.leadId} required onChange={(event) => setForm({ ...form, leadId: event.target.value })}>
            <option value="">Select manufacturer</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
              </option>
            ))}
          </Select>
          <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Textarea label="Details" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
          {form.type === "follow_up" ? (
            <Input label="Due" type="datetime-local" value={form.dueAt} required onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />
          ) : (
            <Input label="Starts" type="datetime-local" value={form.startsAt} required onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
          )}
          <Input label="Reminder" type="datetime-local" value={form.reminderAt} onChange={(event) => setForm({ ...form, reminderAt: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            {can(PERMISSIONS.ACTIVITIES_CREATE) ? <Button type="submit">Save</Button> : null}
          </div>
        </form>
      </Modal>
    </div>
  );
}
