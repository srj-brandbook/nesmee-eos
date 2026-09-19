"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  FileSearch,
  History,
  PanelRightClose,
  PanelRightOpen,
  Stamp,
  X,
  XCircle,
} from "lucide-react";
import { verificationService } from "@/services/verificationService";
import { FormRuntime } from "@/components/form-builder/runtime/FormRuntime";
import { DocumentCanvas } from "./DocumentCanvas";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/contexts/ToastProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { ROUTES } from "@/constants/routes";
import {
  documentReviewProgress,
  labelFor,
  VERIFICATION_CASE_STATUSES,
  VERIFICATION_DOCUMENT_STATUSES,
  verificationStatusVariant,
} from "@/constants/verification";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

function StatusIcon({ status }) {
  if (status === "verified") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "rejected") return <XCircle className="h-4 w-4 shrink-0 text-rose-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-amber-500" />;
}

function EvidenceFacts({ doc }) {
  const rows = [
    ["Title", doc.title || doc.label],
    ["Document number", doc.documentNumber],
    ["Issuer", doc.issuer],
    ["Issued", formatDate(doc.issuedAt)],
    ["Expires", formatDate(doc.expiresAt)],
  ].filter(([, value]) => value && value !== "—");
  if (!rows.length && !doc.description) return <p className="text-sm text-muted">No details captured for this file.</p>;
  return (
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
  );
}

function nextPendingId(documents, currentId) {
  const pending = documents.filter((item) => item.status === "submitted");
  if (!pending.length) return currentId;
  const index = pending.findIndex((item) => item.id === currentId);
  return pending[(index + 1) % pending.length]?.id || pending[0].id;
}

function Collapsible({ title, open, onToggle, children, badge }) {
  return (
    <div className="rounded-md border border-border">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium">
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition", open ? "rotate-180" : "")} />
      </button>
      {open ? <div className="border-t border-border p-3">{children}</div> : null}
    </div>
  );
}

const DESKTOP_TABS = [
  { value: "evidence", label: "Evidence", icon: FileSearch },
  { value: "answers", label: "Answers", icon: ClipboardList },
  { value: "decision", label: "Finish", icon: Stamp },
  { value: "history", label: "History", icon: History },
];

const MOBILE_TABS = [
  { value: "preview", label: "File" },
  { value: "evidence", label: "Evidence" },
  { value: "answers", label: "Answers" },
  { value: "decision", label: "Finish" },
];

export function VerificationReviewDesk({ item, onChanged }) {
  const toast = useToast();
  const { user } = useAuth();
  const documents = item.documents || [];
  const progress = documentReviewProgress(documents);
  const [activeId, setActiveId] = useState(documents.find((doc) => doc.status === "submitted")?.id || documents[0]?.id || "");
  const [tab, setTab] = useState("evidence");
  const [mobileTab, setMobileTab] = useState("preview");
  const [sideOpen, setSideOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [docNote, setDocNote] = useState("");
  const [caseNote, setCaseNote] = useState(item.reviewNote || "");
  const [reviewingDoc, setReviewingDoc] = useState(false);
  const [reviewingCase, setReviewingCase] = useState(false);

  useEffect(() => {
    setActiveId((current) => {
      if (current && documents.some((doc) => doc.id === current)) return current;
      return documents.find((doc) => doc.status === "submitted")?.id || documents[0]?.id || "";
    });
  }, [item.id, documents]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event) {
      if (event.key === "Escape") setFullscreen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const active = documents.find((doc) => doc.id === activeId) || documents[0] || null;
  const preview = active?.files?.length ? active.files[active.files.length - 1] : null;
  const isSuperAdmin = Boolean(user?.roles?.some((role) => role.isSuperAdmin));
  const ownSubmission = Boolean(item.submittedBy && String(item.submittedBy) === String(user?.id) && !isSuperAdmin);
  const canApprove = progress.remaining === 0 && progress.returned === 0;
  const subjectHref = item.productId ? `${ROUTES.products}/${item.productId}` : item.lead?.stage === "won" ? `${ROUTES.suppliers}/${item.leadId}` : `${ROUTES.leads}/${item.leadId}`;
  const subjectName = item.product?.name || item.lead?.name || "Subject";

  const timeline = useMemo(() => {
    const events = [];
    if (item.submittedAt) {
      events.push({ at: item.submittedAt, label: "Submitted for review", detail: item.submitter?.name || item.assignedTo?.name || "" });
    }
    for (const review of item.reviews || []) {
      events.push({
        at: review.createdAt,
        label: review.action === "verified" ? "Case approved" : "Case returned",
        detail: [review.actor?.name, review.note].filter(Boolean).join(" — "),
      });
    }
    for (const doc of documents) {
      for (const review of doc.reviews || []) {
        events.push({
          at: review.createdAt,
          label: `${doc.label}: ${review.action === "verified" ? "verified" : "returned"}`,
          detail: [review.actor?.name, review.note].filter(Boolean).join(" — "),
        });
      }
    }
    return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12);
  }, [documents, item]);

  function selectDocument(doc) {
    setActiveId(doc.id);
    setDocNote(doc.rejectionReason || "");
    setTab("evidence");
    setMobileTab("preview");
  }

  async function decideDocument(decision) {
    if (!active) return;
    if (decision === "rejected" && !docNote.trim()) {
      toast.error("Add a note explaining what must be corrected");
      setTab("evidence");
      setMobileTab("evidence");
      setSideOpen(true);
      return;
    }
    setReviewingDoc(true);
    try {
      const response = await verificationService.reviewDocument(active.id, { decision, note: docNote });
      onChanged?.(response.data);
      setDocNote("");
      const nextId = nextPendingId(response.data.case?.documents || documents, active.id);
      setActiveId(nextId);
      toast.success(decision === "verified" ? "Document verified" : "Document marked for return");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not record document decision");
    } finally {
      setReviewingDoc(false);
    }
  }

  async function decideCase(decision) {
    if (decision === "rejected" && !caseNote.trim()) {
      toast.error("Add a case note before returning this verification");
      setTab("decision");
      setMobileTab("decision");
      setSideOpen(true);
      return;
    }
    setReviewingCase(true);
    try {
      const response = await verificationService.reviewCase(item.id, { decision, note: caseNote });
      onChanged?.({ case: response.data.case });
      setFullscreen(false);
      toast.success(decision === "verified" ? "Verification approved" : "Returned to assignee");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not complete review");
    } finally {
      setReviewingCase(false);
    }
  }

  function toggleSideTab(next) {
    if (tab === next && sideOpen) {
      setSideOpen(false);
      return;
    }
    setTab(next);
    setSideOpen(true);
  }

  const canvas = (
    <DocumentCanvas
      file={preview}
      label={active?.label}
      fullscreen={fullscreen}
      onFullscreen={() => setFullscreen((open) => !open)}
      className="h-full min-h-0 w-full"
    />
  );

  const evidenceActions = ownSubmission ? null : (
    <div className="space-y-3">
      <Textarea label="Document note" value={docNote} onChange={(event) => setDocNote(event.target.value)} />
      <p className="text-xs text-muted">Required when returning this document.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" loading={reviewingDoc} onClick={() => decideDocument("verified")}>
          Verify
        </Button>
        <Button type="button" size="sm" variant="outline" loading={reviewingDoc} onClick={() => decideDocument("rejected")}>
          Return file
        </Button>
      </div>
    </div>
  );

  const evidenceBody = active ? (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{active.label}</h3>
        <Badge variant={verificationStatusVariant(active.status)}>{labelFor(VERIFICATION_DOCUMENT_STATUSES, active.status)}</Badge>
      </div>
      <EvidenceFacts doc={active} />
      {active.rejectionReason ? <Alert variant="danger">{active.rejectionReason}</Alert> : null}
      {evidenceActions}
    </div>
  ) : (
    <p className="text-sm text-muted">Select a document to review.</p>
  );

  const answersBody = item.definition ? (
    <FormRuntime
      definition={item.definition}
      mode="fill"
      initialValues={item.values || {}}
      readOnly
      hideFieldTypes={["file", "document"]}
      hideActions
    />
  ) : (
    <p className="text-sm text-muted">No questionnaire on this case.</p>
  );

  const decisionBody = (
    <div className="space-y-3">
      <p className="text-sm text-muted">Verify every required file, then approve. Returning unlocks the case for the assignee.</p>
      {!canApprove ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {progress.returned
            ? "A file is marked for return. Approve is blocked until you resolve it or return the case."
            : `${progress.remaining} file${progress.remaining === 1 ? "" : "s"} still need a decision.`}
        </p>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">All required files are verified. You can approve.</p>
      )}
      <Textarea label="Case note" value={caseNote} onChange={(event) => setCaseNote(event.target.value)} />
      <p className="text-xs text-muted">Required when returning the case.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={ownSubmission || !canApprove} loading={reviewingCase} onClick={() => decideCase("verified")}>
          Approve
        </Button>
        <Button type="button" variant="outline" disabled={ownSubmission} loading={reviewingCase} onClick={() => decideCase("rejected")}>
          Return case
        </Button>
      </div>
    </div>
  );

  const historyBody = timeline.length ? (
    <ol className="space-y-2 text-sm">
      {timeline.map((event, index) => (
        <li key={`${event.at}-${index}`} className="border-l-2 border-border pl-3">
          <p className="font-medium">{event.label}</p>
          {event.detail ? <p className="text-muted">{event.detail}</p> : null}
          <p className="text-xs text-muted">{formatDateTime(event.at)}</p>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-sm text-muted">No review activity yet.</p>
  );

  const panelBody = tab === "answers" ? answersBody : tab === "decision" ? decisionBody : tab === "history" ? historyBody : evidenceBody;

  const documentChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {documents.map((doc) => {
        const selected = doc.id === active?.id;
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => selectDocument(doc)}
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
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#111827]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-3 py-2 text-slate-100">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{active?.label || item.title}</p>
            <p className="truncate text-xs text-slate-400">
              {progress.verified}/{progress.total} verified · Esc to exit
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!ownSubmission && active ? (
              <>
                <Button type="button" size="sm" onClick={() => decideDocument("verified")} loading={reviewingDoc}>
                  Verify
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10" onClick={() => decideDocument("rejected")} loading={reviewingDoc}>
                  Return
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" variant="outline" className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10" onClick={() => setFullscreen(false)}>
              <X className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1">{canvas}</div>
        <div className="shrink-0 border-t border-white/10 bg-slate-950 px-3 py-2">{documentChips}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            <Link href={ROUTES.verification} className="hover:text-text">
              Review queue
            </Link>
            {" · "}
            <Link href={subjectHref} className="hover:text-text">
              {subjectName}
            </Link>
          </p>
          <h1 className="font-display text-xl font-semibold sm:text-2xl">{item.title}</h1>
          <p className="text-sm text-muted">
            {progress.verified}/{progress.total} verified
            {progress.remaining ? ` · ${progress.remaining} left` : ""}
            {progress.returned ? ` · ${progress.returned} to return` : ""}
            {item.dueAt ? ` · due ${formatDate(item.dueAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={verificationStatusVariant(item.status)}>{labelFor(VERIFICATION_CASE_STATUSES, item.status)}</Badge>
          <Button type="button" size="sm" variant="outline" className="hidden lg:inline-flex" onClick={() => setSideOpen((open) => !open)}>
            {sideOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            {sideOpen ? "Hide panel" : "Show panel"}
          </Button>
        </div>
      </div>

      {ownSubmission ? <Alert variant="warning">You submitted this case, so another reviewer must approve or return it.</Alert> : null}

      <Collapsible title="Documents" open={docsOpen} onToggle={() => setDocsOpen((open) => !open)} badge={<Badge variant="default">{documents.length}</Badge>}>
        {documentChips}
      </Collapsible>

      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:overflow-hidden lg:rounded-lg lg:border lg:border-border">
        <section className="min-h-[32rem] bg-[#111827] lg:min-h-0">{canvas}</section>
        {sideOpen ? (
          <aside className="flex w-[26rem] min-h-0 flex-col border-l border-border bg-surface">
            <Tabs tabs={DESKTOP_TABS} value={tab} onChange={toggleSideTab} size="sm" fill />
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{panelBody}</div>
          </aside>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface lg:hidden">
        <Tabs
          tabs={MOBILE_TABS.map((item) => ({ ...item, count: item.value === "evidence" && progress.remaining ? progress.remaining : undefined }))}
          value={mobileTab}
          onChange={setMobileTab}
          size="sm"
          fill
        />
        <div className={cn("min-h-0 flex-1 overflow-y-auto", mobileTab === "preview" && "overflow-hidden bg-[#111827]")}>
          {mobileTab === "preview" ? <div className="h-[70vh] min-h-[20rem]">{canvas}</div> : null}
          {mobileTab === "evidence" ? <div className="p-4">{evidenceBody}</div> : null}
          {mobileTab === "answers" ? <div className="p-4">{answersBody}</div> : null}
          {mobileTab === "decision" ? (
            <div className="space-y-4 p-4">
              {decisionBody}
              <Collapsible title="History" open={historyOpen} onToggle={() => setHistoryOpen((open) => !open)}>
                {historyBody}
              </Collapsible>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
