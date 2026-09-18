"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FileText, X } from "lucide-react";
import { DocumentCanvas } from "./DocumentCanvas";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { reviewActionLabel } from "@/constants/verification";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { thumbnailUrl } from "@/lib/cloudinaryMedia";

export function EvidenceFacts({ doc }) {
  if (!doc) return null;
  const rows = [
    ["Title", doc.title || doc.label],
    ["Document number", doc.documentNumber],
    ["Issuer", doc.issuer],
    ["Issued", formatDate(doc.issuedAt)],
    ["Expires", formatDate(doc.expiresAt)],
  ].filter(([, value]) => value && value !== "—");
  if (!rows.length && !doc.description && !(doc.files || []).length) {
    return <p className="text-sm text-muted">No details captured.</p>;
  }
  return (
    <div className="space-y-2">
      {rows.length ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
          {doc.description ? (
            <div className="col-span-2">
              <dt className="text-xs text-muted">Description</dt>
              <dd className="text-sm">{doc.description}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <SnapshotFiles files={doc.files} />
    </div>
  );
}

function FilePreviewModal({ file, onClose }) {
  useEffect(() => {
    if (!file) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [file, onClose]);

  return (
    <Modal open={Boolean(file)} onClose={onClose} className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="min-w-0 truncate font-display text-base font-semibold">{file?.name || "File"}</h2>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>
      <div className="h-[min(72vh,40rem)] bg-[#111827]">
        <DocumentCanvas file={file} label={file?.name} className="h-full min-h-0 w-full" />
      </div>
    </Modal>
  );
}

function SnapshotFiles({ files = [] }) {
  const [preview, setPreview] = useState(null);
  if (!files.length) return null;
  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {files.map((file, index) => {
          const src = thumbnailUrl(file);
          return (
            <li key={file.publicId || file.url || `${file.name}-${index}`}>
              <button
                type="button"
                onClick={() => setPreview(file)}
                className="flex items-center gap-2 rounded-md border border-border bg-bg/60 p-1 text-left hover:border-primary/40"
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-10 w-7 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-7 items-center justify-center rounded bg-slate-100 text-muted dark:bg-slate-800">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="max-w-[9rem] truncate text-xs">{file.name || "View file"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <FilePreviewModal file={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function snapshotSummary(snapshot) {
  if (!snapshot) return "";
  return [snapshot.title, snapshot.documentNumber, snapshot.issuer, snapshot.issuedAt ? `issued ${formatDate(snapshot.issuedAt)}` : "", snapshot.expiresAt ? `exp ${formatDate(snapshot.expiresAt)}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function eventDot(action) {
  if (action === "verified") return "bg-emerald-500";
  if (action === "rejected" || action === "expired") return "bg-rose-500";
  if (action === "replaced") return "bg-amber-500";
  return "bg-slate-400";
}

export function buildVerificationTimeline(item) {
  const documents = item?.documents || [];
  const events = [];
  const caseReviews = item.reviews || [];

  events.push({
    at: item.createdAt,
    scope: "case",
    action: "assigned",
    label: "Assigned",
    detail: item.assignedTo?.name || "",
    actor: item.createdBy,
  });

  for (const review of caseReviews) {
    events.push({
      at: review.createdAt,
      scope: "case",
      action: review.action,
      label: reviewActionLabel(review.action, "case"),
      detail: review.note || "",
      actor: review.actor,
    });
  }

  if (item.submittedAt && !caseReviews.some((review) => review.action === "submitted")) {
    events.push({
      at: item.submittedAt,
      scope: "case",
      action: "submitted",
      label: "Submitted for review",
      detail: "",
      actor: item.submitter || item.assignedTo,
    });
  }

  for (const doc of documents) {
    for (const review of doc.reviews || []) {
      const keepFile = review.action === "rejected" || review.action === "replaced";
      events.push({
        at: review.createdAt,
        scope: "document",
        action: review.action,
        label: `${doc.label}: ${reviewActionLabel(review.action, "document")}`,
        detail: review.note || "",
        actor: review.actor,
        snapshot: keepFile ? review.snapshot : null,
      });
    }
  }

  return events
    .filter((event) => event.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function VerificationLog({ item, open, onToggle }) {
  const events = useMemo(() => buildVerificationTimeline(item), [item]);

  return (
    <section id="verification-activity" className="rounded-lg border border-border bg-surface">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold">Activity</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted dark:bg-slate-800">{events.length}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3">
          {events.length ? (
            <ol className="space-y-0">
              {events.map((event, index) => {
                const summary = snapshotSummary(event.snapshot);
                return (
                  <li key={`${event.action}-${event.at}-${index}`} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", eventDot(event.action))} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{event.label}</p>
                      {event.detail ? <p className="text-sm text-muted">{event.detail}</p> : null}
                      <p className="text-xs text-muted">
                        {[event.actor?.name, formatDateTime(event.at)].filter(Boolean).join(" · ")}
                      </p>
                      {event.snapshot ? (
                        <div className="mt-2 space-y-1.5">
                          {summary ? <p className="text-xs text-muted">{event.action === "replaced" ? "Previous: " : ""}{summary}</p> : null}
                          <SnapshotFiles files={event.snapshot.files} />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted">No activity yet.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
