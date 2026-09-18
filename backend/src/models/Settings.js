const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "app" },
    name: { type: String, default: "SaaS Boilerplate" },
    supportEmail: { type: String, default: "support@example.com" },
    signupEnabled: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
