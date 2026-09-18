const mongoose = require("mongoose");
const { PAYMENT_METHODS, PAYMENT_STATUSES } = require("../constants/billing");

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    type: { type: String, default: "" },
    resourceType: { type: String, default: "" },
    format: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const partySchema = new mongoose.Schema(
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

const instrumentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, default: "", trim: true },
    bankName: { type: String, default: "", trim: true },
    ifsc: { type: String, default: "", trim: true, uppercase: true },
    accountName: { type: String, default: "", trim: true },
    upiVpa: { type: String, default: "", trim: true },
    chequeNumber: { type: String, default: "", trim: true },
    chequeDate: { type: Date, default: null },
    chequeBank: { type: String, default: "", trim: true },
    depositedTo: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, trim: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    invoiceNumber: { type: String, default: "", trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    method: { type: String, enum: PAYMENT_METHODS, default: "bank_transfer" },
    paidAt: { type: Date, default: Date.now },
    reference: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    receivedFrom: { type: partySchema, default: () => ({}) },
    instrument: { type: instrumentSchema, default: () => ({}) },
    receivedBy: { type: String, default: "", trim: true },
    invoiceTotal: { type: Number, default: 0 },
    amountDueBefore: { type: Number, default: 0 },
    amountDueAfter: { type: Number, default: 0 },
    files: { type: [fileSchema], default: [] },
    status: { type: String, enum: PAYMENT_STATUSES, default: "recorded", index: true },
    reversedAt: { type: Date, default: null },
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ paymentNumber: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
paymentSchema.index({ invoiceId: 1, status: 1 });
paymentSchema.index({ leadId: 1, paidAt: -1 });
paymentSchema.index({ invoiceNumber: 1, paidAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
