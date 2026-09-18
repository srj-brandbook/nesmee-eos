const mongoose = require("mongoose");
const { ALERT_EVENT_TYPES } = require("../constants/export");

const exportAlertSchema = new mongoose.Schema(
  {
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportAlertRule", default: null },
    eventType: { type: String, enum: ALERT_EVENT_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "", trim: true },
    resourceType: { type: String, default: "", trim: true },
    resourceId: { type: String, default: "", trim: true },
    severity: { type: String, enum: ["info", "warning", "critical"], default: "warning" },
    dedupeKey: { type: String, default: "", trim: true },
    readAt: { type: Date, default: null },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

exportAlertSchema.index({ createdAt: -1 });
exportAlertSchema.index({ readAt: 1, createdAt: -1 });
exportAlertSchema.index({ dedupeKey: 1, createdAt: -1 });
exportAlertSchema.index({ resourceType: 1, resourceId: 1 });

module.exports = mongoose.model("ExportAlert", exportAlertSchema);
