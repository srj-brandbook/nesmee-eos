const mongoose = require("mongoose");
const { VERSION_STATUSES } = require("../constants/documents");

const documentTemplateVersionSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentTemplate", required: true, index: true },
    version: { type: String, required: true, trim: true },
    status: { type: String, enum: VERSION_STATUSES, default: "draft" },
    name: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    content: { type: [mongoose.Schema.Types.Mixed], default: [] },
    variablesUsed: { type: [String], default: [] },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

documentTemplateVersionSchema.index({ templateId: 1, version: 1 }, { unique: true });
documentTemplateVersionSchema.index({ templateId: 1, status: 1 });

module.exports = mongoose.model("DocumentTemplateVersion", documentTemplateVersionSchema);
