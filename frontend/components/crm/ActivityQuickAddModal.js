"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CalendarClock, ListTodo, PhoneCall, StickyNote, Video } from "lucide-react";
import { activityService } from "@/services/crmService";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { PROCESS_WORKSPACES } from "./LeadProcessPanel";
import { TIMED_ACTIVITY_TYPES, DUE_ACTIVITY_TYPES } from "@/constants/crm";
import { cn, defaultActivityStamp, toDatetimeLocal } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

const TYPES = [
  { value: "note", label: "Note", icon: StickyNote },
  { value: "call", label: "Call", icon: PhoneCall },
  { value: "follow_up", label: "Follow-up", icon: CalendarClock },
  { value: "appointment", label: "Appointment", icon: Calendar },
  { value: "meeting", label: "Meeting", icon: Video },
  { value: "task", label: "Task", icon: ListTodo },
];

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

export function ActivityQuickAddModal({ open, onClose, leadId, leadName, contacts = [], defaultType = "note", onDone }) {
  const toast = useToast();
  const [type, setType] = useState(defaultType);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const workspace = PROCESS_WORKSPACES[type];
  const fields = workspace?.fields || ["title", "body"];
  const logNow = type === "call" && form.mode === "log";

  const copy = useMemo(() => {
    const byType = {
      note: { title: "Log note", save: "Save note", hint: "Internal context for the next person on this manufacturer." },
      call: { title: "Log call", save: logNow ? "Log call" : "Schedule call", hint: "Qualify the factory or book the next conversation." },
      follow_up: { title: "Schedule follow-up", save: "Schedule follow-up", hint: "Chase samples, pricing, or a decision." },
      appointment: { title: "Book appointment", save: "Book appointment", hint: "Factory visit or in-person meeting." },
      meeting: { title: "Schedule meeting", save: "Schedule meeting", hint: "Video or conference call with a join link." },
      task: { title: "Add task", save: "Add task", hint: "Work that must finish before this lead can move." },
    };
    return byType[type] || byType.note;
  }, [logNow, type]);

  useEffect(() => {
    if (!open) return;
    const next = TYPES.some((item) => item.value === defaultType) ? defaultType : "note";
    setType(next);
    setForm({
      ...emptyForm,
      startsAt: TIMED_ACTIVITY_TYPES.includes(next) ? defaultActivityStamp(next) : "",
      dueAt: DUE_ACTIVITY_TYPES.includes(next) ? defaultActivityStamp(next) : "",
    });
  }, [defaultType, open]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeType(next) {
    setType(next);
    setForm((current) => ({
      ...emptyForm,
      contactId: current.contactId,
      title: current.title,
      body: current.body,
      startsAt: TIMED_ACTIVITY_TYPES.includes(next) ? defaultActivityStamp(next) : "",
      dueAt: DUE_ACTIVITY_TYPES.includes(next) ? defaultActivityStamp(next) : "",
    }));
  }

  async function handleSave() {
    if (type === "note" && !form.body.trim()) {
      toast.error("Add a note");
      return;
    }
    if (type === "appointment" && !form.location.trim()) {
      toast.error("Add a location for the appointment");
      return;
    }
    if (type === "meeting" && !form.meetingUrl.trim()) {
      toast.error("Add a meeting link");
      return;
    }
    if (type === "task" && !form.title.trim()) {
      toast.error("Add a task title");
      return;
    }
    if (!logNow && TIMED_ACTIVITY_TYPES.includes(type) && !form.startsAt) {
      toast.error("Set a start time");
      return;
    }
    if (DUE_ACTIVITY_TYPES.includes(type) && !form.dueAt) {
      toast.error("Set a due date");
      return;
    }
    setSaving(true);
    try {
      const startsAt = logNow ? toDatetimeLocal(new Date()) : form.startsAt;
      await activityService.create({
        leadId,
        type,
        title: form.title.trim() || `${workspace.defaultTitle}${leadName ? ` · ${leadName}` : ""}`,
        body: form.body.trim(),
        contactId: form.contactId || null,
        startsAt: TIMED_ACTIVITY_TYPES.includes(type) ? startsAt : undefined,
        endsAt: TIMED_ACTIVITY_TYPES.includes(type) && !logNow ? form.endsAt || undefined : undefined,
        dueAt: DUE_ACTIVITY_TYPES.includes(type) ? form.dueAt : undefined,
        reminderAt: form.reminderAt || undefined,
        location: form.location.trim(),
        meetingUrl: form.meetingUrl.trim(),
        status: type === "note" || logNow ? "done" : "scheduled",
      });
      toast.success("Logged");
      onDone?.();
      onClose?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save activity");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={copy.title} className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Type</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {TYPES.map((item) => {
              const Icon = item.icon;
              const active = type === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeType(item.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted hover:border-primary/40 hover:text-text"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">{copy.hint}</p>
        </div>

        {fields.includes("mode") ? (
          <div className="inline-flex rounded-md border border-border p-0.5">
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

        <div className="grid gap-3 md:grid-cols-2">
          {fields.includes("contact") ? (
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

          {fields.includes("title") ? (
            <Input
              label="Title"
              value={form.title}
              placeholder={workspace.defaultTitle}
              required={type === "task"}
              onChange={(event) => setField("title", event.target.value)}
            />
          ) : null}

          {fields.includes("startsAt") && !logNow ? (
            <Input
              label="Starts"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(event) => setField("startsAt", event.target.value)}
            />
          ) : null}

          {fields.includes("endsAt") && !logNow ? (
            <Input label="Ends" type="datetime-local" value={form.endsAt} onChange={(event) => setField("endsAt", event.target.value)} />
          ) : null}

          {fields.includes("dueAt") ? (
            <Input
              label="Due"
              type="datetime-local"
              required
              value={form.dueAt}
              onChange={(event) => setField("dueAt", event.target.value)}
            />
          ) : null}

          {fields.includes("location") ? (
            <Input
              label="Location"
              placeholder="Factory, showroom, or address"
              required={type === "appointment"}
              value={form.location}
              onChange={(event) => setField("location", event.target.value)}
            />
          ) : null}

          {fields.includes("meetingUrl") ? (
            <Input
              label="Meeting URL"
              placeholder="https://"
              required={type === "meeting"}
              value={form.meetingUrl}
              onChange={(event) => setField("meetingUrl", event.target.value)}
            />
          ) : null}

          {fields.includes("reminderAt") ? (
            <Input
              label="Reminder"
              type="datetime-local"
              value={form.reminderAt}
              onChange={(event) => setField("reminderAt", event.target.value)}
            />
          ) : null}

          {fields.includes("body") ? (
            <div className="md:col-span-2">
              <Textarea
                label={type === "note" ? "Note" : "Details"}
                required={type === "note"}
                value={form.body}
                placeholder={
                  type === "note"
                    ? "Capability notes, visit observations, red flags…"
                    : type === "call"
                      ? "What was discussed, next step, who to follow up with…"
                      : type === "follow_up"
                        ? "What you are chasing and why it matters…"
                        : type === "appointment"
                          ? "Who you are meeting, agenda, samples to review…"
                          : type === "meeting"
                            ? "Agenda, attendees, what you need from this call…"
                            : "What needs to be done and what done looks like…"
                }
                onChange={(event) => setField("body", event.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {copy.save}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
