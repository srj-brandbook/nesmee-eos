const mongoose = require("mongoose");

const exportFxRateSchema = new mongoose.Schema(
  {
    base: { type: String, required: true, trim: true, uppercase: true },
    quote: { type: String, required: true, trim: true, uppercase: true },
    rate: { type: Number, required: true, min: 0 },
    rateDate: { type: Date, required: true },
    source: { type: String, default: "manual", trim: true },
    bufferPct: { type: Number, default: 0 },
    riskAdjustmentPct: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportFxRateSchema.index({ base: 1, quote: 1, rateDate: -1 });

module.exports = mongoose.model("ExportFxRate", exportFxRateSchema);
