"use client";

import { useEffect, useState } from "react";
import { verificationService } from "@/services/verificationService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { ApiClientError } from "@/lib/api/apiClient";

export function AssignVerificationModal({ open, leadId, onClose, onAssigned }) {
  const toast = useToast();
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [formId, setFormId] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormId("");
    setAssignedToId(user?.id || "");
    setDueAt("");
    setNote("");
    Promise.all([verificationService.templates(), verificationService.assignees()])
      .then(([templateRes, assigneeRes]) => {
        const items = templateRes.data.items || [];
        setTemplates(items);
        if (items[0]) setFormId(items[0].id);
        setAssignees(assigneeRes.data.items || []);
      })
      .catch(() => toast.error("Unable to load verification templates"));
  }, [open, user?.id]);

  async function submit(event) {
    event.preventDefault();
    if (!formId) {
      toast.error("Publish a supplier verification form first");
      return;
    }
    setSaving(true);
    try {
      await verificationService.create({
        leadId,
        formId,
        assignedToId: assignedToId || user?.id,
        dueAt: dueAt || null,
        note,
      });
      toast.success("Verification assigned");
      onAssigned?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not assign verification");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request verification">
      <form onSubmit={submit} className="space-y-4">
        <Select label="Verification form" value={formId} onChange={(event) => setFormId(event.target.value)} required>
          {!templates.length ? <option value="">No published verification forms</option> : null}
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select label="Assign to" value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)}>
          <option value={user?.id || ""}>Myself</option>
          {assignees
            .filter((item) => item.id !== user?.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </Select>
        <Input type="date" label="Due date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        <Textarea label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!templates.length}>
            Assign
          </Button>
        </div>
      </form>
    </Modal>
  );
}
