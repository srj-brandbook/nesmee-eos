"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formService } from "@/services/formService";
import { useToast } from "@/contexts/ToastProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Table } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { usePagination } from "@/hooks/usePagination";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES, directoryProfilePath, onboardingSubjectPath } from "@/constants/routes";
import { labelFor, ONBOARDING_PURPOSES, ONBOARDING_STATUSES, onboardingStatusVariant } from "@/constants/forms";
import { ApiClientError } from "@/lib/api/apiClient";
import { formatDateTime } from "@/lib/utils";

export function OnboardingInbox() {
  const toast = useToast();
  const router = useRouter();
  const { can } = useAuth();
  const { page, setPage, limit } = usePagination({ page: 1, limit: 20 });
  const [status, setStatus] = useState("submitted");
  const [purpose, setPurpose] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await formService.onboarding.list({ status, purpose, page, limit, sort: "-updatedAt" });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load onboarding"));
  }, [status, purpose, page, limit]);

  function canReviewItem(row) {
    if (row.subjectType === "lead") return can(PERMISSIONS.LEADS_CONVERT);
    if (row.subjectType === "buyer") return can(PERMISSIONS.EXPORT_BUYERS_UPDATE);
    return false;
  }

  async function decide(decision) {
    if (!pending) return;
    setLoading(true);
    try {
      await formService.onboarding.review(pending.id, { decision, note });
      toast.success(decision === "approved" ? "Approved" : "Returned");
      const destination =
        decision === "approved" ? directoryProfilePath(pending.subjectType, pending.subjectId) : null;
      setPending(null);
      setNote("");
      if (destination) {
        router.push(destination);
        return;
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Onboarding review</h1>
        <p className="text-sm text-muted">Supplier and distributor forms waiting for staff review.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {ONBOARDING_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select label="Purpose" value={purpose} onChange={(event) => { setPurpose(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {ONBOARDING_PURPOSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        <Table
          empty="No onboarding records."
          rows={data.items}
          columns={[
            {
              key: "subject",
              label: "Record",
              render: (row) =>
                row.subjectId ? (
                  <Link className="text-primary" href={onboardingSubjectPath(row)}>
                    {row.subject?.name || (row.subjectType === "lead" ? "Lead" : "Distributor")}
                  </Link>
                ) : (
                  "—"
                ),
            },
            {
              key: "purpose",
              label: "Type",
              render: (row) => (row.purpose === "supplier_onboarding" ? "Supplier" : "Distributor"),
            },
            { key: "form", label: "Form", render: (row) => row.form?.name || "—" },
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge variant={onboardingStatusVariant(row.status)}>{labelFor(ONBOARDING_STATUSES, row.status)}</Badge>,
            },
            { key: "updatedAt", label: "Updated", render: (row) => formatDateTime(row.updatedAt) },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex justify-end gap-2">
                  <Link href={`${ROUTES.onboarding}/${row.id}`} className="text-sm text-primary">
                    Open
                  </Link>
                  {row.status === "submitted" && canReviewItem(row) ? (
                    <button type="button" className="text-sm text-primary" onClick={() => setPending(row)}>
                      Review
                    </button>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
        <div className="p-4">
          <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
        </div>
      </Card>
      <Modal open={Boolean(pending)} title="Review onboarding" onClose={() => setPending(null)}>
        <p className="text-sm text-muted">{pending?.subject?.name} · {pending?.form?.name}</p>
        <div className="mt-4">
          <Textarea label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button variant="outline" loading={loading} onClick={() => decide("rejected")}>
            Reject
          </Button>
          <Button loading={loading} onClick={() => decide("approved")}>
            Approve
          </Button>
        </div>
      </Modal>
    </div>
  );
}
