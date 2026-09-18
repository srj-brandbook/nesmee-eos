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
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { PAYMENT_METHODS, PAYMENT_STATUSES, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { formatDate } from "@/lib/utils";
import { ApiClientError } from "@/lib/api/apiClient";

export function PaymentTable() {
  const { can } = useAuth();
  const toast = useToast();
  const { value, setValue, debounced } = useDebouncedSearch();
  const { page, setPage, limit } = usePagination();
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [data, setData] = useState({ items: [], pagination: { page: 1, totalPages: 1 } });
  const [pending, setPending] = useState(null);

  async function load() {
    const response = await billingService.listPayments({ search: debounced, status, method, page, limit, sort: "-paidAt" });
    setData(response.data);
  }

  useEffect(() => {
    load().catch(() => toast.error("Unable to load payments"));
  }, [debounced, status, method, page, limit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted">Receipts for bank transfer, UPI, NEFT, RTGS, cheque, and cash.</p>
        </div>
        {can(PERMISSIONS.PAYMENTS_CREATE) ? (
          <Link href={`${ROUTES.billingPayments}/new`}>
            <Button>New receipt</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input label="Search" value={value} placeholder="Receipt, invoice, UTR, cheque" onChange={(event) => { setValue(event.target.value); setPage(1); }} />
        <Select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {PAYMENT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Select label="Method" value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}>
          <option value="">All</option>
          {PAYMENT_METHODS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <Card>
        {data.items.length === 0 ? (
          <EmptyState title="No receipts" description="Record a bank transfer, UPI, NEFT, cheque, or cash against an issued invoice." />
        ) : (
          <Table
            columns={[
              {
                key: "paymentNumber",
                label: "Receipt",
                render: (row) => (
                  <Link href={`${ROUTES.billingPayments}/${row.id}`} className="font-medium text-primary">
                    {row.paymentNumber}
                  </Link>
                ),
              },
              {
                key: "invoice",
                label: "Invoice",
                render: (row) =>
                  row.invoiceId ? (
                    <Link href={`${ROUTES.billingInvoices}/${row.invoiceId}`} className="text-primary">
                      {row.invoiceNumber || row.invoice?.invoiceNumber || "—"}
                    </Link>
                  ) : (
                    row.invoiceNumber || "—"
                  ),
              },
              { key: "lead", label: "Received from", render: (row) => row.receivedFrom?.legalName || row.receivedFrom?.name || row.lead?.name || "—" },
              { key: "method", label: "Mode", render: (row) => labelFor(PAYMENT_METHODS, row.method) },
              {
                key: "reference",
                label: "Instrument",
                render: (row) => row.instrument?.transactionId || row.instrument?.chequeNumber || row.reference || "—",
              },
              { key: "paidAt", label: "Received on", render: (row) => formatDate(row.paidAt) },
              { key: "amount", label: "Amount", render: (row) => formatInr(row.amount, row.currency) },
              {
                key: "status",
                label: "Status",
                render: (row) => <Badge variant={billingStatusVariant(row.status)}>{labelFor(PAYMENT_STATUSES, row.status)}</Badge>,
              },
              {
                key: "actions",
                label: "",
                render: (row) => (
                  <div className="flex flex-wrap gap-3">
                    <Link href={`${ROUTES.billingPayments}/${row.id}`} className="text-sm text-primary">
                      View
                    </Link>
                    <Link href={`${ROUTES.billingPayments}/${row.id}/print`} className="text-sm text-primary">
                      Print
                    </Link>
                    {row.status === "recorded" && can(PERMISSIONS.PAYMENTS_REVERSE) ? (
                      <button type="button" className="text-sm text-danger" onClick={() => setPending(row)}>
                        Reverse
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={data.items}
          />
        )}
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPage={setPage} />
      </Card>
      <ConfirmationDialog
        open={Boolean(pending)}
        title="Reverse payment"
        description={`Reverse ${pending?.paymentNumber}? The invoice balance will be restored.`}
        confirmLabel="Reverse"
        onClose={() => setPending(null)}
        onConfirm={async () => {
          try {
            await billingService.reversePayment(pending.id);
            toast.success("Payment reversed");
            setPending(null);
            load();
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : "Could not reverse");
          }
        }}
      />
    </div>
  );
}
