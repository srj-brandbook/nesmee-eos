const mongoose = require("mongoose");
const { DOCUMENT_TYPES, DOCUMENT_STATUSES, SUBJECT_TYPES } = require("../constants/documents");

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    type: { type: String, default: "" },
    resourceType: { type: String, default: "" },
    format: { type: String, default: "" },
    pages: { type: Number, default: 0 },
    kind: { type: String, default: "upload" },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentTemplate", default: null, index: true },
    templateVersionId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentTemplateVersion", default: null },
    subjectType: { type: String, enum: SUBJECT_TYPES, default: "none", index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    subjectName: { type: String, default: "", trim: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: DOCUMENT_TYPES, default: "custom", index: true },
    docNumber: { type: String, default: "", trim: true },
    status: { type: String, enum: DOCUMENT_STATUSES, default: "draft", index: true },
    content: { type: [mongoose.Schema.Types.Mixed], default: [] },
    coverUrl: { type: String, default: "", trim: true },
    icon: { type: String, default: "", trim: true },
    bindings: { type: mongoose.Schema.Types.Mixed, default: {} },
    missingVariables: { type: [String], default: [] },
    variablesUsed: { type: [String], default: [] },
    letterhead: { type: mongoose.Schema.Types.Mixed, default: {} },
    issuedAt: { type: Date, default: null },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    filedAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, default: "", trim: true },
    pdf: { type: fileSchema, default: null },
    packet: { type: fileSchema, default: null },
    attachments: { type: [fileSchema], default: [] },
    attachmentOrder: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

documentSchema.index({ title: 1, deletedAt: 1 });
documentSchema.index({ status: 1, type: 1, updatedAt: -1 });
documentSchema.index({ subjectType: 1, subjectId: 1, deletedAt: 1 });
documentSchema.index(
  { docNumber: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null, docNumber: { $gt: "" } } }
);

module.exports = mongoose.model("Document", documentSchema);
