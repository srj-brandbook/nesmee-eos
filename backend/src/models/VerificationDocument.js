const mongoose = require("mongoose");
const { VERIFICATION_DOCUMENT_STATUSES } = require("../constants/verification");

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
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const verificationDocumentSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: "VerificationCase", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    documentKey: { type: String, required: true, trim: true },
    label: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    issuer: { type: String, default: "", trim: true },
    documentNumber: { type: String, default: "", trim: true },
    issuedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    files: { type: [fileSchema], default: [] },
    status: { type: String, enum: VERIFICATION_DOCUMENT_STATUSES, default: "pending_upload", index: true },
    required: { type: Boolean, default: false },
    collectIssuedDate: { type: Boolean, default: true },
    collectExpiryDate: { type: Boolean, default: true },
    collectIssuer: { type: Boolean, default: true },
    collectDocumentNumber: { type: Boolean, default: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "", trim: true },
    reviews: { type: [reviewSchema], default: [] },
    expiryNotices: {
      d30At: { type: Date, default: null },
      d7At: { type: Date, default: null },
      d0At: { type: Date, default: null },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

verificationDocumentSchema.index(
  { caseId: 1, documentKey: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
verificationDocumentSchema.index({ leadId: 1, status: 1, expiresAt: 1 });
verificationDocumentSchema.index({ expiresAt: 1, status: 1, deletedAt: 1 });

module.exports = mongoose.model("VerificationDocument", verificationDocumentSchema);
