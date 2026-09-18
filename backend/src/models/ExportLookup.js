const mongoose = require("mongoose");
const { LOOKUP_TYPES, LOOKUP_STATUSES } = require("../constants/export");

const exportLookupSchema = new mongoose.Schema(
  {
    type: { type: String, enum: LOOKUP_TYPES, required: true },
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    parentCode: { type: String, default: "", trim: true, uppercase: true },
    countryCode: { type: String, default: "", trim: true, uppercase: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: LOOKUP_STATUSES, default: "active" },
    sortOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportLookupSchema.index({ type: 1, code: 1, deletedAt: 1 }, { unique: true });
exportLookupSchema.index({ type: 1, status: 1, sortOrder: 1 });
exportLookupSchema.index({ countryCode: 1, type: 1 });

module.exports = mongoose.model("ExportLookup", exportLookupSchema);
