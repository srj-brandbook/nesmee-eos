const mongoose = require("mongoose");
const { REQUIREMENT_STATUSES } = require("../constants/export");

const exportRequirementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    productCategory: { type: String, default: "", trim: true },
    requirementType: { type: String, default: "other", trim: true },
    mandatory: { type: Boolean, default: true },
    effectiveDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    documentRequired: { type: Boolean, default: false },
    responsibleRole: { type: String, default: "", trim: true },
    responsibleUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: REQUIREMENT_STATUSES, default: "pending" },
    notes: { type: String, default: "", trim: true },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportRequirementSchema.index({ marketId: 1, status: 1, deletedAt: 1 });
exportRequirementSchema.index({ productId: 1, deletedAt: 1 });
exportRequirementSchema.index({ expiryDate: 1, status: 1 });

module.exports = mongoose.model("ExportRequirement", exportRequirementSchema);
