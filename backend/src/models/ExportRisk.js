const mongoose = require("mongoose");
const { RISK_SCOPES, RISK_SEVERITIES, RISK_STATUSES } = require("../constants/export");

const exportRiskSchema = new mongoose.Schema(
  {
    scopeType: { type: String, enum: RISK_SCOPES, required: true },
    scopeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    riskType: { type: String, required: true, trim: true },
    score: { type: Number, min: 0, max: 100, default: 0 },
    severity: { type: String, enum: RISK_SEVERITIES, default: "medium" },
    probability: { type: Number, min: 0, max: 100, default: 0 },
    impact: { type: Number, min: 0, max: 100, default: 0 },
    mitigation: { type: String, default: "", trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: RISK_STATUSES, default: "open" },
    reviewDate: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportRiskSchema.index({ scopeType: 1, scopeId: 1, status: 1, deletedAt: 1 });
exportRiskSchema.index({ reviewDate: 1, status: 1 });

module.exports = mongoose.model("ExportRisk", exportRiskSchema);
