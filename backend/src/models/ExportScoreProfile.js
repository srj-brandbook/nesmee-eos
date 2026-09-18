const mongoose = require("mongoose");
const { SCORE_SCOPES } = require("../constants/export");

const factorSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
  },
  { _id: false }
);

const thresholdSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const exportScoreProfileSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: SCORE_SCOPES, required: true },
    name: { type: String, required: true, trim: true },
    factors: { type: [factorSchema], default: [] },
    thresholds: { type: [thresholdSchema], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportScoreProfileSchema.index({ scope: 1, status: 1, deletedAt: 1 });

module.exports = mongoose.model("ExportScoreProfile", exportScoreProfileSchema);
