const mongoose = require("mongoose");
const { SERVICE_CATEGORIES } = require("../constants/billing");

const serviceOfferingSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: SERVICE_CATEGORIES, default: "certificate", index: true },
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
    unitPrice: { type: Number, default: 0, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    taxRateId: { type: mongoose.Schema.Types.ObjectId, ref: "TaxRate", default: null },
    slaDays: { type: Number, default: 14, min: 0 },
    formDefinitionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormDefinition", default: null },
    documentKey: { type: String, default: "", trim: true, index: true },
    hsnSac: { type: String, default: "9983", trim: true },
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

serviceOfferingSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
serviceOfferingSchema.index({ name: 1, deletedAt: 1 });
serviceOfferingSchema.index({ category: 1, isActive: 1, deletedAt: 1 });

module.exports = mongoose.model("ServiceOffering", serviceOfferingSchema);
