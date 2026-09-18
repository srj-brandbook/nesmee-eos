const mongoose = require("mongoose");
const { SUBMISSION_STATUSES, ONBOARDING_SUBJECT_TYPES, FORM_PURPOSES } = require("../constants/forms");

const formSubmissionSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "FormDefinition", required: true, index: true },
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: "FormVersion", required: true, index: true },
    values: { type: mongoose.Schema.Types.Mixed, default: {} },
    derivedState: { type: mongoose.Schema.Types.Mixed, default: {} },
    executedActions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: { type: String, enum: SUBMISSION_STATUSES, default: "submitted" },
    subjectType: { type: String, enum: [...ONBOARDING_SUBJECT_TYPES, null], default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    purpose: { type: String, enum: ["supplier_onboarding", "distributor_onboarding", null], default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

formSubmissionSchema.index({ formId: 1, createdAt: -1 });
formSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });
formSubmissionSchema.index({ purpose: 1, status: 1, createdAt: -1 });
formSubmissionSchema.index({ subjectType: 1, subjectId: 1, purpose: 1, createdAt: -1 });
formSubmissionSchema.index(
  { subjectType: 1, subjectId: 1, purpose: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["draft", "submitted"] },
      subjectType: { $type: "string" },
      subjectId: { $type: "objectId" },
    },
  }
);

module.exports = mongoose.model("FormSubmission", formSubmissionSchema);
