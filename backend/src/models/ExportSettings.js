const mongoose = require("mongoose");

const exportSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "export" },
    baseCurrency: { type: String, default: "INR", trim: true, uppercase: true },
    originCountryCode: { type: String, default: "IN", trim: true, uppercase: true },
    defaultIncoterm: { type: String, default: "FOB", trim: true, uppercase: true },
    marginAlertThreshold: { type: Number, default: 15 },
    requirementExpiryDays: { type: Number, default: 30 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExportSettings", exportSettingsSchema);
