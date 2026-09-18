const mongoose = require("mongoose");
const { ALERT_EVENT_TYPES } = require("../constants/export");

const exportAlertRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    eventType: { type: String, enum: ALERT_EVENT_TYPES, required: true },
    enabled: { type: Boolean, default: true },
    threshold: { type: Number, default: 0 },
    notifyRoleSlugs: { type: [String], default: [] },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    titleTemplate: { type: String, default: "", trim: true },
    bodyTemplate: { type: String, default: "", trim: true },
    lastFiredAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportAlertRuleSchema.index({ eventType: 1, enabled: 1, deletedAt: 1 });

module.exports = mongoose.model("ExportAlertRule", exportAlertRuleSchema);
