const mongoose = require("mongoose");

const billingSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "billing" },
    legalName: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    gstin: { type: String, default: "", trim: true, uppercase: true },
    pan: { type: String, default: "", trim: true, uppercase: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "", trim: true },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    invoicePrefix: { type: String, default: "INV", trim: true, uppercase: true },
    creditNotePrefix: { type: String, default: "CN", trim: true, uppercase: true },
    jobPrefix: { type: String, default: "JOB", trim: true, uppercase: true },
    paymentPrefix: { type: String, default: "PAY", trim: true, uppercase: true },
    invoiceNextNumber: { type: Number, default: 0 },
    creditNoteNextNumber: { type: Number, default: 0 },
    jobNextNumber: { type: Number, default: 0 },
    paymentNextNumber: { type: Number, default: 0 },
    defaultDueDays: { type: Number, default: 15, min: 0 },
    defaultTaxRateId: { type: mongoose.Schema.Types.ObjectId, ref: "TaxRate", default: null },
    paymentTerms: { type: String, default: "Payment due within 15 days of invoice date.", trim: true },
    bankName: { type: String, default: "", trim: true },
    bankAccount: { type: String, default: "", trim: true },
    bankIfsc: { type: String, default: "", trim: true, uppercase: true },
    upiId: { type: String, default: "", trim: true },
    paymentFooter: { type: String, default: "", trim: true },
    reminderDays: { type: [Number], default: [0, 7, 14] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingSettings", billingSettingsSchema);
