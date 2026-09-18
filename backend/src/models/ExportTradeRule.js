const mongoose = require("mongoose");
const { RULE_ACTION_TYPES } = require("../constants/export");

const actionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: RULE_ACTION_TYPES, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const exportTradeRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
    effectiveFrom: { type: Date, default: null },
    effectiveUntil: { type: Date, default: null },
    conditionGroup: { type: mongoose.Schema.Types.Mixed, default: { operator: "AND", conditions: [], groups: [] } },
    actions: { type: [actionSchema], default: [] },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportTradeRuleSchema.index({ enabled: 1, priority: -1, deletedAt: 1 });

module.exports = mongoose.model("ExportTradeRule", exportTradeRuleSchema);
