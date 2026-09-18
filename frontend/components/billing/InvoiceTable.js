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
import { INVOICE_STATUSES, INVOICE_TYPES, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { formatDate } from "@/lib/utils";

export function InvoiceTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });

  useEffect(() => {
    billingService
      .listInvoices({ search: debounced, status, type, page, limit, sort: "-createdAt" })
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load invoices"));
  }, [debounced, status, type, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted">GST tax invoices and credit notes issued to suppliers.</p>
        </div>
        {can(PERMISSIONS.INVOICES_CREATE) ? (
          <Link href={`${ROUTES.billingInvoices}/new`}>
            <Button>New invoice</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {INVOICE_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select label="Type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {INVOICE_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        {data.items.length === 0 ? (
          <EmptyState title="No invoices" description="Create a draft from a confirmed job or as an ad-hoc bill." />
        ) : (
          <Table
            columns={[
              { key: "invoiceNumber", label: "Number", render: (row) => row.invoiceNumber || "Draft" },
              { key: "type", label: "Type", render: (row) => labelFor(INVOICE_TYPES, row.type) },
              { key: "customer", label: "Bill to", render: (row) => row.billTo?.name || row.lead?.name || "—" },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge variant={billingStatusVariant(row.status)}>{labelFor(INVOICE_STATUSES, row.status)}</Badge>,
              },
              { key: "dueAt", label: "Due", render: (row) => formatDate(row.dueAt) },
              { key: "grandTotal", label: "Total", render: (row) => formatInr(row.grandTotal, row.currency) },
              { key: "amountDue", label: "Due amount", render: (row) => formatInr(row.amountDue, row.currency) },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <Link href={`${ROUTES.billingInvoices}/${row.id}`} className="text-sm text-primary">
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
