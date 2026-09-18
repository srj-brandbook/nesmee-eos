import { formatInr } from "@/constants/billing";
import { amountInWords } from "@/lib/invoiceMath";
import { cn, formatDate } from "@/lib/utils";

function addressLines(party = {}) {
  return [party.address, [party.city, party.state, party.pincode].filter(Boolean).join(", "), party.country].filter(Boolean);
}

export function InvoicePaper({ settings = {}, invoice = {}, className }) {
  const currency = invoice.currency || settings.currency || "INR";
  const lines = invoice.lines || [];
  const split = invoice.taxSplit === "inter" ? "IGST (inter-state)" : "CGST + SGST (intra-state)";
  const isCredit = invoice.type === "credit_note";

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{isCredit ? "Credit note" : "Tax invoice"}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{invoice.invoiceNumber || "DRAFT"}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">Date</dt>
                <dd>{formatDate(invoice.issuedAt || invoice.createdAt) === "—" ? "On issue" : formatDate(invoice.issuedAt || invoice.createdAt)}</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">Due</dt>
                <dd>{formatDate(invoice.dueAt)}</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">Place of supply</dt>
                <dd>{invoice.placeOfSupply || invoice.billTo?.state || "—"}</dd>
              </div>
              <div className="flex justify-end gap-3">
                <dt className="text-slate-500">Supply</dt>
                <dd>{split}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="grid gap-6 border-b border-slate-200 px-8 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Bill to</p>
          <p className="mt-1 font-semibold">{invoice.billTo?.legalName || invoice.billTo?.name || "Select a supplier"}</p>
          {addressLines(invoice.billTo).map((line) => (
            <p key={line} className="text-sm text-slate-600">
              {line}
            </p>
          ))}
          {invoice.billTo?.gstin ? <p className="mt-1 text-sm">GSTIN: {invoice.billTo.gstin}</p> : null}
          {invoice.billTo?.email ? <p className="text-sm text-slate-600">{invoice.billTo.email}</p> : null}
          {invoice.billTo?.phone ? <p className="text-sm text-slate-600">{invoice.billTo.phone}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Original for recipient</p>
          <p className="mt-1 text-sm text-slate-600">SAC typically 9983 — other professional, technical and business services.</p>
          {invoice.originalInvoiceId ? <p className="mt-2 text-sm">Against original invoice</p> : null}
        </div>
      </div>

      <div className="px-8 py-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 pr-2 font-semibold">Description</th>
              <th className="py-2 pr-2 font-semibold">SAC</th>
              <th className="py-2 pr-2 text-right font-semibold">Qty</th>
              <th className="py-2 pr-2 text-right font-semibold">Rate</th>
              <th className="py-2 pr-2 text-right font-semibold">Disc.</th>
              <th className="py-2 pr-2 text-right font-semibold">Taxable</th>
              {invoice.taxSplit === "inter" ? (
                <th className="py-2 pr-2 text-right font-semibold">IGST</th>
              ) : (
                <>
                  <th className="py-2 pr-2 text-right font-semibold">CGST</th>
                  <th className="py-2 pr-2 text-right font-semibold">SGST</th>
                </>
              )}
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line, index) => (
                <tr key={line.id || index} className="border-b border-slate-200 align-top">
                  <td className="py-2.5 pr-2 text-slate-500">{index + 1}</td>
                  <td className="py-2.5 pr-2">
                    <p>{line.description || "—"}</p>
                    {line.taxName ? <p className="text-xs text-slate-500">{line.taxName}</p> : null}
                  </td>
                  <td className="py-2.5 pr-2">{line.hsnSac || "—"}</td>
                  <td className="py-2.5 pr-2 text-right">{line.quantity}</td>
                  <td className="py-2.5 pr-2 text-right">{formatInr(line.unitPrice, currency)}</td>
                  <td className="py-2.5 pr-2 text-right">{line.discount ? formatInr(line.discount, currency) : "—"}</td>
                  <td className="py-2.5 pr-2 text-right">{formatInr(line.taxableAmount, currency)}</td>
                  {invoice.taxSplit === "inter" ? (
                    <td className="py-2.5 pr-2 text-right">
                      {formatInr(line.igst, currency)}
                      <span className="block text-[10px] text-slate-500">{line.taxRate}%</span>
                    </td>
                  ) : (
                    <>
                      <td className="py-2.5 pr-2 text-right">
                        {formatInr(line.cgst, currency)}
                        <span className="block text-[10px] text-slate-500">{moneyHalf(line.taxRate)}%</span>
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        {formatInr(line.sgst, currency)}
                        <span className="block text-[10px] text-slate-500">{moneyHalf(line.taxRate)}%</span>
                      </td>
                    </>
                  )}
                  <td className="py-2.5 text-right font-medium">{formatInr(line.lineTotal, currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-8 text-center text-slate-500" colSpan={invoice.taxSplit === "inter" ? 9 : 10}>
                  No line items yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 px-8 pb-8 sm:grid-cols-2">
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount in words</p>
            <p className="mt-1 font-medium">{amountInWords(invoice.grandTotal || 0)}</p>
          </div>
          {invoice.notes ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">{invoice.notes}</p>
            </div>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment</p>
            <p className="mt-1 text-slate-600">{invoice.paymentTerms || settings.paymentTerms || "Payment due as per terms."}</p>
            {settings.bankName ? (
              <p className="mt-2 text-slate-600">
                {settings.bankName}
                {settings.bankAccount ? ` · A/c ${settings.bankAccount}` : ""}
                {settings.bankIfsc ? ` · IFSC ${settings.bankIfsc}` : ""}
              </p>
            ) : null}
            {settings.upiId ? <p className="text-slate-600">UPI: {settings.upiId}</p> : null}
            {settings.paymentFooter ? <p className="mt-2 text-xs text-slate-500">{settings.paymentFooter}</p> : null}
          </div>
        </div>
        <div className="sm:justify-self-end sm:w-72">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-slate-500">Taxable value</dt>
              <dd>{formatInr(invoice.taxableAmount, currency)}</dd>
            </div>
            {invoice.discount ? (
              <div className="flex justify-between gap-6">
                <dt className="text-slate-500">Invoice discount</dt>
                <dd>-{formatInr(invoice.discount, currency)}</dd>
              </div>
            ) : null}
            {invoice.taxSplit === "inter" ? (
              <div className="flex justify-between gap-6">
                <dt className="text-slate-500">IGST</dt>
                <dd>{formatInr(invoice.igst, currency)}</dd>
              </div>
            ) : (
              <>
                <div className="flex justify-between gap-6">
                  <dt className="text-slate-500">CGST</dt>
                  <dd>{formatInr(invoice.cgst, currency)}</dd>
                </div>
                <div className="flex justify-between gap-6">
                  <dt className="text-slate-500">SGST</dt>
                  <dd>{formatInr(invoice.sgst, currency)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-6 border-t border-slate-900 pt-2 text-base font-semibold">
              <dt>Grand total</dt>
              <dd>{formatInr(invoice.grandTotal, currency)}</dd>
            </div>
            {invoice.amountPaid ? (
              <div className="flex justify-between gap-6 text-slate-500">
                <dt>Paid</dt>
                <dd>{formatInr(invoice.amountPaid, currency)}</dd>
              </div>
            ) : null}
            {invoice.status && invoice.status !== "draft" ? (
              <div className="flex justify-between gap-6 font-medium">
                <dt>Amount due</dt>
                <dd>{formatInr(invoice.amountDue, currency)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-10 border-t border-slate-200 pt-6 text-right text-xs text-slate-500">
            <p>For {settings.legalName || "the company"}</p>
            <div className="mt-10 font-medium text-slate-800">Authorised signatory</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function moneyHalf(rate) {
  return Math.round(((Number(rate) || 0) / 2) * 100) / 100;
}
