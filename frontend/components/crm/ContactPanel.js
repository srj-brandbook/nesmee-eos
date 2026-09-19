"use client";

import { useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { leadService } from "@/services/crmService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Checkbox } from "@/components/ui/Checkbox";
import { PERMISSIONS } from "@/constants/permissions";
import { ApiClientError } from "@/lib/api/apiClient";

const emptyContact = { name: "", role: "", email: "", phone: "", notes: "", isPrimary: false };

export function ContactPanel({
  leadId,
  contacts = [],
  onChanged,
  title = "Contacts",
  description = "People at this manufacturer who can move an order forward.",
}) {
  const { can } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(emptyContact);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canEdit = can(PERMISSIONS.LEADS_UPDATE);

  function startCreate() {
    setEditingId(null);
    setForm({ ...emptyContact, isPrimary: contacts.length === 0 });
    setFormOpen(true);
  }

  function startEdit(contact) {
    setEditingId(contact.id);
    setForm({
      name: contact.name || "",
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      notes: contact.notes || "",
      isPrimary: Boolean(contact.isPrimary),
    });
    setFormOpen(true);
  }

  function reset() {
    setEditingId(null);
    setForm(emptyContact);
    setFormOpen(false);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await leadService.updateContact(leadId, editingId, form);
        toast.success("Contact updated");
      } else {
        await leadService.addContact(leadId, form);
        toast.success("Contact added");
      }
      reset();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save contact");
    } finally {
      setLoading(false);
    }
  }

  async function remove(contact) {
    await leadService.removeContact(leadId, contact.id);
    toast.success("Contact removed");
    if (editingId === contact.id) reset();
    onChanged?.();
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {canEdit && !formOpen ? (
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-4">
        {contacts.length === 0 && !formOpen ? (
          <EmptyState
            className="px-2 py-8"
            title="No contacts yet"
            description="Add an owner, merchandiser, or export manager before the first call."
            actionLabel={canEdit ? "Add contact" : undefined}
            onAction={canEdit ? startCreate : undefined}
          />
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-3">
                <Avatar name={contact.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{contact.name}</p>
                    {contact.isPrimary ? <Badge variant="primary">Primary</Badge> : null}
                  </div>
                  {contact.role ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                      <User className="h-3 w-3" />
                      {contact.role}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {contact.email ? (
                      <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${contact.email}`}>
                        <Mail className="h-3.5 w-3.5" />
                        {contact.email}
                      </a>
                    ) : null}
                    {contact.phone ? (
                      <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${contact.phone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        {contact.phone}
                      </a>
                    ) : null}
                  </div>
                  {contact.notes ? <p className="mt-2 text-sm text-muted">{contact.notes}</p> : null}
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit contact" onClick={() => startEdit(contact)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted hover:text-danger"
                      aria-label="Remove contact"
                      onClick={() => remove(contact)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {canEdit && formOpen ? (
          <form onSubmit={onSubmit} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-2">
            <p className="md:col-span-2 text-sm font-medium">{editingId ? "Edit contact" : "New contact"}</p>
            <Input
              label="Name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Checkbox
                label="Primary contact"
                checked={form.isPrimary}
                onChange={() => setForm({ ...form, isPrimary: !form.isPrimary })}
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" size="sm" loading={loading}>
                {editingId ? "Save contact" : "Add contact"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
