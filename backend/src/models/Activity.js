const mongoose = require("mongoose");
const { ACTIVITY_TYPES, ACTIVITY_STATUSES } = require("../constants/crm");

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    title: { type: String, default: "", trim: true },
    body: { type: String, default: "", trim: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
    assignedToId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    location: { type: String, default: "", trim: true },
    meetingUrl: { type: String, default: "", trim: true },
    dueAt: { type: Date, default: null },
    reminderAt: { type: Date, default: null },
    remindedAt: { type: Date, default: null },
    status: { type: String, enum: ACTIVITY_STATUSES, default: "scheduled" },
    externalProvider: { type: String, default: null },
    externalEventId: { type: String, default: null },
    externalSyncStatus: { type: String, default: "skipped" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

activitySchema.index({ leadId: 1, createdAt: -1 });
activitySchema.index({ contactId: 1 });
activitySchema.index({ type: 1, startsAt: 1 });
activitySchema.index({ dueAt: 1 });
activitySchema.index({ reminderAt: 1, remindedAt: 1, status: 1 });
activitySchema.index({ assignedToId: 1 });

module.exports = mongoose.model("Activity", activitySchema);
