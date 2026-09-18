const Payment = require("../../models/Payment");
const Invoice = require("../../models/Invoice");
const ApiError = require("../../utils/ApiError");
const { parsePagination, paginationMeta, parseSort } = require("../../utils/pagination");
const { serializePayment } = require("../../utils/billingSerializer");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notification.service");
const { nextPaymentNumber } = require("./numbering");
const invoiceService = require("./invoice.service");
const { syncInvoiceBalance } = invoiceService;
const { getSettings } = require("./settings.service");
const { money } = require("./tax.engine");
const { ISSUED_INVOICE_STATUSES } = require("../../constants/billing");

const LEAD_SELECT = "name email stage gstin billingState";
const INVOICE_SELECT = "invoiceNumber status grandTotal amountDue amountPaid currency billTo dueAt issuedAt";
const USER_SELECT = "name email";

function notDeleted(extra = {}) {
  return { deletedAt: null, ...extra };
}

function snapshotParty(party = {}) {
  return {
    name: party.name || "",
    legalName: party.legalName || party.name || "",
    email: party.email || "",
    phone: party.phone || "",
    address: party.address || "",
    city: party.city || "",
    state: party.state || "",
    pincode: party.pincode || "",
    gstin: String(party.gstin || "").toUpperCase(),
    country: party.country || "India",
  };
}

function defaultDepositedTo(settings = {}, method) {
  if (method === "upi" && settings.upiId) return settings.upiId;
  const parts = [];
  if (settings.bankName) parts.push(settings.bankName);
  if (settings.bankAccount) parts.push(`A/c ${settings.bankAccount}`);
  if (settings.bankIfsc) parts.push(`IFSC ${settings.bankIfsc}`);
  if (method === "upi" && settings.upiId) parts.push(`UPI ${settings.upiId}`);
  return parts.join(" · ");
}

function normalizeInstrument(payload = {}, settings = {}, method) {
  const source = payload.instrument && typeof payload.instrument === "object" ? payload.instrument : {};
  const chequeDate = source.chequeDate ? new Date(source.chequeDate) : null;
  return {
    transactionId: String(source.transactionId || "").trim(),
    bankName: String(source.bankName || "").trim(),
    ifsc: String(source.ifsc || "").trim().toUpperCase(),
    accountName: String(source.accountName || "").trim(),
    upiVpa: String(source.upiVpa || "").trim(),
    chequeNumber: String(source.chequeNumber || "").trim(),
    chequeDate: chequeDate && !Number.isNaN(chequeDate.getTime()) ? chequeDate : null,
    chequeBank: String(source.chequeBank || "").trim(),
    depositedTo: String(source.depositedTo || "").trim() || defaultDepositedTo(settings, method),
  };
}

function referenceFrom(instrument = {}, fallback = "") {
  return (
    String(fallback || "").trim() ||
    instrument.transactionId ||
    instrument.chequeNumber ||
    ""
  );
}

function queryPayments(id) {
  return Payment.findOne(notDeleted({ _id: id }))
    .populate("invoiceId", INVOICE_SELECT)
    .populate("leadId", LEAD_SELECT)
    .populate("createdBy", USER_SELECT)
    .populate("reversedBy", USER_SELECT);
}

async function hydrate(id) {
  const payment = await queryPayments(id).lean();
  if (!payment) throw ApiError.notFound("Payment not found");
  return serializePayment(payment);
}

async function listPayments(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query.sort, ["createdAt", "paidAt", "amount", "paymentNumber"]);
  const filter = notDeleted();
  if (query.status) filter.status = query.status;
  if (query.method) filter.method = query.method;
  if (query.invoiceId) filter.invoiceId = query.invoiceId;
  if (query.leadId) filter.leadId = query.leadId;
  if (query.search) {
    filter.$or = [
      { paymentNumber: { $regex: query.search, $options: "i" } },
      { reference: { $regex: query.search, $options: "i" } },
      { invoiceNumber: { $regex: query.search, $options: "i" } },
      { "instrument.transactionId": { $regex: query.search, $options: "i" } },
      { "instrument.chequeNumber": { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate("invoiceId", INVOICE_SELECT)
      .populate("leadId", LEAD_SELECT)
      .populate("createdBy", USER_SELECT)
      .populate("reversedBy", USER_SELECT)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
  ]);
  return { items: items.map(serializePayment), pagination: paginationMeta({ page, limit, total }) };
}

async function createPayment(payload, actor, req) {
  const invoice = await Invoice.findOne(notDeleted({ _id: payload.invoiceId }));
  if (!invoice) throw ApiError.notFound("Invoice not found");
  if (invoice.type !== "invoice") throw ApiError.badRequest("Payments can only be recorded against invoices");
  if (!ISSUED_INVOICE_STATUSES.includes(invoice.status)) {
    throw ApiError.conflict("Issue the invoice before recording a payment");
  }
  const amount = money(payload.amount);
  if (amount <= 0) throw ApiError.validation({ amount: "Amount must be greater than zero" });
  if (amount > money(invoice.amountDue) + 0.009) {
    throw ApiError.badRequest("Payment cannot exceed the amount due");
  }

  const settings = await getSettings();
  const method = payload.method || "bank_transfer";
  const instrument = normalizeInstrument(payload, settings, method);
  const amountDueBefore = money(invoice.amountDue);
  const amountDueAfter = money(Math.max(0, amountDueBefore - amount));
  const receivedFrom = snapshotParty(payload.receivedFrom || invoice.billTo || {});

  const payment = await Payment.create({
    paymentNumber: await nextPaymentNumber(),
    invoiceId: invoice._id,
    leadId: invoice.leadId,
    invoiceNumber: invoice.invoiceNumber || "",
    amount,
    currency: invoice.currency || settings.currency || "INR",
    method,
    paidAt: payload.paidAt || new Date(),
    reference: referenceFrom(instrument, payload.reference),
    notes: payload.notes || "",
    receivedFrom,
    instrument,
    receivedBy: payload.receivedBy || actor?.name || "",
    invoiceTotal: money(invoice.grandTotal),
    amountDueBefore,
    amountDueAfter,
    files: (payload.files || []).map((file) => ({
      ...file,
      uploadedAt: new Date(),
      uploadedBy: actor?._id || null,
    })),
    status: "recorded",
    createdBy: actor?._id || null,
  });
  const updated = await syncInvoiceBalance(invoice._id);
  await auditService.log({ actor, action: "create", module: "billing", resourceType: "Payment", resourceId: payment._id, req });
  if (updated?.status === "paid") {
    await notificationService.create({
      userId: actor._id,
      type: "billing_payment_recorded",
      title: `Receipt ${payment.paymentNumber}`,
      body: `Invoice ${invoice.invoiceNumber} is fully paid.`,
      data: { paymentId: String(payment._id), invoiceId: String(invoice._id) },
    }).catch(() => {});
  }
  return hydrate(payment._id);
}

async function reversePayment(id, actor, req) {
  const payment = await Payment.findOne(notDeleted({ _id: id }));
  if (!payment) throw ApiError.notFound("Payment not found");
  if (payment.status === "reversed") throw ApiError.conflict("Payment is already reversed");
  payment.status = "reversed";
  payment.reversedAt = new Date();
  payment.reversedBy = actor?._id || null;
  await payment.save();
  await syncInvoiceBalance(payment.invoiceId);
  await auditService.log({ actor, action: "reverse", module: "billing", resourceType: "Payment", resourceId: payment._id, req });
  return hydrate(payment._id);
}

async function printPayment(id) {
  const payment = await hydrate(id);
  const invoice = payment.invoiceId ? await invoiceService.getInvoice(payment.invoiceId) : null;
  const settings = await getSettings();
  return { payment, invoice, settings };
}

module.exports = { listPayments, createPayment, reversePayment, getPayment: hydrate, printPayment };
