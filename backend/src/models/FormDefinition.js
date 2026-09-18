const mongoose = require("mongoose");
const { FORM_STATUSES, FORM_PURPOSES } = require("../constants/forms");

const formDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: FORM_STATUSES, default: "draft" },
    purpose: { type: String, enum: FORM_PURPOSES, default: "general", index: true },
    currentDraftVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormVersion", default: null },
    currentPublishedVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormVersion", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

formDefinitionSchema.index({ key: 1, deletedAt: 1 }, { unique: true });
formDefinitionSchema.index({ name: 1, deletedAt: 1 });
formDefinitionSchema.index({ status: 1, updatedAt: -1 });
formDefinitionSchema.index({ purpose: 1, status: 1, deletedAt: 1 });

module.exports = mongoose.model("FormDefinition", formDefinitionSchema);
