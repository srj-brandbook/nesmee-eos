const mongoose = require("mongoose");

const exportCorridorPerformanceSchema = new mongoose.Schema(
  {
    corridorId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportCorridor", required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    plannedTransitDays: { type: Number, default: 0 },
    actualTransitDays: { type: Number, default: 0 },
    plannedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    plannedMargin: { type: Number, default: 0 },
    actualMargin: { type: Number, default: 0 },
    onTimeDeliveryPct: { type: Number, min: 0, max: 100, default: 0 },
    damagePct: { type: Number, min: 0, max: 100, default: 0 },
    customsDelayPct: { type: Number, min: 0, max: 100, default: 0 },
    shipmentVolume: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportCorridorPerformanceSchema.index({ corridorId: 1, periodStart: -1 });
exportCorridorPerformanceSchema.index({ periodStart: 1, periodEnd: 1 });

module.exports = mongoose.model("ExportCorridorPerformance", exportCorridorPerformanceSchema);
