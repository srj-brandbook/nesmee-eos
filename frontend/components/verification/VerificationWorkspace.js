"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES, verificationReviewPath } from "@/constants/routes";
import {
  FILLABLE_CASE_STATUSES,
  labelFor,
  REVIEWABLE_CASE_STATUSES,
  VERIFICATION_CASE_STATUSES,
  verificationStatusVariant,
} from "@/constants/verification";
import { evaluateRules } from "@/lib/form-builder/engine";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDate } from "@/lib/utils";

const DocumentCaptureStage = dynamic(
  () => import("./DocumentCaptureStage").then((mod) => ({ default: mod.DocumentCaptureStage })),
  { ssr: false }
);

const TABS = [
  { value: "start", label: "Start", icon: Play },
  { value: "information", label: "Information", icon: ClipboardList },
  { value: "documents", label: "Documents", icon: FileCheck },
  { value: "finish", label: "Submit", icon: Flag },
];

function visibleFormErrors(definition, derived, errors) {
  const fields = Object.fromEntries((definition?.fields || []).map((field) => [field.key, field]));
  const next = {};
  for (const [key, message] of Object.entries(errors || {})) {
    const field = fields[key];
    if (field && ["file", "document"].includes(field.type)) continue;
    if (derived?.fields?.[key]?.visible === false) continue;
    next[key] = message;
  }
  return next;
}

export function VerificationWorkspace() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { can, user } = useAuth();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("start");
  const [started, setStarted] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [documentErrors, setDocumentErrors] = useState({});
  const [logOpen, setLogOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await verificationService.get(params.caseId);
    setItem(response.data.case);
  }, [params.caseId]);

  useEffect(() => {
    load().catch((err) => setError(err.message || "Unable to load verification"));
  }, [load]);

  const assigneeId = item?.assignedTo?.id || item?.assignedToId;
  const isSuperAdmin = Boolean(user?.roles?.some((role) => role.isSuperAdmin));
  const ownSubmission = Boolean(item?.submittedBy && String(item.submittedBy) === String(user?.id) && !isSuperAdmin);
  const canReviewSubmitted = Boolean(
    item &&
      REVIEWABLE_CASE_STATUSES.includes(item.status) &&
      can(PERMISSIONS.VERIFICATION_REVIEW) &&
      !ownSubmission
  );
  const canFill = Boolean(
    item &&
      FILLABLE_CASE_STATUSES.includes(item.status) &&
      (isSuperAdmin || (can(PERMISSIONS.VERIFICATION_SUBMIT) && String(user?.id) === String(assigneeId)))
  );

  useEffect(() => {
    if (!item) return;
    if (canReviewSubmitted) {
      router.replace(verificationReviewPath(item.id));
      return;
    }
    setStarted(item.status !== "assigned");
    if (item.status === "assigned") setTab("start");
    else if (item.status === "rejected" || item.status === "expired") setTab("documents");
    else if (item.status === "submitted" || item.status === "verified") setTab("finish");
    else setTab("information");
    setFormValues(item.values || {});
  }, [item?.id, item?.status, canReviewSubmitted, router]);

  const applyDocumentUpdate = useCallback(
    (data) => {
      if (data?.case) {
        setItem(data.case);
        if (data.document) {
          setActiveDoc((current) => (current?.id === data.document.id ? data.document : current));
        }
        return;
      }
      load().catch((err) => toast.error(err.message || "Unable to refresh"));
    },
    [load, toast]
  );

  const saveDraft = useCallback(
    async (values = formValues, { silent = false } = {}) => {
      if (!item?.id) return null;
      setSavingDraft(true);
      try {
        const response = await verificationService.saveDraft(item.id, { values });
        setItem(response.data.case);
        if (!silent) toast.success("Draft saved");
        return response.data.case;
      } catch (err) {
        toast.error(err instanceof ApiClientError ? err.message : "Could not save draft");
        return null;
      } finally {
        setSavingDraft(false);
      }
    },
    [formValues, item?.id, toast]
  );

  const submit = useCallback(async () => {
    if (!item?.id) return;
    const evaluated = evaluateRules({ definition: item.definition, values: formValues || item.values || {} });
    const formErrors = visibleFormErrors(item.definition, evaluated.derived, evaluated.errors);
    if (Object.keys(formErrors).length) {
      setShowFormErrors(true);
      setTab("information");
      toast.error("Complete the information form before submitting");
      return;
    }
    setSubmitting(true);
    setDocumentErrors({});
    try {
      const response = await verificationService.submit(item.id, { values: evaluated.values });
      setItem(response.data.case);
      toast.success("Submitted for review");
    } catch (err) {
      if (err instanceof ApiClientError) {
        const fields = err.fields || {};
        const hasDocument = Object.keys(fields).some((key) => (item.documents || []).some((doc) => key === doc.documentKey || key.startsWith(`${doc.documentKey}_`)));
        setDocumentErrors(fields);
        toast.error(err.message);
        if (hasDocument) setTab("documents");
        else {
          setShowFormErrors(true);
          setTab("information");
        }
      } else {
        toast.error("Could not submit");
      }
    } finally {
      setSubmitting(false);
    }
  }, [formValues, item, toast]);

  async function startSubmission() {
    if (canFill) {
      const next = await saveDraft(formValues || item.values || {}, { silent: true });
      if (!next) return;
    }
    setStarted(true);
    setTab("information");
  }

  function errorsForDocument(doc) {
    return Object.entries(documentErrors)
      .filter(([key]) => key === doc.documentKey || key.startsWith(`${doc.documentKey}_`))
      .map(([, message]) => message);
  }

  const documents = item?.documents || [];
  const uploadedCount = documents.filter((doc) => Array.isArray(doc.files) && doc.files.length).length;

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!item || !item.definition) return <Spinner label="Loading submission" />;
  if (canReviewSubmitted) return <Spinner label="Opening review" />;

  const readOnly = !canFill;
  const supplierHref = item.lead?.stage === "won" ? `${ROUTES.suppliers}/${item.leadId}` : `${ROUTES.leads}/${item.leadId}`;
  const unlocked = started || item.status !== "assigned";
  const tabs = TABS.map((entry) => ({
    ...entry,
    count: entry.value === "documents" ? documents.length : undefined,
  }));

  function changeTab(next) {
    if (next !== "start" && !unlocked) {
      toast.error("Start submission first");
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
            {" · Submission"}
            {" · "}
            <Link href={supplierHref} className="hover:text-text">
              {item.lead?.name || "Supplier"}
            </Link>
          </p>
          <h1 className="font-display text-2xl font-semibold">{item.title}</h1>
          <p className="text-sm text-muted">
            Assigned to {item.assignedTo?.name || "—"}
            {item.dueAt ? ` · due ${formatDate(item.dueAt)}` : ""}
            {documents.length ? ` · ${uploadedCount}/${documents.length} files` : ""}
          </p>
        </div>
        <Badge variant={verificationStatusVariant(item.status)}>{labelFor(VERIFICATION_CASE_STATUSES, item.status)}</Badge>
      </div>

      {item.status === "submitted" ? (
        <Alert variant="warning">This submission is locked while it is in review.</Alert>
      ) : null}
      {item.status === "verified" ? <Alert variant="success">This verification is approved. Documents stay on file until they expire.</Alert> : null}
      {item.status === "rejected" && item.reviewNote ? <Alert variant="danger">{item.reviewNote}</Alert> : null}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Tabs tabs={tabs} value={tab} onChange={changeTab} fill />
        <div className="p-4">
          {tab === "start" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">Fill the information form, upload the required documents, then submit for verification.</p>
              {item.description ? <p className="text-sm">{item.description}</p> : null}
              <ol className="space-y-2 text-sm">
                <li className="rounded-md border border-border px-3 py-2">1. Start this submission</li>
                <li className="rounded-md border border-border px-3 py-2">2. Complete the information form</li>
                <li className="rounded-md border border-border px-3 py-2">3. Upload and complete each document</li>
                <li className="rounded-md border border-border px-3 py-2">4. Submit for verification</li>
              </ol>
              {canFill ? (
                <Button type="button" loading={savingDraft} onClick={startSubmission}>
                  {unlocked ? "Continue" : "Start submission"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLogOpen(true);
                    requestAnimationFrame(() => document.getElementById("verification-activity")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }}
                >
                  View activity
                </Button>
              )}
            </div>
          ) : null}

          <div className={tab === "information" ? "block" : "hidden"}>
            <FormRuntime
              definition={item.definition}
              mode="fill"
              initialValues={item.values || {}}
              readOnly={readOnly}
              submitting={false}
              savingDraft={savingDraft}
              hideFieldTypes={["file", "document"]}
              hideActions
              showAllErrors={showFormErrors}
              onValuesChange={setFormValues}
              onSaveDraft={canFill ? (result) => saveDraft(result.values) : undefined}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {canFill ? (
                <Button type="button" variant="outline" loading={savingDraft} onClick={() => saveDraft(formValues)}>
                  Save draft
                </Button>
              ) : null}
              <Button type="button" onClick={() => changeTab("documents")}>
                Next: Documents
              </Button>
            </div>
          </div>

          {tab === "documents" ? (
            <div className="space-y-4">
              <VerificationDocumentsStep
                item={item}
                canFill={canFill}
                canReview={false}
                ownSubmission={false}
                documentErrors={documentErrors}
                onOpen={setActiveDoc}
                onChanged={applyDocumentUpdate}
                errorsForDocument={errorsForDocument}
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => changeTab("finish")}>
                  Next: Submit
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "finish" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                {readOnly
                  ? "This case is not open for submission."
                  : "Submit when the information form and required documents are complete. A reviewer will verify it on a separate screen."}
              </p>
              <ul className="space-y-1 text-sm">
                <li>Information form: {readOnly ? "locked" : "ready to submit"}</li>
                <li>
                  Documents: {uploadedCount}/{documents.length} uploaded
                </li>
              </ul>
              {canFill ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" loading={savingDraft} onClick={() => saveDraft(formValues)}>
                    Save draft
                  </Button>
                  <Button type="button" loading={submitting} onClick={submit}>
                    Submit for verification
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <VerificationLog item={item} open={logOpen} onToggle={() => setLogOpen((value) => !value)} />

      <DocumentCaptureStage
        open={Boolean(activeDoc)}
        document={activeDoc}
        caseItem={item}
        canFill={canFill}
        onClose={() => setActiveDoc(null)}
        onChanged={applyDocumentUpdate}
      />
    </div>
  );
}
