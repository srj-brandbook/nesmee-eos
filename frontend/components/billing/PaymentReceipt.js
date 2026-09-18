import { PAYMENT_METHODS, PAYMENT_STATUSES, formatInr, labelFor } from "@/constants/billing";
import { amountInWords } from "@/lib/invoiceMath";
import { cn, formatDate } from "@/lib/utils";

function partyLines(party = {}) {
  return [party.address, [party.city, party.state, party.pincode].filter(Boolean).join(", "), party.country].filter(Boolean);
}

function instrumentRows(payment = {}) {
  const instrument = payment.instrument || {};
  const method = payment.method;
  const rows = [{ label: "Mode", value: labelFor(PAYMENT_METHODS, method) }];
  if (instrument.transactionId) {
    rows.push({
      label: method === "upi" ? "UPI reference" : method === "neft" || method === "rtgs" ? "UTR" : "Transaction ID",
      value: instrument.transactionId,
    });
  } else if (payment.reference) {
    rows.push({ label: "Reference", value: payment.reference });
  }
  if (instrument.upiVpa) rows.push({ label: "Payer UPI", value: instrument.upiVpa });
  if (instrument.accountName) rows.push({ label: "Payer account", value: instrument.accountName });
  if (instrument.bankName) rows.push({ label: "Payer bank", value: instrument.bankName });
  if (instrument.ifsc) rows.push({ label: "IFSC", value: instrument.ifsc });
  if (instrument.chequeNumber) rows.push({ label: "Cheque no.", value: instrument.chequeNumber });
  if (instrument.chequeDate) rows.push({ label: "Cheque date", value: formatDate(instrument.chequeDate) });
  if (instrument.chequeBank) rows.push({ label: "Cheque bank", value: instrument.chequeBank });
  if (instrument.depositedTo) rows.push({ label: "Deposited to", value: instrument.depositedTo });
  return rows;
}

export function PaymentReceipt({ settings = {}, payment = {}, invoice = null, className }) {
  const currency = payment.currency || invoice?.currency || settings.currency || "INR";
  const payer = payment.receivedFrom?.legalName || payment.receivedFrom?.name ? payment.receivedFrom : invoice?.billTo || {};
  const invoiceNumber = payment.invoiceNumber || invoice?.invoiceNumber || payment.invoice?.invoiceNumber || "—";
  const invoiceTotal = payment.invoiceTotal || invoice?.grandTotal || 0;
  const dueBefore = payment.amountDueBefore ?? invoiceTotal;
  const dueAfter = payment.amountDueAfter ?? invoice?.amountDue ?? 0;
  const isReversed = payment.status === "reversed";

  return (
    <article className={cn("bg-white text-slate-900 shadow-sm", className)}>
      <div className="border-b-2 border-slate-900 px-8 py-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 max-w-md">
            {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="mb-3 h-12 object-contain" /> : null}
            <p className="font-display text-xl font-semibold tracking-tight">{settings.legalName || "Your company"}</p>
            <p className="mt-1 text-sm text-slate-600">
              {[settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ") || "Set company address in Billing settings"}
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-slate-600">
              {settings.gstin ? <p>GSTIN: {settings.gstin}</p> : null}
              {settings.pan ? <p>PAN: {settings.pan}</p> : null}
              {settings.email ? <p>{settings.email}</p> : null}
              {settings.phone ? <p>{settings.phone}</p> : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{isReversed ? "Reversed receipt" : "Payment receipt"}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{payment.paymentNumber || "DRAFT"}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">Received on</dt>
                <dd>{formatDate(payment.paidAt)}</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd>{labelFor(PAYMENT_STATUSES, payment.status) || "Draft"}</dd>
              </div>
              {isReversed ? (
                <div className="flex justify-end gap-3">
                  <dt className="text-slate-500">Reversed</dt>
                  <dd>{formatDate(payment.reversedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>

      <div className="grid gap-6 border-b border-slate-200 px-8 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Received from</p>
          <p className="mt-1 font-semibold">{payer.legalName || payer.name || "Select an invoice"}</p>
          {partyLines(payer).map((line) => (
            <p key={line} className="text-sm text-slate-600">
              {line}
            </p>
          ))}
          {payer.gstin ? <p className="mt-1 text-sm">GSTIN: {payer.gstin}</p> : null}
          {payer.email ? <p className="text-sm text-slate-600">{payer.email}</p> : null}
          {payer.phone ? <p className="text-sm text-slate-600">{payer.phone}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Towards invoice</p>
          <p className="mt-1 font-semibold">{invoiceNumber}</p>
          <p className="mt-1 text-sm text-slate-600">Invoice value {formatInr(invoiceTotal, currency)}</p>
          {invoice?.dueAt ? <p className="text-sm text-slate-600">Invoice due {formatDate(invoice.dueAt)}</p> : null}
        </div>
      </div>

      <div className="border-b border-slate-200 px-8 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount received</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{formatInr(payment.amount || 0, currency)}</p>
        <p className="mt-2 font-medium">{amountInWords(payment.amount || 0)}</p>
      </div>

      <div className="grid gap-6 px-8 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Instrument</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            {instrumentRows(payment).map((row) => (
              <div key={row.label} className="flex justify-between gap-4">
                <dt className="text-slate-500">{row.label}</dt>
                <dd className="text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          {payment.notes ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Narration</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{payment.notes}</p>
            </div>
          ) : null}
        </div>
        <div className="sm:justify-self-end sm:w-72">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Invoice total</dt>
              <dd className="tabular-nums">{formatInr(invoiceTotal, currency)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Due before</dt>
              <dd className="tabular-nums">{formatInr(dueBefore, currency)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">This receipt</dt>
              <dd className="tabular-nums">{formatInr(payment.amount || 0, currency)}</dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-slate-900 pt-2 font-semibold">
              <dt>Balance due</dt>
              <dd className="tabular-nums">{formatInr(dueAfter, currency)}</dd>
            </div>
          </dl>
          <div className="mt-10 border-t border-slate-200 pt-6 text-right text-xs text-slate-500">
            <p>Received by {payment.receivedBy || payment.recordedBy?.name || "the company"}</p>
            <div className="mt-10 font-medium text-slate-800">Authorised signatory</div>
            <p className="mt-1">For {settings.legalName || "the company"}</p>
          </div>
        </div>
      </div>

      {payment.files?.length ? (
        <div className="border-t border-slate-200 px-8 py-4 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Proof attached</p>
          <ul className="mt-2 space-y-1 text-slate-600">
            {payment.files.map((file) => (
              <li key={file.publicId || file.url}>{file.name || "Supporting document"}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
