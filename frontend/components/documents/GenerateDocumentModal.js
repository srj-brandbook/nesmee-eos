"use client";

import { useEffect, useState } from "react";
import { documentService } from "@/services/documentService";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { BindingsPanel } from "./BindingsPanel";
import { DOCUMENT_TYPES, labelFor } from "@/constants/documents";
import { ApiClientError } from "@/lib/api/apiClient";

export function GenerateDocumentModal({ open, onClose, subjectType = "lead", subjectId, onGenerated }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    documentService.templates
      .list({ status: "published", subjectType, limit: 50, sort: "name" })
      .then((response) => {
        setTemplates(response.data.items || []);
        setTemplateId(response.data.items?.[0]?.id || "");
      })
      .catch(() => toast.error("Unable to load templates"));
  }, [open, subjectType]);

  useEffect(() => {
    if (!open || !templateId || !subjectId) {
      setPreview(null);
      return;
    }
    documentService
      .previewBindings({ templateId, subjectType, subjectId })
      .then((response) => setPreview(response.data))
      .catch(() => setPreview(null));
  }, [open, templateId, subjectType, subjectId]);

  async function generate() {
    setLoading(true);
    try {
      const response = await documentService.generate({ templateId, subjectType, subjectId });
      toast.success("Document generated");
      onGenerated?.(response.data.document);
      onClose?.();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Could not generate document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title="New document" onClose={onClose} className="max-w-xl">
      <div className="space-y-4">
        <Select label="Template" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
          {!templates.length ? <option value="">No published templates</option> : null}
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({labelFor(DOCUMENT_TYPES, item.type)})
            </option>
          ))}
        </Select>
        {preview ? (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border p-3">
            <BindingsPanel rows={preview.rows || []} missing={preview.missingVariables || []} />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generate} loading={loading} disabled={!templateId}>
            Generate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
