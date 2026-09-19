const mongoose = require("mongoose");
const { DOCUMENT_TYPES, TEMPLATE_STATUSES, SUBJECT_TYPES } = require("../constants/documents");

const letterheadSchema = new mongoose.Schema(
  {
    legalName: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    footer: { type: String, default: "", trim: true },
    showLogo: { type: Boolean, default: true },
  },
  { _id: false }
);

const documentTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    type: { type: String, enum: DOCUMENT_TYPES, default: "custom", index: true },
    subjectTypes: { type: [{ type: String, enum: SUBJECT_TYPES }], default: ["lead"] },
    status: { type: String, enum: TEMPLATE_STATUSES, default: "draft", index: true },
    coverUrl: { type: String, default: "", trim: true },
    icon: { type: String, default: "", trim: true },
    letterhead: { type: letterheadSchema, default: () => ({}) },
    currentDraftVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentTemplateVersion", default: null },
    currentPublishedVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentTemplateVersion", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentTemplateSchema.index({ slug: 1, deletedAt: 1 }, { unique: true });
documentTemplateSchema.index({ name: 1, deletedAt: 1 });
documentTemplateSchema.index({ status: 1, type: 1, updatedAt: -1 });

module.exports = mongoose.model("DocumentTemplate", documentTemplateSchema);
