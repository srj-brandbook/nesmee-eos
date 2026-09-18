"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { verificationService } from "@/services/verificationService";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignVerificationModal } from "./AssignVerificationModal";
import { DocumentCaptureStage } from "./DocumentCaptureStage";
import { CreateJobFromGapModal } from "@/components/billing/CreateJobFromGapModal";
import { PERMISSIONS } from "@/constants/permissions";
import { verificationCasePath, verificationReviewPath } from "@/constants/routes";
import {
  labelFor,
  FILLABLE_CASE_STATUSES,
  VERIFICATION_CASE_STATUSES,
  VERIFICATION_DOCUMENT_STATUSES,
  LEAD_VERIFICATION_STATUSES,
  verificationStatusVariant,
} from "@/constants/verification";
import { formatDate } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

export function VerificationPanel({ leadId, leadStage }) {
  const toast = useToast();
  const { can, user } = useAuth();
  const [data, setData] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [gap, setGap] = useState(null);

  async function load() {
    const response = await verificationService.summary(leadId);
    setData(response.data);
    if (can(PERMISSIONS.SERVICES_JOBS_VIEW)) {
      try {
        const gapsRes = await billingService.jobGaps(leadId);
        setGaps(gapsRes.data.items || []);
      } catch {
        setGaps([]);
      }
    }
  }

  useEffect(() => {
    if (!leadId || !can(PERMISSIONS.VERIFICATION_VIEW)) return;
    load().catch(() => toast.error("Unable to load verification"));
  }, [leadId]);

  if (!can(PERMISSIONS.VERIFICATION_VIEW)) {
    return <p className="text-sm text-muted">You do not have access to supplier verification.</p>;
  }
  if (!data) return <p className="text-sm text-muted">Loading verification…</p>;

  const canAssign = can(PERMISSIONS.VERIFICATION_ASSIGN) && ["converted", "won"].includes(leadStage);
  const activeCase = (data.cases || []).find((item) => item.id === activeDoc?.caseId);
  const isSuperAdmin = Boolean(user?.roles?.some((role) => role.isSuperAdmin));
  const assigneeId = activeCase?.assignedTo?.id || activeCase?.assignedToId;
  const canFill = Boolean(
    activeCase &&
      FILLABLE_CASE_STATUSES.includes(activeCase.status) &&
      (isSuperAdmin || (can(PERMISSIONS.VERIFICATION_SUBMIT) && String(user?.id) === String(assigneeId)))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Verification status</h2>
            <p className="text-xs text-muted">Permits and certificates on this supplier</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={verificationStatusVariant(data.status)}>{labelFor(LEAD_VERIFICATION_STATUSES, data.status)}</Badge>
            {canAssign ? <Button size="sm" onClick={() => setAssignOpen(true)}>Request verification</Button> : null}
          </div>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <div>
              <dt className="text-xs text-muted">Required</dt>
              <dd className="font-medium">{data.summary?.required || 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Verified</dt>
              <dd className="font-medium">{data.summary?.verified || 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Pending</dt>
              <dd className="font-medium">{data.summary?.pending || 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Expired</dt>
              <dd className="font-medium">{data.summary?.expired || 0}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Expiring soon</dt>
              <dd className="font-medium">{data.summary?.expiringSoon || 0}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Cases</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(data.cases || []).length ? (
            data.cases.map((item) => (
              <Link
                key={item.id}
                href={item.status === "submitted" && can(PERMISSIONS.VERIFICATION_REVIEW) ? verificationReviewPath(item.id) : verificationCasePath(item.id)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-primary"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.assignedTo?.name || "Unassigned"}
                    {item.dueAt ? ` · due ${formatDate(item.dueAt)}` : ""}
                  </p>
                </div>
                <Badge variant={verificationStatusVariant(item.status)}>{labelFor(VERIFICATION_CASE_STATUSES, item.status)}</Badge>
              </Link>
            ))
          ) : (
            <EmptyState
              title="No verification yet"
              description="Assign a published verification form to collect permits and certificates."
              actionLabel={canAssign ? "Request verification" : undefined}
              onAction={canAssign ? () => setAssignOpen(true) : undefined}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Document registry</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(data.documents || []).length ? (
            data.documents.map((doc) => {
              const docGap = gaps.find((item) => item.documentId === doc.id || item.documentKey === doc.documentKey);
              return (
                <div key={doc.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                  <button type="button" onClick={() => setActiveDoc(doc)} className="min-w-0 flex-1 text-left hover:text-primary">
                    <p className="font-medium">{doc.title || doc.label}</p>
                    <p className="text-xs text-muted">
                      Issued {formatDate(doc.issuedAt)} · Expires {formatDate(doc.expiresAt)}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge variant={verificationStatusVariant(doc.status)}>{labelFor(VERIFICATION_DOCUMENT_STATUSES, doc.status)}</Badge>
                    {docGap && can(PERMISSIONS.SERVICES_JOBS_CREATE) ? (
                      <Button size="sm" variant="outline" onClick={() => setGap(docGap)}>
                        Sell as service
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted">No documents uploaded yet.</p>
          )}
        </CardBody>
      </Card>

      <AssignVerificationModal open={assignOpen} leadId={leadId} onClose={() => setAssignOpen(false)} onAssigned={load} />
      <CreateJobFromGapModal open={Boolean(gap)} leadId={leadId} gap={gap} onClose={() => setGap(null)} onCreated={load} />
      <DocumentCaptureStage
        open={Boolean(activeDoc)}
        document={activeDoc}
        caseItem={activeCase}
        onClose={() => setActiveDoc(null)}
        onChanged={(payload) => {
          if (payload?.document) setActiveDoc(payload.document);
          load().catch((err) => toast.error(err instanceof ApiClientError ? err.message : "Unable to refresh"));
        }}
        canFill={canFill}
      />
    </div>
  );
}
