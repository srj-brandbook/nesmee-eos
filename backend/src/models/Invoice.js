const mongoose = require("mongoose");
const { INVOICE_TYPES, INVOICE_STATUSES } = require("../constants/billing");

const billToSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    legalName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    gstin: { type: String, default: "", trim: true, uppercase: true },
    country: { type: String, default: "India", trim: true },
  },
  { _id: false }
);

const lineSchema = new mongoose.Schema(
  {
    offeringId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceOffering", default: null },
    documentKey: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    hsnSac: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxRateId: { type: mongoose.Schema.Types.ObjectId, ref: "TaxRate", default: null },
    taxRate: { type: Number, default: 0, min: 0 },
    taxName: { type: String, default: "", trim: true },
    taxableAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, default: "", trim: true },
    type: { type: String, enum: INVOICE_TYPES, default: "invoice", index: true },
    status: { type: String, enum: INVOICE_STATUSES, default: "draft", index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceJob", default: null, index: true },
    originalInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    billTo: { type: billToSchema, default: () => ({}) },
    placeOfSupply: { type: String, default: "", trim: true },
    taxSplit: { type: String, enum: ["intra", "inter"], default: "intra" },
    lines: { type: [lineSchema], default: [] },
    taxableAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountCredited: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    issuedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    paymentTerms: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

invoiceSchema.index(
  { invoiceNumber: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null, invoiceNumber: { $gt: "" } } }
);
invoiceSchema.index({ status: 1, dueAt: 1, deletedAt: 1 });
invoiceSchema.index({ leadId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
