const mongoose = require("mongoose");
const { JOB_STATUSES, JOB_SOURCES } = require("../constants/billing");

const lineSchema = new mongoose.Schema(
  {
    offeringId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceOffering", default: null },
    documentKey: { type: String, default: "", trim: true },
    formDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormDefinition", default: null },
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

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const serviceJobSchema = new mongoose.Schema(
  {
    jobNumber: { type: String, required: true, trim: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: { type: String, enum: JOB_STATUSES, default: "draft", index: true },
    source: { type: String, enum: JOB_SOURCES, default: "manual" },
    dueAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    verificationCaseId: { type: mongoose.Schema.Types.ObjectId, ref: "VerificationCase", default: null },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
    lines: { type: [lineSchema], default: [] },
    taxableAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    taxSplit: { type: String, enum: ["intra", "inter"], default: "intra" },
    history: { type: [historySchema], default: [] },
    waivePayment: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

serviceJobSchema.index({ jobNumber: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
serviceJobSchema.index({ leadId: 1, status: 1, createdAt: -1 });
serviceJobSchema.index({ status: 1, dueAt: 1, deletedAt: 1 });

module.exports = mongoose.model("ServiceJob", serviceJobSchema);
