"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { leadService } from "@/services/crmService";
import { useToast } from "@/contexts/ToastProvider";
import { ApiClientError } from "@/lib/api/apiClient";
import { LEAD_STAGES, labelFor } from "@/constants/crm";

const COPY = {
  converted: {
    title: "Convert manufacturer",
    description: "Mark this manufacturer as converted. They are a suitable supplier candidate. Onboarding starts next, using the tagged supplier form. Won is used after staff review.",
    confirm: "Mark converted",
  },
  won: {
    title: "Mark as won",
    description: "Use won after supplier onboarding has been submitted and reviewed.",
    confirm: "Mark won",
  },
  lost: {
    title: "Mark as lost",
    description: "This manufacturer will leave the sourcing process.",
    confirm: "Mark lost",
  },
  disqualified: {
    title: "Mark as disqualified",
    description: "This manufacturer does not meet sourcing requirements and will leave the pipeline.",
    confirm: "Mark disqualified",
  },
};

export function LeadStatusModal({ open, lead, action = "converted", onClose, onDone }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const label = labelFor(LEAD_STAGES, action);
  const copy = COPY[action] || {
    title: `Change status to ${label}`,
    description: `Update this manufacturer to ${label}. A note is stored on the lead history.`,
    confirm: `Move to ${label}`,
  };
  const danger = action === "lost" || action === "disqualified";

  useEffect(() => {
    if (open) setNote("");
  }, [open, action, lead?.id]);

  async function onConfirm() {
    setLoading(true);
    try {
      const statusNote = note.trim();
      if (action === "converted" || action === "won") {
        await leadService.convert(lead.id, { stage: action, statusNote });
        toast.success(action === "won" ? "Lead marked won" : "Lead converted");
      } else {
        await leadService.update(lead.id, { stage: action, statusNote });
        toast.success(`Status updated to ${label}`);
      }
      onDone?.();
      onClose();
      setNote("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title={copy.title} onClose={onClose}>
      <p className="text-sm text-muted">{copy.description}</p>
      {lead?.name ? <p className="mt-2 text-sm font-medium">{lead.name}</p> : null}
      <div className="mt-4">
        <Textarea
          label="Status change note"
          placeholder="Optional. This is added to the lead history."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
          {copy.confirm}
        </Button>
      </div>
    </Modal>
  );
}
