const mongoose = require("mongoose");

const exportCostEstimateSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", default: null },
    corridorId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportCorridor", default: null },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportBuyer", default: null },
    opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportOpportunity", default: null },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    incotermCode: { type: String, default: "", trim: true, uppercase: true },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    lines: { type: mongoose.Schema.Types.Mixed, default: [] },
    landedCost: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    grossMarginPct: { type: Number, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportCostEstimateSchema.index({ marketId: 1, createdAt: -1 });
exportCostEstimateSchema.index({ opportunityId: 1 });

module.exports = mongoose.model("ExportCostEstimate", exportCostEstimateSchema);
