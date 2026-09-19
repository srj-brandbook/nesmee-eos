const mongoose = require("mongoose");
const { PRICING_TYPES, PRICING_STATUSES } = require("../constants/export");

const exportPricingSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportBuyer", default: null },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
    basePrice: { type: Number, default: 0 },
    minPrice: { type: Number, default: 0 },
    targetPrice: { type: Number, default: 0 },
    maxPrice: { type: Number, default: 0 },
    incotermCode: { type: String, default: "", trim: true, uppercase: true },
    volumeMin: { type: Number, default: 0 },
    volumeMax: { type: Number, default: 0 },
    pricingType: { type: String, enum: PRICING_TYPES, default: "standard" },
    effectiveFrom: { type: Date, default: null },
    effectiveUntil: { type: Date, default: null },
    status: { type: String, enum: PRICING_STATUSES, default: "active" },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportPricingSchema.index({ productId: 1, marketId: 1, buyerId: 1, status: 1 });
exportPricingSchema.index({ marketId: 1, status: 1, deletedAt: 1 });
exportPricingSchema.index({ effectiveFrom: 1, effectiveUntil: 1 });

module.exports = mongoose.model("ExportPricing", exportPricingSchema);
