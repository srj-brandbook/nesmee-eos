const Invoice = require("../../models/Invoice");
const Payment = require("../../models/Payment");
const ServiceJob = require("../../models/ServiceJob");
const Lead = require("../../models/Lead");
const TaxRate = require("../../models/TaxRate");
const ServiceOffering = require("../../models/ServiceOffering");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializeInvoice } = require("../../utils/billingSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { getSettings } = require("./settings.service");
const { nextInvoiceNumber, nextCreditNoteNumber } = require("./numbering");
const { computeLine, computeTotals, taxSplitFor, amountDue, money } = require("./tax.engine");
const { ISSUED_INVOICE_STATUSES } = require("../../constants/billing");

const LEAD_SELECT = "name legalName email phone city country gstin billingState billingAddress pincode";

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function oid(value) {
  if (!value || value === "null") return null;
  return value;
}

function billToFromLead(lead, override = {}) {
  return {
    name: override.name || lead?.name || "",
    legalName: override.legalName || lead?.legalName || lead?.name || "",
    email: override.email || lead?.email || "",
    phone: override.phone || lead?.phone || "",
    address: override.address || lead?.billingAddress || "",
    city: override.city || lead?.city || "",
    state: override.state || lead?.billingState || "",
    pincode: override.pincode || lead?.pincode || "",
    gstin: override.gstin || lead?.gstin || "",
    country: override.country || lead?.country || "India",
  };
}

async function loadTaxMap(ids) {
  const unique = [...new Set((ids || []).filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const rates = await TaxRate.find({ _id: { $in: unique }, deletedAt: null }).lean();
  return new Map(rates.map((item) => [String(item._id), item]));
}

async function resolveLines(rawLines = [], { split, defaultTaxRateId }) {
  const offeringIds = rawLines.map((line) => line.offeringId).filter(Boolean);
  const offerings = offeringIds.length
    ? await ServiceOffering.find({ _id: { $in: offeringIds }, deletedAt: null }).lean()
    : [];
  const offeringMap = new Map(offerings.map((item) => [String(item._id), item]));
  const taxIds = rawLines.map((line) => line.taxRateId).concat(offerings.map((item) => item.taxRateId)).concat([defaultTaxRateId]);
  const taxMap = await loadTaxMap(taxIds);

  return (rawLines || []).map((line) => {
    const offering = line.offeringId ? offeringMap.get(String(line.offeringId)) : null;
    const taxRateId = oid(line.taxRateId) || offering?.taxRateId || defaultTaxRateId || null;
    const taxRate = taxRateId ? taxMap.get(String(taxRateId)) : null;
    return computeLine(
      {
        offeringId: offering?._id || oid(line.offeringId),
        documentKey: line.documentKey || offering?.documentKey || "",
        description: line.description || offering?.name || "Service",
        hsnSac: line.hsnSac || offering?.hsnSac || "",
        quantity: line.quantity == null ? 1 : line.quantity,
        unitPrice: line.unitPrice == null ? offering?.unitPrice || 0 : line.unitPrice,
        discount: line.discount || 0,
        taxRateId,
        taxRate: taxRate?.rate,
        taxName: taxRate?.name,
      },
      { split, taxRate }
    );
  });
}

function applyComputed(invoice, lines, headerDiscount) {
  const totals = computeTotals(lines, headerDiscount);
  invoice.lines = lines;
  Object.assign(invoice, totals);
  invoice.amountDue = amountDue(invoice);
}

function refreshPayableStatus(invoice, now = new Date()) {
  if (!["issued", "partial", "paid", "overdue"].includes(invoice.status)) return;
  const due = amountDue(invoice);
  invoice.amountDue = due;
  if (due <= 0) {
    invoice.status = "paid";
    invoice.paidAt = invoice.paidAt || now;
    return;
  }
  invoice.paidAt = null;
  if (invoice.amountPaid > 0) {
    invoice.status = "partial";
    return;
  }
  if (invoice.dueAt && new Date(invoice.dueAt) < now) {
    invoice.status = "overdue";
    return;
  }
  invoice.status = "issued";
}

async function hydrate(id) {
  const invoice = await Invoice.findOne(notDeleted({ _id: id })).populate("leadId", LEAD_SELECT).lean();
  if (!invoice) throw ApiError.notFound("Invoice not found");
  return serializeInvoice(invoice);
}

async function listInvoices(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "issuedAt", "dueAt", "invoiceNumber", "grandTotal", "status"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.leadId) filter.leadId = query.leadId;
  if (query.jobId) filter.jobId = query.jobId;
  if (query.search) {
    filter.$or = [
      { invoiceNumber: { $regex: query.search, $options: "i" } },
      { "billTo.name": { $regex: query.search, $options: "i" } },
      { "billTo.gstin": { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    Invoice.find(filter).populate("leadId", LEAD_SELECT).sort(sort).skip(skip).limit(limit).lean(),
    Invoice.countDocuments(filter),
  ]);
  return { items: items.map(serializeInvoice), pagination: paginationMeta({ page, limit, total }) };
}

async function createInvoice(payload, actor, req) {
  const lead = await Lead.findOne(notDeleted({ _id: payload.leadId }));
  if (!lead) throw ApiError.notFound("Supplier not found");
  const settings = await getSettings();
  let job = null;
  let lines = payload.lines || [];
  if (payload.jobId) {
    job = await ServiceJob.findOne(notDeleted({ _id: payload.jobId }));
    if (!job) throw ApiError.notFound("Service job not found");
    if (!["confirmed", "in_progress", "awaiting_authority", "delivered", "closed"].includes(job.status)) {
      throw ApiError.conflict("Invoice can be created once the job is confirmed");
    }
    if (job.invoiceId) {
      const existing = await Invoice.findOne(notDeleted({ _id: job.invoiceId, status: { $ne: "void" } }));
      if (existing) throw ApiError.conflict("This job already has an invoice");
    }
    if (!lines.length) lines = job.lines.map((line) => line.toObject?.() || line);
  }

  const billTo = billToFromLead(lead, payload.billTo || {});
  const split = taxSplitFor(settings.state, billTo.state);
  const computedLines = await resolveLines(lines, { split, defaultTaxRateId: settings.defaultTaxRateId });
  const invoice = new Invoice({
    type: "invoice",
    status: "draft",
    leadId: lead._id,
    jobId: job?._id || null,
    billTo,
    placeOfSupply: payload.placeOfSupply || billTo.state || settings.state || "",
    taxSplit: split,
    discount: payload.discount ?? job?.discount ?? 0,
    currency: settings.currency || "INR",
    notes: payload.notes || "",
    paymentTerms: payload.paymentTerms || settings.paymentTerms || "",
    createdBy: actor?._id || null,
  });
  applyComputed(invoice, computedLines, invoice.discount);
  await invoice.save();
  if (job) {
    job.invoiceId = invoice._id;
    await job.save();
  }
  await auditService.log({ actor, action: "create", module: "billing", resourceType: "Invoice", resourceId: invoice._id, req });
  return hydrate(invoice._id);
}

async function updateInvoice(id, payload, actor, req) {
  const invoice = await Invoice.findOne(notDeleted({ _id: id }));
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.status !== "draft") throw ApiError.conflict("Only draft invoices can be edited");
  const settings = await getSettings();
  if (payload.billTo) invoice.billTo = { ...invoice.billTo.toObject?.() || invoice.billTo, ...payload.billTo };
  if (payload.placeOfSupply !== undefined) invoice.placeOfSupply = payload.placeOfSupply;
  if (payload.notes !== undefined) invoice.notes = payload.notes;
  if (payload.paymentTerms !== undefined) invoice.paymentTerms = payload.paymentTerms;
  if (payload.discount !== undefined) invoice.discount = payload.discount;
  if (payload.dueAt !== undefined) invoice.dueAt = payload.dueAt;
  const split = taxSplitFor(settings.state, invoice.billTo?.state);
  invoice.taxSplit = split;
  const lines = payload.lines || invoice.lines.map((line) => line.toObject?.() || line);
  const computedLines = await resolveLines(lines, { split, defaultTaxRateId: settings.defaultTaxRateId });
  applyComputed(invoice, computedLines, invoice.discount);
  await invoice.save();
  await auditService.log({ actor, action: "update", module: "billing", resourceType: "Invoice", resourceId: invoice._id, req });
  return hydrate(invoice._id);
}

async function issueInvoice(id, actor, req) {
  const invoice = await Invoice.findOne(notDeleted({ _id: id }));
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.status !== "draft") throw ApiError.conflict("Only draft documents can be issued");
  if (!invoice.lines.length) throw ApiError.badRequest("Add at least one line before issuing");
  const settings = await getSettings();
  if (invoice.type === "credit_note") {
    invoice.invoiceNumber = invoice.invoiceNumber || (await nextCreditNoteNumber());
  } else {
    invoice.invoiceNumber = invoice.invoiceNumber || (await nextInvoiceNumber());
  }
  invoice.status = "issued";
  invoice.issuedAt = new Date();
  if (!invoice.dueAt && invoice.type === "invoice") {
    const days = Number(settings.defaultDueDays) || 15;
    invoice.dueAt = new Date(Date.now() + days * 86400000);
  }
  invoice.amountDue = amountDue(invoice);
  await invoice.save();

  if (invoice.type === "credit_note" && invoice.originalInvoiceId) {
    const original = await Invoice.findById(invoice.originalInvoiceId);
    if (original && original.status !== "void") {
      original.amountCredited = money((original.amountCredited || 0) + invoice.grandTotal);
      refreshPayableStatus(original);
      await original.save();
    }
  }

  await auditService.log({ actor, action: "issue", module: "billing", resourceType: "Invoice", resourceId: invoice._id, req });
  const lead = await Lead.findById(invoice.leadId).select("name ownerId").lean();
  if (lead?.ownerId) {
    await notificationService.create({
      userId: lead.ownerId,
      type: "billing_invoice_issued",
      title: `${invoice.type === "credit_note" ? "Credit note" : "Invoice"} ${invoice.invoiceNumber}`,
      body: `${lead.name} — ${invoice.currency} ${invoice.grandTotal.toFixed(2)}`,
      data: { invoiceId: String(invoice._id), leadId: String(invoice.leadId) },
    });
  }
  return hydrate(invoice._id);
}

async function voidInvoice(id, actor, req) {
  const invoice = await Invoice.findOne(notDeleted({ _id: id }));
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.status === "void") throw ApiError.conflict("Invoice is already void");
  if (invoice.status === "draft") {
    invoice.status = "void";
    invoice.voidedAt = new Date();
    await invoice.save();
    return hydrate(invoice._id);
  }
  const paid = await Payment.countDocuments(notDeleted({ invoiceId: invoice._id, status: "recorded" }));
  if (paid) throw ApiError.conflict("Reverse payments before voiding this invoice");
  if (invoice.type === "credit_note" && invoice.originalInvoiceId && ISSUED_INVOICE_STATUSES.includes(invoice.status)) {
    const original = await Invoice.findById(invoice.originalInvoiceId);
    if (original) {
      original.amountCredited = money(Math.max(0, (original.amountCredited || 0) - invoice.grandTotal));
      refreshPayableStatus(original);
      await original.save();
    }
  }
  invoice.status = "void";
  invoice.voidedAt = new Date();
  invoice.amountDue = 0;
  await invoice.save();
  await auditService.log({ actor, action: "void", module: "billing", resourceType: "Invoice", resourceId: invoice._id, req });
  return hydrate(invoice._id);
}

async function createCreditNote(id, payload, actor, req) {
  const original = await Invoice.findOne(notDeleted({ _id: id }));
  if (!original) throw ApiError.notFound("Invoice not found");
  if (original.type !== "invoice") throw ApiError.badRequest("Credit notes can only be created from invoices");
  if (!ISSUED_INVOICE_STATUSES.includes(original.status)) throw ApiError.conflict("Issue the invoice before creating a credit note");
  const remaining = money(original.grandTotal - (original.amountCredited || 0));
  if (remaining <= 0) throw ApiError.conflict("This invoice is fully credited");
  const settings = await getSettings();
  const sourceLines = payload.lines?.length ? payload.lines : original.lines.map((line) => line.toObject?.() || line);
  const split = original.taxSplit || taxSplitFor(settings.state, original.billTo?.state);
  const computedLines = await resolveLines(sourceLines, { split, defaultTaxRateId: settings.defaultTaxRateId });
  const credit = new Invoice({
    type: "credit_note",
    status: "draft",
    leadId: original.leadId,
    jobId: original.jobId,
    originalInvoiceId: original._id,
    billTo: original.billTo,
    placeOfSupply: original.placeOfSupply,
    taxSplit: split,
    discount: payload.discount || 0,
    currency: original.currency,
    notes: payload.notes || `Credit against ${original.invoiceNumber}`,
    paymentTerms: "",
    createdBy: actor?._id || null,
  });
  applyComputed(credit, computedLines, credit.discount);
  if (credit.grandTotal > remaining) {
    throw ApiError.badRequest("Credit amount cannot exceed the remaining invoice value");
  }
  await credit.save();
  await auditService.log({
    actor,
    action: "create",
    module: "billing",
    resourceType: "Invoice",
    resourceId: credit._id,
    req,
    metadata: { originalInvoiceId: String(original._id) },
  });
  return hydrate(credit._id);
}

async function printInvoice(id) {
  const invoice = await hydrate(id);
  const settings = await getSettings();
  return { invoice, settings };
}

async function syncInvoiceBalance(invoiceId) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice || invoice.status === "void" || invoice.status === "draft") return invoice;
  const payments = await Payment.find(notDeleted({ invoiceId, status: "recorded" })).lean();
  invoice.amountPaid = money(payments.reduce((sum, item) => sum + (item.amount || 0), 0));
  refreshPayableStatus(invoice);
  await invoice.save();
  return invoice;
}

module.exports = {
  listInvoices,
  createInvoice,
  updateInvoice,
  getInvoice: hydrate,
  issueInvoice,
  voidInvoice,
  createCreditNote,
  printInvoice,
  syncInvoiceBalance,
  refreshPayableStatus,
  amountDue,
};
