const mongoose = require("mongoose");
const { BUYER_STATUSES } = require("../constants/export");

const exportBuyerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, default: "", trim: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", default: null },
    segment: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    productInterest: { type: String, default: "", trim: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    annualPotential: { type: Number, default: 0 },
    priceExpectation: { type: Number, default: 0 },
    paymentTerms: { type: String, default: "", trim: true },
    creditRisk: { type: Number, min: 0, max: 100, default: 0 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: BUYER_STATUSES, default: "prospect" },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportBuyerSchema.index({ name: 1, deletedAt: 1 });
exportBuyerSchema.index({ marketId: 1, status: 1 });
exportBuyerSchema.index({ email: 1, deletedAt: 1 });

module.exports = mongoose.model("ExportBuyer", exportBuyerSchema);
