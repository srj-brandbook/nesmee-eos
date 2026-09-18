const mongoose = require("mongoose");
const { CORRIDOR_STATUSES, LOCATION_TYPES, TRANSPORT_MODES } = require("../constants/export");

const segmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    sequence: { type: Number, default: 0 },
    locationType: { type: String, enum: LOCATION_TYPES, default: "transit" },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportLookup", default: null },
    locationLabel: { type: String, default: "", trim: true },
    mode: { type: String, enum: [...TRANSPORT_MODES, ""], default: "" },
    carrier: { type: String, default: "", trim: true },
    transitMinDays: { type: Number, default: 0 },
    transitAvgDays: { type: Number, default: 0 },
    transitMaxDays: { type: Number, default: 0 },
    costAmount: { type: Number, default: 0 },
    costCurrency: { type: String, default: "INR", trim: true, uppercase: true },
    costComponentCode: { type: String, default: "", trim: true },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const costSchema = new mongoose.Schema(
  {
    componentCode: { type: String, required: true, trim: true },
    nameSnapshot: { type: String, default: "", trim: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR", trim: true, uppercase: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const exportCorridorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true, uppercase: true },
    marketId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportMarket", required: true },
    originCountryCode: { type: String, default: "IN", trim: true, uppercase: true },
    originState: { type: String, default: "", trim: true },
    originCity: { type: String, default: "", trim: true },
    originLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportLookup", default: null },
    destCountryCode: { type: String, default: "", trim: true, uppercase: true },
    destCity: { type: String, default: "", trim: true },
    destLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "ExportLookup", default: null },
    primaryMode: { type: String, enum: TRANSPORT_MODES, default: "sea" },
    secondaryMode: { type: String, enum: [...TRANSPORT_MODES, ""], default: "" },
    status: { type: String, enum: CORRIDOR_STATUSES, default: "draft" },
    priority: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    transitMinDays: { type: Number, default: 0 },
    transitAvgDays: { type: Number, default: 0 },
    transitMaxDays: { type: Number, default: 0 },
    reliability: { type: Number, min: 0, max: 100, default: 80 },
    capacity: { type: Number, default: 0 },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    corridorScore: { type: Number, min: 0, max: 100, default: 0 },
    scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    scoreLabel: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    segments: { type: [segmentSchema], default: [] },
    costs: { type: [costSchema], default: [] },
    customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

exportCorridorSchema.index({ marketId: 1, status: 1 });
exportCorridorSchema.index({ code: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { code: { $gt: "" }, deletedAt: null } });
exportCorridorSchema.index({ primaryMode: 1, status: 1 });
exportCorridorSchema.index({ name: 1, deletedAt: 1 });
exportCorridorSchema.index({ marketId: 1, isPrimary: 1 });

module.exports = mongoose.model("ExportCorridor", exportCorridorSchema);
