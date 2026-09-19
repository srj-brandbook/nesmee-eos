const mongoose = require("mongoose");
const { PRODUCT_SHARE_STATUSES } = require("../constants/products");

const productShareSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportBuyer", required: true, index: true },
    status: { type: String, enum: PRODUCT_SHARE_STATUSES, default: "shared", index: true },
    note: { type: String, default: "", trim: true },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    sharedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

productShareSchema.index(
  { productId: 1, buyerId: 1 },
  { unique: true, partialFilterExpression: { status: "shared", deletedAt: null } }
);
productShareSchema.index({ buyerId: 1, status: 1, sharedAt: -1 });

module.exports = mongoose.model("ProductShare", productShareSchema);
