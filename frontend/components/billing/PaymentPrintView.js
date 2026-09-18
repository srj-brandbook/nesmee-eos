"use client";

import { useEffect, useState } from "react";
import { billingService } from "@/services/billingService";
import { PaymentReceipt } from "@/components/billing/PaymentReceipt";

export function PaymentPrintView({ paymentId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    billingService.printPayment(paymentId).then((response) => setData(response.data)).catch(() => {});
  }, [paymentId]);

  useEffect(() => {
    document.body.classList.add("bg-white");
    return () => document.body.classList.remove("bg-white");
  }, []);

  if (!data) return <p className="p-8 text-sm text-muted">Loading receipt…</p>;
  const { payment, invoice, settings } = data;

  return (
    <div className="mx-auto max-w-4xl bg-white text-slate-900 print:max-w-none">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Payment receipt</p>
          <p className="font-display text-lg font-semibold">{payment.paymentNumber}</p>
        </div>
        <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <PaymentReceipt settings={settings} payment={payment} invoice={invoice} className="print:shadow-none" />
    </div>
  );
}
