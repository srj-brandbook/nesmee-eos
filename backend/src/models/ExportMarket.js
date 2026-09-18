const mongoose = require("mongoose");
const { MARKET_STATUSES } = require("../constants/export");

const exportMarketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, trim: true, uppercase: true },
    countryName: { type: String, default: "", trim: true },
    regionCode: { type: String, default: "", trim: true, uppercase: true },
    currencyCode: { type: String, default: "USD", trim: true, uppercase: true },
    timeZone: { type: String, default: "", trim: true },
    language: { type: String, default: "", trim: true },
    status: { type: String, enum: MARKET_STATUSES, default: "research" },
    marketType: { type: String, default: "", trim: true },
    targetSegment: { type: String, default: "", trim: true },
    marketSize: { type: Number, default: 0 },
    estimatedDemand: { type: Number, default: 0 },
    expectedAnnualVolume: { type: Number, default: 0 },
    targetRevenue: { type: Number, default: 0 },
    expectedMargin: { type: Number, default: 0 },
    growthPotential: { type: Number, min: 0, max: 100, default: 0 },
    description: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    opportunityScore: { type: Number, min: 0, max: 100, default: 0 },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    scoreLabel: { type: String, default: "", trim: true },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportMarketSchema.index({ name: 1, deletedAt: 1 });
exportMarketSchema.index({ countryCode: 1, status: 1 });
exportMarketSchema.index({ status: 1, createdAt: -1 });
exportMarketSchema.index({ ownerId: 1, status: 1 });
exportMarketSchema.index({ regionCode: 1, status: 1 });

module.exports = mongoose.model("ExportMarket", exportMarketSchema);
