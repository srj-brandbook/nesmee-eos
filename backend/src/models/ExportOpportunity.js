const mongoose = require("mongoose");
const { OPPORTUNITY_STAGES } = require("../constants/export");

const exportOpportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportBuyer", default: null },
    corridorId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportCorridor", default: null },
    expectedVolume: { type: Number, default: 0 },
    expectedRevenue: { type: Number, default: 0 },
    expectedMargin: { type: Number, default: 0 },
    probability: { type: Number, min: 0, max: 100, default: 0 },
    expectedShipmentDate: { type: Date, default: null },
    incotermCode: { type: String, default: "", trim: true, uppercase: true },
    currency: { type: String, default: "USD", trim: true, uppercase: true },
    stage: { type: String, enum: OPPORTUNITY_STAGES, default: "identified" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    nextAction: { type: String, default: "", trim: true },
    nextActionAt: { type: Date, default: null },
    lostReason: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    landedCostSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    convertedAt: { type: Date, default: null },
    lostAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportOpportunitySchema.index({ marketId: 1, stage: 1, createdAt: -1 });
exportOpportunitySchema.index({ buyerId: 1, deletedAt: 1 });
exportOpportunitySchema.index({ productId: 1, stage: 1 });
exportOpportunitySchema.index({ ownerId: 1, stage: 1 });
exportOpportunitySchema.index({ nextActionAt: 1, stage: 1 });

module.exports = mongoose.model("ExportOpportunity", exportOpportunitySchema);
