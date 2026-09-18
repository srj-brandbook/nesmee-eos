"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, FileCheck, Flag, Play } from "lucide-react";
import { verificationService } from "@/services/verificationService";
import { FormRuntime } from "@/components/form-builder/runtime/FormRuntime";
import { VerificationDocumentsStep } from "./VerificationDocumentsStep";
import { VerificationLog } from "./VerificationLog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { ROUTES, verificationCasePath } from "@/constants/routes";
import {
  documentReviewProgress,
  labelFor,
  REVIEWABLE_CASE_STATUSES,
  VERIFICATION_CASE_STATUSES,
  verificationStatusVariant,
} from "@/constants/verification";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDate } from "@/lib/utils";

const TABS = [
  { value: "start", label: "Start", icon: Play },
  { value: "information", label: "Information", icon: ClipboardList },
  { value: "documents", label: "Documents", icon: FileCheck },
  { value: "finish", label: "Decision", icon: Flag },
];

export function VerificationReviewWorkspace() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("start");
  const [started, setStarted] = useState(false);
  const [caseNote, setCaseNote] = useState("");
  const [reviewingCase, setReviewingCase] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await verificationService.get(params.caseId);
    setItem(response.data.case);
  }, [params.caseId]);

  useEffect(() => {
    load().catch((err) => setError(err.message || "Unable to load verification"));
  }, [load]);

  useEffect(() => {
    if (!item) return;
    if (!REVIEWABLE_CASE_STATUSES.includes(item.status) && item.status !== "verified" && item.status !== "rejected") {
      router.replace(verificationCasePath(item.id));
      return;
    }
    setStarted(true);
    setCaseNote(item.reviewNote || "");
    if (item.status === "verified" || item.status === "rejected") setTab("finish");
    else setTab("start");
  }, [item?.id, item?.status, router]);

  const applyUpdate = useCallback(
    (data) => {
      if (data?.case) {
        setItem(data.case);
        return;
      }
      load().catch((err) => toast.error(err.message || "Unable to refresh"));
    },
    [load, toast]
  );

  async function decideCase(decision) {
    if (decision === "rejected" && !caseNote.trim()) {
      toast.error("Add a case note before returning this verification");
      setTab("finish");
      return;
    }
    setReviewingCase(true);
    try {
      const response = await verificationService.reviewCase(item.id, { decision, note: caseNote });
      setItem(response.data.case);
      setTab("finish");
      toast.success(decision === "verified" ? "Verification approved" : "Returned to assignee");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not complete review");
    } finally {
      setReviewingCase(false);
    }
  }

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!item || !item.definition) return <Spinner label="Loading review" />;
  if (!REVIEWABLE_CASE_STATUSES.includes(item.status) && item.status !== "verified" && item.status !== "rejected") {
    return <Spinner label="Opening submission" />;
  }

  const isSuperAdmin = Boolean(user?.roles?.some((role) => role.isSuperAdmin));
  const ownSubmission = Boolean(item.submittedBy && String(item.submittedBy) === String(user?.id) && !isSuperAdmin);
  const canReview = REVIEWABLE_CASE_STATUSES.includes(item.status) && !ownSubmission;
  const progress = documentReviewProgress(item.documents || []);
  const canApprove = progress.remaining === 0 && progress.returned === 0;
  const supplierHref = item.lead?.stage === "won" ? `${ROUTES.suppliers}/${item.leadId}` : `${ROUTES.leads}/${item.leadId}`;
  const tabs = TABS.map((entry) => ({
    ...entry,
    count: entry.value === "documents" ? (item.documents || []).length : undefined,
  }));

  function changeTab(next) {
    if (next !== "start" && !started) {
      setTab("start");
      return;
    }
    setTab(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-muted">
            <Link href={ROUTES.verification} className="hover:text-text">
              Verification
            </Link>
            {" · Review"}
            {" · "}
            <Link href={supplierHref} className="hover:text-text">
              {item.lead?.name || "Supplier"}
            </Link>
          </p>
          <h1 className="font-display text-2xl font-semibold">{item.title}</h1>
          <p className="text-sm text-muted">
            Submitted by {item.submitter?.name || item.assignedTo?.name || "—"}
            {item.submittedAt ? ` · ${formatDate(item.submittedAt)}` : ""}
            {` · ${progress.verified}/${progress.total} verified`}
          </p>
        </div>
        <Badge variant={verificationStatusVariant(item.status)}>{labelFor(VERIFICATION_CASE_STATUSES, item.status)}</Badge>
      </div>

      {ownSubmission ? <Alert variant="warning">You submitted this case, so another reviewer must approve or return it.</Alert> : null}
      {item.status === "verified" ? <Alert variant="success">This verification is approved.</Alert> : null}
      {item.status === "rejected" && item.reviewNote ? <Alert variant="danger">{item.reviewNote}</Alert> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Tabs tabs={tabs} value={tab} onChange={changeTab} fill />
        <div className="p-4">
          {tab === "start" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">Read the submitted information, verify or return each document, then approve or reject with notes.</p>
              <ol className="space-y-2 text-sm">
                <li className="rounded-md border border-border px-3 py-2">1. Start this review</li>
                <li className="rounded-md border border-border px-3 py-2">2. Check the information form</li>
                <li className="rounded-md border border-border px-3 py-2">3. Verify or return each document</li>
                <li className="rounded-md border border-border px-3 py-2">4. Approve or reject with notes</li>
              </ol>
              <Button type="button" onClick={() => { setStarted(true); setTab("information"); }}>
                {item.status === "submitted" ? "Start review" : "View review"}
              </Button>
            </div>
          ) : null}

          {tab === "information" ? (
            <div className="space-y-4">
              <FormRuntime
                definition={item.definition}
                mode="fill"
                initialValues={item.values || {}}
                readOnly
                hideFieldTypes={["file", "document"]}
                hideActions
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => changeTab("documents")}>
                  Next: Documents
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "documents" ? (
            <div className="space-y-4">
              <VerificationDocumentsStep
                item={item}
                canFill={false}
                canReview={canReview}
                ownSubmission={ownSubmission}
                onChanged={applyUpdate}
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => changeTab("finish")}>
                  Next: Decision
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "finish" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">Verify every required file, then approve. Returning unlocks the case for submission again.</p>
              {!canReview ? (
                <p className="text-sm text-muted">This review is complete.</p>
              ) : !canApprove ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {progress.returned
                    ? "A file is marked for return. Approve is blocked until you resolve it or return the case."
                    : `${progress.remaining} file${progress.remaining === 1 ? "" : "s"} still need a decision.`}
                </p>
              ) : (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">All required files are verified. You can approve.</p>
              )}
              <Textarea label="Decision notes" value={caseNote} onChange={(event) => setCaseNote(event.target.value)} disabled={!canReview} />
              <p className="text-xs text-muted">Required when rejecting or returning the case.</p>
              {canReview ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={!canApprove} loading={reviewingCase} onClick={() => decideCase("verified")}>
                    Approve
                  </Button>
                  <Button type="button" variant="outline" loading={reviewingCase} onClick={() => decideCase("rejected")}>
                    Reject / return
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <VerificationLog item={item} open={logOpen} onToggle={() => setLogOpen((value) => !value)} />
    </div>
  );
}
