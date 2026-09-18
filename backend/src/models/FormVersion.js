const mongoose = require("mongoose");
const { VERSION_STATUSES } = require("../constants/forms");

const formVersionSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "FormDefinition", required: true, index: true },
    version: { type: String, required: true, trim: true },
    status: { type: String, enum: VERSION_STATUSES, default: "draft" },
    name: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
    fields: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rules: { type: [mongoose.Schema.Types.Mixed], default: [] },
    documents: { type: [mongoose.Schema.Types.Mixed], default: [] },
    stages: { type: [mongoose.Schema.Types.Mixed], default: [] },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

formVersionSchema.index({ formId: 1, version: 1 }, { unique: true });
formVersionSchema.index({ formId: 1, status: 1 });

module.exports = mongoose.model("FormVersion", formVersionSchema);
