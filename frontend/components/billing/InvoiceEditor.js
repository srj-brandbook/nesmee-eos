"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { billingService } from "@/services/billingService";
import { leadService } from "@/services/crmService";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/contexts/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { InvoicePaper } from "@/components/billing/InvoicePaper";
import { INDIAN_STATES, INVOICE_STATUSES, PAYMENT_METHODS, formatInr, labelFor, billingStatusVariant } from "@/constants/billing";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { ApiClientError } from "@/lib/api/apiClient";
import {
  addDaysIso,
  amountInWords,
  computeLine,
  computeTotals,
  emptyInvoiceLine,
  isoDate,
  taxSplitFor,
} from "@/lib/invoiceMath";
import { cn, formatDate } from "@/lib/utils";

const emptyBillTo = {
  name: "",
  legalName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstin: "",
  country: "India",
};

function billToFromLead(lead = {}) {
  return {
    name: lead.name || "",
    legalName: lead.legalName || lead.name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    address: lead.billingAddress || lead.address || "",
    city: lead.city || "",
    state: lead.billingState || lead.state || "",
    pincode: lead.pincode || "",
    gstin: lead.gstin || "",
    country: lead.country || "India",
  };
}

function lineFromOffering(offering, fallbackTaxRateId = "") {
  return {
    ...emptyInvoiceLine(),
    offeringId: offering.id,
    description: offering.name || "",
    unitPrice: offering.unitPrice ?? 0,
    hsnSac: offering.hsnSac || "9983",
    taxRateId: offering.taxRateId || fallbackTaxRateId,
    documentKey: offering.documentKey || "",
  };
}

function defaultLine(settings, taxRates) {
  const defaultId = settings?.defaultTaxRateId || taxRates.find((item) => item.isDefault)?.id || "";
  return { ...emptyInvoiceLine(), taxRateId: defaultId };
}

function GhostInput({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-8 w-full rounded-sm border-0 bg-transparent px-0 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:bg-slate-50 focus:px-1.5 focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

function GhostSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-8 w-full rounded-sm border-0 bg-transparent px-0 text-sm text-slate-900 outline-none focus:bg-slate-50 focus:px-1 focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function FieldLabel({ children }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{children}</p>;
}

export function InvoiceEditor({ invoiceId, initialLeadId = "", initialJobId = "" }) {
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState({});
  const [taxRates, setTaxRates] = useState([]);
  const [leads, setLeads] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [leadSearch, setLeadSearch] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [leadId, setLeadId] = useState(initialLeadId);
  const [jobId, setJobId] = useState(initialJobId);
  const [jobNumber, setJobNumber] = useState("");
  const [billTo, setBillTo] = useState(emptyBillTo);
  const [lines, setLines] = useState([emptyInvoiceLine()]);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [hydrated, setHydrated] = useState(!invoiceId);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    Promise.all([
      billingService.settings().then((response) => response.data.settings).catch(() => ({})),
      billingService.listTaxRates({ active: "true", limit: 100 }).then((response) => response.data.items || []).catch(() => []),
      billingService.listServices({ active: "true", limit: 100 }).then((response) => response.data.items || []).catch(() => []),
    ]).then(([nextSettings, rates, services]) => {
      setSettings(nextSettings || {});
      setTaxRates(rates);
      setOfferings(services);
    });
  }, []);

  useEffect(() => {
    if (invoiceId) return;
    if (!settings.defaultDueDays && settings.defaultDueDays !== 0) return;
    setPaymentTerms((current) => current || settings.paymentTerms || "");
    setDueAt((current) => current || addDaysIso(settings.defaultDueDays || 15));
    setLines((current) => {
      if (current.length === 1 && !current[0].description && !current[0].offeringId && !current[0].taxRateId) {
        return [defaultLine(settings, taxRates)];
      }
      return current;
    });
  }, [settings, taxRates, invoiceId]);

  useEffect(() => {
    if (invoiceId || !initialJobId) return;
    billingService
      .getJob(initialJobId)
      .then((response) => {
        const job = response.data.job;
        setJobId(job.id);
        setJobNumber(job.jobNumber || "");
        setLeadId(job.leadId || initialLeadId);
        setDiscount(job.discount || 0);
        if (job.lines?.length) {
          setLines(
            job.lines.map((line) => ({
              ...emptyInvoiceLine(),
              offeringId: line.offeringId || "",
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              hsnSac: line.hsnSac || "9983",
              taxRateId: line.taxRateId || "",
              documentKey: line.documentKey || "",
            }))
          );
        }
      })
      .catch(() => {});
  }, [initialJobId, invoiceId, initialLeadId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      leadService.list({ search: leadSearch, limit: 20, sort: "name" }).then((response) => setLeads(response.data.items || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [leadSearch]);

  useEffect(() => {
    if (!invoiceId) return;
    billingService
      .getInvoice(invoiceId)
      .then((response) => {
        const item = response.data.invoice;
        setInvoice(item);
        setLeadId(item.leadId || "");
        setJobId(item.jobId || "");
        setBillTo({ ...emptyBillTo, ...(item.billTo || {}) });
        setLines(item.lines?.length ? item.lines.map((line) => ({ ...emptyInvoiceLine(), ...line, offeringId: line.offeringId || "", taxRateId: line.taxRateId || "" })) : [emptyInvoiceLine()]);
        setNotes(item.notes || "");
        setPaymentTerms(item.paymentTerms || "");
        setPlaceOfSupply(item.placeOfSupply || item.billTo?.state || "");
        setDueAt(isoDate(item.dueAt));
        setDiscount(item.discount || 0);
        setHydrated(true);
      })
      .catch(() => toast.error("Unable to load invoice"));
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId || !invoice || invoice.status === "draft") {
      setReceipts([]);
      return;
    }
    billingService
      .listPayments({ invoiceId, limit: 50, sort: "-paidAt" })
      .then((response) => setReceipts(response.data.items || []))
      .catch(() => setReceipts([]));
  }, [invoiceId, invoice?.status, invoice?.amountPaid]);

  useEffect(() => {
    if (invoiceId || !leadId) return;
    leadService
      .get(leadId)
      .then((response) => {
        const lead = response.data.lead;
        setBillTo(billToFromLead(lead));
        setPlaceOfSupply((current) => current || lead.billingState || lead.state || "");
      })
      .catch(() => {});
  }, [leadId, invoiceId]);

  const isDraft = !invoice || invoice.status === "draft";
  const canEdit = isDraft && (invoiceId ? can(PERMISSIONS.INVOICES_UPDATE) : can(PERMISSIONS.INVOICES_CREATE));
  const currency = invoice?.currency || settings.currency || "INR";
  const split = taxSplitFor(settings.state, billTo.state || placeOfSupply);

  const computedLines = useMemo(
    () =>
      lines.map((line) => {
        const taxRate = taxRates.find((item) => item.id === line.taxRateId) || null;
        return computeLine(line, { split, taxRate });
      }),
    [lines, taxRates, split]
  );

  const totals = useMemo(() => computeTotals(computedLines, discount), [computedLines, discount]);

  function updateLine(index, patch) {
    setLines((current) => current.map((item, lineIndex) => (lineIndex === index ? { ...item, ...patch } : item)));
  }

  function updateBillTo(patch) {
    setBillTo((current) => {
      const next = { ...current, ...patch };
      if (patch.state !== undefined && (!placeOfSupply || placeOfSupply === current.state)) {
        setPlaceOfSupply(patch.state);
      }
      if (patch.name !== undefined && (!current.legalName || current.legalName === current.name)) {
        next.legalName = patch.name;
      }
      return next;
    });
  }

  function addLine(line = defaultLine(settings, taxRates)) {
    setLines((current) => [...current, line]);
  }

  function insertCatalog(offeringId) {
    const offering = offerings.find((item) => item.id === offeringId);
    setCatalogId("");
    if (!offering) return;
    const next = lineFromOffering(offering, settings.defaultTaxRateId);
    setLines((current) => {
      if (current.length === 1 && !current[0].description && !current[0].unitPrice) return [next];
      return [...current, next];
    });
  }

  const linePayload = computedLines.map((line) => ({
    offeringId: line.offeringId || null,
    description: line.description,
    hsnSac: line.hsnSac || "",
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
    discount: Number(line.discount) || 0,
    taxRateId: line.taxRateId || null,
    documentKey: line.documentKey || "",
  }));

  function payload() {
    return {
      leadId,
      jobId: jobId || null,
      billTo: {
        ...billTo,
        legalName: billTo.legalName || billTo.name,
        gstin: String(billTo.gstin || "").toUpperCase(),
      },
      notes,
      lines: linePayload,
      paymentTerms,
      placeOfSupply: placeOfSupply || billTo.state,
      discount: Number(discount) || 0,
      dueAt: dueAt || null,
    };
  }

  function validate() {
    if (!leadId) return "Select a supplier to bill.";
    if (!linePayload.some((line) => line.description && line.quantity > 0)) return "Add at least one line with a description and quantity.";
    return "";
  }

  async function saveDraft() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (invoiceId) {
        const response = await billingService.updateInvoice(invoiceId, payload());
        setInvoice(response.data.invoice);
        toast.success("Draft saved");
      } else {
        const response = await billingService.createInvoice(payload());
        toast.success("Invoice created");
        router.replace(`${ROUTES.billingInvoices}/${response.data.invoice.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function issue() {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setLoading(true);
    setError("");
    try {
      let id = invoiceId;
      if (!id) {
        const created = await billingService.createInvoice(payload());
        id = created.data.invoice.id;
      } else if (isDraft) {
        await billingService.updateInvoice(id, payload());
      }
      const response = await billingService.issueInvoice(id);
      setInvoice(response.data.invoice);
      toast.success("Invoice issued");
      if (!invoiceId) router.replace(`${ROUTES.billingInvoices}/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not issue");
      setError(err instanceof ApiClientError ? err.message : "Could not issue");
    } finally {
      setLoading(false);
    }
  }

  if (invoiceId && !hydrated) return <p className="text-sm text-muted">Loading invoice…</p>;

  const showDocument = Boolean(invoice) && !isDraft;
  const displayTotal = showDocument ? invoice.grandTotal : totals.grandTotal;

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canEdit ? (
        <Button loading={loading} onClick={saveDraft}>
          {invoiceId ? "Save draft" : "Create draft"}
        </Button>
      ) : null}
      {isDraft && can(PERMISSIONS.INVOICES_ISSUE) ? (
        <Button variant="secondary" loading={loading} onClick={issue}>
          Issue invoice
        </Button>
      ) : null}
      {invoiceId ? (
        <Link href={`${ROUTES.billingInvoices}/${invoiceId}/print`}>
          <Button variant="outline">Print / PDF</Button>
        </Link>
      ) : null}
      {invoice && ["issued", "partial", "overdue"].includes(invoice.status) && can(PERMISSIONS.PAYMENTS_CREATE) ? (
        <Link href={`${ROUTES.billingPayments}/new?invoiceId=${invoice.id}`}>
          <Button variant="outline">Record payment</Button>
        </Link>
      ) : null}
      {invoice && invoice.type === "invoice" && ["issued", "partial", "paid", "overdue"].includes(invoice.status) && can(PERMISSIONS.INVOICES_CREATE) ? (
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const response = await billingService.creditNote(invoice.id, {});
              router.push(`${ROUTES.billingInvoices}/${response.data.invoice.id}`);
            } catch (err) {
              toast.error(err instanceof ApiClientError ? err.message : "Could not create credit note");
            }
          }}
        >
          Credit note
        </Button>
      ) : null}
      {invoice && invoice.status !== "void" && can(PERMISSIONS.INVOICES_VOID) ? (
        <Button variant="danger" onClick={() => setVoidOpen(true)}>
          Void
        </Button>
      ) : null}
      {invoice?.jobId ? (
        <Link href={`${ROUTES.billingJobs}/${invoice.jobId}`} className="self-center text-sm text-primary">
          Open job
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4 pb-4">
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted">{invoice?.type === "credit_note" ? "Credit note" : "Tax invoice"}</p>
          <h1 className="font-display text-2xl font-semibold">{invoice?.invoiceNumber || "Create invoice"}</h1>
          <p className="mt-1 text-sm text-muted">
            {showDocument ? "Issued GST tax invoice" : "Live GST preview · CGST/SGST or IGST from company vs buyer state"}
            {jobNumber ? ` · Job ${jobNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {invoice ? <Badge variant={billingStatusVariant(invoice.status)}>{labelFor(INVOICE_STATUSES, invoice.status)}</Badge> : <Badge>Draft</Badge>}
            {split === "inter" ? <Badge variant="warning">IGST</Badge> : <Badge variant="primary">CGST + SGST</Badge>}
          </div>
          {actions}
          <p className="text-right text-sm font-semibold tabular-nums">{formatInr(displayTotal, currency)}</p>
        </div>
      </div>

      {!settings.gstin && canEdit ? (
        <Alert variant="warning">
          Company GSTIN is not set.{" "}
          <Link href={ROUTES.billingSettings} className="font-medium underline">
            Complete billing settings
          </Link>{" "}
          so invoices print with a proper letterhead.
        </Alert>
      ) : null}

      {showDocument ? (
        <>
          <InvoicePaper settings={settings} invoice={invoice} className="overflow-hidden rounded-lg border border-slate-200" />
          <section className="rounded-lg border border-border bg-surface p-5 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Receipts</h2>
              {["issued", "partial", "overdue"].includes(invoice.status) && can(PERMISSIONS.PAYMENTS_CREATE) ? (
                <Link href={`${ROUTES.billingPayments}/new?invoiceId=${invoice.id}`} className="text-sm text-primary">
                  Record receipt
                </Link>
              ) : null}
            </div>
            {receipts.length ? (
              <ul className="mt-3 divide-y divide-border text-sm">
                {receipts.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`${ROUTES.billingPayments}/${row.id}`} className="font-medium text-primary">
                      {row.paymentNumber}
                    </Link>
                    <span className="text-muted">
                      {labelFor(PAYMENT_METHODS, row.method)} · {formatDate(row.paidAt)}
                    </span>
                    <span className="tabular-nums">{formatInr(row.amount, invoice.currency)}</span>
                    <Badge variant={billingStatusVariant(row.status)}>{row.status === "reversed" ? "Reversed" : "Recorded"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No receipts recorded against this invoice yet.</p>
            )}
          </section>
        </>
      ) : (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm">
          <div className="border-b-2 border-slate-900 px-6 py-6 sm:px-8">
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
              <div className="w-full max-w-xs text-right sm:w-72">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{invoice?.type === "credit_note" ? "Credit note" : "Tax invoice"}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{invoice?.invoiceNumber || "DRAFT"}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <dt className="text-slate-500">Due date</dt>
                    <dd>
                      <GhostInput type="date" value={dueAt} disabled={!canEdit} onChange={(event) => setDueAt(event.target.value)} className="w-36 text-right" />
                    </dd>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <dt className="shrink-0 text-slate-500">Place of supply</dt>
                    <dd>
                      <GhostSelect value={placeOfSupply} disabled={!canEdit} onChange={(event) => setPlaceOfSupply(event.target.value)} className="w-40 text-right">
                        <option value="">Buyer state</option>
                        {INDIAN_STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </GhostSelect>
                    </dd>
                  </div>
                  <div className="flex justify-end gap-3">
                    <dt className="text-slate-500">Supply</dt>
                    <dd>{split === "inter" ? "IGST (inter-state)" : "CGST + SGST"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-slate-200 px-6 py-5 sm:grid-cols-2 sm:px-8">
            <div className="space-y-2">
              <FieldLabel>Bill to</FieldLabel>
              {!invoiceId ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <GhostInput placeholder="Search supplier" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} />
                  <GhostSelect value={leadId} disabled={!canEdit} onChange={(event) => setLeadId(event.target.value)}>
                    <option value="">Select supplier</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name}
                      </option>
                    ))}
                  </GhostSelect>
                </div>
              ) : null}
              <GhostInput placeholder="Legal name" disabled={!canEdit} value={billTo.legalName || billTo.name} onChange={(event) => updateBillTo({ legalName: event.target.value, name: event.target.value })} className="font-semibold" />
              <GhostInput placeholder="Address" disabled={!canEdit} value={billTo.address} onChange={(event) => updateBillTo({ address: event.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <GhostInput placeholder="City" disabled={!canEdit} value={billTo.city} onChange={(event) => updateBillTo({ city: event.target.value })} />
                <GhostSelect value={billTo.state} disabled={!canEdit} onChange={(event) => updateBillTo({ state: event.target.value })}>
                  <option value="">State</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </GhostSelect>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <GhostInput placeholder="Pincode" disabled={!canEdit} value={billTo.pincode} onChange={(event) => updateBillTo({ pincode: event.target.value })} />
                <GhostInput placeholder="GSTIN" disabled={!canEdit} value={billTo.gstin} onChange={(event) => updateBillTo({ gstin: event.target.value.toUpperCase() })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <GhostInput placeholder="Email" disabled={!canEdit} value={billTo.email} onChange={(event) => updateBillTo({ email: event.target.value })} />
                <GhostInput placeholder="Phone" disabled={!canEdit} value={billTo.phone} onChange={(event) => updateBillTo({ phone: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>Payment terms</FieldLabel>
              <textarea
                rows={4}
                disabled={!canEdit}
                value={paymentTerms}
                onChange={(event) => setPaymentTerms(event.target.value)}
                placeholder="Due within 15 days. Pay by NEFT / UPI / cheque."
                className="w-full resize-none rounded-sm border-0 bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:bg-slate-50 focus:p-2 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-70"
              />
              {settings.bankName ? (
                <p className="text-xs text-slate-500">
                  {settings.bankName}
                  {settings.bankAccount ? ` · A/c ${settings.bankAccount}` : ""}
                  {settings.bankIfsc ? ` · IFSC ${settings.bankIfsc}` : ""}
                </p>
              ) : null}
              {settings.upiId ? <p className="text-xs text-slate-500">UPI: {settings.upiId}</p> : null}
            </div>
          </div>

          <div className="px-4 py-3 sm:px-6">
            {canEdit ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden">
                <GhostSelect value={catalogId} onChange={(event) => insertCatalog(event.target.value)} className="max-w-xs border border-slate-200 px-2">
                  <option value="">Insert from catalog…</option>
                  {offerings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {formatInr(item.unitPrice, currency)}
                    </option>
                  ))}
                </GhostSelect>
                <Button type="button" variant="outline" size="sm" onClick={() => addLine()}>
                  Add line
                </Button>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-2 font-semibold">#</th>
                    <th className="py-2 pr-2 font-semibold">Description</th>
                    <th className="py-2 pr-2 font-semibold">SAC</th>
                    <th className="py-2 pr-2 text-right font-semibold">Qty</th>
                    <th className="py-2 pr-2 text-right font-semibold">Rate</th>
                    <th className="py-2 pr-2 text-right font-semibold">Disc.</th>
                    <th className="py-2 pr-2 font-semibold">Tax</th>
                    <th className="py-2 pr-2 text-right font-semibold">Taxable</th>
                    {split === "inter" ? (
                      <th className="py-2 pr-2 text-right font-semibold">IGST</th>
                    ) : (
                      <>
                        <th className="py-2 pr-2 text-right font-semibold">CGST</th>
                        <th className="py-2 pr-2 text-right font-semibold">SGST</th>
                      </>
                    )}
                    <th className="py-2 text-right font-semibold">Amount</th>
                    {canEdit ? <th className="w-8" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {computedLines.map((line, index) => (
                    <tr key={line.id || index} className="border-b border-slate-200 align-top">
                      <td className="py-2 pr-2 text-slate-500">{index + 1}</td>
                      <td className="py-1.5 pr-2">
                        <GhostInput
                          placeholder="Service description"
                          disabled={!canEdit}
                          value={lines[index].description}
                          onChange={(event) => updateLine(index, { description: event.target.value })}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <GhostInput className="w-16" disabled={!canEdit} value={lines[index].hsnSac} onChange={(event) => updateLine(index, { hsnSac: event.target.value })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <GhostInput className="w-16 text-right" type="number" min="0" step="1" disabled={!canEdit} value={lines[index].quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <GhostInput className="w-24 text-right" type="number" min="0" step="0.01" disabled={!canEdit} value={lines[index].unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <GhostInput className="w-20 text-right" type="number" min="0" step="0.01" disabled={!canEdit} value={lines[index].discount} onChange={(event) => updateLine(index, { discount: event.target.value })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <GhostSelect className="min-w-[7.5rem]" disabled={!canEdit} value={lines[index].taxRateId || ""} onChange={(event) => updateLine(index, { taxRateId: event.target.value })}>
                          <option value="">0%</option>
                          {taxRates.map((rate) => (
                            <option key={rate.id} value={rate.id}>
                              {rate.name} ({rate.rate}%)
                            </option>
                          ))}
                        </GhostSelect>
                      </td>
                      <td className="py-2.5 pr-2 text-right tabular-nums">{formatInr(line.taxableAmount, currency)}</td>
                      {split === "inter" ? (
                        <td className="py-2.5 pr-2 text-right tabular-nums">
                          {formatInr(line.igst, currency)}
                          <span className="block text-[10px] text-slate-500">{line.taxRate}%</span>
                        </td>
                      ) : (
                        <>
                          <td className="py-2.5 pr-2 text-right tabular-nums">
                            {formatInr(line.cgst, currency)}
                            <span className="block text-[10px] text-slate-500">{Math.round(((line.taxRate || 0) / 2) * 100) / 100}%</span>
                          </td>
                          <td className="py-2.5 pr-2 text-right tabular-nums">
                            {formatInr(line.sgst, currency)}
                            <span className="block text-[10px] text-slate-500">{Math.round(((line.taxRate || 0) / 2) * 100) / 100}%</span>
                          </td>
                        </>
                      )}
                      <td className="py-2.5 text-right font-medium tabular-nums">{formatInr(line.lineTotal, currency)}</td>
                      {canEdit ? (
                        <td className="py-2 pl-2">
                          {lines.length > 1 ? (
                            <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} aria-label="Remove line">
                              ×
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 px-6 pb-8 sm:grid-cols-2 sm:px-8">
            <div className="space-y-4 text-sm">
              <div>
                <FieldLabel>Amount in words</FieldLabel>
                <p className="mt-1 font-medium">{amountInWords(totals.grandTotal)}</p>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Internal or customer-facing notes"
                  className="mt-1 w-full resize-none rounded-sm border-0 bg-transparent p-0 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:bg-slate-50 focus:p-2 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-70"
                />
              </div>
            </div>
            <div className="sm:w-72 sm:justify-self-end">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-6">
                  <dt className="text-slate-500">Taxable value</dt>
                  <dd className="tabular-nums">{formatInr(totals.taxableAmount, currency)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-slate-500">Invoice discount</dt>
                  <dd>
                    <GhostInput className="w-24 text-right" type="number" min="0" step="0.01" disabled={!canEdit} value={discount} onChange={(event) => setDiscount(event.target.value)} />
                  </dd>
                </div>
                {split === "inter" ? (
                  <div className="flex justify-between gap-6">
                    <dt className="text-slate-500">IGST</dt>
                    <dd className="tabular-nums">{formatInr(totals.igst, currency)}</dd>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between gap-6">
                      <dt className="text-slate-500">CGST</dt>
                      <dd className="tabular-nums">{formatInr(totals.cgst, currency)}</dd>
                    </div>
                    <div className="flex justify-between gap-6">
                      <dt className="text-slate-500">SGST</dt>
                      <dd className="tabular-nums">{formatInr(totals.sgst, currency)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-6 border-t border-slate-900 pt-2 text-base font-semibold">
                  <dt>Grand total</dt>
                  <dd className="tabular-nums">{formatInr(totals.grandTotal, currency)}</dd>
                </div>
              </dl>
              <div className="mt-10 border-t border-slate-200 pt-6 text-right text-xs text-slate-500">
                <p>For {settings.legalName || "the company"}</p>
                <div className="mt-10 font-medium text-slate-800">Authorised signatory</div>
              </div>
            </div>
          </div>
        </article>
      )}

      <ConfirmationDialog
        open={voidOpen}
        title="Void invoice"
        description="Void this document. Recorded payments must be reversed first."
        confirmLabel="Void"
        onClose={() => setVoidOpen(false)}
        onConfirm={async () => {
          setVoidOpen(false);
          try {
            const response = await billingService.voidInvoice(invoice.id);
            setInvoice(response.data.invoice);
            toast.success("Invoice voided");
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : "Could not void");
          }
        }}
      />
    </div>
  );
}
