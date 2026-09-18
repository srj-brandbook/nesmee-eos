const mongoose = require("mongoose");
const { PRODUCT_STATUSES } = require("../constants/export");

const exportProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true, uppercase: true },
    hsCode: { type: String, default: "", trim: true },
    categoryLookupId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportLookup", default: null },
    category: { type: String, default: "", trim: true },
    unit: { type: String, default: "unit", trim: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: "active" },
    baseCost: { type: Number, default: 0 },
    baseCurrency: { type: String, default: "INR", trim: true, uppercase: true },
    notes: { type: String, default: "", trim: true },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportProductSchema.index({ name: 1, deletedAt: 1 });
exportProductSchema.index({ sku: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { sku: { $gt: "" }, deletedAt: null } });
exportProductSchema.index({ status: 1, createdAt: -1 });
exportProductSchema.index({ hsCode: 1 });

module.exports = mongoose.model("ExportProduct", exportProductSchema);
