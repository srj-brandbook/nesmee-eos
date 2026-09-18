const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    isPrimary: { type: Boolean, default: false },
    notes: { type: String, default: "", trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

contactSchema.index({ leadId: 1, deletedAt: 1 });
contactSchema.index({ email: 1 });

module.exports = mongoose.model("Contact", contactSchema);
