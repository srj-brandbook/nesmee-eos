const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "app" },
    name: { type: String, default: "Nesmee EOS" },
    supportEmail: { type: String, default: "support@example.com" },
    signupEnabled: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    legalName: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true },
    pincode: { type: String, default: "", trim: true },
    country: { type: String, default: "", trim: true },
    gstin: { type: String, default: "", trim: true, uppercase: true },
    logoUrl: { type: String, default: "", trim: true },
    logoPublicId: { type: String, default: "", trim: true },
    signatoryName: { type: String, default: "", trim: true },
    signatoryTitle: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
