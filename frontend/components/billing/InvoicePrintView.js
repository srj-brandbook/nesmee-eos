"use client";

import { useEffect, useState } from "react";
import { billingService } from "@/services/billingService";
import { InvoicePaper } from "@/components/billing/InvoicePaper";

export function InvoicePrintView({ invoiceId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    billingService.printInvoice(invoiceId).then((response) => setData(response.data)).catch(() => {});
  }, [invoiceId]);

  useEffect(() => {
    document.body.classList.add("bg-white");
    return () => document.body.classList.remove("bg-white");
  }, []);

  if (!data) return <p className="p-8 text-sm text-muted">Loading invoice…</p>;
  const { invoice, settings } = data;

  return (
    <div className="mx-auto max-w-4xl bg-white text-slate-900 print:max-w-none">
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{invoice.type === "credit_note" ? "Credit note" : "Tax invoice"}</p>
          <p className="font-display text-lg font-semibold">{invoice.invoiceNumber || "DRAFT"}</p>
        </div>
        <button type="button" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <InvoicePaper settings={settings} invoice={invoice} className="print:shadow-none" />
    </div>
  );
}
