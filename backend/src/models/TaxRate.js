const mongoose = require("mongoose");

const taxRateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    rate: { type: Number, required: true, min: 0, max: 100, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taxRateSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

module.exports = mongoose.model("TaxRate", taxRateSchema);
