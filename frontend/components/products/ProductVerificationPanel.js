"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { verificationService } from "@/services/verificationService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssignVerificationModal } from "@/components/verification/AssignVerificationModal";
import { PERMISSIONS } from "@/constants/permissions";
import { verificationCasePath, verificationReviewPath } from "@/constants/routes";
import {
  labelFor,
  VERIFICATION_CASE_STATUSES,
  VERIFICATION_DOCUMENT_STATUSES,
  LEAD_VERIFICATION_STATUSES,
  verificationStatusVariant,
} from "@/constants/verification";
import { formatDate } from "@/lib/utils";

export function ProductVerificationPanel({ product, onChanged }) {
  const toast = useToast();
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);

  async function load() {
    const response = await verificationService.productSummary(product.id);
    setData(response.data);
  }

  useEffect(() => {
    if (!product?.id || !can(PERMISSIONS.VERIFICATION_VIEW)) return;
    load().catch(() => toast.error("Unable to load product verification"));
  }, [product?.id]);

  if (!can(PERMISSIONS.VERIFICATION_VIEW)) {
    return <p className="text-sm text-muted">You do not have access to product verification.</p>;
  }
  if (!data) return <p className="text-sm text-muted">Loading verification…</p>;

  const canAssign = (can(PERMISSIONS.VERIFICATION_ASSIGN) || can(PERMISSIONS.PRODUCTS_SUBMIT)) && Boolean(product.supplierId) && product.status !== "archived";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Product verification</h2>
            <p className="text-xs text-muted">Form Builder questionnaire plus document evidence</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={verificationStatusVariant(data.status)}>
              {product.origin === "migrated" && data.status === "none" ? "Legacy — not catalog-verified" : labelFor(LEAD_VERIFICATION_STATUSES, data.status)}
            </Badge>
            {canAssign ? <Button size="sm" onClick={() => setAssignOpen(true)}>Start verification</Button> : null}
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
              title="No product verification yet"
              description={product.supplierId ? "Assign a published product verification form to collect evidence." : "Assign a verified supplier before starting verification."}
              actionLabel={canAssign ? "Start verification" : undefined}
              onAction={canAssign ? () => setAssignOpen(true) : undefined}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold">Evidence documents</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(data.documents || []).length ? (
            data.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div>
                  <p className="font-medium">{doc.title || doc.label}</p>
                  <p className="text-xs text-muted">Expires {formatDate(doc.expiresAt)}</p>
                </div>
                <Badge variant={verificationStatusVariant(doc.status)}>{labelFor(VERIFICATION_DOCUMENT_STATUSES, doc.status)}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No evidence uploaded yet.</p>
          )}
        </CardBody>
      </Card>

      <AssignVerificationModal
        open={assignOpen}
        productId={product.id}
        purpose="product_verification"
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          load();
          onChanged?.();
        }}
      />
    </div>
  );
}
