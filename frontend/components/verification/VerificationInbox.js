"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { verificationService } from "@/services/verificationService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { PERMISSIONS } from "@/constants/permissions";
import { Table } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import { verificationCasePath, verificationReviewPath } from "@/constants/routes";
import { labelFor, VERIFICATION_CASE_STATUSES, verificationStatusVariant } from "@/constants/verification";
import { formatDate } from "@/lib/utils";

const VIEWS = [
  { value: "mine", label: "My assignments" },
  { value: "review", label: "Pending review" },
  { value: "expiring", label: "Expiring" },
  { value: "all", label: "All" },
];

export function VerificationInbox() {
  const toast = useToast();
  const { can } = useAuth();
  const canReview = can(PERMISSIONS.VERIFICATION_REVIEW);
  const { page, setPage, limit } = usePagination({ page: 1, limit: 20 });
  const [view, setView] = useState(canReview ? "review" : "mine");
  const [status, setStatus] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  useEffect(() => {
    const params = { page, limit, sort: "-updatedAt" };
    if (view === "mine") params.assignedTo = "me";
    if (view === "review") params.status = "submitted";
    if (view === "expiring") params.expiring = "true";
    if (view === "all" && status) params.status = status;
    if (subjectType) params.subjectType = subjectType;
    verificationService
      .list(params)
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load verification"));
  }, [view, status, subjectType, page, limit]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Verification</h1>
        <p className="text-sm text-muted">Supplier and product cases. Submit on the assignment screen. Review submitted evidence separately.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Queue"
          value={view}
          onChange={(event) => {
            setView(event.target.value);
            setPage(1);
          }}
        >
          {VIEWS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select
          label="Subject"
          value={subjectType}
          onChange={(event) => {
            setSubjectType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Suppliers and products</option>
          <option value="lead">Suppliers</option>
          <option value="product">Products</option>
        </Select>
        {view === "all" ? (
          <Select
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {VERIFICATION_CASE_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        ) : null}
      </div>
      <Card>
        <Table
          empty="No verification cases in this queue"
          columns={[
            {
              key: "title",
              label: "Case",
              render: (row) => (
                <div>
                  <Link href={row.status === "submitted" && canReview ? verificationReviewPath(row.id) : verificationCasePath(row.id)} className="font-medium text-primary hover:underline">
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted">{row.product?.name || row.lead?.name || "Subject"}</p>
                </div>
              ),
            },
            {
              key: "assignedTo",
              label: "Assignee",
              render: (row) => row.assignedTo?.name || "—",
            },
            {
              key: "submittedAt",
              label: "Submitted",
              render: (row) => (row.submittedAt ? formatDate(row.submittedAt) : "—"),
            },
            {
              key: "dueAt",
              label: "Due",
              render: (row) => formatDate(row.dueAt),
            },
            {
              key: "docs",
              label: "Review progress",
              render: (row) => {
                const required = row.documentCounts?.required || 0;
                const verified = row.documentCounts?.verified || 0;
                const remaining = row.documentCounts?.submitted || Math.max(0, required - verified - (row.documentCounts?.rejected || 0));
                return `${verified}/${required} verified${remaining ? ` · ${remaining} left` : ""}`;
              },
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge variant={verificationStatusVariant(row.status)}>{labelFor(VERIFICATION_CASE_STATUSES, row.status)}</Badge>,
            },
            {
              key: "open",
              label: "",
              render: (row) => (
                <Link href={row.status === "submitted" && canReview ? verificationReviewPath(row.id) : verificationCasePath(row.id)}>
                  <Button size="sm" variant={row.status === "submitted" && canReview ? "primary" : "outline"}>
                    {row.status === "submitted" && canReview ? "Review" : "Open"}
                  </Button>
                </Link>
              ),
            },
          ]}
          rows={data.items}
        />
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}
