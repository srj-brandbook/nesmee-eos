"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { billingService } from "@/services/billingService";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { JOB_STATUSES, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { formatDate } from "@/lib/utils";

export function JobTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  useEffect(() => {
    billingService
      .listJobs({ search: debounced, status, page, limit, sort: "-createdAt" })
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load jobs"));
  }, [debounced, status, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Service jobs</h1>
          <p className="text-sm text-muted">Work orders to obtain certificates for suppliers.</p>
        </div>
        {can(PERMISSIONS.SERVICES_JOBS_CREATE) ? (
          <Link href={`${ROUTES.billingJobs}/new`}>
            <Button>New job</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {JOB_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        {data.items.length === 0 ? (
          <EmptyState title="No jobs" description="Create a job from the catalog or from a missing certificate on a supplier." />
        ) : (
          <Table
            columns={[
              { key: "jobNumber", label: "Job" },
              { key: "lead", label: "Supplier", render: (row) => row.lead?.name || "—" },
              { key: "assignee", label: "Assignee", render: (row) => row.assignee?.name || "—" },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge variant={billingStatusVariant(row.status)}>{labelFor(JOB_STATUSES, row.status)}</Badge>,
              },
              { key: "dueAt", label: "Due", render: (row) => formatDate(row.dueAt) },
              { key: "grandTotal", label: "Value", render: (row) => formatInr(row.grandTotal, row.currency) },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Link href={`${ROUTES.billingJobs}/${row.id}`} className="text-sm text-primary">
                    Open
                  </Link>
                ),
              },
            ]}
            rows={data.items}
          />
        )}
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
    </div>
  );
}
