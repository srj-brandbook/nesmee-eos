"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { billingService } from "@/services/billingService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { FileUpload } from "@/components/ui/FileUpload";
import { PaymentReceipt } from "@/components/billing/PaymentReceipt";
import { PAYMENT_METHODS, formatInr, billingStatusVariant, labelFor, INVOICE_STATUSES } from "@/constants/billing";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/lib/api/apiClient";
import { amountInWords, isoDate, money } from "@/lib/invoiceMath";
import { cn } from "@/lib/utils";

const emptyInstrument = {
  transactionId: "",
  bankName: "",
  ifsc: "",
  accountName: "",
  upiVpa: "",
  chequeNumber: "",
  chequeDate: "",
  chequeBank: "",
  depositedTo: "",
};

function depositFromSettings(settings = {}, method) {
  if (method === "upi" && settings.upiId) return settings.upiId;
  return [settings.bankName, settings.bankAccount && `A/c ${settings.bankAccount}`, settings.bankIfsc && `IFSC ${settings.bankIfsc}`]
    .filter(Boolean)
    .join(" · ");
}

export function PaymentForm({ initialInvoiceId = "" }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [paidAt, setPaidAt] = useState(isoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [instrument, setInstrument] = useState(emptyInstrument);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    billingService.settings().then((response) => setSettings(response.data.settings || {})).catch(() => {});
    billingService
      .listInvoices({ type: "invoice", limit: 100, sort: "-issuedAt" })
      .then((response) => {
        const open = (response.data.items || []).filter((item) => ["issued", "partial", "overdue"].includes(item.status));
        setInvoices(open);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!receivedBy && user?.name) setReceivedBy(user.name);
  }, [user, receivedBy]);

  useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      return;
    }
    billingService
      .getInvoice(invoiceId)
      .then((response) => {
        const item = response.data.invoice;
        setInvoice(item);
        setAmount(String(item.amountDue || ""));
        setInvoices((current) => (current.some((row) => row.id === item.id) ? current : [item, ...current]));
      })
      .catch(() => {});
  }, [invoiceId]);

  useEffect(() => {
    setInstrument((current) => ({
      ...current,
      depositedTo: current.depositedTo || depositFromSettings(settings, method),
    }));
  }, [settings]);

  const due = money(invoice?.amountDue);
  const receiptAmount = money(amount);
  const remaining = Math.max(0, money(due - receiptAmount));
  const currency = invoice?.currency || settings.currency || "INR";
  const isBank = ["bank_transfer", "neft", "rtgs"].includes(method);
  const isUpi = method === "upi";
  const isCheque = method === "cheque";

  const preview = useMemo(
    () => ({
      paymentNumber: "DRAFT",
      amount: receiptAmount,
      currency,
      method,
      paidAt,
      status: "recorded",
      notes,
      receivedBy,
      receivedFrom: invoice?.billTo || {},
      invoiceNumber: invoice?.invoiceNumber || "",
      invoiceTotal: invoice?.grandTotal || 0,
      amountDueBefore: due,
      amountDueAfter: remaining,
      instrument: {
        ...instrument,
        ifsc: String(instrument.ifsc || "").toUpperCase(),
      },
      files: Array.isArray(files) ? files : files ? [files] : [],
    }),
    [receiptAmount, currency, method, paidAt, notes, receivedBy, invoice, due, remaining, instrument, files]
  );

  function patchInstrument(patch) {
    setInstrument((current) => ({ ...current, ...patch }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!invoiceId) {
      setError("Select an invoice to allocate this receipt.");
      return;
    }
    if (receiptAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (receiptAmount > due + 0.009) {
      setError("Amount cannot exceed the invoice balance.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await billingService.createPayment({
        invoiceId,
        amount: receiptAmount,
        method,
        paidAt: paidAt ? new Date(`${paidAt}T12:00:00`).toISOString() : undefined,
        reference: instrument.transactionId || instrument.chequeNumber || "",
        notes,
        receivedBy,
        receivedFrom: invoice?.billTo || undefined,
        instrument: {
          ...instrument,
          ifsc: String(instrument.ifsc || "").toUpperCase(),
          chequeDate: instrument.chequeDate || null,
        },
        files: Array.isArray(files) ? files : files ? [files] : [],
      });
      toast.success("Receipt recorded");
      router.push(`${ROUTES.billingPayments}/${response.data.payment.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not record payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Receipt</p>
          <h1 className="font-display text-2xl font-semibold">Record payment</h1>
          <p className="mt-1 text-sm text-muted">Allocate an offline receipt and print a GST-ready acknowledgement.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {invoice ? <Badge variant={billingStatusVariant(invoice.status)}>{labelFor(INVOICE_STATUSES, invoice.status)}</Badge> : <Badge>Unallocated</Badge>}
          <Button type="submit" loading={loading} disabled={!invoiceId}>
            Save receipt
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Invoice</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Select label="Open invoice" value={invoiceId} requiredMark onChange={(event) => setInvoiceId(event.target.value)}>
                <option value="">Select invoice</option>
                {invoices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.invoiceNumber} · {item.billTo?.legalName || item.billTo?.name || "Supplier"} · {formatInr(item.amountDue, item.currency)}
                  </option>
                ))}
              </Select>
              <Input label="Received on" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
            </div>
            {invoice ? (
              <dl className="mt-4 grid gap-3 rounded-md border border-border bg-bg px-4 py-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Invoice total</dt>
                  <dd className="mt-1 font-medium tabular-nums">{formatInr(invoice.grandTotal, currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Already paid</dt>
                  <dd className="mt-1 font-medium tabular-nums">{formatInr(invoice.amountPaid, currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted">Balance due</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{formatInr(due, currency)}</dd>
                </div>
              </dl>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Mode of payment</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMethod(item.value);
                    setInstrument((current) => ({ ...current, depositedTo: depositFromSettings(settings, item.value) || current.depositedTo }));
                  }}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition",
                    method === item.value ? "border-slate-900 bg-slate-900 text-white" : "border-border bg-surface hover:bg-slate-50"
                  )}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className={cn("mt-0.5 block text-[11px]", method === item.value ? "text-white/70" : "text-muted")}>{item.hint}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Amount received"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                required
                onChange={(event) => setAmount(event.target.value)}
                hint={invoice ? `Max ${formatInr(due, currency)}` : undefined}
              />
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" disabled={!invoice} onClick={() => setAmount(String(due || ""))}>
                  Pay full balance
                </Button>
              </div>
              {isBank || method === "other" ? (
                <Input
                  label={method === "neft" || method === "rtgs" ? "UTR" : "Transaction ID"}
                  value={instrument.transactionId}
                  onChange={(event) => patchInstrument({ transactionId: event.target.value })}
                  placeholder="Bank reference / UTR"
                />
              ) : null}
              {isUpi ? (
                <>
                  <Input label="UPI reference" value={instrument.transactionId} onChange={(event) => patchInstrument({ transactionId: event.target.value })} placeholder="UPI txn ID" />
                  <Input label="Payer UPI ID" value={instrument.upiVpa} onChange={(event) => patchInstrument({ upiVpa: event.target.value })} placeholder="name@bank" />
                </>
              ) : null}
              {isBank ? (
                <>
                  <Input label="Payer bank" value={instrument.bankName} onChange={(event) => patchInstrument({ bankName: event.target.value })} />
                  <Input label="IFSC" value={instrument.ifsc} onChange={(event) => patchInstrument({ ifsc: event.target.value.toUpperCase() })} />
                  <Input label="Payer account name" value={instrument.accountName} onChange={(event) => patchInstrument({ accountName: event.target.value })} />
                </>
              ) : null}
              {isCheque ? (
                <>
                  <Input label="Cheque number" value={instrument.chequeNumber} onChange={(event) => patchInstrument({ chequeNumber: event.target.value })} />
                  <Input label="Cheque date" type="date" value={instrument.chequeDate} onChange={(event) => patchInstrument({ chequeDate: event.target.value })} />
                  <Input label="Cheque bank" value={instrument.chequeBank} onChange={(event) => patchInstrument({ chequeBank: event.target.value })} />
                </>
              ) : null}
              {method !== "cash" ? (
                <Input
                  label="Deposited to"
                  value={instrument.depositedTo}
                  onChange={(event) => patchInstrument({ depositedTo: event.target.value })}
                  hint="Your collection account or UPI ID"
                />
              ) : null}
              <Input label="Received by" value={receivedBy} onChange={(event) => setReceivedBy(event.target.value)} />
              <div className="md:col-span-2">
                <Textarea label="Narration" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional note printed on the receipt" />
              </div>
              <div className="md:col-span-2">
                <FileUpload label="Payment proof" value={files} onChange={setFiles} maxFiles={3} folder="billing" accept="application/pdf,image/*" hint="Bank slip, UPI screenshot, or cheque image" />
              </div>
            </div>
            {invoice ? (
              <p className="mt-4 text-sm text-muted">
                After this receipt, balance due {formatInr(remaining, currency)}
                {receiptAmount > 0 ? ` · ${amountInWords(receiptAmount)}` : ""}
              </p>
            ) : null}
          </section>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Receipt preview</p>
          <PaymentReceipt settings={settings} payment={preview} invoice={invoice} className="overflow-hidden rounded-lg border border-slate-200" />
        </div>
      </div>
    </form>
  );
}
