"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { PaymentReceipt } from "@/components/billing/PaymentReceipt";
import { PAYMENT_METHODS, PAYMENT_STATUSES, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/lib/api/apiClient";

export function PaymentDetail({ paymentId }) {
  const toast = useToast();
  const { can } = useAuth();
  const [data, setData] = useState(null);
  const [voidOpen, setVoidOpen] = useState(false);

  useEffect(() => {
    billingService
      .printPayment(paymentId)
      .then((response) => setData(response.data))
      .catch(() => toast.error("Unable to load receipt"));
  }, [paymentId, toast]);

  if (!data) return <p className="text-sm text-muted">Loading receipt…</p>;
  const { payment, invoice, settings } = data;
  const currency = payment.currency || invoice?.currency || "INR";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Payment receipt</p>
          <h1 className="font-display text-2xl font-semibold">{payment.paymentNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {labelFor(PAYMENT_METHODS, payment.method)} · {formatInr(payment.amount, currency)}
            {invoice?.invoiceNumber ? ` · ${invoice.invoiceNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={billingStatusVariant(payment.status)}>{labelFor(PAYMENT_STATUSES, payment.status)}</Badge>
            {payment.amountDueAfter === 0 && payment.status === "recorded" ? <Badge variant="success">Invoice cleared</Badge> : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`${ROUTES.billingPayments}/${payment.id}/print`}>
              <Button variant="outline">Print receipt</Button>
            </Link>
            {invoice?.id ? (
              <Link href={`${ROUTES.billingInvoices}/${invoice.id}`}>
                <Button variant="outline">Open invoice</Button>
              </Link>
            ) : null}
            {payment.status === "recorded" && ["issued", "partial", "overdue"].includes(invoice?.status) && can(PERMISSIONS.PAYMENTS_CREATE) ? (
              <Link href={`${ROUTES.billingPayments}/new?invoiceId=${invoice.id}`}>
                <Button variant="outline">Another receipt</Button>
              </Link>
            ) : null}
            {payment.status === "recorded" && can(PERMISSIONS.PAYMENTS_REVERSE) ? (
              <Button variant="danger" onClick={() => setVoidOpen(true)}>
                Reverse
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <PaymentReceipt settings={settings} payment={payment} invoice={invoice} className="overflow-hidden rounded-lg border border-slate-200" />

      {payment.files?.length ? (
        <div className="print:hidden">
          <p className="mb-2 text-sm font-semibold">Proof</p>
          <ul className="space-y-2 text-sm">
            {payment.files.map((file) => (
              <li key={file.publicId || file.url}>
                <a href={file.url} target="_blank" rel="noreferrer" className="text-primary underline">
                  {file.name || "Open attachment"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmationDialog
        open={voidOpen}
        title="Reverse receipt"
        description={`Reverse ${payment.paymentNumber}? The invoice balance will be restored.`}
        confirmLabel="Reverse"
        onClose={() => setVoidOpen(false)}
        onConfirm={async () => {
          setVoidOpen(false);
          try {
            await billingService.reversePayment(payment.id);
            const printed = await billingService.printPayment(payment.id);
            setData(printed.data);
            toast.success("Payment reversed");
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : "Could not reverse");
          }
        }}
      />
    </div>
  );
}
