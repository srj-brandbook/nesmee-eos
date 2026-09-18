"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, FileSearch, PanelRightClose, PanelRightOpen, Save, X } from "lucide-react";
import { verificationService } from "@/services/verificationService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { FileUpload } from "@/components/ui/FileUpload";
import { DocumentCanvas } from "./DocumentCanvas";
import { DocumentEvidenceInput } from "./DocumentEvidenceInput";
import { PERMISSIONS } from "@/constants/permissions";
import { labelFor, VERIFICATION_DOCUMENT_STATUSES, verificationStatusVariant } from "@/constants/verification";
import { formatDateTime } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";
import { thumbnailUrl } from "@/lib/cloudinaryMedia";

function evidenceFromDoc(doc) {
  return {
    title: doc?.title || doc?.label || "",
    description: doc?.description || "",
    issuer: doc?.issuer || "",
    documentNumber: doc?.documentNumber || "",
    issuedAt: doc?.issuedAt ? String(doc.issuedAt).slice(0, 10) : "",
    expiresAt: doc?.expiresAt ? String(doc.expiresAt).slice(0, 10) : "",
    files: doc?.files || [],
  };
}

export function DocumentCaptureStage({ document: doc, caseItem, open, onClose, onChanged, canFill }) {
  const toast = useToast();
  const { can } = useAuth();
  const [evidence, setEvidence] = useState(() => evidenceFromDoc(doc));
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState("details");
  const [formOpen, setFormOpen] = useState(true);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const evidenceRef = useRef(evidence);
  evidenceRef.current = evidence;

  useEffect(() => {
    if (!open || !doc) return;
    const next = evidenceFromDoc(doc);
    setEvidence(next);
    setActiveIndex(Math.max(0, (next.files || []).length - 1));
    setNote("");
    setTab("details");
  }, [doc?.id, open]);

  const persist = useCallback(
    async (next = evidenceRef.current, { silent = false } = {}) => {
      if (!doc?.id) return;
      setSaving(true);
      try {
        const response = await verificationService.updateDocument(doc.id, {
          title: next.title,
          description: next.description,
          issuer: next.issuer,
          documentNumber: next.documentNumber,
          issuedAt: next.issuedAt || null,
          expiresAt: next.expiresAt || null,
          files: next.files || [],
        });
        onChanged?.(response.data);
        if (!silent) toast.success("Document saved");
      } catch (err) {
        toast.error(err instanceof ApiClientError ? err.message : "Could not save document");
      } finally {
        setSaving(false);
      }
    },
    [doc?.id, onChanged, toast]
  );

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event) {
      if (event.key === "Escape") onClose();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (canFill && doc?.status !== "verified") persist();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, canFill, doc?.status, persist]);

  const files = evidence.files || [];
  const preview = files[activeIndex] || files[files.length - 1] || null;
  const locked = !canFill || doc?.status === "verified";
  const canReview =
    can(PERMISSIONS.VERIFICATION_REVIEW) &&
    caseItem?.status === "submitted" &&
    files.length > 0;

  const tabs = useMemo(() => {
    const items = [{ value: "details", label: "Details", icon: ClipboardList }];
    if (canReview) items.push({ value: "review", label: "Review", icon: FileSearch });
    return items;
  }, [canReview]);

  function onFilesChange(nextFiles) {
    const list = Array.isArray(nextFiles) ? nextFiles : nextFiles ? [nextFiles] : [];
    const next = { ...evidence, files: list };
    setEvidence(next);
    setActiveIndex(Math.max(0, list.length - 1));
    if (canFill && doc.status !== "verified") persist(next, { silent: true });
  }

  async function review(decision) {
    setReviewing(true);
    try {
      const response = await verificationService.reviewDocument(doc.id, { decision, note });
      toast.success(decision === "verified" ? "Document verified" : "Document returned");
      onChanged?.(response.data);
      if (decision === "verified") onClose();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not review document");
    } finally {
      setReviewing(false);
    }
  }

  if (!open || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-base font-semibold">{doc.label || doc.title}</h2>
            <Badge variant={verificationStatusVariant(doc.status)}>{labelFor(VERIFICATION_DOCUMENT_STATUSES, doc.status)}</Badge>
          </div>
          <p className="truncate text-xs text-muted">Ctrl + scroll to zoom · drag to pan · copy details from the file</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex" onClick={() => setFormOpen((open) => !open)}>
            {formOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            {formOpen ? "Hide form" : "Show form"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
            Done
          </Button>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 grid-cols-1 ${formOpen ? "lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]" : "lg:grid-cols-1"}`}>
        <section className="relative min-h-[52vh] overflow-hidden bg-[#111827] lg:h-full lg:min-h-0">
          <DocumentCanvas
            file={preview}
            label={doc.label}
            fullscreen={!formOpen}
            onFullscreen={() => setFormOpen((open) => !open)}
            className="absolute inset-0 h-full w-full"
          />
          {files.length > 1 ? (
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-xl bg-slate-950/80 p-1.5 backdrop-blur">
              {files.map((file, index) => (
                <button
                  key={file.publicId || file.url || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-12 w-9 overflow-hidden rounded-md ring-2 ${index === activeIndex ? "ring-white" : "ring-transparent opacity-70 hover:opacity-100"}`}
                  aria-label={`Show file ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl(file)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {formOpen ? (
        <aside className="flex min-h-0 flex-col border-t border-border bg-surface lg:border-l lg:border-t-0">
          <Tabs tabs={tabs} value={tab} onChange={setTab} size="sm" fill />
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "details" ? (
              <div className="space-y-4">
                {doc.rejectionReason ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-danger dark:bg-rose-950/40">Returned: {doc.rejectionReason}</p> : null}
                <DocumentEvidenceInput
                  value={evidence}
                  onChange={setEvidence}
                  disabled={locked}
                  requiredMark={doc.required}
                  collectIssuedDate={doc.collectIssuedDate !== false}
                  collectExpiryDate={doc.collectExpiryDate !== false}
                  collectIssuer={doc.collectIssuer !== false}
                  collectDocumentNumber={doc.collectDocumentNumber !== false}
                  showUpload={false}
                />
                <FileUpload
                  label={files.length ? "Replace or add files" : "Upload file"}
                  folder="forms"
                  accept="application/pdf,image/*"
                  maxFiles={3}
                  maxSizeMb={15}
                  value={files}
                  onChange={onFilesChange}
                  disabled={locked}
                  destroyOnChange={false}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea label="Review note" value={note} onChange={(event) => setNote(event.target.value)} />
                <div className="flex gap-2">
                  <Button type="button" loading={reviewing} onClick={() => review("verified")}>
                    Verify
                  </Button>
                  <Button type="button" variant="outline" loading={reviewing} onClick={() => review("rejected")}>
                    Return
                  </Button>
                </div>
                {(doc.reviews || []).length ? (
                  <ul className="space-y-2 text-sm">
                    {doc.reviews.map((item, index) => (
                      <li key={`${item.createdAt}-${index}`} className="rounded-md border border-border px-3 py-2">
                        <span className="font-medium capitalize">{item.action}</span>
                        {item.note ? <span className="text-muted"> — {item.note}</span> : null}
                        <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
          {tab === "details" && canFill && doc.status !== "verified" ? (
            <div className="shrink-0 border-t border-border p-3">
              <Button type="button" className="w-full" loading={saving} onClick={() => persist()}>
                <Save className="h-4 w-4" />
                Save details
              </Button>
            </div>
          ) : null}
        </aside>
        ) : null}
      </div>
    </div>
  );
}
