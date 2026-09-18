const mongoose = require("mongoose");
const { LEAD_STAGES, LEAD_SOURCES } = require("../constants/crm");
const { LEAD_VERIFICATION_STATUSES } = require("../constants/verification");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    products: { type: String, default: "", trim: true },
    certifications: { type: String, default: "", trim: true },
    moq: { type: String, default: "", trim: true },
    exportMarkets: { type: String, default: "", trim: true },
    source: { type: String, enum: LEAD_SOURCES, default: "other" },
    stage: { type: String, enum: LEAD_STAGES, default: "new" },
    score: { type: Number, min: 0, max: 100, default: 0 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verificationStatus: { type: String, enum: LEAD_VERIFICATION_STATUSES, default: "none", index: true },
    verificationSummary: {
      required: { type: Number, default: 0 },
      verified: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      expired: { type: Number, default: 0 },
      expiringSoon: { type: Number, default: 0 },
    },
    gstin: { type: String, default: "", trim: true, uppercase: true },
    billingState: { type: String, default: "", trim: true },
    billingAddress: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    convertedAt: { type: Date, default: null },
    wonAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    lostReason: { type: String, default: "", trim: true },
    disqualifiedAt: { type: Date, default: null },
    disqualifiedReason: { type: String, default: "", trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ name: 1, deletedAt: 1 });
leadSchema.index({ email: 1, deletedAt: 1 });
leadSchema.index({ ownerId: 1, stage: 1 });
leadSchema.index({ country: 1, stage: 1 });
leadSchema.index({ stage: 1, createdAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);
