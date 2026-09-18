"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, X } from "lucide-react";
import { verificationService } from "@/services/verificationService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { FileUpload } from "@/components/ui/FileUpload";
import { PERMISSIONS } from "@/constants/permissions";
import { labelFor, VERIFICATION_DOCUMENT_STATUSES, verificationStatusVariant } from "@/constants/verification";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

function isImage(file) {
  if (!file?.url) return false;
  if ((file.type || file.mimeType || "").startsWith("image")) return true;
  return file.resourceType === "image";
}

function isPdf(file) {
  const type = file?.type || file?.mimeType || "";
  const name = file?.name || "";
  return type.includes("pdf") || name.toLowerCase().endsWith(".pdf");
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function DocumentDrawer({ document: doc, caseItem, open, onClose, onChanged, canFill }) {
  const toast = useToast();
  const { can } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issuer, setIssuer] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!doc) return;
    setTitle(doc.title || doc.label || "");
    setDescription(doc.description || "");
    setIssuer(doc.issuer || "");
    setDocumentNumber(doc.documentNumber || "");
    setIssuedAt(toDateInput(doc.issuedAt));
    setExpiresAt(toDateInput(doc.expiresAt));
    setFiles(doc.files || []);
    setNote("");
  }, [doc]);

  const preview = useMemo(() => (files && files.length ? files[files.length - 1] : null), [files]);
  const canReview =
    can(PERMISSIONS.VERIFICATION_REVIEW) &&
    ["submitted", "rejected"].includes(caseItem?.status) &&
    ["submitted", "rejected"].includes(doc?.status) &&
    files.length > 0;
  const locked = !canFill || doc?.status === "verified";

  async function save() {
    setSaving(true);
    try {
      await verificationService.updateDocument(doc.id, {
        title,
        description,
        issuer,
        documentNumber,
        issuedAt: issuedAt || null,
        expiresAt: expiresAt || null,
        files,
      });
      toast.success("Document saved");
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not save document");
    } finally {
      setSaving(false);
    }
  }

  async function review(decision) {
    setReviewing(true);
    try {
      await verificationService.reviewDocument(doc.id, { decision, note });
      toast.success(decision === "verified" ? "Document verified" : "Document returned");
      onChanged?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not review document");
    } finally {
      setReviewing(false);
    }
  }

  if (!open || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={onClose} aria-label="Close document" />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-surface shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <p className="text-xs text-muted">Document</p>
            <h2 className="font-display text-lg font-semibold">{doc.label || doc.title}</h2>
            <Badge variant={verificationStatusVariant(doc.status)} className="mt-2">
              {labelFor(VERIFICATION_DOCUMENT_STATUSES, doc.status)}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {preview?.url ? (
            <div className="overflow-hidden rounded-md border border-border bg-slate-50 dark:bg-slate-900">
              {isImage(preview) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.name || doc.label} className="max-h-80 w-full object-contain" />
              ) : isPdf(preview) ? (
                <iframe title={preview.name || "Document preview"} src={preview.url} className="h-80 w-full" />
              ) : (
                <a href={preview.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-4 text-sm text-primary">
                  <FileText className="h-4 w-4" />
                  Open {preview.name || "file"}
                </a>
              )}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted">No file uploaded yet</p>
          )}

          <Input label="Title" value={title} disabled={locked} onChange={(event) => setTitle(event.target.value)} />
          <Textarea label="Description" value={description} disabled={locked} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            {doc.collectDocumentNumber !== false ? (
              <Input label="Document number" value={documentNumber} disabled={locked} onChange={(event) => setDocumentNumber(event.target.value)} />
            ) : null}
            {doc.collectIssuer !== false ? (
              <Input label="Issuer" value={issuer} disabled={locked} onChange={(event) => setIssuer(event.target.value)} />
            ) : null}
            {doc.collectIssuedDate !== false ? (
              <Input type="date" label="Issued date" value={issuedAt} disabled={locked} onChange={(event) => setIssuedAt(event.target.value)} />
            ) : null}
            {doc.collectExpiryDate !== false ? (
              <Input type="date" label="Expiry date" value={expiresAt} disabled={locked} onChange={(event) => setExpiresAt(event.target.value)} />
            ) : null}
          </div>
          <FileUpload
            label="Files"
            folder="forms"
            maxFiles={3}
            maxSizeMb={15}
            value={files}
            onChange={(next) => setFiles(Array.isArray(next) ? next : next ? [next] : [])}
            disabled={locked}
            destroyOnChange={false}
          />
          {doc.rejectionReason ? <p className="text-sm text-danger">Returned: {doc.rejectionReason}</p> : null}

          {canFill && doc.status !== "verified" ? (
            <Button onClick={save} loading={saving}>
              Save document
            </Button>
          ) : null}

          {canReview ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium">Review</p>
              <Textarea label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
              <div className="flex gap-2">
                <Button loading={reviewing} onClick={() => review("verified")}>
                  Verify
                </Button>
                <Button variant="outline" loading={reviewing} onClick={() => review("rejected")}>
                  Return
                </Button>
              </div>
            </div>
          ) : null}

          {(doc.reviews || []).length ? (
            <div>
              <h3 className="text-sm font-semibold">History</h3>
              <ul className="mt-2 space-y-2">
                {doc.reviews.map((item, index) => (
                  <li key={`${item.createdAt}-${index}`} className="text-sm">
                    <span className="font-medium capitalize">{item.action}</span>
                    {item.note ? <span className="text-muted"> — {item.note}</span> : null}
                    <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {doc.issuedAt || doc.expiresAt ? (
            <p className="text-xs text-muted">
              Issued {formatDate(doc.issuedAt)} · Expires {formatDate(doc.expiresAt)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
