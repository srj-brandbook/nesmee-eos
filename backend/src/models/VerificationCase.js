const mongoose = require("mongoose");
const { VERIFICATION_CASE_STATUSES } = require("../constants/verification");

const verificationCaseSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    subjectType: { type: String, enum: ["lead", "product"], default: "lead", index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null, index: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "FormDefinition", required: true, index: true },
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormVersion", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dueAt: { type: Date, default: null },
    status: { type: String, enum: VERIFICATION_CASE_STATUSES, default: "assigned", index: true },
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
    derivedState: { type: mongoose.Schema.Types.Mixed, default: {} },
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    leadNote: { type: String, default: "", trim: true },
    reviewNote: { type: String, default: "", trim: true },
    reviews: {
      type: [
        {
          action: { type: String, required: true, trim: true },
          note: { type: String, default: "", trim: true },
          actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    serviceJobId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceJob", default: null, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

verificationCaseSchema.index({ productId: 1, status: 1, updatedAt: -1 });
verificationCaseSchema.index({ subjectType: 1, status: 1, updatedAt: -1 });
verificationCaseSchema.index({ assignedToId: 1, status: 1, updatedAt: -1 });
verificationCaseSchema.index({ leadId: 1, status: 1, updatedAt: -1 });
verificationCaseSchema.index({ leadId: 1, formId: 1, status: 1 });
verificationCaseSchema.index({ status: 1, dueAt: 1 });

module.exports = mongoose.model("VerificationCase", verificationCaseSchema);
