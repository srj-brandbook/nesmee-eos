const mongoose = require("mongoose");
const { MAPPING_STATUSES } = require("../constants/export");

const exportMarketProductSchema = new mongoose.Schema(
  {
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportProduct", required: true },
    hsCode: { type: String, default: "", trim: true },
    eligibilityStatus: { type: String, enum: MAPPING_STATUSES, default: "pending_review" },
    minOrderQty: { type: Number, default: 0 },
    maxQty: { type: Number, default: 0 },
    targetPrice: { type: Number, default: 0 },
    minPrice: { type: Number, default: 0 },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
    incotermCode: { type: String, default: "", trim: true, uppercase: true },
    tariffRate: { type: Number, default: 0 },
    dutyRate: { type: Number, default: 0 },
    requiredCertifications: { type: String, default: "", trim: true },
    packagingRequirements: { type: String, default: "", trim: true },
    labelRequirements: { type: String, default: "", trim: true },
    testingRequirements: { type: String, default: "", trim: true },
    shelfLifeDays: { type: Number, default: 0 },
    importRestrictions: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    effectiveFrom: { type: Date, default: null },
    effectiveUntil: { type: Date, default: null },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportMarketProductSchema.index({ marketId: 1, productId: 1, deletedAt: 1 }, { unique: true });
exportMarketProductSchema.index({ productId: 1, eligibilityStatus: 1 });
exportMarketProductSchema.index({ hsCode: 1 });

module.exports = mongoose.model("ExportMarketProduct", exportMarketProductSchema);
