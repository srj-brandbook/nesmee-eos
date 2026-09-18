"use client";

import { memo, useEffect, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { verificationService } from "@/services/verificationService";
import { useToast } from "@/contexts/ToastProvider";
import { labelFor, VERIFICATION_DOCUMENT_STATUSES, verificationStatusVariant } from "@/constants/verification";
import { ApiClientError } from "@/lib/api/apiClient";
import { thumbnailUrl } from "@/lib/cloudinaryMedia";

function filesOf(doc) {
  return Array.isArray(doc?.files) ? doc.files : [];
}

export const DocumentUploadCard = memo(function DocumentUploadCard({ doc, canFill, onSaved, onOpen, errors = [] }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [draftFiles, setDraftFiles] = useState([]);
  const savedFiles = filesOf(doc);
  const files = savedFiles.length ? savedFiles : draftFiles;
  const locked = !canFill || doc.status === "verified";
  const hasFile = savedFiles.length > 0;
  const latest = files[files.length - 1];

  useEffect(() => {
    setSaving(false);
    if (savedFiles.length) setDraftFiles([]);
  }, [doc.id, savedFiles.length]);

  async function persist(nextFiles) {
    setSaving(true);
    try {
      const response = await verificationService.updateDocument(doc.id, {
        title: doc.title || doc.label || "",
        description: doc.description || "",
        issuer: doc.issuer || "",
        documentNumber: doc.documentNumber || "",
        issuedAt: doc.issuedAt || null,
        expiresAt: doc.expiresAt || null,
        files: nextFiles,
      });
      onSaved?.(response.data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save document");
    } finally {
      setSaving(false);
    }
  }

  const hasError = errors.length > 0;

  return (
    <section
      data-document-error={hasError ? "true" : undefined}
      className={`rounded-lg border bg-surface p-3 ${hasError ? "border-danger ring-2 ring-danger/30" : "border-border"}`}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            {doc.label || doc.title}
            {doc.required ? <span className="ml-0.5 text-danger">*</span> : null}
          </h3>
          {doc.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{doc.description}</p> : null}
        </div>
        <Badge variant={verificationStatusVariant(doc.status)}>{labelFor(VERIFICATION_DOCUMENT_STATUSES, doc.status)}</Badge>
      </div>
      {hasError ? (
        <ul className="mb-2 space-y-1 text-sm text-danger">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      {doc.rejectionReason ? <p className="mb-2 text-sm text-danger">Returned: {doc.rejectionReason}</p> : null}

      {!hasFile ? (
        <FileUpload
          label="Upload file first"
          hint="Opens full screen so you can copy dates and numbers."
          folder="forms"
          accept="application/pdf,image/*"
          maxFiles={3}
          maxSizeMb={15}
          value={draftFiles}
          destroyOnChange={false}
          onChange={(next) => {
            const list = Array.isArray(next) ? next : next ? [next] : [];
            setDraftFiles(list);
            if (list.length) {
              onOpen?.({ ...doc, files: list });
              persist(list);
            }
          }}
          disabled={locked}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-md border border-border bg-bg/60 p-2">
          {latest?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl(latest)} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-muted dark:bg-slate-800">
              <FileText className="h-4 w-4" />
            </div>
          )}
          <p className="min-w-0 flex-1 truncate text-sm">
            {latest?.name || "File uploaded"}
            {files.length > 1 ? <span className="text-muted"> · {files.length} files</span> : null}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" onClick={() => onOpen?.(doc)}>
              Open
            </Button>
            {!locked ? (
              <Button type="button" size="sm" variant="outline" loading={saving} onClick={() => persist([])}>
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {saving && !hasFile ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
          <Upload className="h-3.5 w-3.5" />
          Saving upload…
        </p>
      ) : null}
    </section>
  );
});
