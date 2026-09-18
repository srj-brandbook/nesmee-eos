const mongoose = require("mongoose");

const exportIncotermSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    costComponentCodes: { type: [String], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, default: "", trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportIncotermSchema.index({ code: 1, deletedAt: 1 }, { unique: true });

module.exports = mongoose.model("ExportIncoterm", exportIncotermSchema);
