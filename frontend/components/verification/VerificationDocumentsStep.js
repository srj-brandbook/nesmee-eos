"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { verificationService } from "@/services/verificationService";
import { DocumentCanvas } from "./DocumentCanvas";
import { DocumentUploadCard } from "./DocumentUploadCard";
import { EvidenceFacts } from "./VerificationLog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/contexts/ToastProvider";
import {
  documentReviewProgress,
  labelFor,
  VERIFICATION_DOCUMENT_STATUSES,
  verificationStatusVariant,
} from "@/constants/verification";
import { cn } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

function StatusIcon({ status }) {
  if (status === "verified") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "rejected") return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-amber-500" />;
}

function nextPendingId(documents, currentId) {
  const pending = documents.filter((item) => item.status === "submitted");
  if (!pending.length) return currentId;
  const index = pending.findIndex((item) => item.id === currentId);
  return pending[(index + 1) % pending.length]?.id || pending[0].id;
}

export function VerificationDocumentsStep({
  item,
  canFill,
  canReview,
  ownSubmission,
  documentErrors,
  onOpen,
  onChanged,
  errorsForDocument,
}) {
  const toast = useToast();
  const documents = item?.documents || [];
  const progress = documentReviewProgress(documents);
  const [activeId, setActiveId] = useState(documents.find((doc) => doc.status === "submitted")?.id || documents[0]?.id || "");
  const [docNote, setDocNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setActiveId((current) => {
      if (current && documents.some((doc) => doc.id === current)) return current;
      return documents.find((doc) => doc.status === "submitted")?.id || documents[0]?.id || "";
    });
  }, [item?.id, documents]);

  const active = useMemo(() => documents.find((doc) => doc.id === activeId) || documents[0] || null, [activeId, documents]);
  const preview = active?.files?.length ? active.files[active.files.length - 1] : null;

  useEffect(() => {
    setDocNote(active?.rejectionReason || "");
  }, [active?.id, active?.rejectionReason]);

  async function decideDocument(decision) {
    if (!active) return;
    if (decision === "rejected" && !docNote.trim()) {
      toast.error("Add a note explaining what must be corrected");
      return;
    }
    setReviewing(true);
    try {
      const response = await verificationService.reviewDocument(active.id, { decision, note: docNote });
      onChanged?.(response.data);
      setDocNote("");
      setActiveId(nextPendingId(response.data.case?.documents || documents, active.id));
      toast.success(decision === "verified" ? "Document verified" : "Document returned");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not record document decision");
    } finally {
      setReviewing(false);
    }
  }

  if (!documents.length) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
        This verification form has no document requirements yet. Add documents in the form builder, then reopen this case.
      </p>
    );
  }

  if (canFill && !canReview) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Upload each file, then fill the details from the preview. Returned files stay in the log.</p>
        {documents.map((doc) => (
          <DocumentUploadCard
            key={doc.id}
            doc={doc}
            canFill={canFill}
            onSaved={onChanged}
            onOpen={onOpen}
            errors={errorsForDocument?.(doc) || []}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {progress.verified}/{progress.total} verified
          {progress.remaining ? ` · ${progress.remaining} left` : ""}
          {progress.returned ? ` · ${progress.returned} to return` : ""}
        </p>
        {documentErrors && Object.keys(documentErrors).length ? <Alert variant="danger">Some documents still need attention.</Alert> : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {documents.map((doc) => {
          const selected = doc.id === active?.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setActiveId(doc.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-text hover:border-primary/40"
              )}
            >
              <StatusIcon status={doc.status} />
              {doc.label}
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-h-[24rem] overflow-hidden rounded-lg border border-border bg-[#111827] lg:min-h-[32rem]">
            <DocumentCanvas file={preview} label={active.label} className="h-full min-h-[24rem] w-full" />
          </div>
          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{active.label}</h3>
              <Badge variant={verificationStatusVariant(active.status)}>{labelFor(VERIFICATION_DOCUMENT_STATUSES, active.status)}</Badge>
            </div>
            <EvidenceFacts doc={active} />
            {active.rejectionReason ? <Alert variant="danger">{active.rejectionReason}</Alert> : null}
            {canReview && !ownSubmission ? (
              <div className="space-y-3">
                <Textarea label="Document note" value={docNote} onChange={(event) => setDocNote(event.target.value)} />
                <p className="text-xs text-muted">Required when returning this document. The current file and details are kept in the log.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" loading={reviewing} onClick={() => decideDocument("verified")}>
                    Verify
                  </Button>
                  <Button type="button" size="sm" variant="outline" loading={reviewing} onClick={() => decideDocument("rejected")}>
                    Return file
                  </Button>
                </div>
              </div>
            ) : null}
            {canFill ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onOpen?.(active)}>
                Open details
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Select a document to review.</p>
      )}
    </div>
  );
}
